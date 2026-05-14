import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const HN_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const SOCKET_FEED_URL = "https://socket.dev/api/blog/feed.json";
const DAILY_DEV_BASE_URL = "https://api.daily.dev/public/v1";
const DAILY_DEV_TOKEN_ENV = "DAILY_DEV_TOKEN";
const REDDIT_SESSION_ENV = "REDDIT_SESSION";
const REDDIT_TOKEN_V2_ENV = "TOKEN_V2";
const REDDIT_USER_AGENT = "pi-news-feed/0.1 (+https://reddit.com)";
const SECURITY_REDDIT_SUBREDDITS = [
  "cybersecurity",
  "netsec",
  "InfoSecNews",
  "blueteamsec",
  "AskNetsec",
  "ReverseEngineering",
  "malware",
  "exploitdev",
  "pwned",
  "sysadmin",
  "devops",
] as const;

const DEFAULT_REDDIT_SUBREDDITS = [
  "programming",
  "technology",
  "MachineLearning",
  "LocalLLaMA",
  "selfhosted",
  "rust",
  "typescript",
  "javascript",
  "python",
  ...SECURITY_REDDIT_SUBREDDITS,
] as const;
const NEWS_MESSAGE_TYPE = "news-feed-result";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_COMMENT_DEPTH = 3;
const MAX_COMMENT_COUNT = 100;

const NEWS_SOURCES = ["hackernews", "socket", "dailydev", "reddit", "all"] as const;
const CONCRETE_NEWS_SOURCES = ["hackernews", "socket", "dailydev", "reddit"] as const;
type ConcreteNewsSource = (typeof CONCRETE_NEWS_SOURCES)[number];
type NewsSource = (typeof NEWS_SOURCES)[number];

const HN_FEEDS = ["top", "new", "best", "ask", "show", "job"] as const;
type HnFeed = (typeof HN_FEEDS)[number];

type HnItem = {
  id: number;
  deleted?: boolean;
  type?: "job" | "story" | "comment" | "poll" | "pollopt";
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
};

type CommentNode = {
  id: number;
  by?: string;
  time?: number;
  text?: string;
  kids?: CommentNode[];
};

type NewsEntry = {
  source: "hackernews" | "socket" | "dailydev" | "reddit";
  id?: string | number;
  title: string;
  url: string;
  sourceUrl?: string;
  author?: string;
  score?: number;
  comments?: number;
  publishedAt?: string;
  summary?: string;
  feed?: string;
};

type SocketJsonFeed = {
  title?: string;
  home_page_url?: string;
  feed_url?: string;
  items?: Array<{
    id?: string;
    url?: string;
    external_url?: string;
    title?: string;
    content_text?: string;
    content_html?: string;
    summary?: string;
    date_published?: string;
    date_modified?: string;
    author?: { name?: string };
    authors?: Array<{ name?: string }>;
  }>;
};

type DailyDevPost = {
  id?: string;
  title?: string;
  url?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  commentsPermalink?: string;
  source?: { name?: string; handle?: string };
  tags?: string[];
  numUpvotes?: number;
  numComments?: number;
  author?: { name?: string | null } | null;
};

type DailyDevFeedResponse = {
  data?: DailyDevPost[];
};

type DailyDevGraphqlResponse = {
  data?: {
    latest?: DailyDevPost[];
  };
  errors?: Array<{ message?: string }>;
};

type RedditListingResponse = {
  error?: number | string;
  message?: string;
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        title?: string;
        author?: string;
        subreddit?: string;
        score?: number;
        num_comments?: number;
        url?: string;
        permalink?: string;
        created_utc?: number;
        selftext?: string;
        over_18?: boolean;
        stickied?: boolean;
      };
    }>;
  };
};

type RedditSort = "hot" | "new" | "top" | "rising";

type SetupUiContext = {
  ui: {
    input(title: string, placeholder?: string): Promise<string | undefined>;
    select(title: string, options: string[]): Promise<string | undefined>;
    notify(message: string, level?: "info" | "warning" | "error" | "success"): void;
  };
};

type EnvResolution = {
  value?: string;
  source?: string;
  path?: string;
};

type NewsMessageDetails = {
  source: NewsSource;
  entries: NewsEntry[];
  generatedAt: number;
};

const sourceSchema = Type.Union([Type.Literal("hackernews"), Type.Literal("socket"), Type.Literal("dailydev"), Type.Literal("reddit"), Type.Literal("all")]);
const hnFeedSchema = Type.Union([
  Type.Literal("top"),
  Type.Literal("new"),
  Type.Literal("best"),
  Type.Literal("ask"),
  Type.Literal("show"),
  Type.Literal("job"),
]);

const redditSortSchema = Type.Union([Type.Literal("hot"), Type.Literal("new"), Type.Literal("top"), Type.Literal("rising")]);

const NEWS_FEED_PARAMS = Type.Object({
  source: Type.Optional(sourceSchema, { description: "News source: hackernews, socket, dailydev, reddit, or all." }),
  feed: Type.Optional(hnFeedSchema, { description: "Hacker News feed when source is hackernews/all: top, new, best, ask, show, or job." }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: MAX_LIMIT, description: "Number of entries to return, max 50." })),
  subreddits: Type.Optional(Type.Array(Type.String(), { description: "Reddit subreddits to fetch when source is reddit/all. Defaults to tech subreddits." })),
  redditSort: Type.Optional(redditSortSchema, { description: "Reddit sort: hot, new, top, or rising." }),
});

const NEWS_SEC_PARAMS = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: MAX_LIMIT, description: "Number of security/CVE-relevant entries to return, max 50. Defaults to 20." })),
  redditSort: Type.Optional(redditSortSchema, { description: "Reddit sort for security subreddits: hot, new, top, or rising. Defaults to hot." }),
});

const ITEM_PARAMS = Type.Object({
  id: Type.Number({ minimum: 1, description: "Hacker News item ID." }),
  includeComments: Type.Optional(Type.Boolean({ description: "Whether to include a bounded comment tree for story items." })),
  maxDepth: Type.Optional(Type.Number({ minimum: 0, maximum: MAX_COMMENT_DEPTH, description: "Maximum comment depth, max 3." })),
  maxComments: Type.Optional(Type.Number({ minimum: 1, maximum: MAX_COMMENT_COUNT, description: "Maximum total comments to fetch, max 100." })),
});

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getGlobalEnvPath(): string {
  return join(homedir(), ".pi", "agent", ".env");
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1] ?? ""] = value.replace(/\\n/g, "\n");
  }
  return values;
}

function quoteEnvValue(value: string): string {
  return JSON.stringify(value);
}

function upsertEnvValue(filePath: string, key: string, value: string): void {
  let content = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const line = `${key}=${quoteEnvValue(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  content = pattern.test(content) ? content.replace(pattern, line) : `${content}${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { mode: 0o600 });
}

function resolveEnvValue(key: string): EnvResolution {
  const envValue = process.env[key]?.trim();
  if (envValue) return { value: envValue, source: "environment" };

  const globalEnvPath = getGlobalEnvPath();
  const globalValue = parseEnvFile(globalEnvPath)[key]?.trim();
  if (globalValue) return { value: globalValue, source: "Pi global .env", path: globalEnvPath };

  return {};
}

function hnFeedToEndpoint(feed: HnFeed): string {
  return feed === "top" ? "topstories" : `${feed}stories`;
}

function hnItemUrl(id: number): string {
  return `https://news.ycombinator.com/item?id=${id}`;
}

async function fetchUrlJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { "user-agent": "pi-news-feed/0.1 (+https://socket.dev)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function fetchHnJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return fetchUrlJson<T>(`${HN_BASE_URL}${path}`, signal);
}

async function fetchHnItem(id: number, signal?: AbortSignal): Promise<HnItem | null> {
  return fetchHnJson<HnItem | null>(`/item/${id}.json`, signal);
}

function htmlToText(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function summarizeHnStory(item: HnItem, feed: HnFeed): NewsEntry {
  return {
    source: "hackernews",
    feed,
    id: item.id,
    title: item.title ?? `(untitled item ${item.id})`,
    url: item.url ?? hnItemUrl(item.id),
    sourceUrl: hnItemUrl(item.id),
    author: item.by,
    score: item.score,
    comments: item.descendants,
    publishedAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
  };
}

async function fetchHnFeed(feed: HnFeed, limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  const ids = await fetchHnJson<number[]>(`/${hnFeedToEndpoint(feed)}.json`, signal);
  const items = await Promise.all(ids.slice(0, limit).map((id) => fetchHnItem(id, signal)));
  return items.filter((item): item is HnItem => !!item).map((item) => summarizeHnStory(item, feed));
}

async function fetchSocketFeed(limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  const feed = await fetchUrlJson<SocketJsonFeed>(SOCKET_FEED_URL, signal);
  return (feed.items ?? []).slice(0, limit).map((item) => ({
    source: "socket" as const,
    id: item.id,
    title: item.title ?? item.id ?? "Untitled Socket blog post",
    url: item.url ?? item.external_url ?? item.id ?? "https://socket.dev/blog",
    sourceUrl: item.url ?? item.external_url ?? item.id,
    author: item.author?.name ?? item.authors?.map((author) => author.name).filter(Boolean).join(", "),
    publishedAt: item.date_published ?? item.date_modified,
    summary: item.summary ?? htmlToText(item.content_html)?.slice(0, 280) ?? item.content_text?.slice(0, 280),
  }));
}

function mapDailyDevPosts(posts: DailyDevPost[], limit: number): NewsEntry[] {
  return posts.slice(0, limit).map((post) => ({
    source: "dailydev" as const,
    id: post.id,
    title: post.title ?? post.id ?? "Untitled daily.dev post",
    url: post.url ?? post.commentsPermalink ?? (post.id ? `https://app.daily.dev/posts/${post.id}` : "https://app.daily.dev/"),
    sourceUrl: post.commentsPermalink,
    author: post.author?.name ?? post.source?.name ?? post.source?.handle,
    score: post.numUpvotes,
    comments: post.numComments,
    publishedAt: post.publishedAt ?? post.createdAt,
    summary: post.summary ?? post.tags?.slice(0, 5).map((tag) => `#${tag}`).join(" "),
  }));
}

async function fetchDailyDevRestFeed(limit: number, token: string, signal?: AbortSignal): Promise<NewsEntry[]> {
  const url = `${DAILY_DEV_BASE_URL}/feeds/popular?limit=${encodeURIComponent(String(limit))}`;
  const response = await fetch(url, {
    signal,
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": "pi-news-feed/0.1 (+https://daily.dev)",
    },
  });
  if (!response.ok) throw new Error(`daily.dev API ${response.status} for /feeds/popular`);

  const feed = (await response.json()) as DailyDevFeedResponse;
  return mapDailyDevPosts(feed.data ?? [], limit);
}

async function fetchDailyDevGraphqlFeed(limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  // Best-effort unauthenticated fallback. This is daily.dev's internal GraphQL API,
  // not the supported Plus Public API, so the query may break if daily.dev changes it.
  const query = `
    query NewsFeedDailyDevFallback($pageSize: Int!, $latest: String!) {
      latest(params: { pageSize: $pageSize, page: 0, sortBy: "popularity", latest: $latest }) {
        id
        title
        url
        createdAt
        source { name handle }
        numUpvotes
        numComments
      }
    }
  `;
  const response = await fetch("https://api.daily.dev/graphql", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "user-agent": "pi-news-feed/0.1 (+https://daily.dev)",
    },
    body: JSON.stringify({
      query,
      variables: { pageSize: limit, latest: new Date().toISOString() },
    }),
  });
  if (!response.ok) throw new Error(`daily.dev GraphQL ${response.status} for latest feed`);

  const payload = (await response.json()) as DailyDevGraphqlResponse;
  if (payload.errors?.length) {
    throw new Error(`daily.dev GraphQL error: ${payload.errors.map((error) => error.message ?? "unknown").join("; ")}`);
  }
  return mapDailyDevPosts(payload.data?.latest ?? [], limit);
}

async function fetchDailyDevFeed(limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  const token = resolveEnvValue(DAILY_DEV_TOKEN_ENV).value;
  if (token) return fetchDailyDevRestFeed(limit, token, signal);
  return fetchDailyDevGraphqlFeed(limit, signal);
}

function buildRedditCookieHeader(): string {
  return [
    resolveEnvValue(REDDIT_SESSION_ENV).value ? `reddit_session=${resolveEnvValue(REDDIT_SESSION_ENV).value}` : "",
    resolveEnvValue(REDDIT_TOKEN_V2_ENV).value ? `token_v2=${resolveEnvValue(REDDIT_TOKEN_V2_ENV).value}` : "",
  ].filter(Boolean).join("; ");
}

function normalizeSubreddits(input: unknown): string[] {
  const raw = Array.isArray(input) && input.length > 0 ? input : [...DEFAULT_REDDIT_SUBREDDITS];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const sub = item.trim().replace(/^r\//i, "");
    if (!/^[A-Za-z0-9_]{2,21}$/.test(sub)) continue;
    const key = sub.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(sub);
  }
  return normalized.slice(0, 20);
}

async function fetchRedditJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const cookies = buildRedditCookieHeader();
  const response = await fetch(url, {
    signal,
    headers: {
      accept: "application/json",
      "user-agent": REDDIT_USER_AGENT,
      ...(cookies ? { cookie: cookies } : {}),
    },
  });
  if (!response.ok) throw new Error(`Reddit HTTP ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function fetchRedditSubredditFeed(subreddit: string, limit: number, sort: RedditSort, signal?: AbortSignal): Promise<NewsEntry[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${encodeURIComponent(String(limit))}`;
  const data = await fetchRedditJson<RedditListingResponse>(url, signal);
  if (data.error) throw new Error(`Reddit error for r/${subreddit}: ${data.error}${data.message ? ` - ${data.message}` : ""}`);

  return (data.data?.children ?? [])
    .map((child): NewsEntry | undefined => {
      const post = child.data;
      if (!post?.title || post.stickied) return undefined;
      const permalink = post.permalink ? `https://reddit.com${post.permalink}` : `https://www.reddit.com/r/${subreddit}`;
      return {
        source: "reddit",
        feed: `r/${post.subreddit ?? subreddit}/${sort}`,
        id: post.id,
        title: post.title,
        url: post.url || permalink,
        sourceUrl: permalink,
        author: post.author ? `u/${post.author}` : undefined,
        score: post.score,
        comments: post.num_comments,
        publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
        summary: post.selftext ? post.selftext.replace(/\s+/g, " ").trim().slice(0, 280) : undefined,
      };
    })
    .filter((entry): entry is NewsEntry => Boolean(entry));
}

async function fetchRedditFeed(limit: number, subredditsInput?: unknown, sort: RedditSort = "hot", signal?: AbortSignal): Promise<NewsEntry[]> {
  const subreddits = normalizeSubreddits(subredditsInput);
  if (subreddits.length === 0) return [];
  const limitPerSubreddit = Math.max(1, Math.ceil(limit / subreddits.length));
  const results = await Promise.allSettled(subreddits.map((subreddit) => fetchRedditSubredditFeed(subreddit, limitPerSubreddit, sort, signal)));
  const entries: NewsEntry[] = [];
  const failures: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") entries.push(...result.value);
    else failures.push(`r/${subreddits[i]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  }
  if (entries.length === 0 && failures.length > 0) throw new Error(`Reddit fetch failed: ${failures.join("; ")}`);
  return entries.sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0")).slice(0, limit);
}

function sourceLabel(source: NewsEntry["source"]): string {
  if (source === "hackernews") return "🟧 Hacker News";
  if (source === "socket") return "🛡️ Socket.dev Blog";
  if (source === "dailydev") return "🟦 daily.dev";
  if (source === "reddit") return "🟥 Reddit";
  return source;
}

function formatDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function truncateText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatEntry(entry: NewsEntry, index: number): string {
  const badges = [
    entry.feed ? `[${entry.feed}]` : undefined,
    entry.score === undefined ? undefined : `▲ ${entry.score}`,
    entry.comments === undefined ? undefined : `💬 ${entry.comments}`,
    entry.author ? `👤 ${entry.author}` : undefined,
    formatDate(entry.publishedAt) ? `🕒 ${formatDate(entry.publishedAt)}` : undefined,
  ].filter(Boolean).join("  ");
  const summary = truncateText(entry.summary, 220);
  return [
    ` ${String(index + 1).padStart(2, " ")}. ${entry.title}`,
    badges ? `     ${badges}` : undefined,
    `     🔗 ${entry.url}`,
    entry.sourceUrl && entry.sourceUrl !== entry.url ? `     🧭 ${entry.sourceUrl}` : undefined,
    summary ? `     📝 ${summary}` : undefined,
  ].filter(Boolean).join("\n");
}

function popularityRank(entry: NewsEntry): number {
  // Prefer explicit popularity signals when the source exposes them.
  // HN has score + comments; Socket's JSON feed currently has no popularity metric.
  if (entry.score !== undefined || entry.comments !== undefined) {
    return (entry.score ?? 0) * 1000 + (entry.comments ?? 0);
  }
  return Number.NEGATIVE_INFINITY;
}

function sortEntriesForDisplay(entries: NewsEntry[]): NewsEntry[] {
  return [...entries].sort((a, b) => {
    const popularityDelta = popularityRank(b) - popularityRank(a);
    if (popularityDelta !== 0) return popularityDelta;
    return Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0");
  });
}

function formatSection(sourceName: ConcreteNewsSource, entries: NewsEntry[]): string {
  const sortedEntries = sortEntriesForDisplay(entries);
  const label = sourceLabel(sourceName);
  const headerText = `${label} (${entries.length})`;
  const rule = "═".repeat(Math.max(24, headerText.length + 2));
  return [`╔${rule}╗`, `║ ${headerText.padEnd(rule.length - 1)}║`, `╚${rule}╝`, "", ...sortedEntries.map(formatEntry)].join("\n");
}

function formatNews(source: NewsSource, entries: NewsEntry[]): string {
  if (entries.length === 0) return `No ${source} news entries found.`;

  const sourceOrder = source === "all" ? CONCRETE_NEWS_SOURCES : CONCRETE_NEWS_SOURCES.filter((sourceName) => sourceName === source);
  const sections = sourceOrder.flatMap((sourceName) => {
    const sourceEntries = entries.filter((entry) => entry.source === sourceName);
    if (sourceEntries.length === 0) return [];
    return [formatSection(sourceName, sourceEntries)];
  });

  const total = entries.length;
  const title = source === "all" ? `🗞️  News Feed — ${total} stories across ${sections.length} sources` : `🗞️  News Feed — ${sourceLabel(source)} — ${total} stories`;
  return `${title}\n\n${sections.join("\n\n")}`;
}

function getEnabledNewsSources(): ConcreteNewsSource[] {
  return [...CONCRETE_NEWS_SOURCES];
}

async function fetchConcreteNewsFeed(source: ConcreteNewsSource, hnFeed: HnFeed, limit: number, redditSubreddits?: unknown, redditSort: RedditSort = "hot", signal?: AbortSignal): Promise<NewsEntry[]> {
  if (source === "hackernews") return fetchHnFeed(hnFeed, limit, signal);
  if (source === "socket") return fetchSocketFeed(limit, signal);
  if (source === "dailydev") return fetchDailyDevFeed(limit, signal);
  return fetchRedditFeed(limit, redditSubreddits, redditSort, signal);
}

function perSourceLimit(totalLimit: number, sourceCount: number): number {
  return Math.max(1, Math.floor(totalLimit / Math.max(1, sourceCount)));
}

async function fetchNewsFeed(source: NewsSource, hnFeed: HnFeed, limit: number, redditSubreddits?: unknown, redditSort: RedditSort = "hot", signal?: AbortSignal): Promise<NewsEntry[]> {
  if (source !== "all") return fetchConcreteNewsFeed(source, hnFeed, limit, redditSubreddits, redditSort, signal);

  const enabledSources = getEnabledNewsSources();
  const limitPerSource = perSourceLimit(limit, enabledSources.length);
  const results = await Promise.allSettled(
    enabledSources.map((sourceName) => fetchConcreteNewsFeed(sourceName, hnFeed, limitPerSource, redditSubreddits, redditSort, signal)),
  );
  const entries = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return entries
    .sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0"))
    .slice(0, limit);
}

async function fetchSecurityNews(limit: number, redditSort: RedditSort = "hot", signal?: AbortSignal): Promise<NewsEntry[]> {
  const redditLimit = Math.max(1, Math.ceil(limit * 0.75));
  const socketLimit = Math.max(1, limit - redditLimit);
  const [redditEntries, socketEntries] = await Promise.all([
    fetchRedditFeed(redditLimit, [...SECURITY_REDDIT_SUBREDDITS], redditSort, signal),
    fetchSocketFeed(socketLimit, signal),
  ]);
  return [...redditEntries, ...socketEntries]
    .sort((a, b) => {
      const popularityDelta = popularityRank(b) - popularityRank(a);
      if (popularityDelta !== 0 && Number.isFinite(popularityDelta)) return popularityDelta;
      return Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0");
    })
    .slice(0, limit);
}

function renderStyledNews(details: NewsMessageDetails, theme: any): Box {
  const sourceOrder = details.source === "all" ? CONCRETE_NEWS_SOURCES : CONCRETE_NEWS_SOURCES.filter((sourceName) => sourceName === details.source);
  const lines: string[] = [];
  const activeSections = sourceOrder.filter((sourceName) => details.entries.some((entry) => entry.source === sourceName));
  lines.push(theme.fg("accent", theme.bold(`🗞️  News Feed — ${details.entries.length} stories across ${activeSections.length} source${activeSections.length === 1 ? "" : "s"}`)));
  lines.push(theme.fg("dim", `Generated ${formatDate(new Date(details.generatedAt).toISOString()) ?? "now"}`));

  for (const sourceName of sourceOrder) {
    const sourceEntries = sortEntriesForDisplay(details.entries.filter((entry) => entry.source === sourceName));
    if (sourceEntries.length === 0) continue;

    lines.push("");
    lines.push(theme.fg("accent", theme.bold(`━━ ${sourceLabel(sourceName)} (${sourceEntries.length}) ${"━".repeat(18)}`)));

    sourceEntries.forEach((entry, index) => {
      const badges = [
        entry.feed ? theme.fg("dim", `[${entry.feed}]`) : undefined,
        entry.score === undefined ? undefined : theme.fg("success", `▲ ${entry.score}`),
        entry.comments === undefined ? undefined : theme.fg("warning", `💬 ${entry.comments}`),
        entry.author ? theme.fg("dim", `👤 ${entry.author}`) : undefined,
        formatDate(entry.publishedAt) ? theme.fg("dim", `🕒 ${formatDate(entry.publishedAt)}`) : undefined,
      ].filter(Boolean).join("  ");
      const summary = truncateText(entry.summary, 220);

      lines.push(`${theme.fg("dim", String(index + 1).padStart(2, " ") + ".")} ${theme.bold(entry.title)}`);
      if (badges) lines.push(`    ${badges}`);
      lines.push(`    ${theme.fg("accent", "🔗")} ${entry.url}`);
      if (entry.sourceUrl && entry.sourceUrl !== entry.url) lines.push(`    ${theme.fg("dim", "🧭")} ${theme.fg("dim", entry.sourceUrl)}`);
      if (summary) lines.push(`    ${theme.fg("dim", "📝")} ${summary}`);
      lines.push("");
    });
  }

  const box = new Box(1, 1, (text: string) => theme.bg("customMessageBg", text));
  box.addChild(new Text(lines.join("\n").trimEnd(), 0, 0));
  return box;
}

const REDDIT_COOKIE_INSTRUCTIONS = `How to get Reddit cookies:
1. Open https://www.reddit.com in a browser and log in.
2. Open DevTools (F12) → Application/Storage → Cookies → https://www.reddit.com.
3. Copy the value of the 'reddit_session' cookie.
4. Optional: copy the value of the 'token_v2' cookie.
5. Treat these like passwords; they authenticate your Reddit session.`;

async function setupDailyDev(ctx: SetupUiContext): Promise<void> {
  const existing = resolveEnvValue(DAILY_DEV_TOKEN_ENV);
  const action = existing.value
    ? await ctx.ui.select(`daily.dev API token is already configured via ${existing.source}.`, ["Replace token", "Show setup URL", "Cancel"])
    : "Replace token";

  if (action === "Show setup URL") {
    ctx.ui.notify("Create/manage token here: https://app.daily.dev/settings/api", "info");
    return;
  }
  if (action !== "Replace token") {
    ctx.ui.notify("News setup cancelled.", "warning");
    return;
  }

  const token = (await ctx.ui.input("daily.dev API token", "Paste your daily.dev Personal Access Token"))?.trim();
  if (!token) {
    ctx.ui.notify("News setup cancelled: no token entered.", "warning");
    return;
  }

  const filePath = getGlobalEnvPath();
  upsertEnvValue(filePath, DAILY_DEV_TOKEN_ENV, token);
  process.env[DAILY_DEV_TOKEN_ENV] = token;
  ctx.ui.notify(`daily.dev API token saved to ${filePath}`, "success");
}

async function setupReddit(ctx: SetupUiContext): Promise<void> {
  const existingSession = resolveEnvValue(REDDIT_SESSION_ENV);
  const existingTokenV2 = resolveEnvValue(REDDIT_TOKEN_V2_ENV);
  const action = existingSession.value
    ? await ctx.ui.select(`Reddit cookies are already configured via ${existingSession.source}.`, ["Replace cookies", "Show cookie instructions", "Cancel"])
    : await ctx.ui.select("Reddit setup", ["Enter cookies", "Show cookie instructions", "Cancel"]);

  if (action === "Show cookie instructions") {
    ctx.ui.notify(REDDIT_COOKIE_INSTRUCTIONS, "info");
    return;
  }
  if (action !== "Replace cookies" && action !== "Enter cookies") {
    ctx.ui.notify("Reddit setup cancelled.", "warning");
    return;
  }

  ctx.ui.notify(REDDIT_COOKIE_INSTRUCTIONS, "info");
  const redditSession = (await ctx.ui.input("Reddit reddit_session cookie", existingSession.value ? "Paste replacement reddit_session cookie" : "Paste reddit_session cookie value"))?.trim();
  if (!redditSession) {
    ctx.ui.notify("Reddit setup cancelled: reddit_session is required.", "warning");
    return;
  }

  const tokenV2 = (await ctx.ui.input("Reddit token_v2 cookie (optional)", existingTokenV2.value ? "Paste replacement token_v2 or leave blank to keep unset" : "Paste token_v2 cookie value, or leave blank"))?.trim();
  const filePath = getGlobalEnvPath();
  upsertEnvValue(filePath, REDDIT_SESSION_ENV, redditSession);
  process.env[REDDIT_SESSION_ENV] = redditSession;
  if (tokenV2) {
    upsertEnvValue(filePath, REDDIT_TOKEN_V2_ENV, tokenV2);
    process.env[REDDIT_TOKEN_V2_ENV] = tokenV2;
  }
  ctx.ui.notify(`Reddit cookies saved to ${filePath}. ${REDDIT_TOKEN_V2_ENV} ${tokenV2 ? "saved" : "left unset"}.`, "success");
}

async function runNewsSetup(ctx: SetupUiContext): Promise<void> {
  const choice = await ctx.ui.select("News setup", ["daily.dev API token", "Reddit cookies", "Show Reddit cookie instructions"]);
  if (choice === "daily.dev API token") return setupDailyDev(ctx);
  if (choice === "Reddit cookies") return setupReddit(ctx);
  if (choice === "Show Reddit cookie instructions") {
    ctx.ui.notify(REDDIT_COOKIE_INSTRUCTIONS, "info");
    return;
  }
  ctx.ui.notify("News setup cancelled.", "warning");
}

export default function newsFeedExtension(pi: ExtensionAPI) {
  pi.registerMessageRenderer(NEWS_MESSAGE_TYPE, (message, _options, theme) => {
    const details = message.details as NewsMessageDetails | undefined;
    if (!details) {
      const box = new Box(1, 1, (text: string) => theme.bg("customMessageBg", text));
      box.addChild(new Text(String(message.content ?? "No news details available."), 0, 0));
      return box;
    }
    return renderStyledNews(details, theme);
  });

  pi.registerTool({

    name: "news_feed",
    label: "News Feed",
    description: "Fetch news entries from Hacker News, Socket.dev Blog, Reddit tech subreddits, and configured authenticated sources like daily.dev.",
    promptSnippet: "Fetch news from Hacker News feeds, Socket.dev blog JSON feed, Reddit tech subreddits, and configured authenticated sources like daily.dev.",
    promptGuidelines: ["Use news_feed when the user asks for current Hacker News, Reddit, Socket.dev, security, supply-chain, or general news feed entries."],
    parameters: NEWS_FEED_PARAMS,
    async execute(_toolCallId, params, signal) {
      const source = (params.source ?? "all") as NewsSource;
      const feed = (params.feed ?? "top") as HnFeed;
      const limit = clampInteger(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
      const redditSort = (params.redditSort ?? "hot") as RedditSort;
      const entries = await fetchNewsFeed(source, feed, limit, params.subreddits, redditSort, signal);
      return {
        content: [{ type: "text", text: formatNews(source, entries) }],
        details: { source, feed, redditSort, subreddits: normalizeSubreddits(params.subreddits), limit, entries },
      };
    },
  });

  pi.registerTool({
    name: "news_sec",
    label: "Security News",
    description: "Fetch recent and popular security/CVE-relevant news from security Reddit subreddits and Socket.dev supply-chain posts.",
    promptSnippet: "Fetch security and CVE-relevant news from Reddit security communities and Socket.dev.",
    promptGuidelines: ["Use news_sec when the user asks for current security, CVE, vulnerability, exploit, malware, supply-chain, or incident news. Summarize the most important items and call out likely actionability for the user."],
    parameters: NEWS_SEC_PARAMS,
    async execute(_toolCallId, params, signal) {
      const limit = clampInteger(params.limit, 20, 1, MAX_LIMIT);
      const redditSort = (params.redditSort ?? "hot") as RedditSort;
      const entries = await fetchSecurityNews(limit, redditSort, signal);
      return {
        content: [{ type: "text", text: formatNews("all", entries) }],
        details: { source: "security", redditSort, subreddits: [...SECURITY_REDDIT_SUBREDDITS], limit, entries },
      };
    },
  });

  pi.registerCommand("news-setup", {
    description: "Configure optional news sources such as daily.dev tokens and Reddit cookies.",
    handler: async (_args, ctx) => {
      await runNewsSetup(ctx);
    },
  });

  pi.registerCommand("news", {
    description: "Fetch news: /news [hackernews|socket|dailydev|reddit|all] [limit] [top|new|best|ask|show|job|hot|rising] [subreddits=programming,rust]",
    handler: async (args, ctx) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const source = NEWS_SOURCES.includes(tokens[0] as NewsSource) ? (tokens.shift() as NewsSource) : "all";
      const limitTokenIndex = tokens.findIndex((token) => /^\d+$/.test(token));
      const limitInput = limitTokenIndex >= 0 ? Number(tokens.splice(limitTokenIndex, 1)[0]) : undefined;
      const feed = HN_FEEDS.includes(tokens[0] as HnFeed) ? (tokens.shift() as HnFeed) : "top";
      const redditSortToken = tokens.find((token) => ["hot", "new", "top", "rising"].includes(token));
      const redditSort = (redditSortToken ?? "hot") as RedditSort;
      const subredditsToken = tokens.find((token) => token.startsWith("subreddits="));
      const subreddits = subredditsToken ? subredditsToken.slice("subreddits=".length).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      const limit = clampInteger(limitInput, DEFAULT_LIMIT, 1, MAX_LIMIT);

      try {
        const entries = await fetchNewsFeed(source, feed, limit, subreddits, redditSort);
        pi.sendMessage({
          customType: NEWS_MESSAGE_TYPE,
          content: formatNews(source, entries),
          display: true,
          details: { source, entries, generatedAt: Date.now() } satisfies NewsMessageDetails,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Failed to fetch news: ${message}`, "error");
      }
    },
  });

  pi.registerCommand("news-sec", {
    description: "Fetch recent/popular security and CVE-relevant news: /news-sec [limit] [hot|new|top|rising]",
    handler: async (args, ctx) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const limitToken = tokens.find((token) => /^\d+$/.test(token));
      const sortToken = tokens.find((token) => ["hot", "new", "top", "rising"].includes(token));
      const limit = clampInteger(limitToken ? Number(limitToken) : 20, 20, 1, MAX_LIMIT);
      const redditSort = (sortToken ?? "hot") as RedditSort;

      try {
        const entries = await fetchSecurityNews(limit, redditSort);

        pi.sendMessage({
          customType: NEWS_MESSAGE_TYPE,
          content: formatNews("all", entries),
          display: true,
          details: { source: "all", entries, generatedAt: Date.now() } satisfies NewsMessageDetails,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Failed to fetch security news: ${message}`, "error");
      }
    },
  });

}
