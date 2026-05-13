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
const NEWS_MESSAGE_TYPE = "news-feed-result";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_COMMENT_DEPTH = 3;
const MAX_COMMENT_COUNT = 100;

const NEWS_SOURCES = ["hackernews", "socket", "dailydev", "all"] as const;
const CONCRETE_NEWS_SOURCES = ["hackernews", "socket", "dailydev"] as const;
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
  source: "hackernews" | "socket" | "dailydev";
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

const sourceSchema = Type.Union([Type.Literal("hackernews"), Type.Literal("socket"), Type.Literal("dailydev"), Type.Literal("all")]);
const hnFeedSchema = Type.Union([
  Type.Literal("top"),
  Type.Literal("new"),
  Type.Literal("best"),
  Type.Literal("ask"),
  Type.Literal("show"),
  Type.Literal("job"),
]);

const NEWS_FEED_PARAMS = Type.Object({
  source: Type.Optional(sourceSchema, { description: "News source: hackernews, socket, or all." }),
  feed: Type.Optional(hnFeedSchema, { description: "Hacker News feed when source is hackernews/all: top, new, best, ask, show, or job." }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: MAX_LIMIT, description: "Number of entries to return, max 50." })),
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

function sourceLabel(source: NewsEntry["source"]): string {
  if (source === "hackernews") return "🟧 Hacker News";
  if (source === "socket") return "🛡️ Socket.dev Blog";
  if (source === "dailydev") return "🟦 daily.dev";
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

async function fetchConcreteNewsFeed(source: ConcreteNewsSource, hnFeed: HnFeed, limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  if (source === "hackernews") return fetchHnFeed(hnFeed, limit, signal);
  if (source === "socket") return fetchSocketFeed(limit, signal);
  return fetchDailyDevFeed(limit, signal);
}

function perSourceLimit(totalLimit: number, sourceCount: number): number {
  return Math.max(1, Math.floor(totalLimit / Math.max(1, sourceCount)));
}

async function fetchNewsFeed(source: NewsSource, hnFeed: HnFeed, limit: number, signal?: AbortSignal): Promise<NewsEntry[]> {
  if (source !== "all") return fetchConcreteNewsFeed(source, hnFeed, limit, signal);

  const enabledSources = getEnabledNewsSources();
  const limitPerSource = perSourceLimit(limit, enabledSources.length);
  const results = await Promise.all(
    enabledSources.map((sourceName) => fetchConcreteNewsFeed(sourceName, hnFeed, limitPerSource, signal)),
  );
  return results.flat()
    .sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0"))
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

const SETUP_PROVIDERS = [
  {
    label: "daily.dev API token",
    envKey: DAILY_DEV_TOKEN_ENV,
    url: "https://app.daily.dev/settings/api",
    placeholder: "Paste your daily.dev Personal Access Token",
  },
] as const;

async function runNewsSetup(ctx: SetupUiContext): Promise<void> {
  const choice = await ctx.ui.select("News setup", SETUP_PROVIDERS.map((provider) => provider.label));
  const provider = SETUP_PROVIDERS.find((candidate) => candidate.label === choice);
  if (!provider) {
    ctx.ui.notify("News setup cancelled.", "warning");
    return;
  }

  const existing = resolveEnvValue(provider.envKey);
  const action = existing.value
    ? await ctx.ui.select(`${provider.label} is already configured via ${existing.source}.`, ["Replace token", "Show setup URL", "Cancel"])
    : "Replace token";

  if (action === "Show setup URL") {
    ctx.ui.notify(`Create/manage token here: ${provider.url}`, "info");
    return;
  }
  if (action !== "Replace token") {
    ctx.ui.notify("News setup cancelled.", "warning");
    return;
  }

  const token = (await ctx.ui.input(provider.label, provider.placeholder))?.trim();
  if (!token) {
    ctx.ui.notify("News setup cancelled: no token entered.", "warning");
    return;
  }

  const filePath = getGlobalEnvPath();
  upsertEnvValue(filePath, provider.envKey, token);
  process.env[provider.envKey] = token;
  ctx.ui.notify(`${provider.label} saved to ${filePath}`, "success");
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
    description: "Fetch news entries from Hacker News, Socket.dev Blog, and configured authenticated sources like daily.dev.",
    promptSnippet: "Fetch news from Hacker News feeds, Socket.dev blog JSON feed, and configured authenticated sources like daily.dev.",
    promptGuidelines: ["Use news_feed when the user asks for current Hacker News, Socket.dev, security, supply-chain, or general news feed entries."],
    parameters: NEWS_FEED_PARAMS,
    async execute(_toolCallId, params, signal) {
      const source = (params.source ?? "all") as NewsSource;
      const feed = (params.feed ?? "top") as HnFeed;
      const limit = clampInteger(params.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
      const entries = await fetchNewsFeed(source, feed, limit, signal);
      return {
        content: [{ type: "text", text: formatNews(source, entries) }],
        details: { source, feed, limit, entries },
      };
    },
  });

  pi.registerCommand("news-setup", {
    description: "Configure optional news sources such as daily.dev tokens.",
    handler: async (_args, ctx) => {
      await runNewsSetup(ctx);
    },
  });

  pi.registerCommand("news", {
    description: "Fetch news: /news [hackernews|socket|dailydev|all] [limit] [top|new|best|ask|show|job]",
    handler: async (args, ctx) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const source = NEWS_SOURCES.includes(tokens[0] as NewsSource) ? (tokens.shift() as NewsSource) : "all";
      const limitTokenIndex = tokens.findIndex((token) => /^\d+$/.test(token));
      const limitInput = limitTokenIndex >= 0 ? Number(tokens.splice(limitTokenIndex, 1)[0]) : undefined;
      const feed = HN_FEEDS.includes(tokens[0] as HnFeed) ? (tokens[0] as HnFeed) : "top";
      const limit = clampInteger(limitInput, DEFAULT_LIMIT, 1, MAX_LIMIT);

      try {
        const entries = await fetchNewsFeed(source, feed, limit);
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

}
