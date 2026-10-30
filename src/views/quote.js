import { state, setLastQuote } from "../state.js";
import { getQuote, bidAsk, onTick, marketStatus } from "../quotes.js";
import { selectedAccounts, aggregate, symbolSeries, money, signed } from "../calc.js";
import { lineChart, attachScrub, bars } from "../components/chart.js";
import { topbar, rangeTabs, section, kv, row, marketBadge } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { actionSheet, toast } from "../components/sheet.js";
import { openOrderTicket } from "../components/trade.js";
import { toggleInWatchlist, inAnyWatchlist } from "./watchlist.js";
import { newsFor } from "../data/news.js";
import { allEvents } from "../data/calendar.js";
import { TYPE_LABEL, REGION_BY_EXCH } from "../data/symbols.js";
import { fmtPrice, fmtPct, fmtSignedAlways, fmtCompact, fmtQty, fmtDateShort, relTime, signClass, fmtPlainPct } from "../util/format.js";
import { esc, setText, setSign, haptic } from "../util/dom.js";
import { navigate } from "../router.js";
import { rngFor } from "../util/rng.js";

const RANGES = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y"];
let range = "1D";

function changeFor(series) {
  if (series.length < 2) return { abs: 0, pct: 0 };
  const a = series[0].v;
  const b = series[series.length - 1].v;
  return { abs: b - a, pct: a ? ((b - a) / a) * 100 : 0 };
}

function analystHtml(q) {
  const r = rngFor("an:" + q.sym);
  const buy = Math.round(35 + r() * 50);
  const hold = Math.round((100 - buy) * (0.5 + r() * 0.4));
  const sell = 100 - buy - hold;
  const target = q.price * (1 + (r() - 0.3) * 0.35);
  return `<div class="card pad">
    <div class="an-bars"><div class="an-bar up" style="flex:${buy}"><span>Buy ${buy}%</span></div><div class="an-bar flat" style="flex:${hold}"><span>Hold ${hold}%</span></div><div class="an-bar down" style="flex:${sell}"><span>${sell > 8 ? `Sell ${sell}%` : ""}</span></div></div>
    <div class="kv-list">
      ${kv("Consensus", buy > 60 ? "Buy" : buy > 45 ? "Overweight" : "Hold")}
      ${kv("Avg. price target", `${fmtPrice(target, q.ccy)} <small class="${signClass(target - q.price)}">${fmtPct(((target - q.price) / q.price) * 100)}</small>`)}
      ${kv("Analysts covering", String(Math.round(12 + r() * 40)))}
    </div></div>`;
}

function financialsHtml(q) {
  const r = rngFor("fin:" + q.sym);
  const base = (q.mcap || 1e11) / (q.pe ? q.pe * 1.3 : 25) / 4;
  const labels = ["Q4", "Q1", "Q2", "Q3"];
  const rev = labels.map((l, i) => ({ label: l, value: base * (0.85 + i * 0.05 + r() * 0.1) }));
  const eps = labels.map((l, i) => ({ label: l, value: (q.eps || 2) / 4 * (0.8 + i * 0.07 + r() * 0.1) * (q.eps < 0 ? -1 : 1) }));
  return `<div class="card pad fin-grid">
    <div><h5>Revenue <small>(${q.ccy}, quarterly)</small></h5>${bars(rev.map((x) => ({ ...x, label: x.label })), { height: 70 })}<p class="muted small">Latest: ${fmtCompact(rev[3].value)} · ${fmtPct(((rev[3].value - rev[0].value) / rev[0].value) * 100)} vs. 3Q ago</p></div>
    <div><h5>EPS <small>(diluted)</small></h5>${bars(eps, { height: 70, color: "var(--green)" })}<p class="muted small">Latest: ${eps[3].value.toFixed(2)} ${q.ccy}</p></div>
  </div>`;
}

export default {
  nav: "quote",
  cls: "has-tradebar",
  render({ sym }) {
    const q = getQuote(sym);
    if (!q) return `${topbar({ title: "Not found" })}<div class="empty"><h3>Unknown symbol</h3></div>`;
    const series = symbolSeries(sym, range);
    const ch = changeFor(series);
    const color = ch.abs >= 0 ? "var(--green)" : "var(--red)";
    const { bid, ask, bidSize, askSize } = bidAsk(q);
    const agg = aggregate(selectedAccounts());
    const pos = agg.positions.find((p) => p.sym === sym);
    const news = newsFor([sym], 4);
    const events = allEvents().filter((e) => e.sym === sym && e.t > Date.now() - 86400000).slice(0, 3);
    const inWl = inAnyWatchlist(sym);
    const status = marketStatus();
    const isOpt = q.type === "OPT";
    const dayRangePct = q.high > q.low ? ((q.price - q.low) / (q.high - q.low)) * 100 : 50;
    const yrRangePct = q.hi52 > q.lo52 ? ((q.price - q.lo52) / (q.hi52 - q.lo52)) * 100 : 50;

    return `${topbar({
      left: "back",
      center: `<div class="topbar-title topbar-title--sym">${logo(sym, 26)}<h1>${esc(sym)}</h1><span>${esc(q.exch)} · ${TYPE_LABEL[q.type] || q.type}</span></div>`,
      right: `<button class="icon-btn ${inWl ? "accent" : ""}" data-action="wl" aria-label="Watchlist">${inWl ? I.starF() : I.star()}</button><button class="icon-btn" data-action="alert" aria-label="Alert">${I.bellPlus()}</button><button class="icon-btn" data-action="more">${I.more()}</button>`,
    })}
    <section class="quote-head">
      <p class="quote-name">${esc(q.name)}</p>
      <p class="quote-price mono" data-h="price">${fmtPrice(q.price, q.ccy)}</p>
      <p class="quote-change"><span class="${signClass(ch.abs)}" data-h="change">${fmtSignedAlways(ch.abs, q.ccy, q.price < 1 ? 4 : 2)} (${fmtPct(ch.pct)})</span> <span class="muted" data-h="label">${range === "1D" ? "today" : "past " + range.toLowerCase().replace("ytd", "year to date").replace("past year to date", "year to date")}</span></p>
      <div class="mkt-row">${marketBadge(status)}<span class="muted small">${q.type === "CRYPTO" ? "24/7 · PAXOS" : q.type === "CASH" ? "IDEALPRO · 24/5" : "Delayed 15 min · " + esc(q.exch)}</span></div>
      <div class="chart-wrap" data-chart-wrap>${lineChart({ points: series, color, baseline: range === "1D" ? q.prevClose : null, axisFormat: (v) => fmtCompact(v), height: 190 })}</div>
      ${rangeTabs(RANGES, range)}
    </section>

    ${
      pos
        ? section(
            "Your position",
            `<div class="card pad pos-card" data-href="/portfolio">
              <div class="grid2">
                ${kv("Quantity", fmtQty(pos.qty))}
                ${kv("Avg. cost", fmtPrice(pos.avg, q.ccy))}
                ${kv("Market value", `<span data-h="posmv">${money(pos.mv)}</span>`)}
                ${kv("Day P&L", `<span class="${signClass(pos.day)}" data-h="posday">${signed(pos.day)} (${fmtPct(pos.dayPct)})</span>`)}
                ${kv("Unrealized P&L", `<span class="${signClass(pos.unreal)}" data-h="posunreal">${signed(pos.unreal)} (${fmtPct(pos.unrealPct)})</span>`)}
                ${kv("Portfolio weight", fmtPlainPct(pos.weight))}
              </div>
              ${pos.legs.length > 1 ? `<p class="muted small">Held in ${pos.legs.length} accounts: ${pos.legs.map((l) => `${esc(l.accountId)} (${fmtQty(l.qty)})`).join(", ")}</p>` : `<p class="muted small">Held in ${esc(pos.legs[0].accountId)}</p>`}
            </div>`
          )
        : ""
    }

    ${section(
      "Bid / Ask",
      `<div class="card pad ba">
        <div class="ba-side"><span class="muted small">Bid × ${fmtCompact(bidSize)}</span><strong class="mono down" data-h="bid">${fmtPrice(bid, q.ccy)}</strong></div>
        <div class="ba-bar"><i style="width:${Math.round((bidSize / (bidSize + askSize)) * 100)}%"></i></div>
        <div class="ba-side right"><span class="muted small">Ask × ${fmtCompact(askSize)}</span><strong class="mono up" data-h="ask">${fmtPrice(ask, q.ccy)}</strong></div>
      </div>`
    )}

    ${section(
      "Key statistics",
      `<div class="card pad">
        <div class="range-bar"><span>${fmtPrice(q.low, q.ccy)}</span><div class="rb"><i style="left:${dayRangePct.toFixed(1)}%"></i></div><span>${fmtPrice(q.high, q.ccy)}</span></div><p class="muted small center">Day range</p>
        <div class="range-bar"><span>${fmtPrice(q.lo52, q.ccy)}</span><div class="rb"><i style="left:${yrRangePct.toFixed(1)}%"></i></div><span>${fmtPrice(q.hi52, q.ccy)}</span></div><p class="muted small center">52-week range</p>
        <div class="grid2 kv-grid">
          ${kv("Open", fmtPrice(q.open, q.ccy))}
          ${kv("Prev. close", fmtPrice(q.prevClose, q.ccy))}
          ${kv("Volume", q.vol ? fmtCompact(q.vol) : "—")}
          ${kv("Avg. volume", q.avgVol ? fmtCompact(q.avgVol) : "—")}
          ${isOpt ? kv("Implied vol.", fmtPlainPct(q.iv * 100)) : kv("Market cap", q.mcap ? fmtCompact(q.mcap) : "—")}
          ${isOpt ? kv("Delta", q.delta.toFixed(2)) : kv("P/E (TTM)", q.pe ? q.pe.toFixed(1) : "—")}
          ${isOpt ? kv("Open interest", fmtCompact(q.openInterest)) : kv("EPS (TTM)", q.eps != null ? q.eps.toFixed(2) : "—")}
          ${isOpt ? kv("Multiplier", String(q.multiplier)) : kv("Dividend yield", q.div ? fmtPlainPct(q.div, 2) : "—")}
          ${kv("Beta", q.beta != null ? q.beta.toFixed(2) : "—")}
          ${kv("Currency", q.ccy)}
        </div>
      </div>`
    )}

    ${
      q.type === "STK" || q.type === "ETF"
        ? `<div class="list card sec">${row({ icon: I.options(), title: "Option chain", sub: "Calls & puts · all expirations", href: "/options/" + encodeURIComponent(sym) })}${row({ icon: I.news(), title: "News & research", sub: `${news.length}+ recent headlines`, href: "/news/sym/" + encodeURIComponent(sym) })}${row({ icon: I.calendar(), title: "Events", sub: events[0] ? `${events[0].type} · ${fmtDateShort(events[0].t)}` : "No upcoming events", href: "/calendar" })}</div>`
        : ""
    }

    ${
      events.length
        ? section("Upcoming events", `<div class="list card">${events.map((e) => `<div class="row row--plain"><span class="row-icon">${I.calendar()}</span><span class="row-main"><span class="row-title">${esc(e.type)}</span><span class="row-sub">${esc(e.detail || e.title)}</span></span><span class="row-val"><span>${fmtDateShort(e.t)}</span></span></div>`).join("")}</div>`)
        : ""
    }

    ${q.type === "STK" ? section("Analyst ratings", analystHtml(q)) : ""}
    ${q.type === "STK" ? section("Financials", financialsHtml(q)) : ""}

    ${
      news.length
        ? section(
            "News",
            `<div class="list card">${news.map((n) => `<button class="row news-row" data-href="/news/${n.id}"><span class="row-main"><span class="row-title">${esc(n.title)}</span><span class="row-sub">${esc(n.source)} · ${relTime(n.t)}</span></span>${I.chevR()}</button>`).join("")}</div>`,
            { action: "More", actionHref: "/news/sym/" + encodeURIComponent(sym) }
          )
        : ""
    }

    ${section(
      "About",
      `<div class="card pad about"><p>${esc(q.desc || `${q.name} (${sym}) is listed on ${q.exch} and trades in ${q.ccy}. Sector: ${q.sector}. Region: ${REGION_BY_EXCH[q.exch] || "Global"}.`)}</p>
        <div class="grid2 kv-grid">${kv("Sector", esc(q.sector))}${kv("Exchange", esc(q.exch))}${kv("Region", esc(REGION_BY_EXCH[q.exch] || "Global"))}${kv("Type", TYPE_LABEL[q.type] || q.type)}</div></div>`
    )}

    <div class="trade-bar">
      <button class="btn btn-sell" data-action="sell">Sell</button>
      <button class="btn btn-buy" data-action="buy">Buy</button>
    </div>`;
  },
  mount(el, { sym }) {
    const q = getQuote(sym);
    if (!q) return () => {};
    setLastQuote(sym);
    const series = symbolSeries(sym, range);
    const wrap = el.querySelector("[data-chart-wrap]");
    const d = q.price < 1 ? 4 : 2;
    const detach = attachScrub(wrap, series, {
      intraday: range === "1D",
      baseline: range === "1D" ? q.prevClose : null,
      format: (p) => fmtPrice(p.v, q.ccy),
      onScrub(p) {
        setText(el, "[data-h=price]", fmtPrice(p.v, q.ccy));
        const base = range === "1D" ? q.prevClose : series[0].v;
        const c = el.querySelector("[data-h=change]");
        c.textContent = `${fmtSignedAlways(p.v - base, q.ccy, d)} (${fmtPct(((p.v - base) / base) * 100)})`;
        setSign(c, p.v - base);
        setText(el, "[data-h=label]", range === "1D" ? "at " + new Date(p.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : fmtDateShort(p.t));
      },
      onEnd() {
        const ch = changeFor(series);
        setText(el, "[data-h=price]", fmtPrice(q.price, q.ccy));
        const c = el.querySelector("[data-h=change]");
        c.textContent = `${fmtSignedAlways(ch.abs, q.ccy, d)} (${fmtPct(ch.pct)})`;
        setSign(c, ch.abs);
        setText(el, "[data-h=label]", range === "1D" ? "today" : "past " + range.toLowerCase());
      },
    });
    const onClick = (e) => {
      const r = e.target.closest("[data-range]");
      if (r) {
        range = r.dataset.range;
        navigate(location.hash.slice(1)); // same path → in-place re-render with scroll preserved
        return;
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      switch (a.dataset.action) {
        case "buy":
          haptic();
          openOrderTicket({ sym, side: "BUY" });
          break;
        case "sell":
          haptic();
          openOrderTicket({ sym, side: "SELL" });
          break;
        case "wl": {
          const added = toggleInWatchlist(sym);
          toast(added ? `${sym} added to watchlist` : `${sym} removed from watchlist`, { type: "success" });
          break;
        }
        case "alert":
          navigate("/alerts/new/" + encodeURIComponent(sym));
          break;
        case "more":
          actionSheet({
            title: sym,
            actions: [
              { label: "Add to another watchlist", icon: "star", onClick: () => pickWatchlist(sym) },
              { label: "Option chain", icon: "options", onClick: () => navigate("/options/" + encodeURIComponent(sym)) },
              { label: "Transactions for " + sym, icon: "dollar", onClick: () => navigate("/transactions/sym/" + encodeURIComponent(sym)) },
              { label: "Share", icon: "share", onClick: () => toast("Link copied") },
            ],
          });
          break;
      }
    };
    el.addEventListener("click", onClick);
    const unTick = onTick(() => {
      if (el.querySelector(".chart-tip")?.style.display !== "none") return;
      const live = getQuote(sym);
      if (!live) return;
      setText(el, "[data-h=price]", fmtPrice(live.price, live.ccy));
      if (range === "1D") {
        const c = el.querySelector("[data-h=change]");
        if (c) {
          c.textContent = `${fmtSignedAlways(live.chg, live.ccy, d)} (${fmtPct(live.chgPct)})`;
          setSign(c, live.chg);
        }
      }
      const { bid, ask } = bidAsk(live);
      setText(el, "[data-h=bid]", fmtPrice(bid, live.ccy));
      setText(el, "[data-h=ask]", fmtPrice(ask, live.ccy));
      const pos = aggregate(selectedAccounts()).positions.find((p) => p.sym === sym);
      if (pos) {
        setText(el, "[data-h=posmv]", money(pos.mv));
        const pd = el.querySelector("[data-h=posday]");
        if (pd) {
          pd.textContent = `${signed(pos.day)} (${fmtPct(pos.dayPct)})`;
          setSign(pd, pos.day);
        }
        const pu = el.querySelector("[data-h=posunreal]");
        if (pu) {
          pu.textContent = `${signed(pos.unreal)} (${fmtPct(pos.unrealPct)})`;
          setSign(pu, pos.unreal);
        }
      }
    });
    return () => {
      el.removeEventListener("click", onClick);
      detach();
      unTick();
    };
  },
};

function pickWatchlist(sym) {
  actionSheet({
    title: "Add to watchlist",
    actions: state.watchlists.map((w) => ({
      label: w.name,
      icon: w.symbols.includes(sym) ? "check" : "plus",
      onClick: () => {
        const added = toggleInWatchlist(sym, w.id);
        toast(added ? `Added to ${w.name}` : `Removed from ${w.name}`, { type: "success" });
      },
    })),
  });
}
