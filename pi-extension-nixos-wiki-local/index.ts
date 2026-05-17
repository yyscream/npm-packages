import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createLocalWikiEngine } from "@firstpick/pi-utils";

interface RepoSpec { name: string; repoUrl: string; sparsePatterns: string[]; }
type ProgressReporter = (line: string) => void | Promise<void>;

const DOCS_PATH = (process.env.NIXOSWIKI_DOCS_PATH || "~/.nixoswiki").replace(/^~(?=\/|$)/, os.homedir());
const CONFIG = {
  extensionId: "nixos",
  displayName: "NixOS/Nix Docs",
  topicName: "NixOS, Nix, nixpkgs, flakes, and Nix language",
  skillName: "nixos-local",
  docsPath: DOCS_PATH,
  setupCommand: "/nixoswiki-local-setup",
  cacheDir: path.join(os.homedir(), ".cache", "pi", "nixos-wiki-local"),
  schemaVersion: 1,
  promptDetection: /\b(nixos|nixpkgs|nix\s+(flake|shell|build|develop|profile|store|eval|run|registry|copy|env)|flakes?|derivations?|overlays?|nix\s*language|configuration\.nix|nixos-rebuild|nix-store|nix-env)\b/i,
  queryExpansions: {
    flake: ["flakes", "flake.nix", "flake.lock", "nix flake", "inputs", "outputs"], flakes: ["flake", "flake.nix", "flake.lock", "nix flake", "inputs", "outputs"],
    input: ["inputs", "flake inputs", "follows"], inputs: ["input", "flake inputs", "follows"],
    output: ["outputs", "packages", "apps", "devShells", "nixosConfigurations"], outputs: ["output", "packages", "apps", "devShells", "nixosConfigurations"],
    lock: ["flake.lock", "nix flake lock", "nix flake update"], shell: ["nix shell", "nix develop", "devShell", "development shell"],
    devshell: ["devShell", "devShells", "nix develop", "development shell"], develop: ["nix develop", "devShell", "development shell"],
    build: ["nix build", "derivation", "realisation", "outputs"], run: ["nix run", "apps", "flake apps"], eval: ["nix eval", "Nix language", "attribute path"],
    repl: ["nix repl", "Nix language", "builtins"], registry: ["nix registry", "flake registry"],
    option: ["options", "module", "configuration.nix", "nixos option"], options: ["option", "module", "configuration.nix", "nixos option"],
    module: ["modules", "options", "imports", "mkOption", "nixos module"], modules: ["module", "options", "imports", "mkOption", "nixos module"],
    service: ["services", "systemd", "NixOS module", "enable option"], services: ["service", "systemd", "NixOS module", "enable option"],
    systempackages: ["environment.systemPackages", "packages", "configuration.nix"], package: ["packages", "nixpkgs", "derivation", "attribute"], packages: ["package", "nixpkgs", "derivation", "attribute"],
    nixpkgs: ["packages", "lib", "stdenv", "overlays", "callPackage"], overlay: ["overlays", "nixpkgs overlays", "override", "package set"], overlays: ["overlay", "nixpkgs overlays", "override", "package set"],
    override: ["overrideAttrs", "override", "overlays", "package customization"], callpackage: ["callPackage", "nixpkgs", "package arguments"],
    derivation: ["derivations", "stdenv", "mkDerivation", "builder"], derivations: ["derivation", "stdenv", "mkDerivation", "builder"], mkderivation: ["mkDerivation", "stdenv", "derivation", "packages"],
    fetchfromgithub: ["fetchFromGitHub", "fetchers", "hash", "sha256"], hash: ["sha256", "hash", "fixed-output derivation", "fetchers"],
    store: ["nix store", "/nix/store", "garbage collection", "gc roots"], gc: ["garbage collection", "nix store", "gc roots", "optimise-store"],
    profile: ["nix profile", "profiles", "install", "upgrade"], channels: ["nix-channel", "channel", "legacy nix", "nix-env"], channel: ["nix-channel", "channels", "legacy nix", "nix-env"],
    home: ["home-manager", "configuration.nix", "modules", "user environment"], homemanager: ["home-manager", "home.nix", "modules", "user environment"],
    daemon: ["nix-daemon", "multi-user", "nix.conf", "trusted-users"], substituter: ["substituters", "binary cache", "trusted-public-keys", "cache.nixos.org"],
    substituters: ["substituter", "binary cache", "trusted-public-keys", "cache.nixos.org"], cache: ["binary cache", "substituters", "narinfo", "cache.nixos.org"],
    sandbox: ["sandboxing", "nix.conf", "build isolation"], experimental: ["experimental-features", "nix-command", "flakes"],
    language: ["Nix language", "builtins", "functions", "attribute sets"], attrset: ["attribute set", "attrs", "Nix language"], list: ["lists", "Nix language", "builtins"], function: ["functions", "lambda", "Nix language"], import: ["imports", "import", "modules", "Nix language"],
  } as Record<string, string[]>,
};

const REPOS: RepoSpec[] = [
  { name: "nixpkgs", repoUrl: "https://github.com/NixOS/nixpkgs.git", sparsePatterns: ["/doc/", "/doc/**", "/nixos/doc/", "/nixos/doc/**"] },
  { name: "nix.dev", repoUrl: "https://github.com/NixOS/nix.dev.git", sparsePatterns: ["/source/", "/source/**"] },
  { name: "nix", repoUrl: "https://github.com/NixOS/nix.git", sparsePatterns: ["/doc/", "/doc/**"] },
];
const BINARY_EXCLUDE_PATTERNS = ["!**/*.png", "!**/*.jpg", "!**/*.jpeg", "!**/*.gif", "!**/*.webp", "!**/*.svg", "!**/*.ico", "!**/*.pdf", "!**/*.zip", "!**/*.tar", "!**/*.tar.gz", "!**/*.tgz", "!**/*.xz", "!**/*.zst", "!**/*.mp4", "!**/*.webm", "!**/*.mov", "!**/*.ttf", "!**/*.woff", "!**/*.woff2", "!**/*.otf"];
const MISSING_DOCS_MESSAGE = `Local ${CONFIG.displayName} docs are not available at ${CONFIG.docsPath}. Run ${CONFIG.setupCommand} to set them up.`;

async function exists(filePath: string): Promise<boolean> { try { await fs.access(filePath); return true; } catch { return false; } }
async function runCommand(command: string, args: string[], cwd?: string): Promise<{ ok: boolean; stdout: string; stderr: string; error?: string }> {
  return await new Promise((resolve) => execFile(command, args, { cwd, timeout: 300000 }, (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr, error: error instanceof Error ? error.message : undefined })));
}
function repoPath(repo: RepoSpec): string { return path.join(CONFIG.docsPath, repo.name); }
async function gitRevision(repo: RepoSpec): Promise<string | undefined> { if (!await exists(path.join(repoPath(repo), ".git"))) return undefined; const r = await runCommand("git", ["rev-parse", "--short", "HEAD"], repoPath(repo)); return r.ok ? r.stdout.trim() || undefined : undefined; }
async function gitRevisions(): Promise<Record<string, string | undefined>> { const result: Record<string, string | undefined> = {}; for (const repo of REPOS) result[repo.name] = await gitRevision(repo); return result; }

const wiki = createLocalWikiEngine({
  displayName: CONFIG.displayName,
  docsPath: CONFIG.docsPath,
  cacheDir: CONFIG.cacheDir,
  schemaVersion: CONFIG.schemaVersion,
  fileExtensions: /\.(md|mdx|rst)$/i,
  format: "markdown",
  queryExpansions: CONFIG.queryExpansions,
  missingDocsMessage: MISSING_DOCS_MESSAGE,
  sourceName: (filePath, docsPath) => path.relative(docsPath, filePath).split(path.sep)[0] || "docs",
  metadataExtra: async () => ({ gitRevisions: await gitRevisions() }),
  statusExtra: async () => ({ gitRevisions: await gitRevisions() }),
});

function jsonToolResult(payload: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }], details: payload }; }
async function setupRepo(repo: RepoSpec, progress?: ProgressReporter): Promise<string> {
  const target = repoPath(repo);
  if (!await exists(target)) {
    await fs.mkdir(CONFIG.docsPath, { recursive: true });
    await progress?.(`${repo.name}: cloning sparse, shallow docs from ${repo.repoUrl}`);
    const clone = await runCommand("git", ["clone", "--filter=blob:none", "--depth=1", "--sparse", "--no-checkout", repo.repoUrl, target], CONFIG.docsPath);
    if (!clone.ok) return `${repo.name}: clone failed: ${clone.stderr || clone.error}`;
    await progress?.(`${repo.name}: configuring sparse checkout patterns`);
    const init = await runCommand("git", ["sparse-checkout", "init", "--no-cone"], target);
    if (!init.ok) return `${repo.name}: sparse init failed: ${init.stderr || init.error}`;
    await fs.writeFile(path.join(target, ".git", "info", "sparse-checkout"), `${[...repo.sparsePatterns, ...BINARY_EXCLUDE_PATTERNS].join("\n")}\n`);
    await progress?.(`${repo.name}: checking out documentation files only`);
    const checkout = await runCommand("git", ["checkout"], target);
    return checkout.ok ? `${repo.name}: cloned sparse docs` : `${repo.name}: checkout failed: ${checkout.stderr || checkout.error}`;
  }
  if (await exists(path.join(target, ".git"))) { await progress?.(`${repo.name}: updating existing checkout`); const pull = await runCommand("git", ["pull", "--ff-only"], target); return pull.ok ? `${repo.name}: updated` : `${repo.name}: update failed: ${pull.stderr || pull.error}`; }
  return `${repo.name}: path exists but is not a Git checkout: ${target}`;
}
async function executeSetup(progress?: ProgressReporter) { const messages: string[] = []; await progress?.(`setup: target docs path is ${CONFIG.docsPath}`); for (const repo of REPOS) { const message = await setupRepo(repo, progress); messages.push(message); await progress?.(message); } await progress?.("cache: indexing local documentation corpus"); try { await wiki.buildCache(); messages.push("cache: rebuilt search index"); await progress?.("cache: rebuilt search index"); } catch (error) { const message = `cache: ${(error as Error).message}`; messages.push(message); await progress?.(message); } const ok = await wiki.available(); await progress?.(ok ? "setup: complete" : "setup: incomplete; local docs are still unavailable"); return { ok, message: messages.join("\n") }; }

const searchParams = Type.Object({ query: Type.String({ description: "Search query, e.g. 'NixOS flakes'" }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })), includeSnippets: Type.Optional(Type.Boolean()) });
const readParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })) });
const sectionsParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }) });
const extractParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), section: Type.Optional(Type.String()), query: Type.Optional(Type.String()), maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000 })) });
const relatedParams = Type.Object({ page: Type.String({ description: "Page title, slug, or absolute local path" }), limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })) });

export default function nixosWikiExtension(pi: ExtensionAPI) {
  pi.on?.("before_agent_start", async (event, ctx) => { const skillLoaded = event.systemPromptOptions.skills?.some((skill) => skill.name === CONFIG.skillName) ?? false; if (!skillLoaded && !CONFIG.promptDetection.test(event.prompt ?? "")) return; if (!await wiki.available()) { const warning = `${MISSING_DOCS_MESSAGE} Aborting ${CONFIG.displayName}-local lookup until setup is complete.`; ctx.ui.notify(warning, "warning"); ctx.abort(); return { message: { customType: "nixos-wiki-local-missing-docs", content: warning, display: true }, systemPrompt: `${event.systemPrompt}\n\n${CONFIG.displayName} local documentation setup required: ${warning} Do not continue with NixOS/Nix troubleshooting until the user runs ${CONFIG.setupCommand}.` }; } return { systemPrompt: `${event.systemPrompt}\n\n${CONFIG.displayName} local documentation routing: This prompt appears related to ${CONFIG.topicName}. Use nixoswiki_search before web sources, then nixoswiki_extract for focused sections with local path citations. Do not assume the user is on NixOS; prefer read-only diagnostics and ask before destructive changes.` }; });
  pi.registerCommand("nixoswiki-status", { description: `Show local ${CONFIG.displayName} docs path, page count, repository revisions, and cache freshness`, handler: async (_args, ctx) => { ctx.ui.notify(JSON.stringify(await wiki.status(), null, 2), "info"); } });
  pi.registerCommand("nixoswiki-local-setup", { description: `Clone/update minimal local ${CONFIG.displayName} documentation corpus`, handler: async (_args, ctx) => { const lines: string[] = []; const progress = async (line: string) => { lines.push(line); ctx.ui.setWidget?.("nixoswiki-setup", ["NixOS/Nix docs setup", ...lines.slice(-12)]); ctx.ui.notify(line, "info"); }; const result = await executeSetup(progress); ctx.ui.setWidget?.("nixoswiki-setup", undefined); ctx.ui.notify(result.message, result.ok ? "info" : "warning"); } });
  pi.registerTool({ name: "nixoswiki_search", label: `${CONFIG.displayName} Search`, description: `Search local ${CONFIG.displayName} pages from ${CONFIG.docsPath}.`, promptSnippet: `Search local ${CONFIG.displayName} pages before using web sources for NixOS/Nix questions`, promptGuidelines: ["Use nixoswiki_search first for NixOS/Nix questions before consulting web sources.", "Use nixoswiki_extract after search to retrieve focused sections with citations."], parameters: searchParams, async execute(_id, params) { return jsonToolResult(await wiki.search(params)); } });
  pi.registerTool({ name: "nixoswiki_read", label: `${CONFIG.displayName} Read`, description: `Read a local ${CONFIG.displayName} page as clean text with a local path citation.`, promptSnippet: `Read local ${CONFIG.displayName} page text by title, slug, or absolute local path`, promptGuidelines: ["Use nixoswiki_read only when broad page context is needed; prefer nixoswiki_extract for focused answers."], parameters: readParams, async execute(_id, params) { return jsonToolResult(await wiki.read(params)); } });
  pi.registerTool({ name: "nixoswiki_sections", label: `${CONFIG.displayName} Sections`, description: `List headings/sections for a local ${CONFIG.displayName} page.`, promptSnippet: `List headings from a local ${CONFIG.displayName} page`, promptGuidelines: ["Use nixoswiki_sections to choose exact local sections before extraction."], parameters: sectionsParams, async execute(_id, params) { return jsonToolResult(await wiki.sections(params)); } });
  pi.registerTool({ name: "nixoswiki_extract", label: `${CONFIG.displayName} Extract`, description: `Extract a named or query-relevant section from a local ${CONFIG.displayName} page.`, promptSnippet: `Extract focused local ${CONFIG.displayName} sections by heading or query`, promptGuidelines: ["Use nixoswiki_extract to cite exact local sections in final answers."], parameters: extractParams, async execute(_id, params) { return jsonToolResult(await wiki.extract(params)); } });
  pi.registerTool({ name: "nixoswiki_related", label: `${CONFIG.displayName} Related`, description: `Return local ${CONFIG.displayName} pages linked from a given local page.`, promptSnippet: `Find locally linked ${CONFIG.displayName} pages related to a page`, promptGuidelines: ["Use nixoswiki_related when an issue spans connected NixOS/Nix topics."], parameters: relatedParams, async execute(_id, params) { return jsonToolResult(await wiki.related(params)); } });
}
