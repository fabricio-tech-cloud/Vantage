import { ACCOUNTS as SEED, AVAILABLE_CLIENTS, ADMIN_USER, userById, USER_ACCOUNT } from "./data/accounts.js";
import { setPrivacy } from "./util/format.js";
import { uid } from "./util/rng.js";

const KEY = "vantage.state.v4";
const SESSION_KEY = "vantage.session";
const USER_KEY = "vantage.user";

function defaults() {
  return {
    version: 4,
    includedAccounts: SEED.filter((a) => a.kind === "private").map((a) => a.id),
    accountFilter: "ALL",
    aliases: {},
    accounts: SEED.map((a) => ({ id: a.id, cash: { ...a.cash }, positions: a.positions.map((p) => ({ ...p })) })),
    linkedAccounts: [],
    watchlists: [
      { id: "wl1", name: "My Watchlist", symbols: ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "ASML", "SPY", "BTC"] },
      { id: "wl2", name: "Tech", symbols: ["META", "GOOGL", "AMD", "PLTR", "CRM", "ORCL", "NFLX", "INTC"] },
      { id: "wl3", name: "Dividends", symbols: ["JNJ", "KO", "PG", "XOM", "CVX", "MCD", "V", "ALV"] },
      { id: "wl4", name: "Europe", symbols: ["SAP", "SIE", "ALV", "BMW", "MBG", "NESN", "NOVN", "VWCE"] },
    ],
    activeWatchlist: "wl1",
    orders: [],
    trades: [],
    alerts: [],
    notifications: [],
    extraTransactions: [],
    activity: [],
    recentSearches: [],
    lastQuote: "AAPL",
    quickActions: ["analyst", "transactions", "calendar", "transfer"],
    settings: {
      theme: "dark",
      hideBalances: false,
      displayCcy: "USD",
      requireLogin: true,
      biometrics: true,
      defaultOrderType: "LMT",
      defaultTif: "DAY",
      outsideRth: false,
      showClientBreakdown: true,
      confirmOrders: true,
      language: "en",
      notif: { orders: true, prices: true, news: false, statements: true, security: true },
    },
    seeded: false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const d = defaults();
    return {
      ...d,
      ...parsed,
      activity: parsed.activity || [],
      settings: { ...d.settings, ...(parsed.settings || {}), notif: { ...d.settings.notif, ...(parsed.settings?.notif || {}) } },
    };
  } catch {
    return defaults();
  }
}

export let state = load();
const subs = new Set();
let saveTimer = null;

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, 60);
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function emit(reason) {
  for (const fn of subs) {
    try {
      fn(reason);
    } catch (e) {
      console.error(e);
    }
  }
}

/** Mutate state inside fn, then persist and notify. */
export function update(fn, reason = "update") {
  fn(state);
  setPrivacy(state.settings.hideBalances);
  save();
  emit(reason);
}

export function resetState() {
  localStorage.removeItem(KEY);
  sessionStorage.clear();
  state = defaults();
  emit("reset");
  location.hash = "#/home";
  location.reload();
}

/* ------------- session / users ------------- */
export function currentUserId() {
  return sessionStorage.getItem(USER_KEY) || ADMIN_USER.id;
}

export function currentUser() {
  return userById(currentUserId());
}

export function isAdmin() {
  return currentUser().role === "admin";
}

/** Profile shown in UI (admin or the signed-in client). */
export function profileUser() {
  return currentUser();
}

export const isLoggedIn = () => !state.settings.requireLogin || sessionStorage.getItem(SESSION_KEY) === "1";

export function login(userId = ADMIN_USER.id) {
  const u = userById(userId);
  sessionStorage.setItem(SESSION_KEY, "1");
  sessionStorage.setItem(USER_KEY, u.id);
  applyUserScope(u);
  logActivity({
    userId: u.id,
    accountId: u.accountId || (u.role === "admin" ? "U4821093" : null),
    kind: "login",
    title: `${u.name} signed in`,
    detail: u.lastLoginDevice || "Demo session",
  });
}

export function logout() {
  const u = currentUser();
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    logActivity({
      userId: u.id,
      accountId: u.accountId || null,
      kind: "logout",
      title: `${u.name} signed out`,
      detail: "Session ended",
    });
  }
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/** Restrict included accounts when a client signs in. */
function applyUserScope(u) {
  update((s) => {
    if (u.role === "admin") {
      const priv = SEED.filter((a) => a.kind === "private").map((a) => a.id);
      const have = new Set(s.includedAccounts);
      const next = priv.filter((id) => have.has(id));
      s.includedAccounts = next.length ? next : priv;
      if (s.accountFilter !== "ALL" && !s.includedAccounts.includes(s.accountFilter)) s.accountFilter = "ALL";
      return;
    }
    const aid = u.accountId || USER_ACCOUNT[u.id];
    if (aid) {
      s.includedAccounts = [aid];
      s.accountFilter = aid;
    }
  }, "accounts");
}

export function logActivity(entry) {
  update((s) => {
    s.activity = s.activity || [];
    s.activity.unshift({
      id: uid(),
      t: Date.now(),
      amount: null,
      ccy: null,
      sym: null,
      qty: null,
      side: null,
      ...entry,
    });
    s.activity = s.activity.slice(0, 500);
  }, "activity");
}

export function activityForUser(userId) {
  return (state.activity || []).filter((a) => a.userId === userId);
}

export function activitySummary(userId) {
  const list = activityForUser(userId);
  const logins = list.filter((a) => a.kind === "login");
  const trades = list.filter((a) => a.kind === "trade");
  const volume = trades.reduce((sum, a) => sum + Math.abs(a.amount || 0), 0);
  const lastLogin = logins[0]?.t || null;
  const lastTrade = trades[0]?.t || null;
  const lastAny = list[0]?.t || null;
  const dayAgo = Date.now() - 24 * 3600000;
  const weekAgo = Date.now() - 7 * 24 * 3600000;
  const tradesToday = trades.filter((a) => a.t >= dayAgo);
  const tradesWeek = trades.filter((a) => a.t >= weekAgo);
  const volToday = tradesToday.reduce((sum, a) => sum + Math.abs(a.amount || 0), 0);
  const volWeek = tradesWeek.reduce((sum, a) => sum + Math.abs(a.amount || 0), 0);
  return {
    loginCount: logins.length,
    tradeCount: trades.length,
    volume,
    lastLogin,
    lastTrade,
    lastAny,
    tradesToday: tradesToday.length,
    tradesWeek: tradesWeek.length,
    volToday,
    volWeek,
  };
}

/* ------------- accounts (seed meta + mutable state) ------------- */
export function getAccounts() {
  const out = [];
  for (const meta of SEED) {
    const live = state.accounts.find((a) => a.id === meta.id) || { cash: meta.cash, positions: meta.positions };
    out.push({ ...meta, alias: state.aliases[meta.id] || meta.alias, cash: live.cash, positions: live.positions });
  }
  for (const la of state.linkedAccounts) out.push({ ...la, alias: state.aliases[la.id] || la.alias });
  const u = currentUser();
  if (u.role !== "admin") {
    const aid = u.accountId || USER_ACCOUNT[u.id];
    return out
      .filter((a) => a.id === aid || a.userId === u.id)
      .map((a) => ({ ...a, kind: "private", relationship: undefined }));
  }
  return out;
}
export const getAccount = (id) => getAccounts().find((a) => a.id === id);
export const privateAccounts = () => getAccounts().filter((a) => a.kind === "private");
export const clientAccounts = () => getAccounts().filter((a) => a.kind === "client");

/** Live mutable record for an account id (creates for linked accounts). */
export function mutableAccount(id) {
  let rec = state.accounts.find((a) => a.id === id);
  if (!rec) {
    rec = state.linkedAccounts.find((a) => a.id === id);
  }
  return rec;
}

export function setIncluded(id, on) {
  if (!isAdmin()) return;
  update((s) => {
    const set = new Set(s.includedAccounts);
    if (on) set.add(id);
    else set.delete(id);
    if (set.size === 0) set.add(id);
    s.includedAccounts = [...set];
    if (s.accountFilter !== "ALL" && !set.has(s.accountFilter)) s.accountFilter = "ALL";
  }, "accounts");
}

export function setIncludedMany(ids, on) {
  if (!isAdmin()) return;
  update((s) => {
    const set = new Set(s.includedAccounts);
    for (const id of ids) {
      if (on) set.add(id);
      else set.delete(id);
    }
    if (set.size === 0) {
      const first = SEED.find((a) => a.kind === "private");
      if (first) set.add(first.id);
    }
    s.includedAccounts = [...set];
    if (s.accountFilter !== "ALL" && !set.has(s.accountFilter)) s.accountFilter = "ALL";
  }, "accounts");
}

export function setIncludedExact(ids) {
  if (!isAdmin()) return;
  update((s) => {
    const next = ids.length ? [...new Set(ids)] : SEED.filter((a) => a.kind === "private").map((a) => a.id);
    s.includedAccounts = next;
    if (s.accountFilter !== "ALL" && !next.includes(s.accountFilter)) s.accountFilter = "ALL";
  }, "accounts");
}

export function cloneAccount(src) {
  return { ...src, cash: { ...src.cash }, positions: src.positions.map((p) => ({ ...p })) };
}

export function linkAccount(acc) {
  if (!isAdmin()) return;
  update((s) => {
    if (s.linkedAccounts.some((a) => a.id === acc.id) || SEED.some((a) => a.id === acc.id)) return;
    s.linkedAccounts.push(cloneAccount(acc));
    if (!s.includedAccounts.includes(acc.id)) s.includedAccounts.push(acc.id);
  }, "accounts");
}

export function unlinkAccount(id) {
  if (!isAdmin()) return;
  update((s) => {
    s.linkedAccounts = s.linkedAccounts.filter((a) => a.id !== id);
    s.includedAccounts = s.includedAccounts.filter((x) => x !== id);
    if (!s.includedAccounts.length) s.includedAccounts = SEED.filter((a) => a.kind === "private").map((a) => a.id);
    if (s.accountFilter === id) s.accountFilter = "ALL";
  }, "accounts");
}

export function availableToLink() {
  if (!isAdmin()) return [];
  const have = new Set(getAccounts().map((a) => a.id));
  return AVAILABLE_CLIENTS.filter((a) => !have.has(a.id));
}

export function setLastQuote(sym) {
  if (!sym || state.lastQuote === sym) return;
  update((s) => (s.lastQuote = sym), "quote");
}

/* ------------- notifications ------------- */
export function notify(n) {
  update((s) => {
    s.notifications.unshift({ id: uid(), t: Date.now(), read: false, kind: "info", ...n });
    s.notifications = s.notifications.slice(0, 80);
  }, "notify");
}
export const unreadCount = () => state.notifications.filter((n) => !n.read).length;

setPrivacy(state.settings.hideBalances);
