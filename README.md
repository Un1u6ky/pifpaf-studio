# PifPaf Studio

Кабинет внутренних авторов: каждый логинится в свой аккаунт, вставляет ссылку на Instagram — и в ленту подтягиваются обложка, дата и просмотры.

Данные Instagram идут через [Apify Instagram Reel Scraper](https://apify.com/apify/instagram-reel-scraper). На бесплатном плане с $5 кредита хватает примерно на 2 000 рилсов.

Стек: JavaScript (Express) + SQLite.

## Запуск

```bash
cp .env.example .env
npm install
npm start
```

Открой http://127.0.0.1:3000

Демо-кабинеты уже в базе:

- `mila@pifpaf.ai` / `mila123` — fashion-лента
- `sasha@pifpaf.ai` / `sasha123` — beauty-лента

## Живой Instagram

1. Заведи аккаунт на [apify.com](https://apify.com) и скопируй API token.
2. Впиши его в `.env`:

```
APIFY_TOKEN=apify_api_xxx
APIFY_ACTOR=apify/instagram-reel-scraper
```

3. В кабинете вставь ссылку на рилс, профиль или `@username` и нажми «Подтянуть».

Без токена кабинеты и демо-лента работают, живые ссылки не обновляются.

## Что внутри

- Личные кабинеты: свои рилсы, своя аналитика
- Дашборд: просмотры, среднее, лайки, график, топ
- Лента в духе Pinterest / pifpafai.com
- Таблица как аккуратная база
- Обновление одного ролика из Apify, история снимков в `reel_stats`

База: `data/studio.db`.
