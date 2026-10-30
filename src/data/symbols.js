// Symbol universe for the demo. Prices are indicative only.
// type: STK | ETF | CRYPTO | IND | CASH (forex)
function S(sym, name, exch, ccy, type, sector, price, chgPct, o = {}) {
  return { sym, name, exch, ccy, type, sector, price, chgPct, ...o };
}

export const SYMBOLS = [
  // ---- US equities
  S("AAPL", "Apple Inc.", "NASDAQ", "USD", "STK", "Technology", 247.32, 0.84, { mcap: 3.72e12, pe: 33.4, eps: 7.41, div: 0.42, hi52: 260.1, lo52: 169.21, beta: 1.21, bg: "#1d1d1f", fg: "#fff", t: "A", desc: "Apple designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories, and sells a variety of related services." }),
  S("MSFT", "Microsoft Corp.", "NASDAQ", "USD", "STK", "Technology", 512.18, -0.36, { mcap: 3.81e12, pe: 36.8, eps: 13.92, div: 0.65, hi52: 555.45, lo52: 344.79, beta: 0.92, bg: "#0b5fb2", fg: "#fff", t: "M", desc: "Microsoft develops and supports software, services, devices and solutions, including Azure cloud, Microsoft 365 and LinkedIn." }),
  S("AMZN", "Amazon.com Inc.", "NASDAQ", "USD", "STK", "Consumer Cyclical", 231.44, 1.42, { mcap: 2.46e12, pe: 36.1, eps: 6.41, div: 0, hi52: 242.52, lo52: 161.38, beta: 1.31, bg: "#232f3e", fg: "#ff9900", t: "a", desc: "Amazon engages in retail sale of consumer products, advertising and subscription services, and provides cloud services through AWS." }),
  S("META", "Meta Platforms Inc.", "NASDAQ", "USD", "STK", "Communication", 742.9, -1.12, { mcap: 1.88e12, pe: 27.9, eps: 26.6, div: 0.28, hi52: 796.25, lo52: 479.8, beta: 1.24, bg: "#0866ff", fg: "#fff", t: "∞" }),
  S("GOOGL", "Alphabet Inc. Class A", "NASDAQ", "USD", "STK", "Communication", 196.52, 0.58, { mcap: 2.39e12, pe: 21.9, eps: 8.97, div: 0.41, hi52: 207.05, lo52: 140.53, beta: 1.03, bg: "#fff", fg: "#4285f4", t: "G" }),
  S("NVDA", "NVIDIA Corp.", "NASDAQ", "USD", "STK", "Technology", 184.21, 2.31, { mcap: 4.49e12, pe: 52.3, eps: 3.52, div: 0.02, hi52: 195.62, lo52: 86.62, beta: 2.12, bg: "#76b900", fg: "#000", t: "N" }),
  S("TSLA", "Tesla Inc.", "NASDAQ", "USD", "STK", "Consumer Cyclical", 428.6, -2.64, { mcap: 1.38e12, pe: 248.4, eps: 1.73, div: 0, hi52: 488.54, lo52: 214.25, beta: 2.33, bg: "#cc0000", fg: "#fff", t: "T" }),
  S("ASML", "ASML Holding NV ADR", "NASDAQ", "USD", "STK", "Technology", 962.4, 1.86, { mcap: 3.78e11, pe: 38.2, eps: 25.2, div: 0.84, hi52: 1012.8, lo52: 578.51, beta: 1.33, bg: "#0f238c", fg: "#fff", t: "AS" }),
  S("NKE", "Nike Inc. Class B", "NYSE", "USD", "STK", "Consumer Cyclical", 68.12, -0.47, { mcap: 1.01e11, pe: 34.5, eps: 1.97, div: 2.35, hi52: 82.94, lo52: 52.28, beta: 1.08, bg: "#111", fg: "#fff", t: "✓" }),
  S("JPM", "JPMorgan Chase & Co.", "NYSE", "USD", "STK", "Financial", 298.47, 0.22, { mcap: 8.3e11, pe: 15.1, eps: 19.76, div: 1.88, hi52: 312.4, lo52: 202.16, beta: 1.1, bg: "#5a3e1b", fg: "#fff", t: "JP" }),
  S("V", "Visa Inc. Class A", "NYSE", "USD", "STK", "Financial", 341.2, 0.14, { mcap: 6.6e11, pe: 31.2, eps: 10.93, div: 0.69, hi52: 375.51, lo52: 275.3, beta: 0.95, bg: "#1a1f71", fg: "#f7b600", t: "V" }),
  S("BRK B", "Berkshire Hathaway Class B", "NYSE", "USD", "STK", "Financial", 478.33, 0.31, { mcap: 1.03e12, pe: 12.8, eps: 37.4, div: 0, hi52: 542.07, lo52: 415.28, beta: 0.78, bg: "#4b0f1a", fg: "#fff", t: "B" }),
  S("JNJ", "Johnson & Johnson", "NYSE", "USD", "STK", "Healthcare", 185.9, 0.66, { mcap: 4.47e11, pe: 18.2, eps: 10.21, div: 2.8, hi52: 191.1, lo52: 140.68, beta: 0.52, bg: "#d51900", fg: "#fff", t: "J" }),
  S("PG", "Procter & Gamble Co.", "NYSE", "USD", "STK", "Consumer Defensive", 156.24, -0.21, { mcap: 3.66e11, pe: 23.5, eps: 6.65, div: 2.72, hi52: 180.43, lo52: 149.2, beta: 0.41, bg: "#003da5", fg: "#fff", t: "PG" }),
  S("KO", "Coca-Cola Co.", "NYSE", "USD", "STK", "Consumer Defensive", 68.44, 0.09, { mcap: 2.94e11, pe: 23.7, eps: 2.89, div: 2.98, hi52: 74.38, lo52: 60.62, beta: 0.46, bg: "#f40009", fg: "#fff", t: "KO" }),
  S("XOM", "Exxon Mobil Corp.", "NYSE", "USD", "STK", "Energy", 112.73, 1.05, { mcap: 4.85e11, pe: 15.6, eps: 7.23, div: 3.51, hi52: 126.34, lo52: 97.8, beta: 0.63, bg: "#ed1b2e", fg: "#fff", t: "X" }),
  S("CVX", "Chevron Corp.", "NYSE", "USD", "STK", "Energy", 158.61, 0.74, { mcap: 2.8e11, pe: 20.1, eps: 7.89, div: 4.3, hi52: 168.96, lo52: 132.04, beta: 0.78, bg: "#0054a4", fg: "#fff", t: "CV" }),
  S("PFE", "Pfizer Inc.", "NYSE", "USD", "STK", "Healthcare", 24.88, -0.8, { mcap: 1.41e11, pe: 13.1, eps: 1.9, div: 6.9, hi52: 29.3, lo52: 20.92, beta: 0.56, bg: "#0093d0", fg: "#fff", t: "P" }),
  S("DIS", "Walt Disney Co.", "NYSE", "USD", "STK", "Communication", 112.42, 0.37, { mcap: 2.03e11, pe: 17.8, eps: 6.31, div: 0.89, hi52: 124.69, lo52: 80.1, beta: 1.34, bg: "#113ccf", fg: "#fff", t: "D" }),
  S("NFLX", "Netflix Inc.", "NASDAQ", "USD", "STK", "Communication", 1189.55, -0.92, { mcap: 5.06e11, pe: 45.7, eps: 26.03, div: 0, hi52: 1341.15, lo52: 821.0, beta: 1.42, bg: "#e50914", fg: "#fff", t: "N" }),
  S("AMD", "Advanced Micro Devices", "NASDAQ", "USD", "STK", "Technology", 232.17, 3.12, { mcap: 3.77e11, pe: 118.4, eps: 1.96, div: 0, hi52: 244.0, lo52: 76.48, beta: 1.95, bg: "#000", fg: "#fff", t: "AMD" }),
  S("INTC", "Intel Corp.", "NASDAQ", "USD", "STK", "Technology", 37.42, 1.19, { mcap: 1.63e11, pe: 0, eps: -4.38, div: 0, hi52: 42.48, lo52: 17.67, beta: 1.12, bg: "#0071c5", fg: "#fff", t: "i" }),
  S("CRM", "Salesforce Inc.", "NYSE", "USD", "STK", "Technology", 258.03, -0.55, { mcap: 2.47e11, pe: 38.9, eps: 6.63, div: 0.64, hi52: 369.0, lo52: 226.48, beta: 1.29, bg: "#00a1e0", fg: "#fff", t: "CRM" }),
  S("ORCL", "Oracle Corp.", "NYSE", "USD", "STK", "Technology", 282.64, 1.74, { mcap: 7.94e11, pe: 64.2, eps: 4.4, div: 0.71, hi52: 345.72, lo52: 118.86, beta: 1.21, bg: "#c74634", fg: "#fff", t: "O" }),
  S("PLTR", "Palantir Technologies", "NASDAQ", "USD", "STK", "Technology", 171.84, 4.05, { mcap: 4.06e11, pe: 520.7, eps: 0.33, div: 0, hi52: 190.0, lo52: 66.12, beta: 2.6, bg: "#101113", fg: "#fff", t: "PL" }),
  S("COST", "Costco Wholesale Corp.", "NASDAQ", "USD", "STK", "Consumer Defensive", 924.37, 0.18, { mcap: 4.1e11, pe: 51.6, eps: 17.91, div: 0.56, hi52: 1078.23, lo52: 860.3, beta: 0.88, bg: "#e31837", fg: "#fff", t: "C" }),
  S("WMT", "Walmart Inc.", "NYSE", "USD", "STK", "Consumer Defensive", 102.84, 0.43, { mcap: 8.2e11, pe: 40.1, eps: 2.56, div: 0.91, hi52: 109.44, lo52: 78.98, beta: 0.68, bg: "#0071ce", fg: "#ffc220", t: "W" }),
  S("UNH", "UnitedHealth Group Inc.", "NYSE", "USD", "STK", "Healthcare", 352.08, -1.37, { mcap: 3.19e11, pe: 14.6, eps: 24.12, div: 2.52, hi52: 630.73, lo52: 234.6, beta: 0.49, bg: "#002677", fg: "#fff", t: "UNH" }),
  S("LLY", "Eli Lilly and Co.", "NYSE", "USD", "STK", "Healthcare", 801.22, 0.95, { mcap: 7.6e11, pe: 51.2, eps: 15.65, div: 0.75, hi52: 972.53, lo52: 623.78, beta: 0.44, bg: "#d52b1e", fg: "#fff", t: "Lilly" }),
  S("MCD", "McDonald's Corp.", "NYSE", "USD", "STK", "Consumer Cyclical", 301.56, 0.27, { mcap: 2.15e11, pe: 25.9, eps: 11.64, div: 2.36, hi52: 326.32, lo52: 276.53, beta: 0.63, bg: "#ffc72c", fg: "#da291c", t: "M" }),
  // ---- European equities
  S("SAP", "SAP SE", "IBIS", "EUR", "STK", "Technology", 228.4, -0.68, { mcap: 2.66e11, pe: 42.1, eps: 5.42, div: 1.02, hi52: 283.5, lo52: 186.2, beta: 1.05, bg: "#0faaff", fg: "#fff", t: "SAP" }),
  S("SIE", "Siemens AG", "IBIS", "EUR", "STK", "Industrials", 232.9, 0.52, { mcap: 1.85e11, pe: 21.4, eps: 10.88, div: 2.23, hi52: 244.85, lo52: 163.6, beta: 1.12, bg: "#009999", fg: "#fff", t: "SIE" }),
  S("ALV", "Allianz SE", "IBIS", "EUR", "STK", "Financial", 342.3, 0.31, { mcap: 1.32e11, pe: 12.7, eps: 26.9, div: 4.5, hi52: 379.8, lo52: 281.4, beta: 0.88, bg: "#003781", fg: "#fff", t: "ALV" }),
  S("BMW", "Bayerische Motoren Werke AG", "IBIS", "EUR", "STK", "Consumer Cyclical", 86.42, -1.23, { mcap: 5.3e10, pe: 8.2, eps: 10.54, div: 5.0, hi52: 92.5, lo52: 62.74, beta: 1.21, bg: "#1c69d4", fg: "#fff", t: "BMW" }),
  S("MBG", "Mercedes-Benz Group AG", "IBIS", "EUR", "STK", "Consumer Cyclical", 55.21, -0.94, { mcap: 5.4e10, pe: 7.1, eps: 7.77, div: 7.8, hi52: 63.42, lo52: 44.58, beta: 1.3, bg: "#222", fg: "#fff", t: "MB" }),
  S("NESN", "Nestlé SA", "EBS", "CHF", "STK", "Consumer Defensive", 78.52, 0.38, { mcap: 2.04e11, pe: 18.4, eps: 4.27, div: 3.9, hi52: 91.72, lo52: 69.8, beta: 0.38, bg: "#63513d", fg: "#fff", t: "N" }),
  S("NOVN", "Novartis AG", "EBS", "CHF", "STK", "Healthcare", 101.34, 0.57, { mcap: 2.1e11, pe: 16.9, eps: 6.0, div: 3.5, hi52: 106.2, lo52: 84.6, beta: 0.46, bg: "#0460a9", fg: "#fff", t: "NO" }),
  // ---- ETFs
  S("SPY", "SPDR S&P 500 ETF Trust", "ARCA", "USD", "ETF", "Equity ETF", 684.52, 0.41, { mcap: 6.8e11, pe: 24.1, div: 1.12, hi52: 692.3, lo52: 481.8, beta: 1.0, bg: "#0f5132", fg: "#fff", t: "SPY" }),
  S("QQQ", "Invesco QQQ Trust", "NASDAQ", "USD", "ETF", "Equity ETF", 612.84, 0.73, { mcap: 3.6e11, pe: 31.5, div: 0.52, hi52: 622.0, lo52: 402.39, beta: 1.15, bg: "#0b2f6b", fg: "#fff", t: "QQQ" }),
  S("VTI", "Vanguard Total Stock Market ETF", "ARCA", "USD", "ETF", "Equity ETF", 332.11, 0.39, { mcap: 5.1e11, pe: 23.4, div: 1.2, hi52: 336.9, lo52: 236.42, beta: 1.02, bg: "#96151d", fg: "#fff", t: "V" }),
  S("VOO", "Vanguard S&P 500 ETF", "ARCA", "USD", "ETF", "Equity ETF", 629.47, 0.41, { mcap: 7.2e11, pe: 24.1, div: 1.15, hi52: 636.1, lo52: 442.8, beta: 1.0, bg: "#96151d", fg: "#fff", t: "V" }),
  S("IWM", "iShares Russell 2000 ETF", "ARCA", "USD", "ETF", "Equity ETF", 246.9, -0.27, { mcap: 7.1e10, pe: 17.8, div: 1.05, hi52: 251.2, lo52: 171.73, beta: 1.2, bg: "#000", fg: "#fff", t: "IWM" }),
  S("VWCE", "Vanguard FTSE All-World UCITS ETF", "IBIS", "EUR", "ETF", "Equity ETF", 142.36, 0.29, { mcap: 2.1e10, pe: 20.6, div: 0, hi52: 146.8, lo52: 108.9, beta: 0.95, bg: "#96151d", fg: "#fff", t: "VW" }),
  S("TLT", "iShares 20+ Year Treasury Bond ETF", "NASDAQ", "USD", "ETF", "Fixed Income", 90.12, 0.21, { mcap: 5.2e10, pe: 0, div: 4.3, hi52: 101.64, lo52: 83.3, beta: 0.1, bg: "#000", fg: "#fff", t: "TLT" }),
  S("GLD", "SPDR Gold Shares", "ARCA", "USD", "ETF", "Commodity", 362.48, 1.08, { mcap: 1.2e11, pe: 0, div: 0, hi52: 371.2, lo52: 243.1, beta: 0.05, bg: "#b8860b", fg: "#fff", t: "GLD" }),
  // ---- Crypto (PAXOS)
  S("BTC", "Bitcoin", "PAXOS", "USD", "CRYPTO", "Crypto", 109842.5, 1.92, { mcap: 2.19e12, hi52: 126198, lo52: 74508, beta: 1.4, bg: "#f7931a", fg: "#fff", t: "₿" }),
  S("ETH", "Ethereum", "PAXOS", "USD", "CRYPTO", "Crypto", 3892.4, 2.76, { mcap: 4.7e11, hi52: 4953, lo52: 1472, beta: 1.6, bg: "#627eea", fg: "#fff", t: "Ξ" }),
  S("SOL", "Solana", "PAXOS", "USD", "CRYPTO", "Crypto", 186.2, -1.31, { mcap: 1.02e11, hi52: 294.3, lo52: 95.2, beta: 1.9, bg: "#9945ff", fg: "#fff", t: "◎" }),
  // ---- Indices
  S("SPX", "S&P 500 Index", "CBOE", "USD", "IND", "Index", 6845.2, 0.41, { bg: "#2d3748", fg: "#fff", t: "SPX" }),
  S("NDX", "Nasdaq 100 Index", "NASDAQ", "USD", "IND", "Index", 25418.6, 0.73, { bg: "#2d3748", fg: "#fff", t: "NDX" }),
  S("DJI", "Dow Jones Industrial Average", "CBOE", "USD", "IND", "Index", 47215.8, 0.12, { bg: "#2d3748", fg: "#fff", t: "DJI" }),
  S("RUT", "Russell 2000 Index", "CBOE", "USD", "IND", "Index", 2486.3, -0.27, { bg: "#2d3748", fg: "#fff", t: "RUT" }),
  S("VIX", "CBOE Volatility Index", "CBOE", "USD", "IND", "Index", 16.84, -4.21, { bg: "#2d3748", fg: "#fff", t: "VIX" }),
  S("DAX", "DAX Performance Index", "EUREX", "EUR", "IND", "Index", 24312.4, -0.22, { bg: "#2d3748", fg: "#fff", t: "DAX" }),
  S("ESTX50", "EURO STOXX 50", "EUREX", "EUR", "IND", "Index", 5688.2, -0.09, { bg: "#2d3748", fg: "#fff", t: "SX5E" }),
  S("UKX", "FTSE 100 Index", "ICEEU", "GBP", "IND", "Index", 9720.3, 0.33, { bg: "#2d3748", fg: "#fff", t: "UKX" }),
  S("N225", "Nikkei 225", "OSE.JPN", "JPY", "IND", "Index", 49870.1, 1.14, { bg: "#2d3748", fg: "#fff", t: "NKY" }),
  S("HSI", "Hang Seng Index", "HKFE", "HKD", "IND", "Index", 26142.7, -0.58, { bg: "#2d3748", fg: "#fff", t: "HSI" }),
  // ---- Forex
  S("EUR.USD", "Euro / US Dollar", "IDEALPRO", "USD", "CASH", "Forex", 1.1632, 0.18, { bg: "#1e3a8a", fg: "#fff", t: "€$" }),
  S("GBP.USD", "British Pound / US Dollar", "IDEALPRO", "USD", "CASH", "Forex", 1.3312, -0.11, { bg: "#1e3a8a", fg: "#fff", t: "£$" }),
  S("USD.JPY", "US Dollar / Japanese Yen", "IDEALPRO", "JPY", "CASH", "Forex", 152.84, 0.26, { bg: "#1e3a8a", fg: "#fff", t: "$¥" }),
  S("USD.CHF", "US Dollar / Swiss Franc", "IDEALPRO", "CHF", "CASH", "Forex", 0.7962, -0.14, { bg: "#1e3a8a", fg: "#fff", t: "$₣" }),
  S("EUR.CHF", "Euro / Swiss Franc", "IDEALPRO", "CHF", "CASH", "Forex", 0.9262, 0.04, { bg: "#1e3a8a", fg: "#fff", t: "€₣" }),
  S("USD.HKD", "US Dollar / Hong Kong Dollar", "IDEALPRO", "HKD", "CASH", "Forex", 7.7812, 0.01, { bg: "#1e3a8a", fg: "#fff", t: "$HK" }),
];

export const SYMBOL_MAP = new Map(SYMBOLS.map((s) => [s.sym, s]));

export const REGION_BY_EXCH = {
  NASDAQ: "North America",
  NYSE: "North America",
  ARCA: "North America",
  CBOE: "North America",
  IBIS: "Europe",
  EUREX: "Europe",
  EBS: "Europe",
  ICEEU: "Europe",
  "OSE.JPN": "Asia-Pacific",
  HKFE: "Asia-Pacific",
  PAXOS: "Digital Assets",
  IDEALPRO: "Forex",
};

export const TYPE_LABEL = {
  STK: "Stock",
  ETF: "ETF",
  CRYPTO: "Crypto",
  IND: "Index",
  CASH: "Forex",
  OPT: "Option",
};

export const ASSET_CLASS_LABEL = {
  STK: "Stocks",
  ETF: "ETFs",
  CRYPTO: "Crypto",
  OPT: "Options",
  CASH: "Cash",
};
