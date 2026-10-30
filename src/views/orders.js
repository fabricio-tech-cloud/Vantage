import { state } from "../state.js";
import { topbar, bellButton, segmented, empty } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { actionSheet, confirmSheet, toast } from "../components/sheet.js";
import { cancelOrder, accountLabel, ORDER_TYPES } from "../engine.js";
import { openOrderTicket } from "../components/trade.js";
import { getQuote, onTick } from "../quotes.js";
import { applyLive } from "../components/live.js";
import { includedAccounts } from "../calc.js";
import { fmtPrice, fmtQty, fmtDateTime, fmtMoneyAlways, signClass, fmtSignedAlways } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { accountFilterLabel, openAccountPicker } from "../components/accountPicker.js";

function visibleAccountIds() {
  const inc = includedAccounts().map((a) => a.id);
  return state.accountFilter === "ALL" ? inc : inc.filter((id) => id === state.accountFilter);
}

function orderRow(o) {
  const q = getQuote(o.sym) || {};
  const px = o.type === "MKT" || o.type === "MOC" ? "MKT" : o.type === "TRAIL" ? `TRAIL ${fmtPrice(o.trail, q.ccy)}` : o.type === "STP" ? `STP ${fmtPrice(o.stop, q.ccy)}` : `${o.type === "STP LMT" ? "STP " + fmtPrice(o.stop, q.ccy) + " / " : ""}LMT ${fmtPrice(o.limit, q.ccy)}`;
  const st = { Submitted: "Working", PreSubmitted: "Pending", Filled: "Filled", Cancelled: "Cancelled" }[o.status] || o.status;
  return `<button class="row ord-row" data-order="${o.id}">
    ${logo(o.sym, 38)}
    <span class="row-main">
      <span class="row-title"><b class="${o.side === "BUY" ? "up" : "down"}">${o.side}</b> ${fmtQty(o.qty)} ${esc(o.sym)}</span>
      <span class="row-sub">${px} · ${o.tif}${o.outsideRth ? " · RTH+" : ""} · ${esc(accountLabel(o.accountId).split(" · ")[0])}</span>
    </span>
    <span class="row-val">
      <span class="pill pill-${o.status === "Filled" ? "up" : o.status === "Cancelled" ? "down" : "flat"}">${st}</span>
      <span class="row-valsub mono">${o.status === "Filled" ? "@ " + fmtPrice(o.fillPrice, q.ccy) : `Last <span data-live="price:${esc(o.sym)}">${fmtPrice(q.price, q.ccy)}</span>`}</span>
    </span>
  </button>`;
}

function tradeRow(t) {
  const q = getQuote(t.sym) || {};
  const value = t.qty * t.price * (q.multiplier || 1);
  return `<div class="row row--plain">
    ${logo(t.sym, 38)}
    <span class="row-main">
      <span class="row-title"><b class="${t.side === "BUY" ? "up" : "down"}">${t.side}</b> ${fmtQty(t.qty)} ${esc(t.sym)} <small class="muted">@ ${fmtPrice(t.price, q.ccy)}</small></span>
      <span class="row-sub">${fmtDateTime(t.t)} · ${esc(accountLabel(t.accountId).split(" · ")[0])} · comm. ${fmtMoneyAlways(t.commission, q.ccy)}</span>
    </span>
    <span class="row-val"><span class="mono">${fmtMoneyAlways(value, q.ccy)}</span>${t.realized ? `<span class="row-valsub ${signClass(t.realized)}">${fmtSignedAlways(t.realized, q.ccy)} realized</span>` : ""}</span>
  </div>`;
}

export default {
  nav: "orders",
  render(params) {
    const tab = params.tab || "open";
    const ids = new Set(visibleAccountIds());
    const orders = state.orders.filter((o) => ids.has(o.accountId));
    const open = orders.filter((o) => o.status === "Submitted" || o.status === "PreSubmitted");
    const hist = orders.filter((o) => o.status === "Filled" || o.status === "Cancelled").sort((a, b) => (b.filledAt || b.cancelledAt || b.t) - (a.filledAt || a.cancelledAt || a.t));
    const trades = state.trades.filter((t) => ids.has(t.accountId)).sort((a, b) => b.t - a.t);
    let body;
    if (tab === "open") body = open.length ? `<div class="list card">${open.map(orderRow).join("")}</div>` : empty("orders", "No open orders", "Working orders for the selected accounts appear here.", `<button class="btn btn-primary" data-href="/search">Place an order</button>`);
    else if (tab === "trades") body = trades.length ? `<div class="list card">${trades.map(tradeRow).join("")}</div>` : empty("list", "No executions", "Filled trades will be listed here.");
    else body = hist.length ? `<div class="list card">${hist.map(orderRow).join("")}</div>` : empty("clock", "No order history");
    return `${topbar({
      left: `<button class="acct-pill acct-pill--bar" data-action="pick-account">${I.layers()}<span>${esc(accountFilterLabel())}</span>${I.chevD()}</button>`,
      center: "<span></span>",
      right: `<button class="icon-btn" data-href="/search" aria-label="New order">${I.plus()}</button>${bellButton()}`,
    })}
    <h1 class="page-title pad-x">Orders & Trades</h1>
    ${segmented("tab", [{ id: "open", label: `Open${open.length ? ` (${open.length})` : ""}` }, { id: "trades", label: "Trades" }, { id: "history", label: "History" }], tab, "seg--tabs")}
    <div class="tab-body">${body}</div>`;
  },
  mount(el) {
    const onClick = async (e) => {
      const seg = e.target.closest("[data-seg='tab'] button");
      if (seg) {
        navigate(seg.dataset.value === "open" ? "/orders" : "/orders/" + seg.dataset.value, { replace: true });
        return;
      }
      if (e.target.closest("[data-action='pick-account']")) {
        openAccountPicker();
        return;
      }
      const r = e.target.closest("[data-order]");
      if (r) {
        const o = state.orders.find((x) => x.id === r.dataset.order);
        if (!o) return;
        const isOpen = o.status === "Submitted" || o.status === "PreSubmitted";
        const typeLabel = ORDER_TYPES.find((t) => t.id === o.type)?.label || o.type;
        actionSheet({
          title: `${o.side} ${fmtQty(o.qty)} ${o.sym} · ${typeLabel}`,
          actions: [
            ...(isOpen
              ? [
                  { label: "Modify order", icon: "edit", onClick: () => openOrderTicket({ sym: o.sym, side: o.side, accountId: o.accountId, qty: o.qty, orderId: o.id, type: o.type, limit: o.limit, stop: o.stop, tif: o.tif }) },
                  {
                    label: "Cancel order",
                    icon: "close",
                    danger: true,
                    onClick: async () => {
                      if (await confirmSheet({ title: "Cancel order", text: `Cancel ${o.side} ${fmtQty(o.qty)} ${o.sym}?`, confirmLabel: "Cancel order", danger: true })) {
                        cancelOrder(o.id);
                        toast("Order cancelled");
                      }
                    },
                  },
                ]
              : [{ label: "Place similar order", icon: "refresh", onClick: () => openOrderTicket({ sym: o.sym, side: o.side, accountId: o.accountId, qty: o.qty, type: o.type, limit: o.limit, stop: o.stop, tif: o.tif }) }]),
            { label: "Quote", icon: "chart", onClick: () => navigate("/quote/" + encodeURIComponent(o.sym)) },
            { label: "Order details", icon: "info", sub: `Placed ${fmtDateTime(o.t)} · ${accountLabel(o.accountId)}`, onClick: () => toast(`Order ID ${o.id}`) },
          ],
        });
      }
    };
    el.addEventListener("click", onClick);
    const unTick = onTick(() => applyLive(el));
    return () => {
      el.removeEventListener("click", onClick);
      unTick();
    };
  },
};
