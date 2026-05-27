import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

type DocFormat = "markdown" | "asciidoc" | "html";

interface WikiPage {
  title: string;
  slug: string;
  path: string;
  headings: string[];
  sections: WikiSection[];
  links: WikiLink[];
  text: string;
  mtimeMs: number;
}

interface WikiSection {
  title: string;
  level: number;
  anchor: string;
  text: string;
}

interface WikiLink {
  title: string;
  path: string;
}

interface CacheMetadata {
  schemaVersion: number;
  docsPath: string;
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
  pages: WikiPage[];
  metadata: CacheMetadata;
}

const CONFIG = {
  extensionId: "raspberrypi",
  displayName: "Raspberry Pi Documentation",
  topicName: "Raspberry Pi",
  skillName: "raspberrypi-local",
  docsPath: "~/.raspberrypiwiki".replace(/^~(?=\/|$)/, os.homedir()).replace(/^\$HOME(?=\/|$)/, os.homedir()),
  repoUrl: "https://github.com/raspberrypi/documentation", // empty string for preinstalled docs
  setupCommand: "/raspberrypi-wiki-local-setup",
  // The official repository keeps the public documentation source in documentation/asciidoc/ as AsciiDoc.
  // Restrict indexing to AsciiDoc files so build/meta Markdown files do not pollute support searches.
  fileExtensions: /\.(adoc|asciidoc|asc)$/i,
  format: "asciidoc" as DocFormat,
  cacheDir: path.join(os.homedir(), ".cache", "pi", "raspberrypi-wiki-local"),
  schemaVersion: 3,
  promptDetection: /\b(raspberry\s*pi(?:\s*(?:os|imager|connect|5|4|zero|compute\s+module))?|raspberrypi|raspi(?:-config)?|rpi(?:-eeprom|-update|-gpio)?|pico(?:\s*w|\s*2)?|pico-sdk|rp2040|rp2350|rp1|cm[45]|compute\s+module\s*(?:4|5)?|picamera2?|rpicam(?:-[a-z0-9-]+)?|libcamera|dtoverlay|dtparam|pinctrl|raspi-gpio|camera_auto_detect|display_auto_detect)\b|\b(?:config|cmdline)\.txt\b/i,
  queryExpansions: {
    ai: ["ai camera", "ai kit", "ai hat", "imx500"],
    boot: ["boot mode", "boot order", "BOOT_ORDER"],
    bootloader: ["eeprom", "rpi-eeprom-update", "rpi-eeprom-config", "BOOT_ORDER"],
    camera: ["rpicam", "rpicam-apps", "libcamera", "picamera2", "camera module", "camera_auto_detect"],
    "config.txt": ["config txt", "configuration", "dtparam", "dtoverlay", "/boot/firmware/config.txt"],
    config: ["configuration", "config.txt", "config txt", "cmdline.txt", "dtparam", "dtoverlay", "/boot/firmware/config.txt"],
    display: ["screen", "hdmi", "kms", "fkms", "dtoverlay", "display_auto_detect"],
    eeprom: ["bootloader", "rpi-eeprom-update", "rpi-eeprom-config", "BOOT_ORDER"],
    gpio: ["pinout", "pinctrl", "raspi-gpio", "dtparam", "dtoverlay", "40-pin header"],
    headless: ["ssh", "remote access", "raspi-config", "imager"],
    imager: ["raspberry pi imager", "preconfigure", "customisation", "install"],
    install: ["setup", "getting started", "requirements", "imager"],
    network: ["wifi", "wireless", "networkmanager", "nmcli", "wpa_supplicant"],
    nvme: ["pcie", "m.2", "boot order", "BOOT_ORDER", "rpi-eeprom-config"],
    os: ["raspberry pi os", "bookworm", "trixie", "apt"],
    pcie: ["pci express", "nvme", "m.2", "external pcie"],
    pico: ["rp2040", "rp2350", "pico sdk", "micropython", "pico w"],
    power: ["power supply", "undervoltage", "get_throttled", "usb-c"],
    remote: ["remote access", "ssh", "vnc", "raspberry pi connect"],
    ssh: ["remote access", "headless", "raspi-config", "ssh server"],
    storage: ["sd card", "ssd", "nvme", "usb boot", "external storage"],
    wifi: ["wireless", "network", "networkmanager", "nmcli", "wpa_supplicant"],
  } as Record<string, string[]>,
  searchStopwords: [
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "docs", "documentation", "for", "from", "guide", "help", "how", "i", "in", "is", "it", "my", "of", "on", "or", "pi", "raspberry", "raspberrypi", "the", "this", "to", "use", "using", "with", "you", "your",
  ],
  termWeights: {
    about: 0.35,
    bootloader: 0.8,
    boot_order: 0.75,
    command: 0.55,
    computer: 0.45,
    computers: 0.45,
    configuration: 0.75,
    configure: 0.75,
    connect: 0.7,
    device: 0.55,
    eeprom: 0.8,
    install: 0.8,
    os: 0.65,
    "remote access": 0.75,
    "rpi-eeprom-config": 0.8,
    setup: 0.75,
    source: 0.35,
    system: 0.55,
  } as Record<string, number>,
};

const PAGES_CACHE = path.join(CONFIG.cacheDir, "pages.json");
const METADATA_CACHE = path.join(CONFIG.cacheDir, "metadata.json");
const MISSING_DOCS_MESSAGE = `Local ${CONFIG.displayName} docs are not available at ${CONFIG.docsPath}. Run ${CONFIG.setupCommand} to set them up.`;

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
  if (!await exists(path.join(CONFIG.docsPath, ".git"))) return undefined;
  const result = await runCommand("git", ["rev-parse", "--short", "HEAD"], CONFIG.docsPath);
  return result.ok ? result.stdout.trim() || undefined : undefined;
}

async function listDocFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listDocFiles(full));
    if (entry.isFile() && CONFIG.fileExtensions.test(entry.name)) files.push(full);
  }
  return files.sort();
}

async function corpusAvailable(): Promise<boolean> {
  try {
    const stat = await fs.stat(CONFIG.docsPath);
    if (!stat.isDirectory()) return false;
    return (await listDocFiles(CONFIG.docsPath)).length > 0;
  } catch {
    return false;
  }
}

async function corpusStats(): Promise<{ pageCount: number; newestMtimeMs: number }> {
  if (!await exists(CONFIG.docsPath)) return { pageCount: 0, newestMtimeMs: 0 };
  const files = await listDocFiles(CONFIG.docsPath);
  let newestMtimeMs = 0;
  for (const file of files) newestMtimeMs = Math.max(newestMtimeMs, (await fs.stat(file)).mtimeMs);
  return { pageCount: files.length, newestMtimeMs };
}

function decodeEntities(input: string): string {
  const entityMap: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return input
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_m, value: string) => {
      const code = value.toLowerCase().startsWith("x") ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&([a-z]+);/gi, (m, name: string) => entityMap[name.toLowerCase()] ?? m);
}

function stripTags(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeWhitespace(input: string): string {
  return input.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function titleFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim();
}

function anchorFromHeading(raw: string): string {
  return raw.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function docFormatForPath(filePath: string): DocFormat {
  if (CONFIG.format === "html" || /\.html?$/i.test(filePath)) return "html";
  if (CONFIG.format === "asciidoc" || /\.(adoc|asciidoc|asc)$/i.test(filePath)) return "asciidoc";
  return "markdown";
}

function stripMarkdownDecorators(input: string): string {
  return input.replace(/^#+\s*/, "").replace(/[*_`~]/g, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").trim();
}

function stripAsciidocDecorators(input: string): string {
  return input
    .replace(/^={1,6}\s+/, "")
    .replace(/^\[\[[^\]]+\]\]\s*/, "")
    .replace(/xref:([^\[]+)\[([^\]]*)\]/g, (_m, target: string, label: string) => label || titleFromPath(target))
    .replace(/https?:[^\[]+\[([^\]]+)\]/g, "$1")
    .replace(/(?:kbd|btn|menu):\[([^\]]+)\]/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function firstMarkdownHeading(markdown: string): string | undefined {
  let inFence = false;
  for (const line of markdown.split(/\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = line.match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return undefined;
}

function markdownTitle(markdown: string, filePath: string): string {
  return stripMarkdownDecorators(firstMarkdownHeading(markdown) || titleFromPath(filePath));
}

function markdownSections(markdown: string, fallbackTitle: string): WikiSection[] {
  const lines = markdown.split(/\n/);
  const sections: WikiSection[] = [];
  let current: WikiSection | undefined;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const match = !inFence ? line.match(/^(#{1,6})\s+(.+)$/) : undefined;
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

function asciidocToText(asciidoc: string): string {
  return normalizeWhitespace(asciidoc
    .replace(/^\s*:[^:\n]+:.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\[\[[^\]]+\]\]\s*$/gm, "")
    .replace(/^\[(?:source|console|bash|python|json|ini|subs|NOTE|TIP|IMPORTANT|WARNING|CAUTION)[^\]]*\]\s*$/gim, "")
    .replace(/^(?:----|====|\+{4}|`{3})\s*$/gm, "")
    .replace(/^image::[^\[]+\[[^\]]*\]\s*$/gm, "")
    .replace(/include::([^\[]+)\[[^\]]*\]/g, "")
    .replace(/xref:([^\[]+)\[([^\]]*)\]/g, (_m, target: string, label: string) => label || titleFromPath(target))
    .replace(/https?:[^\[]+\[([^\]]+)\]/g, "$1")
    .replace(/(?:kbd|btn|menu):\[([^\]]+)\]/g, "$1"));
}

function asciidocTitle(asciidoc: string, filePath: string): string {
  for (const line of asciidoc.split(/\n/)) {
    const match = line.match(/^(={1,6})\s+(.+)$/);
    if (match) return stripAsciidocDecorators(match[2]);
  }
  return titleFromPath(filePath);
}

function asciidocSections(asciidoc: string, fallbackTitle: string): WikiSection[] {
  const sections: WikiSection[] = [];
  let current: WikiSection | undefined;
  for (const line of asciidoc.split(/\n/)) {
    const match = line.match(/^(={1,6})\s+(.+)$/);
    if (match) {
      if (current) current.text = asciidocToText(current.text);
      const title = stripAsciidocDecorators(match[2]);
      current = { title, level: match[1].length, anchor: anchorFromHeading(title), text: "" };
      sections.push(current);
      continue;
    }
    if (current) current.text += `${line}\n`;
  }
  if (!current) sections.push({ title: fallbackTitle, level: 1, anchor: anchorFromHeading(fallbackTitle), text: asciidocToText(asciidoc) });
  else current.text = asciidocToText(current.text);
  return sections;
}

function resolveLocalPath(currentFile: string, href: string): string | undefined {
  if (/^(https?:|mailto:|#)/i.test(href)) return undefined;
  const cleanHref = decodeEntities(href).split("#")[0].split("?")[0].trim();
  if (!cleanHref) return undefined;

  const hrefVariants = [...new Set([
    cleanHref,
    cleanHref.replace(/^\.\/+/, ""),
    cleanHref.replace(/^(?:\.\.\/)+/, ""),
  ].filter(Boolean))];
  const withExtensions = (candidate: string): string[] => path.extname(candidate)
    ? [candidate]
    : CONFIG.format === "html"
      ? [`${candidate}.html`, `${candidate}.htm`, path.join(candidate, "index.html")]
      : [`${candidate}.adoc`, `${candidate}.asciidoc`, `${candidate}.asc`, path.join(candidate, "index.adoc")];
  const bases = [path.dirname(currentFile), path.dirname(path.dirname(currentFile)), CONFIG.docsPath];
  const candidates: string[] = [];
  for (const variant of hrefVariants) {
    for (const expanded of withExtensions(variant)) {
      if (path.isAbsolute(expanded)) candidates.push(path.normalize(expanded));
      for (const base of bases) candidates.push(path.normalize(path.resolve(base, expanded)));
    }
  }

  const docsRoot = path.normalize(CONFIG.docsPath);
  for (const resolved of [...new Set(candidates)]) {
    const inDocsRoot = resolved === docsRoot || resolved.startsWith(`${docsRoot}${path.sep}`);
    if (inDocsRoot && fsSync.existsSync(resolved)) return resolved;
  }
  return undefined;
}

function markdownLinks(markdown: string, currentFile: string): WikiLink[] {
  const links = new Map<string, WikiLink>();
  const re = /\[([^\]]+)\]\(([^\)]+)\)/g;
  for (const match of markdown.matchAll(re)) {
    const resolved = resolveLocalPath(currentFile, match[2].trim());
    if (!resolved) continue;
    links.set(resolved, { title: stripMarkdownDecorators(match[1]) || titleFromPath(resolved), path: resolved });
  }
  return [...links.values()];
}

function asciidocLinks(asciidoc: string, currentFile: string): WikiLink[] {
  const links = new Map<string, WikiLink>();
  const add = (href: string, label: string) => {
    const resolved = resolveLocalPath(currentFile, href.trim());
    if (!resolved) return;
    links.set(resolved, { title: stripAsciidocDecorators(label) || titleFromPath(resolved), path: resolved });
  };
  for (const match of asciidoc.matchAll(/xref:([^\[]+)\[([^\]]*)\]/g)) add(match[1], match[2]);
  for (const match of asciidoc.matchAll(/^include::([^\[]+)\[([^\]]*)\]/gm)) add(match[1], match[2]);
  return [...links.values()];
}

async function expandAsciidocIncludes(raw: string, currentFile: string, depth = 0, seen = new Set<string>()): Promise<string> {
  if (depth >= 4) return raw;
  const includeRe = /^include::([^\[]+)\[[^\]]*\]\s*$/gm;
  const replacements = await Promise.all([...raw.matchAll(includeRe)].map(async (match) => {
    const resolved = resolveLocalPath(currentFile, match[1].trim());
    if (!resolved || seen.has(resolved)) return { from: match[0], to: "" };
    try {
      seen.add(resolved);
      const included = await fs.readFile(resolved, "utf8");
      return { from: match[0], to: await expandAsciidocIncludes(included, resolved, depth + 1, seen) };
    } catch {
      return { from: match[0], to: "" };
    }
  }));
  let expanded = raw;
  for (const { from, to } of replacements) expanded = expanded.replace(from, to);
  return expanded;
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

function htmlTitle(html: string, filePath: string): string {
  return stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || titleFromPath(filePath);
}

function htmlLinks(html: string, currentFile: string): WikiLink[] {
  const links = new Map<string, WikiLink>();
  const re = /<a\s+[^>]*href=["']([^"'#?]+)(?:#[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const resolved = resolveLocalPath(currentFile, decodeEntities(match[1]));
    if (!resolved) continue;
    links.set(resolved, { title: stripTags(match[2]) || titleFromPath(resolved), path: resolved });
  }
  return [...links.values()];
}

function parsePage(raw: string, filePath: string, mtimeMs: number, sourceRaw = raw): WikiPage {
  const format = docFormatForPath(filePath);
  if (format === "html") {
    const title = htmlTitle(sourceRaw, filePath);
    const text = htmlToText(raw);
    const sections = markdownSections(text, title);
    return { title, slug: path.relative(CONFIG.docsPath, filePath).replace(CONFIG.fileExtensions, ""), path: filePath, headings: sections.map((s) => s.title), sections, links: htmlLinks(sourceRaw, filePath), text, mtimeMs };
  }
  if (format === "asciidoc") {
    const title = asciidocTitle(sourceRaw, filePath);
    const text = asciidocToText(raw);
    const sections = asciidocSections(raw, title);
    return { title, slug: path.relative(CONFIG.docsPath, filePath).replace(CONFIG.fileExtensions, ""), path: filePath, headings: sections.map((s) => s.title), sections, links: asciidocLinks(sourceRaw, filePath), text, mtimeMs };
  }
  const title = markdownTitle(sourceRaw, filePath);
  const text = normalizeWhitespace(raw);
  const sections = markdownSections(text, title);
  return { title, slug: path.relative(CONFIG.docsPath, filePath).replace(CONFIG.fileExtensions, ""), path: filePath, headings: sections.map((s) => s.title), sections, links: markdownLinks(sourceRaw, filePath), text, mtimeMs };
}

function limitText(text: string, maxChars = 12000): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: `${text.slice(0, maxChars)}\n\n[truncated at ${maxChars} characters]`, truncated: true };
}

async function buildCache(): Promise<LoadedCache> {
  if (!await corpusAvailable()) throw new Error(MISSING_DOCS_MESSAGE);
  await fs.mkdir(CONFIG.cacheDir, { recursive: true });
  const files = await listDocFiles(CONFIG.docsPath);
  const pages: WikiPage[] = [];
  let newestMtimeMs = 0;
  for (const file of files) {
    const stat = await fs.stat(file);
    newestMtimeMs = Math.max(newestMtimeMs, stat.mtimeMs);
    const raw = await fs.readFile(file, "utf8");
    const expanded = docFormatForPath(file) === "asciidoc" ? await expandAsciidocIncludes(raw, file) : raw;
    pages.push(parsePage(expanded, file, stat.mtimeMs, raw));
  }
  const metadata: CacheMetadata = { schemaVersion: CONFIG.schemaVersion, docsPath: CONFIG.docsPath, generatedAt: new Date().toISOString(), pageCount: pages.length, newestMtimeMs, gitRevision: await gitRevision() };
  await fs.writeFile(PAGES_CACHE, JSON.stringify(pages, null, 2));
  await fs.writeFile(METADATA_CACHE, JSON.stringify(metadata, null, 2));
  return { pages, metadata };
}

async function cacheFresh(metadata: CacheMetadata): Promise<boolean> {
  const stats = await corpusStats();
  return metadata.schemaVersion === CONFIG.schemaVersion && metadata.docsPath === CONFIG.docsPath && metadata.pageCount === stats.pageCount && metadata.newestMtimeMs === stats.newestMtimeMs;
}

async function loadCache(): Promise<LoadedCache> {
  try {
    const [pagesRaw, metadataRaw] = await Promise.all([fs.readFile(PAGES_CACHE, "utf8"), fs.readFile(METADATA_CACHE, "utf8")]);
    const metadata = JSON.parse(metadataRaw) as CacheMetadata;
    if (await cacheFresh(metadata)) return { pages: JSON.parse(pagesRaw) as WikiPage[], metadata };
  } catch {
    // Rebuild below.
  }
  return buildCache();
}

function normalizeQuery(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_./+-]+/g, " ").trim();
}

function tokenWeight(token: string): number {
  return CONFIG.termWeights[token] ?? 1;
}

function expandQuery(query: string): string[] {
  const normalized = normalizeQuery(query);
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const stopwords = new Set(CONFIG.searchStopwords);
  const tokens = rawTokens.filter((token) => !stopwords.has(token));
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const extra of CONFIG.queryExpansions[token] ?? []) {
      const normalizedExtra = normalizeQuery(extra);
      if (normalizedExtra && !stopwords.has(normalizedExtra)) expanded.add(normalizedExtra);
    }
  }
  if (expanded.size === 0) for (const token of rawTokens) expanded.add(token);
  return [...expanded].filter(Boolean);
}

function makeSnippet(text: string, tokens: string[], max = 260): string | undefined {
  const lower = text.toLowerCase();
  const index = tokens.map((t) => lower.indexOf(t.toLowerCase())).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (index === undefined) return undefined;
  const start = Math.max(0, index - Math.floor(max / 2));
  const snippet = text.slice(start, start + max).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${snippet}${start + max < text.length ? "…" : ""}`;
}

function scorePage(page: WikiPage, tokens: string[]): SearchResult | undefined {
  const title = normalizeQuery(page.title);
  const slug = normalizeQuery(page.slug);
  const headings = normalizeQuery(page.headings.join(" "));
  const text = normalizeQuery(page.text);
  let score = 0;
  const matchedFields = new Set<string>();
  const scoreExplanation: string[] = [];
  for (const token of tokens) {
    const weight = tokenWeight(token);
    if (title.includes(token)) { score += 35 * weight; matchedFields.add("title"); scoreExplanation.push(`title matched '${token}'`); }
    if (slug.includes(token)) { score += 20 * weight; matchedFields.add("slug"); }
    if (headings.includes(token)) { score += 10 * weight; matchedFields.add("headings"); }
    const textMatches = text.split(token).length - 1;
    if (textMatches > 0) { score += Math.min(6, textMatches) * weight; matchedFields.add("text"); }
  }
  if (score <= 0) return undefined;
  return { title: page.title, path: page.path, score: Number(score.toFixed(2)), matchedFields: [...matchedFields], scoreExplanation, snippet: makeSnippet(page.text, tokens) };
}

function scoreSection(section: WikiSection, tokens: string[]): number {
  const title = normalizeQuery(section.title);
  const text = normalizeQuery(section.text);
  let score = 0;
  for (const token of tokens) {
    const weight = tokenWeight(token);
    if (title.includes(token)) score += 6 * weight;
    const textMatches = text.split(token).length - 1;
    if (textMatches > 0) score += Math.min(4, textMatches) * weight;
  }
  return Number(score.toFixed(2));
}

function findPage(pages: WikiPage[], pageRef: string): WikiPage | undefined {
  const normalized = normalizeQuery(pageRef);
  return pages.find((page) => page.path === pageRef)
    ?? pages.find((page) => normalizeQuery(page.slug) === normalized)
    ?? pages.find((page) => normalizeQuery(page.title) === normalized)
    ?? pages.find((page) => normalizeQuery(page.slug).includes(normalized) || normalizeQuery(page.title).includes(normalized));
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function executeStatus() {
  const available = await corpusAvailable();
  const stats = await corpusStats();
  let cacheGeneratedAt: string | undefined;
  try { cacheGeneratedAt = (JSON.parse(await fs.readFile(METADATA_CACHE, "utf8")) as CacheMetadata).generatedAt; } catch {}
  const payload = { displayName: CONFIG.displayName, docsPath: CONFIG.docsPath, available, pageCount: stats.pageCount, gitRevision: await gitRevision(), cacheGeneratedAt };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

type SetupProgress = (message: string, level?: "info" | "warning") => void;

async function executeSetup(progress?: SetupProgress): Promise<{ ok: boolean; message: string }> {
  progress?.(`Checking local ${CONFIG.displayName} docs at ${CONFIG.docsPath}...`);
  if (!CONFIG.repoUrl) {
    progress?.(`No repository URL is configured; expecting a manually populated docs path.`, "warning");
    return { ok: false, message: `No repoUrl configured. Populate ${CONFIG.docsPath} with local docs, then retry the wiki tools.` };
  }
  if (!await exists(CONFIG.docsPath)) {
    const parent = path.dirname(CONFIG.docsPath);
    progress?.(`Creating parent directory ${parent} if needed...`);
    await fs.mkdir(parent, { recursive: true });
    progress?.(`Cloning ${CONFIG.displayName} docs from ${CONFIG.repoUrl} into ${CONFIG.docsPath}. This can take a while for large documentation repositories...`);
    const clone = await runCommand("git", ["clone", "--depth=1", CONFIG.repoUrl, CONFIG.docsPath], parent);
    if (!clone.ok) return { ok: false, message: `Clone failed: ${clone.stderr || clone.error}` };
    progress?.(`Clone finished. Counting indexed documentation files...`);
    const stats = await corpusStats();
    return { ok: true, message: `Cloned ${CONFIG.displayName} docs to ${CONFIG.docsPath}. Found ${stats.pageCount} documentation files.` };
  }
  if (await exists(path.join(CONFIG.docsPath, ".git"))) {
    progress?.(`Existing Git checkout found at ${CONFIG.docsPath}. Running git pull --ff-only...`);
    const pull = await runCommand("git", ["pull", "--ff-only"], CONFIG.docsPath);
    if (!pull.ok) return { ok: false, message: `Update failed: ${pull.stderr || pull.error}` };
    progress?.(`Update finished. Counting indexed documentation files...`);
    const stats = await corpusStats();
    return { ok: true, message: `Updated ${CONFIG.displayName} docs at ${CONFIG.docsPath}. Found ${stats.pageCount} documentation files.` };
  }
  progress?.(`Docs path exists but is not a Git checkout. Checking whether it contains readable documentation files...`, "warning");
  const available = await corpusAvailable();
  const stats = available ? await corpusStats() : { pageCount: 0 };
  return { ok: available, message: available ? `Docs path exists and contains ${stats.pageCount} documentation files, but is not a Git checkout: ${CONFIG.docsPath}` : `Docs path exists but is not a Git checkout and no documentation files were found: ${CONFIG.docsPath}` };
}

async function executeSearch(params: { query: string; limit?: number; includeSnippets?: boolean }) {
  const { pages } = await loadCache();
  const tokens = expandQuery(params.query);
  const limit = Math.max(1, Math.min(params.limit ?? 8, 50));
  const results = pages.map((page) => scorePage(page, tokens)).filter((x): x is SearchResult => Boolean(x)).sort((a, b) => b.score - a.score).slice(0, limit);
  const payload = { query: params.query, expandedTokens: tokens, results: params.includeSnippets ? results : results.map(({ snippet, ...rest }) => rest) };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function loadPage(pageRef: string): Promise<{ page: WikiPage; cache: LoadedCache }> {
  const cache = await loadCache();
  const page = findPage(cache.pages, pageRef);
  if (!page) throw new Error(`No ${CONFIG.displayName} page matched '${pageRef}'. Try ${CONFIG.extensionId}_wiki_search first.`);
  return { page, cache };
}

async function executeRead(params: { page: string; maxChars?: number }) {
  const { page } = await loadPage(params.page);
  const limited = limitText(page.text, params.maxChars ?? 16000);
  const payload = { title: page.title, path: page.path, citation: `${page.path} — ${page.title}`, truncated: limited.truncated, text: limited.text };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeSections(params: { page: string; maxSections?: number }) {
  const { page } = await loadPage(params.page);
  const limit = Math.max(1, Math.min(params.maxSections ?? 60, 300));
  const sections = page.sections.slice(0, limit);
  const payload = { title: page.title, path: page.path, omittedSectionCount: Math.max(0, page.sections.length - sections.length), sections: sections.map((section) => ({ title: section.title, level: section.level, anchor: section.anchor })) };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeExtract(params: { page: string; section?: string; query?: string; maxChars?: number; maxSections?: number }) {
  const { page } = await loadPage(params.page);
  const maxSections = Math.max(1, Math.min(params.maxSections ?? (params.query ? 5 : 4), 25));
  let sections = page.sections;
  if (params.section) {
    const needle = normalizeQuery(params.section);
    sections = sections.filter((section) => normalizeQuery(section.title).includes(needle));
  }
  if (params.query) {
    const tokens = expandQuery(params.query);
    sections = sections
      .map((section) => ({ section, score: scoreSection(section, tokens) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.section);
  }
  if (!params.section && !params.query) sections = sections.slice(0, 5);
  const omittedSectionCount = Math.max(0, sections.length - maxSections);
  sections = sections.slice(0, maxSections);
  const joined = sections.map((section) => `${"#".repeat(Math.min(section.level, 6))} ${section.title}\n\n${section.text}`).join("\n\n");
  const limited = limitText(joined || page.text, params.maxChars ?? 10000);
  const sectionNames = sections.map((s) => s.title);
  const payload = { title: page.title, path: page.path, citation: `${page.path} — ${sectionNames.join(", ") || page.title}`, omittedSectionCount, matchedSections: sections.map((s) => ({ title: s.title, level: s.level, anchor: s.anchor })), truncated: limited.truncated, text: limited.text };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeRelated(params: { page: string; limit?: number }) {
  const { page } = await loadPage(params.page);
  const limit = Math.max(1, Math.min(params.limit ?? 10, 50));
  const payload = { title: page.title, path: page.path, links: page.links.slice(0, limit) };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

async function executeSmokeTest(params: { maxSearchResults?: number } = {}) {
  const status = (await executeStatus()).details;
  const checks: Array<{ name: string; ok: boolean; detail: string; chars?: number }> = [];
  const addCheck = (name: string, ok: boolean, detail: string, chars?: number) => checks.push({ name, ok, detail, chars });

  addCheck("corpus available", status.available, `${status.pageCount} indexed files at ${status.docsPath}`);
  if (!status.available) {
    const payload = { ok: false, status, checks };
    return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
  }

  const searchLimit = Math.max(3, Math.min(params.maxSearchResults ?? 5, 10));
  const searchCases = [
    { name: "ssh", query: "ssh headless setup", expectedPath: "computers/remote-access/ssh.adoc" },
    { name: "camera", query: "camera libcamera picamera2", expectedPath: "computers/camera/libcamera_python.adoc" },
    { name: "config.txt", query: "config.txt dtoverlay gpio", expectedPath: "computers/config_txt.adoc" },
    { name: "pico sdk", query: "pico sdk blink build", expectedPath: "microcontrollers/c_sdk" },
    { name: "nvme boot", query: "boot from nvme pi 5", expectedPath: "computers/raspberry-pi/boot-nvme.adoc" },
  ];

  const searches = [];
  for (const testCase of searchCases) {
    const search = (await executeSearch({ query: testCase.query, limit: searchLimit, includeSnippets: false })).details;
    const topPaths = search.results.map((result: SearchResult) => result.path);
    const ok = topPaths.some((resultPath: string) => resultPath.includes(testCase.expectedPath));
    const compact = { query: testCase.query, expandedTokens: search.expandedTokens, topTitles: search.results.slice(0, 3).map((result: SearchResult) => result.title), topPaths: topPaths.slice(0, 3) };
    searches.push(compact);
    addCheck(`search: ${testCase.name}`, ok, ok ? `expected page found in top ${searchLimit}` : `expected path fragment not found: ${testCase.expectedPath}`, JSON.stringify(compact).length);
  }

  const sections = (await executeSections({ page: "ssh", maxSections: 20 })).details;
  addCheck("sections: ssh headings", sections.sections.some((section: { title: string }) => section.title === "Enable the SSH server"), `${sections.sections.length} headings, omitted ${sections.omittedSectionCount}`, JSON.stringify(sections).length);

  const extract = (await executeExtract({ page: "ssh", section: "Enable the SSH server", maxChars: 5000, maxSections: 2 })).details;
  addCheck("extract: ssh enable server", !extract.truncated && extract.text.includes("By default, Raspberry Pi OS disables the SSH server"), `${extract.text.length} chars, omitted ${extract.omittedSectionCount}`, extract.text.length);

  const read = (await executeRead({ page: "ssh", maxChars: 2000 })).details;
  addCheck("read: bounded output", read.truncated && read.text.length <= 2100, `${read.text.length} chars, truncated=${read.truncated}`, read.text.length);

  const related = (await executeRelated({ page: "ssh", limit: 10 })).details;
  const existingLinks = related.links.filter((link: WikiLink) => fsSync.existsSync(link.path)).length;
  addCheck("related: local links resolve", related.links.length === existingLinks, `${existingLinks}/${related.links.length} returned links exist`, JSON.stringify(related).length);

  const payload = { ok: checks.every((check) => check.ok), status, checks, searches };
  return { content: [{ type: "text" as const, text: jsonText(payload) }], details: payload };
}

const searchParams = Type.Object({ query: Type.String({ description: `Search query, e.g. '${CONFIG.topicName} config'` }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })), includeSnippets: Type.Optional(Type.Boolean({ description: "Include compact text snippets; defaults to false for bounded output." })) });
const readParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })) });
const sectionsParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), maxSections: Type.Optional(Type.Number({ minimum: 1, maximum: 300 })) });
const extractParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), section: Type.Optional(Type.String()), query: Type.Optional(Type.String()), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })), maxSections: Type.Optional(Type.Number({ minimum: 1, maximum: 25 })) });
const relatedParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })) });
const smokeParams = Type.Object({ maxSearchResults: Type.Optional(Type.Number({ minimum: 3, maximum: 10 })) });

export default function localWikiExtension(pi: ExtensionAPI) {
  pi.on?.("before_agent_start", async (event, ctx) => {
    const skillLoaded = event.systemPromptOptions.skills?.some((skill) => skill.name === CONFIG.skillName) ?? false;
    if (!skillLoaded && !CONFIG.promptDetection.test(event.prompt ?? "")) return;

    if (!await corpusAvailable()) {
      const warning = `${MISSING_DOCS_MESSAGE} Aborting ${CONFIG.displayName}-local lookup until setup is complete.`;
      ctx.ui.notify(warning, "warning");
      ctx.abort();
      return {
        message: { customType: `${CONFIG.extensionId}-wiki-local-missing-docs`, content: warning, display: true },
        systemPrompt: `${event.systemPrompt}\n\n${CONFIG.displayName} local documentation setup required: ${warning} Do not continue with ${CONFIG.topicName} troubleshooting until the user runs ${CONFIG.setupCommand}.`,
      };
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n${CONFIG.displayName} local documentation routing: This prompt appears related to ${CONFIG.topicName}. Use ${CONFIG.extensionId}_wiki_search before web sources, then ${CONFIG.extensionId}_wiki_extract for focused sections with local path citations. Prefer read-only diagnostics and ask before destructive changes.`,
    };
  });

  pi.registerCommand(`${CONFIG.extensionId}_wiki-status`, {
    description: `Show local ${CONFIG.displayName} docs path, page count, and cache freshness`,
    handler: async (_args, ctx) => {
      const result = await executeStatus();
      ctx.ui.notify(result.content[0].text, "info");
    },
  });

  pi.registerCommand(`${CONFIG.extensionId}-wiki-local-setup`, {
    description: `Clone/update or report setup instructions for local ${CONFIG.displayName} docs`,
    handler: async (_args, ctx) => {
      ctx.ui.setStatus?.(`${CONFIG.extensionId}-wiki-setup`, `Setting up ${CONFIG.displayName} docs...`);
      const progress: SetupProgress = (message, level = "info") => ctx.ui.notify(message, level);
      try {
        const result = await executeSetup(progress);
        ctx.ui.notify(result.message, result.ok ? "info" : "warning");
      } finally {
        ctx.ui.setStatus?.(`${CONFIG.extensionId}-wiki-setup`, "");
      }
    },
  });

  pi.registerCommand(`${CONFIG.extensionId}_wiki-smoke-test`, {
    description: `Run compact local ${CONFIG.displayName} parser/search/link smoke tests`,
    handler: async (_args, ctx) => {
      const result = await executeSmokeTest();
      ctx.ui.notify(result.content[0].text, result.details.ok ? "info" : "warning");
    },
  });

  pi.registerTool({ 
    name: `${CONFIG.extensionId}_wiki_search`,
    label: `${CONFIG.displayName} Search`,
    description: `Search local ${CONFIG.displayName} documentation pages from ${CONFIG.docsPath}.`,
    promptSnippet: `Search local ${CONFIG.displayName} pages before using web sources for ${CONFIG.topicName} questions`,
    promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_search first for ${CONFIG.topicName} questions before consulting web sources.`, `Use ${CONFIG.extensionId}_wiki_extract after search to retrieve focused sections with citations.`],
    parameters: searchParams,
    async execute(_toolCallId, params) { return executeSearch(params); },
  });

  pi.registerTool({ name: `${CONFIG.extensionId}_wiki_read`, label: `${CONFIG.displayName} Read`, description: `Read a local ${CONFIG.displayName} page as clean text with a local path citation.`, promptSnippet: `Read local ${CONFIG.displayName} page text by title, slug, or absolute local path`, promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_read only when broad page context is needed; prefer ${CONFIG.extensionId}_wiki_extract for focused answers.`], parameters: readParams, async execute(_toolCallId, params) { return executeRead(params); } });
  pi.registerTool({ name: `${CONFIG.extensionId}_wiki_sections`, label: `${CONFIG.displayName} Sections`, description: `List headings/sections for a local ${CONFIG.displayName} page.`, promptSnippet: `List headings from a local ${CONFIG.displayName} page`, promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_sections to choose exact local sections before extraction.`], parameters: sectionsParams, async execute(_toolCallId, params) { return executeSections(params); } });
  pi.registerTool({ name: `${CONFIG.extensionId}_wiki_extract`, label: `${CONFIG.displayName} Extract`, description: `Extract a named or query-relevant section from a local ${CONFIG.displayName} page.`, promptSnippet: `Extract focused local ${CONFIG.displayName} sections by heading or query`, promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_extract to cite exact local sections in final answers.`], parameters: extractParams, async execute(_toolCallId, params) { return executeExtract(params); } });
  pi.registerTool({ name: `${CONFIG.extensionId}_wiki_related`, label: `${CONFIG.displayName} Related`, description: `Return local ${CONFIG.displayName} pages linked from a given local page.`, promptSnippet: `Find locally linked ${CONFIG.displayName} pages related to a page`, promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_related when an issue spans connected ${CONFIG.topicName} topics.`], parameters: relatedParams, async execute(_toolCallId, params) { return executeRelated(params); } });
  pi.registerTool({ name: `${CONFIG.extensionId}_wiki_smoke_test`, label: `${CONFIG.displayName} Smoke Test`, description: `Run a compact parser, search, extraction, read, and related-link smoke test for ${CONFIG.displayName}.`, promptSnippet: `Smoke-test local ${CONFIG.displayName} parser/search behavior`, promptGuidelines: [`Use ${CONFIG.extensionId}_wiki_smoke_test after package changes or corpus updates to verify search quality and bounded output.`], parameters: smokeParams, async execute(_toolCallId, params) { return executeSmokeTest(params); } });
}
