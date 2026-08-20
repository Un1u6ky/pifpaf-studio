const app = document.getElementById("app");
const state = {
  user: null,
  apify: false,
  view: "dashboard",
  authMode: "login",
  reels: [],
  stats: null,
  error: "",
  loading: false,
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function fmt(n) {
  const value = Number(n) || 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} тыс`;
  return String(value);
}

function when(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3200);
}

function render() {
  app.innerHTML = state.user ? cabinet() : gate();
  bind();
}

function gate() {
  const login = state.authMode === "login";
  return `
    <section class="auth">
      <div class="auth-hero">
        <div class="logo"><span class="spark"></span> PifPaf Studio</div>
        <h1>Кабинет, где <em>рилсы</em> сами рассказывают цифры</h1>
        <p>Вставь ссылку из Instagram — обложка, дата и просмотры подтянутся через Apify и лягут в твою ленту.</p>
        <div class="pills">
          <span class="pill">для внутренних авторов</span>
          <span class="pill">светлый дашборд</span>
          <span class="pill">лента как в Pinterest</span>
        </div>
        <div class="polaroids">
          <div class="polaroid"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=70" alt=""></div>
          <div class="polaroid"><img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=70" alt=""></div>
          <div class="polaroid"><img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=70" alt=""></div>
        </div>
      </div>
      <div class="auth-card">
        <div class="card">
          <h2>${login ? "Войти" : "Создать кабинет"}</h2>
          <p class="sub">${login ? "Каждый автор видит только свои рилсы." : "Свой аккаунт, своя лента, своя аналитика."}</p>
          <form id="auth-form">
            ${login ? "" : `<label>Имя</label><input name="name" placeholder="Мила" required>`}
            <label>Почта</label>
            <input name="email" type="email" placeholder="mila@pifpaf.ai" required>
            <label>Пароль</label>
            <input name="password" type="password" placeholder="••••••" required>
            ${login ? "" : `<label>Instagram</label><input name="instagram_handle" placeholder="@mila.studio">`}
            <button class="btn" type="submit">${login ? "Войти" : "Создать кабинет"}</button>
            ${state.error ? `<div class="error">${state.error}</div>` : ""}
          </form>
          <div class="switch">
            ${login ? `Нет кабинета? <b data-mode="register">Зарегистрироваться</b>` : `Уже есть? <b data-mode="login">Войти</b>`}
          </div>
          <div class="demo">
            Демо: mila@pifpaf.ai / mila123 · sasha@pifpaf.ai / sasha123
          </div>
        </div>
      </div>
    </section>
  `;
}

function cabinet() {
  return `
    <div class="shell">
      <aside class="side">
        <div class="logo"><span class="spark"></span> PifPaf Studio</div>
        <nav class="nav">
          <button class="navbtn ${state.view === "dashboard" ? "active" : ""}" data-view="dashboard">Дашборд</button>
          <button class="navbtn ${state.view === "feed" ? "active" : ""}" data-view="feed">Лента</button>
          <button class="navbtn ${state.view === "table" ? "active" : ""}" data-view="table">Таблица</button>
          <button class="navbtn ${state.view === "settings" ? "active" : ""}" data-view="settings">Кабинет</button>
        </nav>
        <div class="who">
          <div class="name">${esc(state.user.name)}</div>
          <div class="mail">@${esc(state.user.instagram_handle || "автор")}</div>
          <button class="btn ghost" id="logout" style="margin-top:12px">Выйти</button>
        </div>
      </aside>
      <main class="main">${mainView()}</main>
    </div>
  `;
}

function mainView() {
  if (state.view === "feed") return feedView();
  if (state.view === "table") return tableView();
  if (state.view === "settings") return settingsView();
  return dashboardView();
}

function addBar() {
  return `
    <div class="panel">
      <h3>Добавить из Instagram</h3>
      <form class="add" id="add-form">
        <input name="url" placeholder="https://www.instagram.com/reel/... или @username" required>
        <button class="btn tiny" type="submit">${state.loading ? "Тянем…" : "Подтянуть"}</button>
      </form>
      ${state.apify ? "" : `<p class="sub">Пока без APIFY_TOKEN живые ссылки не обновятся. Демо-лента уже в кабинете.</p>`}
      ${state.error ? `<div class="error">${state.error}</div>` : ""}
    </div>
  `;
}

function dashboardView() {
  const s = state.stats || { reels: 0, views: 0, likes: 0, comments: 0, avg_views: 0, history: [], top: [] };
  const max = Math.max(...(s.history || []).map((h) => h.views), 1);
  return `
    <div class="top">
      <div>
        <h1>Привет, ${esc(state.user.name.split(" ")[0])}</h1>
        <p>Просмотры, даты и обложки собраны в одном светлом кабинете.</p>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi blush"><div class="k">Просмотры</div><div class="v">${fmt(s.views)}</div></div>
      <div class="kpi lilac"><div class="k">Рилсы</div><div class="v">${s.reels}</div></div>
      <div class="kpi mint"><div class="k">Средние просмотры</div><div class="v">${fmt(s.avg_views)}</div></div>
      <div class="kpi peach"><div class="k">Лайки</div><div class="v">${fmt(s.likes)}</div></div>
    </div>
    ${addBar()}
    <div class="panel">
      <h3>Динамика просмотров</h3>
      <div class="chart">
        ${(s.history || []).map((h) => `<div class="bar" title="${h.day}: ${fmt(h.views)}" style="height:${Math.round((h.views / max) * 140) + 10}px"></div>`).join("") || `<div class="empty">Появится после обновлений</div>`}
      </div>
    </div>
    <div class="panel">
      <h3>Топ роликов</h3>
      <div class="masonry" style="columns:3">
        ${(s.top || []).map(tile).join("") || `<div class="empty">Добавь первый рилс</div>`}
      </div>
    </div>
  `;
}

function feedView() {
  return `
    <div class="top">
      <div>
        <h1>Лента</h1>
        <p>Обложки, даты и просмотры — как мудборд, только со статистикой.</p>
      </div>
    </div>
    ${addBar()}
    <div class="masonry">
      ${state.reels.map(tile).join("") || `<div class="empty">Пока пусто. Вставь ссылку сверху.</div>`}
    </div>
  `;
}

function tile(reel) {
  return `
    <article class="tile">
      <img src="${esc(reel.cover_url || "")}" alt="">
      <div class="meta">
        <div class="cap">${esc(reel.caption || reel.shortcode || "Рилс")}</div>
        <div class="nums">
          <span>${fmt(reel.views)} просм.</span>
          <span>${when(reel.posted_at)}</span>
          <span>${fmt(reel.likes)} ♥</span>
        </div>
      </div>
    </article>
  `;
}

function tableView() {
  return `
    <div class="top">
      <div>
        <h1>Таблица</h1>
        <p>Та же база, только строками — удобно сверять цифры.</p>
      </div>
    </div>
    ${addBar()}
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th></th><th>Рилс</th><th>Дата</th><th>Просмотры</th><th>Лайки</th><th>Комменты</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${state.reels.map((reel) => `
            <tr>
              <td><img class="cover-mini" src="${esc(reel.cover_url || "")}" alt=""></td>
              <td>
                <b>${esc((reel.caption || "").slice(0, 48) || reel.shortcode)}</b><br>
                <a href="${esc(reel.instagram_url)}" target="_blank">открыть</a>
              </td>
              <td>${when(reel.posted_at)}</td>
              <td>${fmt(reel.views)}</td>
              <td>${fmt(reel.likes)}</td>
              <td>${fmt(reel.comments)}</td>
              <td>
                <button class="btn tiny ghost" data-refresh="${reel.id}">Обновить</button>
                <button class="btn tiny ghost" data-del="${reel.id}">Удалить</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function settingsView() {
  return `
    <div class="top">
      <div>
        <h1>Личный кабинет</h1>
        <p>Имя и Instagram, к которому привязаны рилсы.</p>
      </div>
    </div>
    <div class="panel" style="max-width:520px">
      <form id="profile-form">
        <label>Имя</label>
        <input name="name" value="${esc(state.user.name)}" required>
        <label>Почта</label>
        <input value="${esc(state.user.email)}" disabled>
        <label>Instagram</label>
        <input name="instagram_handle" value="${esc(state.user.instagram_handle || "")}">
        <button class="btn" type="submit">Сохранить</button>
      </form>
    </div>
  `;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bind() {
  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.onclick = () => { state.authMode = el.dataset.mode; state.error = ""; render(); };
  });
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.onclick = () => { state.view = el.dataset.view; state.error = ""; render(); };
  });
  const auth = document.getElementById("auth-form");
  if (auth) {
    auth.onsubmit = async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(auth));
      try {
        const data = await api(state.authMode === "login" ? "/api/login" : "/api/register", { method: "POST", body });
        state.user = data.user;
        state.error = "";
        await loadCabinet();
      } catch (error) {
        state.error = error.message;
        render();
      }
    };
  }
  const add = document.getElementById("add-form");
  if (add) {
    add.onsubmit = async (event) => {
      event.preventDefault();
      state.loading = true;
      state.error = "";
      render();
      try {
        const body = Object.fromEntries(new FormData(add));
        await api("/api/reels", { method: "POST", body });
        toast("Рилсы подтянулись");
        await loadCabinet();
      } catch (error) {
        state.error = error.message;
      } finally {
        state.loading = false;
        render();
      }
    };
  }
  const profile = document.getElementById("profile-form");
  if (profile) {
    profile.onsubmit = async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(profile));
      const data = await api("/api/me", { method: "PATCH", body });
      state.user = data.user;
      toast("Кабинет обновлён");
      render();
    };
  }
  const logout = document.getElementById("logout");
  if (logout) {
    logout.onclick = async () => {
      await api("/api/logout", { method: "POST" });
      state.user = null;
      state.reels = [];
      render();
    };
  }
  document.querySelectorAll("[data-refresh]").forEach((el) => {
    el.onclick = async () => {
      try {
        await api(`/api/reels/${el.dataset.refresh}/refresh`, { method: "POST" });
        toast("Цифры обновлены");
        await loadCabinet();
      } catch (error) {
        toast(error.message);
      }
    };
  });
  document.querySelectorAll("[data-del]").forEach((el) => {
    el.onclick = async () => {
      await api(`/api/reels/${el.dataset.del}`, { method: "DELETE" });
      await loadCabinet();
    };
  });
}

async function loadCabinet() {
  const [reels, stats] = await Promise.all([api("/api/reels"), api("/api/stats")]);
  state.reels = reels.reels;
  state.stats = stats;
  render();
}

async function boot() {
  try {
    const me = await api("/api/me");
    state.user = me.user;
    state.apify = me.apify;
    if (state.user) await loadCabinet();
    else render();
  } catch {
    render();
  }
}

boot();
