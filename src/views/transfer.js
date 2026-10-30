import { state, update, getAccount, getAccounts } from "../state.js";
import { includedAccounts, accountSummary, money } from "../calc.js";
import { BANKS } from "../data/accounts.js";
import { profileUser } from "../state.js";
import { topbar, row, section, field, select, kv } from "../components/ui.js";
import { I } from "../components/icons.js";
import { toast, confirmSheet } from "../components/sheet.js";
import { fxToUsd, convert } from "../quotes.js";
import { uid } from "../util/rng.js";
import { fmtMoneyAlways, fmtNum } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";

const CCYS = ["USD", "EUR", "CHF", "GBP"];

function defaultAcc() {
  const inc = includedAccounts();
  return (state.accountFilter !== "ALL" && inc.find((a) => a.id === state.accountFilter)) || inc.find((a) => a.kind === "private") || inc[0];
}

function accOpts() {
  return includedAccounts().map((a) => ({ id: a.id, label: `${a.alias} · ${a.id}` }));
}

function pushTx(accountId, type, desc, amount, ccy) {
  update((s) => {
    s.extraTransactions.unshift({
      id: "tx" + uid(),
      accountId,
      t: Date.now(),
      type,
      desc,
      amount,
      ccy,
      status: type === "Deposit" || type === "Withdrawal" ? "Pending" : "Settled",
    });
  }, "tx");
}

export function TransferHub() {
  return {
    nav: "account",
    render() {
      return `${topbar({ left: "back", title: "Transfer & Pay" })}
      ${section("Move funds", `<div class="list card">
        ${row({ icon: I.arrowDown(), title: "Deposit funds", sub: "Wire, ACH, SEPA", href: "/transfer/deposit" })}
        ${row({ icon: I.arrowUp(), title: "Withdraw funds", sub: "To a linked bank", href: "/transfer/withdraw" })}
        ${row({ icon: I.convert(), title: "Convert currency", sub: "IDEALPRO spot FX", href: "/transfer/convert" })}
      </div>`)}
      ${section("Other", `<div class="list card">
        ${row({ icon: I.swap(), title: "Transfer positions", sub: "ACATS / FOP from another broker", href: "/transfer/positions" })}
        ${row({ icon: I.bill(), title: "Pay bills", sub: "Bill Pay & recurring", href: "/transfer/bills" })}
        ${row({ icon: I.bank(), title: "Linked banks", sub: `${BANKS.length} institutions`, href: "/transfer/banks" })}
      </div>`)}`;
    },
  };
}

export function TransferForm(kind) {
  return {
    nav: "account",
    render() {
      const acc = defaultAcc();
      const s = acc ? accountSummary(acc) : null;
      const title = { deposit: "Deposit funds", withdraw: "Withdraw funds", convert: "Convert currency", positions: "Transfer positions", bills: "Pay bills", banks: "Linked banks" }[kind];
      if (kind === "banks") {
        return `${topbar({ left: "back", title })}
        <div class="list card sec">${BANKS.map((b) => `<div class="row row--plain"><span class="row-icon">${I.bank()}</span><span class="row-main"><span class="row-title">${esc(b.name)}</span><span class="row-sub">${esc(b.iban)} · ${b.ccy} · ${esc(b.type)}</span></span></div>`).join("")}</div>
        <p class="disclaimer">Bank details are masked in this demo.</p>`;
      }
      if (kind === "positions") {
        return `${topbar({ left: "back", title })}
        <div class="card pad sec">
          ${field("Delivering broker", `<input class="input" value="Schwab / Fidelity / other" />`)}
          ${field("Account number", `<input class="input" placeholder="Account at delivering firm" />`)}
          ${field("Receiving IBKR account", select("account", accOpts(), acc?.id))}
          ${field("Transfer type", select("type", [{ id: "ACATS", label: "ACATS (US)" }, { id: "FOP", label: "Free of payment" }, { id: "ATON", label: "ATON (Canada)" }], "ACATS"))}
          <button class="btn btn-primary btn-block" data-submit>Request transfer</button>
        </div>
        <p class="disclaimer">Position transfers typically settle in 3–5 business days. This demo records the request only.</p>`;
      }
      if (kind === "bills") {
        return `${topbar({ left: "back", title })}
        <div class="card pad sec">
          ${field("Pay from", select("account", accOpts(), acc?.id))}
          ${field("Payee", `<input class="input" placeholder="e.g. Swisscom, UBS credit card" />`)}
          ${field("Amount", `<input class="input mono" inputmode="decimal" name="amt" placeholder="0.00" />`)}
          ${field("Currency", select("ccy", CCYS.map((c) => ({ id: c, label: c })), "CHF"))}
          ${field("Memo", `<input class="input" placeholder="Optional" />`)}
          <button class="btn btn-primary btn-block" data-submit>Schedule payment</button>
        </div>`;
      }
      if (kind === "convert") {
        return `${topbar({ left: "back", title })}
        <div class="card pad sec">
          ${field("Account", select("account", accOpts(), acc?.id))}
          <div class="grid2">
            ${field("From", select("from", CCYS.map((c) => ({ id: c, label: c })), "EUR"))}
            ${field("To", select("to", CCYS.map((c) => ({ id: c, label: c })), "USD"))}
          </div>
          ${field("Amount (from)", `<input class="input mono" inputmode="decimal" name="amt" value="5000" />`)}
          <div class="ticket-summary" data-fx></div>
          <button class="btn btn-primary btn-block" data-submit>Convert</button>
        </div>
        <p class="disclaimer">Spot FX via IDEALPRO. Spread is simulated.</p>`;
      }
      const isIn = kind === "deposit";
      return `${topbar({ left: "back", title })}
      <div class="card pad sec">
        ${field("Account", select("account", accOpts(), acc?.id))}
        ${field("Bank", select("bank", BANKS.map((b) => ({ id: b.id, label: `${b.name} · ${b.ccy}` })), BANKS[0].id))}
        ${field("Amount", `<input class="input mono" inputmode="decimal" name="amt" placeholder="0.00" />`)}
        ${field("Currency", select("ccy", CCYS.map((c) => ({ id: c, label: c })), "USD"))}
        ${s ? `<div class="ticket-summary">${kv("Available cash", money(s.cashUsd))}${kv("Buying power", money(s.buyingPower))}</div>` : ""}
        <button class="btn btn-primary btn-block" data-submit>${isIn ? "Request deposit" : "Request withdrawal"}</button>
      </div>
      <p class="disclaimer">${isIn ? "Incoming wires typically post same day if received before the cutoff." : "Withdrawals to a linked bank usually arrive in 1–2 business days."} Demo only — ${esc(profileUser().name)}.</p>`;
    },
    mount(el) {
      const fxBox = el.querySelector("[data-fx]");
      const refreshFx = () => {
        if (!fxBox) return;
        const from = el.querySelector('[name="from"]')?.value || "EUR";
        const to = el.querySelector('[name="to"]')?.value || "USD";
        const amt = parseFloat(el.querySelector('[name="amt"]')?.value) || 0;
        const rate = convert(1, from, to);
        const out = amt * rate * 0.9994;
        fxBox.innerHTML = `${kv("Rate", `1 ${from} = ${fmtNum(rate, 5)} ${to}`)}${kv("You receive (est.)", fmtMoneyAlways(out, to))}${kv("Spread / comm.", fmtMoneyAlways(amt * rate * 0.0006, to))}`;
      };
      refreshFx();
      el.addEventListener("input", refreshFx);
      el.addEventListener("change", refreshFx);
      const onClick = async (e) => {
        if (!e.target.closest("[data-submit]")) return;
        const accountId = el.querySelector('[name="account"]')?.value || defaultAcc()?.id;
        const amt = parseFloat(el.querySelector('[name="amt"]')?.value);
        if (kind === "positions") {
          toast("Transfer request submitted", { type: "success" });
          navigate("/transactions");
          return;
        }
        if (kind === "bills") {
          const payee = el.querySelector('input[placeholder^="e.g."]')?.value || "Payee";
          const ccy = el.querySelector('[name="ccy"]')?.value || "CHF";
          if (!amt) return toast("Enter an amount", { type: "error" });
          if (!(await confirmSheet({ title: "Pay bill", text: `Pay ${fmtMoneyAlways(amt, ccy)} to ${payee}?`, confirmLabel: "Pay" }))) return;
          const acc = getAccount(accountId);
          if (acc) acc.cash[ccy] = (acc.cash[ccy] || 0) - amt;
          pushTx(accountId, "Withdrawal", `Bill pay · ${payee}`, -amt, ccy);
          toast("Payment scheduled", { type: "success" });
          navigate("/transactions");
          return;
        }
        if (kind === "convert") {
          const from = el.querySelector('[name="from"]').value;
          const to = el.querySelector('[name="to"]').value;
          if (!amt || from === to) return toast("Enter a valid conversion", { type: "error" });
          const out = amt * convert(1, from, to) * 0.9994;
          const acc = getAccounts().find((a) => a.id === accountId);
          if (acc) {
            acc.cash[from] = (acc.cash[from] || 0) - amt;
            acc.cash[to] = (acc.cash[to] || 0) + out;
            update(() => {}, "accounts");
          }
          pushTx(accountId, "FX Conversion", `Convert ${fmtNum(amt, 2)} ${from} → ${fmtNum(out, 2)} ${to}`, 0, to);
          toast(`Converted ${fmtMoneyAlways(amt, from)}`, { type: "success" });
          navigate("/account/detail/" + accountId);
          return;
        }
        const ccy = el.querySelector('[name="ccy"]')?.value || "USD";
        if (!amt || amt <= 0) return toast("Enter an amount", { type: "error" });
        const isIn = kind === "deposit";
        if (!isIn && !(await confirmSheet({ title: "Withdraw funds", text: `Withdraw ${fmtMoneyAlways(amt, ccy)} to your linked bank?`, confirmLabel: "Withdraw" }))) return;
        const acc = getAccounts().find((a) => a.id === accountId);
        if (acc) {
          acc.cash[ccy] = (acc.cash[ccy] || 0) + (isIn ? amt : -amt);
          update(() => {}, "accounts");
        }
        pushTx(accountId, isIn ? "Deposit" : "Withdrawal", `${isIn ? "Deposit" : "Withdrawal"} · ${BANKS.find((b) => b.id === el.querySelector('[name="bank"]')?.value)?.name || "Bank"}`, isIn ? amt : -amt, ccy);
        toast(isIn ? "Deposit requested" : "Withdrawal requested", { type: "success" });
        navigate("/transactions");
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
  };
}

void fxToUsd;
