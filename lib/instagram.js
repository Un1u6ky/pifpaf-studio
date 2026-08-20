function parseInstagram(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const handle = raw.replace(/^@/, "");
  if (/^[A-Za-z0-9._]+$/.test(handle) && !handle.includes("/")) {
    return {
      kind: "profile",
      username: handle.toLowerCase(),
      url: `https://www.instagram.com/${handle}/`,
      shortcode: null,
    };
  }

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!url.hostname.replace(/^www\./, "").endsWith("instagram.com")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "reel" || parts[0] === "reels" || parts[0] === "p" || parts[0] === "tv") {
    return {
      kind: "reel",
      username: null,
      url: `https://www.instagram.com/${parts[0]}/${parts[1]}/`,
      shortcode: parts[1] || null,
    };
  }
  if (parts[0]) {
    return {
      kind: "profile",
      username: parts[0].toLowerCase(),
      url: `https://www.instagram.com/${parts[0]}/`,
      shortcode: null,
    };
  }
  return null;
}

function mapApifyItem(item, fallbackUrl) {
  const url = item.url || item.inputUrl || fallbackUrl;
  const parsed = parseInstagram(url);
  const cover =
    item.displayUrl ||
    item.display_url ||
    (Array.isArray(item.images) && item.images[0]) ||
    item.thumbnailUrl ||
    null;
  const views = Number(item.videoViewCount ?? item.videoViewsCount ?? item.viewsCount ?? 0) || 0;
  const plays = Number(item.videoPlayCount ?? item.videoPlaysCount ?? views) || 0;
  return {
    instagram_url: parsed?.url || url,
    shortcode: parsed?.shortcode || item.shortCode || item.shortcode || null,
    caption: item.caption || "",
    cover_url: cover,
    posted_at: item.timestamp || item.takenAt || null,
    views,
    plays,
    likes: Math.max(0, Number(item.likesCount ?? item.likes ?? 0) || 0),
    comments: Number(item.commentsCount ?? 0) || 0,
    owner_username: item.ownerUsername || item.owner?.username || parsed?.username || null,
    duration: item.videoDuration || item.videoDurationSeconds || null,
    raw_json: JSON.stringify(item),
  };
}

module.exports = { parseInstagram, mapApifyItem };
