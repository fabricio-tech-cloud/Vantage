// SVG line / area / donut charts with touch scrubbing.
import { fmtCompact, fmtTime, fmtDateShort, fmtDate } from "../util/format.js";

let uidCounter = 0;

function bounds(points) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  if (!isFinite(min)) {
    min = 0;
    max = 1;
  }
  if (max - min < 1e-9) {
    const d = Math.abs(max) * 0.01 || 1;
    min -= d;
    max += d;
  }
  const pad = (max - min) * 0.06;
  return { min: min - pad, max: max + pad };
}

/**
 * Render a line chart. Options:
 *  points: [{t, v}], color, fill(bool), baseline(number|null), axis(bool), axisFormat(fn), height
 */
export function lineChart(opts) {
  const { points = [], color = "var(--blue)", fill = true, baseline = null, axis = true, axisFormat = (v) => fmtCompact(v), height = 170, width = 360, cls = "" } = opts;
  const id = "g" + ++uidCounter;
  const n = points.length;
  if (n < 2) return `<div class="chart ${cls}" style="height:${height}px"><div class="chart-empty">No data</div></div>`;
  const b = bounds(baseline != null ? [...points, { v: baseline }] : points);
  const W = width;
  const H = height;
  const x = (i) => (i / (n - 1)) * W;
  const y = (v) => H - ((v - b.min) / (b.max - b.min)) * H;
  let d = `M${x(0).toFixed(2)} ${y(points[0].v).toFixed(2)}`;
  const step = Math.max(1, Math.floor(n / 400));
  for (let i = step; i < n; i += step) d += ` L${x(i).toFixed(2)} ${y(points[i].v).toFixed(2)}`;
  if ((n - 1) % step !== 0) d += ` L${x(n - 1).toFixed(2)} ${y(points[n - 1].v).toFixed(2)}`;
  const area = `${d} L${W} ${H} L0 ${H} Z`;
  const ticks = 5;
  let axisHtml = "";
  if (axis) {
    const labels = [];
    for (let i = 0; i < ticks; i++) labels.push(axisFormat(b.max - ((b.max - b.min) * i) / (ticks - 1)));
    axisHtml = `<div class="chart-axis">${labels.map((l) => `<span>${l}</span>`).join("")}</div>`;
  }
  const baseHtml = baseline != null ? `<line class="chart-baseline" x1="0" x2="${W}" y1="${y(baseline).toFixed(2)}" y2="${y(baseline).toFixed(2)}"/>` : "";
  return `<div class="chart ${cls}" style="height:${height}px;--chart-color:${color}" data-chart="${id}">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".14"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${fill ? `<path class="chart-area" d="${area}" fill="url(#${id})"/>` : ""}
      ${baseHtml}
      <path class="chart-line" d="${d}" stroke="${color}"/>
      <line class="chart-cursor" x1="0" x2="0" y1="0" y2="${H}" style="display:none"/>
      <circle class="chart-dot" r="4" cx="0" cy="0" style="display:none" fill="${color}"/>
    </svg>
    ${axisHtml}
    <div class="chart-tip" style="display:none"></div>
  </div>`;
}

/** Attach touch/mouse scrubbing to a rendered lineChart. */
export function attachScrub(container, points, { onScrub, onEnd, format = (p) => fmtCompact(p.v), intraday = false, baseline = null } = {}) {
  const chart = container.querySelector(".chart");
  if (!chart || points.length < 2) return () => {};
  const svg = chart.querySelector("svg");
  const cursor = chart.querySelector(".chart-cursor");
  const dot = chart.querySelector(".chart-dot");
  const tip = chart.querySelector(".chart-tip");
  const vb = svg.viewBox.baseVal;
  const b = bounds(baseline != null ? [...points, { v: baseline }] : points);
  const n = points.length;
  let active = false;
  let startX = 0;
  let startY = 0;
  let decided = false;

  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const i = Math.round(ratio * (n - 1));
    const p = points[i];
    const x = (i / (n - 1)) * vb.width;
    const y = vb.height - ((p.v - b.min) / (b.max - b.min)) * vb.height;
    cursor.setAttribute("x1", x);
    cursor.setAttribute("x2", x);
    cursor.style.display = "";
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.style.display = "";
    tip.style.display = "";
    const label = intraday ? fmtTime(p.t) : n > 400 ? fmtDate(p.t) : fmtDateShort(p.t);
    tip.textContent = label;
    const px = ratio * rect.width;
    tip.style.left = `${Math.min(rect.width - 70, Math.max(0, px - 35))}px`;
    onScrub?.(p, i);
  };
  const hide = () => {
    cursor.style.display = "none";
    dot.style.display = "none";
    tip.style.display = "none";
    onEnd?.();
  };
  const ts = (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    decided = false;
    active = false;
  };
  const tm = (e) => {
    const t = e.touches[0];
    if (!decided) {
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx < 6 && dy < 6) return;
      decided = true;
      active = dx > dy;
      if (!active) return;
    }
    if (!active) return;
    e.preventDefault();
    show(t.clientX);
  };
  const te = () => {
    if (active) hide();
    active = false;
  };
  let mouseDown = false;
  const md = (e) => {
    mouseDown = true;
    show(e.clientX);
  };
  const mm = (e) => {
    if (mouseDown) show(e.clientX);
  };
  const mu = () => {
    if (mouseDown) hide();
    mouseDown = false;
  };
  chart.addEventListener("touchstart", ts, { passive: true });
  chart.addEventListener("touchmove", tm, { passive: false });
  chart.addEventListener("touchend", te);
  chart.addEventListener("touchcancel", te);
  chart.addEventListener("mousedown", md);
  chart.addEventListener("mousemove", mm);
  window.addEventListener("mouseup", mu);
  chart.addEventListener("mouseleave", mu);
  return () => {
    chart.removeEventListener("touchstart", ts);
    chart.removeEventListener("touchmove", tm);
    chart.removeEventListener("touchend", te);
    chart.removeEventListener("touchcancel", te);
    chart.removeEventListener("mousedown", md);
    chart.removeEventListener("mousemove", mm);
    window.removeEventListener("mouseup", mu);
    chart.removeEventListener("mouseleave", mu);
  };
}

export function sparkline(points, { width = 64, height = 24, color } = {}) {
  const n = points.length;
  if (n < 2) return "";
  const b = bounds(points);
  const up = points[n - 1].v >= points[0].v;
  const c = color || (up ? "var(--green)" : "var(--red)");
  const step = Math.max(1, Math.floor(n / 60));
  let d = "";
  for (let i = 0; i < n; i += step) {
    const x = (i / (n - 1)) * width;
    const y = height - ((points[i].v - b.min) / (b.max - b.min)) * height;
    d += (d ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${d}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export const PALETTE = ["#0a84ff", "#30d158", "#ff9f0a", "#64d2ff", "#ff453a", "#8e8e93", "#ac8e68", "#bf5af2", "#ffd60a", "#409cff"];

export function donut(slices, { size = 150, thickness = 22, centerTitle = "", centerSub = "" } = {}) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = slices
    .map((s, i) => {
      const frac = Math.max(0, s.value) / total;
      const len = frac * c;
      const html = `<circle r="${r}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${s.color || PALETTE[i % PALETTE.length]}" stroke-width="${thickness}" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      offset += len;
      return html;
    })
    .join("");
  return `<div class="donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}">${segs}</svg><div class="donut-center"><strong>${centerTitle}</strong><span>${centerSub}</span></div></div>`;
}

export function bars(values, { height = 60, color = "var(--blue)", negColor = "var(--red)" } = {}) {
  const max = Math.max(...values.map((v) => Math.abs(v.value)), 1e-9);
  return `<div class="bars" style="height:${height}px">${values
    .map((v) => {
      const h = (Math.abs(v.value) / max) * (height - 18);
      return `<div class="bar"><div class="bar-fill" style="height:${h.toFixed(1)}px;background:${v.value >= 0 ? color : negColor}"></div><span>${v.label}</span></div>`;
    })
    .join("")}</div>`;
}
