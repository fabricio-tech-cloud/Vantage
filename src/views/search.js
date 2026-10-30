import { state, update } from "../state.js";
import { topbar, symbolRow, chips, section } from "../components/ui.js";
import { I } from "../components/icons.js";
import { openSheet } from "../components/sheet.js";
import { allQuotes, getQuote } from "../quotes.js";
import { TYPE_LABEL } from "../data/symbols.js";
import { esc } from "../util/dom.js";
import { navigate } from "../router.js";
import { applyLive } from "../components/live.js";
import { onTick } from "../quotes.js";

const CATS = [
  { id: "all", label: "All" },
  { id: "STK", label: "Stocks" },
  { id: "ETF", label: "ETFs" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "CASH", label: "Forex" },
  { id: "IND", label: "Indices" },
];

export function searchSymbols(query, cat = "all", limit = 30) {
  const q = query.trim().toLowerCase();
  let list = allQuotes();
  if (cat !== "all") list = list.filter((x) => x.type === cat);
  if (q) {
    list = list
      .map((x) => {
        const s = x.sym.toLowerCase();
        const n = x.name.toLowerCase();
        let score = 0;
        if (s === q) score = 100;
        else if (s.startsWith(q)) score = 80;
        else if (n.startsWith(q)) score = 60;
        else if (s.includes(q)) score = 40;
        else if (n.includes(q)) score = 30;
        return [score, x];
      })
      .filter(([s]) => s > 0)
      .sort((a, b) => b[0] - a[0] || b[1].mcap - a[1].mcap)
      .map(([, x]) => x);
  } else {
    list = [...list].sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
  }
  return list.slice(0, limit);
}

let cat = "all";
let query = "";

function resultsHtml() {
  const res = searchSymbols(query, cat);
  if (!res.length) return `<div class="empty">${I.search()}<h3>No results</h3><p>Try a different symbol or company name.</p></div>`;
  return `<div class="list card">${res.map((q) => symbolRow(q, { extra: `<span class="tag tag--type">${TYPE_LABEL[q.type]}</span>` })).join("")}</div>`;
}

export default {
  nav: "search",
  render() {
    const recent = state.recentSearches.map(getQuote).filter(Boolean);
    const trending = [...allQuotes()].filter((q) => q.type === "STK").sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct)).slice(0, 6);
    return `${topbar({
      left: "back",
      center: `<div class="search-box">${I.search()}<input type="search" class="search-input" placeholder="Search symbol, company, ETF…" value="${esc(query)}" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"/>${query ? `<button class="search-clear" data-action="clear">${I.close()}</button>` : ""}</div>`,
      right: "",
    })}
    ${chips("cat", CATS, cat)}
    <div data-results>
      ${
        query
          ? resultsHtml()
          : `${recent.length ? section("Recent", `<div class="list card">${recent.map((q) => symbolRow(q)).join("")}</div>`, { action: "Clear", actionHref: "/search?clear" }) : ""}
             ${section("Trending", `<div class="list card">${trending.map((q) => symbolRow(q)).join("")}</div>`)}
             ${section("Browse", `<div class="grid2 browse">${[
               ["Top gainers", "/markets/movers", "arrowUR"],
               ["Top losers", "/markets/movers", "arrowDR"],
               ["Indices", "/markets", "globe"],
               ["Forex", "/markets/forex", "convert"],
               ["Crypto", "/markets/crypto", "coins"],
               ["Sectors", "/markets/sectors", "grid"],
             ]
               .map(([l, h, i]) => `<button class="browse-card" data-href="${h}">${I[i]()}<span>${l}</span></button>`)
               .join("")}</div>`)}`
      }
    </div>`;
  },
  mount(el) {
    const input = el.querySelector(".search-input");
    setTimeout(() => input?.focus(), 120);
    const results = el.querySelector("[data-results]");
    const onInput = () => {
      query = input.value;
      results.innerHTML = query ? resultsHtml() : this.render().split('<div data-results>')[1].replace(/<\/div>\s*$/, "");
      el.querySelector(".search-clear")?.remove();
      if (query) input.insertAdjacentHTML("afterend", `<button class="search-clear" data-action="clear">${I.close()}</button>`);
    };
    input?.addEventListener("input", onInput);
    const onClick = (e) => {
      const c = e.target.closest("[data-chips='cat'] button");
      if (c) {
        cat = c.dataset.value;
        el.querySelectorAll("[data-chips='cat'] button").forEach((b) => b.classList.toggle("is-active", b === c));
        onInput();
        return;
      }
      if (e.target.closest("[data-action='clear']")) {
        input.value = "";
        onInput();
        input.focus();
        return;
      }
      const link = e.target.closest("[data-href]");
      if (link && link.dataset.href === "/search?clear") {
        e.stopPropagation();
        e.preventDefault();
        update((s) => (s.recentSearches = []), "search");
        return;
      }
      if (link && link.dataset.href.startsWith("/quote/")) {
        const sym = decodeURIComponent(link.dataset.href.slice(7));
        update((s) => {
          s.recentSearches = [sym, ...s.recentSearches.filter((x) => x !== sym)].slice(0, 8);
        }, "search");
      }
    };
    el.addEventListener("click", onClick, true);
    const unTick = onTick(() => applyLive(el));
    return () => {
      el.removeEventListener("click", onClick, true);
      unTick();
      query = "";
    };
  },
};

/** Symbol picker sheet used by watchlists, alerts, etc. */
export function openSymbolSearch({ title = "Search symbol", onPick, types = null }) {
  let q = "";
  const list = () => {
    let res = searchSymbols(q, "all", 25);
    if (types) res = res.filter((x) => types.includes(x.type));
    return `<div class="list">${res.map((x) => `<button class="row sym-row" data-pick="${esc(x.sym)}"><span class="row-main"><span class="row-title">${esc(x.sym)} <span class="tag tag--type">${TYPE_LABEL[x.type]}</span></span><span class="row-sub">${esc(x.name)}</span></span>${I.plus()}</button>`).join("")}</div>`;
  };
  openSheet({
    title,
    cls: "sheet--tall",
    html: `<div class="search-box search-box--sheet">${I.search()}<input type="search" class="search-input" placeholder="Symbol or company" autocomplete="off" autocapitalize="characters"/></div><div data-list>${list()}</div>`,
    onMount(body, close) {
      const inp = body.querySelector("input");
      setTimeout(() => inp.focus(), 250);
      inp.addEventListener("input", () => {
        q = inp.value;
        body.querySelector("[data-list]").innerHTML = list();
      });
      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pick]");
        if (b) {
          close();
          onPick?.(b.dataset.pick);
        }
      });
    },
  });
}

export { navigate };
