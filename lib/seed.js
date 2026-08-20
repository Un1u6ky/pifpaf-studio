require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");
const { upsertReel } = require("./reels");

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const milaReels = [
  {
    shortcode: "pifpafMila01",
    caption: "Утренний свет и любимый тренд из рилс ✨",
    cover_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(2),
    views: 184200,
    plays: 241000,
    likes: 12640,
    comments: 318,
    duration: 12.4,
  },
  {
    shortcode: "pifpafMila02",
    caption: "Этот фильтр собрал все сохранения",
    cover_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(5),
    views: 96200,
    plays: 128400,
    likes: 7340,
    comments: 190,
    duration: 9.1,
  },
  {
    shortcode: "pifpafMila03",
    caption: "Pinterest-повторы, которые просят в директ",
    cover_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(8),
    views: 310400,
    plays: 402100,
    likes: 21400,
    comments: 540,
    duration: 15.0,
  },
  {
    shortcode: "pifpafMila04",
    caption: "Тихий влог из студии",
    cover_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(12),
    views: 54100,
    plays: 69800,
    likes: 4102,
    comments: 88,
    duration: 21.6,
  },
  {
    shortcode: "pifpafMila05",
    caption: "Парный кадр, который зашёл лучше соло",
    cover_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(16),
    views: 142800,
    plays: 188200,
    likes: 9800,
    comments: 246,
    duration: 11.2,
  },
  {
    shortcode: "pifpafMila06",
    caption: "Как я собираю мудборд перед съёмкой",
    cover_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(20),
    views: 77800,
    plays: 99100,
    likes: 5604,
    comments: 141,
    duration: 18.8,
  },
];

const sashaReels = [
  {
    shortcode: "pifpafSasha01",
    caption: "Уход за 30 секунд — сохранили 4к раз",
    cover_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(1),
    views: 221500,
    plays: 276000,
    likes: 15420,
    comments: 402,
    duration: 29.0,
  },
  {
    shortcode: "pifpafSasha02",
    caption: "Макияж «дорого» из аптечки",
    cover_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(4),
    views: 167300,
    plays: 210400,
    likes: 11210,
    comments: 287,
    duration: 14.5,
  },
  {
    shortcode: "pifpafSasha03",
    caption: "Розовый свет и один клик",
    cover_url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(9),
    views: 89400,
    plays: 112000,
    likes: 6400,
    comments: 155,
    duration: 8.7,
  },
  {
    shortcode: "pifpafSasha04",
    caption: "До/после, который просят повторить",
    cover_url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80",
    posted_at: daysAgo(14),
    views: 356900,
    plays: 448200,
    likes: 24880,
    comments: 610,
    duration: 10.3,
  },
];

function ensureUser({ name, email, password, instagram_handle, accent }) {
  const found = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (found) return found;
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, instagram_handle, accent) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name, email, bcrypt.hashSync(password, 10), instagram_handle, accent);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
}

function seedUser(user, owner, items) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM reels WHERE user_id = ?").get(user.id).n;
  if (count > 0) return;
  for (const item of items) {
    upsertReel(user.id, {
      instagram_url: `https://www.instagram.com/reel/${item.shortcode}/`,
      shortcode: item.shortcode,
      caption: item.caption,
      cover_url: item.cover_url,
      posted_at: item.posted_at,
      views: item.views,
      plays: item.plays,
      likes: item.likes,
      comments: item.comments,
      owner_username: owner,
      duration: item.duration,
      raw_json: JSON.stringify({ seeded: true, ...item }),
    });
  }
}

function seed() {
  const mila = ensureUser({
    name: "Мила Котова",
    email: "mila@pifpaf.ai",
    password: "mila123",
    instagram_handle: "mila.studio",
    accent: "#3B66F5",
  });
  const sasha = ensureUser({
    name: "Саша Ли",
    email: "sasha@pifpaf.ai",
    password: "sasha123",
    instagram_handle: "sasha.glow",
    accent: "#E36385",
  });
  seedUser(mila, "mila.studio", milaReels);
  seedUser(sasha, "sasha.glow", sashaReels);
  return { mila, sasha };
}

if (require.main === module) {
  seed();
  console.log("Готово. Мила: mila@pifpaf.ai / mila123");
  console.log("Саша: sasha@pifpaf.ai / sasha123");
}

module.exports = { seed };
