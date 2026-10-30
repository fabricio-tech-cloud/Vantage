// Corporate and economic events relative to today.
import { rngFor } from "../util/rng.js";
import { SYMBOLS } from "./symbols.js";

const DAY = 86400000;
let cache = null;

function at(daysFromToday, hour = 9, minute = 30) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.getTime() + daysFromToday * DAY;
}

export function allEvents() {
  if (cache) return cache;
  const r = rngFor("cal");
  const ev = [];
  let id = 0;
  const push = (e) => ev.push({ id: "ev" + id++, ...e });

  for (const s of SYMBOLS.filter((x) => x.type === "STK")) {
    // earnings: one in past 20d or next 35d
    const off = Math.floor(r() * 55) - 20;
    push({ t: at(off, r() < 0.5 ? 7 : 16, r() < 0.5 ? 0 : 30), type: "Earnings", sym: s.sym, title: `${s.name} · Q3 earnings`, detail: `EPS est. ${(s.eps ? s.eps / 4 : 1.2).toFixed(2)} ${s.ccy} · ${r() < 0.5 ? "Before open" : "After close"}` });
    if (s.div) {
      const exOff = Math.floor(r() * 60) - 15;
      const amt = ((s.price * (s.div / 100)) / 4).toFixed(4);
      push({ t: at(exOff, 0, 0), type: "Dividend", sym: s.sym, title: `${s.name} · Ex-dividend`, detail: `${amt} ${s.ccy} per share · Pay date ${new Date(at(exOff + 21)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` });
      push({ t: at(exOff + 21, 0, 0), type: "Dividend", sym: s.sym, title: `${s.name} · Dividend payment`, detail: `${amt} ${s.ccy} per share` });
    }
  }
  for (const s of SYMBOLS.filter((x) => x.type === "ETF" && x.div)) {
    const exOff = Math.floor(r() * 70) - 20;
    push({ t: at(exOff, 0, 0), type: "Dividend", sym: s.sym, title: `${s.name} · Ex-dividend`, detail: `Quarterly distribution` });
  }
  // economic
  const econ = [
    [-9, "CPI (US) · Sep", "Consensus +0.3% m/m · Prior +0.4%", 8, 30],
    [-2, "GDP (US) · Q3 advance", "Consensus +2.8% q/q ann.", 8, 30],
    [1, "ISM Manufacturing PMI", "Consensus 49.6 · Prior 49.1", 10, 0],
    [4, "FOMC rate decision", "Consensus: 25 bp cut · Press conference 14:30 ET", 14, 0],
    [7, "Non-farm payrolls · Oct", "Consensus +120k · Unemployment 4.3%", 8, 30],
    [12, "CPI (US) · Oct", "Consensus +0.2% m/m", 8, 30],
    [13, "ECB rate decision", "Consensus: unchanged", 14, 15],
    [19, "SNB monetary policy assessment", "Consensus: unchanged at 0.00%", 9, 30],
    [26, "FOMC minutes", "", 14, 0],
    [33, "Non-farm payrolls · Nov", "", 8, 30],
  ];
  for (const [off, title, detail, h, m] of econ) push({ t: at(off, h, m), type: "Economic", title, detail });
  // holidays (NYSE)
  const y = new Date().getFullYear();
  const holidays = [
    [new Date(y, 10, 26), "Thanksgiving Day · US markets closed"],
    [new Date(y, 10, 27), "Day after Thanksgiving · US early close 13:00 ET"],
    [new Date(y, 11, 24), "Christmas Eve · US early close 13:00 ET"],
    [new Date(y, 11, 25), "Christmas Day · US & EU markets closed"],
    [new Date(y, 11, 26), "Boxing Day · Xetra / SIX closed"],
    [new Date(y + 1, 0, 1), "New Year's Day · Markets closed"],
  ];
  for (const [d, title] of holidays) push({ t: d.setHours(0, 0, 0, 0), type: "Holiday", title, detail: "" });
  // splits / corporate actions
  push({ t: at(9, 0, 0), type: "Corporate Action", sym: "NVDA", title: "NVIDIA · Annual shareholder meeting", detail: "Proxy voting deadline" });
  push({ t: at(16, 0, 0), type: "Corporate Action", sym: "ORCL", title: "Oracle · Investor day", detail: "" });
  ev.sort((a, b) => a.t - b.t);
  cache = ev;
  return ev;
}

export const EVENT_TYPES = ["All", "Earnings", "Dividend", "Economic", "Holiday", "Corporate Action"];

export function upcomingForSymbols(syms, days = 30) {
  const set = new Set(syms);
  const now = Date.now();
  return allEvents().filter((e) => e.sym && set.has(e.sym) && e.t >= now - DAY && e.t <= now + days * DAY);
}
