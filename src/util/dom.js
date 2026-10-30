export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Event delegation. Returns an unsubscribe function. */
export function on(root, event, selector, handler, opts) {
  const fn = (e) => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) handler(e, t);
  };
  root.addEventListener(event, fn, opts);
  return () => root.removeEventListener(event, fn, opts);
}

export const qs = (root, sel) => root.querySelector(sel);
export const qsa = (root, sel) => [...root.querySelectorAll(sel)];

export function setText(root, sel, text) {
  const el = typeof sel === "string" ? root.querySelector(sel) : sel;
  if (el && el.textContent !== text) el.textContent = text;
}

export function setSign(el, v) {
  if (!el) return;
  el.classList.remove("up", "down", "flat");
  el.classList.add(v > 0 ? "up" : v < 0 ? "down" : "flat");
}

export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
