import { state, update } from "../state.js";
import { selectedAccounts, aggregate, portfolioSeries, money, signed, compactMoney, disp, dispCcy } from "../calc.js";
import { RANGES, RANGE_LABEL, toReturnSeries } from "../series.js";
import { lineChart, attachScrub, sparkline } from "../components/chart.js";
import { I, logo } from "../components/icons.js";
import { topbar, bellButton, rangeTabs, section, symbolRow, marketBadge } from "../components/ui.js";
import { accountFilterLabel, openAccountPicker } from "../components/accountPicker.js";
import { openSheet, actionSheet } from "../components/sheet.js";
import { applyLive } from "../components/live.js";
import { getQuote, onTick, marketStatus } from "../quotes.js";
import { upcomingForSymbols } from "../data/calendar.js";
import { aiSummary, newsFor } from "../data/news.js";
import { symbolSeries } from "../calc.js";
import { fmtPct, fmtCompact, signClass, fmtPrice, fmtDateShort, isPrivate } from "../util/format.js";
import { esc, setText, setSign } from "../util/dom.js";
import { openOrders } from "../engine.js";
import { navigate } from "../router.js";

let range = "1M";
let metric = "value";
let aiSym = null;

export const QUICK_ACTIONS = {
  analyst: { label: "PortfolioAnalyst", icon: "analytics", href: "/analyst" },
  transactions: { label: "Transactions", icon: "dollar", href: "/transactions" },
  calendar: { label: "Calendar", icon: "calendar", href: "/calendar" },
  transfer: { label: "Transfer & Pay", icon: "transfer", href: "/transfer" },
  markets: { label: "Markets", icon: "globe", href: "/markets" },
  alerts: { label: "Alerts", icon: "bellPlus", href: "/alerts" },
  news: { label: "News", icon: "news", href: "/news" },
  statements: { label: "Statements", icon: "doc", href: "/statements" },
  convert: { label: "Convert currency", icon: "convert", href: "/transfer/convert" },
  orders: { label: "Orders & Trades", icon: "orders", href: "/orders" },
  options: { label: "Options", icon: "options", href: "/markets/movers" },
};

function changeFor(series) {
  if (series.length < 2) return { abs: 0, pct: 0 };
  const a = series[0].v;
  const b = series[series.length - 1].v;
  return { abs: b - a, pct: a ? ((b - a) / a) * 100 : 0 };
}

export default {
  nav: "home",
  render() {
    const accs = selectedAccounts();
    const agg = aggregate(accs);
    const series = portfolioSeries(accs, range);
    const ch = changeFor(series);
    const ret = toReturnSeries(series);
    const retLast = ret.length ? ret[ret.length - 1].v : 0;
    const status = marketStatus();
    const showBreak = state.settings.showClientBreakdown && agg.clientCount > 0 && state.accountFilter === "ALL";
    const held = agg.positions.map((p) => p.sym);
    const events = upcomingForSymbols(held, 21).slice(0, 4);
    const open = openOrders().filter((o) => accs.some((a) => a.id === o.accountId));
    const movers = [...agg.positions].sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct)).slice(0, 4);
    const wl = state.watchlists.find((w) => w.id === state.activeWatchlist) || state.watchlists[0];
    const aiSyms = agg.positions.filter((p) => p.q.type === "STK").slice(0, 6).map((p) => p.sym);
    if (!aiSym || !aiSyms.includes(aiSym)) aiSym = aiSyms[0];
    const marketsStrip = ["SPX", "NDX", "DJI", "DAX", "ESTX50", "VIX", "BTC", "EUR.USD"].map(getQuote);

    const chartHtml =
      metric === "value"
        ? lineChart({ points: series.map((p) => ({ t: p.t, v: disp(p.v) })), color: "var(--blue)", axisFormat: (v) => (isPrivate() ? "••" : fmtCompact(v)), baseline: range === "1D" ? disp(series[0]?.v) : null, height: 170 })
        : lineChart({ points: ret, color: retLast >= 0 ? "var(--green)" : "var(--red)", axisFormat: (v) => v.toFixed(1) + "%", baseline: 0, height: 170 });

    return `
    ${topbar({
      left: "menu",
      center: `<a class="brand" href="#/home" aria-label="Interactive Brokers"><img src="/assets/interactive-brokers.svg" alt="Interactive Brokers" width="168" height="28"/></a>`,
      right: `<button class="icon-btn" data-href="/search" aria-label="Search">${I.search()}</button>${bellButton()}<button class="icon-btn" data-action="more" aria-label="More">${I.more()}</button>`,
      cls: "topbar--home",
    })}
    <section class="portfolio">
      <button class="acct-pill" data-action="pick-account">${I.layers()}<span>${esc(accountFilterLabel())}</span>${I.chevD()}</button>
      <div class="metric-tabs">
        <button class="metric-tab ${metric === "value" ? "is-active" : ""}" data-metric="value">Value</button>
        <button class="metric-tab ${metric === "perf" ? "is-active" : ""}" data-metric="perf">Performance</button>
        <button class="icon-btn info-btn" data-action="info" aria-label="Info">${I.info()}</button>
        <button class="icon-btn info-btn" data-action="privacy" aria-label="Hide balances">${state.settings.hideBalances ? I.eyeOff() : I.eye()}</button>
      </div>
      ${
        metric === "value"
          ? `<p class="portfolio-value" data-h="value">${money(agg.netLiq)}</p>
             <p class="portfolio-change"><span class="${signClass(ch.abs)}" data-h="change">${signed(ch.abs)} (${fmtPct(ch.pct)})</span> <span data-h="label">${RANGE_LABEL[range]}</span></p>`
          : `<p class="portfolio-value ${signClass(retLast)}" data-h="value">${fmtPct(retLast)}</p>
             <p class="portfolio-change"><span data-h="change">Time-weighted return</span> <span data-h="label">${RANGE_LABEL[range]}</span></p>`
      }
      ${
        showBreak
          ? `<div class="breakdown">
              <button class="bd-chip" data-href="/account/manage">${I.user()}<span>My accounts</span><strong>${compactMoney(agg.privateNetLiq)}</strong><small>${agg.privateCount}</small></button>
              <button class="bd-chip bd-chip--client" data-href="/account/manage">${I.users()}<span>Client accounts</span><strong>${compactMoney(agg.clientNetLiq)}</strong><small>${agg.clientCount}</small></button>
            </div>`
          : ""
      }
      <div class="chart-wrap" data-chart-wrap>${chartHtml}</div>
      ${rangeTabs(RANGES, range)}
      <div class="mkt-row">${marketBadge(status)}<span class="muted small">Day P&L <b class="${signClass(agg.dayPnl)}" data-h="day">${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)})</b></span></div>
    </section>

    <section class="actions" aria-label="Quick actions">
      <button class="chip chip--icon" data-action="customize" aria-label="Customize">${I.plus()}</button>
      ${state.quickActions
        .map((k) => QUICK_ACTIONS[k])
        .filter(Boolean)
        .map((a) => `<button class="chip" data-href="${a.href}">${I[a.icon]()}${esc(a.label)}</button>`)
        .join("")}
    </section>

    <section class="for-you" aria-label="For you">
      <article class="fy-card fy-card--label" data-href="/calendar"><span>For You</span>${I.chevR()}</article>
      ${open.length ? `<article class="fy-card" data-href="/orders"><span class="fy-tag">Orders</span><p>You have ${open.length} open order${open.length > 1 ? "s" : ""} working${open.length === 1 ? ` · ${open[0].side} ${open[0].qty} ${esc(open[0].sym)}` : ""}.</p></article>` : ""}
      ${events
        .map((e) => `<article class="fy-card" data-href="/quote/${encodeURIComponent(e.sym)}"><span class="fy-tag">${esc(e.type)} · ${fmtDateShort(e.t)}</span><p>${esc(e.title)}${e.detail ? ` — ${esc(e.detail)}` : ""}</p></article>`)
        .join("")}
      ${agg.leverage > 1.05 ? `<article class="fy-card" data-href="/portfolio/summary"><span class="fy-tag">Margin</span><p>Your combined portfolio uses ${agg.leverage.toFixed(2)}x leverage. Excess liquidity: ${money(agg.excessLiquidity)}.</p></article>` : ""}
      <article class="fy-card" data-href="/statements"><span class="fy-tag">Reports</span><p>Your monthly activity statement for ${new Date(Date.now() - 20 * 86400000).toLocaleDateString("en-US", { month: "long" })} is ready.</p></article>
      <article class="fy-card" data-href="/analyst"><span class="fy-tag">PortfolioAnalyst</span><p>Your portfolio returned ${fmtPct(retLast)} ${RANGE_LABEL[range]}. See how it compares to the S&P 500.</p></article>
    </section>

    ${section(
      "Markets",
      `<div class="hscroll mkt-strip">${marketsStrip
        .map(
          (q) => `<button class="mkt-card" data-href="/quote/${encodeURIComponent(q.sym)}"><span class="mkt-name">${esc(q.t || q.sym)}</span><span class="mono" data-live="price:${esc(q.sym)}">${fmtPrice(q.price, q.ccy)}</span><span class="${signClass(q.chgPct)}" data-live="pct:${esc(q.sym)}">${fmtPct(q.chgPct)}</span></button>`
        )
        .join("")}</div>`,
      { action: "See all", actionHref: "/markets" }
    )}

    ${section(
      "Top movers in your portfolio",
      `<div class="list card">${movers
        .map(
          (p) => `<button class="row sym-row" data-href="/quote/${encodeURIComponent(p.sym)}">${logo(p.sym, 38)}
            <span class="row-main"><span class="row-title">${esc(p.sym)}</span><span class="row-sub">${p.qty % 1 ? p.qty : fmtCompact(p.qty)} ${p.q.type === "OPT" ? "contracts" : p.q.type === "CRYPTO" ? "units" : "shares"} · ${money(p.mv, 0)}</span></span>
            <span class="row-val"><span class="mono" data-live="price:${esc(p.sym)}">${fmtPrice(p.q.price, p.q.ccy)}</span><span class="row-valsub ${signClass(p.day)}">${signed(p.day)} (${fmtPct(p.dayPct)})</span></span></button>`
        )
        .join("")}</div>`,
      { action: "All positions", actionHref: "/portfolio" }
    )}

    ${section(
      wl.name,
      `<div class="list card">${wl.symbols
        .slice(0, 5)
        .map((s) => getQuote(s))
        .filter(Boolean)
        .map((q) => symbolRow(q, { extra: `<span class="spark-wrap">${sparkline(symbolSeries(q.sym, "1M"))}</span>` }))
        .join("")}</div>`,
      { action: "Watchlist", actionHref: "/watchlist" }
    )}

    <section class="news sec">
      <div class="sec-head"><h2>${I.sparkle()} AI News Overview</h2><button class="link" data-href="/news">More</button></div>
      <div class="tickers" role="tablist">${aiSyms.map((s) => `<button class="ticker ${s === aiSym ? "is-active" : ""}" data-ai="${esc(s)}" aria-label="${esc(s)}">${logo(s, 40)}</button>`).join("")}</div>
      <div class="news-item" data-ai-body>${aiBody(aiSym)}</div>
    </section>
    <p class="disclaimer">Demo environment. Quotes are simulated and delayed. Not investment advice.</p>`;
  },

  mount(el) {
    const accs = selectedAccounts();
    let series = portfolioSeries(accs, range);
    const wrap = el.querySelector("[data-chart-wrap]");
    let detach = () => {};
    const bindScrub = () => {
      detach();
      const pts = metric === "value" ? series.map((p) => ({ t: p.t, v: disp(p.v) })) : toReturnSeries(series);
      detach = attachScrub(wrap, pts, {
        intraday: range === "1D",
        baseline: metric === "value" ? (range === "1D" ? pts[0]?.v : null) : 0,
        onScrub(p) {
          if (metric === "value") {
            setText(el, "[data-h=value]", money(p.v / (disp(1) || 1)));
            const base = pts[0].v;
            const d = p.v - base;
            const c = el.querySelector("[data-h=change]");
            c.textContent = `${signed(d / (disp(1) || 1))} (${fmtPct(base ? (d / base) * 100 : 0)})`;
            setSign(c, d);
            setText(el, "[data-h=label]", range === "1D" ? "at " + new Date(p.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "since " + fmtDateShort(pts[0].t));
          } else {
            const v = el.querySelector("[data-h=value]");
            v.textContent = fmtPct(p.v);
            setSign(v, p.v);
          }
        },
        onEnd() {
          const agg = aggregate(selectedAccounts());
          const ch = changeFor(series);
          if (metric === "value") {
            setText(el, "[data-h=value]", money(agg.netLiq));
            const c = el.querySelector("[data-h=change]");
            c.textContent = `${signed(ch.abs)} (${fmtPct(ch.pct)})`;
            setSign(c, ch.abs);
          } else {
            const r = toReturnSeries(series);
            const last = r.length ? r[r.length - 1].v : 0;
            const v = el.querySelector("[data-h=value]");
            v.textContent = fmtPct(last);
            setSign(v, last);
          }
          setText(el, "[data-h=label]", RANGE_LABEL[range]);
        },
      });
    };
    bindScrub();

    const onClick = (e) => {
      const r = e.target.closest("[data-range]");
      if (r) {
        range = r.dataset.range;
        rerender();
        return;
      }
      const m = e.target.closest("[data-metric]");
      if (m) {
        metric = m.dataset.metric;
        rerender();
        return;
      }
      const ai = e.target.closest("[data-ai]");
      if (ai) {
        aiSym = ai.dataset.ai;
        el.querySelectorAll("[data-ai]").forEach((b) => b.classList.toggle("is-active", b === ai));
        el.querySelector("[data-ai-body]").innerHTML = aiBody(aiSym);
        return;
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      switch (a.dataset.action) {
        case "pick-account":
          openAccountPicker();
          break;
        case "privacy":
          update((s) => (s.settings.hideBalances = !s.settings.hideBalances), "settings");
          break;
        case "info":
          openInfo();
          break;
        case "customize":
          openCustomize();
          break;
        case "more":
          openMore();
          break;
      }
    };
    const rerender = () => {
      // local re-render keeping scroll
      const top = el.scrollTop;
      el.innerHTML = this.render();
      el.scrollTop = top;
      series = portfolioSeries(selectedAccounts(), range);
      bindScrub();
    };
    el.addEventListener("click", onClick);
    const unTick = onTick(() => {
      applyLive(el);
      const agg = aggregate(selectedAccounts());
      const d = el.querySelector("[data-h=day]");
      if (d) {
        d.textContent = `${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)})`;
        setSign(d, agg.dayPnl);
      }
      if (metric === "value" && range === "1D") {
        // keep headline value live for intraday
        const v = el.querySelector("[data-h=value]");
        if (v && !el.querySelector(".chart-tip:not([style*='none'])")) v.textContent = money(agg.netLiq);
      }
    });
    return () => {
      el.removeEventListener("click", onClick);
      detach();
      unTick();
    };
  },
};

function aiBody(sym) {
  if (!sym) return "";
  const q = getQuote(sym);
  const bullets = aiSummary(sym);
  const news = newsFor([sym], 2);
  return `<p class="news-symbol">${esc(sym)} — ${esc(q.name.toUpperCase())} ${esc(q.exch)} <span class="${signClass(q.chgPct)}" data-live="pct:${esc(sym)}">${fmtPct(q.chgPct)}</span></p>
    <ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    <div class="news-links">${news.map((n) => `<button class="news-link" data-href="/news/${n.id}"><span>${esc(n.source)}</span>${esc(n.title)}</button>`).join("")}</div>`;
}

function openInfo() {
  openSheet({
    title: "About these figures",
    html: `<div class="info-list">
      <p><strong>Value</strong> shows the combined Net Liquidation Value of all accounts selected in <em>Manage accounts</em>: cash plus the market value of positions, converted to ${dispCcy()} at live FX rates.</p>
      <p><strong>Performance</strong> shows the time-weighted return (TWR) of the combined portfolio over the selected period, which removes the effect of deposits and withdrawals.</p>
      <p><strong>My accounts</strong> are accounts you own. <strong>Client accounts</strong> are accounts you are authorised to view. Toggle which accounts are included under <em>Account → Manage accounts</em>.</p>
      <p class="muted small">Values update with simulated market data. Day P&L is computed from the previous close.</p>
    </div>`,
  });
}

function openCustomize() {
  const render = () =>
    `<div class="list">${Object.entries(QUICK_ACTIONS)
      .map(([k, a]) => {
        const on = state.quickActions.includes(k);
        return `<label class="row row--plain"><span class="row-icon">${I[a.icon]()}</span><span class="row-main"><span class="row-title">${esc(a.label)}</span></span><span class="switch"><input type="checkbox" data-qa="${k}" ${on ? "checked" : ""}/><span class="switch-track"><span class="switch-thumb"></span></span></span></label>`;
      })
      .join("")}</div>`;
  openSheet({
    title: "Customize quick actions",
    html: render(),
    onMount(body) {
      body.addEventListener("change", (e) => {
        const k = e.target.dataset.qa;
        if (!k) return;
        update((s) => {
          if (e.target.checked) {
            if (!s.quickActions.includes(k)) s.quickActions.push(k);
          } else s.quickActions = s.quickActions.filter((x) => x !== k);
        }, "settings");
      });
    },
  });
}

function openMore() {
  actionSheet({
    title: "More",
    actions: [
      { label: "Trade", icon: "swap", onClick: () => navigate("/search") },
      { label: "Manage accounts", icon: "users", onClick: () => navigate("/account/manage") },
      { label: "PortfolioAnalyst", icon: "analytics", onClick: () => navigate("/analyst") },
      { label: "Transfer & Pay", icon: "transfer", onClick: () => navigate("/transfer") },
      { label: "Settings", icon: "settings", onClick: () => navigate("/settings") },
    ],
  });
}
