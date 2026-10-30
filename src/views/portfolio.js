import { selectedAccounts, aggregate, allocation, money, signed } from "../calc.js";
import { topbar, bellButton, segmented, section, kv, stat, empty } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { accountFilterLabel, openAccountPicker } from "../components/accountPicker.js";
import { actionSheet, openSheet } from "../components/sheet.js";
import { applyLive } from "../components/live.js";
import { donut, PALETTE } from "../components/chart.js";
import { onTick, fxToUsd } from "../quotes.js";
import { openOrderTicket } from "../components/trade.js";
import { fmtPct, fmtPrice, fmtQty, signClass, fmtMoneyAlways, fmtPlainPct, isPrivate, MASK } from "../util/format.js";
import { esc, setSign } from "../util/dom.js";
import { navigate } from "../router.js";
import { ASSET_CLASS_LABEL } from "../data/symbols.js";

let sortBy = "mv";
let groupBy = "class";
let pnlMode = "day";

const SORTS = [
  { id: "mv", label: "Market value" },
  { id: "day", label: "Day P&L" },
  { id: "unreal", label: "Unrealized P&L" },
  { id: "dayPct", label: "Day %" },
  { id: "sym", label: "Symbol" },
];

function sortPositions(list) {
  const l = [...list];
  switch (sortBy) {
    case "day":
      return l.sort((a, b) => b.day - a.day);
    case "unreal":
      return l.sort((a, b) => b.unreal - a.unreal);
    case "dayPct":
      return l.sort((a, b) => b.dayPct - a.dayPct);
    case "sym":
      return l.sort((a, b) => a.sym.localeCompare(b.sym));
    default:
      return l.sort((a, b) => b.mv - a.mv);
  }
}

function positionRow(p) {
  const v = pnlMode === "day" ? p.day : p.unreal;
  const pct = pnlMode === "day" ? p.dayPct : p.unrealPct;
  return `<button class="row pos-row" data-sym="${esc(p.sym)}">
    ${logo(p.sym, 40)}
    <span class="row-main">
      <span class="row-title">${esc(p.sym)} ${p.legs && p.legs.length > 1 ? `<span class="tag">${p.legs.length} accts</span>` : ""}</span>
      <span class="row-sub">${fmtQty(p.qty)} @ ${fmtPrice(p.avg, p.q.ccy)} · <span class="mono" data-live="price:${esc(p.sym)}">${fmtPrice(p.q.price, p.q.ccy)}</span></span>
    </span>
    <span class="row-val">
      <span data-pos-mv="${esc(p.sym)}">${money(p.mv)}</span>
      <span class="row-valsub ${signClass(v)}" data-pos-pnl="${esc(p.sym)}">${signed(v)} (${fmtPct(pct)})</span>
    </span>
  </button>`;
}

function positionsTab(agg) {
  if (!agg.positions.length) return empty("pie", "No positions", "Positions in the selected accounts will appear here.");
  const sorted = sortPositions(agg.positions);
  let body = "";
  if (groupBy === "class") {
    const groups = new Map();
    for (const p of sorted) {
      const k = ASSET_CLASS_LABEL[p.assetClass] || p.assetClass;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    for (const [k, list] of groups) {
      const mv = list.reduce((a, p) => a + p.mv, 0);
      const d = list.reduce((a, p) => a + (pnlMode === "day" ? p.day : p.unreal), 0);
      body += `<div class="group-head"><span>${esc(k)} <small>${list.length}</small></span><span>${money(mv, 0)} <b class="${signClass(d)}">${signed(d, 0)}</b></span></div><div class="list card">${list.map(positionRow).join("")}</div>`;
    }
  } else if (groupBy === "account") {
    for (const s of agg.summaries) {
      const list = sortPositions(s.positions.map((p) => ({ ...p, legs: [] })));
      const d = pnlMode === "day" ? s.dayPnl : s.unreal;
      body += `<div class="group-head"><span>${esc(s.account.alias)} <small>${s.account.id}</small></span><span>${money(s.netLiq, 0)} <b class="${signClass(d)}">${signed(d, 0)}</b></span></div><div class="list card">${list.map(positionRow).join("")}</div>`;
    }
  } else {
    body = `<div class="list card">${sorted.map(positionRow).join("")}</div>`;
  }
  const cashRows = Object.entries(agg.cashByCcy)
    .filter(([, v]) => Math.abs(v) > 0.005)
    .map(([c, v]) => `<div class="row row--plain"><span class="row-icon ico-cash">${esc(c)}</span><span class="row-main"><span class="row-title">${esc(c)} cash</span><span class="row-sub">${c !== "USD" ? "≈ " + money(v * fxToUsd(c)) : "Settled cash"}</span></span><span class="row-val"><span class="${v < 0 ? "down" : ""}">${isPrivate() ? MASK : fmtMoneyAlways(v, c)}</span></span></div>`)
    .join("");
  return `<div class="toolbar">
      <button class="tb-btn" data-action="sort">${I.sort()} ${SORTS.find((s) => s.id === sortBy).label}</button>
      <button class="tb-btn" data-action="group">${I.layers()} ${groupBy === "class" ? "By asset class" : groupBy === "account" ? "By account" : "Flat"}</button>
      <button class="tb-btn ${pnlMode === "day" ? "" : "alt"}" data-action="pnl">${pnlMode === "day" ? "Day P&L" : "Unrealized"}</button>
    </div>
    ${body}
    <div class="group-head"><span>Cash</span><span>${money(agg.cashUsd, 0)}</span></div>
    <div class="list card">${cashRows || '<div class="row row--plain"><span class="row-main muted">No cash balances</span></div>'}</div>`;
}

function summaryTab(agg) {
  const s = agg;
  const rows = [
    ["Net Liquidation Value", money(s.netLiq), "", "Total value of cash and positions"],
    ["Securities Gross Position Value", money(s.gpv), "", "Absolute market value of all positions"],
    ["Total Cash Value", money(s.cashUsd), s.cashUsd < 0 ? "down" : "", "Settled cash across currencies"],
    ["Unrealized P&L", signed(s.unreal), signClass(s.unreal), "Positions vs. average cost"],
    ["Day P&L", signed(s.dayPnl), signClass(s.dayPnl), `${fmtPct(s.dayPct)} since previous close`],
    ["Buying Power", money(s.buyingPower), "", "Max. purchase value for marginable stock"],
    ["Available Funds", money(s.availableFunds), s.availableFunds < 0 ? "down" : "", "Net Liq − Initial Margin"],
    ["Excess Liquidity", money(s.excessLiquidity), s.excessLiquidity < 0 ? "down" : "", "Net Liq − Maintenance Margin"],
    ["Initial Margin", money(s.initMargin), "", "Required to open positions"],
    ["Maintenance Margin", money(s.maintMargin), "", "Required to hold positions"],
    ["SMA", money(s.sma), "", "Special Memorandum Account"],
    ["Leverage", s.leverage.toFixed(2) + "x", s.leverage > 1.5 ? "down" : "", "GPV / Net Liquidation"],
  ];
  const perAccount = s.summaries
    .map(
      (a) => `<details class="acc-details"><summary><span class="row-icon ${a.account.kind === "client" ? "ico-client" : "ico-private"}">${a.account.kind === "client" ? I.users() : I.user()}</span><span class="row-main"><span class="row-title">${esc(a.account.alias)}</span><span class="row-sub">${a.account.id} · ${a.account.type}${a.account.kind === "client" ? " · Client" : ""}</span></span><span class="row-val"><span>${money(a.netLiq)}</span><span class="row-valsub ${signClass(a.dayPnl)}">${signed(a.dayPnl)}</span></span>${I.chevD()}</summary>
        <div class="kv-list">
          ${kv("Cash", money(a.cashUsd), a.cashUsd < 0 ? "down" : "")}
          ${kv("Securities", money(a.secValue))}
          ${kv("Unrealized P&L", signed(a.unreal), signClass(a.unreal))}
          ${kv("Buying power", money(a.buyingPower))}
          ${kv("Excess liquidity", money(a.excessLiquidity))}
          ${kv("Maintenance margin", money(a.maintMargin))}
          ${kv("Positions", String(a.positions.length))}
        </div></details>`
    )
    .join("");
  return `<div class="kv-list card">${rows.map(([l, v, c, sub]) => `<div class="kv kv--rich"><span>${l}<small>${sub}</small></span><strong class="${c}">${v}</strong></div>`).join("")}</div>
    ${section("By account", `<div class="list card">${perAccount}</div>`)}`;
}

function allocTab(agg) {
  const alloc = allocation(agg);
  const block = (title, list) => {
    const slices = list.slice(0, 8).map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
    return section(
      title,
      `<div class="alloc card">
        ${donut(slices, { size: 140, thickness: 20, centerTitle: isPrivate() ? MASK : fmtPlainPct(slices[0]?.pct || 0, 0), centerSub: esc(slices[0]?.label || "") })}
        <div class="legend">${slices.map((s) => `<div class="legend-row"><i style="background:${s.color}"></i><span>${esc(s.label)}</span><b>${fmtPlainPct(s.pct)}</b><small>${money(s.value, 0)}</small></div>`).join("")}</div>
      </div>`
    );
  };
  return block("Asset class", alloc.byClass) + block("Sector", alloc.bySector) + block("Currency", alloc.byCcy) + block("Region", alloc.byRegion);
}

export default {
  nav: "portfolio",
  render(params) {
    const tab = params.tab || "positions";
    const accs = selectedAccounts();
    const agg = aggregate(accs);
    return `${topbar({
      left: `<button class="acct-pill acct-pill--bar" data-action="pick-account">${I.layers()}<span>${esc(accountFilterLabel())}</span>${I.chevD()}</button>`,
      center: `<span></span>`,
      right: `<button class="icon-btn" data-href="/search" aria-label="Search">${I.search()}</button>${bellButton()}`,
    })}
    <div class="port-head">
      <div><span class="muted small">Net Liquidation Value</span><p class="port-value" data-h="netliq">${money(agg.netLiq)}</p></div>
      <div class="port-side"><span class="muted small">Day P&L</span><p class="${signClass(agg.dayPnl)}" data-h="day">${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)})</p></div>
    </div>
    <div class="stats3">
      ${stat("Cash", money(agg.cashUsd, 0), agg.cashUsd < 0 ? "down" : "")}
      ${stat("Unrealized", signed(agg.unreal, 0), signClass(agg.unreal))}
      ${stat("Buying power", money(agg.buyingPower, 0))}
    </div>
    ${segmented("tab", [{ id: "positions", label: "Positions" }, { id: "summary", label: "Summary" }, { id: "allocation", label: "Allocation" }], tab, "seg--tabs")}
    <div class="tab-body">${tab === "summary" ? summaryTab(agg) : tab === "allocation" ? allocTab(agg) : positionsTab(agg)}</div>`;
  },
  mount(el, params) {
    const onClick = (e) => {
      const seg = e.target.closest("[data-seg='tab'] button");
      if (seg) {
        navigate(seg.dataset.value === "positions" ? "/portfolio" : "/portfolio/" + seg.dataset.value, { replace: true });
        return;
      }
      const pos = e.target.closest("[data-sym]");
      if (pos) {
        openPositionActions(pos.dataset.sym);
        return;
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      if (a.dataset.action === "pick-account") openAccountPicker();
      if (a.dataset.action === "sort")
        actionSheet({ title: "Sort positions", actions: SORTS.map((s) => ({ label: s.label, icon: s.id === sortBy ? "check" : undefined, onClick: () => ((sortBy = s.id), navigate(location.hash.slice(1))) })) });
      if (a.dataset.action === "group")
        actionSheet({
          title: "Group positions",
          actions: [
            { label: "By asset class", onClick: () => ((groupBy = "class"), navigate(location.hash.slice(1))) },
            { label: "By account", onClick: () => ((groupBy = "account"), navigate(location.hash.slice(1))) },
            { label: "Flat list", onClick: () => ((groupBy = "flat"), navigate(location.hash.slice(1))) },
          ],
        });
      if (a.dataset.action === "pnl") {
        pnlMode = pnlMode === "day" ? "unreal" : "day";
        navigate(location.hash.slice(1));
      }
    };
    el.addEventListener("click", onClick);
    const unTick = onTick(() => {
      applyLive(el);
      const agg = aggregate(selectedAccounts());
      const n = el.querySelector("[data-h=netliq]");
      if (n) n.textContent = money(agg.netLiq);
      const d = el.querySelector("[data-h=day]");
      if (d) {
        d.textContent = `${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)})`;
        setSign(d, agg.dayPnl);
      }
      for (const p of agg.positions) {
        const mv = el.querySelector(`[data-pos-mv="${CSS.escape(p.sym)}"]`);
        if (mv) mv.textContent = money(p.mv);
        const pn = el.querySelector(`[data-pos-pnl="${CSS.escape(p.sym)}"]`);
        if (pn) {
          const v = pnlMode === "day" ? p.day : p.unreal;
          pn.textContent = `${signed(v)} (${fmtPct(pnlMode === "day" ? p.dayPct : p.unrealPct)})`;
          setSign(pn, v);
        }
      }
    });
    void params;
    return () => {
      el.removeEventListener("click", onClick);
      unTick();
    };
  },
};

export function openPositionActions(sym) {
  const agg = aggregate(selectedAccounts());
  const p = agg.positions.find((x) => x.sym === sym);
  const legs = p?.legs || [];
  actionSheet({
    title: sym,
    actions: [
      { label: "Quote & chart", icon: "chart", onClick: () => navigate("/quote/" + encodeURIComponent(sym)) },
      { label: "Buy", icon: "arrowUR", onClick: () => openOrderTicket({ sym, side: "BUY" }) },
      { label: "Sell", icon: "arrowDR", onClick: () => openOrderTicket({ sym, side: "SELL", qty: legs[0]?.qty, accountId: legs[0]?.accountId }) },
      { label: "Close position", icon: "close", sub: legs.length > 1 ? `${legs.length} accounts · choose in ticket` : `${fmtQty(p?.qty || 0)} in ${legs[0]?.accountId || ""}`, onClick: () => openOrderTicket({ sym, side: (p?.qty || 0) >= 0 ? "SELL" : "BUY", qty: Math.abs(legs[0]?.qty || 0), accountId: legs[0]?.accountId, type: "MKT" }) },
      { label: "Position details", icon: "info", onClick: () => openPositionDetails(sym) },
      { label: "Set price alert", icon: "bellPlus", onClick: () => navigate("/alerts/new/" + encodeURIComponent(sym)) },
    ],
  });
}

function openPositionDetails(sym) {
  const agg = aggregate(selectedAccounts());
  const p = agg.positions.find((x) => x.sym === sym);
  if (!p) return;
  openSheet({
    title: `${sym} · position`,
    html: `<div class="kv-list">
      ${kv("Quantity", fmtQty(p.qty))}
      ${kv("Average cost", fmtPrice(p.avg, p.q.ccy))}
      ${kv("Last price", fmtPrice(p.q.price, p.q.ccy))}
      ${kv("Market value", money(p.mv))}
      ${kv("Cost basis", money(p.cost))}
      ${kv("Unrealized P&L", `${signed(p.unreal)} (${fmtPct(p.unrealPct)})`, signClass(p.unreal))}
      ${kv("Day P&L", `${signed(p.day)} (${fmtPct(p.dayPct)})`, signClass(p.day))}
      ${kv("Portfolio weight", fmtPlainPct(p.weight))}
    </div>
    <h4 class="sub-title">Held in</h4>
    <div class="list">${p.legs.map((l) => `<div class="row row--plain"><span class="row-main"><span class="row-title">${esc(accountAlias(l.accountId))}</span><span class="row-sub">${l.accountId}</span></span><span class="row-val"><span>${fmtQty(l.qty)} @ ${fmtPrice(l.avg, l.q.ccy)}</span><span class="row-valsub ${signClass(l.unreal)}">${signed(l.unreal)}</span></span></div>`).join("")}</div>`,
  });
}

function accountAlias(id) {
  const a = selectedAccounts().find((x) => x.id === id);
  return a ? a.alias : id;
}
