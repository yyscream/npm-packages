import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ---- src/types.ts ----
interface ArchWikiPage {
  title: string;
  slug: string;
  path: string;
  headings: string[];
  sections: ArchWikiSection[];
  links: ArchWikiLink[];
  text: string;
  mtimeMs: number;
}

interface ArchWikiSection {
  title: string;
  level: number;
  anchor: string;
  text: string;
}

interface ArchWikiLink {
  title: string;
  path: string;
}

interface CacheMetadata {
  schemaVersion: number;
  docsPath: string;
  generatedAt: string;
  pageCount: number;
  newestMtimeMs: number;
  archWikiDocsPackage?: string;
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
  pages: ArchWikiPage[];
  metadata: CacheMetadata;
}

// ---- src/constants.ts ----
const DOCS_PATH = "/usr/share/doc/arch-wiki/html/en";
const CACHE_DIR = path.join(os.homedir(), ".cache", "pi", "archwiki-local");
const PAGES_CACHE = path.join(CACHE_DIR, "pages.json");
const INDEX_CACHE = path.join(CACHE_DIR, "index.json");
const METADATA_CACHE = path.join(CACHE_DIR, "metadata.json");
const SCHEMA_VERSION = 1;
const INSTALL_COMMAND = "sudo pacman -S arch-wiki-docs";
const MISSING_DOCS_MESSAGE = `Local ArchWiki docs are not installed at ${DOCS_PATH}. Install them with: ${INSTALL_COMMAND}`;

const QUERY_EXPANSIONS: Record<string, string[]> = {
  dns: ["resolv.conf", "systemd-resolved", "resolvectl", "NetworkManager", "Domain name resolution"],
  wifi: ["wireless", "iwd", "wpa_supplicant", "NetworkManager"],
  wireless: ["wifi", "iwd", "wpa_supplicant", "NetworkManager"],
  boot: ["bootloader", "systemd-boot", "GRUB", "initramfs", "mkinitcpio"],
  audio: ["PipeWire", "ALSA", "WirePlumber", "PulseAudio"],
  sound: ["audio", "PipeWire", "ALSA", "WirePlumber", "PulseAudio"],
  gpu: ["NVIDIA", "AMDGPU", "Intel graphics", "Mesa", "Wayland", "Xorg"],
  aur: ["makepkg", "PKGBUILD", "paru", "yay", "Arch User Repository"],
  signature: ["pacman-key", "keyring", "package signing"],
  service: ["systemd unit", "systemctl", "journalctl"],
  bluetooth: ["BlueZ", "bluetoothctl", "controller"],
  snapshots: ["Btrfs", "Snapper", "Timeshift"],
  luks: ["dm-crypt", "cryptsetup", "initramfs", "mkinitcpio"],
  initramfs: ["mkinitcpio", "hooks", "boot"],
};

// ---- src/html.ts ----
const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_m, value: string) => {
      const code = value.toLowerCase().startsWith("x") ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITY_MAP[name.toLowerCase()] ?? m);
}

function stripTags(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function removeTagsPreserveLines(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, " "));
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function anchorFromHeading(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function htmlToText(html: string): string {
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  body = body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  body = body.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => {
    const level = Number(tag.slice(1));
    return `\n\n${"#".repeat(level)} ${stripTags(inner)}\n\n`;
  });
  body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => `\n\n\`\`\`\n${stripTags(inner)}\n\`\`\`\n\n`);
  body = body.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => `\`${stripTags(inner)}\``);
  body = body.replace(/<li[^>]*>/gi, "\n- ");
  body = body.replace(/<br\s*\/?>/gi, "\n");
  body = body.replace(/<\/(p|div|section|article|table|tr|ul|ol|dl)>/gi, "\n");
  return removeNavigationNoise(normalizeWhitespace(removeTagsPreserveLines(body).replace(/``` /g, "```\n")));
}

function extractTitle(html: string, filePath: string): string {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s*-\s*ArchWiki\s*$/i, "").trim();
  if (title) return title;
  return decodeURIComponent(path.basename(filePath, ".html")).replace(/_/g, " ");
}

function removeNavigationNoise(text: string): string {
  const noisy = new Set(["Jump to content", "Contents", "move to sidebar", "hide", "Beginning"]);
  return text.split(/\n/).filter((line) => {
    const trimmed = line.trim().replace(/^#+\s*/, "");
    return !noisy.has(trimmed);
  }).join("\n");
}

function trimBeforeTitle(text: string, title: string): string {
  const titleLower = title.toLowerCase();
  const lines = text.split(/\n/);
  const index = lines.findIndex((line) => line.replace(/^#+\s*/, "").trim().toLowerCase() === titleLower);
  return index > 0 ? lines.slice(index).join("\n") : text;
}

function extractSections(text: string): ArchWikiSection[] {
  const lines = text.split(/\n/);
  const sections: ArchWikiSection[] = [];
  let current: ArchWikiSection | undefined;
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (match[2].trim().toLowerCase() === "contents") continue;
      if (current) current.text = current.text.trim();
      current = { title: match[2].trim(), level: match[1].length, anchor: anchorFromHeading(match[2]), text: "" };
      sections.push(current);
      continue;
    }
    if (current) current.text += `${line}\n`;
  }
  if (current) current.text = current.text.trim();
  return sections;
}

function extractLinks(html: string): ArchWikiLink[] {
  const links = new Map<string, ArchWikiLink>();
  const re = /<a\s+[^>]*href=["']([^"'#?]+)(?:#[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const href = decodeEntities(match[1]);
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    if (!href.endsWith(".html")) continue;
    const resolved = path.normalize(path.join(DOCS_PATH, href));
    if (!resolved.startsWith(DOCS_PATH)) continue;
    const title = stripTags(match[2]) || decodeURIComponent(path.basename(resolved, ".html")).replace(/_/g, " ");
    links.set(resolved, { title, path: resolved });
  }
  return [...links.values()];
}

function parsePage(html: string, filePath: string, mtimeMs: number): ArchWikiPage {
  const title = extractTitle(html, filePath);
  const text = trimBeforeTitle(htmlToText(html), title);
  const sections = extractSections(text);
  return {
    title,
    slug: path.relative(DOCS_PATH, filePath).replace(/\.html$/i, ""),
    path: filePath,
    headings: sections.map((section) => section.title),
    sections,
    links: extractLinks(html),
    text,
    mtimeMs,
  };
}

function limitText(text: string, maxChars = 12000): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: `${text.slice(0, maxChars)}\n\n[truncated at ${maxChars} characters]`, truncated: true };
}

// ---- src/indexer.ts ----
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listHtmlFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(full));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files.sort();
}

async function docsInstalled(): Promise<boolean> {
  try {
    const stat = await fs.stat(DOCS_PATH);
    if (!stat.isDirectory()) return false;
    const files = await listHtmlFiles(DOCS_PATH);
    return files.length > 0;
  } catch {
    return false;
  }
}

async function corpusStats(): Promise<{ pageCount: number; newestMtimeMs: number }> {
  if (!await exists(DOCS_PATH)) return { pageCount: 0, newestMtimeMs: 0 };
  const files = await listHtmlFiles(DOCS_PATH);
  let newestMtimeMs = 0;
  for (const file of files) {
    const stat = await fs.stat(file);
    newestMtimeMs = Math.max(newestMtimeMs, stat.mtimeMs);
  }
  return { pageCount: files.length, newestMtimeMs };
}

async function packageVersion(): Promise<string | undefined> {
  try {
    const { execFile } = await import("node:child_process");
    return await new Promise((resolve) => {
      execFile("pacman", ["-Q", "arch-wiki-docs"], { timeout: 3000 }, (_err, stdout) => {
        const trimmed = stdout.trim();
        resolve(trimmed || undefined);
      });
    });
  } catch {
    return undefined;
  }
}

function tokenize(input: string): string[] {
  return [...new Set(input.toLowerCase().split(/[^a-z0-9.+_-]+/).filter((token) => token.length >= 2))];
}

function buildInvertedIndex(pages: ArchWikiPage[]) {
  const index: Record<string, number[]> = Object.create(null);
  pages.forEach((page, pageIndex) => {
    const tokens = tokenize(`${page.title} ${page.headings.join(" ")} ${page.text}`);
    for (const token of tokens) {
      (index[token] ??= []).push(pageIndex);
    }
  });
  return { schemaVersion: SCHEMA_VERSION, generatedAt: new Date().toISOString(), tokenCount: Object.keys(index).length, index };
}

async function cacheIsFresh(): Promise<boolean> {
  if (!await exists(PAGES_CACHE) || !await exists(METADATA_CACHE)) return false;
  try {
    const metadata = JSON.parse(await fs.readFile(METADATA_CACHE, "utf8")) as CacheMetadata;
    if (metadata.schemaVersion !== SCHEMA_VERSION || metadata.docsPath !== DOCS_PATH) return false;
    const stats = await corpusStats();
    return metadata.pageCount === stats.pageCount && metadata.newestMtimeMs >= stats.newestMtimeMs;
  } catch {
    return false;
  }
}

async function buildCache(): Promise<LoadedCache> {
  if (!await docsInstalled()) throw new Error(MISSING_DOCS_MESSAGE);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const files = await listHtmlFiles(DOCS_PATH);
  const pages: ArchWikiPage[] = [];
  let newestMtimeMs = 0;
  for (const file of files) {
    const stat = await fs.stat(file);
    newestMtimeMs = Math.max(newestMtimeMs, stat.mtimeMs);
    const html = await fs.readFile(file, "utf8");
    pages.push(parsePage(html, file, stat.mtimeMs));
  }
  const metadata: CacheMetadata = {
    schemaVersion: SCHEMA_VERSION,
    docsPath: DOCS_PATH,
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    newestMtimeMs,
    archWikiDocsPackage: await packageVersion(),
  };
  await fs.writeFile(PAGES_CACHE, JSON.stringify(pages));
  await fs.writeFile(METADATA_CACHE, JSON.stringify(metadata, null, 2));
  await fs.writeFile(INDEX_CACHE, JSON.stringify(buildInvertedIndex(pages)));
  return { pages, metadata };
}

async function loadCache(force = false): Promise<LoadedCache> {
  if (!force && await cacheIsFresh()) {
    const [pagesRaw, metadataRaw] = await Promise.all([
      fs.readFile(PAGES_CACHE, "utf8"),
      fs.readFile(METADATA_CACHE, "utf8"),
    ]);
    return { pages: JSON.parse(pagesRaw), metadata: JSON.parse(metadataRaw) };
  }
  return buildCache();
}

async function status() {
  const installed = await docsInstalled();
  const stats = await corpusStats();
  const fresh = await cacheIsFresh();
  let metadata: CacheMetadata | undefined;
  if (await exists(METADATA_CACHE)) {
    try { metadata = JSON.parse(await fs.readFile(METADATA_CACHE, "utf8")); } catch { metadata = undefined; }
  }
  return {
    docsPath: DOCS_PATH,
    docsPathExists: await exists(DOCS_PATH),
    docsInstalled: installed,
    installCommand: INSTALL_COMMAND,
    pageCount: stats.pageCount,
    newestMtimeMs: stats.newestMtimeMs,
    cacheDir: CACHE_DIR,
    cacheFresh: fresh,
    metadata,
    archWikiDocsPackage: metadata?.archWikiDocsPackage ?? await packageVersion(),
  };
}

// ---- src/search.ts ----
function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function normalizeQuery(input: string): string {
  return safeDecode(input)
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/[^a-z0-9.+\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensFor(input: string): string[] {
  return [...new Set(normalizeQuery(input).split(/\s+/).filter((token) => token.length >= 2))];
}

function expandQuery(query: string): string[] {
  const normalized = normalizeQuery(query);
  const terms = new Set<string>([query, normalized]);
  for (const token of tokensFor(query)) {
    terms.add(token);
    for (const expansion of QUERY_EXPANSIONS[token] ?? []) terms.add(expansion);
  }
  return [...terms].filter(Boolean);
}

function normalizedTitle(page: ArchWikiPage): string {
  return normalizeQuery(`${page.title} ${page.slug} ${path.basename(page.path, ".html")}`);
}

function snippetFor(page: ArchWikiPage, terms: string[], maxChars = 500): string | undefined {
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

function findPage(pages: ArchWikiPage[], pageRef: string): ArchWikiPage | undefined {
  const normalized = normalizeQuery(pageRef);
  if (path.isAbsolute(pageRef)) return pages.find((page) => page.path === pageRef);
  return pages.find((page) => normalizeQuery(page.title) === normalized)
    ?? pages.find((page) => normalizeQuery(page.slug) === normalized)
    ?? pages.find((page) => normalizeQuery(path.basename(page.path, ".html")) === normalized)
    ?? pages.find((page) => normalizedTitle(page).includes(normalized));
}

function searchPages(pages: ArchWikiPage[], query: string, limit = 10, includeSnippets = true): { expandedTerms: string[]; results: SearchResult[] } {
  const expandedTerms = expandQuery(query);
  const queryNorm = normalizeQuery(query);
  const queryTokens = tokensFor(query);
  const expandedTokens = tokensFor(expandedTerms.join(" "));
  const results: SearchResult[] = [];

  for (const page of pages) {
    let score = 0;
    const matchedFields = new Set<string>();
    const scoreExplanation: string[] = [];
    const titleOnlyNorm = normalizeQuery(page.title);
    const titleNorm = normalizedTitle(page);
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
      if (headingNorm.includes(termNorm)) {
        score += 50;
        matchedFields.add("heading");
        scoreExplanation.push(`heading match '${term}' +50`);
      }
      if (bodyNorm.includes(termNorm)) {
        score += 30;
        matchedFields.add("body");
        scoreExplanation.push(`phrase body match '${term}' +30`);
      }
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

// ---- src/tools.ts ----
const searchParams = Type.Object({
  query: Type.String({ description: "Search query, e.g. 'pacman invalid signature'" }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, description: "Maximum results" })),
  language: Type.Optional(Type.Literal("en")),
  includeSnippets: Type.Optional(Type.Boolean()),
});

const readParams = Type.Object({
  page: Type.String({ description: "ArchWiki page title, slug, or absolute local HTML path" }),
  maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })),
});

const sectionsParams = Type.Object({
  page: Type.String({ description: "ArchWiki page title, slug, or absolute local HTML path" }),
});

const extractParams = Type.Object({
  page: Type.String({ description: "ArchWiki page title, slug, or absolute local HTML path" }),
  section: Type.Optional(Type.String({ description: "Exact or partial section heading" })),
  query: Type.Optional(Type.String({ description: "Query to select relevant sections" })),
  maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })),
});

const relatedParams = Type.Object({
  page: Type.String({ description: "ArchWiki page title, slug, or absolute local HTML path" }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
});

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function loadPage(pageRef: string) {
  const cache = await loadCache();
  const page = findPage(cache.pages, pageRef);
  if (!page) throw new Error(`ArchWiki page not found: ${pageRef}`);
  return { cache, page };
}

async function executeStatus() {
  const current = await status();
  if (current.docsInstalled && !current.cacheFresh) await loadCache(true);
  const refreshed = await status();
  return {
    content: [{ type: "text" as const, text: jsonText(refreshed) }],
    details: refreshed,
  };
}

async function canRun(command: string, args: string[]): Promise<boolean> {
  try {
    const { execFile } = await import("node:child_process");
    return await new Promise((resolve) => {
      execFile(command, args, { timeout: 3000 }, (error) => resolve(!error));
    });
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  try {
    const { execFile } = await import("node:child_process");
    return await new Promise((resolve) => {
      execFile(command, args, { timeout: 120000 }, (error, stdout, stderr) => {
        resolve({ ok: !error, stdout, stderr, error: error instanceof Error ? error.message : undefined });
      });
    });
  } catch (error) {
    return { ok: false, stdout: "", stderr: "", error: error instanceof Error ? error.message : String(error) };
  }
}

async function packageUpdateAvailable(): Promise<string | undefined> {
  const result = await runCommand("pacman", ["-Qu", "arch-wiki-docs"]);
  return result.ok && result.stdout.trim() ? result.stdout.trim() : undefined;
}

async function installOrUpdatePackage(): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  if (isRoot) return runCommand("pacman", ["-S", "--needed", "arch-wiki-docs"]);
  if (await canRun("sudo", ["-n", "true"])) return runCommand("sudo", ["-n", "pacman", "-S", "--needed", "arch-wiki-docs"]);
  return { ok: false, stdout: "", stderr: "", error: "Automatic install/update requires root or passwordless sudo." };
}

async function executeSetup() {
  if (!await canRun("pacman", ["--version"])) {
    return { ok: false, message: `pacman is not available. Please install local ArchWiki docs manually: ${INSTALL_COMMAND}` };
  }

  if (await docsInstalled()) {
    const current = await status();
    const update = await packageUpdateAvailable();
    if (!update) {
      return { ok: true, message: `arch-wiki-docs is installed and no update is reported by pacman (${current.archWikiDocsPackage ?? "package version unknown"}).`, details: current };
    }

    const result = await installOrUpdatePackage();
    const refreshed = await status();
    return {
      ok: result.ok,
      message: result.ok
        ? `Updated arch-wiki-docs. Previous pending update: ${update}`
        : `arch-wiki-docs has an available update (${update}), but automatic update is not possible. Run: ${INSTALL_COMMAND}`,
      details: { update, result, status: refreshed },
    };
  }

  const result = await installOrUpdatePackage();
  return {
    ok: result.ok && await docsInstalled(),
    message: result.ok ? "Installed arch-wiki-docs via pacman." : `Could not install arch-wiki-docs automatically. Run: ${INSTALL_COMMAND}`,
    details: result,
  };
}

async function executeSearch(params: { query: string; limit?: number; language?: "en"; includeSnippets?: boolean }) {
  const cache = await loadCache();
  const result = searchPages(cache.pages, params.query, params.limit ?? 10, params.includeSnippets ?? true);
  const payload = { query: params.query, language: params.language ?? "en", ...result };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeRead(params: { page: string; maxChars?: number }) {
  const { page } = await loadPage(params.page);
  const limited = limitText(page.text, params.maxChars ?? 12000);
  const payload = {
    title: page.title,
    path: page.path,
    citation: `${page.path} — ${page.title}`,
    truncated: limited.truncated,
    text: limited.text,
  };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeSections(params: { page: string }) {
  const { page } = await loadPage(params.page);
  const payload = {
    title: page.title,
    path: page.path,
    sections: page.sections.map((section) => ({ title: section.title, level: section.level, anchor: section.anchor })),
  };
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
  const maxChars = params.maxChars ?? 12000;
  const joined = sections.map((section) => `## ${section.title}\n\n${section.text}`).join("\n\n");
  const limited = limitText(joined || page.text, maxChars);
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
  const payload = {
    title: page.title,
    path: page.path,
    links: page.links.filter((link) => link.path.startsWith(DOCS_PATH)).slice(0, Math.max(1, Math.min(limit, 50))),
  };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

// ---- index.ts ----
const ARCH_LINUX_PROMPT_RE = /\b(arch\s*linux|archlinux|arch-based|endeavouros|endeavour\s*os|cachyos|cachy\s*os|manjaro|garuda|artix|blackarch|arcolinux|archlabs|rebornos|crystal\s*linux|xerolinux|pacman|makepkg|pkgbuild|aur|mkinitcpio|initramfs|systemd|journalctl|systemctl|networkmanager|resolvectl|systemd-resolved|pipewire|wireplumber|alsa|wayland|xorg|nvidia|amdgpu|bluetooth|bluez|btrfs|luks|dm-crypt|pacman-key|keyring|invalid signature|corrupted package)\b/i;

function archWikiLocalExtension(pi: ExtensionAPI) {
  pi.on?.("before_agent_start", async (event, ctx) => {
    const skillLoaded = event.systemPromptOptions.skills?.some((skill) => skill.name === "arch-linux-local") ?? false;
    if (!skillLoaded && !ARCH_LINUX_PROMPT_RE.test(event.prompt ?? "")) return;

    if (!await docsInstalled()) {
      const warning = `${MISSING_DOCS_MESSAGE}. Aborting ArchWiki-local troubleshooting until the docs are installed. You can also run /archwiki-local-setup.`;
      ctx.ui.notify(warning, "warning");
      ctx.abort();
      return {
        message: {
          customType: "archwiki-local-missing-docs",
          content: warning,
          display: true,
        },
        systemPrompt: `${event.systemPrompt}\n\nArchWiki-local setup required: ${warning} Do not continue with ArchWiki-local troubleshooting until the user installs arch-wiki-docs.`,
      };
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\nArch/Arch-based local documentation routing: This user prompt appears related to Arch Linux, an Arch-based distro, or Linux troubleshooting that commonly maps to ArchWiki. Use archwiki_search before web sources, then archwiki_extract for focused sections. If the distro is EndeavourOS or CachyOS, prioritize that distro context after local ArchWiki; otherwise detect the distro with read-only evidence before assuming vanilla Arch behavior. Cite local ArchWiki paths separately from observed system evidence. Prefer read-only diagnostics and ask before destructive changes.`, 
    };
  });

  pi.registerCommand("archwiki-status", {
    description: "Show local ArchWiki docs path, page count, package version, and cache freshness",
    handler: async (_args, ctx) => {
      const result = await executeStatus();
      ctx.ui.notify(result.content[0].text, "info");
    },
  });

  pi.registerCommand("archwiki-local-setup", {
    description: "Install the local ArchWiki documentation package (arch-wiki-docs) when possible",
    handler: async (_args, ctx) => {
      const result = await executeSetup();
      ctx.ui.notify(result.message, result.ok ? "info" : "warning");
    },
  });

  pi.registerTool({
    name: "archwiki_search",
    label: "ArchWiki Search",
    description: "Search installed local English ArchWiki pages from arch-wiki-docs.",
    promptSnippet: "Search local ArchWiki pages before using web sources for Arch/Linux troubleshooting",
    promptGuidelines: [
      "Use archwiki_search first for Arch Linux and Linux troubleshooting questions before consulting web sources.",
      "Use archwiki_extract after archwiki_search to retrieve focused local ArchWiki sections with citations.",
    ],
    parameters: searchParams,
    async execute(_toolCallId, params) {
      return executeSearch(params);
    },
  });

  pi.registerTool({
    name: "archwiki_read",
    label: "ArchWiki Read",
    description: "Read a local ArchWiki page as clean text with a local path citation.",
    promptSnippet: "Read clean local ArchWiki page text by title, slug, or absolute local path",
    promptGuidelines: ["Use archwiki_read only when broad ArchWiki page context is needed; prefer archwiki_extract for focused answers."],
    parameters: readParams,
    async execute(_toolCallId, params) {
      return executeRead(params);
    },
  });

  pi.registerTool({
    name: "archwiki_sections",
    label: "ArchWiki Sections",
    description: "List headings/sections for a local ArchWiki page.",
    promptSnippet: "List headings from a local ArchWiki page",
    promptGuidelines: ["Use archwiki_sections to choose exact local ArchWiki sections before extraction."],
    parameters: sectionsParams,
    async execute(_toolCallId, params) {
      return executeSections(params);
    },
  });

  pi.registerTool({
    name: "archwiki_extract",
    label: "ArchWiki Extract",
    description: "Extract a named or query-relevant section from a local ArchWiki page.",
    promptSnippet: "Extract focused local ArchWiki sections by heading or query",
    promptGuidelines: ["Use archwiki_extract to cite exact local ArchWiki sections in Arch/Linux troubleshooting answers."],
    parameters: extractParams,
    async execute(_toolCallId, params) {
      return executeExtract(params);
    },
  });

  pi.registerTool({
    name: "archwiki_related",
    label: "ArchWiki Related",
    description: "Return local ArchWiki pages linked from a given local ArchWiki page.",
    promptSnippet: "Find locally linked ArchWiki pages related to a page",
    promptGuidelines: ["Use archwiki_related when an Arch/Linux issue spans multiple subsystems such as DNS, networking, systemd, audio, or boot."],
    parameters: relatedParams,
    async execute(_toolCallId, params) {
      return executeRelated(params);
    },
  });
}

export default archWikiLocalExtension;
