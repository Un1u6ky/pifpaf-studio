const { ApifyClient } = require("apify-client");
const { parseInstagram, mapApifyItem } = require("./instagram");

async function fetchFromApify(link) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    const error = new Error("Нет APIFY_TOKEN — добавь токен в .env");
    error.code = "NO_TOKEN";
    throw error;
  }

  const parsed = parseInstagram(link);
  if (!parsed) {
    const error = new Error("Нужна ссылка Instagram или @username");
    error.code = "BAD_URL";
    throw error;
  }

  const client = new ApifyClient({ token });
  const actor = process.env.APIFY_ACTOR || "apify/instagram-reel-scraper";
  const input = {
    username: [parsed.kind === "profile" ? parsed.username : parsed.url],
    resultsLimit: parsed.kind === "reel" ? 1 : 12,
    skipPinnedPosts: false,
    includeTranscript: false,
    includeDownloadedVideo: false,
  };

  const run = await client.actor(actor).call(input, { waitSecs: 120 });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) {
    const error = new Error("Apify ничего не вернул. Проверь, что рилс публичный.");
    error.code = "EMPTY";
    throw error;
  }
  return items.map((item) => mapApifyItem(item, parsed.url));
}

module.exports = { fetchFromApify };
