// Order ticket bottom sheet.
import { openSheet, toast } from "./sheet.js";
import { I, logo } from "./icons.js";
import { segmented, select, field, toggle, kv } from "./ui.js";
import { state, getAccounts } from "../state.js";
import { includedAccounts, accountSummary, money } from "../calc.js";
import { getQuote, bidAsk, fxToUsd, marketStatus } from "../quotes.js";
import { ORDER_TYPES, TIFS, commissionFor, placeOrder, modifyOrder } from "../engine.js";
import { fmtPrice, fmtNum, fmtPct, fmtMoneyAlways, signClass, fmtQty } from "../util/format.js";
import { esc, haptic } from "../util/dom.js";
import { navigate } from "../router.js";

function tick(q) {
  if (q.type === "CASH") return 0.00005;
  if (q.type === "CRYPTO") return q.price > 1000 ? 1 : 0.01;
  return 0.01;
}
const round = (v, t) => Math.round(v / t) * t;
const dec = (t) => (t >= 1 ? 0 : t >= 0.01 ? 2 : 5);

export function openOrderTicket({ sym, side = "BUY", accountId, qty, orderId = null, type, limit, stop, tif } = {}) {
  const q = getQuote(sym);
  if (!q) return toast("Unknown symbol", { type: "error" });
  const accounts = includedAccounts();
  const holders = accounts.filter((a) => a.positions.some((p) => p.sym === sym));
  const defaultAcc = accountId || (state.accountFilter !== "ALL" ? state.accountFilter : holders[0]?.id) || accounts.find((a) => a.kind === "private")?.id || accounts[0]?.id;
  const t = tick(q);
  const { bid, ask } = bidAsk(q);
  const f = {
    sym,
    side,
    accountId: defaultAcc,
    qty: qty ?? (q.type === "CRYPTO" ? 0.01 : q.type === "CASH" ? 1000 : 10),
    type: type || state.settings.defaultOrderType,
    limit: limit ?? round(side === "BUY" ? bid : ask, t),
    stop: stop ?? round(side === "BUY" ? q.price * 1.02 : q.price * 0.98, t),
    trail: round(q.price * 0.03, t),
    tif: tif || state.settings.defaultTif,
    outsideRth: state.settings.outsideRth,
  };
  const positionQty = () => {
    const acc = accounts.find((a) => a.id === f.accountId);
    return acc?.positions.find((p) => p.sym === sym)?.qty || 0;
  };
  const estPrice = () => (f.type === "LMT" || f.type === "LOC" || f.type === "STP LMT" ? f.limit : f.type === "STP" ? f.stop : f.side === "BUY" ? ask : bid);
  const summary = () => {
    const px = estPrice();
    const value = f.qty * px * (q.multiplier || 1);
    const comm = commissionFor(q, f.qty, px);
    const acc = accounts.find((a) => a.id === f.accountId);
    const s = acc ? accountSummary(acc) : null;
    const valueUsd = value * fxToUsd(q.ccy);
    const bp = s ? s.buyingPower : 0;
    const pos = positionQty();
    let warn = "";
    if (f.side === "BUY" && s && valueUsd + comm > bp) warn = "Order value exceeds buying power";
    if (f.side === "SELL" && f.qty > pos) warn = pos > 0 ? `You hold ${fmtQty(pos)} · this would open a short position` : "No position · this would open a short position";
    if (f.side === "SELL" && f.qty > pos && s && !s.isMargin) warn = "Short selling is not available in cash accounts";
    if (f.qty <= 0) warn = "Enter a quantity";
    return { px, value, comm, bp, pos, warn, s, blocked: f.qty <= 0 || (f.side === "SELL" && f.qty > pos && s && !s.isMargin) };
  };

  const headHtml = () => `<div class="ticket-head">
      ${logo(sym, 40)}
      <div class="ticket-sym"><strong>${esc(sym)}</strong><span>${esc(q.name)}</span></div>
      <div class="ticket-px"><span class="mono" data-live="price:${esc(sym)}">${fmtPrice(q.price, q.ccy)}</span><span class="${signClass(q.chgPct)}" data-live="chgpct:${esc(sym)}">${fmtPct(q.chgPct)}</span></div>
    </div>`;

  const formHtml = () => {
    const sm = summary();
    const accOpts = accounts.map((a) => ({ id: a.id, label: `${a.alias} · ${a.id}${a.kind === "client" ? " (client)" : ""}` }));
    const showLimit = ["LMT", "STP LMT", "LOC"].includes(f.type);
    const showStop = ["STP", "STP LMT"].includes(f.type);
    const showTrail = f.type === "TRAIL";
    const qtyStep = q.type === "CRYPTO" ? 0.01 : q.type === "CASH" ? 1000 : 1;
    return `${headHtml()}
    ${segmented("side", [{ id: "BUY", label: "Buy" }, { id: "SELL", label: "Sell" }], f.side, "seg--side seg--" + f.side.toLowerCase())}
    ${field("Account", select("account", accOpts, f.accountId))}
    <div class="field"><span>Quantity ${q.type === "OPT" ? "(contracts)" : q.type === "CASH" ? "(" + sym.split(".")[0] + ")" : ""}</span>
      <div class="stepper"><button type="button" data-step="-${qtyStep}">${I.minus()}</button><input class="input mono" inputmode="decimal" name="qty" value="${f.qty}"/><button type="button" data-step="${qtyStep}">${I.plus()}</button></div>
      <div class="quick-row">${sm.pos ? `<small>Position: ${fmtQty(sm.pos)}</small>` : `<small>Buying power: ${money(sm.bp)}</small>`}
        <span class="quick-btns">${f.side === "SELL" && sm.pos ? [25, 50, 100].map((p) => `<button type="button" data-pct="${p}">${p}%</button>`).join("") : `<button type="button" data-max>Max</button>`}</span></div>
    </div>
    ${field("Order type", select("type", ORDER_TYPES.map((o) => ({ id: o.id, label: o.label })), f.type))}
    <div class="grid2">
      ${showLimit ? `<div class="field"><span>Limit price</span><div class="stepper"><button type="button" data-pstep="limit:-1">${I.minus()}</button><input class="input mono" inputmode="decimal" name="limit" value="${f.limit.toFixed(dec(t))}"/><button type="button" data-pstep="limit:1">${I.plus()}</button></div></div>` : ""}
      ${showStop ? `<div class="field"><span>Stop price</span><div class="stepper"><button type="button" data-pstep="stop:-1">${I.minus()}</button><input class="input mono" inputmode="decimal" name="stop" value="${f.stop.toFixed(dec(t))}"/><button type="button" data-pstep="stop:1">${I.plus()}</button></div></div>` : ""}
      ${showTrail ? `<div class="field"><span>Trailing amount</span><div class="stepper"><button type="button" data-pstep="trail:-1">${I.minus()}</button><input class="input mono" inputmode="decimal" name="trail" value="${f.trail.toFixed(dec(t))}"/><button type="button" data-pstep="trail:1">${I.plus()}</button></div></div>` : ""}
      ${field("Time in force", select("tif", TIFS.map((o) => ({ id: o.id, label: o.label })), f.tif))}
    </div>
    <div class="row row--plain"><span class="row-main"><span class="row-title">Allow outside regular hours</span><span class="row-sub">Fill during pre-market and after hours</span></span>${toggle("outsideRth", f.outsideRth)}</div>
    <div class="ticket-summary">
      ${kv("Bid / Ask", `<span class="mono">${fmtPrice(bid, q.ccy)} × ${fmtPrice(ask, q.ccy)}</span>`)}
      ${kv("Est. " + (f.side === "BUY" ? "cost" : "proceeds"), `<span data-sum="value">${fmtMoneyAlways(sm.value, q.ccy)}</span>`)}
      ${kv("Commission (est.)", `<span data-sum="comm">${fmtMoneyAlways(sm.comm, q.ccy)}</span>`)}
      ${kv("Market", marketStatus().label)}
    </div>
    <p class="ticket-warn ${sm.warn ? "" : "hidden"}" data-warn>${esc(sm.warn)}</p>
    <button class="btn btn-block btn-${f.side.toLowerCase()}" data-preview ${sm.blocked ? "disabled" : ""}>${orderId ? "Preview changes" : "Preview order"}</button>`;
  };

  const previewHtml = () => {
    const sm = summary();
    const typeLabel = ORDER_TYPES.find((o) => o.id === f.type)?.label;
    return `${headHtml()}
    <h4 class="ticket-title">${orderId ? "Modify" : "Confirm"} ${f.side === "BUY" ? "buy" : "sell"} order</h4>
    <div class="ticket-summary">
      ${kv("Account", esc(accounts.find((a) => a.id === f.accountId)?.alias + " · " + f.accountId))}
      ${kv("Action", `<span class="${f.side === "BUY" ? "up" : "down"}">${f.side}</span>`)}
      ${kv("Quantity", fmtQty(f.qty))}
      ${kv("Order type", typeLabel)}
      ${["LMT", "STP LMT", "LOC"].includes(f.type) ? kv("Limit price", fmtPrice(f.limit, q.ccy)) : ""}
      ${["STP", "STP LMT"].includes(f.type) ? kv("Stop price", fmtPrice(f.stop, q.ccy)) : ""}
      ${f.type === "TRAIL" ? kv("Trailing amount", fmtPrice(f.trail, q.ccy)) : ""}
      ${kv("Time in force", f.tif + (f.outsideRth ? " · Outside RTH" : ""))}
      ${kv("Est. " + (f.side === "BUY" ? "cost" : "proceeds"), fmtMoneyAlways(sm.value, q.ccy))}
      ${kv("Commission (est.)", fmtMoneyAlways(sm.comm, q.ccy))}
      ${kv("Total", `<strong>${fmtMoneyAlways(sm.value + (f.side === "BUY" ? sm.comm : -sm.comm), q.ccy)}</strong>`)}
    </div>
    <p class="muted small">Orders are simulated in this demo. Market orders fill immediately at the current bid/ask.</p>
    <div class="btn-row"><button class="btn btn-ghost" data-back>Edit</button><button class="btn btn-${f.side.toLowerCase()}" data-submit>${orderId ? "Submit changes" : `Submit ${f.side === "BUY" ? "buy" : "sell"} order`}</button></div>`;
  };

  const resultHtml = (res) => {
    const o = res.order;
    const filled = o.status === "Filled";
    return `<div class="ticket-result">
      <span class="result-icon ${filled ? "ok" : o.status === "Cancelled" ? "bad" : "pending"}">${filled ? I.check() : o.status === "Cancelled" ? I.close() : I.clock()}</span>
      <h4>${filled ? "Order filled" : o.status === "Cancelled" ? "Order cancelled" : "Order submitted"}</h4>
      <p>${o.side} ${fmtQty(o.qty)} ${esc(o.sym)} ${filled ? `@ ${fmtPrice(o.fillPrice, q.ccy)}` : `· ${o.type}${o.limit ? " @ " + fmtPrice(o.limit, q.ccy) : ""} · ${o.tif}`}</p>
      ${o.reason ? `<p class="muted small">${esc(o.reason)}</p>` : ""}
      <div class="btn-row"><button class="btn btn-ghost" data-done>Done</button><button class="btn btn-primary" data-orders>View orders</button></div>
    </div>`;
  };

  openSheet({
    title: orderId ? "Modify order" : "Trade",
    cls: "sheet--ticket",
    html: formHtml(),
    onMount(body, close) {
      const rerender = () => {
        body.innerHTML = formHtml();
      };
      const refreshSummary = () => {
        const sm = summary();
        body.querySelector('[data-sum="value"]').textContent = fmtMoneyAlways(sm.value, q.ccy);
        body.querySelector('[data-sum="comm"]').textContent = fmtMoneyAlways(sm.comm, q.ccy);
        const w = body.querySelector("[data-warn]");
        w.textContent = sm.warn;
        w.classList.toggle("hidden", !sm.warn);
        body.querySelector("[data-preview]").disabled = sm.blocked;
      };
      body.addEventListener("change", (e) => {
        const n = e.target.name;
        if (n === "account") {
          f.accountId = e.target.value;
          rerender();
        } else if (n === "type") {
          f.type = e.target.value;
          rerender();
        } else if (n === "tif") f.tif = e.target.value;
        else if (n === "outsideRth") f.outsideRth = e.target.checked;
      });
      body.addEventListener("input", (e) => {
        const n = e.target.name;
        if (!n) return;
        const v = parseFloat(String(e.target.value).replace(",", "."));
        if (n === "qty") f.qty = isFinite(v) ? v : 0;
        if (n === "limit" && isFinite(v)) f.limit = v;
        if (n === "stop" && isFinite(v)) f.stop = v;
        if (n === "trail" && isFinite(v)) f.trail = v;
        refreshSummary();
      });
      body.addEventListener("click", (e) => {
        const seg = e.target.closest("[data-seg='side'] button");
        if (seg) {
          f.side = seg.dataset.value;
          f.limit = round(f.side === "BUY" ? bid : ask, t);
          haptic();
          rerender();
          return;
        }
        const st = e.target.closest("[data-step]");
        if (st) {
          const d = parseFloat(st.dataset.step);
          f.qty = Math.max(0, Math.round((f.qty + d) * 1e4) / 1e4);
          body.querySelector('[name="qty"]').value = f.qty;
          refreshSummary();
          return;
        }
        const ps = e.target.closest("[data-pstep]");
        if (ps) {
          const [k, dir] = ps.dataset.pstep.split(":");
          f[k] = Math.max(t, round(f[k] + Number(dir) * t, t));
          body.querySelector(`[name="${k}"]`).value = f[k].toFixed(dec(t));
          refreshSummary();
          return;
        }
        const pct = e.target.closest("[data-pct]");
        if (pct) {
          const pos = positionQty();
          f.qty = Math.round(((pos * Number(pct.dataset.pct)) / 100) * 1e4) / 1e4;
          body.querySelector('[name="qty"]').value = f.qty;
          refreshSummary();
          return;
        }
        if (e.target.closest("[data-max]")) {
          const sm = summary();
          const px = estPrice() * fxToUsd(q.ccy) * (q.multiplier || 1);
          const max = px > 0 ? Math.floor((sm.bp / px) * (q.type === "CRYPTO" ? 10000 : 1)) / (q.type === "CRYPTO" ? 10000 : 1) : 0;
          f.qty = Math.max(0, max);
          body.querySelector('[name="qty"]').value = f.qty;
          refreshSummary();
          return;
        }
        if (e.target.closest("[data-preview]")) {
          if (!state.settings.confirmOrders) return submit();
          body.innerHTML = previewHtml();
          return;
        }
        if (e.target.closest("[data-back]")) {
          rerender();
          return;
        }
        if (e.target.closest("[data-submit]")) {
          submit();
          return;
        }
        if (e.target.closest("[data-done]")) {
          close();
          return;
        }
        if (e.target.closest("[data-orders]")) {
          close();
          navigate("/orders");
        }
      });
      const submit = () => {
        haptic(15);
        const payload = { sym, side: f.side, accountId: f.accountId, qty: f.qty, type: f.type, tif: f.tif, outsideRth: f.outsideRth };
        if (["LMT", "STP LMT", "LOC"].includes(f.type)) payload.limit = f.limit;
        if (["STP", "STP LMT"].includes(f.type)) payload.stop = f.stop;
        if (f.type === "TRAIL") payload.trail = f.trail;
        if (orderId) {
          modifyOrder(orderId, payload);
          toast("Order modified", { type: "success" });
          close();
          return;
        }
        const res = placeOrder(payload);
        body.innerHTML = resultHtml(res);
        toast(res.order.status === "Filled" ? "Order filled" : res.order.status === "Cancelled" ? "Order cancelled" : "Order submitted", { type: res.order.status === "Cancelled" ? "error" : "success" });
      };
    },
  });
}

export function accountOptions() {
  return getAccounts().map((a) => ({ id: a.id, label: `${a.alias} · ${a.id}` }));
}
