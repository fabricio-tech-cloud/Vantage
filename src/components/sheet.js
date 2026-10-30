// Bottom sheets, action sheets and toasts.
import { I } from "./icons.js";
import { esc } from "../util/dom.js";

let zCounter = 100;
const openSheets = [];

export function openSheet({ title = "", html = "", onMount, cls = "", full = false, closable = true, stack = false }) {
  if (!stack) closeAllSheets();
  const host = document.getElementById("overlays");
  const el = document.createElement("div");
  el.className = "sheet-backdrop";
  el.style.zIndex = String(++zCounter);
  el.innerHTML = `<div class="sheet ${cls} ${full ? "sheet--full" : ""}" role="dialog" aria-modal="true">
      <div class="sheet-handle"></div>
      ${title || closable ? `<header class="sheet-head"><h3>${esc(title)}</h3>${closable ? `<button class="icon-btn sheet-close" aria-label="Close">${I.close()}</button>` : ""}</header>` : ""}
      <div class="sheet-body">${html}</div>
    </div>`;
  host.appendChild(el);
  const sheet = el.querySelector(".sheet");
  const body = el.querySelector(".sheet-body");
  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    el.classList.remove("open");
    const i = openSheets.indexOf(api);
    if (i >= 0) openSheets.splice(i, 1);
    setTimeout(() => el.remove(), 260);
    api.onClose?.(result);
  };
  const api = { el, sheet, body, close, onClose: null };
  openSheets.push(api);
  if (closable) {
    el.addEventListener("click", (e) => {
      if (e.target === el) close();
    });
    el.querySelector(".sheet-close")?.addEventListener("click", () => close());
    // swipe down to dismiss (from handle/header)
    let startY = null;
    let dy = 0;
    const grab = el.querySelector(".sheet-handle");
    const head = el.querySelector(".sheet-head");
    const ts = (e) => {
      startY = e.touches[0].clientY;
      dy = 0;
      sheet.style.transition = "none";
    };
    const tm = (e) => {
      if (startY == null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const te = () => {
      sheet.style.transition = "";
      if (dy > 90) close();
      else sheet.style.transform = "";
      startY = null;
    };
    for (const g of [grab, head]) {
      if (!g) continue;
      g.addEventListener("touchstart", ts, { passive: true });
      g.addEventListener("touchmove", tm, { passive: true });
      g.addEventListener("touchend", te);
    }
  }
  requestAnimationFrame(() => el.classList.add("open"));
  onMount?.(body, close, api);
  return api;
}

export function closeAllSheets() {
  for (const s of [...openSheets]) s.close();
}

export function actionSheet({ title, actions }) {
  return openSheet({
    title,
    cls: "sheet--actions",
    html: `<div class="action-list">${actions
      .map((a, i) => `<button class="action-item ${a.danger ? "danger" : ""}" data-i="${i}">${a.icon && I[a.icon] ? I[a.icon]() : ""}<span>${esc(a.label)}</span>${a.sub ? `<small>${esc(a.sub)}</small>` : ""}</button>`)
      .join("")}</div>`,
    onMount(body, close) {
      body.addEventListener("click", (e) => {
        const b = e.target.closest(".action-item");
        if (!b) return;
        close();
        actions[Number(b.dataset.i)].onClick?.();
      });
    },
  });
}

export function confirmSheet({ title, text, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const s = openSheet({
      title,
      html: `<p class="sheet-text">${esc(text)}</p><div class="btn-row"><button class="btn btn-ghost" data-r="0">Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-r="1">${esc(confirmLabel)}</button></div>`,
      onMount(body, close) {
        body.addEventListener("click", (e) => {
          const b = e.target.closest("[data-r]");
          if (b) close(b.dataset.r === "1");
        });
      },
    });
    s.onClose = (r) => resolve(!!r);
  });
}

export function promptSheet({ title, label, value = "", placeholder = "", confirmLabel = "Save", type = "text" }) {
  return new Promise((resolve) => {
    const s = openSheet({
      title,
      html: `<label class="field"><span>${esc(label)}</span><input class="input" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"/></label><div class="btn-row"><button class="btn btn-ghost" data-r="0">Cancel</button><button class="btn btn-primary" data-r="1">${esc(confirmLabel)}</button></div>`,
      onMount(body, close) {
        const inp = body.querySelector("input");
        setTimeout(() => inp.focus(), 250);
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") close(inp.value);
        });
        body.addEventListener("click", (e) => {
          const b = e.target.closest("[data-r]");
          if (b) close(b.dataset.r === "1" ? inp.value : null);
        });
      },
    });
    s.onClose = (r) => resolve(r ?? null);
  });
}

/* ---------------- toast ---------------- */
let toastTimer = null;
export function toast(msg, { type = "info", duration = 2600 } = {}) {
  let host = document.getElementById("toast");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast";
    document.body.appendChild(host);
  }
  host.hidden = false;
  host.className = `toast toast--${type} show`;
  host.innerHTML = `${type === "success" ? I.check() : type === "error" ? I.close() : I.info()}<span>${esc(msg)}</span>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove("show"), duration);
}
