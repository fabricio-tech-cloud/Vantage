// Portfolio maths: per-account summaries, aggregation across selected accounts, allocation.
import { state, getAccounts } from "./state.js";
import { getQuote, fxToUsd } from "./quotes.js";
import { REGION_BY_EXCH, ASSET_CLASS_LABEL } from "./data/symbols.js";
import { dailySeries, intradaySeries, sliceRange, sumSeries } from "./series.js";
import { fmtMoney, fmtSigned, fmtCompactMoney } from "./util/format.js";

export function positionCalc(p, accountId) {
  const q = getQuote(p.sym);
  if (!q) return null;
  const mult = q.multiplier || 1;
  const rate = fxToUsd(q.ccy);
  const mv = p.qty * q.price * mult * rate;
  const cost = p.qty * p.avg * mult * rate;
  const unreal = mv - cost;
  const day = p.qty * (q.price - q.prevClose) * mult * rate;
  return {
    ...p,
    accountId,
    q,
    rate,
    mult,
    mv,
    cost,
    unreal,
    unrealPct: cost ? (unreal / Math.abs(cost)) * 100 : 0,
    day,
    dayPct: q.prevClose ? (q.price / q.prevClose - 1) * 100 : 0,
    assetClass: q.type,
  };
}

export function accountSummary(acc) {
  const positions = acc.positions.map((p) => positionCalc(p, acc.id)).filter(Boolean);
  let cashUsd = 0;
  const cashByCcy = {};
  for (const [ccy, amt] of Object.entries(acc.cash)) {
    cashUsd += amt * fxToUsd(ccy);
    cashByCcy[ccy] = amt;
  }
  const gpv = positions.reduce((a, p) => a + Math.abs(p.mv), 0);
  const secValue = positions.reduce((a, p) => a + p.mv, 0);
  const netLiq = cashUsd + secValue;
  const dayPnl = positions.reduce((a, p) => a + p.day, 0);
  const unreal = positions.reduce((a, p) => a + p.unreal, 0);
  const marginable = positions.filter((p) => p.assetClass === "STK" || p.assetClass === "ETF").reduce((a, p) => a + Math.abs(p.mv), 0);
  const cryptoVal = positions.filter((p) => p.assetClass === "CRYPTO").reduce((a, p) => a + Math.abs(p.mv), 0);
  const isMargin = acc.type === "Margin";
  const initMargin = isMargin ? marginable * 0.5 + cryptoVal : 0;
  const maintMargin = isMargin ? marginable * 0.25 + cryptoVal : 0;
  const availableFunds = isMargin ? netLiq - initMargin : Math.max(0, cashUsd);
  const excessLiquidity = isMargin ? netLiq - maintMargin : Math.max(0, cashUsd);
  const buyingPower = isMargin ? Math.max(0, availableFunds) * 4 : Math.max(0, cashUsd);
  const sma = isMargin ? Math.max(0, netLiq - marginable * 0.5 + cashUsd * 0.1) : 0;
  return {
    account: acc,
    positions,
    cashUsd,
    cashByCcy,
    gpv,
    secValue,
    netLiq,
    prevNetLiq: netLiq - dayPnl,
    dayPnl,
    dayPct: netLiq - dayPnl ? (dayPnl / (netLiq - dayPnl)) * 100 : 0,
    unreal,
    initMargin,
    maintMargin,
    availableFunds,
    excessLiquidity,
    buyingPower,
    sma,
    leverage: netLiq ? gpv / netLiq : 0,
    isMargin,
  };
}

/** Accounts currently included in the combined view (respects the Home filter). */
export function selectedAccounts() {
  const inc = new Set(state.includedAccounts);
  let list = getAccounts().filter((a) => inc.has(a.id));
  if (state.accountFilter !== "ALL") list = list.filter((a) => a.id === state.accountFilter);
  return list;
}
export function includedAccounts() {
  const inc = new Set(state.includedAccounts);
  return getAccounts().filter((a) => inc.has(a.id));
}

export function aggregate(accounts) {
  const sums = accounts.map(accountSummary);
  const agg = {
    accounts,
    summaries: sums,
    netLiq: 0,
    prevNetLiq: 0,
    cashUsd: 0,
    gpv: 0,
    secValue: 0,
    dayPnl: 0,
    unreal: 0,
    initMargin: 0,
    maintMargin: 0,
    availableFunds: 0,
    excessLiquidity: 0,
    buyingPower: 0,
    sma: 0,
    cashByCcy: {},
    privateNetLiq: 0,
    clientNetLiq: 0,
    privateCount: 0,
    clientCount: 0,
  };
  for (const s of sums) {
    for (const k of ["netLiq", "prevNetLiq", "cashUsd", "gpv", "secValue", "dayPnl", "unreal", "initMargin", "maintMargin", "availableFunds", "excessLiquidity", "buyingPower", "sma"]) agg[k] += s[k];
    for (const [c, v] of Object.entries(s.cashByCcy)) agg.cashByCcy[c] = (agg.cashByCcy[c] || 0) + v;
    if (s.account.kind === "client") {
      agg.clientNetLiq += s.netLiq;
      agg.clientCount++;
    } else {
      agg.privateNetLiq += s.netLiq;
      agg.privateCount++;
    }
  }
  agg.dayPct = agg.prevNetLiq ? (agg.dayPnl / agg.prevNetLiq) * 100 : 0;
  agg.leverage = agg.netLiq ? agg.gpv / agg.netLiq : 0;
  // merged positions
  const bySym = new Map();
  for (const s of sums) {
    for (const p of s.positions) {
      let m = bySym.get(p.sym);
      if (!m) {
        m = { sym: p.sym, q: p.q, qty: 0, cost: 0, mv: 0, unreal: 0, day: 0, assetClass: p.assetClass, rate: p.rate, mult: p.mult, legs: [] };
        bySym.set(p.sym, m);
      }
      m.qty += p.qty;
      m.cost += p.cost;
      m.mv += p.mv;
      m.unreal += p.unreal;
      m.day += p.day;
      m.legs.push(p);
    }
  }
  agg.positions = [...bySym.values()].map((m) => ({
    ...m,
    avg: m.qty ? m.cost / m.qty / m.rate / m.mult : 0,
    unrealPct: m.cost ? (m.unreal / Math.abs(m.cost)) * 100 : 0,
    dayPct: m.q.prevClose ? (m.q.price / m.q.prevClose - 1) * 100 : 0,
    weight: agg.netLiq ? (m.mv / agg.netLiq) * 100 : 0,
  }));
  agg.positions.sort((a, b) => b.mv - a.mv);
  return agg;
}

export function positionFor(sym, accounts = selectedAccounts()) {
  const agg = aggregate(accounts);
  return agg.positions.find((p) => p.sym === sym) || null;
}

export function allocation(agg) {
  const byClass = {};
  const bySector = {};
  const byCcy = {};
  const byRegion = {};
  const add = (map, k, v) => (map[k] = (map[k] || 0) + v);
  for (const p of agg.positions) {
    add(byClass, ASSET_CLASS_LABEL[p.assetClass] || p.assetClass, p.mv);
    add(bySector, p.q.sector, p.mv);
    add(byCcy, p.q.ccy, p.mv);
    add(byRegion, REGION_BY_EXCH[p.q.exch] || "Other", p.mv);
  }
  if (agg.cashUsd) {
    add(byClass, "Cash", agg.cashUsd);
    add(bySector, "Cash", agg.cashUsd);
    for (const [c, v] of Object.entries(agg.cashByCcy)) add(byCcy, c, v * fxToUsd(c));
    add(byRegion, "Cash", agg.cashUsd);
  }
  const toList = (m) =>
    Object.entries(m)
      .map(([label, value]) => ({ label, value, pct: agg.netLiq ? (value / agg.netLiq) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  return { byClass: toList(byClass), bySector: toList(bySector), byCcy: toList(byCcy), byRegion: toList(byRegion) };
}

/* ------------- series ------------- */
export function accountSeries(acc, range) {
  const s = accountSummary(acc);
  if (range === "1D") return intradaySeries(acc.id, s.netLiq, s.dayPnl);
  const vol = acc.type === "Margin" ? 0.0125 : 0.0085;
  return sliceRange(dailySeries(acc.id, s.netLiq, s.dayPnl, { drift: 0.0004, vol }), range);
}
export function portfolioSeries(accounts, range) {
  return sumSeries(accounts.map((a) => accountSeries(a, range)));
}
export function symbolSeries(sym, range) {
  const q = getQuote(sym);
  if (!q) return [];
  if (range === "1D") return intradaySeries("sym:" + sym, q.price, q.chg, q.type === "CRYPTO" ? 0.012 : 0.006);
  const vol = q.type === "CRYPTO" ? 0.032 : q.type === "CASH" ? 0.004 : q.type === "IND" ? 0.009 : 0.012 + 0.008 * Math.min(2.5, q.beta ?? 1);
  const drift = q.type === "CASH" ? 0 : 0.0005;
  return sliceRange(dailySeries("sym:" + sym, q.price, q.chg, { drift, vol }), range);
}

/* ------------- display currency ------------- */
export function disp(usd) {
  const c = state.settings.displayCcy;
  return c === "USD" ? usd : usd / fxToUsd(c);
}
export const dispCcy = () => state.settings.displayCcy;
export const money = (usd, d = 2) => fmtMoney(disp(usd), dispCcy(), d);
export const signed = (usd, d = 2) => fmtSigned(disp(usd), dispCcy(), d);
export const compactMoney = (usd) => fmtCompactMoney(disp(usd), dispCcy());
