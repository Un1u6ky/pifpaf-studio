require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./lib/db");
const { seed } = require("./lib/seed");
const { parseInstagram } = require("./lib/instagram");
const { fetchFromApify } = require("./lib/apify");
const { upsertReel, listReels, stats, getReel, reelHistory, deleteReel } = require("./lib/reels");

seed();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "pifpaf.sid",
    secret: process.env.SESSION_SECRET || "pifpaf-studio-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 14 * 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, "public")));

function requireUser(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Нужно войти" });
  req.user = db.prepare("SELECT id, name, email, instagram_handle, accent FROM users WHERE id = ?").get(
    req.session.userId
  );
  if (!req.user) return res.status(401).json({ error: "Сессия устарела" });
  next();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    instagram_handle: user.instagram_handle,
    accent: user.accent,
  };
}

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null, apify: Boolean(process.env.APIFY_TOKEN) });
  const user = db.prepare("SELECT id, name, email, instagram_handle, accent FROM users WHERE id = ?").get(
    req.session.userId
  );
  res.json({ user, apify: Boolean(process.env.APIFY_TOKEN) });
});

app.post("/api/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const instagram_handle = String(req.body.instagram_handle || "").replace(/^@/, "").trim() || null;
  if (name.length < 2 || !email.includes("@") || password.length < 6) {
    return res.status(400).json({ error: "Имя, почта и пароль от 6 символов" });
  }
  try {
    const info = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, instagram_handle) VALUES (?, ?, ?, ?)"
      )
      .run(name, email, bcrypt.hashSync(password, 10), instagram_handle);
    req.session.userId = info.lastInsertRowid;
    const user = db.prepare("SELECT id, name, email, instagram_handle, accent FROM users WHERE id = ?").get(
      info.lastInsertRowid
    );
    res.json({ user: publicUser(user) });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Такая почта уже есть" });
    }
    throw error;
  }
});

app.post("/api/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(String(req.body.password || ""), user.password_hash)) {
    return res.status(401).json({ error: "Неверная почта или пароль" });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.patch("/api/me", requireUser, (req, res) => {
  const name = String(req.body.name || req.user.name).trim();
  const instagram_handle = String(req.body.instagram_handle || "").replace(/^@/, "").trim() || null;
  db.prepare("UPDATE users SET name = ?, instagram_handle = ? WHERE id = ?").run(
    name,
    instagram_handle,
    req.user.id
  );
  const user = db.prepare("SELECT id, name, email, instagram_handle, accent FROM users WHERE id = ?").get(
    req.user.id
  );
  res.json({ user });
});

app.get("/api/reels", requireUser, (req, res) => {
  res.json({ reels: listReels(req.user.id) });
});

app.get("/api/stats", requireUser, (req, res) => {
  res.json(stats(req.user.id));
});

app.get("/api/reels/:id", requireUser, (req, res) => {
  const reel = getReel(req.user.id, Number(req.params.id));
  if (!reel) return res.status(404).json({ error: "Рилс не найден" });
  res.json({ reel, history: reelHistory(reel.id) });
});

app.post("/api/reels", requireUser, async (req, res) => {
  const parsed = parseInstagram(req.body.url);
  if (!parsed) return res.status(400).json({ error: "Вставь ссылку на рилс, профиль или @username" });
  try {
    const items = await fetchFromApify(req.body.url);
    const ids = items.map((item) => upsertReel(req.user.id, item));
    res.json({ added: ids.length, reels: listReels(req.user.id) });
  } catch (error) {
    if (error.code === "NO_TOKEN") {
      return res.status(503).json({
        error: "Добавь APIFY_TOKEN в .env, чтобы подтянуть живые просмотры и обложку из Instagram.",
      });
    }
    res.status(502).json({ error: error.message || "Apify не ответил" });
  }
});

app.post("/api/reels/:id/refresh", requireUser, async (req, res) => {
  const reel = getReel(req.user.id, Number(req.params.id));
  if (!reel) return res.status(404).json({ error: "Рилс не найден" });
  try {
    const items = await fetchFromApify(reel.instagram_url);
    const match =
      items.find((item) => item.instagram_url === reel.instagram_url || item.shortcode === reel.shortcode) ||
      items[0];
    upsertReel(req.user.id, { ...match, instagram_url: reel.instagram_url });
    res.json({ reel: getReel(req.user.id, reel.id) });
  } catch (error) {
    res.status(502).json({ error: error.message || "Не получилось обновить" });
  }
});

app.delete("/api/reels/:id", requireUser, (req, res) => {
  deleteReel(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`PifPaf Studio → http://127.0.0.1:${port}`);
});
