import { state, update } from "../state.js";
import { selectedAccounts, aggregate } from "../calc.js";
import { allNews, newsFor, articleBody, aiSummary } from "../data/news.js";
import { allEvents, EVENT_TYPES, upcomingForSymbols } from "../data/calendar.js";
import { addAlert, removeAlert, toggleAlert } from "../engine.js";
import { topbar, bellButton, section, chips, empty, symbolRow, row } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { applyLive } from "../components/live.js";
import { allQuotes, getQuote, onTick, marketStatus } from "../quotes.js";
import { openSymbolSearch } from "./search.js";
import { TYPE_LABEL } from "../data/symbols.js";
import { fmtPct, fmtPrice, fmtDate, fmtDateTime, relTime, signClass, isoDay } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { toast, confirmSheet } from "../components/sheet.js";

let newsFilter = "All";
let calFilter = "All";
let mktTab = "indices";

export function QuoteHome() {
  return {
    nav: "quote",
    render() {
      const last = state.lastQuote || "AAPL";
      const q = getQuote(last);
      const recent = state.recentSearches.map(getQuote).filter(Boolean).slice(0, 6);
      const held = aggregate(selectedAccounts())
        .positions.filter((p) => p.q.type === "STK" || p.q.type === "ETF")
        .slice(0, 8)
        .map((p) => p.q);
      return `${topbar({ left: "menu", title: "Quote", right: `${bellButton()}` })}
      <button class="search-box search-box--page" data-href="/search">${I.search()}<span>Symbol, company, ISIN</span></button>
      ${q ? section("Last viewed", `<div class="list card">${symbolRow(q)}</div>`) : ""}
      ${recent.length ? section("Recent", `<div class="list card">${recent.map((x) => symbolRow(x)).join("")}</div>`) : ""}
      ${held.length ? section("Your holdings", `<div class="list card">${held.map((x) => symbolRow(x)).join("")}</div>`, { action: "Portfolio", actionHref: "/portfolio" }) : ""}
      ${section("Browse", `<div class="grid2 browse">
        ${[
          ["Indices", "/markets", "globe"],
          ["Movers", "/markets/movers", "chart"],
          ["Forex", "/markets/forex", "convert"],
          ["Crypto", "/markets/crypto", "coins"],
          ["Options", "/quote/AAPL", "options"],
          ["News", "/news", "news"],
        ]
          .map(([l, h, i]) => `<button class="browse-card" data-href="${h}">${I[i]()}<span>${l}</span></button>`)
          .join("")}
      </div>`)}`;
    },
    mount: liveMount,
  };
}

export function Markets() {
  return {
    nav: null,
    render(params) {
      const tab = params.tab || "indices";
      mktTab = tab;
      const status = marketStatus();
      let list = [];
      let title = "Markets";
      if (tab === "movers") {
        title = "Movers";
        const stocks = allQuotes().filter((q) => q.type === "STK");
        const gainers = [...stocks].sort((a, b) => b.chgPct - a.chgPct).slice(0, 8);
        const losers = [...stocks].sort((a, b) => a.chgPct - b.chgPct).slice(0, 8);
        return `${topbar({ left: "back", title, right: bellButton() })}
        <p class="pad-x muted small">${status.label}</p>
        ${section("Top gainers", `<div class="list card">${gainers.map((q) => symbolRow(q)).join("")}</div>`)}
        ${section("Top losers", `<div class="list card">${losers.map((q) => symbolRow(q)).join("")}</div>`)}`;
      }
      if (tab === "forex") {
        title = "Forex";
        list = allQuotes().filter((q) => q.type === "CASH");
      } else if (tab === "crypto") {
        title = "Crypto";
        list = allQuotes().filter((q) => q.type === "CRYPTO");
      } else if (tab === "sectors") {
        title = "Sectors";
        const map = new Map();
        for (const q of allQuotes().filter((x) => x.type === "STK")) {
          if (!map.has(q.sector)) map.set(q.sector, []);
          map.get(q.sector).push(q);
        }
        return `${topbar({ left: "back", title })}
        ${[...map.entries()]
          .map(([k, arr]) => {
            const avg = arr.reduce((a, x) => a + x.chgPct, 0) / arr.length;
            return `<button class="row" data-href="/search"><span class="row-main"><span class="row-title">${esc(k)}</span><span class="row-sub">${arr.length} names</span></span><span class="pill pill-${signClass(avg)}">${fmtPct(avg)}</span></button>`;
          })
          .join("")}`;
      } else {
        list = allQuotes().filter((q) => q.type === "IND");
      }
      return `${topbar({ left: "back", title, right: bellButton() })}
      <p class="pad-x muted small">${status.label} · ${TYPE_LABEL[list[0]?.type] || ""}</p>
      <div class="list card sec">${list.map((q) => symbolRow(q)).join("")}</div>`;
    },
    mount: liveMount,
  };
}

export function News() {
  return {
    nav: null,
    render(params) {
      const sym = params.sym;
      const held = aggregate(selectedAccounts()).positions.map((p) => p.sym);
      let list = sym ? newsFor([sym], 40) : allNews();
      const cats = ["All", "Holdings", "Markets", "Tech", "Earnings"];
      if (!sym) {
        if (newsFilter === "Holdings") list = newsFor(held, 40);
        else if (newsFilter !== "All") list = list.filter((n) => n.tag === newsFilter || (newsFilter === "Tech" && n.syms.some((s) => ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMD"].includes(s))));
      }
      list = list.slice(0, 40);
      return `${topbar({ left: "back", title: sym ? `${sym} news` : "News" })}
      ${sym ? `<div class="news-item" data-ai-body><p class="news-symbol">${esc(sym)}</p><ul>${aiSummary(sym).map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>` : chips("news", cats.map((c) => ({ id: c, label: c })), newsFilter)}
      <div class="list card sec">${list
        .map(
          (n) => `<button class="row news-row" data-href="/news/${n.id}">
            <span class="row-main"><span class="row-title">${esc(n.title)}</span><span class="row-sub">${esc(n.source)} · ${relTime(n.t)}${n.syms[0] ? " · " + n.syms[0] : ""}</span></span>
            ${n.syms[0] ? logo(n.syms[0], 32) : I.news()}
          </button>`
        )
        .join("")}</div>`;
    },
    mount(el) {
      const onClick = (e) => {
        const c = e.target.closest("[data-chips='news'] button");
        if (c) {
          newsFilter = c.dataset.value;
          navigate("/news");
        }
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function Article() {
  return {
    nav: null,
    render({ id }) {
      const n = allNews().find((x) => x.id === id);
      if (!n) return `${topbar({ left: "back", title: "Article" })}<div class="empty"><h3>Not found</h3></div>`;
      const body = articleBody(n);
      return `${topbar({ left: "back", title: n.source })}
      <article class="article">
        <p class="muted small">${esc(n.source)} · ${fmtDateTime(n.t)}</p>
        <h1>${esc(n.title)}</h1>
        ${n.syms.map((s) => `<button class="chip" data-href="/quote/${encodeURIComponent(s)}">${logo(s, 18)}${esc(s)} <span class="${signClass(getQuote(s)?.chgPct)}">${fmtPct(getQuote(s)?.chgPct || 0)}</span></button>`).join("")}
        ${body.map((p) => `<p>${esc(p)}</p>`).join("")}
      </article>`;
    },
  };
}

export function Calendar() {
  return {
    nav: null,
    render() {
      const held = new Set(aggregate(selectedAccounts()).positions.map((p) => p.sym));
      let ev = allEvents();
      if (calFilter !== "All") ev = ev.filter((e) => e.type === calFilter);
      const upcoming = ev.filter((e) => e.t >= Date.now() - 86400000);
      const groups = new Map();
      for (const e of upcoming.slice(0, 80)) {
        const k = isoDay(e.t);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      }
      const mine = upcomingForSymbols([...held], 21);
      return `${topbar({ left: "back", title: "Calendar" })}
      ${mine.length ? section("In your portfolio", `<div class="list card">${mine
        .slice(0, 5)
        .map((e) => `<button class="row" data-href="${e.sym ? "/quote/" + encodeURIComponent(e.sym) : "/calendar"}"><span class="row-icon">${e.sym ? logo(e.sym, 32) : I.calendar()}</span><span class="row-main"><span class="row-title">${esc(e.title)}</span><span class="row-sub">${esc(e.type)} · ${fmtDate(e.t)}</span></span></button>`)
        .join("")}</div>`) : ""}
      ${chips("cal", EVENT_TYPES.map((t) => ({ id: t, label: t })), calFilter)}
      ${[...groups.entries()]
        .map(
          ([k, rows]) =>
            `<div class="group-head"><span>${fmtDate(k)}</span></div><div class="list card">${rows
              .map(
                (e) => `<button class="row" data-href="${e.sym ? "/quote/" + encodeURIComponent(e.sym) : "/calendar"}">
                <span class="row-icon">${e.sym ? logo(e.sym, 32) : I.calendar()}</span>
                <span class="row-main"><span class="row-title">${esc(e.title)}</span><span class="row-sub">${esc(e.type)}${e.detail ? " · " + esc(e.detail) : ""}</span></span>
              </button>`
              )
              .join("")}</div>`
        )
        .join("")}`;
    },
    mount(el) {
      const onClick = (e) => {
        const c = e.target.closest("[data-chips='cal'] button");
        if (c) {
          calFilter = c.dataset.value;
          navigate("/calendar");
        }
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function Notifications() {
  return {
    nav: "account",
    render() {
      const list = state.notifications;
      return `${topbar({
        left: "back",
        title: "Notifications",
        right: list.some((n) => !n.read) ? `<button class="link" data-action="read">Mark all read</button>` : "",
      })}
      ${
        list.length
          ? `<div class="list card sec">${list
              .map(
                (n) => `<button class="row ${n.read ? "" : "unread"}" data-n="${n.id}" data-href="${esc(n.route || "/home")}">
                <span class="row-icon">${I.bell()}</span>
                <span class="row-main"><span class="row-title">${esc(n.title)}</span><span class="row-sub">${esc(n.body)} · ${relTime(n.t)}</span></span>
              </button>`
              )
              .join("")}</div>`
          : empty("bell", "You're all caught up")
      }`;
    },
    mount(el) {
      const onClick = (e) => {
        if (e.target.closest("[data-action='read']")) {
          update((s) => s.notifications.forEach((n) => (n.read = true)), "notify");
          return;
        }
        const r = e.target.closest("[data-n]");
        if (r) update((s) => {
          const n = s.notifications.find((x) => x.id === r.dataset.n);
          if (n) n.read = true;
        }, "notify");
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function Alerts() {
  return {
    nav: "account",
    render(params) {
      const list = state.alerts;
      return `${topbar({
        left: "back",
        title: "Price alerts",
        right: `<button class="icon-btn" data-action="new" aria-label="New alert">${I.plus()}</button>`,
      })}
      ${params.sym ? `<p class="pad-x muted small">Creating alert for ${esc(params.sym)}</p>` : ""}
      ${
        list.length
          ? `<div class="list card sec">${list
              .map((a) => {
                const q = getQuote(a.sym);
                return `<div class="row">
                  ${logo(a.sym, 36)}
                  <span class="row-main"><span class="row-title">${esc(a.sym)} ${a.cond} ${a.field === "pct" ? a.value + "%" : fmtPrice(a.value, q?.ccy)}</span><span class="row-sub">${a.note || "Last " + fmtPrice(q?.price, q?.ccy)}${a.triggered ? " · triggered " + relTime(a.triggered) : ""}</span></span>
                  <button class="tb-btn" data-toggle="${a.id}">${a.active ? "On" : "Off"}</button>
                  <button class="icon-btn" data-del="${a.id}" aria-label="Delete">${I.trash()}</button>
                </div>`;
              })
              .join("")}</div>`
          : empty("bellPlus", "No alerts", "Get notified when a price or daily move hits your level.", `<button class="btn btn-primary" data-action="new">Create alert</button>`)
      }`;
    },
    mount(el, params) {
      const create = (sym) => {
        const q = getQuote(sym);
        if (!q) return;
        addAlert({ sym, cond: "above", field: "price", value: Math.round(q.price * 1.03 * 100) / 100, note: "" });
        toast(`Alert set on ${sym}`, { type: "success" });
        navigate("/alerts");
      };
      if (params.sym) {
        if (!state.alerts.some((a) => a.sym === params.sym && a.active)) create(params.sym);
        else navigate("/alerts", { replace: true });
      }
      const onClick = async (e) => {
        if (e.target.closest("[data-action='new']")) {
          openSymbolSearch({ title: "Alert on…", onPick: (sym) => create(sym) });
          return;
        }
        const t = e.target.closest("[data-toggle]");
        if (t) {
          toggleAlert(t.dataset.toggle);
          return;
        }
        const d = e.target.closest("[data-del]");
        if (d) {
          if (await confirmSheet({ title: "Delete alert", text: "Remove this price alert?", confirmLabel: "Delete", danger: true })) removeAlert(d.dataset.del);
        }
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

function liveMount(el) {
  const unTick = onTick(() => applyLive(el));
  return () => unTick();
}

void mktTab;
void row;
