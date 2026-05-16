import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

interface HyprWikiPage {
  title: string;
  slug: string;
  path: string;
  headings: string[];
  sections: HyprWikiSection[];
  links: HyprWikiLink[];
  text: string;
  mtimeMs: number;
}

interface HyprWikiSection {
  title: string;
  level: number;
  anchor: string;
  text: string;
}

interface HyprWikiLink {
  title: string;
  path: string;
}

interface CacheMetadata {
  schemaVersion: number;
  repoPath: string;
  repoUrl: string;
  generatedAt: string;
  pageCount: number;
  newestMtimeMs: number;
  gitRevision?: string;
}

interface SearchResult {
  title: string;
  path: string;
  score: number;
  matchedFields: string[];
  scoreExplanation: string[];
  snippet?: string;
}

interface LoadedCache {
  pages: HyprWikiPage[];
  metadata: CacheMetadata;
}

const REPO_URL = "https://github.com/hyprwm/hyprland-wiki.git";
const REPO_PATH = path.join(os.homedir(), ".hyprwiki");
const CACHE_DIR = path.join(os.homedir(), ".cache", "pi", "hyprland-wiki-local");
const PAGES_CACHE = path.join(CACHE_DIR, "pages.json");
const METADATA_CACHE = path.join(CACHE_DIR, "metadata.json");
const SCHEMA_VERSION = 1;
const SETUP_COMMAND = "/hyprwiki-local-setup";
const CLONE_COMMAND = `git clone ${REPO_URL} ${REPO_PATH}`;
const MISSING_REPO_MESSAGE = `Local Hyprland Wiki repository is not available at ${REPO_PATH}. Run ${SETUP_COMMAND} to clone it (${CLONE_COMMAND}).`;

const QUERY_EXPANSIONS: Record<string, string[]> = {
  monitor: ["monitors", "hyprctl monitors", "workspace"],
  monitors: ["monitor", "hyprctl monitors", "workspace"],
  nvidia: ["NVIDIA", "env", "Wayland", "GBM"],
  keyboard: ["input", "kb_layout", "keybinds", "bind"],
  mouse: ["input", "cursor", "sensitivity"],
  touchpad: ["input", "gestures", "natural_scroll"],
  bind: ["keybinds", "binds", "dispatcher"],
  keybind: ["bind", "dispatcher", "hyprctl dispatch"],
  rules: ["windowrule", "windowrulev2", "workspace rules"],
  portal: ["xdg-desktop-portal-hyprland", "screenshare", "screen sharing"],
  screenshots: ["grim", "slurp", "portal", "screenshare"],
  crash: ["crashes", "debug", "logs", "coredump"],
  config: ["hyprland.conf", "variables", "keywords"],
  plugin: ["plugins", "hyprpm"],
  hyprpm: ["plugins", "plugin"],
};

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[], cwd?: string): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  return await new Promise((resolve) => {
    execFile(command, args, { cwd, timeout: 120000 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout, stderr, error: error instanceof Error ? error.message : undefined });
    });
  });
}

async function gitRevision(): Promise<string | undefined> {
  if (!await exists(path.join(REPO_PATH, ".git"))) return undefined;
  const result = await runCommand("git", ["rev-parse", "--short", "HEAD"], REPO_PATH);
  return result.ok ? result.stdout.trim() || undefined : undefined;
}

async function gitRemote(): Promise<string | undefined> {
  if (!await exists(path.join(REPO_PATH, ".git"))) return undefined;
  const result = await runCommand("git", ["remote", "get-url", "origin"], REPO_PATH);
  return result.ok ? result.stdout.trim() || undefined : undefined;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(full));
    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(full);
  }
  return files.sort();
}

async function repoAvailable(): Promise<boolean> {
  try {
    const stat = await fs.stat(REPO_PATH);
    if (!stat.isDirectory()) return false;
    return (await listMarkdownFiles(REPO_PATH)).length > 0;
  } catch {
    return false;
  }
}

async function corpusStats(): Promise<{ pageCount: number; newestMtimeMs: number }> {
  if (!await exists(REPO_PATH)) return { pageCount: 0, newestMtimeMs: 0 };
  const files = await listMarkdownFiles(REPO_PATH);
  let newestMtimeMs = 0;
  for (const file of files) newestMtimeMs = Math.max(newestMtimeMs, (await fs.stat(file)).mtimeMs);
  return { pageCount: files.length, newestMtimeMs };
}

function normalizeWhitespace(input: string): string {
  return input.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function titleFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim();
}

function anchorFromHeading(raw: string): string {
  return raw.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripMarkdownDecorators(input: string): string {
  return input.replace(/^#+\s*/, "").replace(/[*_`~]/g, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").trim();
}

function extractTitle(markdown: string, filePath: string): string {
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return stripMarkdownDecorators(firstHeading || titleFromPath(filePath));
}

function extractSections(markdown: string, fallbackTitle: string): HyprWikiSection[] {
  const lines = markdown.split(/\n/);
  const sections: HyprWikiSection[] = [];
  let current: HyprWikiSection | undefined;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (current) current.text = current.text.trim();
      const title = stripMarkdownDecorators(match[2]);
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

function resolveWikiPath(currentFile: string, href: string): string | undefined {
  if (/^(https?:|mailto:|#)/i.test(href)) return undefined;
  const cleanHref = href.split("#")[0].split("?")[0];
  if (!cleanHref) return undefined;
  const withExt = /\.mdx?$/i.test(cleanHref) ? cleanHref : `${cleanHref}.md`;
  const resolved = path.normalize(path.resolve(path.dirname(currentFile), withExt));
  return resolved.startsWith(REPO_PATH) ? resolved : undefined;
}

function extractLinks(markdown: string, currentFile: string): HyprWikiLink[] {
  const links = new Map<string, HyprWikiLink>();
  const re = /\[([^\]]+)\]\(([^\)]+)\)/g;
  for (const match of markdown.matchAll(re)) {
    const resolved = resolveWikiPath(currentFile, match[2].trim());
    if (!resolved) continue;
    const title = stripMarkdownDecorators(match[1]) || titleFromPath(resolved);
    links.set(resolved, { title, path: resolved });
  }
  return [...links.values()];
}

function parsePage(markdown: string, filePath: string, mtimeMs: number): HyprWikiPage {
  const title = extractTitle(markdown, filePath);
  const text = normalizeWhitespace(markdown);
  const sections = extractSections(text, title);
  return {
    title,
    slug: path.relative(REPO_PATH, filePath).replace(/\.mdx?$/i, ""),
    path: filePath,
    headings: sections.map((section) => section.title),
    sections,
    links: extractLinks(text, filePath),
    text,
    mtimeMs,
  };
}

function limitText(text: string, maxChars = 12000): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: `${text.slice(0, maxChars)}\n\n[truncated at ${maxChars} characters]`, truncated: true };
}

async function cacheIsFresh(): Promise<boolean> {
  if (!await exists(PAGES_CACHE) || !await exists(METADATA_CACHE)) return false;
  try {
    const metadata = JSON.parse(await fs.readFile(METADATA_CACHE, "utf8")) as CacheMetadata;
    if (metadata.schemaVersion !== SCHEMA_VERSION || metadata.repoPath !== REPO_PATH || metadata.repoUrl !== REPO_URL) return false;
    const stats = await corpusStats();
    return metadata.pageCount === stats.pageCount && metadata.newestMtimeMs >= stats.newestMtimeMs;
  } catch {
    return false;
  }
}

async function buildCache(): Promise<LoadedCache> {
  if (!await repoAvailable()) throw new Error(MISSING_REPO_MESSAGE);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const files = await listMarkdownFiles(REPO_PATH);
  const pages: HyprWikiPage[] = [];
  let newestMtimeMs = 0;
  for (const file of files) {
    const stat = await fs.stat(file);
    newestMtimeMs = Math.max(newestMtimeMs, stat.mtimeMs);
    pages.push(parsePage(await fs.readFile(file, "utf8"), file, stat.mtimeMs));
  }
  const metadata: CacheMetadata = {
    schemaVersion: SCHEMA_VERSION,
    repoPath: REPO_PATH,
    repoUrl: REPO_URL,
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    newestMtimeMs,
    gitRevision: await gitRevision(),
  };
  await fs.writeFile(PAGES_CACHE, JSON.stringify(pages));
  await fs.writeFile(METADATA_CACHE, JSON.stringify(metadata, null, 2));
  return { pages, metadata };
}

async function loadCache(force = false): Promise<LoadedCache> {
  if (!force && await cacheIsFresh()) {
    const [pagesRaw, metadataRaw] = await Promise.all([fs.readFile(PAGES_CACHE, "utf8"), fs.readFile(METADATA_CACHE, "utf8")]);
    return { pages: JSON.parse(pagesRaw), metadata: JSON.parse(metadataRaw) };
  }
  return buildCache();
}

async function status() {
  const available = await repoAvailable();
  const stats = await corpusStats();
  const fresh = await cacheIsFresh();
  let metadata: CacheMetadata | undefined;
  if (await exists(METADATA_CACHE)) {
    try { metadata = JSON.parse(await fs.readFile(METADATA_CACHE, "utf8")); } catch { metadata = undefined; }
  }
  return {
    repoPath: REPO_PATH,
    repoUrl: REPO_URL,
    repoPathExists: await exists(REPO_PATH),
    repoAvailable: available,
    setupCommand: SETUP_COMMAND,
    cloneCommand: CLONE_COMMAND,
    gitRemote: await gitRemote(),
    gitRevision: await gitRevision(),
    pageCount: stats.pageCount,
    newestMtimeMs: stats.newestMtimeMs,
    cacheDir: CACHE_DIR,
    cacheFresh: fresh,
    metadata,
  };
}

function safeDecode(input: string): string {
  try { return decodeURIComponent(input); } catch { return input; }
}

function normalizeQuery(input: string): string {
  return safeDecode(input).toLowerCase().replace(/[_/-]+/g, " ").replace(/[^a-z0-9.+\s-]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokensFor(input: string): string[] {
  return [...new Set(normalizeQuery(input).split(/\s+/).filter((token) => token.length >= 2))];
}

function expandQuery(query: string): string[] {
  const terms = new Set<string>([query, normalizeQuery(query)]);
  for (const token of tokensFor(query)) {
    terms.add(token);
    for (const expansion of QUERY_EXPANSIONS[token] ?? []) terms.add(expansion);
  }
  return [...terms].filter(Boolean);
}

function normalizedTitle(page: HyprWikiPage): string {
  return normalizeQuery(`${page.title} ${page.slug} ${path.basename(page.path, path.extname(page.path))}`);
}

function snippetFor(page: HyprWikiPage, terms: string[], maxChars = 500): string | undefined {
  const lower = page.text.toLowerCase();
  let best = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx >= 0 && (best < 0 || idx < best)) best = idx;
  }
  if (best < 0) return limitText(page.text, maxChars).text;
  const start = Math.max(0, best - Math.floor(maxChars / 3));
  return `${start > 0 ? "…" : ""}${page.text.slice(start, start + maxChars)}${start + maxChars < page.text.length ? "…" : ""}`.replace(/\s+/g, " ").trim();
}

function findPage(pages: HyprWikiPage[], pageRef: string): HyprWikiPage | undefined {
  const normalized = normalizeQuery(pageRef);
  if (path.isAbsolute(pageRef)) return pages.find((page) => page.path === pageRef);
  return pages.find((page) => normalizeQuery(page.title) === normalized)
    ?? pages.find((page) => normalizeQuery(page.slug) === normalized)
    ?? pages.find((page) => normalizeQuery(path.basename(page.path, path.extname(page.path))) === normalized)
    ?? pages.find((page) => normalizedTitle(page).includes(normalized));
}

function searchPages(pages: HyprWikiPage[], query: string, limit = 10, includeSnippets = true): { expandedTerms: string[]; results: SearchResult[] } {
  const expandedTerms = expandQuery(query);
  const queryNorm = normalizeQuery(query);
  const queryTokens = tokensFor(query);
  const expandedTokens = tokensFor(expandedTerms.join(" "));
  const results: SearchResult[] = [];

  for (const page of pages) {
    let score = 0;
    const matchedFields = new Set<string>();
    const scoreExplanation: string[] = [];
    const titleNorm = normalizedTitle(page);
    const titleOnlyNorm = normalizeQuery(page.title);
    const headingNorm = normalizeQuery(page.headings.join(" "));
    const bodyNorm = normalizeQuery(page.text);

    if (queryTokens.includes(titleOnlyNorm)) {
      score += 120;
      matchedFields.add("title");
      scoreExplanation.push("title equals query token +120");
    }
    if (titleNorm === queryNorm) {
      score += 100;
      matchedFields.add("title");
      scoreExplanation.push("exact title match +100");
    } else if (titleNorm.includes(queryNorm) && queryNorm) {
      score += 80;
      matchedFields.add("title");
      scoreExplanation.push("normalized title match +80");
    }

    for (const term of expandedTerms) {
      const termNorm = normalizeQuery(term);
      if (!termNorm) continue;
      if (headingNorm.includes(termNorm)) { score += 50; matchedFields.add("heading"); scoreExplanation.push(`heading match '${term}' +50`); }
      if (bodyNorm.includes(termNorm)) { score += 30; matchedFields.add("body"); scoreExplanation.push(`phrase body match '${term}' +30`); }
    }

    if (queryTokens.length > 0 && queryTokens.every((token) => bodyNorm.includes(token) || titleNorm.includes(token) || headingNorm.includes(token))) {
      score += 20;
      scoreExplanation.push("all query tokens present +20");
    }

    let overlap = 0;
    for (const token of expandedTokens) {
      if (titleNorm.includes(token)) { score += 4; overlap++; matchedFields.add("title"); }
      else if (headingNorm.includes(token)) { score += 3; overlap++; matchedFields.add("heading"); }
      else if (bodyNorm.includes(token)) { score += 1; overlap++; matchedFields.add("body"); }
    }
    if (overlap > 0) scoreExplanation.push(`partial/expanded token overlap +${overlap}`);

    if (score > 0) {
      results.push({
        title: page.title,
        path: page.path,
        score,
        matchedFields: [...matchedFields],
        scoreExplanation: scoreExplanation.slice(0, 8),
        snippet: includeSnippets ? snippetFor(page, expandedTerms) : undefined,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { expandedTerms, results: results.slice(0, Math.max(1, Math.min(limit, 50))) };
}

const searchParams = Type.Object({
  query: Type.String({ description: "Search query, e.g. 'monitor rules', 'nvidia', 'keybinds'" }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, description: "Maximum results" })),
  includeSnippets: Type.Optional(Type.Boolean()),
});

const readParams = Type.Object({
  page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }),
  maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })),
});

const sectionsParams = Type.Object({
  page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }),
});

const extractParams = Type.Object({
  page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }),
  section: Type.Optional(Type.String({ description: "Exact or partial section heading" })),
  query: Type.Optional(Type.String({ description: "Query to select relevant sections" })),
  maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })),
});

const relatedParams = Type.Object({
  page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
});

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function loadPage(pageRef: string) {
  const cache = await loadCache();
  const page = findPage(cache.pages, pageRef);
  if (!page) throw new Error(`Hyprland Wiki page not found: ${pageRef}`);
  return { cache, page };
}

async function executeStatus() {
  const current = await status();
  if (current.repoAvailable && !current.cacheFresh) await loadCache(true);
  const refreshed = await status();
  return { content: [{ type: "text" as const, text: jsonText(refreshed) }], details: refreshed };
}

async function executeSetup() {
  const gitCheck = await runCommand("git", ["--version"]);
  if (!gitCheck.ok) return { ok: false, message: `git is not available. Install git, then run: ${CLONE_COMMAND}`, details: gitCheck };

  const repoPathExists = await exists(REPO_PATH);
  const gitDirExists = await exists(path.join(REPO_PATH, ".git"));

  if (!repoPathExists) {
    await fs.mkdir(path.dirname(REPO_PATH), { recursive: true });
    const clone = await runCommand("git", ["clone", REPO_URL, REPO_PATH]);
    return {
      ok: clone.ok && await repoAvailable(),
      message: clone.ok ? `Cloned Hyprland Wiki to ${REPO_PATH}.` : `Could not clone Hyprland Wiki. Run manually: ${CLONE_COMMAND}`,
      details: clone,
    };
  }

  if (!gitDirExists) {
    const entries = await fs.readdir(REPO_PATH);
    if (entries.length === 0) {
      const clone = await runCommand("git", ["clone", REPO_URL, REPO_PATH]);
      return {
        ok: clone.ok && await repoAvailable(),
        message: clone.ok ? `Cloned Hyprland Wiki to existing empty directory ${REPO_PATH}.` : `Could not clone Hyprland Wiki. Run manually: ${CLONE_COMMAND}`,
        details: clone,
      };
    }
    return { ok: false, message: `${REPO_PATH} exists but is not an empty Git checkout. Move it aside or clone manually: ${CLONE_COMMAND}`, details: { repoPath: REPO_PATH, entries: entries.slice(0, 20) } };
  }

  const remote = await gitRemote();
  const update = await runCommand("git", ["pull", "--ff-only"], REPO_PATH);
  await loadCache(true).catch(() => undefined);
  return {
    ok: update.ok,
    message: update.ok ? `Updated Hyprland Wiki at ${REPO_PATH}.` : `Hyprland Wiki checkout exists, but git pull --ff-only failed.`,
    details: { remote, result: update, status: await status() },
  };
}

async function executeSearch(params: { query: string; limit?: number; includeSnippets?: boolean }) {
  const cache = await loadCache();
  const result = searchPages(cache.pages, params.query, params.limit ?? 10, params.includeSnippets ?? true);
  const payload = { query: params.query, ...result };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeRead(params: { page: string; maxChars?: number }) {
  const { page } = await loadPage(params.page);
  const limited = limitText(page.text, params.maxChars ?? 12000);
  const payload = { title: page.title, path: page.path, citation: `${page.path} — ${page.title}`, truncated: limited.truncated, text: limited.text };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeSections(params: { page: string }) {
  const { page } = await loadPage(params.page);
  const payload = { title: page.title, path: page.path, sections: page.sections.map((section) => ({ title: section.title, level: section.level, anchor: section.anchor })) };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeExtract(params: { page: string; section?: string; query?: string; maxChars?: number }) {
  const { page } = await loadPage(params.page);
  let sections = page.sections;
  if (params.section) {
    const needle = normalizeQuery(params.section);
    sections = sections.filter((section) => normalizeQuery(section.title).includes(needle));
  }
  if (params.query) {
    const queryTokens = normalizeQuery(params.query).split(/\s+/).filter(Boolean);
    sections = sections
      .map((section) => {
        const haystack = normalizeQuery(`${section.title} ${section.text}`);
        const score = queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
        return { section, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.section);
  }
  if (!params.section && !params.query) sections = sections.slice(0, 5);
  const joined = sections.map((section) => `${"#".repeat(Math.min(section.level, 6))} ${section.title}\n\n${section.text}`).join("\n\n");
  const limited = limitText(joined || page.text, params.maxChars ?? 12000);
  const payload = {
    title: page.title,
    path: page.path,
    citation: `${page.path} — ${sections.map((section) => section.title).join(", ") || page.title}`,
    matchedSections: sections.map((section) => ({ title: section.title, level: section.level, anchor: section.anchor })),
    truncated: limited.truncated,
    text: limited.text,
  };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeRelated(params: { page: string; limit?: number }) {
  const { page } = await loadPage(params.page);
  const limit = params.limit ?? 10;
  const payload = { title: page.title, path: page.path, links: page.links.slice(0, Math.max(1, Math.min(limit, 50))) };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

const HYPRLAND_PROMPT_RE = /\b(hyprland|hyprctl|hyprpm|hyprland\.conf|hyprlang|hypridle|hyprlock|hyprpaper|hyprpicker|hyprsunset|xdg-desktop-portal-hyprland|windowrulev2?|workspace rules?|waybar|wayland compositor|wlroots|monitors?|animations?|decoration|blur|layerrule|binds?|keybinds?|dispatchers?|hyprbars|hyprtrails)\b/i;

export default function hyprlandWikiLocalExtension(pi: ExtensionAPI) {
  pi.on?.("before_agent_start", async (event, ctx) => {
    const skillLoaded = event.systemPromptOptions.skills?.some((skill) => skill.name === "hyprland-local") ?? false;
    if (!skillLoaded && !HYPRLAND_PROMPT_RE.test(event.prompt ?? "")) return;

    if (!await repoAvailable()) {
      const warning = `${MISSING_REPO_MESSAGE} Aborting Hyprland Wiki-local lookup until setup is complete.`;
      ctx.ui.notify(warning, "warning");
      ctx.abort();
      return {
        message: { customType: "hyprwiki-local-missing-repo", content: warning, display: true },
        systemPrompt: `${event.systemPrompt}\n\nHyprland Wiki-local setup required: ${warning} Do not continue with Hyprland troubleshooting until the user runs ${SETUP_COMMAND}.`,
      };
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\nHyprland local documentation routing: This prompt appears related to Hyprland or its ecosystem. Use hyprwiki_search before web sources, then hyprwiki_extract for focused sections with local path citations. Prefer read-only diagnostics and ask before destructive changes.`,
    };
  });

  pi.registerCommand("hyprwiki-status", {
    description: "Show local Hyprland Wiki repository path, revision, page count, and cache freshness",
    handler: async (_args, ctx) => {
      const result = await executeStatus();
      ctx.ui.notify(result.content[0].text, "info");
    },
  });

  pi.registerCommand("hyprwiki-local-setup", {
    description: "Clone or update the official Hyprland Wiki repository at ~/.hyprwiki",
    handler: async (_args, ctx) => {
      const result = await executeSetup();
      ctx.ui.notify(result.message, result.ok ? "info" : "warning");
    },
  });

  pi.registerTool({
    name: "hyprwiki_search",
    label: "Hyprland Wiki Search",
    description: "Search local official Hyprland Wiki Markdown pages from ~/.hyprwiki.",
    promptSnippet: "Search local Hyprland Wiki pages before using web sources for Hyprland troubleshooting",
    promptGuidelines: [
      "Use hyprwiki_search first for Hyprland, Hyprland config, hyprctl, hyprpm, and Hyprland ecosystem questions before consulting web sources.",
      "Use hyprwiki_extract after hyprwiki_search to retrieve focused local Hyprland Wiki sections with citations.",
    ],
    parameters: searchParams,
    async execute(_toolCallId, params) { return executeSearch(params); },
  });

  pi.registerTool({
    name: "hyprwiki_read",
    label: "Hyprland Wiki Read",
    description: "Read a local Hyprland Wiki page as Markdown text with a local path citation.",
    promptSnippet: "Read local Hyprland Wiki page text by title, slug, or absolute local Markdown path",
    promptGuidelines: ["Use hyprwiki_read only when broad Hyprland Wiki page context is needed; prefer hyprwiki_extract for focused answers."],
    parameters: readParams,
    async execute(_toolCallId, params) { return executeRead(params); },
  });

  pi.registerTool({
    name: "hyprwiki_sections",
    label: "Hyprland Wiki Sections",
    description: "List headings/sections for a local Hyprland Wiki page.",
    promptSnippet: "List headings from a local Hyprland Wiki page",
    promptGuidelines: ["Use hyprwiki_sections to choose exact local Hyprland Wiki sections before extraction."],
    parameters: sectionsParams,
    async execute(_toolCallId, params) { return executeSections(params); },
  });

  pi.registerTool({
    name: "hyprwiki_extract",
    label: "Hyprland Wiki Extract",
    description: "Extract a named or query-relevant section from a local Hyprland Wiki page.",
    promptSnippet: "Extract focused local Hyprland Wiki sections by heading or query",
    promptGuidelines: ["Use hyprwiki_extract to cite exact local Hyprland Wiki sections in Hyprland troubleshooting answers."],
    parameters: extractParams,
    async execute(_toolCallId, params) { return executeExtract(params); },
  });

  pi.registerTool({
    name: "hyprwiki_related",
    label: "Hyprland Wiki Related",
    description: "Return local Hyprland Wiki pages linked from a given local Hyprland Wiki page.",
    promptSnippet: "Find locally linked Hyprland Wiki pages related to a page",
    promptGuidelines: ["Use hyprwiki_related when a Hyprland issue spans multiple subsystems such as monitors, input, keybinds, portals, NVIDIA, or plugins."],
    parameters: relatedParams,
    async execute(_toolCallId, params) { return executeRelated(params); },
  });
}
