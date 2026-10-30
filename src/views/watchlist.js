import { state, update } from "../state.js";
import { topbar, bellButton, empty } from "../components/ui.js";
import { I, logo } from "../components/icons.js";
import { actionSheet, promptSheet, confirmSheet, toast } from "../components/sheet.js";
import { applyLive } from "../components/live.js";
import { sparkline } from "../components/chart.js";
import { getQuote, onTick } from "../quotes.js";
import { symbolSeries } from "../calc.js";
import { openOrderTicket } from "../components/trade.js";
import { openSymbolSearch } from "./search.js";
import { fmtPrice, fmtPct, fmtSignedAlways, signClass, fmtCompact } from "../util/format.js";
import { esc, haptic } from "../util/dom.js";
import { navigate } from "../router.js";
import { uid } from "../util/rng.js";

let editMode = false;
let col = "pct"; // pct | chg | mcap | vol

const COLS = [
  { id: "pct", label: "Change %" },
  { id: "chg", label: "Change" },
  { id: "mcap", label: "Market cap" },
  { id: "vol", label: "Volume" },
];

function right(q) {
  switch (col) {
    case "chg":
      return `<span class="pill pill-${signClass(q.chg)}" data-live="chg:${esc(q.sym)}">${fmtSignedAlways(q.chg, q.ccy, q.price < 1 ? 4 : 2)}</span>`;
    case "mcap":
      return `<span class="pill pill-flat">${q.mcap ? fmtCompact(q.mcap) : "—"}</span>`;
    case "vol":
      return `<span class="pill pill-flat">${q.vol ? fmtCompact(q.vol) : "—"}</span>`;
    default:
      return `<span class="pill pill-${signClass(q.chgPct)}" data-live="pct:${esc(q.sym)}">${fmtPct(q.chgPct)}</span>`;
  }
}

export default {
  nav: "watchlist",
  render() {
    const wl = state.watchlists.find((w) => w.id === state.activeWatchlist) || state.watchlists[0];
    const rows = wl.symbols
      .map((s) => getQuote(s))
      .filter(Boolean)
      .map(
        (q, i) => `<div class="row sym-row wl-row ${editMode ? "editing" : ""}" data-sym="${esc(q.sym)}" data-i="${i}">
          ${editMode ? `<button class="wl-del" data-del="${esc(q.sym)}" aria-label="Remove">${I.minus()}</button>` : logo(q.sym, 38)}
          <span class="row-main"><span class="row-title">${esc(q.sym)}</span><span class="row-sub">${esc(q.name)}</span></span>
          ${editMode ? `<span class="wl-move"><button data-move="up" ${i === 0 ? "disabled" : ""}>${I.chevU()}</button><button data-move="down" ${i === wl.symbols.length - 1 ? "disabled" : ""}>${I.chevD()}</button></span>` : `<span class="spark-wrap">${sparkline(symbolSeries(q.sym, "1M"))}</span><span class="row-val"><span class="mono" data-live="price:${esc(q.sym)}">${fmtPrice(q.price, q.ccy)}</span>${right(q)}</span>`}
        </div>`
      )
      .join("");
    return `${topbar({
      left: `<h1 class="page-title">Watchlists</h1>`,
      center: "<span></span>",
      right: `<button class="icon-btn" data-href="/search" aria-label="Search">${I.search()}</button>${bellButton()}<button class="icon-btn" data-action="lists" aria-label="Manage lists">${I.more()}</button>`,
    })}
    <div class="hscroll wl-tabs">${state.watchlists.map((w) => `<button class="wl-tab ${w.id === wl.id ? "is-active" : ""}" data-wl="${w.id}">${esc(w.name)}<small>${w.symbols.length}</small></button>`).join("")}<button class="wl-tab wl-tab--add" data-action="new-list">${I.plus()} New</button></div>
    <div class="toolbar">
      <button class="tb-btn" data-action="col">${I.filter()} ${COLS.find((c) => c.id === col).label}</button>
      <span class="spacer"></span>
      <button class="tb-btn" data-action="add">${I.plus()} Add symbol</button>
      <button class="tb-btn ${editMode ? "alt" : ""}" data-action="edit">${editMode ? "Done" : "Edit"}</button>
    </div>
    ${rows ? `<div class="list card">${rows}</div>` : empty("star", "Watchlist is empty", "Add symbols to track prices and news.", `<button class="btn btn-primary" data-action="add">Add symbol</button>`)}`;
  },
  mount(el) {
    const wl = () => state.watchlists.find((w) => w.id === state.activeWatchlist) || state.watchlists[0];
    const onClick = async (e) => {
      const tab = e.target.closest("[data-wl]");
      if (tab) {
        update((s) => (s.activeWatchlist = tab.dataset.wl), "wl");
        return;
      }
      const del = e.target.closest("[data-del]");
      if (del) {
        haptic();
        update((s) => {
          const w = s.watchlists.find((x) => x.id === wl().id);
          w.symbols = w.symbols.filter((x) => x !== del.dataset.del);
        }, "wl");
        return;
      }
      const mv = e.target.closest("[data-move]");
      if (mv) {
        const row = mv.closest("[data-i]");
        const i = Number(row.dataset.i);
        const j = mv.dataset.move === "up" ? i - 1 : i + 1;
        update((s) => {
          const w = s.watchlists.find((x) => x.id === wl().id);
          [w.symbols[i], w.symbols[j]] = [w.symbols[j], w.symbols[i]];
        }, "wl");
        return;
      }
      const row = e.target.closest("[data-sym]");
      if (row && !editMode) {
        navigate("/quote/" + encodeURIComponent(row.dataset.sym));
        return;
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      switch (a.dataset.action) {
        case "edit":
          editMode = !editMode;
          navigate("/watchlist");
          break;
        case "col":
          actionSheet({ title: "Column", actions: COLS.map((c) => ({ label: c.label, icon: c.id === col ? "check" : undefined, onClick: () => ((col = c.id), navigate("/watchlist")) })) });
          break;
        case "add":
          openSymbolSearch({
            title: "Add to " + wl().name,
            onPick(sym) {
              update((s) => {
                const w = s.watchlists.find((x) => x.id === wl().id);
                if (!w.symbols.includes(sym)) w.symbols.push(sym);
              }, "wl");
              toast(`${sym} added to ${wl().name}`, { type: "success" });
            },
          });
          break;
        case "new-list": {
          const name = await promptSheet({ title: "New watchlist", label: "Name", placeholder: "e.g. Growth", confirmLabel: "Create" });
          if (name && name.trim()) {
            const id = "wl" + uid();
            update((s) => {
              s.watchlists.push({ id, name: name.trim(), symbols: [] });
              s.activeWatchlist = id;
            }, "wl");
          }
          break;
        }
        case "lists":
          actionSheet({
            title: wl().name,
            actions: [
              {
                label: "Rename watchlist",
                icon: "edit",
                onClick: async () => {
                  const name = await promptSheet({ title: "Rename watchlist", label: "Name", value: wl().name });
                  if (name && name.trim()) update((s) => (s.watchlists.find((x) => x.id === wl().id).name = name.trim()), "wl");
                },
              },
              {
                label: "Delete watchlist",
                icon: "trash",
                danger: true,
                onClick: async () => {
                  if (state.watchlists.length <= 1) return toast("You need at least one watchlist", { type: "error" });
                  if (await confirmSheet({ title: "Delete watchlist", text: `Delete "${wl().name}" and its ${wl().symbols.length} symbols?`, confirmLabel: "Delete", danger: true }))
                    update((s) => {
                      s.watchlists = s.watchlists.filter((x) => x.id !== wl().id);
                      s.activeWatchlist = s.watchlists[0].id;
                    }, "wl");
                },
              },
            ],
          });
          break;
      }
    };
    el.addEventListener("click", onClick);
    const unTick = onTick(() => applyLive(el));
    return () => {
      el.removeEventListener("click", onClick);
      unTick();
    };
  },
};

function openRowActions(sym) {
  actionSheet({
    title: sym,
    actions: [
      { label: "Quote & chart", icon: "chart", onClick: () => navigate("/quote/" + encodeURIComponent(sym)) },
      { label: "Buy", icon: "arrowUR", onClick: () => openOrderTicket({ sym, side: "BUY" }) },
      { label: "Sell", icon: "arrowDR", onClick: () => openOrderTicket({ sym, side: "SELL" }) },
      { label: "Set price alert", icon: "bellPlus", onClick: () => navigate("/alerts/new/" + encodeURIComponent(sym)) },
      { label: "News", icon: "news", onClick: () => navigate("/news/sym/" + encodeURIComponent(sym)) },
      {
        label: "Remove from watchlist",
        icon: "trash",
        danger: true,
        onClick: () =>
          update((s) => {
            const w = s.watchlists.find((x) => x.id === s.activeWatchlist);
            w.symbols = w.symbols.filter((x) => x !== sym);
          }, "wl"),
      },
    ],
  });
}

export function toggleInWatchlist(sym, wlId = state.activeWatchlist) {
  let added = false;
  update((s) => {
    const w = s.watchlists.find((x) => x.id === wlId) || s.watchlists[0];
    if (w.symbols.includes(sym)) w.symbols = w.symbols.filter((x) => x !== sym);
    else {
      w.symbols.push(sym);
      added = true;
    }
  }, "wl");
  return added;
}
export const inAnyWatchlist = (sym) => state.watchlists.some((w) => w.symbols.includes(sym));
