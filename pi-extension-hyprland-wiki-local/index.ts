import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createLocalWikiEngine } from "@firstpick/pi-utils";

const REPO_URL = "https://github.com/hyprwm/hyprland-wiki.git";
const REPO_PATH = path.join(os.homedir(), ".hyprwiki");
const CACHE_DIR = path.join(os.homedir(), ".cache", "pi", "hyprland-wiki-local");
const SETUP_COMMAND = "/hyprwiki-local-setup";
const CLONE_COMMAND = `git clone ${REPO_URL} ${REPO_PATH}`;
const MISSING_REPO_MESSAGE = `Local Hyprland Wiki repository is not available at ${REPO_PATH}. Run ${SETUP_COMMAND} to clone it (${CLONE_COMMAND}).`;

const QUERY_EXPANSIONS: Record<string, string[]> = {
  monitor: ["monitors", "hyprctl monitors", "workspace"], monitors: ["monitor", "hyprctl monitors", "workspace"],
  nvidia: ["NVIDIA", "env", "Wayland", "GBM"], keyboard: ["input", "kb_layout", "keybinds", "bind"],
  mouse: ["input", "cursor", "sensitivity"], touchpad: ["input", "gestures", "natural_scroll"],
  bind: ["keybinds", "binds", "dispatcher"], keybind: ["bind", "dispatcher", "hyprctl dispatch"],
  rules: ["windowrule", "windowrulev2", "workspace rules"], portal: ["xdg-desktop-portal-hyprland", "screenshare", "screen sharing"],
  screenshots: ["grim", "slurp", "portal", "screenshare"], crash: ["crashes", "debug", "logs", "coredump"],
  config: ["hyprland.conf", "variables", "keywords"], plugin: ["plugins", "hyprpm"], hyprpm: ["plugins", "plugin"],
};

async function exists(filePath: string): Promise<boolean> { try { await fs.access(filePath); return true; } catch { return false; } }
async function runCommand(command: string, args: string[], cwd?: string): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> { return await new Promise((resolve) => execFile(command, args, { cwd, timeout: 120000 }, (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr, error: error instanceof Error ? error.message : undefined }))); }
async function gitRevision(): Promise<string | undefined> { if (!await exists(path.join(REPO_PATH, ".git"))) return undefined; const result = await runCommand("git", ["rev-parse", "--short", "HEAD"], REPO_PATH); return result.ok ? result.stdout.trim() || undefined : undefined; }
async function gitRemote(): Promise<string | undefined> { if (!await exists(path.join(REPO_PATH, ".git"))) return undefined; const result = await runCommand("git", ["remote", "get-url", "origin"], REPO_PATH); return result.ok ? result.stdout.trim() || undefined : undefined; }

const wiki = createLocalWikiEngine({
  displayName: "Hyprland Wiki",
  docsPath: REPO_PATH,
  cacheDir: CACHE_DIR,
  schemaVersion: 1,
  fileExtensions: /\.mdx?$/i,
  format: "markdown",
  queryExpansions: QUERY_EXPANSIONS,
  missingDocsMessage: MISSING_REPO_MESSAGE,
  metadataExtra: async () => ({ gitRevision: await gitRevision(), gitRemote: await gitRemote() }),
  statusExtra: async () => ({ gitRevision: await gitRevision(), gitRemote: await gitRemote() }),
});

function jsonToolResult(payload: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }], details: payload }; }
async function executeSetup(): Promise<{ ok: boolean; message: string }> {
  if (!await exists(REPO_PATH)) {
    const parent = path.dirname(REPO_PATH);
    await fs.mkdir(parent, { recursive: true });
    const clone = await runCommand("git", ["clone", REPO_URL, REPO_PATH], parent);
    return { ok: clone.ok, message: clone.ok ? `Cloned Hyprland Wiki to ${REPO_PATH}.` : `Clone failed: ${clone.stderr || clone.error}` };
  }
  if (await exists(path.join(REPO_PATH, ".git"))) {
    const pull = await runCommand("git", ["pull", "--ff-only"], REPO_PATH);
    return { ok: pull.ok, message: pull.ok ? `Updated Hyprland Wiki at ${REPO_PATH}.` : `Update failed: ${pull.stderr || pull.error}` };
  }
  return { ok: await wiki.available(), message: `Docs path exists but is not a Git checkout: ${REPO_PATH}` };
}

const searchParams = Type.Object({ query: Type.String({ description: "Search query, e.g. 'monitor rules'" }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })), includeSnippets: Type.Optional(Type.Boolean()) });
const readParams = Type.Object({ page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })) });
const sectionsParams = Type.Object({ page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }) });
const extractParams = Type.Object({ page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }), section: Type.Optional(Type.String()), query: Type.Optional(Type.String()), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })) });
const relatedParams = Type.Object({ page: Type.String({ description: "Hyprland Wiki page title, slug, or absolute local Markdown path" }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })) });

export default function hyprlandWikiExtension(pi: ExtensionAPI) {
  pi.on?.("before_agent_start", async (event, ctx) => {
    const skillLoaded = event.systemPromptOptions.skills?.some((skill) => skill.name === "hyprland-local") ?? false;
    const looksHyprland = /\b(hyprland|hyprctl|hyprpm|hyprland\.conf|hyprpaper|hyprlock|hypridle|hyprshot|hyprpicker|xdg-desktop-portal-hyprland|wayland compositor|windowrule|workspace rule)\b/i.test(event.prompt ?? "");
    if (!skillLoaded && !looksHyprland) return;
    if (!await wiki.available()) { const warning = `${MISSING_REPO_MESSAGE} Aborting Hyprland-local lookup until setup is complete.`; ctx.ui.notify(warning, "warning"); ctx.abort(); return { message: { customType: "hyprland-wiki-local-missing-docs", content: warning, display: true }, systemPrompt: `${event.systemPrompt}\n\nHyprland Wiki local documentation setup required: ${warning} Do not continue with Hyprland troubleshooting until the user runs ${SETUP_COMMAND}.` }; }
    return { systemPrompt: `${event.systemPrompt}\n\nHyprland local documentation routing: This prompt appears related to Hyprland or its ecosystem. Use hyprwiki_search before web sources, then hyprwiki_extract for focused sections with local path citations. Prefer read-only diagnostics and ask before destructive changes.` };
  });
  pi.registerCommand("hyprwiki-status", { description: "Show local Hyprland Wiki path, Git revision, page count, and cache freshness", handler: async (_args, ctx) => ctx.ui.notify(JSON.stringify(await wiki.status(), null, 2), "info") });
  pi.registerCommand("hyprwiki-local-setup", { description: "Clone or update the local Hyprland Wiki repository", handler: async (_args, ctx) => { const result = await executeSetup(); ctx.ui.notify(result.message, result.ok ? "info" : "warning"); } });
  pi.registerTool({ name: "hyprwiki_search", label: "Hyprland Wiki Search", description: `Search local Hyprland Wiki Markdown pages from ${REPO_PATH}.`, promptSnippet: "Search local official Hyprland Wiki pages before using web sources for Hyprland questions", promptGuidelines: ["Use hyprwiki_search first for Hyprland questions before consulting web sources.", "Use hyprwiki_extract after search to retrieve focused sections with citations."], parameters: searchParams, async execute(_id, params) { return jsonToolResult(await wiki.search(params)); } });
  pi.registerTool({ name: "hyprwiki_read", label: "Hyprland Wiki Read", description: "Read a local Hyprland Wiki page as Markdown text with a local path citation.", promptSnippet: "Read local Hyprland Wiki page text by title, slug, or absolute local Markdown path", promptGuidelines: ["Use hyprwiki_read only when broad Hyprland Wiki context is needed; prefer hyprwiki_extract for focused answers."], parameters: readParams, async execute(_id, params) { return jsonToolResult(await wiki.read(params)); } });
  pi.registerTool({ name: "hyprwiki_sections", label: "Hyprland Wiki Sections", description: "List headings/sections for a local Hyprland Wiki page.", promptSnippet: "List headings from a local Hyprland Wiki page", promptGuidelines: ["Use hyprwiki_sections to choose exact local sections before extraction."], parameters: sectionsParams, async execute(_id, params) { return jsonToolResult(await wiki.sections(params)); } });
  pi.registerTool({ name: "hyprwiki_extract", label: "Hyprland Wiki Extract", description: "Extract a named or query-relevant section from a local Hyprland Wiki page.", promptSnippet: "Extract focused local Hyprland Wiki sections by heading or query", promptGuidelines: ["Use hyprwiki_extract to cite exact local sections in final answers."], parameters: extractParams, async execute(_id, params) { return jsonToolResult(await wiki.extract(params)); } });
  pi.registerTool({ name: "hyprwiki_related", label: "Hyprland Wiki Related", description: "Return local Hyprland Wiki pages linked from a given local page.", promptSnippet: "Find locally linked Hyprland Wiki pages related to a page", promptGuidelines: ["Use hyprwiki_related when a Hyprland issue spans connected topics."], parameters: relatedParams, async execute(_id, params) { return jsonToolResult(await wiki.related(params)); } });
}
