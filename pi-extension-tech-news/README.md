# pi-extension-tech-news

Pi extension that adds a generic `news_feed` tool backed by Hacker News, Socket.dev Blog, Reddit tech subreddits, and optional authenticated sources like daily.dev. By default it fetches up to 10 total entries across all configured sources, split evenly per enabled source.

## Tools

- `news_feed` — fetch entries from `hackernews`, `socket`, `dailydev`, `reddit`, or `all`.
  - Hacker News feeds: `top`, `new`, `best`, `ask`, `show`, `job`.
  - Socket source uses `https://socket.dev/api/blog/feed.json`.
  - daily.dev source uses `https://api.daily.dev/public/v1/feeds/popular` with `DAILY_DEV_TOKEN` when configured, otherwise falls back to the unofficial unauthenticated GraphQL endpoint.
  - Reddit source fetches subreddit JSON feeds directly from `www.reddit.com` using `REDDIT_SESSION` and optional `TOKEN_V2` cookies when configured.
  - Default Reddit subreddits include general tech/dev plus security/CVE-relevant communities: `cybersecurity`, `netsec`, `InfoSecNews`, `blueteamsec`, `AskNetsec`, `ReverseEngineering`, `malware`, `exploitdev`, `pwned`, `sysadmin`, and `devops`.
  - Reddit parameters: `subreddits?: string[]`, `redditSort?: "hot" | "new" | "top" | "rising"`.
- `news_sec` — agent-callable security/CVE-focused feed, equivalent to `/news-sec [limit] [redditSort]`.
  - Parameters: `limit?: number`, `redditSort?: "hot" | "new" | "top" | "rising"`.

## Commands

```text
/news [hackernews|socket|dailydev|reddit|all] [limit] [top|new|best|ask|show|job|hot|new|top|rising] [subreddits=programming,rust]
/news-sec [limit] [hot|new|top|rising]
/news-setup
```

Examples:

```text
/news                                  # all enabled sources, max 10 total
/news socket 10
/news dailydev 10
/news reddit 20 hot
/news reddit 20 rising subreddits=programming,rust,selfhosted
/news all 20 new
/news hackernews 20 new
/news-sec 25 hot                       # security/CVE-relevant Reddit + Socket.dev supply-chain news
/news-sec 25 new                       # more recent security/CVE-relevant news
/news-setup                            # configure daily.dev token or Reddit cookies
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

## Reddit setup

Run `/news-setup`, choose `Reddit cookies`, then follow the prompt.

How to get the cookie values:

1. Open `https://www.reddit.com` in a browser and log in.
2. Open DevTools (`F12`).
3. Go to **Application** / **Storage** → **Cookies** → `https://www.reddit.com`.
4. Copy the value of the `reddit_session` cookie.
5. Optional: copy the value of the `token_v2` cookie.
6. Paste them into `/news-setup`.

The values are saved to:

```text
~/.pi/agent/.env
```

as:

```bash
REDDIT_SESSION="..."
TOKEN_V2="..." # optional
```

Treat these cookie values like passwords. They authenticate your Reddit browser session.

## Install locally

Symlink `index.ts` into Pi's extension directory:

```bash
ln -s /home/firstpick/npm-packages/pi-extension-tech-news/index.ts ~/.pi/agent/extensions/tech-news.ts
```

Then run `/reload` in Pi.
