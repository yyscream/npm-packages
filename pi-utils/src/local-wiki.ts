import path from "node:path";
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
  searchStopwords?: Iterable<string>;
  termWeights?: Record<string, number>;
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
  const searchStopwords = new Set([...(config.searchStopwords ?? [])].map((word) => normalizeQuery(word)).filter(Boolean));

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
    return input
      .replace(/^#+\s*/, "")
      .replace(/\s*\{#[^}]+\}\s*$/g, "")
      .replace(/[*_`~]/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .trim();
  }

  function stripYamlFrontmatter(markdown: string): string {
    return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
  }

  function yamlFrontmatterTitle(markdown: string): string | undefined {
    const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    const raw = frontmatter?.[1]?.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
    return raw ? stripMarkdownDecorators(raw) : undefined;
  }

  function firstMarkdownHeading(markdown: string): string | undefined {
    let inFence = false;
    for (const line of stripYamlFrontmatter(markdown).split(/\n/)) {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^#\s+(.+)$/);
      if (match) return match[1].trim();
    }
    return undefined;
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
    const body = stripYamlFrontmatter(markdown);
    const sections: LocalWikiSection[] = [];
    let current: LocalWikiSection | undefined;
    let inFence = false;
    for (const line of body.split(/\n/)) {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        if (current) current.text += `${line}\n`;
        continue;
      }
      const match = !inFence ? line.match(/^(#{1,6})\s+(.+)$/) : undefined;
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
    if (!current) sections.push({ title: fallbackTitle, level: 1, anchor: anchorFromHeading(fallbackTitle), text: body.trim() });
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
    return stripMarkdownDecorators(yamlFrontmatterTitle(markdown) || firstMarkdownHeading(markdown) || titleFromPath(filePath));
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
    const markdownBody = config.format === "html" ? raw : stripYamlFrontmatter(raw);
    const baseText = config.format === "html" ? htmlToText(raw) : normalizeWhitespace(markdownBody);
    const text = config.transformText?.(baseText, title, filePath) ?? baseText;
    const sections = markdownSections(text, title);
    return { title, slug: path.relative(config.docsPath, filePath).replace(config.fileExtensions, ""), path: filePath, source: config.sourceName?.(filePath, config.docsPath), headings: sections.map((s) => s.title), sections, links: config.format === "html" ? htmlLinks(raw, filePath) : markdownLinks(markdownBody, filePath), text, mtimeMs };
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
    const tokens = normalizeQuery(query).split(/\s+/).filter((token) => token && !searchStopwords.has(token));
    const expanded = new Set(tokens);
    for (const token of tokens) {
      for (const extra of config.queryExpansions?.[token] ?? []) {
        const normalized = normalizeQuery(extra);
        if (normalized && !searchStopwords.has(normalized)) expanded.add(normalized);
      }
    }
    return [...expanded].filter(Boolean);
  }

  function tokenWeight(token: string): number {
    return config.termWeights?.[token] ?? 1;
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
      const weight = tokenWeight(token);
      if (title.includes(token)) { score += 25 * weight; matchedFields.add("title"); scoreExplanation.push(`title matched '${token}'`); }
      if (slug.includes(token)) { score += 12 * weight; matchedFields.add("slug"); }
      if (source.includes(token)) { score += 8 * weight; matchedFields.add("source"); }
      if (headings.includes(token)) { score += 10 * weight; matchedFields.add("headings"); }
      const textMatches = text.split(token).length - 1;
      if (textMatches > 0) { score += Math.min(15, textMatches) * weight; matchedFields.add("text"); }
    }
    return score > 0 ? { title: page.title, path: page.path, source: page.source, score: Number(score.toFixed(2)), matchedFields: [...matchedFields], scoreExplanation, snippet: makeSnippet(page.text, tokens) } : undefined;
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
    const limit = Math.max(1, Math.min(params.limit ?? 8, 50));
    const results = pages.map((p) => scorePage(p, tokens)).filter((x): x is LocalWikiSearchResult => Boolean(x)).sort((a, b) => b.score - a.score).slice(0, limit);
    return { query: params.query, expandedTokens: tokens, results: params.includeSnippets === true ? results : results.map(({ snippet, ...rest }) => rest) };
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

  async function sections(params: { page: string; maxSections?: number }) {
    const page = await loadPage(params.page);
    const maxSections = Math.max(1, Math.min(params.maxSections ?? 80, 300));
    const selected = page.sections.slice(0, maxSections);
    return { title: page.title, source: page.source, path: page.path, sectionCount: page.sections.length, omittedSectionCount: Math.max(0, page.sections.length - selected.length), sections: selected.map((s) => ({ title: s.title, level: s.level, anchor: s.anchor })) };
  }

  async function extract(params: { page: string; section?: string; query?: string; maxChars?: number; maxSections?: number }) {
    const page = await loadPage(params.page);
    let matchedSections = page.sections;
    if (params.section) { const needle = normalizeQuery(params.section); matchedSections = matchedSections.filter((s) => normalizeQuery(s.title).includes(needle)); }
    if (params.query) {
      const tokens = expandQuery(params.query);
      matchedSections = matchedSections.map((section) => ({ section, score: tokens.reduce((sum, token) => sum + (normalizeQuery(`${section.title} ${section.text}`).includes(token) ? tokenWeight(token) : 0), 0) })).filter((i) => i.score > 0).sort((a, b) => b.score - a.score).map((i) => i.section);
    }
    const maxSections = Math.max(1, Math.min(params.maxSections ?? (params.section || params.query ? 6 : 5), 50));
    const totalMatchedSections = matchedSections.length;
    matchedSections = matchedSections.slice(0, maxSections);
    const joined = matchedSections.map((s) => `${"#".repeat(Math.min(s.level, 6))} ${s.title}\n\n${s.text}`).join("\n\n");
    const limited = limitText(joined || page.text, params.maxChars ?? 10000);
    return { title: page.title, source: page.source, path: page.path, citation: `${page.path} — ${matchedSections.map((s) => s.title).join(", ") || page.title}`, matchedSections: matchedSections.map((s) => ({ title: s.title, level: s.level, anchor: s.anchor })), totalMatchedSections, omittedSectionCount: Math.max(0, totalMatchedSections - matchedSections.length), truncated: limited.truncated, text: limited.text };
  }

  async function related(params: { page: string; limit?: number }) {
    const page = await loadPage(params.page);
    const limit = Math.max(1, Math.min(params.limit ?? 10, 50));
    return { title: page.title, source: page.source, path: page.path, links: page.links.slice(0, limit) };
  }

  return { available, stats, buildCache, loadCache, status, search, read, sections, extract, related, expandQuery, listDocFiles };
}
