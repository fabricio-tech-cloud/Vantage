import { route, start, navigate, back, refresh, currentPath } from "./src/router.js";
import { state, subscribe, isLoggedIn } from "./src/state.js";
import { startTicker } from "./src/quotes.js";
import { startEngine, ensureSeeded } from "./src/engine.js";
import { closeAllSheets } from "./src/components/sheet.js";
import { toggleMenu, closeMenu, isMenuOpen } from "./src/components/menu.js";
import { haptic } from "./src/util/dom.js";

import home from "./src/views/home.js";
import watchlist from "./src/views/watchlist.js";
import quote from "./src/views/quote.js";
import search from "./src/views/search.js";
import portfolio from "./src/views/portfolio.js";
import options from "./src/views/options.js";
import orders from "./src/views/orders.js";
import account from "./src/views/account.js";
import manage from "./src/views/manage.js";
import login from "./src/views/login.js";
import activity, { ClientActivityDetail } from "./src/views/activity.js";
import { TransferHub, TransferForm } from "./src/views/transfer.js";
import { SettingsHub, Profile, Security, NotifSettings, Permissions, MarketData, Help } from "./src/views/settings.js";
import { Analyst, Statements, Transactions, AccountDetail } from "./src/views/reports.js";
import { QuoteHome, Markets, News, Article, Calendar, Notifications, Alerts } from "./src/views/explore.js";

ensureSeeded();
startTicker(2200);
startEngine();

route("/login", login);
route("/home", home);
route("/watchlist", watchlist);
route("/quote", QuoteHome());
route("/quote/:sym", quote);
route("/search", search);
route("/portfolio", portfolio);
route("/portfolio/:tab", portfolio);
route("/options/:sym", options);
route("/orders", orders);
route("/orders/:tab", orders);
route("/account", account);
route("/account/manage", manage);
route("/account/activity", activity);
route("/account/activity/:id", ClientActivityDetail());
route("/account/detail/:id", AccountDetail());
route("/transfer", TransferHub());
route("/transfer/:kind", {
  nav: "account",
  render(p) {
    return TransferForm(p.kind).render();
  },
  mount(el, p) {
    return TransferForm(p.kind).mount?.(el);
  },
});
route("/settings", SettingsHub());
route("/settings/profile", Profile());
route("/settings/security", Security());
route("/settings/notifications", NotifSettings());
route("/settings/permissions", Permissions());
route("/settings/marketdata", MarketData());
route("/settings/help", Help());
route("/analyst", Analyst());
route("/statements", Statements());
route("/statements/:mode", Statements());
route("/transactions", Transactions());
route("/transactions/sym/:sym", Transactions());
route("/markets", Markets());
route("/markets/:tab", Markets());
route("/news", News());
route("/news/sym/:sym", News());
route("/news/:id", Article());
route("/calendar", Calendar());
route("/notifications", Notifications());
route("/alerts", Alerts());
route("/alerts/new/:sym", Alerts());

const TABS = {
  watchlist: "/watchlist",
  home: "/home",
  quote: "/quote",
  search: "/search",
  account: "/account",
};

function tickClock() {
  const el = document.getElementById("phone-time");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}
tickClock();
setInterval(tickClock, 15000);

function syncNav(view, path) {
  const nav = document.getElementById("nav");
  const app = document.getElementById("app");
  const hide = !view?.nav || path === "/login";
  nav.classList.toggle("is-hidden", hide);
  app.classList.toggle("no-nav", hide);
  const tab = view?.nav;
  nav.querySelectorAll("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === tab || (tab === "portfolio" && b.dataset.tab === "home") || (tab === "orders" && b.dataset.tab === "account");
    b.classList.toggle("is-active", on);
  });
}

function gate() {
  if (!state.settings.requireLogin) return true;
  if (isLoggedIn()) return true;
  if (currentPath() !== "/login") navigate("/login", { replace: true });
  return false;
}

document.getElementById("app").addEventListener("click", (e) => {
  const menuBtn = e.target.closest("[data-action='menu']");
  if (menuBtn) {
    e.preventDefault();
    haptic();
    toggleMenu();
    return;
  }
  if (e.target.closest("input, select, textarea, .switch, [data-inc]")) return;
  const backBtn = e.target.closest("[data-nav='back']");
  if (backBtn) {
    e.preventDefault();
    closeMenu();
    closeAllSheets();
    back();
    return;
  }
  const link = e.target.closest("[data-href]");
  if (link) {
    e.preventDefault();
    closeMenu();
    closeAllSheets();
    haptic(6);
    navigate(link.dataset.href);
  }
});

document.getElementById("nav").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  e.preventDefault();
  closeMenu();
  closeAllSheets();
  haptic(8);
  if (b.dataset.tab === "quote") {
    navigate(state.lastQuote ? "/quote/" + encodeURIComponent(state.lastQuote) : "/quote");
    return;
  }
  navigate(TABS[b.dataset.tab] || "/home");
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isMenuOpen()) closeMenu();
    else closeAllSheets();
  }
});

subscribe((reason) => {
  if (reason === "seed") return;
  refresh(reason);
});

if (state.settings.requireLogin && !isLoggedIn() && !String(location.hash).includes("/login")) {
  location.replace("#/login");
}

start((view, path, reason) => {
  if (path !== "/login" && !gate()) return;
  syncNav(view, path);
  closeMenu();
  if (reason === "route") closeAllSheets();
  document.body.dataset.route = path;
});
