import { esc } from "../util/dom.js";
import { getQuote } from "../quotes.js";

const wrap = (inner, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

export const I = {
  menu: () => wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: () => wrap('<circle cx="11" cy="11" r="6.5"/><path d="m16.2 16.2 3.3 3.3"/>'),
  bell: () => wrap('<path d="M6 16.5V10a6 6 0 1 1 12 0v6.5l1.4 1.8H4.6L6 16.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
  bellPlus: () => wrap('<path d="M6 16.5V10a6 6 0 1 1 12 0v6.5l1.4 1.8H4.6L6 16.5Z"/><path d="M10 19a2 2 0 0 0 4 0M12 9v4M10 11h4"/>'),
  more: () => wrap('<circle cx="12" cy="12" r="8.25"/><circle cx="8.2" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="12" r="1.1" fill="currentColor" stroke="none"/>'),
  dots: () => wrap('<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  info: () => wrap('<circle cx="12" cy="12" r="8.25"/><path d="M12 10.4v5.2M12 8.2h.01"/>'),
  chevR: () => wrap('<path d="m9 6 6 6-6 6"/>'),
  chevL: () => wrap('<path d="m15 6-6 6 6 6"/>'),
  chevD: () => wrap('<path d="m6 9 6 6 6-6"/>'),
  chevU: () => wrap('<path d="m6 15 6-6 6 6"/>'),
  back: () => wrap('<path d="M15 5l-7 7 7 7"/>'),
  plus: () => wrap('<path d="M12 6v12M6 12h12"/>'),
  minus: () => wrap('<path d="M6 12h12"/>'),
  close: () => wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: () => wrap('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  star: () => wrap('<path d="m12 4.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 15.6 7.8 17.8l.8-4.7-3.4-3.3 4.7-.7Z"/>'),
  starF: () => wrap('<path fill="currentColor" d="m12 4.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 15.6 7.8 17.8l.8-4.7-3.4-3.3 4.7-.7Z"/>'),
  home: () => wrap('<path d="m4.5 11 7.5-6.5L19.5 11"/><path d="M7 10.5V19h10v-8.5"/>'),
  quote: () => wrap('<circle cx="11.5" cy="12" r="6.2"/><path d="M16.2 16.6 19 19.5"/>'),
  pie: () => wrap('<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M14.5 2.8a8.5 8.5 0 0 1 6.7 6.7h-6.7z"/>'),
  list: () => wrap('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>'),
  orders: () => wrap('<path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3"/>'),
  user: () => wrap('<circle cx="12" cy="9" r="3.2"/><path d="M6.2 18.5c1.4-2.2 3.3-3.3 5.8-3.3s4.4 1.1 5.8 3.3"/>'),
  userCircle: () => wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3"/>'),
  users: () => wrap('<circle cx="9" cy="9" r="3"/><path d="M3.5 18.5c1.1-2.2 3-3.3 5.5-3.3s4.4 1.1 5.5 3.3"/><path d="M15 6.2a3 3 0 0 1 0 5.6M17.5 15.3c1.6.4 2.6 1.4 3.2 3.2"/>'),
  calendar: () => wrap('<rect x="4.5" y="6" width="15" height="13.5" rx="2"/><path d="M8 4.5v3M16 4.5v3M4.5 10h15"/>'),
  chart: () => wrap('<path d="M4 16 9 9l4 4 7-9"/>'),
  barChart: () => wrap('<path d="M5 19V11M12 19V5M19 19v-7"/>'),
  transfer: () => wrap('<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'),
  news: () => wrap('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>'),
  settings: () => wrap('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  logout: () => wrap('<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>'),
  trash: () => wrap('<path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7"/>'),
  edit: () => wrap('<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m13 8 3 3"/>'),
  filter: () => wrap('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  sort: () => wrap('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>'),
  eye: () => wrap('<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  eyeOff: () => wrap('<path d="M3 3l18 18M10.6 10.6a2.8 2.8 0 0 0 3.9 3.9M7 7.3C4.3 9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.3-1M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5s-1 1.9-2.8 3.6"/>'),
  faceid: () => wrap('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M8.5 9.5v1.5M15.5 9.5v1.5M12 9.5v4h-1M9 15.5c1.6 1.4 4.4 1.4 6 0"/>'),
  lock: () => wrap('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  shield: () => wrap('<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>'),
  doc: () => wrap('<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4M9 12h6M9 16h6"/>'),
  download: () => wrap('<path d="M12 4v11M8 11l4 4 4-4M5 19h14"/>'),
  dollar: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.6 9.8c.5-.8 1.3-1.2 2.4-1.2 1.4 0 2.3.7 2.3 1.6 0 1.1-1 1.5-2.4 1.8-1.5.4-2.6.8-2.6 2 0 1.1 1.2 1.8 2.7 1.8 1.1 0 2.1-.4 2.5-1.2"/>'),
  globe: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.8 5.3 3.8 8.5s-1.3 6-3.8 8.5c-2.5-2.5-3.8-5.3-3.8-8.5S9.5 6 12 3.5z"/>'),
  moon: () => wrap('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  sun: () => wrap('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  arrowUR: () => wrap('<path d="M7 17 17 7M9 7h8v8"/>'),
  arrowDR: () => wrap('<path d="M7 7l10 10M17 9v8H9"/>'),
  arrowUp: () => wrap('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrowDown: () => wrap('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  refresh: () => wrap('<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"/>'),
  share: () => wrap('<path d="M12 4v11M8 8l4-4 4 4M5 13v6h14v-6"/>'),
  wallet: () => wrap('<rect x="3.5" y="6.5" width="17" height="13" rx="2"/><path d="M3.5 10h17M16 14.5h1.5"/>'),
  bank: () => wrap('<path d="M3.5 10 12 4.5l8.5 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3.5 19.5h17"/>'),
  convert: () => wrap('<path d="M4 7h13M13 3l4 4-4 4M20 17H7M11 13l-4 4 4 4"/>'),
  bill: () => wrap('<path d="M6 3.5h12V21l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>'),
  grid: () => wrap('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  layers: () => wrap('<path d="m12 4 8 4.5-8 4.5-8-4.5z"/><path d="m4 13 8 4.5 8-4.5M4 17l8 4.5 8-4.5"/>'),
  options: () => wrap('<path d="M4 18 10 8l4 6 6-10"/><path d="M4 21h16"/>'),
  help: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 2-2.2 3.4M12 17h.01"/>'),
  phone: () => wrap('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>'),
  mail: () => wrap('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  key: () => wrap('<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8M15 7l2 2M18 4l2 2"/>'),
  flag: () => wrap('<path d="M5 21V4h10l-1 3 1 3H5"/>'),
  send: () => wrap('<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>'),
  swap: () => wrap('<path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12"/>'),
  analytics: () => wrap('<path d="M4 20h16M6 16l4-5 4 3 5-7"/>'),
  bolt: () => wrap('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'),
  target: () => wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  coins: () => wrap('<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'),
  clock: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'),
  drag: () => wrap('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="2.6"/>'),
  sparkle: () => wrap('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  building: () => wrap('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>'),
  link: () => wrap('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>'),
  reports: () => wrap('<path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M9 16v-4M12 16V8M15 16v-6"/>'),
  tax: () => wrap('<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-16a1 1 0 0 1 1-1z"/><path d="m9 13 6-6M9.5 7.5h.01M14.5 12.5h.01"/>'),
};

/** Circular symbol logo. */
export function logo(sym, size = 36) {
  const q = getQuote(sym) || {};
  const text = q.t || String(sym).slice(0, 2);
  const fs = text.length >= 3 ? size * 0.3 : text.length === 2 ? size * 0.38 : size * 0.48;
  return `<span class="logo" style="width:${size}px;height:${size}px;background:${q.bg || "#333"};color:${q.fg || "#fff"};font-size:${fs}px">${esc(text)}</span>`;
}

export function avatar(initials, size = 40) {
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${size * 0.38}px">${esc(initials)}</span>`;
}
