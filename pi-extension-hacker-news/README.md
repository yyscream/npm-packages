# pi-extension-hacker-news

Pi extension that adds a generic `news_feed` tool backed by Hacker News, Socket.dev Blog, and optional authenticated sources like daily.dev. By default it fetches up to 10 total entries across all configured sources, split evenly per enabled source.

## Tools

- `news_feed` — fetch entries from `hackernews`, `socket`, `dailydev`, or `all`.
  - Hacker News feeds: `top`, `new`, `best`, `ask`, `show`, `job`.
  - Socket source uses `https://socket.dev/api/blog/feed.json`.
  - daily.dev source uses `https://api.daily.dev/public/v1/feeds/popular` with `DAILY_DEV_TOKEN` when configured, otherwise falls back to the unofficial unauthenticated GraphQL endpoint.

## Commands

```text
/news [hackernews|socket|dailydev|all] [limit] [top|new|best|ask|show|job]
/news-setup
```

Examples:

```text
/news                    # all enabled sources, max 10 total
/news socket 10
/news dailydev 10
/news all 20 new
/news hackernews 20 new
/news-setup              # configure optional source tokens, currently daily.dev
```

## daily.dev setup

Run `/news-setup`, choose `daily.dev API token`, then paste a Personal Access Token from:

```text
https://app.daily.dev/settings/api
```

The token is optional. Without it, daily.dev falls back to the unofficial GraphQL API. If configured, the token is saved to Pi's global env file:

```text
~/.pi/agent/.env
```

## Install locally

Symlink `index.ts` into Pi's extension directory:

```bash
ln -s /home/firstpick/npm-packages/pi-extension-hacker-news/index.ts ~/.pi/agent/extensions/hacker-news.ts
```

Then run `/reload` in Pi.
