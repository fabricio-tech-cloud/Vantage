import { state, getAccount } from "../state.js";
import { selectedAccounts, includedAccounts, aggregate, accountSummary, allocation, portfolioSeries, money, signed, compactMoney } from "../calc.js";
import { RANGES, RANGE_LABEL, toReturnSeries } from "../series.js";
import { transactionsFor, TX_TYPES, txMatchesFilter, incomeSummary } from "../data/transactions.js";
import { topbar, bellButton, section, kv, stat, chips, empty, row } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { lineChart, donut, PALETTE } from "../components/chart.js";
import { accountFilterLabel, openAccountPicker } from "../components/accountPicker.js";
import { getQuote } from "../quotes.js";
import { fmtPct, fmtDate, fmtDateTime, fmtMoneyAlways, signClass, fmtPlainPct, monthKey, monthLabel } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";

let analystRange = "YTD";
let txFilter = "All";

export function Analyst() {
  return {
    nav: "account",
    render() {
      const accs = selectedAccounts();
      const agg = aggregate(accs);
      const series = portfolioSeries(accs, analystRange);
      const ret = toReturnSeries(series);
      const last = ret.length ? ret[ret.length - 1].v : 0;
      const spy = getQuote("SPY");
      const bench = spy ? spy.chgPct * (analystRange === "1D" ? 1 : analystRange === "1W" ? 5 : analystRange === "1M" || analystRange === "MTD" ? 12 : analystRange === "3M" ? 8 : 18) * 0.08 : 8;
      const alpha = last - bench;
      const alloc = allocation(agg);
      const slices = alloc.byClass.slice(0, 6).map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      const vol = Math.abs(last) * 0.55 + 4.2;
      const sharpe = vol ? last / vol : 0;
      return `${topbar({
        left: "back",
        title: "PortfolioAnalyst",
        right: `<button class="icon-btn" data-action="pick-account">${I.layers()}</button>`,
      })}
      <div class="pad-x muted small">${esc(accountFilterLabel())} · time-weighted return</div>
      <section class="portfolio">
        <p class="portfolio-value ${signClass(last)}">${fmtPct(last)}</p>
        <p class="portfolio-change">${RANGE_LABEL[analystRange]} · vs S&P 500 <span class="${signClass(alpha)}">${fmtPct(alpha)} alpha</span></p>
        <div class="chart-wrap">${lineChart({ points: ret, color: last >= 0 ? "var(--green)" : "var(--red)", axisFormat: (v) => v.toFixed(1) + "%", baseline: 0, height: 160 })}</div>
        <div class="range-tabs">${RANGES.filter((r) => r !== "ALL").concat("ALL").map((r) => `<button type="button" data-range="${r}" class="${r === analystRange ? "is-active" : ""}">${r}</button>`).join("")}</div>
      </section>
      <div class="stats3">
        ${stat("Net Liq", money(agg.netLiq, 0))}
        ${stat("Sharpe (ann.)", sharpe.toFixed(2), signClass(sharpe))}
        ${stat("Vol (ann.)", fmtPlainPct(vol))}
      </div>
      ${section("Return vs benchmark", `<div class="card pad kv-list">
        ${kv("Portfolio TWR", fmtPct(last), signClass(last))}
        ${kv("S&P 500 (SPY)", fmtPct(bench), signClass(bench))}
        ${kv("Alpha", fmtPct(alpha), signClass(alpha))}
        ${kv("Max drawdown (est.)", "−" + (4.5 + Math.abs(last) * 0.3).toFixed(1) + "%")}
      </div>`)}
      ${section(
        "Allocation",
        `<div class="alloc card">
          ${donut(slices, { size: 132, thickness: 18, centerTitle: fmtPlainPct(slices[0]?.pct || 0, 0), centerSub: esc(slices[0]?.label || "") })}
          <div class="legend">${slices.map((s) => `<div class="legend-row"><i style="background:${s.color}"></i><span>${esc(s.label)}</span><b>${fmtPlainPct(s.pct)}</b><small>${money(s.value, 0)}</small></div>`).join("")}</div>
        </div>`
      )}
      ${section("Risk", `<div class="card pad kv-list">
        ${kv("Leverage", agg.leverage.toFixed(2) + "x", agg.leverage > 1.5 ? "down" : "")}
        ${kv("Excess liquidity", money(agg.excessLiquidity))}
        ${kv("Largest position", agg.positions[0] ? `${agg.positions[0].sym} · ${fmtPlainPct(agg.positions[0].weight)}` : "—")}
        ${kv("Cash weight", fmtPlainPct(agg.netLiq ? (agg.cashUsd / agg.netLiq) * 100 : 0))}
      </div>`)}
      <p class="disclaimer">PortfolioAnalyst figures are simulated from demo holdings. Not a real IBKR report.</p>`;
    },
    mount(el) {
      const onClick = (e) => {
        const r = e.target.closest("[data-range]");
        if (r) {
          analystRange = r.dataset.range;
          navigate("/analyst");
        }
        if (e.target.closest("[data-action='pick-account']")) openAccountPicker();
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function Statements() {
  return {
    nav: "account",
    render(params) {
      const tax = params.mode === "tax";
      const months = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: monthKey(d), label: monthLabel(monthKey(d)) });
      }
      const docs = tax
        ? [
            ["Form 1099", "Tax year 2025", "Ready"],
            ["Form 1042-S", "Withholding · 2025", "Ready"],
            ["Swiss tax report", "DA-1 supporting", "Ready"],
            ["Cost basis (FIFO)", "Open lots", "Ready"],
          ]
        : [
            ["Activity statement", months[0].label, "Ready"],
            ["Trade confirmations", "Last 30 days", "Ready"],
            ["Margin report", months[0].label, "Ready"],
            ["Interest details", months[0].label, "Ready"],
          ];
      return `${topbar({ left: "back", title: tax ? "Tax documents" : "Statements & reports" })}
      ${chips("mode", [{ id: "stmt", label: "Statements" }, { id: "tax", label: "Tax" }], tax ? "tax" : "stmt")}
      <div class="list card sec">${docs
        .map(([t, sub, st]) => `<button class="row" data-doc="${esc(t)}"><span class="row-icon">${I.doc()}</span><span class="row-main"><span class="row-title">${esc(t)}</span><span class="row-sub">${esc(sub)}</span></span><span class="pill pill-up">${st}</span>${I.chevR()}</button>`)
        .join("")}</div>
      ${
        tax
          ? ""
          : section(
              "Monthly activity",
              `<div class="list card">${months
                .map((m) => `<button class="row" data-doc="${m.key}"><span class="row-icon">${I.reports()}</span><span class="row-main"><span class="row-title">${esc(m.label)}</span><span class="row-sub">PDF · Activity statement</span></span>${I.download()}</button>`)
                .join("")}</div>`
            )
      }
      <p class="disclaimer">Documents are placeholders in this demo.</p>`;
    },
    mount(el) {
      const onClick = (e) => {
        const c = e.target.closest("[data-chips='mode'] button");
        if (c) {
          navigate(c.dataset.value === "tax" ? "/statements/tax" : "/statements", { replace: true });
          return;
        }
        if (e.target.closest("[data-doc]")) {
          import("../components/sheet.js").then(({ toast }) => toast("Opening PDF…"));
        }
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function Transactions() {
  return {
    nav: "account",
    render(params) {
      const accs = params.sym ? includedAccounts() : selectedAccounts();
      let list = transactionsFor(accs);
      if (params.sym) list = list.filter((t) => t.sym === params.sym);
      list = list.filter((t) => txMatchesFilter(t, txFilter)).slice(0, 80);
      const since = Date.now() - 365 * 86400000;
      const inc = incomeSummary(accs, since);
      const groups = new Map();
      for (const t of list) {
        const k = monthKey(t.t);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(t);
      }
      return `${topbar({
        left: "back",
        title: params.sym ? `${params.sym} activity` : "Transactions",
        right: `<button class="icon-btn" data-action="pick-account">${I.layers()}</button>`,
      })}
      <div class="stats3">
        ${stat("Dividends (12m)", money(inc.dividends, 0), "up")}
        ${stat("Interest", money(inc.interest, 0), signClass(inc.interest))}
        ${stat("Fees", money(inc.fees, 0), "down")}
      </div>
      ${chips("tx", TX_TYPES.map((t) => ({ id: t, label: t })), txFilter)}
      ${
        list.length
          ? [...groups.entries()]
              .map(
                ([k, rows]) =>
                  `<div class="group-head"><span>${esc(monthLabel(k))}</span><span>${rows.length}</span></div>
            <div class="list card">${rows
              .map((t) => {
                const acc = getAccount(t.accountId);
                return `<div class="row row--plain">
                  <span class="row-icon">${t.sym ? logo(t.sym, 34) : I.dollar()}</span>
                  <span class="row-main"><span class="row-title">${esc(t.desc)}</span><span class="row-sub">${fmtDateTime(t.t)} · ${esc(acc?.alias || t.accountId)} · ${esc(t.status)}</span></span>
                  <span class="row-val"><span class="${signClass(t.amount)}">${fmtMoneyAlways(t.amount, t.ccy)}</span></span>
                </div>`;
              })
              .join("")}</div>`
              )
              .join("")
          : empty("dollar", "No transactions", "Try another filter or account.")
      }`;
    },
    mount(el) {
      const onClick = (e) => {
        const c = e.target.closest("[data-chips='tx'] button");
        if (c) {
          txFilter = c.dataset.value;
          navigate(location.hash.slice(1));
        }
        if (e.target.closest("[data-action='pick-account']")) openAccountPicker();
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

export function AccountDetail() {
  return {
    nav: "account",
    render({ id }) {
      const acc = getAccount(id);
      if (!acc) return `${topbar({ left: "back", title: "Account" })}<div class="empty"><h3>Unknown account</h3></div>`;
      const s = accountSummary(acc);
      const on = state.includedAccounts.includes(id);
      return `${topbar({ left: "back", title: acc.alias, subtitle: acc.id })}
      <section class="card pad acc-summary">
        <span class="muted small">${acc.type} · ${acc.kind === "client" ? acc.relationship : "Private"} · opened ${fmtDate(acc.opened)}</span>
        <p class="port-value">${money(s.netLiq)}</p>
        <p class="${signClass(s.dayPnl)}">${signed(s.dayPnl)} (${fmtPct(s.dayPct)}) today</p>
        <div class="stats3">
          ${stat("Cash", money(s.cashUsd, 0), s.cashUsd < 0 ? "down" : "")}
          ${stat("Securities", money(s.secValue, 0))}
          ${stat("Buying power", money(s.buyingPower, 0))}
        </div>
      </section>
      <div class="list card sec">
        ${row({ icon: I.pie(), title: "Positions", sub: `${s.positions.length} holdings · ${compactMoney(s.secValue)}`, href: "/portfolio" })}
        ${row({ icon: I.dollar(), title: "Transactions", href: "/transactions" })}
        ${row({ icon: I.orders(), title: "Orders", href: "/orders" })}
        ${row({ icon: I.transfer(), title: "Transfer & Pay", href: "/transfer" })}
      </div>
      <div class="card pad kv-list sec">
        ${kv("Account ID", acc.id)}
        ${kv("Holder", esc(acc.holder))}
        ${kv("Base type", acc.type)}
        ${kv("In combined Home view", on ? "Yes" : "No")}
        ${kv("Unrealized P&L", signed(s.unreal), signClass(s.unreal))}
        ${kv("Excess liquidity", money(s.excessLiquidity))}
        ${kv("Initial margin", money(s.initMargin))}
        ${kv("Leverage", s.leverage.toFixed(2) + "x")}
      </div>
      <button class="btn btn-ghost btn-block" data-href="/account/manage">${on ? "Remove from combined view" : "Include in combined view"}</button>`;
    },
  };
}

void bellButton;
