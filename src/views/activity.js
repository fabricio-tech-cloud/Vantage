import { state, isAdmin, activitySummary, login, getAccount } from "../state.js";
import { CLIENT_USERS, userById, ACCOUNTS } from "../data/accounts.js";
import { accountSummary, money, signed } from "../calc.js";
import { topbar, section, empty } from "../components/ui.js";
import { I, avatar } from "../components/icons.js";
import { actionSheet, toast } from "../components/sheet.js";
import { fmtDateTime, fmtMoneyAlways, relTime, signClass } from "../util/format.js";
import { esc, haptic } from "../util/dom.js";
import { navigate } from "../router.js";

function accountForUser(userId) {
  return ACCOUNTS.find((a) => a.userId === userId && a.kind === "client");
}

function clientRow(u) {
  const meta = accountForUser(u.id);
  const live = meta ? getAccount(meta.id) : null;
  const sum = live ? accountSummary(live) : null;
  const act = activitySummary(u.id);
  const last = act.lastAny ? relTime(act.lastAny) : "—";
  const vol = act.volWeek ? fmtMoneyAlways(act.volWeek, "USD", 0) : "—";
  return `<button class="row activity-row" data-user="${u.id}">
    <span class="row-icon">${avatar(u.initials, 36)}</span>
    <span class="row-main">
      <span class="row-title">${esc(u.name)}</span>
      <span class="row-sub">${meta ? esc(meta.id) : "—"} · last ${esc(last)} · ${act.tradesWeek} trades / 7d</span>
    </span>
    <span class="row-val">
      <span>${sum ? money(sum.netLiq) : "—"}</span>
      <span class="row-valsub">${vol} vol</span>
    </span>
    ${I.chevR()}
  </button>`;
}

function feedItem(a) {
  const u = userById(a.userId);
  const amt =
    a.amount != null
      ? `<span class="row-valsub ${signClass(a.amount)}">${a.side === "BUY" ? "−" : "+"}${fmtMoneyAlways(Math.abs(a.amount), a.ccy || "USD", 0)}</span>`
      : "";
  return `<div class="row row--plain activity-feed-item">
    <span class="row-icon">${avatar(u.initials, 32)}</span>
    <span class="row-main">
      <span class="row-title">${esc(a.title || a.kind)}</span>
      <span class="row-sub">${esc(a.detail || "")} · ${fmtDateTime(a.t)}</span>
    </span>
    ${amt ? `<span class="row-val">${amt}</span>` : `<span class="muted small">${relTime(a.t)}</span>`}
  </div>`;
}

export default {
  nav: "account",
  render() {
    if (!isAdmin()) {
      return `${topbar({ left: "back", title: "Client activity" })}
      ${empty("lock", "Admin only", "Sign in as Fabricio Rubichi to see client activity.")}`;
    }

    const feed = (state.activity || []).slice(0, 40);
    const totals = CLIENT_USERS.reduce(
      (acc, u) => {
        const s = activitySummary(u.id);
        acc.logins += s.loginCount;
        acc.trades += s.tradeCount;
        acc.volWeek += s.volWeek;
        acc.active += s.lastAny && Date.now() - s.lastAny < 7 * 24 * 3600000 ? 1 : 0;
        return acc;
      },
      { logins: 0, trades: 0, volWeek: 0, active: 0 }
    );

    const sorted = [...CLIENT_USERS].sort((a, b) => (activitySummary(b.id).lastAny || 0) - (activitySummary(a.id).lastAny || 0));

    return `${topbar({
      left: "back",
      title: "Client activity",
      right: `<button class="icon-btn" data-action="info" aria-label="Info">${I.help()}</button>`,
    })}
    <section class="card pad manage-hero">
      <span class="muted small">Your clients · activity log</span>
      <p class="port-value">${CLIENT_USERS.length} accounts</p>
      <div class="acc-split activity-stats">
        <div><span class="muted small">Active (7d)</span><strong>${totals.active}</strong></div>
        <div><span class="muted small">Trades</span><strong>${totals.trades}</strong></div>
        <div><span class="muted small">Vol / 7d</span><strong>${fmtMoneyAlways(totals.volWeek, "USD", 0)}</strong></div>
      </div>
      <p class="muted small manage-hint">See when each client signed in and how much they traded. Open a client to log in as them.</p>
    </section>

    ${section(
      "Clients",
      `<div class="list card">${sorted.map(clientRow).join("")}</div>`
    )}

    ${section(
      "Recent activity",
      feed.length
        ? `<div class="list card">${feed.map(feedItem).join("")}</div>`
        : empty("clock", "No activity yet", "Logins and trades will show up here.")
    )}
    `;
  },
  mount(el) {
    if (!isAdmin()) return;
    const onClick = (e) => {
      if (e.target.closest("[data-action='info']")) {
        toast("Activity tracks logins and trades for every client account.", { type: "info" });
        return;
      }
      const rowEl = e.target.closest("[data-user]");
      if (!rowEl) return;
      const userId = rowEl.dataset.user;
      const u = userById(userId);
      const meta = accountForUser(userId);
      const act = activitySummary(userId);
      haptic(8);
      actionSheet({
        title: u.name,
        actions: [
          {
            label: "Account detail",
            icon: "user",
            sub: meta ? `${meta.id} · ${fmtMoneyAlways(act.volWeek, "USD", 0)} vol / 7d` : "",
            onClick: () => meta && navigate("/account/detail/" + meta.id),
          },
          {
            label: "Log in as " + u.name.split(" ")[0],
            icon: "lock",
            sub: act.lastLogin ? "Last login " + relTime(act.lastLogin) : "Never signed in",
            onClick: () => {
              login(userId);
              toast(`Signed in as ${u.name}`, { type: "success" });
              navigate("/home", { replace: true });
            },
          },
          {
            label: "Their activity",
            icon: "clock",
            sub: `${act.tradesWeek} trades · ${act.loginCount} logins`,
            onClick: () => navigate("/account/activity/" + userId),
          },
        ],
      });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  },
};

export function ClientActivityDetail() {
  return {
    nav: "account",
    render(p) {
      if (!isAdmin()) {
        return `${topbar({ left: "back", title: "Activity" })}${empty("lock", "Admin only")}`;
      }
      const u = userById(p.id);
      const act = activitySummary(u.id);
      const feed = (state.activity || []).filter((a) => a.userId === u.id).slice(0, 80);
      const meta = accountForUser(u.id);
      const live = meta ? getAccount(meta.id) : null;
      const sum = live ? accountSummary(live) : null;
      return `${topbar({ left: "back", title: u.name.split(" ")[0], subtitle: "Activity" })}
      <section class="profile-head">
        ${avatar(u.initials, 52)}
        <div>
          <strong>${esc(u.name)}</strong>
          <span class="muted small">@${esc(u.username)} · ${meta ? esc(meta.id) : ""}</span>
        </div>
      </section>
      <section class="card pad">
        <div class="kv-grid">
          <div><span class="muted small">Net liq</span><strong>${sum ? money(sum.netLiq) : "—"}</strong></div>
          <div><span class="muted small">Day P&amp;L</span><strong class="${sum ? signClass(sum.dayPnl) : ""}">${sum ? signed(sum.dayPnl) : "—"}</strong></div>
          <div><span class="muted small">Logins</span><strong>${act.loginCount}</strong></div>
          <div><span class="muted small">Trades</span><strong>${act.tradeCount}</strong></div>
          <div><span class="muted small">Vol / 7d</span><strong>${fmtMoneyAlways(act.volWeek, "USD", 0)}</strong></div>
          <div><span class="muted small">Last login</span><strong>${act.lastLogin ? relTime(act.lastLogin) : "—"}</strong></div>
        </div>
        <button class="btn btn-primary btn-block" data-login-as="${u.id}" style="margin-top:0.8rem">Log in as ${esc(u.name.split(" ")[0])}</button>
      </section>
      ${section("Timeline", feed.length ? `<div class="list card">${feed.map(feedItem).join("")}</div>` : empty("clock", "No events yet"))}
      `;
    },
    mount(el, p) {
      const onClick = (e) => {
        const btn = e.target.closest("[data-login-as]");
        if (!btn) return;
        login(btn.dataset.loginAs);
        toast(`Signed in as ${userById(btn.dataset.loginAs).name}`, { type: "success" });
        navigate("/home", { replace: true });
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}
