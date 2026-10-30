let privacy = false;
export const MASK = "••••••";
export function setPrivacy(v) {
  privacy = !!v;
}
export const isPrivate = () => privacy;

const cache = new Map();
function nf(key, opts) {
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat("en-US", opts));
  return cache.get(key);
}

export function fmtNum(v, d = 2) {
  if (!Number.isFinite(v)) return "—";
  return nf("n" + d, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}

export function fmtQty(v) {
  if (!Number.isFinite(v)) return "—";
  return nf("q", { maximumFractionDigits: 6 }).format(v);
}

/** Money that respects the "hide balances" privacy setting. */
export function fmtMoney(v, ccy = "USD", d = 2) {
  if (privacy) return MASK;
  return fmtMoneyAlways(v, ccy, d);
}

/** Money that always renders (used for prices / quotes). */
export function fmtMoneyAlways(v, ccy = "USD", d = 2) {
  if (!Number.isFinite(v)) return "—";
  try {
    return nf("m" + ccy + d, {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);
  } catch {
    return fmtNum(v, d) + " " + ccy;
  }
}

export function fmtPrice(v, ccy = "USD") {
  if (!Number.isFinite(v)) return "—";
  const d = Math.abs(v) < 1 ? 4 : Math.abs(v) < 10 ? 3 : 2;
  return fmtMoneyAlways(v, ccy, d);
}

export function fmtSigned(v, ccy = "USD", d = 2) {
  if (privacy) return MASK;
  if (!Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return s + fmtMoneyAlways(Math.abs(v), ccy, d);
}

export function fmtSignedAlways(v, ccy = "USD", d = 2) {
  if (!Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return s + fmtMoneyAlways(Math.abs(v), ccy, d);
}

export function fmtPct(v, d = 2) {
  if (!Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return s + Math.abs(v).toFixed(d) + "%";
}

export function fmtPlainPct(v, d = 1) {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(d) + "%";
}

export function fmtCompact(v) {
  if (!Number.isFinite(v)) return "—";
  return nf("c", { notation: "compact", maximumFractionDigits: 2 }).format(v);
}

export function fmtCompactMoney(v, ccy = "USD") {
  if (privacy) return MASK;
  if (!Number.isFinite(v)) return "—";
  return nf("cm" + ccy, {
    style: "currency",
    currency: ccy,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

export const signClass = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");

export function fmtDate(d, opts = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(d).toLocaleDateString("en-US", opts);
}
export function fmtDateShort(d) {
  return fmtDate(d, { month: "short", day: "numeric" });
}
export function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
export function fmtDateTime(d) {
  return fmtDate(d, { month: "short", day: "numeric" }) + ", " + fmtTime(d);
}
export function relTime(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h";
  const days = Math.round(h / 24);
  if (days < 7) return days + "d";
  return fmtDateShort(d);
}
export function monthKey(d) {
  const x = new Date(d);
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0");
}
export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
export const isoDay = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
