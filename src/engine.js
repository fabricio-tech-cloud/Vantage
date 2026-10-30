// Order lifecycle, executions, alerts and demo seeding.
import { state, update, notify, mutableAccount, getAccounts } from "./state.js";
import { ACCOUNTS as SEED, CLIENT_USERS } from "./data/accounts.js";
import { getQuote, bidAsk, onTick, fxToUsd } from "./quotes.js";
import { uid, rngFor, pick, between } from "./util/rng.js";
import { fmtNum } from "./util/format.js";

export const ORDER_TYPES = [
  { id: "MKT", label: "Market" },
  { id: "LMT", label: "Limit" },
  { id: "STP", label: "Stop" },
  { id: "STP LMT", label: "Stop Limit" },
  { id: "TRAIL", label: "Trailing Stop" },
  { id: "MOC", label: "Market on Close" },
  { id: "LOC", label: "Limit on Close" },
];
export const TIFS = [
  { id: "DAY", label: "Day" },
  { id: "GTC", label: "Good 'til Canceled" },
  { id: "IOC", label: "Immediate or Cancel" },
  { id: "OPG", label: "At the Open" },
  { id: "FOK", label: "Fill or Kill" },
];

export function commissionFor(q, qty, price) {
  const value = qty * price * (q.multiplier || 1);
  if (q.type === "CRYPTO") return Math.max(1.75, value * 0.0018);
  if (q.type === "OPT") return Math.max(1, qty * 0.65);
  if (q.type === "CASH") return Math.max(2, value * 0.00002);
  if (q.ccy === "EUR") return Math.max(3, value * 0.0005);
  if (q.ccy === "CHF") return Math.max(5, value * 0.0005);
  return Math.min(Math.max(1, qty * 0.005), Math.max(1, value * 0.01));
}

function isMarketable(o, q) {
  const { bid, ask } = bidAsk(q);
  switch (o.type) {
    case "MKT":
    case "MOC":
      return { fill: true, price: o.side === "BUY" ? ask : bid };
    case "LMT":
    case "LOC":
      if (o.side === "BUY" && o.limit >= ask) return { fill: true, price: Math.min(o.limit, ask) };
      if (o.side === "SELL" && o.limit <= bid) return { fill: true, price: Math.max(o.limit, bid) };
      return { fill: false };
    case "STP":
      if (o.side === "BUY" && q.price >= o.stop) return { fill: true, price: ask };
      if (o.side === "SELL" && q.price <= o.stop) return { fill: true, price: bid };
      return { fill: false };
    case "STP LMT":
      if (o.side === "BUY" && q.price >= o.stop && o.limit >= ask) return { fill: true, price: Math.min(o.limit, ask) };
      if (o.side === "SELL" && q.price <= o.stop && o.limit <= bid) return { fill: true, price: Math.max(o.limit, bid) };
      return { fill: false };
    case "TRAIL": {
      // trailing stop: track best price
      if (o.side === "SELL") {
        o.trailRef = Math.max(o.trailRef ?? q.price, q.price);
        if (q.price <= o.trailRef - o.trail) return { fill: true, price: bid };
      } else {
        o.trailRef = Math.min(o.trailRef ?? q.price, q.price);
        if (q.price >= o.trailRef + o.trail) return { fill: true, price: ask };
      }
      return { fill: false };
    }
    default:
      return { fill: false };
  }
}

function applyFill(s, o, price) {
  const acc = s.accounts.find((a) => a.id === o.accountId) || s.linkedAccounts.find((a) => a.id === o.accountId);
  if (!acc) return;
  const q = getQuote(o.sym);
  const mult = q.multiplier || 1;
  const comm = commissionFor(q, o.qty, price);
  const gross = o.qty * price * mult;
  const ccy = q.ccy;
  acc.cash[ccy] = (acc.cash[ccy] || 0) + (o.side === "BUY" ? -gross : gross) - comm;
  let pos = acc.positions.find((p) => p.sym === o.sym);
  const signedQty = o.side === "BUY" ? o.qty : -o.qty;
  if (!pos) {
    acc.positions.push({ sym: o.sym, qty: signedQty, avg: price });
  } else {
    const sameDir = (pos.qty >= 0 && signedQty > 0) || (pos.qty <= 0 && signedQty < 0);
    if (sameDir) {
      const newQty = pos.qty + signedQty;
      pos.avg = (pos.avg * Math.abs(pos.qty) + price * Math.abs(signedQty)) / Math.abs(newQty);
      pos.qty = newQty;
    } else {
      const realized = (price - pos.avg) * Math.min(Math.abs(pos.qty), Math.abs(signedQty)) * mult * (pos.qty > 0 ? 1 : -1);
      pos.qty = Math.round((pos.qty + signedQty) * 1e6) / 1e6;
      o.realized = realized;
      if (pos.qty === 0) acc.positions = acc.positions.filter((p) => p !== pos);
      else if (Math.sign(pos.qty) !== Math.sign(pos.qty - signedQty)) pos.avg = price;
    }
  }
  const trade = {
    id: uid(),
    orderId: o.id,
    t: Date.now(),
    accountId: o.accountId,
    sym: o.sym,
    side: o.side,
    qty: o.qty,
    price,
    commission: comm,
    ccy,
    realized: o.realized ?? 0,
  };
  s.trades.unshift(trade);
  s.extraTransactions.unshift({
    id: "tx" + trade.id,
    accountId: o.accountId,
    t: trade.t,
    type: "Trade",
    desc: `${o.side} ${fmtNum(o.qty, o.qty % 1 ? 4 : 0)} ${o.sym} @ ${fmtNum(price, price < 1 ? 4 : 2)}`,
    amount: (o.side === "BUY" ? -gross : gross) - comm,
    ccy,
    sym: o.sym,
    side: o.side,
    qty: o.qty,
    price,
    commission: comm,
    status: "Settled",
  });
  o.status = "Filled";
  o.filledAt = trade.t;
  o.fillPrice = price;
  s.notifications.unshift({
    id: uid(),
    t: trade.t,
    read: false,
    kind: "order",
    title: `Order filled · ${o.side} ${fmtNum(o.qty, o.qty % 1 ? 4 : 0)} ${o.sym}`,
    body: `Filled @ ${fmtNum(price, price < 1 ? 4 : 2)} ${ccy} · ${o.accountId}`,
    route: "/orders",
  });
  const meta = SEED.find((a) => a.id === o.accountId);
  if (meta?.userId) {
    s.activity = s.activity || [];
    s.activity.unshift({
      id: uid(),
      t: trade.t,
      userId: meta.userId,
      accountId: o.accountId,
      kind: "trade",
      title: `${o.side} ${fmtNum(o.qty, o.qty % 1 ? 4 : 0)} ${o.sym}`,
      detail: `Filled @ ${fmtNum(price, price < 1 ? 4 : 2)} ${ccy}`,
      amount: o.qty * price * mult,
      ccy,
      sym: o.sym,
      qty: o.qty,
      side: o.side,
    });
    s.activity = s.activity.slice(0, 500);
  }
  return trade;
}

export function placeOrder(input) {
  const q = getQuote(input.sym);
  if (!q) throw new Error("Unknown symbol");
  const o = {
    id: uid(),
    t: Date.now(),
    status: "Submitted",
    ...input,
  };
  const m = isMarketable(o, q);
  let filled = null;
  update((s) => {
    if (m.fill) {
      filled = applyFill(s, o, m.price);
      s.orders.unshift(o);
    } else {
      if (o.tif === "IOC" || o.tif === "FOK") {
        o.status = "Cancelled";
        o.reason = `${o.tif} order not immediately executable`;
      } else {
        o.status = o.type === "MKT" ? "PreSubmitted" : "Submitted";
      }
      s.orders.unshift(o);
      if (o.status !== "Cancelled")
        s.notifications.unshift({ id: uid(), t: Date.now(), read: false, kind: "order", title: `Order submitted · ${o.side} ${o.qty} ${o.sym}`, body: `${o.type}${o.limit ? " @ " + fmtNum(o.limit) : ""} · ${o.tif} · ${o.accountId}`, route: "/orders" });
    }
  }, "order");
  return { order: o, trade: filled };
}

export function cancelOrder(id) {
  update((s) => {
    const o = s.orders.find((x) => x.id === id);
    if (o && (o.status === "Submitted" || o.status === "PreSubmitted")) {
      o.status = "Cancelled";
      o.cancelledAt = Date.now();
    }
  }, "order");
}

export function modifyOrder(id, patch) {
  update((s) => {
    const o = s.orders.find((x) => x.id === id);
    if (o) Object.assign(o, patch, { modifiedAt: Date.now() });
  }, "order");
  // re-check marketability
  checkOpenOrders();
}

export const openOrders = () => state.orders.filter((o) => o.status === "Submitted" || o.status === "PreSubmitted");

function checkOpenOrders() {
  const open = openOrders();
  if (!open.length) return;
  let any = false;
  const fills = [];
  for (const o of open) {
    const q = getQuote(o.sym);
    if (!q) continue;
    const m = isMarketable(o, q);
    if (m.fill) fills.push([o, m.price]);
    if (o.type === "TRAIL") any = true;
  }
  if (fills.length || any) {
    update((s) => {
      for (const [o, price] of fills) {
        const live = s.orders.find((x) => x.id === o.id);
        if (live) applyFill(s, live, price);
      }
    }, fills.length ? "order" : "trail");
  }
}

/* ---------------- alerts ---------------- */
export function addAlert(a) {
  update((s) => s.alerts.unshift({ id: uid(), t: Date.now(), active: true, triggered: null, ...a }), "alert");
}
export function removeAlert(id) {
  update((s) => (s.alerts = s.alerts.filter((a) => a.id !== id)), "alert");
}
export function toggleAlert(id) {
  update((s) => {
    const a = s.alerts.find((x) => x.id === id);
    if (a) {
      a.active = !a.active;
      if (a.active) a.triggered = null;
    }
  }, "alert");
}
function checkAlerts() {
  const hits = [];
  for (const a of state.alerts) {
    if (!a.active || a.triggered) continue;
    const q = getQuote(a.sym);
    if (!q) continue;
    const v = a.field === "pct" ? q.chgPct : q.price;
    if ((a.cond === "above" && v >= a.value) || (a.cond === "below" && v <= a.value)) hits.push([a, v]);
  }
  if (!hits.length) return;
  update((s) => {
    for (const [a, v] of hits) {
      const live = s.alerts.find((x) => x.id === a.id);
      if (!live) continue;
      live.triggered = Date.now();
      live.active = false;
      s.notifications.unshift({ id: uid(), t: Date.now(), read: false, kind: "alert", title: `Price alert · ${a.sym}`, body: `${a.sym} is ${a.cond} ${a.field === "pct" ? a.value + "%" : fmtNum(a.value)} (now ${fmtNum(v, a.field === "pct" ? 2 : v < 1 ? 4 : 2)})`, route: "/quote/" + encodeURIComponent(a.sym) });
    }
  }, "alert");
}

export function startEngine() {
  onTick(() => {
    checkOpenOrders();
    checkAlerts();
  });
}

/* ---------------- demo seed ---------------- */
export function ensureSeeded() {
  if (state.seeded) return;
  const r = rngFor("seed-v4");
  const now = Date.now();
  const H = 3600000;
  const SYMS = ["AAPL", "MSFT", "NVDA", "SPY", "TSLA", "AMD", "VWCE", "META", "AMZN", "QQQ"];
  update((s) => {
    s.orders = [
      { id: uid(), t: now - 26 * H, status: "Submitted", accountId: "U4821093", sym: "AMZN", side: "BUY", qty: 100, type: "LMT", limit: 220.0, tif: "GTC", outsideRth: false },
      { id: uid(), t: now - 50 * H, status: "Submitted", accountId: "U6093318", sym: "TSLA", side: "SELL", qty: 50, type: "LMT", limit: 465.0, tif: "GTC", outsideRth: false },
      { id: uid(), t: now - 70 * H, status: "Submitted", accountId: "U6093318", sym: "PLTR", side: "SELL", qty: 200, type: "STP", stop: 150.0, tif: "GTC", outsideRth: false },
      { id: uid(), t: now - 3 * H, status: "Submitted", accountId: "U4821093", sym: "BTC", side: "BUY", qty: 0.1, type: "LMT", limit: 100000, tif: "GTC", outsideRth: true },
      { id: uid(), t: now - 30 * H, status: "Filled", accountId: "U4821093", sym: "NVDA", side: "BUY", qty: 50, type: "LMT", limit: 182.5, tif: "DAY", fillPrice: 182.14, filledAt: now - 29 * H },
      { id: uid(), t: now - 54 * H, status: "Filled", accountId: "U6093318", sym: "AMD", side: "BUY", qty: 50, type: "MKT", tif: "DAY", fillPrice: 224.9, filledAt: now - 54 * H },
      { id: uid(), t: now - 99 * H, status: "Cancelled", accountId: "U5560271", sym: "KO", side: "BUY", qty: 100, type: "LMT", limit: 64.0, tif: "DAY", cancelledAt: now - 90 * H },
      { id: uid(), t: now - 120 * H, status: "Filled", accountId: "U5560271", sym: "VOO", side: "BUY", qty: 10, type: "MKT", tif: "DAY", fillPrice: 621.3, filledAt: now - 120 * H },
    ];
    s.trades = s.orders
      .filter((o) => o.status === "Filled")
      .map((o) => ({ id: uid(), orderId: o.id, t: o.filledAt, accountId: o.accountId, sym: o.sym, side: o.side, qty: o.qty, price: o.fillPrice, commission: Math.max(1, o.qty * 0.005), ccy: "USD", realized: 0 }));
    s.alerts = [
      { id: uid(), t: now - 3 * 24 * H, sym: "AAPL", cond: "below", field: "price", value: 230, active: true, triggered: null, note: "Add to position" },
      { id: uid(), t: now - 5 * 24 * H, sym: "NVDA", cond: "above", field: "price", value: 200, active: true, triggered: null, note: "Trim" },
      { id: uid(), t: now - 8 * 24 * H, sym: "BTC", cond: "below", field: "price", value: 100000, active: true, triggered: null },
      { id: uid(), t: now - 12 * 24 * H, sym: "TSLA", cond: "below", field: "pct", value: -3, active: false, triggered: now - 20 * H },
    ];
    s.notifications = [
      { id: uid(), t: now - 1.2 * H, read: false, kind: "order", title: "Order filled · BUY 50 NVDA", body: "Filled @ 182.14 USD · U4821093", route: "/orders" },
      { id: uid(), t: now - 5 * H, read: false, kind: "dividend", title: "Dividend received · ASML", body: "1.85698 USD per share credited to U4821093", route: "/transactions" },
      { id: uid(), t: now - 20 * H, read: false, kind: "alert", title: "Price alert · TSLA", body: "TSLA fell more than 3% today", route: "/quote/TSLA" },
      { id: uid(), t: now - 2 * 24 * H, read: true, kind: "statement", title: "Monthly activity statement available", body: "Your September statement is ready to view", route: "/statements" },
      { id: uid(), t: now - 3 * 24 * H, read: true, kind: "security", title: "New login detected", body: "iPhone 17 Pro · Zürich, Switzerland", route: "/settings" },
      { id: uid(), t: now - 6 * 24 * H, read: true, kind: "info", title: "Client accounts linked", body: `${CLIENT_USERS.length} client accounts are available in Manage Accounts`, route: "/account/manage" },
      { id: uid(), t: now - 9 * 24 * H, read: true, kind: "info", title: "Market data subscription renewed", body: "US Securities Snapshot and Futures Value Bundle · USD 10.00", route: "/transactions" },
    ];

    // Seed login + trade activity so Admin activity view is useful out of the box
    const activity = [];
    for (const u of CLIENT_USERS) {
      const loginCount = 1 + Math.floor(r() * 6);
      for (let i = 0; i < loginCount; i++) {
        const t = now - between(r, 2 * H, 14 * 24 * H);
        activity.push({
          id: uid(),
          t,
          userId: u.id,
          accountId: u.accountId,
          kind: "login",
          title: `${u.name} signed in`,
          detail: pick(r, ["iPhone · Zürich", "iPhone · Geneva", "Web · Chrome", "iPad · Home"]),
          amount: null,
          ccy: null,
          sym: null,
          qty: null,
          side: null,
        });
      }
      const tradeCount = Math.floor(r() * 5);
      for (let i = 0; i < tradeCount; i++) {
        const sym = pick(r, SYMS);
        const side = r() > 0.45 ? "BUY" : "SELL";
        const qty = Math.max(1, Math.round(between(r, 5, 120)));
        const price = between(r, 40, 520);
        const t = now - between(r, H, 10 * 24 * H);
        activity.push({
          id: uid(),
          t,
          userId: u.id,
          accountId: u.accountId,
          kind: "trade",
          title: `${side} ${qty} ${sym}`,
          detail: `Filled @ ${fmtNum(price)} USD`,
          amount: qty * price,
          ccy: "USD",
          sym,
          qty,
          side,
        });
      }
    }
    activity.sort((a, b) => b.t - a.t);
    s.activity = activity.slice(0, 500);
    s.seeded = true;
  }, "seed");
}

export function accountLabel(id) {
  const a = getAccounts().find((x) => x.id === id);
  return a ? `${a.alias} · ${a.id}` : id;
}

export function cashIn(accountId, ccy) {
  const a = mutableAccount(accountId);
  return a?.cash?.[ccy] || 0;
}

export const usd = (amount, ccy) => amount * fxToUsd(ccy);
