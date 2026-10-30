import { state, update, setIncluded, setIncludedMany, setIncludedExact, linkAccount, unlinkAccount, availableToLink, privateAccounts, clientAccounts, getAccounts, isAdmin } from "../state.js";
import { includedAccounts, accountSummary, aggregate, money, signed } from "../calc.js";
import { topbar, toggle, row, empty } from "../components/ui.js";
import { I } from "../components/icons.js";
import { actionSheet, confirmSheet, promptSheet, toast } from "../components/sheet.js";
import { fmtPct, signClass } from "../util/format.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";

function accRow(a, on) {
  const s = accountSummary(a);
  return `<div class="row acc-manage ${on ? "is-on" : ""}" data-id="${a.id}" data-href="/account/detail/${a.id}">
    <span class="row-icon ${a.kind === "client" ? "ico-client" : "ico-private"}">${a.kind === "client" ? I.users() : I.user()}</span>
    <span class="row-main">
      <span class="row-title">${esc(a.alias)}${a.kind === "client" ? ` <span class="tag">${esc(a.relationship || "Client")}</span>` : ""}</span>
      <span class="row-sub">${a.id} · ${a.type} · ${esc(a.holder)}</span>
    </span>
    <span class="row-val">
      <span>${money(s.netLiq)}</span>
      <span class="row-valsub ${signClass(s.dayPnl)}">${signed(s.dayPnl)} (${fmtPct(s.dayPct)})</span>
    </span>
    ${toggle("inc-" + a.id, on, `data-inc="${a.id}"`)}
  </div>`;
}

export default {
  nav: "account",
  render() {
    if (!isAdmin()) {
      return `${topbar({ left: "back", title: "Manage accounts" })}${empty("lock", "Admin only", "Sign in as Fabricio to manage client accounts.")}`;
    }
    const all = getAccounts();
    const priv = privateAccounts();
    const clients = clientAccounts();
    const advisor = clients;
    const inc = new Set(state.includedAccounts);
    const selected = includedAccounts();
    const agg = aggregate(selected);
    const allAgg = aggregate(all);
    const avail = availableToLink();
    const privOn = priv.filter((a) => inc.has(a.id)).length;
    const clientOn = clients.filter((a) => inc.has(a.id)).length;

    const group = (title, list, extra = "") =>
      list.length
        ? `<section class="sec">
            <div class="sec-head"><h2>${esc(title)} <small>${list.filter((a) => inc.has(a.id)).length}/${list.length}</small></h2>${extra}</div>
            <div class="list card">${list.map((a) => accRow(a, inc.has(a.id))).join("")}</div>
          </section>`
        : "";

    return `${topbar({
      left: "back",
      title: "Manage accounts",
      right: `<button class="icon-btn" data-action="more" aria-label="More">${I.more()}</button>`,
    })}
    <section class="card pad manage-hero">
      <span class="muted small">Home screen · combined net liquidation</span>
      <p class="port-value">${money(agg.netLiq)}</p>
      <p class="${signClass(agg.dayPnl)}">${signed(agg.dayPnl)} (${fmtPct(agg.dayPct)}) today</p>
      <div class="acc-split">
        <div>
          <span class="muted small">${I.user()} My accounts</span>
          <strong>${money(agg.privateNetLiq)}</strong>
          <small>${agg.privateCount} of ${priv.length} included</small>
        </div>
        <div>
          <span class="muted small">${I.users()} Client accounts</span>
          <strong>${agg.clientCount ? money(agg.clientNetLiq) : "—"}</strong>
          <small>${agg.clientCount} of ${clients.length} included</small>
        </div>
      </div>
      <p class="muted small manage-hint">Turn on client accounts to add their value to the combined total on Home, alongside your private accounts.</p>
    </section>

    <div class="preset-row">
      <button class="chip ${clientOn === 0 && privOn === priv.length ? "is-active" : ""}" data-preset="private">${I.user()} Private only</button>
      <button class="chip ${clientOn === clients.length && clients.length && privOn === priv.length ? "is-active" : ""}" data-preset="all">${I.layers()} All accounts</button>
      <button class="chip ${clientOn === clients.length && clients.length && privOn === 0 ? "is-active" : ""}" data-preset="clients">${I.users()} Clients only</button>
    </div>

    ${group("My accounts", priv, `<button class="link" data-kind="private" data-toggle-kind>${privOn === priv.length ? "Hide all" : "Include all"}</button>`)}
    ${group("Advisor clients", advisor, `<button class="link" data-kind="advisor" data-toggle-kind>${advisor.every((a) => inc.has(a.id)) && advisor.length ? "Hide all" : "Include all"}</button>`)}

    ${
      avail.length
        ? `<section class="sec">
            <div class="sec-head"><h2>Add client accounts</h2><span class="muted small">${avail.length} available</span></div>
            <p class="pad-x muted small">Link additional accounts. Client activity (logins & volume) is under Account → Client activity.</p>
            <div class="list card">${avail
              .map((a) => {
                const s = accountSummary(a);
                return `<button class="row" data-link="${a.id}">
                  <span class="row-icon ico-client">${I.users()}</span>
                  <span class="row-main"><span class="row-title">${esc(a.alias)} <span class="tag">${esc(a.relationship)}</span></span><span class="row-sub">${a.id} · ${a.type} · ${esc(a.holder)}</span></span>
                  <span class="row-val"><span>${money(s.netLiq)}</span><span class="row-valsub">Add</span></span>
                  ${I.plus()}
                </button>`;
              })
              .join("")}</div>
          </section>`
        : ""
    }

    <div class="list card sec">
      ${row({ icon: I.clock(), title: "Client activity", sub: "Logins, trades & volume per person", href: "/account/activity", cls: "row--accent" })}
      ${row({ icon: I.layers(), title: "Universe net liquidation", sub: "All accounts you can access, on or off", value: money(allAgg.netLiq), chevron: false })}
    </div>
    <p class="disclaimer">Included accounts drive Home, Portfolio, Orders and PortfolioAnalyst. Trading still happens in a single account you pick on the ticket.</p>`;
  },
  mount(el) {
    if (!isAdmin()) return;
    const byKind = (kind) => {
      if (kind === "private") return privateAccounts();
      return clientAccounts();
    };
    const onClick = async (e) => {
      const tgl = e.target.closest("[data-toggle-kind]");
      if (tgl) {
        const list = byKind(tgl.dataset.kind);
        const allOn = list.every((a) => state.includedAccounts.includes(a.id));
        setIncludedMany(
          list.map((a) => a.id),
          !allOn
        );
        return;
      }
      const preset = e.target.closest("[data-preset]");
      if (preset) {
        const priv = privateAccounts().map((a) => a.id);
        const cli = clientAccounts().map((a) => a.id);
        if (preset.dataset.preset === "private") setIncludedExact(priv);
        else if (preset.dataset.preset === "all") setIncludedExact([...priv, ...cli]);
        else setIncludedExact(cli.length ? cli : priv);
        return;
      }
      const link = e.target.closest("[data-link]");
      if (link) {
        const acc = availableToLink().find((a) => a.id === link.dataset.link);
        if (!acc) return;
        if (
          await confirmSheet({
            title: "Add client account",
            text: `Link ${acc.alias} (${acc.id}) and include it in your combined Home total?`,
            confirmLabel: "Add & include",
          })
        ) {
          linkAccount(acc);
          toast(`${acc.alias} added to combined view`, { type: "success" });
        }
        return;
      }
      const more = e.target.closest("[data-action='more']");
      if (more) {
        actionSheet({
          title: "Accounts",
          actions: [
            { label: "Rename an account", icon: "edit", onClick: () => renameOne() },
            {
              label: "Remove a linked account",
              icon: "trash",
              danger: true,
              onClick: () => removeLinked(),
            },
            { label: "Account details", icon: "info", onClick: () => navigate("/account") },
          ],
        });
      }
    };
    const onChange = (e) => {
      const inc = e.target.closest("[data-inc]");
      if (inc) {
        setIncluded(inc.dataset.inc, inc.checked);
      }
    };
    el.addEventListener("click", onClick);
    el.addEventListener("change", onChange);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("change", onChange);
    };
  },
};

async function renameOne() {
  const accs = getAccounts();
  actionSheet({
    title: "Rename account",
    actions: accs.map((a) => ({
      label: a.alias,
      sub: a.id,
      onClick: async () => {
        const name = await promptSheet({ title: "Account alias", label: "Display name", value: a.alias });
        if (name && name.trim()) update((s) => (s.aliases[a.id] = name.trim()), "accounts");
      },
    })),
  });
}

async function removeLinked() {
  const linked = state.linkedAccounts;
  if (!linked.length) return toast("No linked accounts to remove");
  actionSheet({
    title: "Remove linked account",
    actions: linked.map((a) => ({
      label: a.alias,
      sub: a.id,
      danger: true,
      onClick: async () => {
        if (await confirmSheet({ title: "Remove account", text: `Unlink ${a.alias}? It will no longer appear in your combined view.`, confirmLabel: "Remove", danger: true })) {
          unlinkAccount(a.id);
          toast("Account unlinked");
        }
      },
    })),
  });
}
