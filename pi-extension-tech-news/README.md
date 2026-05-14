# pi-extension-tech-news

Pi extension that adds a generic `news_feed` tool backed by Hacker News, Socket.dev Blog, Reddit tech subreddits, X/Twitter, and optional authenticated sources like daily.dev. By default it fetches up to 10 total entries across all configured sources, split evenly per enabled source.

## Tools

- `news_feed` — fetch entries from `hackernews`, `socket`, `dailydev`, `reddit`, `twitter`, or `all`.
  - Hacker News feeds: `top`, `new`, `best`, `ask`, `show`, `job`.
  - Socket source uses `https://socket.dev/api/blog/feed.json`.
  - daily.dev source uses `https://api.daily.dev/public/v1/feeds/popular` with `DAILY_DEV_TOKEN` when configured, otherwise falls back to the unofficial unauthenticated GraphQL endpoint.
  - Reddit source fetches subreddit JSON feeds directly from `www.reddit.com` using `REDDIT_SESSION` and optional `TOKEN_V2` cookies when configured.
  - X/Twitter source uses the official X API v2 recent-search endpoint with `X_BEARER_TOKEN` as the primary source. If the API token is missing or the request fails, it falls back to Nitter RSS. Nitter uses built-in defaults unless overridden with `NITTER_BASE_URL` + `NITTER_ACCOUNTS`.
  - Default Reddit subreddits include general tech/dev plus security/CVE-relevant communities: `cybersecurity`, `netsec`, `InfoSecNews`, `blueteamsec`, `AskNetsec`, `ReverseEngineering`, `malware`, `exploitdev`, `pwned`, `sysadmin`, and `devops`.
  - Reddit parameters: `subreddits?: string[]`, `redditSort?: "hot" | "new" | "top" | "rising"`.
  - Twitter parameters: `twitterQuery?: string`, `twitterAccounts?: string[]`, `twitterRank?: "engagement" | "recent"` (official X API only; default `engagement`).
- `news_sec` — agent-callable security/CVE-focused feed, equivalent to `/news-sec [limit] [redditSort]`.
  - Parameters: `limit?: number`, `redditSort?: "hot" | "new" | "top" | "rising"`.

## Commands

```text
/news [hackernews|socket|dailydev|reddit|twitter|all] [limit] [top|new|best|ask|show|job|hot|new|top|rising|engagement|recent] [subreddits=programming,rust] [accounts=OpenAI,github] [query=from:OpenAI]
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
/news twitter 20 engagement accounts=CISAgov,TheHackersNews
/news twitter 20 recent accounts=CISAgov,TheHackersNews
/news twitter 20 query=(from:CISAgov OR from:TheHackersNews) -is:retweet
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

## Twitter/X + Nitter setup

Run `/news-setup`, choose `Twitter/X + Nitter`, then configure one or both:

- `X_BEARER_TOKEN` — official X API Bearer Token for API v2 recent search. This is the primary source and enables engagement-based ranking.
- `NITTER_BASE_URL` — optional fallback Nitter-compatible instance base URL. Default: `https://nitter.net`.
- `NITTER_ACCOUNTS` — optional comma-separated handles for fallback RSS feeds. Default focuses on cybersecurity and developer trendsetters: `CISAgov,TheHackersNews,BleepinComputer,vxunderground,SwiftOnSecurity,SocketSecurity,GitHubSecurity,t3dotgg,rauchg,swyx,addyosmani,dan_abramov,github,HackerNewsYC`.

Saved config uses Pi's global env file:

```bash
X_BEARER_TOKEN="..."
NITTER_BASE_URL="https://nitter.net"
NITTER_ACCOUNTS="OpenAI,github,SocketSecurity"
```

If `twitterQuery` / `query=` is not provided, the extension builds an X recent-search query from `twitterAccounts` / `accounts=`, `NITTER_ACCOUNTS`, or the built-in default accounts:

```text
(from:CISAgov OR from:TheHackersNews OR from:BleepinComputer OR from:vxunderground OR from:SwiftOnSecurity OR from:SocketSecurity OR from:GitHubSecurity OR from:t3dotgg OR from:rauchg OR from:swyx OR from:addyosmani OR from:dan_abramov OR from:github OR from:HackerNewsYC) -is:retweet
```

Nitter fallback is best-effort. Public instances often rate-limit, block RSS bots, or disappear.

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
