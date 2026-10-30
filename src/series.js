// Historical series generation (deterministic) for accounts and symbols.
import { rngFor, gaussian } from "./util/rng.js";

const DAY = 86400000;
const N_DAYS = 1300; // ~5 years of trading days
let tradingDays = null;

export function getTradingDays() {
  if (tradingDays) return tradingDays;
  const days = [];
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  let t = d.getTime();
  while (days.length < N_DAYS) {
    const wd = new Date(t).getDay();
    if (wd !== 0 && wd !== 6) days.unshift(t);
    t -= DAY;
  }
  tradingDays = days;
  return days;
}

export const RANGES = ["1D", "1W", "MTD", "1M", "3M", "YTD", "1Y", "ALL"];
export const RANGE_LABEL = {
  "1D": "today",
  "1W": "past week",
  MTD: "month to date",
  "1M": "past month",
  "3M": "past 3 months",
  "6M": "past 6 months",
  YTD: "year to date",
  "1Y": "past year",
  "5Y": "past 5 years",
  ALL: "all time",
};

/** Index into the trading day array at which the given range starts. */
export function rangeStartIndex(range) {
  const days = getTradingDays();
  const n = days.length;
  const now = new Date(days[n - 1]);
  const firstIdxWhere = (pred) => {
    const i = days.findIndex(pred);
    return Math.max(0, (i < 0 ? n - 1 : i) - 1);
  };
  switch (range) {
    case "1W":
      return n - 6;
    case "MTD":
      return firstIdxWhere((t) => {
        const d = new Date(t);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    case "1M":
      return n - 23;
    case "3M":
      return n - 65;
    case "6M":
      return n - 128;
    case "YTD":
      return firstIdxWhere((t) => new Date(t).getFullYear() === now.getFullYear());
    case "1Y":
      return n - 254;
    case "5Y":
    case "ALL":
      return 0;
    default:
      return n - 23;
  }
}

const rawCache = new Map();
/** Normalised random-walk path (last value = 1) for a key. */
function rawPath(key, drift, vol) {
  if (rawCache.has(key)) return rawCache.get(key);
  const r = rngFor("path:" + key);
  const n = N_DAYS - 1;
  const out = new Array(n);
  let v = 1;
  // regime changes to make it look realistic
  let regime = 0;
  for (let i = 0; i < n; i++) {
    if (i % 60 === 0) regime = gaussian(r) * 0.0012;
    v *= Math.exp(drift + regime + gaussian(r) * vol);
    out[i] = v;
  }
  const last = out[n - 1];
  for (let i = 0; i < n; i++) out[i] /= last;
  rawCache.set(key, out);
  return out;
}

/**
 * Daily series ending at `last` where the previous point equals `last - dayChange`.
 * Returns array of {t, v}.
 */
export function dailySeries(key, last, dayChange, { drift = 0.00035, vol = 0.011 } = {}) {
  const days = getTradingDays();
  const raw = rawPath(key, drift, vol);
  const prev = last - dayChange;
  const out = new Array(N_DAYS);
  for (let i = 0; i < N_DAYS - 1; i++) out[i] = { t: days[i], v: raw[i] * prev };
  out[N_DAYS - 1] = { t: days[N_DAYS - 1], v: last };
  return out;
}

/** Intraday series (5 min bars, 09:30–16:00 ET) from `last - dayChange` to `last`. */
export function intradaySeries(key, last, dayChange, volScale = 0.004) {
  const r = rngFor("intra:" + key);
  const n = 79;
  const w = [0];
  for (let i = 1; i < n; i++) w.push(w[i - 1] + gaussian(r));
  const start = last - dayChange;
  const amp = Math.abs(last) * volScale;
  const base = new Date();
  base.setHours(9, 30, 0, 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const bridge = w[i] - (i / (n - 1)) * w[n - 1];
    const v = start + (last - start) * (i / (n - 1)) + bridge * amp * 0.25;
    out.push({ t: base.getTime() + i * 5 * 60000, v });
  }
  return out;
}

export function sliceRange(series, range) {
  if (range === "1D") return series;
  const i = rangeStartIndex(range);
  return series.slice(i);
}

export function sumSeries(list) {
  if (!list.length) return [];
  const n = list[0].length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const s of list) v += s[i]?.v ?? 0;
    out[i] = { t: list[0][i].t, v };
  }
  return out;
}

export function toReturnSeries(series) {
  const base = series[0]?.v || 1;
  return series.map((p) => ({ t: p.t, v: (p.v / base - 1) * 100 }));
}

export function dailyReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) out.push(series[i].v / series[i - 1].v - 1);
  return out;
}

export function stats(series, benchmark) {
  const rets = dailyReturns(series);
  const n = rets.length || 1;
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  const total = series.length ? series[series.length - 1].v / series[0].v - 1 : 0;
  const years = Math.max(series.length / 252, 1 / 252);
  const annual = Math.pow(1 + total, 1 / years) - 1;
  let peak = -Infinity;
  let mdd = 0;
  for (const p of series) {
    peak = Math.max(peak, p.v);
    mdd = Math.min(mdd, p.v / peak - 1);
  }
  let beta = null;
  let corr = null;
  if (benchmark) {
    const b = dailyReturns(benchmark);
    const m = Math.min(b.length, rets.length);
    const ra = rets.slice(-m);
    const rb = b.slice(-m);
    const ma = ra.reduce((x, y) => x + y, 0) / m;
    const mb = rb.reduce((x, y) => x + y, 0) / m;
    let cov = 0;
    let vb = 0;
    let va = 0;
    for (let i = 0; i < m; i++) {
      cov += (ra[i] - ma) * (rb[i] - mb);
      vb += (rb[i] - mb) ** 2;
      va += (ra[i] - ma) ** 2;
    }
    beta = vb ? cov / vb : null;
    corr = vb && va ? cov / Math.sqrt(va * vb) : null;
  }
  const sharpe = vol ? (annual - 0.04) / vol : 0;
  return { total: total * 100, annual: annual * 100, vol: vol * 100, maxDrawdown: mdd * 100, sharpe, beta, corr };
}

/** Group daily series into monthly returns (last `months`). */
export function monthlyReturns(series, months = 12) {
  const byMonth = new Map();
  for (const p of series) {
    const d = new Date(p.t);
    const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!byMonth.has(k)) byMonth.set(k, { first: p.v, last: p.v });
    else byMonth.get(k).last = p.v;
  }
  const keys = [...byMonth.keys()];
  const out = [];
  for (let i = 1; i < keys.length; i++) {
    const prev = byMonth.get(keys[i - 1]).last;
    const cur = byMonth.get(keys[i]).last;
    out.push({ key: keys[i], ret: (cur / prev - 1) * 100 });
  }
  return out.slice(-months);
}
