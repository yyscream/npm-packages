import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type ExtensionWorkingIndicator = {
  update(message: string): void;
  stop(): void;
};

export type ExtensionWorkingIndicatorOptions = {
  id?: string;
  title?: string;
  placement?: "aboveEditor" | "belowEditor";
  intervalMs?: number;
  frames?: string[];
};

export type EnvResolution = {
  value?: string;
  source?: "environment" | "workspace .env" | "Pi global .env";
  path?: string;
};

export type SlugifyOptions = {
  maxLength?: number;
  fallback?: string;
};

export function getAgentDir(): string {
  const env = process.env.PI_CODING_AGENT_DIR?.trim();
  if (env) return path.resolve(env);
  return path.join(os.homedir(), ".pi", "agent");
}

export function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function resolvePathFromAgentDir(configuredPath: string): string {
  return path.isAbsolute(configuredPath) ? path.normalize(configuredPath) : path.resolve(getAgentDir(), configuredPath);
}

export function getPiDir(): string {
  return path.dirname(getAgentDir());
}

export function getAgentEnvPath(): string {
  return path.join(getAgentDir(), ".env");
}

export function getAgentSettingsPath(): string {
  return path.join(getAgentDir(), "settings.json");
}

export function getWorkspaceEnvPath(cwd = process.cwd()): string {
  return path.join(cwd, ".env");
}

export function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const values: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2] ?? "";
    const commentStart = value.search(/\s#/);
    if (commentStart >= 0) value = value.slice(0, commentStart);
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1] ?? ""] = value.replace(/\\n/g, "\n");
  }
  return values;
}

export function readEnvValue(filePath: string, key: string): string | undefined {
  return parseEnvFile(filePath)[key];
}

export function resolveEnvValue(key: string, options: { includeWorkspace?: boolean; cwd?: string } = {}): EnvResolution {
  const envValue = process.env[key]?.trim();
  if (envValue) return { value: envValue, source: "environment" };

  if (options.includeWorkspace) {
    const workspaceEnvPath = getWorkspaceEnvPath(options.cwd);
    const workspaceValue = readEnvValue(workspaceEnvPath, key)?.trim();
    if (workspaceValue) return { value: workspaceValue, source: "workspace .env", path: workspaceEnvPath };
  }

  const globalEnvPath = getAgentEnvPath();
  const globalValue = readEnvValue(globalEnvPath, key)?.trim();
  if (globalValue) return { value: globalValue, source: "Pi global .env", path: globalEnvPath };

  return {};
}

export function quoteEnvValue(value: string): string {
  return JSON.stringify(value);
}

export function upsertEnvValue(filePath: string, key: string, value: string): void {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const line = `${key}=${quoteEnvValue(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  content = pattern.test(content) ? content.replace(pattern, line) : `${content}${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? 80;
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return slug || options.fallback || "";
}

export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

export function estimateTokensFromCharCount(charCount: number): number {
  return Math.max(0, Math.round(charCount / 4));
}

export function estimatePromptInjectionTokens(systemPrompt: string): number {
  return estimateTokensFromCharCount(systemPrompt.length);
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createExtensionWorkingIndicator(ctx: any, initialMessage: string, options: ExtensionWorkingIndicatorOptions = {}): ExtensionWorkingIndicator {
  const id = options.id ?? "extension-working";
  const title = options.title ?? "Working";
  const frames = options.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const intervalMs = options.intervalMs ?? 100;
  const placement = options.placement ?? "aboveEditor";
  let frameIndex = 0;
  let message = initialMessage;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    const frame = frames[frameIndex % frames.length] ?? "•";
    frameIndex += 1;
    ctx?.ui?.setStatus?.(id, `${frame} ${message}`);
    ctx?.ui?.setWidget?.(id, [`${frame} ${title}… ${message}`], { placement });
  };

  render();
  const timer = setInterval(render, intervalMs);

  return {
    update(nextMessage: string) {
      message = nextMessage;
      render();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      ctx?.ui?.setStatus?.(id, undefined);
      ctx?.ui?.setWidget?.(id, undefined);
    },
  };
}

export async function withExtensionWorkingIndicator<T>(ctx: any, initialMessage: string, run: (indicator: ExtensionWorkingIndicator) => Promise<T>, options?: ExtensionWorkingIndicatorOptions): Promise<T> {
  const indicator = createExtensionWorkingIndicator(ctx, initialMessage, options);
  try {
    return await run(indicator);
  } finally {
    indicator.stop();
  }
}

export default function piUtilsExtension(_pi: ExtensionAPI): void {
  // Utility package: no runtime behavior.
}

// ---- Local wiki engine ----
import fsp from "node:fs/promises";

export type LocalWikiFormat = "markdown" | "html";

export interface LocalWikiSection {
  title: string;
  level: number;
  anchor: string;
  text: string;
}

export interface LocalWikiLink {
  title: string;
  path: string;
}

export interface LocalWikiPage {
  title: string;
  slug: string;
  path: string;
  source?: string;
  headings: string[];
  sections: LocalWikiSection[];
  links: LocalWikiLink[];
  text: string;
  mtimeMs: number;
}

export interface LocalWikiSearchResult {
  title: string;
  path: string;
  source?: string;
  score: number;
  matchedFields: string[];
  scoreExplanation: string[];
  snippet?: string;
}

export interface LocalWikiCacheMetadata {
  schemaVersion: number;
  docsPath: string;
  generatedAt: string;
  pageCount: number;
  newestMtimeMs: number;
  extra?: Record<string, unknown>;
}

export interface LocalWikiLoadedCache {
  pages: LocalWikiPage[];
  metadata: LocalWikiCacheMetadata;
}

export interface LocalWikiEngineConfig {
  displayName: string;
  docsPath: string;
  cacheDir: string;
  schemaVersion?: number;
  fileExtensions: RegExp;
  format: LocalWikiFormat;
  queryExpansions?: Record<string, string[]>;
  missingDocsMessage?: string;
  ignoredDirs?: string[];
  sourceName?: (filePath: string, docsPath: string) => string | undefined;
  metadataExtra?: () => Promise<Record<string, unknown>>;
  statusExtra?: () => Promise<Record<string, unknown>>;
  transformText?: (text: string, title: string, filePath: string) => string;
  titleFromHtml?: (html: string, filePath: string, fallback: string) => string;
}

export function createLocalWikiEngine(config: LocalWikiEngineConfig) {
  const schemaVersion = config.schemaVersion ?? 1;
  const pagesCache = path.join(config.cacheDir, "pages.json");
  const metadataCache = path.join(config.cacheDir, "metadata.json");
  const ignoredDirs = new Set([".git", "node_modules", "result", ...(config.ignoredDirs ?? [])]);
  const missingDocsMessage = config.missingDocsMessage ?? `Local ${config.displayName} docs are not available at ${config.docsPath}.`;

  async function localExists(filePath: string): Promise<boolean> {
    try { await fsp.access(filePath); return true; } catch { return false; }
  }

  async function listDocFiles(dir: string): Promise<string[]> {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (ignoredDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await listDocFiles(full));
      if (entry.isFile() && config.fileExtensions.test(entry.name)) files.push(full);
    }
    return files.sort();
  }

  async function available(): Promise<boolean> {
    try {
      const stat = await fsp.stat(config.docsPath);
      return stat.isDirectory() && (await listDocFiles(config.docsPath)).length > 0;
    } catch { return false; }
  }

  async function stats(): Promise<{ pageCount: number; newestMtimeMs: number }> {
    if (!await localExists(config.docsPath)) return { pageCount: 0, newestMtimeMs: 0 };
    const files = await listDocFiles(config.docsPath);
    let newestMtimeMs = 0;
    for (const file of files) newestMtimeMs = Math.max(newestMtimeMs, (await fsp.stat(file)).mtimeMs);
    return { pageCount: files.length, newestMtimeMs };
  }

  function titleFromPath(filePath: string): string {
    return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim();
  }

  function anchorFromHeading(raw: string): string {
    return raw.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function normalizeWhitespace(input: string): string {
    return input.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  }

  function stripMarkdownDecorators(input: string): string {
    return input.replace(/^#+\s*/, "").replace(/[*_`~]/g, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").trim();
  }

  function decodeEntities(input: string): string {
    const entityMap: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    return input
      .replace(/&#(x[0-9a-f]+|\d+);/gi, (m, value: string) => {
        const code = value.toLowerCase().startsWith("x") ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      })
      .replace(/&([a-z]+);/gi, (m, name: string) => entityMap[name.toLowerCase()] ?? m);
  }

  function stripTags(input: string): string {
    return decodeEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  }

  function markdownSections(markdown: string, fallbackTitle: string): LocalWikiSection[] {
    const sections: LocalWikiSection[] = [];
    let current: LocalWikiSection | undefined;
    for (const line of markdown.split(/\n/)) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const title = stripMarkdownDecorators(match[2]);
        if (title.toLowerCase() === "contents") continue;
        if (current) current.text = current.text.trim();
        current = { title, level: match[1].length, anchor: anchorFromHeading(title), text: "" };
        sections.push(current);
        continue;
      }
      if (current) current.text += `${line}\n`;
    }
    if (!current) sections.push({ title: fallbackTitle, level: 1, anchor: anchorFromHeading(fallbackTitle), text: markdown.trim() });
    else current.text = current.text.trim();
    return sections;
  }

  function htmlToText(html: string): string {
    let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    body = body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    body = body.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => `\n\n${"#".repeat(Number(tag.slice(1)))} ${stripTags(inner)}\n\n`);
    body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => `\n\n\`\`\`\n${stripTags(inner)}\n\`\`\`\n\n`);
    body = body.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => `\`${stripTags(inner)}\``);
    body = body.replace(/<li[^>]*>/gi, "\n- ").replace(/<br\s*\/?>/gi, "\n");
    body = body.replace(/<\/(p|div|section|article|table|tr|ul|ol|dl)>/gi, "\n");
    return normalizeWhitespace(decodeEntities(body.replace(/<[^>]+>/g, " ")));
  }

  function markdownTitle(markdown: string, filePath: string): string {
    return stripMarkdownDecorators(markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || titleFromPath(filePath));
  }

  function htmlTitle(html: string, filePath: string): string {
    const fallback = titleFromPath(filePath);
    return (config.titleFromHtml?.(html, filePath, fallback) ?? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")) || fallback;
  }

  function resolveLocalPath(currentFile: string, href: string): string | undefined {
    if (/^(https?:|mailto:|#)/i.test(href)) return undefined;
    const cleanHref = decodeEntities(href).split("#")[0].split("?")[0];
    if (!cleanHref) return undefined;
    const ext = config.format === "html" ? ".html" : ".md";
    const candidates = path.extname(cleanHref) ? [cleanHref] : [cleanHref + ext, `${cleanHref}.mdx`, `${cleanHref}.rst`, path.join(cleanHref, "index.md")];
    for (const candidate of candidates) {
      const resolved = path.normalize(path.resolve(path.dirname(currentFile), candidate));
      if (resolved.startsWith(config.docsPath)) return resolved;
    }
    return undefined;
  }

  function markdownLinks(markdown: string, currentFile: string): LocalWikiLink[] {
    const links = new Map<string, LocalWikiLink>();
    for (const match of markdown.matchAll(/\[([^\]]+)\]\(([^\)]+)\)/g)) {
      const resolved = resolveLocalPath(currentFile, match[2].trim());
      if (!resolved) continue;
      links.set(resolved, { title: stripMarkdownDecorators(match[1]) || titleFromPath(resolved), path: resolved });
    }
    return [...links.values()];
  }

  function htmlLinks(html: string, currentFile: string): LocalWikiLink[] {
    const links = new Map<string, LocalWikiLink>();
    for (const match of html.matchAll(/<a\s+[^>]*href=["']([^"'#?]+)(?:#[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const resolved = resolveLocalPath(currentFile, match[1]);
      if (!resolved) continue;
      links.set(resolved, { title: stripTags(match[2]) || titleFromPath(resolved), path: resolved });
    }
    return [...links.values()];
  }

  function parsePage(raw: string, filePath: string, mtimeMs: number): LocalWikiPage {
    const title = config.format === "html" ? htmlTitle(raw, filePath) : markdownTitle(raw, filePath);
    const baseText = config.format === "html" ? htmlToText(raw) : normalizeWhitespace(raw);
    const text = config.transformText?.(baseText, title, filePath) ?? baseText;
    const sections = markdownSections(text, title);
    return { title, slug: path.relative(config.docsPath, filePath).replace(config.fileExtensions, ""), path: filePath, source: config.sourceName?.(filePath, config.docsPath), headings: sections.map((s) => s.title), sections, links: config.format === "html" ? htmlLinks(raw, filePath) : markdownLinks(text, filePath), text, mtimeMs };
  }

  function limitText(text: string, maxChars = 12000): { text: string; truncated: boolean } {
    return text.length <= maxChars ? { text, truncated: false } : { text: `${text.slice(0, maxChars)}\n\n[truncated at ${maxChars} characters]`, truncated: true };
  }

  async function buildCache(): Promise<LocalWikiLoadedCache> {
    if (!await available()) throw new Error(missingDocsMessage);
    await fsp.mkdir(config.cacheDir, { recursive: true });
    const files = await listDocFiles(config.docsPath);
    const pages: LocalWikiPage[] = [];
    let newestMtimeMs = 0;
    for (const file of files) {
      const stat = await fsp.stat(file);
      newestMtimeMs = Math.max(newestMtimeMs, stat.mtimeMs);
      pages.push(parsePage(await fsp.readFile(file, "utf8"), file, stat.mtimeMs));
    }
    const metadata: LocalWikiCacheMetadata = { schemaVersion, docsPath: config.docsPath, generatedAt: new Date().toISOString(), pageCount: pages.length, newestMtimeMs, extra: await config.metadataExtra?.() };
    await fsp.writeFile(pagesCache, JSON.stringify(pages, null, 2));
    await fsp.writeFile(metadataCache, JSON.stringify(metadata, null, 2));
    return { pages, metadata };
  }

  async function cacheFresh(metadata: LocalWikiCacheMetadata): Promise<boolean> {
    const current = await stats();
    return metadata.schemaVersion === schemaVersion && metadata.docsPath === config.docsPath && metadata.pageCount === current.pageCount && metadata.newestMtimeMs === current.newestMtimeMs;
  }

  async function loadCache(): Promise<LocalWikiLoadedCache> {
    try {
      const [pagesRaw, metadataRaw] = await Promise.all([fsp.readFile(pagesCache, "utf8"), fsp.readFile(metadataCache, "utf8")]);
      const metadata = JSON.parse(metadataRaw) as LocalWikiCacheMetadata;
      if (await cacheFresh(metadata)) return { pages: JSON.parse(pagesRaw) as LocalWikiPage[], metadata };
    } catch {}
    return buildCache();
  }

  function normalizeQuery(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9_./+-]+/g, " ").trim();
  }

  function expandQuery(query: string): string[] {
    const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
    const expanded = new Set(tokens);
    for (const token of tokens) for (const extra of config.queryExpansions?.[token] ?? []) expanded.add(normalizeQuery(extra));
    return [...expanded].filter(Boolean);
  }

  function makeSnippet(text: string, tokens: string[], max = 280): string | undefined {
    const lower = text.toLowerCase();
    const index = tokens.map((t) => lower.indexOf(t.toLowerCase())).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (index === undefined) return undefined;
    const start = Math.max(0, index - Math.floor(max / 2));
    const snippet = text.slice(start, start + max).replace(/\s+/g, " ").trim();
    return `${start > 0 ? "…" : ""}${snippet}${start + max < text.length ? "…" : ""}`;
  }

  function scorePage(page: LocalWikiPage, tokens: string[]): LocalWikiSearchResult | undefined {
    const title = normalizeQuery(page.title);
    const slug = normalizeQuery(page.slug);
    const source = normalizeQuery(page.source ?? "");
    const headings = normalizeQuery(page.headings.join(" "));
    const text = normalizeQuery(page.text);
    let score = 0;
    const matchedFields = new Set<string>();
    const scoreExplanation: string[] = [];
    for (const token of tokens) {
      if (title.includes(token)) { score += 25; matchedFields.add("title"); scoreExplanation.push(`title matched '${token}'`); }
      if (slug.includes(token)) { score += 12; matchedFields.add("slug"); }
      if (source.includes(token)) { score += 8; matchedFields.add("source"); }
      if (headings.includes(token)) { score += 10; matchedFields.add("headings"); }
      const textMatches = text.split(token).length - 1;
      if (textMatches > 0) { score += Math.min(15, textMatches); matchedFields.add("text"); }
    }
    return score > 0 ? { title: page.title, path: page.path, source: page.source, score, matchedFields: [...matchedFields], scoreExplanation, snippet: makeSnippet(page.text, tokens) } : undefined;
  }

  function findPage(pages: LocalWikiPage[], pageRef: string): LocalWikiPage | undefined {
    const normalized = normalizeQuery(pageRef);
    return pages.find((p) => p.path === pageRef) ?? pages.find((p) => normalizeQuery(p.slug) === normalized) ?? pages.find((p) => normalizeQuery(p.title) === normalized) ?? pages.find((p) => normalizeQuery(p.slug).includes(normalized) || normalizeQuery(p.title).includes(normalized));
  }

  async function status() {
    const currentAvailable = await available();
    const currentStats = await stats();
    let cacheGeneratedAt: string | undefined;
    try { cacheGeneratedAt = (JSON.parse(await fsp.readFile(metadataCache, "utf8")) as LocalWikiCacheMetadata).generatedAt; } catch {}
    return { displayName: config.displayName, docsPath: config.docsPath, available: currentAvailable, pageCount: currentStats.pageCount, cacheGeneratedAt, ...(await config.statusExtra?.()) };
  }

  async function search(params: { query: string; limit?: number; includeSnippets?: boolean }) {
    const { pages } = await loadCache();
    const tokens = expandQuery(params.query);
    const limit = Math.max(1, Math.min(params.limit ?? 10, 50));
    const results = pages.map((p) => scorePage(p, tokens)).filter((x): x is LocalWikiSearchResult => Boolean(x)).sort((a, b) => b.score - a.score).slice(0, limit);
    return { query: params.query, expandedTokens: tokens, results: params.includeSnippets === false ? results.map(({ snippet, ...rest }) => rest) : results };
  }

  async function loadPage(pageRef: string): Promise<LocalWikiPage> {
    const cache = await loadCache();
    const page = findPage(cache.pages, pageRef);
    if (!page) throw new Error(`No ${config.displayName} page matched '${pageRef}'. Try a local wiki search first.`);
    return page;
  }

  async function read(params: { page: string; maxChars?: number }) {
    const page = await loadPage(params.page);
    const limited = limitText(page.text, params.maxChars ?? 20000);
    return { title: page.title, source: page.source, path: page.path, citation: `${page.path} — ${page.title}`, truncated: limited.truncated, text: limited.text };
  }

  async function sections(params: { page: string }) {
    const page = await loadPage(params.page);
    return { title: page.title, source: page.source, path: page.path, sections: page.sections.map((s) => ({ title: s.title, level: s.level, anchor: s.anchor })) };
  }

  async function extract(params: { page: string; section?: string; query?: string; maxChars?: number }) {
    const page = await loadPage(params.page);
    let matchedSections = page.sections;
    if (params.section) { const needle = normalizeQuery(params.section); matchedSections = matchedSections.filter((s) => normalizeQuery(s.title).includes(needle)); }
    if (params.query) {
      const tokens = expandQuery(params.query);
      matchedSections = matchedSections.map((section) => ({ section, score: tokens.reduce((sum, token) => sum + (normalizeQuery(`${section.title} ${section.text}`).includes(token) ? 1 : 0), 0) })).filter((i) => i.score > 0).sort((a, b) => b.score - a.score).map((i) => i.section);
    }
    if (!params.section && !params.query) matchedSections = matchedSections.slice(0, 5);
    const joined = matchedSections.map((s) => `${"#".repeat(Math.min(s.level, 6))} ${s.title}\n\n${s.text}`).join("\n\n");
    const limited = limitText(joined || page.text, params.maxChars ?? 12000);
    return { title: page.title, source: page.source, path: page.path, citation: `${page.path} — ${matchedSections.map((s) => s.title).join(", ") || page.title}`, matchedSections: matchedSections.map((s) => ({ title: s.title, level: s.level, anchor: s.anchor })), truncated: limited.truncated, text: limited.text };
  }

  async function related(params: { page: string; limit?: number }) {
    const page = await loadPage(params.page);
    const limit = Math.max(1, Math.min(params.limit ?? 10, 50));
    return { title: page.title, source: page.source, path: page.path, links: page.links.slice(0, limit) };
  }

  return { available, stats, buildCache, loadCache, status, search, read, sections, extract, related, expandQuery, listDocFiles };
}
