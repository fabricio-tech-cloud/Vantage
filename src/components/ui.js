// Shared UI building blocks (string templates).
import { I, logo } from "./icons.js";
import { esc } from "../util/dom.js";
import { fmtPrice, fmtPct, signClass, fmtSigned } from "../util/format.js";
import { unreadCount } from "../state.js";

export function topbar({ left = "back", title = "", subtitle = "", right = "", center = "", cls = "" } = {}) {
  let l = "";
  if (left === "back") l = `<button class="icon-btn" data-nav="back" aria-label="Back">${I.back()}</button>`;
  else if (left === "menu") l = `<button class="icon-btn" data-action="menu" aria-label="Menu">${I.menu()}</button>`;
  else if (left === "close") l = `<button class="icon-btn" data-nav="back" aria-label="Close">${I.close()}</button>`;
  else l = left;
  const c = center || `<div class="topbar-title"><h1>${esc(title)}</h1>${subtitle ? `<span>${esc(subtitle)}</span>` : ""}</div>`;
  return `<header class="topbar ${cls}">${l}${c}<div class="topbar-actions">${right}</div></header>`;
}

export function bellButton() {
  const n = unreadCount();
  return `<button class="icon-btn" data-href="/notifications" aria-label="Notifications">${I.bell()}${n ? `<span class="badge">${n > 9 ? "9+" : n}</span>` : ""}</button>`;
}

export function row({ icon = "", title, sub = "", value = "", valueSub = "", chevron = true, href = "", action = "", cls = "", attrs = "", valueCls = "", valueSubCls = "" }) {
  const nav = href ? `data-href="${esc(href)}"` : action ? `data-action="${esc(action)}"` : "";
  const tag = href || action ? "button" : "div";
  return `<${tag} class="row ${cls}" ${nav} ${attrs}>
    ${icon ? `<span class="row-icon">${icon}</span>` : ""}
    <span class="row-main"><span class="row-title">${title}</span>${sub ? `<span class="row-sub">${sub}</span>` : ""}</span>
    ${value || valueSub ? `<span class="row-val"><span class="${valueCls}">${value}</span>${valueSub ? `<span class="row-valsub ${valueSubCls}">${valueSub}</span>` : ""}</span>` : ""}
    ${chevron ? `<span class="row-chev">${I.chevR()}</span>` : ""}
  </${tag}>`;
}

export function section(title, body, { action = "", actionHref = "", cls = "" } = {}) {
  return `<section class="sec ${cls}">${title ? `<div class="sec-head"><h2>${esc(title)}</h2>${action ? `<button class="link" data-href="${esc(actionHref)}">${esc(action)}</button>` : ""}</div>` : ""}${body}</section>`;
}

export function toggle(name, checked, attrs = "") {
  return `<label class="switch"><input type="checkbox" name="${esc(name)}" ${checked ? "checked" : ""} ${attrs}/><span class="switch-track"><span class="switch-thumb"></span></span></label>`;
}

export function segmented(name, options, value, cls = "") {
  return `<div class="seg ${cls}" data-seg="${esc(name)}">${options.map((o) => `<button type="button" class="${o.id === value ? "is-active" : ""}" data-value="${esc(o.id)}">${esc(o.label)}</button>`).join("")}</div>`;
}

export function chips(name, options, value, cls = "") {
  return `<div class="chips ${cls}" data-chips="${esc(name)}">${options.map((o) => `<button type="button" class="chip-tab ${o.id === value ? "is-active" : ""}" data-value="${esc(o.id)}">${esc(o.label)}</button>`).join("")}</div>`;
}

export function rangeTabs(ranges, active) {
  return `<div class="range-tabs" role="tablist">${ranges.map((r) => `<button type="button" data-range="${r}" class="${r === active ? "is-active" : ""}">${r}</button>`).join("")}</div>`;
}

export function stat(label, value, cls = "", sub = "") {
  return `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value ${cls}">${value}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
}

export function kv(label, value, cls = "") {
  return `<div class="kv"><span>${label}</span><strong class="${cls}">${value}</strong></div>`;
}

export function empty(icon, title, text = "", action = "") {
  return `<div class="empty">${I[icon] ? I[icon]() : ""}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${action}</div>`;
}

export function symbolRow(q, { href = `/quote/${encodeURIComponent(q.sym)}`, right = "", extra = "", cls = "" } = {}) {
  const r =
    right ||
    `<span class="row-val"><span class="mono" data-live="price:${esc(q.sym)}">${fmtPrice(q.price, q.ccy)}</span><span class="pill pill-${signClass(q.chgPct)}" data-live="pct:${esc(q.sym)}">${fmtPct(q.chgPct)}</span></span>`;
  return `<button class="row sym-row ${cls}" data-href="${esc(href)}">
    ${logo(q.sym, 38)}
    <span class="row-main"><span class="row-title">${esc(q.sym)}${extra}</span><span class="row-sub">${esc(q.name)}</span></span>
    ${r}
  </button>`;
}

export function pnl(v, ccy = "USD") {
  return `<span class="${signClass(v)}">${fmtSigned(v, ccy)}</span>`;
}

export function field(label, inner, hint = "") {
  return `<label class="field"><span>${esc(label)}</span>${inner}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
}

export function select(name, options, value, attrs = "") {
  return `<div class="select-wrap"><select class="input" name="${esc(name)}" ${attrs}>${options.map((o) => `<option value="${esc(o.id)}" ${o.id === value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>${I.chevD()}</div>`;
}

export function marketBadge(status) {
  return `<span class="mkt mkt-${status.code}"><i></i>${status.label}</span>`;
}
