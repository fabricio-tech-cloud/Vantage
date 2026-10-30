// Generated headlines and AI summaries.
import { rngFor, pick } from "../util/rng.js";
import { SYMBOLS } from "./symbols.js";

const SOURCES = ["Reuters", "Bloomberg", "Dow Jones", "Benzinga", "MarketWatch", "Financial Times", "WSJ", "CNBC", "Seeking Alpha", "Barron's"];

const TEMPLATES = {
  up: [
    "{name} shares rise as analysts lift price targets ahead of earnings",
    "{sym} gains after upbeat guidance; Street sees upside into year-end",
    "{name} climbs on strong demand signals in {sector}",
    "Options traders position for further upside in {sym}",
    "{name} hits fresh high as momentum investors pile in",
  ],
  down: [
    "{name} slips as investors lock in gains after recent rally",
    "{sym} falls after cautious commentary from management",
    "{name} drops amid broader weakness in {sector} names",
    "Analyst downgrades weigh on {sym} shares",
    "{name} retreats as rates move higher; valuation concerns resurface",
  ],
  neutral: [
    "What to watch when {name} reports results next week",
    "{sym}: three things investors should know this week",
    "{name} announces leadership changes in key division",
    "Institutional ownership in {sym} rises for third straight quarter",
    "{name} expands partnership in {sector}; terms undisclosed",
  ],
};

const MARKET = [
  ["S&P 500 edges higher as mega-cap tech leads; Fed decision in focus", "Markets"],
  ["Treasury yields dip after softer inflation print; 10-year at 4.02%", "Rates"],
  ["Dollar steadies ahead of payrolls; euro holds above 1.16", "FX"],
  ["Oil rises 1.5% on inventory draw; Brent back above $68", "Commodities"],
  ["Bitcoin reclaims $110k as ETF inflows accelerate", "Crypto"],
  ["European stocks close mixed; DAX lags on autos", "Europe"],
  ["Gold extends record run as central banks keep buying", "Commodities"],
  ["Nikkei tops 49,000 on yen weakness and chip rally", "Asia"],
  ["Earnings season tracker: 78% of S&P 500 companies beat estimates so far", "Earnings"],
  ["Fed's Williams: policy 'well positioned' as inflation cools", "Fed"],
  ["Small caps lag as rate-sensitive sectors wobble", "Markets"],
  ["Semiconductor index hits all-time high on AI capex guidance", "Tech"],
];

let cache = null;
export function allNews() {
  if (cache) return cache;
  const r = rngFor("news");
  const now = Date.now();
  const out = [];
  let id = 0;
  for (const s of SYMBOLS.filter((x) => x.type === "STK" || x.type === "ETF" || x.type === "CRYPTO")) {
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const mood = s.chgPct > 0.5 ? (r() < 0.7 ? "up" : "neutral") : s.chgPct < -0.5 ? (r() < 0.7 ? "down" : "neutral") : "neutral";
      const title = pick(r, TEMPLATES[mood]).replace("{name}", s.name.replace(/ (Inc\.|Corp\.|Co\.|SE|AG|NV ADR|Class [AB]|Trust|ETF.*)$/g, "")).replace("{sym}", s.sym).replace("{sector}", s.sector.toLowerCase());
      out.push({ id: "n" + id++, t: now - r() * 60 * 3600000, source: pick(r, SOURCES), title, syms: [s.sym], mood });
    }
  }
  for (const [title, tag] of MARKET) out.push({ id: "n" + id++, t: now - r() * 36 * 3600000, source: pick(r, SOURCES), title, syms: [], tag, mood: "neutral" });
  out.sort((a, b) => b.t - a.t);
  cache = out;
  return out;
}

export function newsFor(syms, limit = 20) {
  const set = new Set(syms);
  return allNews().filter((n) => n.syms.some((s) => set.has(s))).slice(0, limit);
}

export function aiSummary(sym) {
  const s = SYMBOLS.find((x) => x.sym === sym);
  if (!s) return [];
  const r = rngFor("ai:" + sym);
  const short = s.name.replace(/ (Inc\.|Corp\.|Co\.|SE|AG|NV ADR|Class [AB]|Trust)$/g, "");
  const dir = s.chgPct >= 0 ? "higher" : "lower";
  const bullets = [
    `${short} is trading ${dir} today (${s.chgPct >= 0 ? "+" : ""}${s.chgPct.toFixed(2)}%) ${pick(r, ["on above-average volume", "in line with sector peers", "after a volatile open", "with options activity elevated"])}.`,
    pick(r, [
      `Next catalyst: quarterly results ${pick(r, ["next week", "in two weeks", "early next month"])}; consensus EPS ${s.eps ? (s.eps / 4).toFixed(2) : "1.10"} ${s.ccy}.`,
      `Analysts' average 12-month price target implies ${(8 + r() * 18).toFixed(0)}% upside; ${Math.round(55 + r() * 35)}% rate the stock Buy.`,
      `Institutional flows were net ${pick(r, ["positive", "negative"])} over the past month according to 13F filings.`,
    ]),
    pick(r, [
      `Key risks flagged by analysts: ${pick(r, ["valuation", "margin pressure", "regulatory scrutiny", "FX headwinds", "slowing end-market demand"])} and ${pick(r, ["rising rates", "competition", "supply constraints", "execution on new products"])}.`,
      `The stock trades at ${s.pe ? s.pe.toFixed(1) : "n/a"}x trailing earnings versus a 5-year average of ${s.pe ? (s.pe * (0.75 + r() * 0.3)).toFixed(1) : "n/a"}x.`,
      `Short interest sits at ${(0.8 + r() * 3).toFixed(1)}% of float, ${pick(r, ["down", "up"])} from last month.`,
    ]),
  ];
  return bullets;
}

export function articleBody(n) {
  const r = rngFor("art:" + n.id);
  const sym = n.syms[0];
  const s = SYMBOLS.find((x) => x.sym === sym);
  const subject = s ? s.name : "Markets";
  return [
    `${subject} ${pick(r, ["was in focus on", "drew attention from traders on", "remained a talking point across trading desks on"])} ${new Date(n.t).toLocaleDateString("en-US", { weekday: "long" })} as ${pick(r, ["investors digested the latest macro data", "positioning ahead of central bank decisions shifted", "earnings season moved into its busiest week"])}.`,
    pick(r, [
      "Strategists noted that breadth has improved in recent sessions, although leadership remains concentrated in a handful of large-cap names.",
      "Volumes were roughly in line with the 30-day average, with options markets pricing a move of about 4% around the next earnings release.",
      "Sell-side commentary was mixed: several brokers reiterated their ratings while trimming near-term estimates to reflect currency effects.",
    ]),
    pick(r, [
      "Looking ahead, the market's attention turns to Thursday's inflation print and the subsequent policy signal from the Federal Reserve.",
      "Management is scheduled to present at an industry conference next week, which could provide updated commentary on demand trends.",
      "Technicians point to support near the 50-day moving average, with resistance at the recent highs.",
    ]),
  ];
}
