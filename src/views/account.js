import { logout, unreadCount, profileUser, isAdmin } from "../state.js";
import { includedAccounts, aggregate, money, signed } from "../calc.js";
import { topbar, bellButton, row, section } from "../components/ui.js";
import { I, avatar } from "../components/icons.js";
import { confirmSheet } from "../components/sheet.js";
import { fmtPct, signClass } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { openOrders } from "../engine.js";

function menuFor(user) {
  const accountItems = [];
  if (isAdmin()) {
    accountItems.push(
      { icon: "users", title: "Manage accounts", sub: "Choose which accounts to combine", href: "/account/manage", highlight: true },
      { icon: "clock", title: "Client activity", sub: "When they logged in · how much they traded", href: "/account/activity", highlight: true }
    );
  }
  accountItems.push(
    { icon: "user", title: "Profile", sub: user.email, href: "/settings/profile" },
    { icon: "lock", title: "Security", sub: "Two-factor, Face ID, devices", href: "/settings/security" },
    { icon: "bell", title: "Notifications", href: "/settings/notifications" },
    { icon: "settings", title: "Settings", sub: "Appearance, currency, defaults", href: "/settings" },
    { icon: "help", title: "Help & support", href: "/settings/help" }
  );
  return [
    {
      title: "Portfolio & reports",
      items: [
        { icon: "analytics", title: "PortfolioAnalyst", sub: "Performance, risk & benchmarks", href: "/analyst" },
        { icon: "reports", title: "Statements & reports", sub: "Activity, trade confirmations", href: "/statements" },
        { icon: "tax", title: "Tax documents", sub: "Annual forms & reports", href: "/statements/tax" },
        { icon: "dollar", title: "Transactions", sub: "Deposits, trades, dividends, fees", href: "/transactions" },
      ],
    },
    {
      title: "Transfer & pay",
      items: [
        { icon: "arrowDown", title: "Deposit funds", href: "/transfer/deposit" },
        { icon: "arrowUp", title: "Withdraw funds", href: "/transfer/withdraw" },
        { icon: "convert", title: "Convert currency", href: "/transfer/convert" },
        { icon: "swap", title: "Transfer positions", sub: "ACATS / FOP from another broker", href: "/transfer/positions" },
        { icon: "bill", title: "Pay bills", href: "/transfer/bills" },
      ],
    },
    {
      title: "Trading",
      items: [
        { icon: "orders", title: "Orders & trades", href: "/orders" },
        { icon: "bellPlus", title: "Price alerts", href: "/alerts" },
        { icon: "globe", title: "Markets", sub: "Indices, forex, crypto, movers", href: "/markets" },
        { icon: "calendar", title: "Calendar", sub: "Earnings, dividends, economic events", href: "/calendar" },
        { icon: "news", title: "News", href: "/news" },
        { icon: "shield", title: "Trading permissions", sub: "Stocks, options, forex, crypto", href: "/settings/permissions" },
        { icon: "bolt", title: "Market data subscriptions", href: "/settings/marketdata" },
      ],
    },
    { title: "Account", items: accountItems },
  ];
}

export default {
  nav: "account",
  render() {
    const USER = profileUser();
    const MENU = menuFor(USER);
    const inc = includedAccounts();
    const agg = aggregate(inc);
    const open = openOrders().length;
    const n = unreadCount();
    return `${topbar({
      left: `<h1 class="page-title">Account</h1>`,
      center: "<span></span>",
      right: `${bellButton()}<button class="icon-btn" data-href="/settings">${I.settings()}</button>`,
    })}
    <section class="profile-head" data-href="/settings/profile">
      ${avatar(USER.initials, 52)}
      <div><strong>${esc(USER.name)}</strong><span class="muted small">@${esc(USER.username)} · ${USER.role === "admin" ? "Admin" : "Client"} · ${esc(USER.lastLoginDevice || "")}</span></div>
      ${I.chevR()}
    </section>
    <section class="card pad acc-summary"${isAdmin() ? ' data-href="/account/manage"' : ""}>
      <div class="acc-summary-head"><span class="muted small">Combined net liquidation · ${inc.length} account${inc.length !== 1 ? "s" : ""}</span>${isAdmin() ? I.chevR() : ""}</div>
      <p class="port-value">${money(agg.netLiq)}</p>
      <p class="${signClass(agg.dayPnl)}">${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)}) today</p>
      ${
        isAdmin()
          ? `<div class="acc-split">
        <div><span class="muted small">${I.user()} My accounts (${agg.privateCount})</span><strong>${money(agg.privateNetLiq, 0)}</strong></div>
        <div><span class="muted small">${I.users()} Client accounts (${agg.clientCount})</span><strong>${agg.clientCount ? money(agg.clientNetLiq, 0) : "—"}</strong></div>
      </div>`
          : ""
      }
    </section>
    <div class="list card sec">
      ${inc
        .map((a) => {
          const s = agg.summaries.find((x) => x.account.id === a.id);
          return row({ icon: `<span class="row-icon ${a.kind === "client" ? "ico-client" : "ico-private"}">${a.kind === "client" ? I.users() : I.user()}</span>`, title: `${esc(a.alias)}${a.kind === "client" ? ' <span class="tag">Client</span>' : ""}`, sub: `${a.id} · ${a.type}`, value: money(s.netLiq), valueSub: `${signed(s.dayPnl)}`, valueSubCls: signClass(s.dayPnl), href: "/account/detail/" + a.id });
        })
        .join("")}
      ${isAdmin() ? row({ icon: I.plus(), title: "Manage accounts", sub: "Add client accounts to your combined view", href: "/account/manage", cls: "row--accent" }) : ""}
      ${isAdmin() ? row({ icon: I.clock(), title: "Client activity", sub: "Logins & trade volume per client", href: "/account/activity", cls: "row--accent" }) : ""}
    </div>
    ${MENU.map((g) =>
      section(
        g.title,
        `<div class="list card">${g.items
          .map((it) =>
            row({
              icon: I[it.icon](),
              title: esc(it.title) + (it.href === "/orders" && open ? ` <span class="tag">${open} open</span>` : "") + (it.href === "/settings/notifications" && n ? ` <span class="tag">${n}</span>` : ""),
              sub: it.sub ? esc(it.sub) : "",
              href: it.href,
              cls: it.highlight ? "row--accent" : "",
            })
          )
          .join("")}</div>`
      )
    ).join("")}
    <div class="sec">
      <button class="btn btn-ghost btn-block" data-action="logout">${I.logout()} Log out</button>
      <p class="disclaimer">Vantage demo · Interactive Brokers mobile clone · v0.2.0<br/>Not affiliated with Interactive Brokers LLC.</p>
    </div>`;
  },
  mount(el) {
    const onClick = async (e) => {
      if (e.target.closest("[data-action='logout']")) {
        if (await confirmSheet({ title: "Log out", text: "You will need to sign in again to access your accounts.", confirmLabel: "Log out" })) {
          logout();
          navigate("/login", { replace: true });
        }
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  },
};
