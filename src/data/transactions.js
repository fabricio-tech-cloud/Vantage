// Deterministic transaction history per account, merged with user-created transactions.
import { rngFor, pick } from "../util/rng.js";
import { getQuote } from "../quotes.js";
import { state, getAccounts } from "../state.js";

const DAY = 86400000;
const cache = new Map();

function seededTransactions(acc) {
  if (cache.has(acc.id)) return cache.get(acc.id);
  const r = rngFor("tx:" + acc.id);
  const out = [];
  const now = Date.now();
  const start = now - 420 * DAY;
  const push = (t, type, desc, amount, extra = {}) => out.push({ id: acc.id + ":" + out.length, accountId: acc.id, t, type, desc, amount, ccy: "USD", status: "Settled", ...extra });

  // monthly deposits for private accounts, quarterly for clients
  const depAmt = acc.kind === "private" ? [1500, 2500, 3000][Math.floor(r() * 3)] : [10000, 25000, 50000][Math.floor(r() * 3)];
  for (let t = start; t < now - 2 * DAY; t += (acc.kind === "private" ? 30 : 91) * DAY) {
    push(t + 9 * 3600000, "Deposit", `Deposit · ${pick(r, ["SEPA transfer", "Wire transfer", "ACH transfer"])}`, depAmt);
  }
  // occasional withdrawals
  for (let i = 0; i < 3; i++) {
    const t = start + r() * (now - start - 5 * DAY);
    push(t, "Withdrawal", "Withdrawal · Wire transfer", -Math.round(500 + r() * 4000));
  }
  // dividends for dividend-paying holdings
  for (const p of acc.positions) {
    const q = getQuote(p.sym);
    if (!q || !q.div || q.type === "CRYPTO") continue;
    const perShareQ = (q.price * (q.div / 100)) / 4;
    const offset = Math.floor(r() * 90);
    for (let t = start + offset * DAY; t < now - DAY; t += 91 * DAY) {
      const gross = perShareQ * p.qty * (1 + (r() - 0.5) * 0.1);
      const tax = gross * (q.ccy === "USD" ? 0.15 : 0.26);
      push(t + 12 * 3600000, "Dividend", `${p.sym} · Cash dividend ${(perShareQ * (1 + (r() - 0.5) * 0.1)).toFixed(4)} ${q.ccy}/share`, gross, { sym: p.sym, ccy: q.ccy });
      push(t + 12 * 3600000 + 1000, "Withholding Tax", `${p.sym} · Withholding tax`, -tax, { sym: p.sym, ccy: q.ccy });
    }
  }
  // trades that built up positions
  for (const p of acc.positions) {
    const q = getQuote(p.sym);
    if (!q) continue;
    const lots = 1 + Math.floor(r() * 3);
    let remaining = p.qty;
    for (let i = 0; i < lots; i++) {
      const qty = i === lots - 1 ? remaining : Math.round((remaining / (lots - i)) * (0.6 + r() * 0.8) * 100) / 100;
      remaining -= qty;
      const t = start + r() * (now - start - 10 * DAY);
      const price = p.avg * (0.9 + r() * 0.2);
      const comm = q.type === "CRYPTO" ? Math.max(1.75, qty * price * 0.0018) : Math.min(Math.max(1, qty * 0.005), qty * price * 0.01);
      push(t, "Trade", `BUY ${qty} ${p.sym} @ ${price.toFixed(2)}`, -(qty * price + comm), { sym: p.sym, side: "BUY", qty, price, commission: comm, ccy: q.ccy });
    }
    if (r() < 0.25) {
      const qty = Math.max(1, Math.round(p.qty * 0.15));
      const t = start + r() * (now - start - 10 * DAY);
      const price = p.avg * (1.05 + r() * 0.2);
      push(t, "Trade", `SELL ${qty} ${p.sym} @ ${price.toFixed(2)}`, qty * price - 1, { sym: p.sym, side: "SELL", qty, price, commission: 1, ccy: q.ccy });
    }
  }
  // interest / fees monthly
  for (let t = start + 28 * DAY; t < now; t += 30 * DAY) {
    const cashUsd = Object.values(acc.cash).reduce((a, b) => a + b, 0);
    if (cashUsd > 10000) push(t, "Interest", "Credit interest on cash balance", (cashUsd * 0.034) / 12);
    if (cashUsd < 0) push(t, "Interest", "Debit interest on margin loan", (cashUsd * 0.062) / 12);
    if (acc.kind === "private" && r() < 0.8) push(t + 3600000, "Fee", pick(r, ["Market data · US Securities Snapshot", "Market data · NASDAQ TotalView", "Market data · Xetra Level 1"]), -[1.5, 4.5, 14.5][Math.floor(r() * 3)]);
  }
  out.sort((a, b) => b.t - a.t);
  cache.set(acc.id, out);
  return out;
}

export function transactionsFor(accounts) {
  const ids = new Set(accounts.map((a) => a.id));
  const list = [];
  for (const acc of accounts) list.push(...seededTransactions(acc));
  for (const tx of state.extraTransactions) if (ids.has(tx.accountId)) list.push(tx);
  list.sort((a, b) => b.t - a.t);
  return list;
}

export const TX_TYPES = ["All", "Trade", "Deposit", "Withdrawal", "Dividend", "Interest", "Fee", "FX"];

export function txMatchesFilter(tx, f) {
  if (f === "All") return true;
  if (f === "Dividend") return tx.type === "Dividend" || tx.type === "Withholding Tax";
  if (f === "Deposit") return tx.type === "Deposit";
  if (f === "Withdrawal") return tx.type === "Withdrawal";
  if (f === "FX") return tx.type === "FX Conversion" || tx.type === "Transfer";
  return tx.type === f;
}

export function incomeSummary(accounts, sinceT) {
  const list = transactionsFor(accounts).filter((t) => t.t >= sinceT);
  const sum = (pred) => list.filter(pred).reduce((a, t) => a + t.amount, 0);
  return {
    dividends: sum((t) => t.type === "Dividend"),
    withholding: sum((t) => t.type === "Withholding Tax"),
    interest: sum((t) => t.type === "Interest"),
    fees: sum((t) => t.type === "Fee"),
    commissions: list.filter((t) => t.type === "Trade").reduce((a, t) => a - (t.commission || 0), 0),
    deposits: sum((t) => t.type === "Deposit"),
    withdrawals: sum((t) => t.type === "Withdrawal"),
  };
}

export function allAccountsTransactions() {
  return transactionsFor(getAccounts());
}
