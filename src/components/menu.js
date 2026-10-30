import { I, avatar } from "./icons.js";
import { includedAccounts, aggregate, money } from "../calc.js";
import { unreadCount, profileUser, isAdmin } from "../state.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { closeAllSheets } from "./sheet.js";

function menuGroups() {
  const mid = [
    ...(isAdmin()
      ? [
          { icon: "users", label: "Manage accounts", href: "/account/manage" },
          { icon: "clock", label: "Client activity", href: "/account/activity" },
        ]
      : []),
    { icon: "transfer", label: "Transfer & Pay", href: "/transfer" },
    { icon: "analytics", label: "PortfolioAnalyst", href: "/analyst" },
    { icon: "dollar", label: "Transactions", href: "/transactions" },
    { icon: "reports", label: "Statements", href: "/statements" },
    { icon: "calendar", label: "Calendar", href: "/calendar" },
    { icon: "news", label: "News", href: "/news" },
    { icon: "globe", label: "Markets", href: "/markets" },
    { icon: "bellPlus", label: "Price alerts", href: "/alerts" },
  ];
  return [
    {
      items: [
        { icon: "home", label: "Home", href: "/home" },
        { icon: "star", label: "Watchlists", href: "/watchlist" },
        { icon: "pie", label: "Portfolio", href: "/portfolio" },
        { icon: "chart", label: "Quote", href: "/quote" },
        { icon: "search", label: "Search & trade", href: "/search" },
        { icon: "orders", label: "Orders & trades", href: "/orders" },
      ],
    },
    { items: mid },
    {
      items: [
        { icon: "bell", label: "Notifications", href: "/notifications", badge: true },
        { icon: "settings", label: "Settings", href: "/settings" },
        { icon: "help", label: "Help & support", href: "/settings/help" },
      ],
    },
  ];
}

let open = false;

export function isMenuOpen() {
  return open;
}

export function closeMenu() {
  const el = document.getElementById("drawer");
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  open = false;
}

export function openMenu() {
  closeAllSheets();
  let el = document.getElementById("drawer");
  if (!el) {
    el = document.createElement("div");
    el.id = "drawer";
    el.className = "drawer";
    document.getElementById("overlays").appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el) closeMenu();
      const link = e.target.closest("[data-href]");
      if (link) {
        closeMenu();
        navigate(link.dataset.href);
      }
    });
  }
  const USER = profileUser();
  const GROUPS = menuGroups();
  const inc = includedAccounts();
  const agg = aggregate(inc);
  const n = unreadCount();
  el.innerHTML = `<aside class="drawer-panel" role="dialog" aria-label="Menu">
    <header class="drawer-head" data-href="/settings/profile">
      ${avatar(USER.initials, 48)}
      <div>
        <strong>${esc(USER.name)}</strong>
        <span class="muted small">@${esc(USER.username)}${USER.role === "admin" ? " · Admin" : ""}</span>
      </div>
    </header>
    <button class="drawer-nlv" data-href="${isAdmin() ? "/account/manage" : "/account"}">
      <span class="muted small">Combined net liquidation · ${inc.length} accounts</span>
      <strong>${money(agg.netLiq)}</strong>
      <small>${I.user()} ${money(agg.privateNetLiq, 0)} private${agg.clientCount ? ` · ${I.users()} ${money(agg.clientNetLiq, 0)} client` : ""}</small>
    </button>
    ${GROUPS.map(
      (g) =>
        `<nav class="drawer-group">${g.items
          .map(
            (it) =>
              `<button class="drawer-item" data-href="${it.href}">${I[it.icon]()}<span>${esc(it.label)}</span>${
                it.badge && n ? `<b class="badge">${n > 9 ? "9+" : n}</b>` : ""
              }</button>`
          )
          .join("")}</nav>`
    ).join("")}
  </aside>`;
  el.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => el.classList.add("open"));
  open = true;
}

export function toggleMenu() {
  if (open) closeMenu();
  else openMenu();
}
