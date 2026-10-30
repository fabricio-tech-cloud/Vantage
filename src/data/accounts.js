// Seed users + accounts.
// Fabricio (admin) manages all client accounts and sees activity.
// Each named client can log in and only sees their own account.

export const ADMIN_USER = {
  id: "admin",
  name: "Fabricio Rubichi",
  initials: "FR",
  username: "frubichi",
  email: "fabriciofreiburg@icloud.com",
  phone: "01622594648",
  address: "Moltkestraße 19, 79098 Freiburg im Breisgau",
  role: "admin",
  lastLoginDevice: "iPhone · Freiburg, DE",
};

/** @deprecated use currentUser() from state — kept for legacy imports during transition */
export const USER = ADMIN_USER;

/** Client users who can sign in to their own account. */
export const CLIENT_USERS = [
  { id: "ryan", name: "Ryan Augier", initials: "RA", username: "raugier", email: "ryan.augier@example.com" },
  { id: "aaron", name: "Aaron Schäferbarthold", initials: "AS", username: "aschaferbarthold", email: "aaron.schaeferbarthold@example.com" },
  { id: "nico", name: "Nico Zagarov", initials: "NZ", username: "nzagarov", email: "nico.zagarov@example.com" },
  { id: "lam", name: "Lam Nguyen", initials: "LN", username: "lnguyen", email: "lam.nguyen@example.com" },
  { id: "angelina", name: "Angelina Vintrici", initials: "AV", username: "avintrici", email: "angelina.vintrici@example.com" },
  { id: "pia", name: "Pia Walser", initials: "PW", username: "pwalser", email: "pia.walser@example.com" },
  { id: "alexander", name: "Alexander Ganter", initials: "AG", username: "aganter", email: "alexander.ganter@example.com" },
  { id: "louis", name: "Louis Ganter", initials: "LG", username: "lganter", email: "louis.ganter@example.com" },
  { id: "eliza", name: "Eliza Rubichi", initials: "ER", username: "erubichi", email: "eliza.rubichi@example.com" },
  { id: "luciano", name: "Luciano Rubichi", initials: "LR", username: "lrubichi", email: "luciano.rubichi@example.com" },
  { id: "erika", name: "Erika Rubichi", initials: "EK", username: "ekrubichi", email: "erika.rubichi@example.com" },
  { id: "samuel", name: "Samuel Njoya", initials: "SN", username: "snjoya", email: "samuel.njoya@example.com" },
  { id: "carlo", name: "Carlo Hemar", initials: "CH", username: "chemar", email: "carlo.hemar@example.com" },
  { id: "jason", name: "Jason Bala", initials: "JB", username: "jbala", email: "jason.bala@example.com" },
].map((u) => ({
  ...u,
  phone: "+41 •• ••• •• ••",
  address: "Switzerland",
  role: "client",
  lastLoginDevice: "iPhone · Switzerland",
}));

export const USERS = [ADMIN_USER, ...CLIENT_USERS];

export function userById(id) {
  return USERS.find((u) => u.id === id) || ADMIN_USER;
}

export function userByUsername(username) {
  const key = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return USERS.find((u) => u.username.toLowerCase() === key);
}

/** Portfolio templates — assigned round-robin / by index for variety. */
const PORTFOLIOS = [
  {
    type: "Margin",
    cash: { USD: 12480.4, EUR: 3200 },
    positions: [
      { sym: "AAPL", qty: 80, avg: 178.2 },
      { sym: "MSFT", qty: 40, avg: 390.1 },
      { sym: "NVDA", qty: 120, avg: 92.4 },
      { sym: "SPY", qty: 35, avg: 512.0 },
      { sym: "VWCE", qty: 180, avg: 108.4 },
    ],
  },
  {
    type: "Cash",
    cash: { USD: 8420.0, CHF: 4100 },
    positions: [
      { sym: "VOO", qty: 60, avg: 428.5 },
      { sym: "QQQ", qty: 25, avg: 412.2 },
      { sym: "JNJ", qty: 40, avg: 158.2 },
      { sym: "KO", qty: 120, avg: 58.6 },
      { sym: "GLD", qty: 18, avg: 198.4 },
    ],
  },
  {
    type: "Margin",
    cash: { USD: 6120.55 },
    positions: [
      { sym: "TSLA", qty: 45, avg: 221.3 },
      { sym: "AMD", qty: 90, avg: 118.4 },
      { sym: "PLTR", qty: 250, avg: 22.8 },
      { sym: "META", qty: 12, avg: 498.2 },
      { sym: "BTC", qty: 0.18, avg: 58200 },
    ],
  },
  {
    type: "Cash",
    cash: { EUR: 15400.0, USD: 2200 },
    positions: [
      { sym: "VWCE", qty: 320, avg: 102.1 },
      { sym: "NESN", qty: 80, avg: 94.2 },
      { sym: "SAP", qty: 40, avg: 148.0 },
      { sym: "ALV", qty: 25, avg: 248.0 },
      { sym: "ASML", qty: 8, avg: 712.0 },
    ],
  },
  {
    type: "Margin",
    cash: { USD: 22140.0 },
    positions: [
      { sym: "GOOGL", qty: 70, avg: 138.9 },
      { sym: "AMZN", qty: 55, avg: 162.4 },
      { sym: "NFLX", qty: 10, avg: 612.4 },
      { sym: "ORCL", qty: 60, avg: 118.3 },
      { sym: "SPY", qty: 40, avg: 489.0 },
    ],
  },
  {
    type: "Cash",
    cash: { CHF: 9800.0, USD: 1500 },
    positions: [
      { sym: "VTI", qty: 90, avg: 248.1 },
      { sym: "AAPL", qty: 35, avg: 168.4 },
      { sym: "MSFT", qty: 18, avg: 402.0 },
      { sym: "PG", qty: 40, avg: 142.3 },
      { sym: "TLT", qty: 80, avg: 94.2 },
    ],
  },
  {
    type: "Margin",
    cash: { USD: 4820.0, EUR: 1800 },
    positions: [
      { sym: "NVDA", qty: 80, avg: 88.4 },
      { sym: "AMD", qty: 110, avg: 98.1 },
      { sym: "INTC", qty: 200, avg: 31.2 },
      { sym: "CRM", qty: 25, avg: 268.0 },
      { sym: "ETH", qty: 2.4, avg: 2410 },
    ],
  },
];

const OPENED = [
  "2019-04-12",
  "2020-08-03",
  "2021-02-19",
  "2021-11-05",
  "2022-03-22",
  "2022-07-14",
  "2022-11-28",
  "2023-01-16",
  "2023-05-09",
  "2023-09-01",
  "2024-01-22",
  "2024-04-08",
  "2024-08-19",
  "2025-02-03",
];

function clientAccount(user, index) {
  const p = PORTFOLIOS[index % PORTFOLIOS.length];
  const id = "U88" + String(10001 + index).slice(1);
  return {
    id,
    alias: user.name.split(" ").slice(-1)[0] + ", " + user.name.split(" ")[0],
    holder: user.name,
    type: p.type,
    kind: "client",
    relationship: "Advisor client",
    userId: user.id,
    opened: OPENED[index % OPENED.length],
    cash: { ...p.cash },
    positions: p.positions.map((x) => ({ ...x })),
  };
}

export const ACCOUNTS = [
  {
    id: "U4821093",
    alias: "Individual",
    holder: "Fabricio Rubichi",
    type: "Margin",
    kind: "private",
    userId: "admin",
    opened: "2017-03-14",
    cash: { USD: 38420.55, EUR: 9850.0 },
    positions: [
      { sym: "AAPL", qty: 420, avg: 168.4 },
      { sym: "MSFT", qty: 210, avg: 312.75 },
      { sym: "NVDA", qty: 650, avg: 48.12 },
      { sym: "AMZN", qty: 300, avg: 142.6 },
      { sym: "ASML", qty: 60, avg: 688.2 },
      { sym: "GOOGL", qty: 180, avg: 138.9 },
      { sym: "SPY", qty: 150, avg: 452.3 },
      { sym: "JPM", qty: 120, avg: 158.4 },
      { sym: "BTC", qty: 0.85, avg: 41200 },
      { sym: "VWCE", qty: 400, avg: 108.2 },
    ],
  },
  {
    id: "U5560271",
    alias: "Joint",
    holder: "Fabricio Rubichi",
    type: "Cash",
    kind: "private",
    userId: "admin",
    opened: "2019-09-02",
    cash: { USD: 21344.12 },
    positions: [
      { sym: "VOO", qty: 180, avg: 398.1 },
      { sym: "QQQ", qty: 90, avg: 388.4 },
      { sym: "JNJ", qty: 160, avg: 158.2 },
      { sym: "KO", qty: 400, avg: 58.6 },
      { sym: "PG", qty: 110, avg: 142.3 },
      { sym: "TLT", qty: 300, avg: 94.2 },
      { sym: "GLD", qty: 85, avg: 183.4 },
    ],
  },
  {
    id: "U6093318",
    alias: "Trading",
    holder: "Fabricio Rubichi",
    type: "Margin",
    kind: "private",
    userId: "admin",
    opened: "2022-01-18",
    cash: { USD: 12804.9 },
    positions: [
      { sym: "TSLA", qty: 85, avg: 251.3 },
      { sym: "PLTR", qty: 400, avg: 24.8 },
      { sym: "AMD", qty: 150, avg: 118.4 },
      { sym: "META", qty: 40, avg: 498.2 },
      { sym: "NFLX", qty: 15, avg: 612.4 },
      { sym: "ETH", qty: 6.2, avg: 2410 },
      { sym: "INTC", qty: 500, avg: 31.2 },
    ],
  },
  ...CLIENT_USERS.map((u, i) => clientAccount(u, i)),
];

/** Map client userId → account id */
export const USER_ACCOUNT = Object.fromEntries(ACCOUNTS.filter((a) => a.userId && a.kind === "client").map((a) => [a.userId, a.id]));

CLIENT_USERS.forEach((u) => {
  u.accountId = USER_ACCOUNT[u.id];
});

export const BANKS = [
  { id: "b1", name: "UBS Switzerland AG", iban: "CH93 0024 •••• •••• 4812 A", ccy: "CHF", type: "SEPA / SIC" },
  { id: "b2", name: "Deutsche Bank", iban: "DE89 3704 •••• •••• 0532 13", ccy: "EUR", type: "SEPA" },
  { id: "b3", name: "Chase Bank", iban: "•••• •••• •••• 7731", ccy: "USD", type: "ACH / Wire" },
];

/** Extra clients that can still be linked from Manage accounts. */
export const AVAILABLE_CLIENTS = [];
