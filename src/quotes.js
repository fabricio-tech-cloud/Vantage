import { SYMBOLS } from "./data/symbols.js";
import { rngFor, gaussian } from "./util/rng.js";

const quotes = new Map();
const listeners = new Set();

function volFor(s, r) {
  if (s.type === "IND" || s.type === "CASH") return 0;
  const base = s.mcap ? Math.sqrt(s.mcap) * 8 : 2e6;
  return Math.round(base * (0.6 + r() * 0.8));
}

for (const s of SYMBOLS) {
  const r = rngFor("q:" + s.sym);
  const prevClose = s.price / (1 + s.chgPct / 100);
  const open = prevClose * (1 + (r() - 0.5) * 0.012);
  const high = Math.max(s.price, open) * (1 + r() * 0.008);
  const low = Math.min(s.price, open) * (1 - r() * 0.008);
  const avgVol = volFor(s, r);
  quotes.set(s.sym, {
    ...s,
    prevClose,
    open,
    high,
    low,
    avgVol,
    vol: Math.round(avgVol * (0.55 + r() * 0.7)),
    chg: s.price - prevClose,
    hi52: s.hi52 ?? s.price * 1.25,
    lo52: s.lo52 ?? s.price * 0.72,
    bidSize: Math.round(1 + r() * 40) * 100,
    askSize: Math.round(1 + r() * 40) * 100,
    seed: r(),
  });
}

/* ---------------- options ---------------- */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export function optionSymbol(und, expiry, strike, right) {
  const d = new Date(expiry);
  const e = `${String(d.getDate()).padStart(2, "0")}${MONTHS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
  return `${und} ${e} ${strike} ${right}`;
}
export function parseOptionSymbol(sym) {
  const m = /^(\S+) (\d{2})([A-Z]{3})(\d{2}) ([\d.]+) ([CP])$/.exec(sym);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[3]);
  const expiry = new Date(2000 + Number(m[4]), mi, Number(m[2]), 16, 0, 0).getTime();
  return { und: m[1], expiry, strike: Number(m[5]), right: m[6] };
}
function ncdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}
export function impliedVol(q, strike, T) {
  const base = q.type === "CRYPTO" ? 0.62 : q.type === "ETF" ? 0.17 : Math.min(0.9, 0.18 + (q.beta ?? 1) * 0.12);
  const m = Math.log(strike / q.price);
  return base * (1 + 0.9 * m * m) * (1 + 0.05 / Math.max(T, 0.02)) * (m < 0 ? 1.05 : 1);
}
export function bsPrice(spot, strike, T, iv, right, r = 0.04) {
  if (T <= 0) return Math.max(0, right === "C" ? spot - strike : strike - spot);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  const price = right === "C" ? spot * ncdf(d1) - strike * Math.exp(-r * T) * ncdf(d2) : strike * Math.exp(-r * T) * ncdf(-d2) - spot * ncdf(-d1);
  const delta = right === "C" ? ncdf(d1) : ncdf(d1) - 1;
  return { price: Math.max(0.01, price), delta, d1, d2 };
}
export function optionQuote(sym) {
  const o = parseOptionSymbol(sym);
  if (!o) return null;
  const u = quotes.get(o.und);
  if (!u) return null;
  const T = Math.max((o.expiry - Date.now()) / (365 * 86400000), 0.0005);
  const iv = impliedVol(u, o.strike, T);
  const now = bsPrice(u.price, o.strike, T, iv, o.right);
  const prev = bsPrice(u.prevClose, o.strike, T + 1 / 365, iv, o.right);
  const price = Math.round(now.price * 100) / 100;
  const prevClose = Math.round(prev.price * 100) / 100;
  const r = rngFor("o:" + sym);
  return {
    sym,
    name: `${u.name} ${o.strike} ${o.right === "C" ? "Call" : "Put"}`,
    exch: "SMART",
    ccy: u.ccy,
    type: "OPT",
    sector: u.sector,
    price,
    prevClose,
    chg: price - prevClose,
    chgPct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    open: prevClose,
    high: Math.max(price, prevClose) * 1.03,
    low: Math.min(price, prevClose) * 0.97,
    vol: Math.round(r() * 4000),
    avgVol: Math.round(r() * 5000),
    openInterest: Math.round(r() * 20000),
    iv,
    delta: now.delta,
    multiplier: 100,
    bg: u.bg,
    fg: u.fg,
    t: u.t,
    option: o,
    underlying: u,
  };
}

/* ---------------- public API ---------------- */
export function getQuote(sym) {
  return quotes.get(sym) || optionQuote(sym);
}
export const allQuotes = () => [...quotes.values()];
export const hasSymbol = (sym) => quotes.has(sym);

export function spread(q) {
  if (!q) return 0;
  if (q.type === "CASH") return Math.max(0.00005, q.price * 0.00004);
  if (q.type === "CRYPTO") return q.price * 0.0005;
  if (q.type === "OPT") return Math.max(0.01, q.price * 0.02);
  return Math.max(0.01, q.price * 0.0003);
}
export function bidAsk(q) {
  const sp = spread(q);
  const d = q.type === "CASH" ? 5 : 2;
  const round = (v) => Math.round(v * 10 ** d) / 10 ** d;
  return { bid: round(q.price - sp / 2), ask: round(q.price + sp / 2), bidSize: q.bidSize ?? 300, askSize: q.askSize ?? 200 };
}

/** FX rate: 1 unit of ccy in USD. */
export function fxToUsd(ccy) {
  switch (ccy) {
    case "USD":
      return 1;
    case "EUR":
      return quotes.get("EUR.USD").price;
    case "GBP":
      return quotes.get("GBP.USD").price;
    case "CHF":
      return 1 / quotes.get("USD.CHF").price;
    case "JPY":
      return 1 / quotes.get("USD.JPY").price;
    case "HKD":
      return 1 / quotes.get("USD.HKD").price;
    default:
      return 1;
  }
}
export function convert(amount, from, to) {
  return (amount * fxToUsd(from)) / fxToUsd(to);
}

export function marketStatus() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const wd = get("weekday");
  const h = Number(get("hour")) % 24;
  const m = Number(get("minute"));
  const mins = h * 60 + m;
  if (wd === "Sat" || wd === "Sun") return { code: "closed", label: "Market closed" };
  if (mins >= 570 && mins < 960) return { code: "open", label: "Market open" };
  if (mins >= 240 && mins < 570) return { code: "pre", label: "Pre-market" };
  if (mins >= 960 && mins < 1200) return { code: "after", label: "After hours" };
  return { code: "closed", label: "Market closed" };
}

/* ---------------- live ticker ---------------- */
const rand = rngFor("ticker:" + Date.now());
function tickOne(q) {
  const v = q.type === "CRYPTO" ? 0.0011 : q.type === "CASH" ? 0.00006 : q.type === "IND" ? 0.00025 : 0.0006 * Math.min(2, q.beta ?? 1);
  const p = q.price * (1 + gaussian(rand) * v);
  const d = q.type === "CASH" ? 10 ** 5 : 100;
  q.price = Math.round(p * d) / d;
  q.high = Math.max(q.high, q.price);
  q.low = Math.min(q.low, q.price);
  q.chg = q.price - q.prevClose;
  q.chgPct = (q.chg / q.prevClose) * 100;
  if (q.avgVol) q.vol += Math.round(rand() * q.avgVol * 0.0008);
  q.bidSize = Math.max(100, Math.round(q.bidSize + (rand() - 0.5) * 400));
  q.askSize = Math.max(100, Math.round(q.askSize + (rand() - 0.5) * 400));
}
let timer = null;
export function startTicker(interval = 2500) {
  if (timer) return;
  const arr = [...quotes.values()];
  timer = setInterval(() => {
    for (let i = 0; i < 14; i++) tickOne(arr[Math.floor(rand() * arr.length)]);
    const touched = new Set(arr.map((q) => q.sym));
    for (const fn of listeners) {
      try {
        fn(touched);
      } catch (e) {
        console.error(e);
      }
    }
  }, interval);
}
export function onTick(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
