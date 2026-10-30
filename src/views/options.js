import { getQuote, optionSymbol, optionQuote, bidAsk } from "../quotes.js";
import { topbar, segmented, chips } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { openOrderTicket } from "../components/trade.js";
import { fmtPrice, fmtPct, fmtCompact, fmtPlainPct, signClass, fmtDateShort } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { actionSheet } from "../components/sheet.js";

let right = "C";
let expiryIdx = 0;

function expiries() {
  // next 4 monthly (3rd Friday) + 2 weeklies
  const out = [];
  const now = new Date();
  for (let i = 0; i < 2; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7) + i * 7);
    d.setHours(16, 0, 0, 0);
    out.push(d.getTime());
  }
  for (let m = 0; m < 5; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const day = 1 + ((5 - d.getDay() + 7) % 7) + 14;
    d.setDate(day);
    d.setHours(16, 0, 0, 0);
    if (d.getTime() > now.getTime() + 3 * 86400000 && !out.includes(d.getTime())) out.push(d.getTime());
  }
  return [...new Set(out)].sort((a, b) => a - b).slice(0, 6);
}

function strikesFor(q) {
  const p = q.price;
  const step = p > 1000 ? 25 : p > 500 ? 10 : p > 200 ? 5 : p > 50 ? 2.5 : p > 20 ? 1 : 0.5;
  const atm = Math.round(p / step) * step;
  const out = [];
  for (let i = -7; i <= 7; i++) out.push(Math.round((atm + i * step) * 100) / 100);
  return out;
}

export default {
  nav: null,
  render({ sym }) {
    const q = getQuote(sym);
    if (!q) return `${topbar({ title: "Options" })}<div class="empty"><h3>Unknown symbol</h3></div>`;
    const exps = expiries();
    const exp = exps[Math.min(expiryIdx, exps.length - 1)];
    const strikes = strikesFor(q);
    const dte = Math.max(0, Math.round((exp - Date.now()) / 86400000));
    const rows = strikes
      .map((k) => {
        const os = optionSymbol(sym, exp, k, right);
        const o = optionQuote(os);
        const { bid, ask } = bidAsk(o);
        const itm = right === "C" ? k < q.price : k > q.price;
        return `<button class="opt-row ${itm ? "itm" : ""}" data-opt="${esc(os)}">
          <span class="opt-strike mono">${k}</span>
          <span class="mono">${fmtPrice(bid, q.ccy)}</span>
          <span class="mono">${fmtPrice(ask, q.ccy)}</span>
          <span class="mono ${signClass(o.chg)}">${fmtPct(o.chgPct)}</span>
          <span class="mono muted">${fmtPlainPct(o.iv * 100, 0)}</span>
          <span class="mono muted">${o.delta.toFixed(2)}</span>
          <span class="mono muted">${fmtCompact(o.openInterest)}</span>
        </button>`;
      })
      .join("");
    return `${topbar({
      left: "back",
      center: `<div class="topbar-title topbar-title--sym">${logo(sym, 26)}<h1>${esc(sym)} options</h1><span class="mono" data-live="price:${esc(sym)}">${fmtPrice(q.price, q.ccy)} <b class="${signClass(q.chgPct)}">${fmtPct(q.chgPct)}</b></span></div>`,
      right: `<button class="icon-btn" data-action="strategy">${I.layers()}</button>`,
    })}
    ${chips("exp", exps.map((t, i) => ({ id: String(i), label: fmtDateShort(t) + (i < 2 ? " (W)" : "") })), String(Math.min(expiryIdx, exps.length - 1)))}
    <div class="opt-head">
      ${segmented("right", [{ id: "C", label: "Calls" }, { id: "P", label: "Puts" }], right)}
      <span class="muted small">${dte} DTE · ${fmtDateShort(exp)} · Multiplier 100</span>
    </div>
    <div class="opt-table">
      <div class="opt-row opt-row--head"><span>Strike</span><span>Bid</span><span>Ask</span><span>Chg</span><span>IV</span><span>Δ</span><span>OI</span></div>
      ${rows}
    </div>
    <p class="disclaimer">Option prices are model-based (Black-Scholes) for demonstration. Trading options involves significant risk.</p>`;
  },
  mount(el, { sym }) {
    const onClick = (e) => {
      const c = e.target.closest("[data-chips='exp'] button");
      if (c) {
        expiryIdx = Number(c.dataset.value);
        navigate(location.hash.slice(1));
        return;
      }
      const s = e.target.closest("[data-seg='right'] button");
      if (s) {
        right = s.dataset.value;
        navigate(location.hash.slice(1));
        return;
      }
      const o = e.target.closest("[data-opt]");
      if (o) {
        const os = o.dataset.opt;
        actionSheet({
          title: os,
          actions: [
            { label: "Buy to open", icon: "arrowUR", onClick: () => openOrderTicket({ sym: os, side: "BUY", qty: 1 }) },
            { label: "Sell to open", icon: "arrowDR", onClick: () => openOrderTicket({ sym: os, side: "SELL", qty: 1 }) },
            { label: "Contract details", icon: "info", onClick: () => navigate("/quote/" + encodeURIComponent(os)) },
          ],
        });
        return;
      }
      if (e.target.closest("[data-action='strategy']")) {
        actionSheet({
          title: "Strategy builder",
          actions: [
            { label: "Covered call", sub: "Long stock + short call", icon: "layers", onClick: () => openOrderTicket({ sym: optionSymbol(sym, expiries()[2], strikesFor(getQuote(sym))[9], "C"), side: "SELL", qty: 1 }) },
            { label: "Protective put", sub: "Long stock + long put", icon: "shield", onClick: () => openOrderTicket({ sym: optionSymbol(sym, expiries()[2], strikesFor(getQuote(sym))[5], "P"), side: "BUY", qty: 1 }) },
            { label: "Cash-secured put", sub: "Short put, cash collateral", icon: "dollar", onClick: () => openOrderTicket({ sym: optionSymbol(sym, expiries()[2], strikesFor(getQuote(sym))[5], "P"), side: "SELL", qty: 1 }) },
          ],
        });
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  },
};
