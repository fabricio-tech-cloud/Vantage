// Minimal hash router with per-route scroll restoration and view lifecycle.
const routes = [];
let current = null; // { view, params, cleanup, path }
let onChangeHook = null;
const scrollPos = new Map();
const stackKey = "vantage.stack";

function readStack() {
  try {
    return JSON.parse(sessionStorage.getItem(stackKey) || "[]");
  } catch {
    return [];
  }
}
function writeStack(s) {
  sessionStorage.setItem(stackKey, JSON.stringify(s.slice(-40)));
}

export function route(pattern, view) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/\//g, "\\/").replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^\\/]+)")) + "$");
  routes.push({ re, keys, view });
}

export const currentPath = () => decodeURI(location.hash.slice(1)) || "/home";

export function navigate(path, { replace = false } = {}) {
  const target = "#" + path;
  if (location.hash === target) {
    render();
    return;
  }
  if (replace) location.replace(target);
  else location.hash = path;
}

export function back(fallback = "/home") {
  const stack = readStack();
  if (stack.length > 1) history.back();
  else navigate(fallback, { replace: true });
}

export function canGoBack() {
  return readStack().length > 1;
}

function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { view: r.view, params };
    }
  }
  return null;
}

export function render(reason = "route") {
  const path = currentPath();
  const m = match(path) || match("/home");
  const viewEl = document.getElementById("view");
  if (!viewEl) return;
  const isSame = current && current.view === m.view && current.path === path;
  // preserve scroll on in-place updates
  const prevScroll = viewEl.scrollTop;
  if (current) {
    scrollPos.set(current.path, viewEl.scrollTop);
    try {
      current.cleanup?.();
    } catch (e) {
      console.error(e);
    }
  }
  const view = m.view;
  viewEl.innerHTML = view.render(m.params, reason);
  viewEl.className = "screen" + (view.nav ? " has-nav" : "") + (view.cls ? " " + view.cls : "");
  let cleanup = null;
  try {
    cleanup = view.mount?.(viewEl, m.params) || null;
  } catch (e) {
    console.error(e);
  }
  if (!isSame) {
    // navigation
    const stack = readStack();
    const idx = stack.lastIndexOf(path);
    if (idx >= 0 && idx === stack.length - 2) {
      stack.pop(); // went back
      writeStack(stack);
      viewEl.scrollTop = scrollPos.get(path) || 0;
    } else {
      if (stack[stack.length - 1] !== path) stack.push(path);
      writeStack(stack);
      viewEl.scrollTop = 0;
      viewEl.classList.add("enter");
      setTimeout(() => viewEl.classList.remove("enter"), 260);
    }
  } else {
    viewEl.scrollTop = prevScroll;
  }
  current = { view, params: m.params, cleanup, path };
  onChangeHook?.(view, path, reason);
}

export function refresh(reason = "update") {
  if (!current) return;
  if (current.view.update) {
    const viewEl = document.getElementById("view");
    try {
      if (current.view.update(viewEl, current.params, reason) !== false) return;
    } catch (e) {
      console.error(e);
    }
  }
  render(reason);
}

export function start(hook) {
  onChangeHook = hook;
  window.addEventListener("hashchange", () => render("route"));
  if (!location.hash) location.replace("#/home");
  render("route");
}

export const activeView = () => current?.view;
