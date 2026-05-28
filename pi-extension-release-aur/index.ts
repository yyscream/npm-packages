import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "release-aur";
const OUTPUT_WIDGET_KEY = "release-aur:output";
const FOOTER_WIDGET_KEY = "release-aur:footer";
const LOG_WIDGET_KEY = "release-aur:logs";
const SETUP_WIDGET_KEY = "release-aur:setup";
const COLLAPSED_LINES = 36;
const EXPANDED_LINES = 160;
const LOG_RENDER_LIMIT = 240;
const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_RESOURCE_DIR = join(EXTENSION_DIR, "node_modules", "@firstpick", "pi-extension-release-aur");
const LOG_DIR = join(homedir(), ".pi", "agent", "release-aur-logs");
const AUR_HOST = "aur.archlinux.org";
const AUR_USER = "aur";
const DEFAULT_AUR_KEY = join(homedir(), ".ssh", "aur");
const MANAGED_AUR_CONFIG_BEGIN = "# >>> pi release-aur setup: aur.archlinux.org";
const MANAGED_AUR_CONFIG_END = "# <<< pi release-aur setup: aur.archlinux.org";

type RunResult = { ok: boolean; output: string; aborted: boolean };
type AbortableChild = ChildProcessWithoutNullStreams & { abortReleaseStep?: () => void };
type ReleaseRunLog = { id: string; startedAt: string; cwd: string; chunks: string[]; saved: boolean };
type LogEntry = { file: string; title: string; mtimeMs: number };
type Action = "plan" | "publish" | "create" | "logs" | "abort" | "toggle" | "help";
type ParsedArgs = { action: Action; target?: string; pkgbase?: string; flags: string[]; noAgentReview: boolean; pushAfterCreate: boolean };

type ActiveRun = { abort: () => void; toggleOutput: () => void };
let activeRun: ActiveRun | undefined;
let activeLogViewerCleanup: (() => void) | undefined;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sanitizeLogId(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, "-");
}

function createRunLog(cwd: string): ReleaseRunLog {
  const startedAt = new Date().toISOString();
  return { id: sanitizeLogId(startedAt), startedAt, cwd, chunks: [], saved: false };
}

function appendLog(runLog: ReleaseRunLog, chunk: string): void {
  runLog.chunks.push(chunk);
}

function saveRunLog(runLog: ReleaseRunLog, status: string, summary?: string): string | undefined {
  if (runLog.saved) return undefined;
  runLog.saved = true;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const path = join(LOG_DIR, `${runLog.id}-${sanitizeLogId(status)}.log`);
    const content = [
      "release-aur log",
      `started_at=${runLog.startedAt}`,
      `finished_at=${new Date().toISOString()}`,
      `status=${status}`,
      `cwd=${runLog.cwd}`,
      summary ? `summary=${summary.replace(/\r?\n/g, " | ")}` : undefined,
      "",
      "--- output ---",
      runLog.chunks.join(""),
    ].filter((line): line is string => line !== undefined).join("\n");
    writeFileSync(path, content, "utf8");
    return path;
  } catch {
    return undefined;
  }
}

function listLogs(): LogEntry[] {
  if (!existsSync(LOG_DIR)) return [];
  return readdirSync(LOG_DIR)
    .filter((file) => file.endsWith(".log"))
    .map((file) => {
      const path = join(LOG_DIR, file);
      const stat = statSync(path);
      return { file: path, title: file.replace(/\.log$/, ""), mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function extensionResourcePath(...parts: string[]): string {
  const candidates = [
    join(EXTENSION_DIR, ...parts),
    join(PACKAGE_RESOURCE_DIR, ...parts),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[candidates.length - 1];
}

function scriptCommand(cwd: string, args: string[]): string {
  const localCandidates = [join(cwd, "dev", "scripts", "aur-release-workflow.sh"), join(cwd, "aur-release-workflow.sh")];
  const scriptPath = localCandidates.find((candidate) => existsSync(candidate)) ?? extensionResourcePath("aur-release-workflow.sh");
  return [
    `PI_AUR_PACKAGES_ROOT=${shellQuote(cwd)}`,
    "bash",
    shellQuote(scriptPath),
    ...args.map(shellQuote),
  ].join(" ");
}

async function runScriptLive(
  cwd: string,
  command: string,
  onChunk: (chunk: string) => void,
  onChild?: (child: AbortableChild) => void,
): Promise<RunResult> {
  return await new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true }) as AbortableChild;
    let output = "";
    let aborted = false;

    child.abortReleaseStep = () => {
      aborted = true;
      try {
        if (child.pid) process.kill(-child.pid, "SIGINT");
      } catch {
        child.kill("SIGINT");
      }
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try {
            if (child.pid) process.kill(-child.pid, "SIGTERM");
          } catch {
            child.kill("SIGTERM");
          }
        }
      }, 1500).unref();
    };

    onChild?.(child);
    child.stdout.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      onChunk(chunk);
    });
    child.stderr.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      onChunk(chunk);
    });
    child.on("close", (code) => resolve({ ok: code === 0 && !aborted, output, aborted }));
  });
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1].replace(/\\"/g, '"'));
    else if (match[2] !== undefined) tokens.push(match[2]);
    else tokens.push(match[0]);
  }
  return tokens;
}

function parseArgs(raw: string): ParsedArgs {
  const tokens = tokenize(raw.trim());
  const actions = new Set<Action>(["plan", "publish", "create", "logs", "abort", "toggle", "help"]);
  let action: Action = "plan";
  let index = 0;
  if (tokens[0] && actions.has(tokens[0] as Action)) {
    action = tokens[0] as Action;
    index = 1;
  }

  const flags: string[] = [];
  let target: string | undefined;
  let pkgbase: string | undefined;
  let noAgentReview = false;
  let pushAfterCreate = false;

  while (index < tokens.length) {
    const token = tokens[index++];
    if (!token) continue;
    if (token === "--no-agent-review") {
      noAgentReview = true;
      continue;
    }
    if (action === "create" && (token === "--push" || token === "--publish")) {
      pushAfterCreate = true;
      continue;
    }
    if (token === "--pkgbase") {
      pkgbase = tokens[index++];
      continue;
    }
    if (token === "--target") {
      target = tokens[index++];
      continue;
    }
    if (token.startsWith("--")) {
      flags.push(token);
      continue;
    }
    if (action === "create" && !pkgbase) {
      pkgbase = token;
      continue;
    }
    if (!target) {
      target = token;
      continue;
    }
    flags.push(token);
  }

  return { action, target, pkgbase, flags, noAgentReview, pushAfterCreate };
}

function discoverTargets(cwd: string): string[] {
  if (existsSync(join(cwd, "PKGBUILD"))) return ["."];
  try {
    return readdirSync(cwd, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(cwd, entry.name, "PKGBUILD")))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function resolveTarget(ctx: ExtensionCommandContext, parsed: ParsedArgs): Promise<string> {
  if (parsed.target) return parsed.target;
  const targets = discoverTargets(ctx.cwd);
  if (targets.length === 0) return "auto";
  if (targets.length === 1) return targets[0];
  if (!ctx.hasUI) return "all";
  const choice = await ctx.ui.select("Select AUR package target", [...targets, "all", "Cancel"]);
  if (!choice || choice === "Cancel") return "__cancelled__";
  return choice;
}

function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function extractSummary(output: string): string {
  const lines = stripAnsi(output).split(/\r?\n/);
  const starts = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.trim() === "AUR release summary:");
  if (starts.length === 0) return lines.slice(-60).join("\n");
  const start = starts[starts.length - 1].index;
  return lines.slice(start, Math.min(lines.length, start + 80)).join("\n").trim();
}

function truncateForPrompt(output: string, maxChars = 22000): string {
  if (output.length <= maxChars) return output;
  return `${output.slice(0, 4000)}\n\n[... middle omitted: ${output.length - maxChars} chars ...]\n\n${output.slice(-(maxChars - 4000))}`;
}

function queueAgentReview(pi: ExtensionAPI, cwd: string, target: string, output: string): void {
  const prompt = [
    "Review this AUR package release plan before any commit or push.",
    "",
    "Expected review:",
    "- Inspect the package files and git diff if needed.",
    "- Verify PKGBUILD/.SRCINFO consistency, source/checksum handling, direct dependencies, pkgver/pkgrel policy, VCS package policy, namcap errors, and whether build artifacts or secrets could be staged.",
    "- Return GO or NO-GO. If GO, include the exact publish command to run. If NO-GO, list blocking fixes.",
    "- Do not push; publishing must only happen through /release-aur publish after explicit user confirmation.",
    "",
    `cwd: ${cwd}`,
    `target: ${target}`,
    "",
    "Preflight output:",
    "```text",
    truncateForPrompt(output),
    "```",
  ].join("\n");
  pi.sendUserMessage(prompt, { deliverAs: "followUp" });
}

function queueFailureReview(pi: ExtensionAPI, step: string, output: string): void {
  pi.sendUserMessage([
    `AUR release step failed: ${step}.`,
    "Analyze the failure and provide root cause, exact safe fix steps, and safe rerun command order.",
    "",
    "Failure output:",
    "```text",
    truncateForPrompt(output, 16000),
    "```",
  ].join("\n"), { deliverAs: "followUp" });
}

function isCtrlO(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x0f" || key === "ctrl+o" || data === "\x1b[111;5u" || data === "\x1b[27;5;111~";
}

function isCtrlC(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x03" || key === "ctrl+c" || data === "\x1b[99;5u" || data === "\x1b[27;5;99~";
}

function truncateLine(line: string, width: number): string {
  return line.length > width ? `${line.slice(0, Math.max(0, width - 1))}…` : line;
}

function resolveUserPath(input: string, cwd: string): string {
  let value = input.trim();
  if (value.startsWith("@")) value = value.slice(1);
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  return isAbsolute(value) ? value : resolve(cwd, value);
}

function pkgbuildQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseGitHubRepo(input: string): { owner: string; repo: string; url: string } | undefined {
  const raw = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  try {
    const url = new URL(raw);
    if (url.hostname !== "github.com") return undefined;
    const [owner, repo] = url.pathname.replace(/^\//, "").split("/");
    if (!owner || !repo) return undefined;
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    const match = raw.match(/^github\.com\/([^/]+)\/([^/]+)$/);
    if (!match) return undefined;
    return { owner: match[1], repo: match[2], url: `https://github.com/${match[1]}/${match[2]}` };
  }
}

function defaultBinaryName(pkgbase: string): string {
  return pkgbase.replace(/^(python|rust|go)-/, "");
}

function templatePkgbuild(kind: "python" | "rust" | "go", input: {
  pkgbase: string;
  repoUrl: string;
  repoName: string;
  pkgver: string;
  pkgdesc: string;
  license: string;
  binaryName: string;
}): string {
  const templatePath = extensionResourcePath("templates", "pkgbuild", `${kind}.PKGBUILD.tmpl`);
  const template = readFileSync(templatePath, "utf8");
  const replacements: Record<string, string> = {
    __PKGBASE__: input.pkgbase,
    __PKGVER__: input.pkgver,
    __PKGDESC_QUOTED__: pkgbuildQuote(input.pkgdesc),
    __URL_QUOTED__: pkgbuildQuote(input.repoUrl),
    __LICENSE_QUOTED__: pkgbuildQuote(input.license),
    __REPO_NAME_QUOTED__: pkgbuildQuote(input.repoName),
    __BINARY_NAME_QUOTED__: pkgbuildQuote(input.binaryName),
  };

  let rendered = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(placeholder, value);
  }

  return rendered.endsWith("\n") ? rendered : `${rendered}\n`;
}

async function refreshChecksums(pkgDir: string, runLog: ReleaseRunLog): Promise<void> {
  if (!existsSync(join(pkgDir, "PKGBUILD"))) return;
  appendLog(runLog, "\n$ updpkgsums # template checksum refresh\n");
  const command = "if command -v updpkgsums >/dev/null 2>&1; then updpkgsums; else echo 'WARN: updpkgsums not installed; install pacman-contrib and replace SKIP checksums before publishing'; exit 0; fi";
  const result = await runScriptLive(pkgDir, command, (chunk) => appendLog(runLog, chunk));
  if (!result.ok) appendLog(runLog, "WARN: updpkgsums failed; release plan should block until checksums are fixed.\n");
}

async function promptMissingPkgbuild(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  pkgbase: string,
  runLog: ReleaseRunLog,
): Promise<"continue" | "stop"> {
  const pkgDir = resolve(ctx.cwd, pkgbase);
  if (!ctx.hasUI) {
    ctx.ui.notify(`AUR repo for ${pkgbase} has no PKGBUILD. Add one, then rerun /release-aur create ${pkgbase}.`, "warning");
    return "stop";
  }

  const choice = await ctx.ui.select(`PKGBUILD missing for ${pkgbase}. What should happen next?`, [
    "Yes, let Agent create it.",
    "Yes, add it from: /Path/to/file",
    "No, but create a template PKGBUILD.",
    "No, I will add it later.",
  ]);

  if (choice === "Yes, let Agent create it.") {
    appendLog(runLog, "\n--- missing PKGBUILD decision: let agent create it ---\n");
    pi.sendUserMessage([
      `The AUR package repo for ${pkgbase} exists at ${pkgDir}, but PKGBUILD is missing.`,
      "Please create a correct PKGBUILD for this package.",
      "Use Arch packaging best practices: direct dependencies, correct pkgver/pkgrel, real checksums for release tarballs, license install, and no build artifacts.",
      `After writing PKGBUILD, run /release-aur create ${pkgbase} to regenerate .SRCINFO and continue checks.`,
    ].join("\n"), { deliverAs: "followUp" });
    ctx.ui.notify("Queued an agent request to create PKGBUILD.", "info");
    return "stop";
  }

  if (choice === "Yes, add it from: /Path/to/file") {
    const input = await ctx.ui.input("Path to PKGBUILD", "~/path/to/PKGBUILD");
    if (!input?.trim()) {
      ctx.ui.notify("No PKGBUILD path entered; stopping create flow.", "warning");
      return "stop";
    }
    const sourcePath = resolveUserPath(input, ctx.cwd);
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
      ctx.ui.notify(`PKGBUILD source does not exist or is not a file: ${sourcePath}`, "error");
      appendLog(runLog, `\nERROR: PKGBUILD source invalid: ${sourcePath}\n`);
      return "stop";
    }
    mkdirSync(pkgDir, { recursive: true });
    copyFileSync(sourcePath, join(pkgDir, "PKGBUILD"));
    appendLog(runLog, `\n--- copied PKGBUILD from ${sourcePath} ---\n`);
    ctx.ui.notify(`Copied PKGBUILD from ${sourcePath}.`, "success");
    return "continue";
  }

  if (choice === "No, but create a template PKGBUILD.") {
    const templateChoices = {
      "Python — PEP 517 wheel from GitHub release tag": "python",
      "Rust — cargo release build from GitHub release tag": "rust",
      "Go — go build from GitHub release tag": "go",
    } as const;
    const kindChoice = await ctx.ui.select("Choose PKGBUILD template", [...Object.keys(templateChoices), "Cancel"]);
    if (!kindChoice || kindChoice === "Cancel") return "stop";
    const kind = templateChoices[kindChoice as keyof typeof templateChoices];

    const repoInput = await ctx.ui.input("GitHub repository URL", "https://github.com/owner/repo");
    const repo = repoInput ? parseGitHubRepo(repoInput) : undefined;
    if (!repo) {
      ctx.ui.notify("Template creation requires a GitHub repository URL like https://github.com/owner/repo.", "error");
      return "stop";
    }

    const pkgver = (await ctx.ui.input("pkgver", "0.1.0"))?.trim() || "0.1.0";
    const defaultDesc = `${kind} package from ${repo.owner}/${repo.repo}`;
    const pkgdesc = (await ctx.ui.input("pkgdesc", defaultDesc))?.trim() || defaultDesc;
    const license = (await ctx.ui.input("license", "MIT"))?.trim() || "MIT";
    const binaryName = kind === "python"
      ? defaultBinaryName(pkgbase)
      : ((await ctx.ui.input("binary name", defaultBinaryName(pkgbase)))?.trim() || defaultBinaryName(pkgbase));

    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "PKGBUILD"), templatePkgbuild(kind, {
      pkgbase,
      repoUrl: repo.url,
      repoName: repo.repo,
      pkgver,
      pkgdesc,
      license,
      binaryName,
    }), "utf8");
    appendLog(runLog, `\n--- wrote ${kind} GitHub template PKGBUILD for ${repo.url} ---\n`);
    ctx.ui.notify(`Wrote ${kind} template PKGBUILD for ${repo.url}. Running updpkgsums if available...`, "success");
    await refreshChecksums(pkgDir, runLog);
    return "continue";
  }

  appendLog(runLog, "\n--- missing PKGBUILD decision: user will add later ---\n");
  ctx.ui.notify(`AUR repo created. Add ${join(pkgDir, "PKGBUILD")}, then rerun /release-aur create ${pkgbase}.`, "info");
  return "stop";
}

function userPath(value: string): string {
  const home = homedir();
  return value === home ? "~" : value.startsWith(`${home}/`) ? `~/${value.slice(home.length + 1)}` : value;
}

function sshConfigIdentityPath(keyPath: string): string {
  return userPath(keyPath);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedAurSshConfigBlock(keyPath: string): string {
  return [
    MANAGED_AUR_CONFIG_BEGIN,
    `Host ${AUR_HOST}`,
    `    User ${AUR_USER}`,
    `    IdentityFile ${sshConfigIdentityPath(keyPath)}`,
    "    IdentitiesOnly yes",
    MANAGED_AUR_CONFIG_END,
    "",
  ].join("\n");
}

function findAurHostBlock(lines: string[]): { start: number; end: number } | undefined {
  for (let i = 0; i < lines.length; i++) {
    const withoutComment = lines[i].replace(/#.*/, "").trim();
    if (!/^Host\s+/i.test(withoutComment)) continue;
    const patterns = withoutComment.split(/\s+/).slice(1);
    if (!patterns.includes(AUR_HOST)) continue;

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*(Host|Match)\s+/i.test(lines[j])) {
        end = j;
        break;
      }
    }
    return { start: i, end };
  }
  return undefined;
}

function patchAurHostBlock(content: string, keyPath: string): string | undefined {
  const lines = content.split(/\r?\n/);
  const block = findAurHostBlock(lines);
  if (!block) return undefined;

  const desired = [
    "    # Managed by /release-aur-setup for AUR publishing",
    `    User ${AUR_USER}`,
    `    IdentityFile ${sshConfigIdentityPath(keyPath)}`,
    "    IdentitiesOnly yes",
  ];
  const rest = lines.slice(block.start + 1, block.end).filter((line) => {
    const token = line.replace(/#.*/, "").trim().split(/\s+/)[0]?.toLowerCase();
    return token !== "user" && token !== "identityfile" && token !== "identitiesonly";
  });
  const next = [
    ...lines.slice(0, block.start + 1),
    ...desired,
    ...rest,
    ...lines.slice(block.end),
  ].join("\n");
  return next.endsWith("\n") ? next : `${next}\n`;
}

function upsertManagedAurSshConfig(content: string, keyPath: string): string {
  const block = managedAurSshConfigBlock(keyPath);
  const re = new RegExp(`${escapeRegExp(MANAGED_AUR_CONFIG_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_AUR_CONFIG_END)}\\n?`, "m");
  if (re.test(content)) return content.replace(re, block);
  const trimmed = content.trimEnd();
  return `${trimmed}${trimmed ? "\n\n" : ""}${block}`;
}

function hasAurHostBlock(content: string): boolean {
  return findAurHostBlock(content.split(/\r?\n/)) !== undefined;
}

function ensureSshDirectory(): string {
  const sshDir = join(homedir(), ".ssh");
  mkdirSync(sshDir, { recursive: true });
  chmodSync(sshDir, 0o700);
  return sshDir;
}

function chmodIfExists(path: string, mode: number): void {
  if (!existsSync(path)) return;
  try {
    chmodSync(path, mode);
  } catch {
    // Best-effort; OpenSSH will report permission problems during the test step.
  }
}

function readTextIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function aurSshStatusLines(): string[] {
  const sshDir = join(homedir(), ".ssh");
  const configPath = join(sshDir, "config");
  const keyPath = DEFAULT_AUR_KEY;
  const publicKeyPath = `${keyPath}.pub`;
  const config = readTextIfExists(configPath);
  return [
    `ssh dir: ${existsSync(sshDir) ? "present" : "missing"} (${userPath(sshDir)})`,
    `AUR private key: ${existsSync(keyPath) ? "present" : "missing"} (${userPath(keyPath)})`,
    `AUR public key: ${existsSync(publicKeyPath) ? "present" : "missing"} (${userPath(publicKeyPath)})`,
    `ssh config: ${existsSync(configPath) ? "present" : "missing"} (${userPath(configPath)})`,
    `Host ${AUR_HOST} config: ${hasAurHostBlock(config) || config.includes(MANAGED_AUR_CONFIG_BEGIN) ? "present" : "missing"}`,
  ];
}

function showSetupWidget(ctx: ExtensionCommandContext, title: string, lines: string[]): void {
  if (!ctx.hasUI) return;
  ctx.ui.setWidget(SETUP_WIDGET_KEY, [title, "", ...lines], { placement: "aboveEditor" });
}

async function runSetupCommand(
  ctx: ExtensionCommandContext,
  runLog: ReleaseRunLog,
  label: string,
  command: string,
): Promise<RunResult> {
  let currentChild: AbortableChild | undefined;
  appendLog(runLog, `\n$ ${command}\n`);
  if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", `AUR setup: ${label}`));
  activeRun = {
    abort: () => currentChild?.abortReleaseStep?.(),
    toggleOutput: () => ctx.ui.notify("release-aur-setup writes detailed command output to its saved log.", "info"),
  };
  const result = await runScriptLive(ctx.cwd, command, (chunk) => appendLog(runLog, chunk), (child) => { currentChild = child; });
  currentChild = undefined;
  activeRun = undefined;
  return result;
}

function setupHelpText(): string {
  return [
    "Usage:",
    "  /release-aur-setup",
    "  /release-aur-setup ssh",
    "  /release-aur-setup status",
    "  /release-aur-setup abort",
    "  /release-aur-setup help",
    "",
    "The setup command starts with AUR SSH publishing access. It creates ~/.ssh if needed, can create a dedicated ~/.ssh/aur key, configures Host aur.archlinux.org, shows the public key to add to your AUR profile, and tests SSH auth.",
  ].join("\n");
}

function aurSshTestCommand(): string {
  return `ssh -T -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${AUR_HOST}`;
}

function isAurSshSuccess(result: RunResult): boolean {
  const output = stripAnsi(result.output);
  return result.ok || /successfully authenticated|welcome to aur|interactive shell is disabled|shell access is disabled|aur does not provide shell/i.test(output);
}

function aurSshFailureHint(output: string): string {
  if (/Permission denied/i.test(output)) {
    return "AUR rejected the key. Confirm the public key is saved in your AUR profile and the selected key matches ~/.ssh/config.";
  }
  if (/Host key verification failed/i.test(output)) {
    return "Host key verification failed. Review ~/.ssh/known_hosts for aur.archlinux.org.";
  }
  if (/Could not resolve hostname|Name or service not known|Temporary failure in name resolution/i.test(output)) {
    return "DNS/network lookup failed. Check connectivity and DNS before changing AUR keys.";
  }
  return "Review the SSH output log and rerun /release-aur-setup ssh after fixing it.";
}

async function maybeCopyPublicKeyToClipboard(ctx: ExtensionCommandContext, runLog: ReleaseRunLog, publicKeyPath: string): Promise<void> {
  const command = [
    "if command -v wl-copy >/dev/null 2>&1; then wl-copy <", shellQuote(publicKeyPath),
    "; elif command -v xclip >/dev/null 2>&1; then xclip -selection clipboard <", shellQuote(publicKeyPath),
    "; elif command -v xsel >/dev/null 2>&1; then xsel --clipboard --input <", shellQuote(publicKeyPath),
    "; elif command -v pbcopy >/dev/null 2>&1; then pbcopy <", shellQuote(publicKeyPath),
    "; else echo 'No supported clipboard tool found (wl-copy, xclip, xsel, pbcopy).'; exit 127; fi",
  ].join(" ");
  const result = await runSetupCommand(ctx, runLog, "copy-public-key", command);
  ctx.ui.notify(result.ok ? "AUR public key copied to clipboard." : "Could not copy public key; read/copy it from the displayed path instead.", result.ok ? "success" : "warning");
}

async function runAurSshSetup(ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify(setupHelpText(), "info");
    return;
  }
  if (activeRun) {
    ctx.ui.notify("A release-aur workflow is already running. Use /release-aur abort first if needed.", "warning");
    return;
  }

  const runLog = createRunLog(ctx.cwd);
  try {
    const confirmed = await ctx.ui.confirm(
      "Set up AUR SSH publishing access?",
      [
        "This follows ArchWiki AUR guidance:",
        `- use SSH for write access to ${AUR_HOST}`,
        "- use a dedicated key pair so it can be revoked independently",
        `- configure Host ${AUR_HOST} with User ${AUR_USER} and IdentityFile ~/.ssh/aur`,
        "",
        "It will edit files under ~/.ssh only after confirmation, including ~/.ssh/config and possibly ~/.ssh/known_hosts during the SSH test. It cannot add the public key to your AUR web profile automatically; it will show/copy the key for you.",
      ].join("\n"),
    );
    if (!confirmed) {
      ctx.ui.notify("AUR SSH setup cancelled.", "info");
      return;
    }

    const tools = await runSetupCommand(ctx, runLog, "check-tools", "missing=0; for c in ssh ssh-keygen git; do if ! command -v \"$c\" >/dev/null 2>&1; then echo \"MISSING:$c\"; missing=1; else echo \"OK:$c=$(command -v \"$c\")\"; fi; done; exit $missing");
    if (!tools.ok) {
      const logPath = saveRunLog(runLog, "setup-missing-tools", stripAnsi(tools.output));
      ctx.ui.notify(`Missing required tools for AUR SSH setup. Install openssh and git, then rerun /release-aur-setup.${logPath ? ` Log: ${logPath}` : ""}`, "error");
      return;
    }

    const existingSshDir = join(homedir(), ".ssh");
    const existingConfigPath = join(existingSshDir, "config");
    const existingConfig = readTextIfExists(existingConfigPath);
    if (hasAurHostBlock(existingConfig)) {
      appendLog(runLog, `\nDetected existing Host ${AUR_HOST} in ${existingConfigPath}; testing before making setup changes.\n`);
      showSetupWidget(ctx, "Existing AUR SSH config detected", [
        `Config: ${userPath(existingConfigPath)}`,
        `Host: ${AUR_HOST}`,
        "Testing existing SSH auth before creating keys or editing config.",
      ]);
      ctx.ui.notify("Existing AUR SSH config detected; testing connection first...", "info");

      while (true) {
        const existingTest = await runSetupCommand(ctx, runLog, "test-existing-ssh", aurSshTestCommand());
        if (isAurSshSuccess(existingTest)) {
          const logPath = saveRunLog(runLog, "setup-existing-ssh-ok", extractSummary(existingTest.output));
          ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR setup:OK"));
          ctx.ui.notify(`Existing AUR SSH setup works. No key/config changes needed.${logPath ? ` Log: ${logPath}` : ""}`, "success");
          return;
        }

        const hint = aurSshFailureHint(stripAnsi(existingTest.output));
        const next = await ctx.ui.select([
          "Existing AUR SSH config was found, but the connection test failed.",
          "",
          hint,
          "",
          "Continue guided setup only if you want Pi to repair/create AUR SSH config.",
        ].join("\n"), ["Retry SSH test", "Continue guided setup", "Stop and inspect log"]);
        if (next === "Retry SSH test") continue;
        if (next !== "Continue guided setup") {
          const logPath = saveRunLog(runLog, "setup-existing-ssh-failed", extractSummary(existingTest.output));
          ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR setup:Failed"));
          ctx.ui.notify(`Existing AUR SSH test failed. ${hint}${logPath ? ` Log: ${logPath}` : ""}`, "error");
          return;
        }
        appendLog(runLog, "\nUser chose to continue guided setup after existing AUR SSH test failed.\n");
        break;
      }
    }

    const sshDir = ensureSshDirectory();
    const configPath = join(sshDir, "config");
    let keyPath = DEFAULT_AUR_KEY;
    let privateKeyExists = existsSync(keyPath);
    let publicKeyExists = existsSync(`${keyPath}.pub`);

    if (!privateKeyExists) {
      const keyChoice = await ctx.ui.select("No dedicated AUR SSH key found at ~/.ssh/aur", [
        "Generate ~/.ssh/aur automatically (ed25519, empty passphrase)",
        "Use an existing key path",
        "Show manual passphrase command and stop",
        "Cancel",
      ]);
      if (!keyChoice || keyChoice === "Cancel") {
        ctx.ui.notify("AUR SSH setup cancelled before key creation.", "info");
        return;
      }
      if (keyChoice === "Show manual passphrase command and stop") {
        const manual = [
          "Run this in a normal shell so ssh-keygen can ask for a passphrase:",
          "",
          "ssh-keygen -t ed25519 -f ~/.ssh/aur -C \"$(whoami)@$(uname -n)-aur-$(date -I)\"",
          "",
          "Then rerun /release-aur-setup ssh.",
        ];
        showSetupWidget(ctx, "Manual AUR SSH key creation", manual);
        const logPath = saveRunLog(runLog, "setup-manual-key-needed", manual.join(" | "));
        ctx.ui.notify(`Manual key command shown.${logPath ? ` Log: ${logPath}` : ""}`, "info");
        return;
      }
      if (keyChoice === "Use an existing key path") {
        const input = await ctx.ui.input("Existing private key path", "~/.ssh/id_ed25519");
        if (!input?.trim()) {
          ctx.ui.notify("No key path entered; setup stopped.", "warning");
          return;
        }
        keyPath = resolveUserPath(input, ctx.cwd);
        privateKeyExists = existsSync(keyPath);
        publicKeyExists = existsSync(`${keyPath}.pub`);
        if (!privateKeyExists) {
          ctx.ui.notify(`Private key does not exist: ${keyPath}`, "error");
          return;
        }
      } else {
        const unsafeOk = await ctx.ui.confirm(
          "Generate automated AUR key without passphrase?",
          [
            "This creates a dedicated Ed25519 key at ~/.ssh/aur with an empty passphrase so the setup can be fully automated.",
            "ArchWiki warns that private keys without passphrases are stored unencrypted; choose the manual option if you want a passphrase.",
          ].join("\n"),
        );
        if (!unsafeOk) {
          ctx.ui.notify("AUR key generation cancelled.", "info");
          return;
        }
        const comment = `${process.env.USER ?? "user"}@${hostname()}-aur-${new Date().toISOString().slice(0, 10)}`;
        const generated = await runSetupCommand(ctx, runLog, "generate-key", `ssh-keygen -t ed25519 -f ${shellQuote(keyPath)} -C ${shellQuote(comment)} -N ''`);
        if (!generated.ok) {
          const logPath = saveRunLog(runLog, "setup-keygen-failed", stripAnsi(generated.output));
          ctx.ui.notify(`ssh-keygen failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
          return;
        }
        privateKeyExists = true;
        publicKeyExists = existsSync(`${keyPath}.pub`);
      }
    }

    chmodIfExists(keyPath, 0o600);
    if (!publicKeyExists && privateKeyExists) {
      const regen = await ctx.ui.confirm("Public key file missing", `Generate ${userPath(`${keyPath}.pub`)} from ${userPath(keyPath)}?`);
      if (!regen) {
        ctx.ui.notify("AUR SSH setup stopped because the public key file is missing.", "warning");
        return;
      }
      const pub = await runSetupCommand(ctx, runLog, "derive-public-key", `ssh-keygen -y -f ${shellQuote(keyPath)} > ${shellQuote(`${keyPath}.pub`)}`);
      if (!pub.ok) {
        const logPath = saveRunLog(runLog, "setup-public-key-failed", stripAnsi(pub.output));
        ctx.ui.notify(`Could not derive public key. If the key has a passphrase, run ssh-keygen manually in a terminal.${logPath ? ` Log: ${logPath}` : ""}`, "error");
        return;
      }
    }
    chmodIfExists(`${keyPath}.pub`, 0o644);

    const configBefore = readTextIfExists(configPath);
    let configAfter = configBefore;
    if (configBefore.includes(MANAGED_AUR_CONFIG_BEGIN)) {
      configAfter = upsertManagedAurSshConfig(configBefore, keyPath);
    } else if (hasAurHostBlock(configBefore)) {
      const editExisting = await ctx.ui.confirm(
        `Existing Host ${AUR_HOST} SSH config found`,
        [
          `Update that existing block to use User ${AUR_USER}, IdentityFile ${sshConfigIdentityPath(keyPath)}, and IdentitiesOnly yes?`,
          "Choose No if you manage this host manually; setup will continue with your existing SSH config.",
        ].join("\n"),
      );
      if (editExisting) configAfter = patchAurHostBlock(configBefore, keyPath) ?? configBefore;
    } else {
      configAfter = upsertManagedAurSshConfig(configBefore, keyPath);
    }
    if (configAfter !== configBefore) {
      writeFileSync(configPath, configAfter, "utf8");
      appendLog(runLog, `\nUpdated SSH config: ${configPath}\n`);
    } else {
      appendLog(runLog, "\nSSH config unchanged.\n");
    }
    chmodIfExists(configPath, 0o600);

    const publicKeyPath = `${keyPath}.pub`;
    const publicKey = readFileSync(publicKeyPath, "utf8").trim();
    showSetupWidget(ctx, "AUR public key — add this to your AUR account", [
      `File: ${userPath(publicKeyPath)}`,
      "AUR: My Account → SSH Public Key",
      "",
      publicKey,
    ]);

    while (true) {
      const next = await ctx.ui.select("Add the public key to your AUR account, then test SSH", [
        "I added it to AUR; test SSH now",
        "Copy public key to clipboard",
        "Stop; I will add it later",
      ]);
      if (next === "Copy public key to clipboard") {
        await maybeCopyPublicKeyToClipboard(ctx, runLog, publicKeyPath);
        continue;
      }
      if (next !== "I added it to AUR; test SSH now") {
        const logPath = saveRunLog(runLog, "setup-needs-aur-profile-key", `Public key: ${publicKeyPath}`);
        ctx.ui.notify(`Local AUR SSH setup is ready. Add ${userPath(publicKeyPath)} to your AUR profile, then rerun /release-aur-setup ssh to test.${logPath ? ` Log: ${logPath}` : ""}`, "info");
        return;
      }
      break;
    }

    const test = await runSetupCommand(ctx, runLog, "test-ssh", aurSshTestCommand());
    const logPath = saveRunLog(runLog, isAurSshSuccess(test) ? "setup-ssh-ok" : "setup-ssh-failed", extractSummary(test.output));
    if (isAurSshSuccess(test)) {
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR setup:OK"));
      ctx.ui.notify(`AUR SSH setup completed. You can now use /release-aur create or /release-aur publish.${logPath ? ` Log: ${logPath}` : ""}`, "success");
    } else {
      const hint = aurSshFailureHint(stripAnsi(test.output));
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR setup:Failed"));
      ctx.ui.notify(`AUR SSH test failed. ${hint}${logPath ? ` Log: ${logPath}` : ""}`, "error");
    }
  } catch (error) {
    activeRun = undefined;
    const message = error instanceof Error ? error.message : String(error);
    const logPath = saveRunLog(runLog, "setup-crashed", message);
    ctx.ui.notify(`release-aur setup crashed: ${message}${logPath ? ` Log: ${logPath}` : ""}`, "error");
  } finally {
    activeRun = undefined;
    if (ctx.hasUI) ctx.ui.setWorkingMessage();
  }
}

async function runAurSetupStatus(ctx: ExtensionCommandContext): Promise<void> {
  if (activeRun) {
    ctx.ui.notify("A release-aur setup/release process is already running. Use /release-aur-setup abort first if needed.", "warning");
    return;
  }

  const runLog = createRunLog(ctx.cwd);
  const lines = aurSshStatusLines();
  appendLog(runLog, "release-aur setup status\n\n--- local status ---\n");
  appendLog(runLog, `${lines.join("\n")}\n`);
  showSetupWidget(ctx, "release-aur setup status", [...lines, "", "AUR SSH connection: checking..."]);

  const test = await runSetupCommand(ctx, runLog, "status-test-ssh", aurSshTestCommand());
  const ok = isAurSshSuccess(test);
  const summary = extractSummary(test.output);
  const finalLines = [
    ...lines,
    "",
    `AUR SSH connection: ${ok ? "ok" : "failed"}`,
    ok ? "Existing SSH authentication can reach AUR." : aurSshFailureHint(stripAnsi(test.output)),
  ];
  showSetupWidget(ctx, "release-aur setup status", finalLines);
  const logPath = saveRunLog(runLog, ok ? "status-ssh-ok" : "status-ssh-failed", summary);

  if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg(ok ? "success" : "error", ok ? "AUR setup:OK" : "AUR setup:Failed"));
  ctx.ui.notify(`${finalLines.join("\n")}${logPath ? `\nLog: ${logPath}` : ""}`, ok ? "success" : "error");
}

function helpText(): string {
  return [
    "Usage:",
    "  /release-aur [plan] [target|all] [--chroot] [--repro] [--no-agent-review]",
    "  /release-aur publish [target|all] [--chroot] [--repro]",
    "  /release-aur create <pkgbase> [--push] [--chroot] [--repro] [--no-agent-review]",
    "  /release-aur logs",
    "  /release-aur abort",
    "  /release-aur toggle",
    "  /release-aur-setup [ssh|status|abort|help]",
    "",
    "Default action is plan. Plan runs checks in a temporary copy and queues an agent GO/NO-GO review. Use /release-aur-setup for AUR SSH publishing prerequisites. Create converges empty/non-git/already-git package dirs into an AUR repo, then plans by default. Create --push continues through publish after explicit confirmation. Publish re-runs checks, regenerates .SRCINFO, commits, and pushes only after explicit confirmation.",
  ].join("\n");
}

async function showLogs(ctx: ExtensionCommandContext): Promise<void> {
  const logs = listLogs();
  if (logs.length === 0) {
    ctx.ui.notify(`No release-aur logs found in ${LOG_DIR}.`, "info");
    return;
  }
  const choices = logs.slice(0, 80).map((log, index) => `${index + 1}. ${log.title}`);
  const choice = await ctx.ui.select("Select release-aur log to display", [...choices, "Cancel"]);
  if (!choice || choice === "Cancel") return;
  const selected = logs[choices.indexOf(choice)];
  if (!selected) return;

  let content = "";
  try {
    content = readFileSync(selected.file, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.notify(`Could not read release-aur log: ${message}`, "error");
    return;
  }

  activeLogViewerCleanup?.();
  const lines = content.split(/\r?\n/);
  const unsubscribe = ctx.hasUI
    ? ctx.ui.onTerminalInput((data) => {
      if (data === "\u001b" || data === "q" || data === "Q") {
        activeLogViewerCleanup?.();
        activeLogViewerCleanup = undefined;
        return { consume: true };
      }
      return undefined;
    })
    : undefined;
  activeLogViewerCleanup = () => {
    unsubscribe?.();
    if (ctx.hasUI) ctx.ui.setWidget(LOG_WIDGET_KEY, undefined);
  };

  if (ctx.hasUI) {
    ctx.ui.setWidget(LOG_WIDGET_KEY, (_tui, theme) => ({
      render: (width: number) => [
        truncateLine(theme.fg("accent", `release-aur log: ${selected.title}`), width),
        truncateLine(theme.fg("dim", `Path: ${selected.file} · showing last ${Math.min(LOG_RENDER_LIMIT, lines.length)}/${lines.length} lines · Esc/q closes`), width),
        "",
        ...lines.slice(-LOG_RENDER_LIMIT).map((line) => truncateLine(line, width)),
      ],
      invalidate: () => {},
    }), { placement: "aboveEditor" });
  }
  ctx.ui.notify(`Showing release-aur log ${selected.title}.`, "info");
}

export default function releaseAurExtension(pi: ExtensionAPI) {
  pi.registerCommand("release-aur-setup", {
    description: "Set up AUR publishing prerequisites, starting with SSH access",
    getArgumentCompletions: (prefix) => {
      const items = ["ssh", "status", "abort", "help"];
      const filtered = items.filter((item) => item.startsWith(prefix));
      return filtered.length ? filtered.map((value) => ({ value, label: value })) : null;
    },
    handler: async (args, ctx) => {
      const [action] = tokenize(args?.trim() ?? "");
      if (action === "help") {
        ctx.ui.notify(setupHelpText(), "info");
        return;
      }
      if (action === "status") {
        await runAurSetupStatus(ctx);
        return;
      }
      if (action === "abort") {
        if (!activeRun) {
          ctx.ui.notify("No active release-aur setup/release process to abort.", "warning");
          return;
        }
        activeRun.abort();
        ctx.ui.notify("Aborting release-aur setup/release process...", "warning");
        return;
      }
      if (action === "ssh") {
        await runAurSshSetup(ctx);
        return;
      }
      if (action) {
        ctx.ui.notify(`Unknown /release-aur-setup action: ${action}\n${setupHelpText()}`, "warning");
        return;
      }
      if (!ctx.hasUI) {
        ctx.ui.notify(setupHelpText(), "info");
        return;
      }
      const choice = await ctx.ui.select("release-aur setup", [
        "AUR SSH connection",
        "AUR SSH status",
        "Help",
        "Cancel",
      ]);
      if (choice === "AUR SSH connection") {
        await runAurSshSetup(ctx);
      } else if (choice === "AUR SSH status") {
        await runAurSetupStatus(ctx);
      } else if (choice === "Help") {
        ctx.ui.notify(setupHelpText(), "info");
      }
    },
  });

  pi.registerCommand("release-aur", {
    description: "Plan, review, create, and publish AUR packages safely",
    getArgumentCompletions: (prefix) => {
      const commands = ["plan", "publish", "create", "logs", "abort", "toggle", "help"];
      const targets = discoverTargets(process.cwd());
      const items = [...commands, ...targets, "all", "--chroot", "--repro", "--no-agent-review", "--push"];
      const filtered = items.filter((item) => item.startsWith(prefix));
      return filtered.length ? filtered.map((value) => ({ value, label: value })) : null;
    },
    handler: async (args, ctx) => {
      const parsed = parseArgs(args ?? "");

      if (parsed.action === "help") {
        ctx.ui.notify(helpText(), "info");
        return;
      }
      if (parsed.action === "logs") {
        await showLogs(ctx);
        return;
      }
      if (parsed.action === "abort") {
        if (!activeRun) {
          ctx.ui.notify("No active /release-aur process to abort.", "warning");
          return;
        }
        activeRun.abort();
        ctx.ui.notify("Aborting release-aur workflow...", "warning");
        return;
      }
      if (parsed.action === "toggle") {
        if (!activeRun) {
          ctx.ui.notify("No active /release-aur output to toggle.", "warning");
          return;
        }
        activeRun.toggleOutput();
        return;
      }
      if (activeRun) {
        ctx.ui.notify("A release-aur workflow is already running. Use /release-aur toggle or /release-aur abort.", "warning");
        return;
      }

      if (parsed.action === "create") {
        if (!parsed.pkgbase) {
          ctx.ui.notify("Usage: /release-aur create <pkgbase> [--push] [--chroot] [--repro]", "warning");
          return;
        }
        if (parsed.pushAfterCreate && !ctx.hasUI) {
          ctx.ui.notify("/release-aur create --push is blocked without interactive UI confirmation.", "error");
          return;
        }
        if (ctx.hasUI) {
          const confirmed = await ctx.ui.confirm(
            "Create/converge AUR package repository?",
            [
              `Target: ${parsed.pkgbase}`,
              `Root: ${ctx.cwd}`,
              "",
              "This converges the target directory into an AUR git repo:",
              "- empty/missing directory: clone AUR repo",
              "- PKGBUILD-only non-git directory: move aside, clone AUR repo, copy safe package files back",
              "- existing git repo: ensure an AUR remote exists",
              "",
              parsed.pushAfterCreate
                ? "After setup it will run checks, ask again, then commit and push if confirmed."
                : "After setup it will run checks and queue an agent GO/NO-GO review.",
            ].join("\n"),
          );
          if (!confirmed) {
            ctx.ui.notify("AUR create cancelled.", "info");
            return;
          }
        }
        await runCreateFlow(pi, ctx, parsed.pkgbase, parsed.flags, parsed.pushAfterCreate, !parsed.noAgentReview);
        return;
      }

      const target = await resolveTarget(ctx, parsed);
      if (target === "__cancelled__") {
        ctx.ui.notify("release-aur cancelled.", "info");
        return;
      }

      const commonArgs = ["--target", target, ...parsed.flags];
      if (parsed.action === "plan") {
        await runWorkflow(pi, ctx, ["--plan", ...commonArgs], "plan", target, !parsed.noAgentReview);
        return;
      }

      if (parsed.action === "publish") {
        if (!ctx.hasUI) {
          ctx.ui.notify("/release-aur publish is blocked without interactive UI confirmation.", "error");
          return;
        }
        await runWorkflow(pi, ctx, ["--plan", ...commonArgs], "publish-preflight", target, false, async (plan) => {
          if (!plan.ok) return false;
          const summary = extractSummary(plan.output);
          const choice = await ctx.ui.select([
            "Publish to AUR?",
            "",
            summary,
            "",
            "Continue only if an agent/user review returned GO. This will regenerate .SRCINFO, create a git commit, and push HEAD to AUR master.",
          ].join("\n"), ["No", "Yes, commit and push to AUR"]);
          if (choice !== "Yes, commit and push to AUR") {
            ctx.ui.notify("AUR publish cancelled after preflight.", "info");
            return false;
          }
          return true;
        }, ["--publish", ...commonArgs]);
      }
    },
  });
}

async function runCreateFlow(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  pkgbase: string,
  flags: string[],
  pushAfterCreate: boolean,
  queueReview: boolean,
): Promise<void> {
  const runLog = createRunLog(ctx.cwd);
  void (async () => {
    let liveBuffer = "";
    let expanded = false;
    let currentChild: AbortableChild | undefined;
    let unsubscribeKeys: (() => void) | undefined;
    let phase = "create";

    const outputLines = () => liveBuffer.split(/\r?\n/).filter(Boolean);
    const modeText = () => {
      const total = outputLines().length;
      const shown = expanded ? Math.min(EXPANDED_LINES, total) : Math.min(COLLAPSED_LINES, total);
      return expanded ? `expanded ${shown}/${total}` : `compact ${shown}/${total}`;
    };
    const render = () => {
      if (!ctx.hasUI) return;
      ctx.ui.setWidget(OUTPUT_WIDGET_KEY, (_tui, _theme) => ({
        render: (width: number) => {
          const lines = outputLines();
          const limit = expanded ? EXPANDED_LINES : COLLAPSED_LINES;
          const visible = lines.slice(-limit);
          return visible.length ? visible.map((line) => truncateLine(line, width)) : ["Waiting for release-aur output..."];
        },
        invalidate: () => {},
      }), { placement: "aboveEditor" });
      ctx.ui.setWidget(FOOTER_WIDGET_KEY, (_tui, theme) => ({
        render: (width: number) => [
          truncateLine(theme.fg("accent", `release-aur: ${phase}`) + theme.fg("dim", ` · ${modeText()}`), width),
          truncateLine(theme.fg("dim", "Controls: /release-aur toggle expands/collapses · /release-aur abort stops subprocess"), width),
        ],
        invalidate: () => {},
      }), { placement: "belowEditor" });
    };
    const append = (chunk: string) => {
      liveBuffer += chunk;
      appendLog(runLog, chunk);
      render();
    };
    const closeUi = () => {
      unsubscribeKeys?.();
      unsubscribeKeys = undefined;
      activeRun = undefined;
      if (ctx.hasUI) {
        ctx.ui.setWidget(OUTPUT_WIDGET_KEY, undefined);
        ctx.ui.setWidget(FOOTER_WIDGET_KEY, undefined);
      }
    };
    const abort = () => currentChild?.abortReleaseStep?.();
    const toggle = () => {
      expanded = !expanded;
      render();
    };
    const startUi = (status: string) => {
      activeRun = { abort, toggleOutput: toggle };
      if (!ctx.hasUI) return;
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", status));
      render();
      if (!unsubscribeKeys) {
        unsubscribeKeys = ctx.ui.onTerminalInput((data) => {
          if (isCtrlO(data)) {
            toggle();
            return { consume: true };
          }
          if (isCtrlC(data)) {
            ctx.ui.notify("Aborting release-aur workflow...", "warning");
            abort();
            return { consume: true };
          }
          return undefined;
        });
      }
    };
    const runPhase = async (nextPhase: string, args: string[]): Promise<RunResult> => {
      phase = nextPhase;
      startUi(nextPhase === "publish" ? "AUR:Publishing" : "AUR:Running");
      const command = scriptCommand(ctx.cwd, args);
      append(`\n$ ${command}\n`);
      const result = await runScriptLive(ctx.cwd, command, append, (child) => { currentChild = child; });
      currentChild = undefined;
      return result;
    };

    if (ctx.hasUI) ctx.ui.notify(`Running release-aur create for ${pkgbase}...`, "info");

    const create = await runPhase("create", ["--create", "--pkgbase", pkgbase]);
    if (create.aborted) {
      const logPath = saveRunLog(runLog, "aborted-create");
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
      ctx.ui.notify(`release-aur create aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
      return;
    }
    if (!create.ok) {
      const logPath = saveRunLog(runLog, "failed-create", extractSummary(create.output));
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
      ctx.ui.notify(`release-aur create failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
      queueFailureReview(pi, "create", create.output);
      return;
    }

    if (/no PKGBUILD yet/.test(create.output)) {
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Needs-PKGBUILD"));
      const missingDecision = await promptMissingPkgbuild(pi, ctx, pkgbase, runLog);
      if (missingDecision !== "continue") {
        const logPath = saveRunLog(runLog, "completed-create-needs-pkgbuild", "AUR repo created/converged; PKGBUILD still needs to be added.");
        ctx.ui.notify(`AUR repo setup stopped until PKGBUILD exists.${logPath ? `\nLog: ${logPath}` : ""}`, "info");
        return;
      }

      liveBuffer = "";
      const recreate = await runPhase("create", ["--create", "--pkgbase", pkgbase]);
      if (recreate.aborted) {
        const logPath = saveRunLog(runLog, "aborted-create-after-pkgbuild");
        closeUi();
        if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
        ctx.ui.notify(`release-aur create aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
        return;
      }
      if (!recreate.ok || /no PKGBUILD yet/.test(recreate.output)) {
        const logPath = saveRunLog(runLog, "failed-create-after-pkgbuild", extractSummary(recreate.output));
        closeUi();
        if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
        ctx.ui.notify(`release-aur could not continue after PKGBUILD handling.${logPath ? ` Log: ${logPath}` : ""}`, "error");
        queueFailureReview(pi, "create after PKGBUILD handling", recreate.output);
        return;
      }
    }

    const plan = await runPhase("plan", ["--plan", "--target", pkgbase, ...flags]);
    if (plan.aborted) {
      const logPath = saveRunLog(runLog, "aborted-create-plan");
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
      ctx.ui.notify(`release-aur plan aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
      return;
    }
    if (!plan.ok) {
      const logPath = saveRunLog(runLog, "failed-create-plan", extractSummary(plan.output));
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
      ctx.ui.notify(`release-aur create completed but plan failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
      queueFailureReview(pi, "create plan", plan.output);
      return;
    }

    if (!pushAfterCreate) {
      const summary = extractSummary(plan.output);
      const logPath = saveRunLog(runLog, "completed-create-plan", summary);
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR:OK"));
      ctx.ui.notify(`${summary}\nrelease-aur create+plan completed.${logPath ? `\nLog: ${logPath}` : ""}`, "success");
      if (queueReview) queueAgentReview(pi, ctx.cwd, pkgbase, plan.output);
      return;
    }

    closeUi();
    const summary = extractSummary(plan.output);
    const choice = await ctx.ui.select([
      "Publish newly created/converged AUR package?",
      "",
      summary,
      "",
      "This will re-run checks, regenerate .SRCINFO, commit, and push HEAD to AUR master.",
    ].join("\n"), ["No", "Yes, commit and push to AUR"]);
    if (choice !== "Yes, commit and push to AUR") {
      const logPath = saveRunLog(runLog, "cancelled-create-push", summary);
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Cancelled"));
      ctx.ui.notify(`release-aur create --push cancelled after plan.${logPath ? ` Log: ${logPath}` : ""}`, "info");
      return;
    }

    liveBuffer = "";
    const publish = await runPhase("publish", ["--publish", "--target", pkgbase, ...flags]);
    if (publish.aborted) {
      const logPath = saveRunLog(runLog, "aborted-create-publish");
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
      ctx.ui.notify(`release-aur publish aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
      return;
    }
    if (!publish.ok) {
      const logPath = saveRunLog(runLog, "failed-create-publish", extractSummary(publish.output));
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
      ctx.ui.notify(`release-aur publish failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
      queueFailureReview(pi, "create publish", publish.output);
      return;
    }

    const finalSummary = extractSummary(publish.output);
    const logPath = saveRunLog(runLog, "completed-create-publish", finalSummary);
    closeUi();
    if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR:OK"));
    ctx.ui.notify(`${finalSummary}\nrelease-aur create --push completed.${logPath ? `\nLog: ${logPath}` : ""}`, "success");
  })().catch((error: unknown) => {
    activeRun = undefined;
    if (ctx.hasUI) {
      ctx.ui.setWidget(OUTPUT_WIDGET_KEY, undefined);
      ctx.ui.setWidget(FOOTER_WIDGET_KEY, undefined);
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
    }
    const message = error instanceof Error ? error.message : String(error);
    const logPath = saveRunLog(runLog, "crashed-create", message);
    ctx.ui.notify(`release-aur create crashed: ${message}${logPath ? ` Log: ${logPath}` : ""}`, "error");
  });
}

async function runWorkflow(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  initialArgs: string[],
  phaseLabel: string,
  targetLabel: string,
  queueReview: boolean,
  beforeSecondPhase?: (result: RunResult) => Promise<boolean>,
  secondArgs?: string[],
): Promise<void> {
  const runLog = createRunLog(ctx.cwd);
  void (async () => {
    let liveBuffer = "";
    let expanded = false;
    let currentChild: AbortableChild | undefined;
    let unsubscribeKeys: (() => void) | undefined;
    let phase = phaseLabel;

    const outputLines = () => liveBuffer.split(/\r?\n/).filter(Boolean);
    const modeText = () => {
      const total = outputLines().length;
      const shown = expanded ? Math.min(EXPANDED_LINES, total) : Math.min(COLLAPSED_LINES, total);
      return expanded ? `expanded ${shown}/${total}` : `compact ${shown}/${total}`;
    };
    const render = () => {
      if (!ctx.hasUI) return;
      ctx.ui.setWidget(OUTPUT_WIDGET_KEY, (_tui, _theme) => ({
        render: (width: number) => {
          const lines = outputLines();
          const limit = expanded ? EXPANDED_LINES : COLLAPSED_LINES;
          const visible = lines.slice(-limit);
          return visible.length ? visible.map((line) => truncateLine(line, width)) : ["Waiting for release-aur output..."];
        },
        invalidate: () => {},
      }), { placement: "aboveEditor" });
      ctx.ui.setWidget(FOOTER_WIDGET_KEY, (_tui, theme) => ({
        render: (width: number) => [
          truncateLine(theme.fg("accent", `release-aur: ${phase}`) + theme.fg("dim", ` · ${modeText()}`), width),
          truncateLine(theme.fg("dim", "Controls: /release-aur toggle expands/collapses · /release-aur abort stops subprocess"), width),
        ],
        invalidate: () => {},
      }), { placement: "belowEditor" });
    };
    const append = (chunk: string) => {
      liveBuffer += chunk;
      appendLog(runLog, chunk);
      render();
    };
    const closeUi = () => {
      unsubscribeKeys?.();
      unsubscribeKeys = undefined;
      activeRun = undefined;
      if (ctx.hasUI) {
        ctx.ui.setWidget(OUTPUT_WIDGET_KEY, undefined);
        ctx.ui.setWidget(FOOTER_WIDGET_KEY, undefined);
      }
    };
    const abort = () => currentChild?.abortReleaseStep?.();
    const toggle = () => {
      expanded = !expanded;
      render();
    };

    activeRun = { abort, toggleOutput: toggle };
    if (ctx.hasUI) {
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", "AUR:Running"));
      ctx.ui.notify(`Running release-aur ${phaseLabel}...`, "info");
      render();
      unsubscribeKeys = ctx.ui.onTerminalInput((data) => {
        if (isCtrlO(data)) {
          toggle();
          return { consume: true };
        }
        if (isCtrlC(data)) {
          ctx.ui.notify("Aborting release-aur workflow...", "warning");
          abort();
          return { consume: true };
        }
        return undefined;
      });
    }

    const firstCommand = scriptCommand(ctx.cwd, initialArgs);
    append(`$ ${firstCommand}\n`);
    const first = await runScriptLive(ctx.cwd, firstCommand, append, (child) => { currentChild = child; });
    currentChild = undefined;

    if (first.aborted) {
      const logPath = saveRunLog(runLog, `aborted-${phaseLabel}`);
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
      ctx.ui.notify(`release-aur aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
      return;
    }

    if (!first.ok) {
      const logPath = saveRunLog(runLog, `failed-${phaseLabel}`, extractSummary(first.output));
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
      ctx.ui.notify(`release-aur ${phaseLabel} failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
      queueFailureReview(pi, phaseLabel, first.output);
      return;
    }

    if (beforeSecondPhase && secondArgs) {
      closeUi();
      const proceed = await beforeSecondPhase(first);
      if (!proceed) {
        const logPath = saveRunLog(runLog, `cancelled-${phaseLabel}`, extractSummary(first.output));
        if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Cancelled"));
        ctx.ui.notify(`release-aur publish cancelled.${logPath ? ` Log: ${logPath}` : ""}`, "info");
        return;
      }

      liveBuffer = "";
      phase = "publish";
      activeRun = { abort, toggleOutput: toggle };
      if (ctx.hasUI) {
        ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", "AUR:Publishing"));
        render();
      }
      const secondCommand = scriptCommand(ctx.cwd, secondArgs);
      append(`$ ${secondCommand}\n`);
      const second = await runScriptLive(ctx.cwd, secondCommand, append, (child) => { currentChild = child; });
      currentChild = undefined;

      if (second.aborted) {
        const logPath = saveRunLog(runLog, "aborted-publish");
        closeUi();
        if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("warning", "AUR:Aborted"));
        ctx.ui.notify(`release-aur publish aborted.${logPath ? ` Log: ${logPath}` : ""}`, "warning");
        return;
      }
      if (!second.ok) {
        const logPath = saveRunLog(runLog, "failed-publish", extractSummary(second.output));
        closeUi();
        if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
        ctx.ui.notify(`release-aur publish failed.${logPath ? ` Log: ${logPath}` : ""}`, "error");
        queueFailureReview(pi, "publish", second.output);
        return;
      }

      const finalSummary = extractSummary(second.output);
      const logPath = saveRunLog(runLog, "completed-publish", finalSummary);
      closeUi();
      if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR:OK"));
      ctx.ui.notify(`${finalSummary}\nrelease-aur publish completed.${logPath ? `\nLog: ${logPath}` : ""}`, "success");
      return;
    }

    const summary = extractSummary(first.output);
    const logPath = saveRunLog(runLog, `completed-${phaseLabel}`, summary);
    closeUi();
    if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("success", "AUR:OK"));
    ctx.ui.notify(`${summary}\nrelease-aur ${phaseLabel} completed.${logPath ? `\nLog: ${logPath}` : ""}`, "success");
    if (queueReview) queueAgentReview(pi, ctx.cwd, targetLabel, first.output);
  })().catch((error: unknown) => {
    activeRun = undefined;
    if (ctx.hasUI) {
      ctx.ui.setWidget(OUTPUT_WIDGET_KEY, undefined);
      ctx.ui.setWidget(FOOTER_WIDGET_KEY, undefined);
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", "AUR:Failed"));
    }
    const message = error instanceof Error ? error.message : String(error);
    const logPath = saveRunLog(runLog, "crashed", message);
    ctx.ui.notify(`release-aur crashed: ${message}${logPath ? ` Log: ${logPath}` : ""}`, "error");
  });
}
