// Update DOM nodes tagged with data-live="kind:SYM" after a quote tick.
import { getQuote } from "../quotes.js";
import { fmtPrice, fmtPct, fmtSignedAlways, signClass } from "../util/format.js";

function swapSign(el, v) {
  el.classList.remove("up", "down", "flat", "pill-up", "pill-down", "pill-flat");
  const s = signClass(v);
  el.classList.add(el.classList.contains("pill") ? "pill-" + s : s);
}

export function applyLive(root) {
  const nodes = root.querySelectorAll("[data-live]");
  for (const el of nodes) {
    const i = el.dataset.live.indexOf(":");
    const kind = el.dataset.live.slice(0, i);
    const sym = el.dataset.live.slice(i + 1);
    const q = getQuote(sym);
    if (!q) continue;
    let text;
    switch (kind) {
      case "price":
        text = fmtPrice(q.price, q.ccy);
        break;
      case "pct":
        text = fmtPct(q.chgPct);
        swapSign(el, q.chgPct);
        break;
      case "chg":
        text = fmtSignedAlways(q.chg, q.ccy, q.price < 1 ? 4 : 2);
        swapSign(el, q.chg);
        break;
      case "chgpct":
        text = `${fmtSignedAlways(q.chg, q.ccy, q.price < 1 ? 4 : 2)} (${fmtPct(q.chgPct)})`;
        swapSign(el, q.chg);
        break;
      default:
        continue;
    }
    if (el.textContent !== text) {
      el.textContent = text;
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    }
  }
}
