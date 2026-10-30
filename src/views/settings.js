import { state, update, resetState, logout, profileUser, isAdmin } from "../state.js";
import { topbar, row, section, toggle, select } from "../components/ui.js";
import { I, avatar } from "../components/icons.js";
import { confirmSheet, toast } from "../components/sheet.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";

const CCYS = ["USD", "EUR", "CHF", "GBP"].map((c) => ({ id: c, label: c }));

export function SettingsHub() {
  return {
    nav: "account",
    render() {
      const s = state.settings;
      const USER = profileUser();
      return `${topbar({ left: "back", title: "Settings" })}
      <div class="list card sec">
        ${row({ icon: I.user(), title: "Profile", sub: USER.email, href: "/settings/profile" })}
        ${row({ icon: I.lock(), title: "Security", sub: "Face ID, 2FA, devices", href: "/settings/security" })}
        ${row({ icon: I.bell(), title: "Notifications", href: "/settings/notifications" })}
        ${row({ icon: I.shield(), title: "Trading permissions", href: "/settings/permissions" })}
        ${row({ icon: I.bolt(), title: "Market data", href: "/settings/marketdata" })}
        ${row({ icon: I.help(), title: "Help & support", href: "/settings/help" })}
      </div>
      ${section("Display", `<div class="list card">
        <div class="row row--plain"><span class="row-main"><span class="row-title">Display currency</span></span>${select("ccy", CCYS, s.displayCcy, 'data-setting="displayCcy"')}</div>
        <div class="row row--plain"><span class="row-main"><span class="row-title">Hide balances</span><span class="row-sub">Mask Net Liq on Home</span></span>${toggle("hide", s.hideBalances, 'data-setting="hideBalances"')}</div>
        ${isAdmin() ? `<div class="row row--plain"><span class="row-main"><span class="row-title">Show client split on Home</span></span>${toggle("break", s.showClientBreakdown, 'data-setting="showClientBreakdown"')}</div>` : ""}
      </div>`)}
      ${section("Orders", `<div class="list card">
        <div class="row row--plain"><span class="row-main"><span class="row-title">Default order type</span></span>${select("ot", [{ id: "MKT", label: "Market" }, { id: "LMT", label: "Limit" }, { id: "STP", label: "Stop" }], s.defaultOrderType, 'data-setting="defaultOrderType"')}</div>
        <div class="row row--plain"><span class="row-main"><span class="row-title">Default time in force</span></span>${select("tif", [{ id: "DAY", label: "Day" }, { id: "GTC", label: "GTC" }], s.defaultTif, 'data-setting="defaultTif"')}</div>
        <div class="row row--plain"><span class="row-main"><span class="row-title">Allow outside RTH by default</span></span>${toggle("rth", s.outsideRth, 'data-setting="outsideRth"')}</div>
        <div class="row row--plain"><span class="row-main"><span class="row-title">Confirm orders</span></span>${toggle("conf", s.confirmOrders, 'data-setting="confirmOrders"')}</div>
      </div>`)}
      <div class="sec">
        <button class="btn btn-ghost btn-block" data-action="reset">Reset demo data</button>
        <p class="disclaimer">IBKR mobile clone · demo · v0.2.0</p>
      </div>`;
    },
    mount: bindSettings,
  };
}

export function Profile() {
  return {
    nav: "account",
    render() {
      const USER = profileUser();
      return `${topbar({ left: "back", title: "Profile" })}
      <section class="profile-head">
        ${avatar(USER.initials, 64)}
        <div><strong>${esc(USER.name)}</strong><span class="muted small">@${esc(USER.username)}${USER.role === "admin" ? " · Admin" : " · Client"}</span></div>
      </section>
      <div class="list card sec">
        ${row({ icon: I.mail(), title: "Email", sub: USER.email, chevron: false })}
        ${row({ icon: I.phone(), title: "Phone", sub: USER.phone, chevron: false })}
        ${row({ icon: I.building(), title: "Address", sub: USER.address, chevron: false })}
        ${row({ icon: I.clock(), title: "Last login", sub: USER.lastLoginDevice || "—", chevron: false })}
        ${USER.accountId ? row({ icon: I.users(), title: "Account", sub: USER.accountId, chevron: false }) : ""}
      </div>`;
    },
  };
}

export function Security() {
  return {
    nav: "account",
    render() {
      const s = state.settings;
      return `${topbar({ left: "back", title: "Security" })}
      <div class="list card sec">
        <div class="row row--plain"><span class="row-icon">${I.faceid()}</span><span class="row-main"><span class="row-title">Face ID / biometrics</span></span>${toggle("bio", s.biometrics, 'data-setting="biometrics"')}</div>
        <div class="row row--plain"><span class="row-icon">${I.lock()}</span><span class="row-main"><span class="row-title">Require login</span><span class="row-sub">Ask for Face ID when opening the app</span></span>${toggle("req", s.requireLogin, 'data-setting="requireLogin"')}</div>
        ${row({ icon: I.shield(), title: "Two-factor authentication", sub: "SMS + IB Key · On", chevron: false })}
        ${row({ icon: I.phone(), title: "Trusted devices", sub: "iPhone 17 Pro · this device", chevron: false })}
      </div>
      <div class="sec"><button class="btn btn-ghost btn-block" data-action="logout">${I.logout()} Log out</button></div>`;
    },
    mount(el) {
      const off = bindSettings(el);
      const onClick = async (e) => {
        if (!e.target.closest("[data-action='logout']")) return;
        if (await confirmSheet({ title: "Log out", text: "You will need to sign in again.", confirmLabel: "Log out" })) {
          logout();
          navigate("/login", { replace: true });
        }
      };
      el.addEventListener("click", onClick);
      return () => {
        off?.();
        el.removeEventListener("click", onClick);
      };
    },
  };
}

export function NotifSettings() {
  return {
    nav: "account",
    render() {
      const n = state.settings.notif;
      const items = [
        ["orders", "Orders & fills", "Working, filled, cancelled"],
        ["prices", "Price alerts", "When an alert triggers"],
        ["news", "News", "Headlines on holdings"],
        ["statements", "Statements", "When a new report is ready"],
        ["security", "Security", "New device, password"],
      ];
      return `${topbar({ left: "back", title: "Notifications" })}
      <div class="list card sec">${items
        .map(([k, t, sub]) => `<div class="row row--plain"><span class="row-main"><span class="row-title">${t}</span><span class="row-sub">${sub}</span></span>${toggle(k, n[k], `data-notif="${k}"`)}</div>`)
        .join("")}</div>`;
    },
    mount(el) {
      const onChange = (e) => {
        const k = e.target.dataset.notif;
        if (k) update((s) => (s.settings.notif[k] = e.target.checked), "settings");
      };
      el.addEventListener("change", onChange);
      return () => el.removeEventListener("change", onChange);
    },
  };
}

export function Permissions() {
  return {
    nav: "account",
    render() {
      const perms = [
        ["Stocks", "US, EU, CH · Live", true],
        ["Options", "US equity options", true],
        ["Futures", "Not requested", false],
        ["Forex", "IDEALPRO", true],
        ["Crypto", "PAXOS · BTC ETH SOL", true],
        ["Bonds", "Not requested", false],
        ["Mutual funds", "Not requested", false],
        ["Short selling", "Margin accounts", true],
      ];
      return `${topbar({ left: "back", title: "Trading permissions" })}
      <div class="list card sec">${perms
        .map(([t, sub, on]) => `<div class="row row--plain"><span class="row-main"><span class="row-title">${t}</span><span class="row-sub">${sub}</span></span><span class="pill ${on ? "pill-up" : "pill-flat"}">${on ? "Active" : "Off"}</span></div>`)
        .join("")}</div>
      <p class="disclaimer">Permission changes in production go through IBKR compliance. Demo only.</p>`;
    },
  };
}

export function MarketData() {
  return {
    nav: "account",
    render() {
      const subs = [
        ["US Securities Snapshot", "USD 10.00 / mo", true],
        ["NASDAQ TotalView", "USD 15.00 / mo", false],
        ["NYSE OpenBook", "USD 25.00 / mo", false],
        ["Xetra Level 1", "EUR 14.50 / mo", true],
        ["SIX Swiss Exchange", "CHF 12.00 / mo", true],
        ["PAXOS Crypto", "Included", true],
      ];
      return `${topbar({ left: "back", title: "Market data" })}
      <div class="list card sec">${subs
        .map(([t, sub, on]) => `<div class="row row--plain"><span class="row-icon">${I.bolt()}</span><span class="row-main"><span class="row-title">${t}</span><span class="row-sub">${sub}</span></span><span class="pill ${on ? "pill-up" : "pill-flat"}">${on ? "On" : "Off"}</span></div>`)
        .join("")}</div>
      <p class="disclaimer">Quotes in this demo are simulated and delayed.</p>`;
    },
  };
}

export function Help() {
  return {
    nav: "account",
    render() {
      return `${topbar({ left: "back", title: "Help & support" })}
      <div class="list card sec">
        ${row({ icon: I.help(), title: "IBKR Campus", sub: "Guides and webinars", action: "campus" })}
        ${row({ icon: I.mail(), title: "Message center", sub: "Ticket #48219 · open", href: "/notifications" })}
        ${row({ icon: I.phone(), title: "Call support", sub: "+41 41 726 9500", action: "call" })}
      </div>
      <div class="card pad sec">
        <h3>About this demo</h3>
        <p class="muted">Vantage is a mobile web clone of the Interactive Brokers app for demonstration. It is not affiliated with Interactive Brokers LLC. Do not use it to place real orders.</p>
      </div>`;
    },
    mount(el) {
      const onClick = (e) => {
        const a = e.target.closest("[data-action]");
        if (a?.dataset.action === "campus") toast("IBKR Campus is not included in this demo");
        if (a?.dataset.action === "call") toast("Dialer is not available in this demo");
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

function bindSettings(el) {
  const onChange = (e) => {
    const k = e.target.dataset.setting;
    if (!k) return;
    update((s) => {
      if (e.target.type === "checkbox") s.settings[k] = e.target.checked;
      else s.settings[k] = e.target.value;
    }, "settings");
  };
  const onClick = async (e) => {
    if (!e.target.closest("[data-action='reset']")) return;
    if (await confirmSheet({ title: "Reset demo", text: "This clears orders, alerts, linked accounts and local settings.", confirmLabel: "Reset", danger: true })) resetState();
  };
  el.addEventListener("change", onChange);
  el.addEventListener("click", onClick);
  return () => {
    el.removeEventListener("change", onChange);
    el.removeEventListener("click", onClick);
  };
}

void toast;
