import { login, state } from "../state.js";
import { ADMIN_USER, CLIENT_USERS, USERS, userByUsername } from "../data/accounts.js";
import { I, avatar } from "../components/icons.js";
import { toast } from "../components/sheet.js";
import { navigate, refresh } from "../router.js";
import { esc, haptic } from "../util/dom.js";

let selectedId = ADMIN_USER.id;

function selectedUser() {
  return USERS.find((u) => u.id === selectedId) || ADMIN_USER;
}

export default {
  nav: null,
  cls: "screen--login",
  render() {
    const u = selectedUser();
    return `<section class="login">
      <img class="login-logo" src="/assets/interactive-brokers.svg" alt="Interactive Brokers" width="210" height="36" />
      <div class="login-card">
        ${avatar(u.initials, 64)}
        <h1>${esc(u.name)}</h1>
        <p class="muted">@${esc(u.username)}${u.role === "admin" ? " · Admin" : ""}</p>
        <label class="field">
          <span>Account</span>
          <select class="input" name="account">
            <option value="${ADMIN_USER.id}" ${selectedId === ADMIN_USER.id ? "selected" : ""}>${esc(ADMIN_USER.name)} (Admin)</option>
            <optgroup label="Client accounts">
              ${CLIENT_USERS.map(
                (c) => `<option value="${c.id}" ${selectedId === c.id ? "selected" : ""}>${esc(c.name)}</option>`
              ).join("")}
            </optgroup>
          </select>
        </label>
        <label class="field">
          <span>Username</span>
          <input class="input" name="user" value="${esc(u.username)}" autocomplete="username" />
        </label>
        <label class="field">
          <span>Password</span>
          <input class="input" name="pass" type="password" value="••••••••" autocomplete="current-password" />
        </label>
        <button class="btn btn-primary btn-block" data-action="login">Log in</button>
        ${state.settings.biometrics ? `<button class="btn btn-ghost btn-block" data-action="face">${I.faceid()} Sign in with Face ID</button>` : ""}
        <p class="muted small center">Demo · pick a client or Admin, then Log in</p>
      </div>
      <div class="login-quick">
        <p class="muted small">Quick switch</p>
        <div class="login-chips">
          <button type="button" class="chip ${selectedId === ADMIN_USER.id ? "is-active" : ""}" data-quick="${ADMIN_USER.id}">Admin</button>
          ${CLIENT_USERS.slice(0, 8)
            .map((c) => `<button type="button" class="chip ${selectedId === c.id ? "is-active" : ""}" data-quick="${c.id}">${esc(c.initials)}</button>`)
            .join("")}
        </div>
      </div>
      <p class="disclaimer">Not affiliated with Interactive Brokers LLC. Quotes are simulated.</p>
    </section>`;
  },
  mount(el) {
    const pick = (id) => {
      selectedId = id;
      refresh("login-pick");
    };

    const go = () => {
      haptic(12);
      const typed = el.querySelector('[name="user"]')?.value;
      const byName = typed ? userByUsername(typed) : null;
      const id = byName?.id || selectedId;
      login(id);
      const u = byName || selectedUser();
      toast(`Signed in as ${u.name}`, { type: "success" });
      navigate("/home", { replace: true });
    };

    const onClick = (e) => {
      const quick = e.target.closest("[data-quick]");
      if (quick) {
        pick(quick.dataset.quick);
        return;
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      if (a.dataset.action === "login") go();
      if (a.dataset.action === "face") {
        a.classList.add("scanning");
        setTimeout(go, 700);
      }
    };
    const onChange = (e) => {
      if (e.target.name === "account") pick(e.target.value);
    };
    el.addEventListener("click", onClick);
    el.addEventListener("change", onChange);
    el.querySelector('[name="pass"]')?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("change", onChange);
    };
  },
};
