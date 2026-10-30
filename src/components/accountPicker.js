import { openSheet } from "./sheet.js";
import { I } from "./icons.js";
import { state, update } from "../state.js";
import { includedAccounts, accountSummary, aggregate, money, signed } from "../calc.js";
import { fmtPct, signClass } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";

export function accountFilterLabel() {
  const inc = includedAccounts();
  if (state.accountFilter === "ALL") return `All accounts (${inc.length})`;
  const a = inc.find((x) => x.id === state.accountFilter);
  return a ? a.alias : "All accounts";
}

export function openAccountPicker() {
  const inc = includedAccounts();
  const agg = aggregate(inc);
  const rows = inc
    .map((a) => {
      const s = accountSummary(a);
      return `<button class="row acc-row ${state.accountFilter === a.id ? "is-selected" : ""}" data-acc="${a.id}">
        <span class="row-icon ${a.kind === "client" ? "ico-client" : "ico-private"}">${a.kind === "client" ? I.users() : I.user()}</span>
        <span class="row-main"><span class="row-title">${esc(a.alias)} ${a.kind === "client" ? '<span class="tag">Client</span>' : ""}</span><span class="row-sub">${a.id} · ${a.type}</span></span>
        <span class="row-val"><span>${money(s.netLiq)}</span><span class="row-valsub ${signClass(s.dayPnl)}">${signed(s.dayPnl)} (${fmtPct(s.dayPct)})</span></span>
        <span class="row-chev">${state.accountFilter === a.id ? I.check() : ""}</span>
      </button>`;
    })
    .join("");
  openSheet({
    title: "Select account",
    html: `<div class="list">
      <button class="row acc-row ${state.accountFilter === "ALL" ? "is-selected" : ""}" data-acc="ALL">
        <span class="row-icon ico-all">${I.layers()}</span>
        <span class="row-main"><span class="row-title">All accounts</span><span class="row-sub">${inc.length} accounts · combined view</span></span>
        <span class="row-val"><span>${money(agg.netLiq)}</span><span class="row-valsub ${signClass(agg.dayPnl)}">${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)})</span></span>
        <span class="row-chev">${state.accountFilter === "ALL" ? I.check() : ""}</span>
      </button>
      ${rows}
    </div>
    <button class="btn btn-ghost btn-block" data-manage>${I.settings()} Manage accounts</button>`,
    onMount(body, close) {
      body.addEventListener("click", (e) => {
        const r = e.target.closest("[data-acc]");
        if (r) {
          update((s) => (s.accountFilter = r.dataset.acc), "filter");
          close();
          return;
        }
        if (e.target.closest("[data-manage]")) {
          close();
          navigate("/account/manage");
        }
      });
    },
  });
}
