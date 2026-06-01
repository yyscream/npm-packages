#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const publicDir = path.join(packageRoot, "public");
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 31415;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const BODY_LIMIT_BYTES = 1024 * 1024;
const EVENT_HISTORY_LIMIT = 200;
const STATUS_RPC_TIMEOUT_MS = 1_800;

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function usage() {
  console.log(`pi-webui ${packageJson.version}

Pi Web UI companion server for Pi coding agent RPC mode.

Usage:
  pi-webui [options] [-- <pi args...>]

Options:
  --host <host>       HTTP bind host (default: ${DEFAULT_HOST})
  --port <port>       HTTP port (default: ${DEFAULT_PORT})
  --cwd <path>        Working directory for the Pi session (default: current dir)
  --pi <command>      Pi executable to spawn (default: bundled dependency, then "pi")
  --no-session        Start Pi RPC with --no-session
  --name <name>       Initial Pi session name
  -h, --help          Show this help
  -v, --version       Print version

Examples:
  pi-webui --cwd ~/src/my-project
  pi-webui --port 3000 -- --model anthropic/claude-sonnet-4-5:high
  PI_WEBUI_PI_BIN=/path/to/pi pi-webui --no-session

Security:
  The web UI has no authentication and can control Pi tools. It binds to
  localhost by default. Do not expose it on untrusted networks.
`);
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    host: process.env.PI_WEBUI_HOST || DEFAULT_HOST,
    port: Number.parseInt(process.env.PI_WEBUI_PORT || String(DEFAULT_PORT), 10),
    cwd: process.cwd(),
    piBin: process.env.PI_WEBUI_PI_BIN || "pi",
    piBinExplicit: !!process.env.PI_WEBUI_PI_BIN,
    noSession: false,
    name: undefined,
    piArgs: [],
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      options.piArgs.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "-v" || arg === "--version") {
      options.version = true;
      continue;
    }
    if (arg === "--host") {
      options.host = takeValue(argv, i, arg);
      i++;
      continue;
    }
    if (arg === "--port") {
      const value = Number.parseInt(takeValue(argv, i, arg), 10);
      if (!Number.isFinite(value) || value <= 0 || value > 65535) {
        throw new Error("--port must be a TCP port between 1 and 65535");
      }
      options.port = value;
      i++;
      continue;
    }
    if (arg === "--cwd") {
      options.cwd = path.resolve(takeValue(argv, i, arg));
      i++;
      continue;
    }
    if (arg === "--pi") {
      options.piBin = takeValue(argv, i, arg);
      options.piBinExplicit = true;
      i++;
      continue;
    }
    if (arg === "--no-session") {
      options.noSession = true;
      continue;
    }
    if (arg === "--name") {
      options.name = takeValue(argv, i, arg);
      i++;
      continue;
    }
    throw new Error(`Unknown option: ${arg}. Pass Pi CLI args after --.`);
  }

  if (!Number.isFinite(options.port) || options.port <= 0 || options.port > 65535) {
    throw new Error("Invalid PI_WEBUI_PORT; expected a TCP port between 1 and 65535");
  }

  return options;
}

function isLocalHost(host) {
  return host === "localhost" || host === "::1" || host === "[::1]" || host.startsWith("127.");
}

function formatUrlHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function isLocalAddress(address = "") {
  return address === "::1" || address.startsWith("127.") || address === "::ffff:127.0.0.1" || address.startsWith("::ffff:127.");
}

function sanitizeError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return error.stack || error.message || String(error);
}

class PiRpcProcess {
  constructor({ command, args, displayCommand, cwd }) {
    this.command = command;
    this.args = args;
    this.displayCommand = displayCommand;
    this.cwd = cwd;
    this.child = undefined;
    this.pending = new Map();
    this.listeners = new Set();
    this.startedAt = new Date().toISOString();
  }

  start() {
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.child.on("error", (error) => {
      const message = sanitizeError(error);
      this.emit({ type: "pi_process_error", error: message });
      this.rejectAll(new Error(message));
    });

    this.child.on("exit", (code, signal) => {
      this.emit({ type: "pi_process_exit", code, signal });
      this.rejectAll(new Error(`Pi RPC process exited${code === null ? "" : ` with code ${code}`}${signal ? ` (${signal})` : ""}`));
    });

    this.attachJsonlReader(this.child.stdout, (line) => this.handleStdoutLine(line));
    this.attachTextReader(this.child.stderr, (text) => {
      if (text.length > 0) {
        process.stderr.write(text);
        this.emit({ type: "pi_stderr", text });
      }
    });

    this.emit({ type: "pi_process_start", pid: this.child.pid, cwd: this.cwd, command: this.displayCommand, args: this.args });
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("webui listener failed:", error);
      }
    }
  }

  attachJsonlReader(stream, onLine) {
    const decoder = new StringDecoder("utf8");
    let buffer = "";

    stream.on("data", (chunk) => {
      buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) break;
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        onLine(line);
      }
    });

    stream.on("end", () => {
      buffer += decoder.end();
      if (buffer.length > 0) {
        onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
      }
    });
  }

  attachTextReader(stream, onText) {
    const decoder = new StringDecoder("utf8");
    stream.on("data", (chunk) => onText(typeof chunk === "string" ? chunk : decoder.write(chunk)));
    stream.on("end", () => {
      const tail = decoder.end();
      if (tail) onText(tail);
    });
  }

  handleStdoutLine(line) {
    if (!line.trim()) return;

    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      this.emit({ type: "pi_stdout_parse_error", line, error: sanitizeError(error) });
      return;
    }

    if (event?.type === "response" && event.id && this.pending.has(event.id)) {
      const pending = this.pending.get(event.id);
      this.pending.delete(event.id);
      clearTimeout(pending.timeout);
      pending.resolve(event);
    }

    this.emit(event);
  }

  send(command, timeoutMs = REQUEST_TIMEOUT_MS) {
    if (!this.child || !this.child.stdin || this.child.exitCode !== null) {
      return Promise.reject(new Error("Pi RPC process is not running"));
    }

    const id = command.id || randomUUID();
    const payload = { ...command, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for RPC response to ${command.type}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      this.writeRaw(payload).catch((error) => {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  async writeRaw(command) {
    if (!this.child || !this.child.stdin || this.child.exitCode !== null) {
      throw new Error("Pi RPC process is not running");
    }

    const line = `${JSON.stringify(command)}\n`;
    if (!this.child.stdin.write(line)) {
      await new Promise((resolve) => this.child.stdin.once("drain", resolve));
    }
  }

  rejectAll(error) {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  stop() {
    if (!this.child || this.child.exitCode !== null) return;
    this.child.kill("SIGTERM");
    setTimeout(() => {
      if (this.child && this.child.exitCode === null) this.child.kill("SIGKILL");
    }, 3000).unref();
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function makeHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendError(res, statusCode, error) {
  sendJson(res, statusCode, { ok: false, error: sanitizeError(error) });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function sendSse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

const eventHistory = [];

function truncateStatusText(value, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function statusEventSummary(event) {
  const summary = {
    timestamp: new Date().toISOString(),
    type: String(event?.type || "event"),
  };
  for (const key of ["tabId", "tabTitle", "pid", "cwd", "code", "signal", "command", "queueLength", "pendingMessageCount"]) {
    if (event?.[key] !== undefined) summary[key] = event[key];
  }
  if (event?.assistantMessageEvent?.type) summary.updateType = event.assistantMessageEvent.type;
  if (event?.message?.role) summary.messageRole = event.message.role;
  if (event?.error) summary.error = truncateStatusText(event.error);
  if (event?.text && summary.type === "pi_stderr") summary.text = truncateStatusText(event.text);
  return summary;
}

function recordEvent(event) {
  eventHistory.push(statusEventSummary(event));
  if (eventHistory.length > EVENT_HISTORY_LIMIT) eventHistory.splice(0, eventHistory.length - EVENT_HISTORY_LIMIT);
}

function latestEvents(limit = 40) {
  return eventHistory.slice(-Math.max(0, Math.min(EVENT_HISTORY_LIMIT, limit)));
}

function runCommand(command, args, { cwd, timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ exitCode: undefined, stdout, stderr, timedOut: true });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 20000) stdout = stdout.slice(-20000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on("error", (error) => finish({ exitCode: undefined, stdout, stderr: sanitizeError(error), error: sanitizeError(error) }));
    child.on("exit", (exitCode) => finish({ exitCode, stdout, stderr, timedOut: false }));
  });
}

function displayPath(cwd) {
  const normalized = cwd.replace(/\\/g, "/");
  const home = (process.env.USERPROFILE || process.env.HOME || "").replace(/\\/g, "/");
  if (home && normalized.toLowerCase().startsWith(home.toLowerCase())) {
    return `~${normalized.slice(home.length)}` || "~";
  }
  return normalized;
}

function expandUserPath(value) {
  const input = String(value || "").trim();
  if (input === "~") {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) throw makeHttpError(400, "Cannot expand ~ because no home directory is configured");
    return home;
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) throw makeHttpError(400, "Cannot expand ~ because no home directory is configured");
    return path.join(home, input.slice(2));
  }
  return input;
}

async function resolveCwd(value, baseCwd = options.cwd) {
  const input = expandUserPath(value);
  if (!input) throw makeHttpError(400, "cwd is required");
  const cwd = path.resolve(baseCwd, input);
  let info;
  try {
    info = await stat(cwd);
  } catch {
    throw makeHttpError(400, `cwd does not exist: ${cwd}`);
  }
  if (!info.isDirectory()) throw makeHttpError(400, `cwd is not a directory: ${cwd}`);
  return cwd;
}

function uniquePathItems(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item?.cwd || seen.has(item.cwd)) continue;
    seen.add(item.cwd);
    result.push(item);
  }
  return result;
}

function pathPickerRoots(activeCwd, viewedCwd) {
  const home = process.env.HOME || process.env.USERPROFILE;
  return uniquePathItems([
    { label: "Tab", cwd: activeCwd, displayCwd: displayPath(activeCwd) },
    { label: "Default", cwd: options.cwd, displayCwd: displayPath(options.cwd) },
    home ? { label: "Home", cwd: home, displayCwd: displayPath(home) } : undefined,
    { label: "Root", cwd: path.parse(viewedCwd || activeCwd || options.cwd).root, displayCwd: path.parse(viewedCwd || activeCwd || options.cwd).root },
  ]);
}

async function getDirectoryPickerData(viewPath, activeCwd) {
  const cwd = await resolveCwd(viewPath || activeCwd, activeCwd);
  let entries;
  try {
    entries = await readdir(cwd, { withFileTypes: true });
  } catch (error) {
    throw makeHttpError(error?.code === "EACCES" ? 403 : 400, `Cannot read directory ${cwd}: ${sanitizeError(error)}`);
  }

  const directoryEntries = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  const directories = directoryEntries.slice(0, 500).map((entry) => {
    const entryPath = path.join(cwd, entry.name);
    return { name: entry.name, cwd: entryPath, displayCwd: displayPath(entryPath), hidden: entry.name.startsWith(".") };
  });
  const parent = path.dirname(cwd);

  return {
    cwd,
    displayCwd: displayPath(cwd),
    parent: parent === cwd ? null : parent,
    roots: pathPickerRoots(activeCwd, cwd),
    directories,
    truncated: directoryEntries.length > directories.length,
  };
}

async function getWorkspaceInfo(cwd, startedAt) {
  const info = {
    cwd,
    displayCwd: displayPath(cwd),
    uptimeMs: Math.max(0, Date.now() - Date.parse(startedAt)),
    git: { isRepo: false },
  };

  const inside = await runCommand("git", ["rev-parse", "--is-inside-work-tree"], { cwd, timeoutMs: 1200 });
  if (inside.exitCode !== 0 || inside.stdout.trim() !== "true") return info;

  const [branch, status] = await Promise.all([
    runCommand("git", ["branch", "--show-current"], { cwd, timeoutMs: 1200 }),
    runCommand("git", ["status", "--porcelain=v1", "--branch"], { cwd, timeoutMs: 1800 }),
  ]);
  const lines = status.stdout.split(/\r?\n/).filter(Boolean);
  const branchLine = lines.find((line) => line.startsWith("## "));
  const fileLines = lines.filter((line) => !line.startsWith("## "));
  const untracked = fileLines.filter((line) => line.startsWith("??")).length;
  const changed = fileLines.length - untracked;

  info.git = {
    isRepo: true,
    branch: branch.stdout.trim() || branchLine?.replace(/^##\s+/, "").split("...")[0] || "detached",
    changed,
    untracked,
    branchStatus: branchLine,
  };
  return info;
}

let activeGitWorkflowProcess = null;

async function getGitRoot(cwd) {
  const result = await runCommand("git", ["rev-parse", "--show-toplevel"], { cwd, timeoutMs: 2000 });
  if (result.exitCode !== 0) {
    throw new Error((result.stderr || result.stdout || "Not inside a git repository").trim());
  }
  return path.resolve(result.stdout.trim());
}

function commitMessagePaths(root) {
  return {
    shortPath: path.join(root, "dev", "COMMIT", "staged-commit-short.txt"),
    longPath: path.join(root, "dev", "COMMIT", "staged-commit-long.txt"),
  };
}

async function readGitWorkflowMessages(cwd) {
  const root = await getGitRoot(cwd);
  const { shortPath, longPath } = commitMessagePaths(root);
  try {
    const [shortText, longText, shortStat, longStat] = await Promise.all([
      readFile(shortPath, "utf8"),
      readFile(longPath, "utf8"),
      stat(shortPath),
      stat(longPath),
    ]);
    return {
      root,
      shortPath,
      longPath,
      short: shortText.trimEnd(),
      long: longText.trimEnd(),
      shortMtimeMs: shortStat.mtimeMs,
      longMtimeMs: longStat.mtimeMs,
    };
  } catch (error) {
    throw new Error(`Missing generated commit message files in ${path.join(root, "dev", "COMMIT")}. Run /git-staged-msg first. ${sanitizeError(error)}`);
  }
}

function formatGitCommand(args) {
  return ["git", ...args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg))].join(" ");
}

function runGitWorkflowCommand(args, { cwd, label = formatGitCommand(args), timeoutMs = 10 * 60 * 1000 } = {}) {
  if (activeGitWorkflowProcess) {
    return Promise.reject(new Error(`A git workflow command is already running: ${activeGitWorkflowProcess.label}`));
  }

  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: process.env.GIT_TERMINAL_PROMPT || "0" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (activeGitWorkflowProcess?.child === child) activeGitWorkflowProcess = null;
      resolve({ command: label, stdout, stderr, timedOut, cancelled, ...result });
    };

    const terminate = (reason) => {
      if (reason === "cancelled") cancelled = true;
      if (child.exitCode === null) child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 2000).unref();
    };

    activeGitWorkflowProcess = { child, label, cancel: () => terminate("cancelled") };
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate("timeout");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 100000) stdout = stdout.slice(-100000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 100000) stderr = stderr.slice(-100000);
    });
    child.on("error", (error) => finish({ exitCode: undefined, stderr: stderr || sanitizeError(error), error: sanitizeError(error) }));
    child.on("exit", (exitCode, signal) => finish({ exitCode, signal }));
  });
}

function gitWorkflowCommandPayload(result) {
  const ok = result.exitCode === 0 && !result.timedOut && !result.cancelled && !result.error;
  return {
    ok,
    error: ok ? undefined : result.error || (result.cancelled ? "Cancelled" : result.timedOut ? "Command timed out" : `Command failed with exit code ${result.exitCode ?? result.signal ?? "unknown"}`),
    data: result,
  };
}

async function handleGitWorkflowRequest(pathname, body = {}, cwd = options.cwd) {
  try {
    switch (pathname) {
      case "/api/git-workflow/message":
        return { ok: true, data: await readGitWorkflowMessages(cwd) };
      case "/api/git-workflow/add":
        await getGitRoot(cwd);
        return gitWorkflowCommandPayload(await runGitWorkflowCommand(["add", "."], { cwd }));
      case "/api/git-workflow/commit": {
        const variant = String(body.variant || "").trim();
        if (!["short", "long"].includes(variant)) throw new Error("variant must be 'short' or 'long'");
        const messages = await readGitWorkflowMessages(cwd);
        if (variant === "short") {
          const message = messages.short.trim();
          if (!message) throw new Error(`${messages.shortPath} is empty`);
          return gitWorkflowCommandPayload(await runGitWorkflowCommand(["commit", "-m", message], { cwd: messages.root, label: "git commit -m <dev/COMMIT/staged-commit-short.txt>" }));
        }
        if (!messages.long.trim()) throw new Error(`${messages.longPath} is empty`);
        return gitWorkflowCommandPayload(await runGitWorkflowCommand(["commit", "-F", messages.longPath], { cwd: messages.root, label: "git commit -F dev/COMMIT/staged-commit-long.txt" }));
      }
      case "/api/git-workflow/push": {
        const root = await getGitRoot(cwd);
        return gitWorkflowCommandPayload(await runGitWorkflowCommand(["push"], { cwd: root, timeoutMs: 15 * 60 * 1000 }));
      }
      case "/api/git-workflow/cancel": {
        const cancelled = !!activeGitWorkflowProcess;
        if (activeGitWorkflowProcess) activeGitWorkflowProcess.cancel();
        return { ok: true, data: { cancelled } };
      }
      default:
        return undefined;
    }
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

function normalizeStaticPath(urlPath) {
  if (urlPath === "/") return "index.html";
  const name = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  if (!["index.html", "app.js", "styles.css"].includes(name)) return undefined;
  return name;
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET") return false;
  const staticName = normalizeStaticPath(url.pathname);
  if (!staticName) return false;

  const filePath = path.join(publicDir, staticName);
  const ext = path.extname(filePath);
  const content = await readFile(filePath);
  res.writeHead(200, {
    "content-type": MIME_TYPES.get(ext) || "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(content);
  return true;
}

function commandFromPost(pathname, body) {
  switch (pathname) {
    case "/api/prompt": {
      const message = String(body.message || "").trim();
      if (!message) throw new Error("message is required");
      const command = { type: "prompt", message };
      if (body.streamingBehavior === "steer" || body.streamingBehavior === "followUp") {
        command.streamingBehavior = body.streamingBehavior;
      }
      return command;
    }
    case "/api/steer": {
      const message = String(body.message || "").trim();
      if (!message) throw new Error("message is required");
      return { type: "steer", message };
    }
    case "/api/follow-up": {
      const message = String(body.message || "").trim();
      if (!message) throw new Error("message is required");
      return { type: "follow_up", message };
    }
    case "/api/abort":
      return { type: "abort" };
    case "/api/new-session":
      return body.parentSession ? { type: "new_session", parentSession: String(body.parentSession) } : { type: "new_session" };
    case "/api/model": {
      const provider = String(body.provider || "").trim();
      const modelId = String(body.modelId || "").trim();
      if (!provider || !modelId) throw new Error("provider and modelId are required");
      return { type: "set_model", provider, modelId };
    }
    case "/api/thinking": {
      const level = String(body.level || "").trim();
      if (!["off", "minimal", "low", "medium", "high", "xhigh"].includes(level)) {
        throw new Error("Invalid thinking level");
      }
      return { type: "set_thinking_level", level };
    }
    case "/api/compact":
      return body.customInstructions ? { type: "compact", customInstructions: String(body.customInstructions) } : { type: "compact" };
    default:
      return undefined;
  }
}

function commandFromGet(pathname) {
  switch (pathname) {
    case "/api/state":
      return { type: "get_state" };
    case "/api/messages":
      return { type: "get_messages" };
    case "/api/models":
      return { type: "get_available_models" };
    case "/api/commands":
      return { type: "get_commands" };
    case "/api/stats":
      return { type: "get_session_stats" };
    case "/api/last-assistant-text":
      return { type: "get_last_assistant_text" };
    default:
      return undefined;
  }
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${sanitizeError(error)}\n`);
  usage();
  process.exit(2);
}

if (options.help) {
  usage();
  process.exit(0);
}
if (options.version) {
  console.log(packageJson.version);
  process.exit(0);
}

function buildPiArgsForTab(tabIndex, title) {
  const args = ["--mode", "rpc"];
  if (options.noSession) args.push("--no-session");

  const sessionName = tabIndex === 1 ? options.name : title;
  if (sessionName) args.push("--name", sessionName);

  args.push(...options.piArgs);
  return args;
}

async function resolvePiCommand(piArgs) {
  if (options.piBinExplicit) {
    return { command: options.piBin, args: piArgs, displayCommand: `${options.piBin} ${piArgs.join(" ")}` };
  }

  const bundledCli = path.join(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "cli.js");
  try {
    await access(bundledCli);
    return {
      command: process.execPath,
      args: [bundledCli, ...piArgs],
      displayCommand: `${process.execPath} ${bundledCli} ${piArgs.join(" ")}`,
    };
  } catch {
    return { command: options.piBin, args: piArgs, displayCommand: `${options.piBin} ${piArgs.join(" ")}` };
  }
}

const tabs = new Map();
let nextTabIndex = 1;

function defaultTabTitle(tabIndex) {
  if (options.name) return tabIndex === 1 ? options.name : `${options.name} ${tabIndex}`;
  return `Terminal ${tabIndex}`;
}

function attachRpcToTab(tab, rpc) {
  tab.rpcUnsubscribe?.();
  tab.rpc = rpc;
  tab.rpcUnsubscribe = rpc.onEvent((event) => {
    const scopedEvent = { ...event, tabId: tab.id, tabTitle: tab.title };
    recordEvent(scopedEvent);
    for (const client of tab.sseClients) sendSse(client, scopedEvent);
  });
}

async function createTab({ title, cwd } = {}) {
  const tabIndex = nextTabIndex++;
  const tabTitle = String(title || "").trim() || defaultTabTitle(tabIndex);
  const tabCwd = cwd ? await resolveCwd(cwd, options.cwd) : options.cwd;
  const id = randomUUID();
  const piArgs = buildPiArgsForTab(tabIndex, tabTitle);
  const piCommand = await resolvePiCommand(piArgs);
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tabCwd });
  const tab = {
    id,
    index: tabIndex,
    title: tabTitle,
    cwd: tabCwd,
    createdAt: new Date().toISOString(),
    rpc: undefined,
    rpcUnsubscribe: undefined,
    sseClients: new Set(),
  };

  attachRpcToTab(tab, rpc);
  tabs.set(id, tab);
  rpc.start();
  return tab;
}

function firstTab() {
  return tabs.values().next().value;
}

function tabMeta(tab) {
  return {
    id: tab.id,
    index: tab.index,
    title: tab.title,
    cwd: tab.cwd,
    createdAt: tab.createdAt,
    startedAt: tab.rpc.startedAt,
    pid: tab.rpc.child?.pid,
    running: !!tab.rpc.child && tab.rpc.child.exitCode === null,
    command: tab.rpc.displayCommand,
    clientCount: tab.sseClients.size,
  };
}

function listTabs() {
  return [...tabs.values()].map(tabMeta);
}

async function updateTabCwd(id, cwd) {
  const tab = tabs.get(id);
  if (!tab) throw makeHttpError(404, `Unknown Pi tab: ${id}`);

  const nextCwd = await resolveCwd(cwd, tab.cwd);
  if (nextCwd === tab.cwd) return { tab, changed: false };

  const piArgs = buildPiArgsForTab(tab.index, tab.title);
  const piCommand = await resolvePiCommand(piArgs);
  const restartingEvent = { type: "webui_tab_restarting", tabId: tab.id, tabTitle: tab.title, cwd: nextCwd };
  recordEvent(restartingEvent);
  for (const client of tab.sseClients) {
    sendSse(client, restartingEvent);
  }

  const oldRpc = tab.rpc;
  tab.rpcUnsubscribe?.();
  tab.rpcUnsubscribe = undefined;
  oldRpc.stop();

  tab.cwd = nextCwd;
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tab.cwd });
  attachRpcToTab(tab, rpc);
  rpc.start();

  const changedEvent = { type: "webui_cwd_changed", tabId: tab.id, tabTitle: tab.title, cwd: tab.cwd, pid: tab.rpc.child?.pid };
  recordEvent(changedEvent);
  for (const client of tab.sseClients) {
    sendSse(client, changedEvent);
  }
  return { tab, changed: true };
}

function closeTab(id) {
  const tab = tabs.get(id);
  if (!tab) throw makeHttpError(404, `Unknown Pi tab: ${id}`);
  if (tabs.size <= 1) throw makeHttpError(400, "Cannot close the last Pi tab");

  const closingEvent = { type: "webui_tab_closing", tabId: tab.id, tabTitle: tab.title };
  recordEvent(closingEvent);
  for (const client of tab.sseClients) {
    sendSse(client, closingEvent);
    client.end();
  }
  tab.sseClients.clear();
  tab.rpcUnsubscribe?.();
  tab.rpc.stop();
  tabs.delete(id);
  return tab;
}

function requestedTabId(req, url, body) {
  const header = req.headers["x-pi-webui-tab"];
  const headerValue = Array.isArray(header) ? header[0] : header;
  return String(url.searchParams.get("tab") || url.searchParams.get("tabId") || body?.tabId || body?.tab || headerValue || "").trim();
}

function getRequestedTab(req, url, body = {}) {
  const id = requestedTabId(req, url, body);
  if (!id) {
    const tab = firstTab();
    if (!tab) throw makeHttpError(503, "No Pi tabs are available");
    return tab;
  }
  const tab = tabs.get(id);
  if (!tab) throw makeHttpError(404, `Unknown Pi tab: ${id}`);
  return tab;
}

const serverStartedAt = new Date().toISOString();
const initialTab = await createTab();
let currentHost = options.host;
let networkRebindInProgress = false;

function localNetworkAddresses() {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.internal || entry.family !== "IPv4") continue;
      addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)].sort();
}

function networkStatus() {
  const open = !isLocalHost(currentHost);
  const networkUrls = open ? localNetworkAddresses().map((address) => `http://${address}:${options.port}/`) : [];
  return {
    open,
    opening: networkRebindInProgress,
    host: currentHost,
    port: options.port,
    localUrl: `http://127.0.0.1:${options.port}/`,
    networkUrls,
  };
}

function closeSseClientsForRebind(nextHost) {
  for (const tab of tabs.values()) {
    const rebindEvent = { type: "webui_network_rebinding", tabId: tab.id, tabTitle: tab.title, host: nextHost, port: options.port };
    recordEvent(rebindEvent);
    for (const client of tab.sseClients) {
      sendSse(client, rebindEvent);
      client.end();
    }
    tab.sseClients.clear();
  }
}

function closeServerListener() {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function listenOn(host) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(options.port, host);
  });
}

async function openToLocalNetwork() {
  const nextHost = "0.0.0.0";
  if (!isLocalHost(currentHost) || networkRebindInProgress) return networkStatus();

  networkRebindInProgress = true;
  closeSseClientsForRebind(nextHost);
  const previousHost = currentHost;
  try {
    await closeServerListener();
    await listenOn(nextHost);
    currentHost = nextHost;
    console.warn("WARNING: Web UI is now reachable from the local network and has no authentication.");
    return networkStatus();
  } catch (error) {
    console.error("Failed to open Web UI to local network:", sanitizeError(error));
    if (!server.listening) {
      try {
        await listenOn(previousHost);
      } catch (restoreError) {
        console.error("Failed to restore Web UI listener:", sanitizeError(restoreError));
      }
    }
    throw error;
  } finally {
    networkRebindInProgress = false;
  }
}

async function safeRpcData(tab, command, timeoutMs = STATUS_RPC_TIMEOUT_MS) {
  try {
    const response = await tab.rpc.send(command, timeoutMs);
    if (response?.success === false) return { ok: false, error: response.error || `${command.type} failed` };
    return { ok: true, data: response?.data ?? null };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

function providerList(models) {
  const providers = new Set();
  for (const model of Array.isArray(models) ? models : []) {
    if (model?.provider) providers.add(String(model.provider));
  }
  return [...providers].sort();
}

async function tabStatusDetails(tab) {
  const [stateResult, modelsResult, statsResult, workspaceResult] = await Promise.all([
    safeRpcData(tab, { type: "get_state" }),
    safeRpcData(tab, { type: "get_available_models" }),
    safeRpcData(tab, { type: "get_session_stats" }),
    getWorkspaceInfo(tab.cwd, tab.rpc.startedAt).then((data) => ({ ok: true, data })).catch((error) => ({ ok: false, error: sanitizeError(error) })),
  ]);
  const models = modelsResult.ok ? modelsResult.data?.models || [] : [];
  return {
    ...tabMeta(tab),
    state: stateResult.ok ? stateResult.data : null,
    stateError: stateResult.ok ? undefined : stateResult.error,
    stats: statsResult.ok ? statsResult.data : null,
    statsError: statsResult.ok ? undefined : statsResult.error,
    workspace: workspaceResult.ok ? workspaceResult.data : null,
    workspaceError: workspaceResult.ok ? undefined : workspaceResult.error,
    models: {
      count: models.length,
      providers: providerList(models),
      error: modelsResult.ok ? undefined : modelsResult.error,
    },
  };
}

async function webuiStatus({ detailed = false, eventLimit = 40 } = {}) {
  const tab = firstTab();
  const network = networkStatus();
  const data = {
    online: true,
    webuiVersion: packageJson.version,
    webuiPid: process.pid,
    startedAt: serverStartedAt,
    cwd: options.cwd,
    boundHost: currentHost,
    port: options.port,
    pageUrl: network.localUrl,
    boundUrl: `http://${formatUrlHost(currentHost)}:${options.port}/`,
    network,
    piPid: tab?.rpc.child?.pid,
    piRunning: !!tab?.rpc.child && tab.rpc.child.exitCode === null,
    tabs: listTabs(),
  };

  if (detailed) {
    data.tabs = await Promise.all([...tabs.values()].map((item) => tabStatusDetails(item)));
    data.events = latestEvents(eventLimit);
  }

  return data;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/tabs" && req.method === "GET") {
      sendJson(res, 200, { ok: true, data: { tabs: listTabs() } });
      return;
    }

    if (url.pathname === "/api/tabs" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = await createTab({ title: body.title, cwd: body.cwd });
      sendJson(res, 201, { ok: true, data: { tab: tabMeta(tab), tabs: listTabs() } });
      return;
    }

    if (url.pathname.startsWith("/api/tabs/") && req.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.slice("/api/tabs/".length));
      const body = await readJsonBody(req);
      const { tab, changed } = await updateTabCwd(id, body.cwd);
      sendJson(res, 200, { ok: true, data: { tab: tabMeta(tab), tabs: listTabs(), changed } });
      return;
    }

    if (url.pathname.startsWith("/api/tabs/") && req.method === "DELETE") {
      const id = decodeURIComponent(url.pathname.slice("/api/tabs/".length));
      closeTab(id);
      sendJson(res, 200, { ok: true, data: { tabs: listTabs(), activeTabId: firstTab()?.id || null } });
      return;
    }

    if (url.pathname === "/api/events" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-content-type-options": "nosniff",
      });
      res.write(": connected\n\n");
      tab.sseClients.add(res);
      sendSse(res, {
        type: "webui_connected",
        version: packageJson.version,
        tabId: tab.id,
        tabTitle: tab.title,
        pid: tab.rpc.child?.pid,
        cwd: tab.cwd,
        startedAt: tab.rpc.startedAt,
      });
      const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15000);
      req.on("close", () => {
        clearInterval(keepAlive);
        tab.sseClients.delete(res);
      });
      return;
    }

    if (url.pathname === "/api/health" && req.method === "GET") {
      const status = await webuiStatus();
      sendJson(res, 200, {
        ok: true,
        webuiVersion: status.webuiVersion,
        webuiPid: status.webuiPid,
        piPid: status.piPid,
        piRunning: status.piRunning,
        cwd: status.cwd,
        network: status.network,
        tabs: status.tabs,
      });
      return;
    }

    if (url.pathname === "/api/webui-status" && req.method === "GET") {
      const detailed = ["1", "true", "yes", "detailed"].includes(String(url.searchParams.get("detailed") || "").toLowerCase());
      const parsedEventLimit = Number.parseInt(url.searchParams.get("events") || "40", 10);
      const eventLimit = Number.isFinite(parsedEventLimit) ? parsedEventLimit : 40;
      sendJson(res, 200, { ok: true, data: await webuiStatus({ detailed, eventLimit }) });
      return;
    }

    if (url.pathname === "/api/network" && req.method === "GET") {
      sendJson(res, 200, { ok: true, data: networkStatus() });
      return;
    }

    if (url.pathname === "/api/network/open" && req.method === "POST") {
      if (!isLocalAddress(req.socket.remoteAddress)) throw makeHttpError(403, "Opening to the network is only allowed from localhost");
      const before = networkStatus();
      sendJson(res, 202, { ok: true, data: { ...before, opening: true } });
      if (!before.open && !networkRebindInProgress) {
        setTimeout(() => openToLocalNetwork().catch((error) => console.error("network open failed:", sanitizeError(error))), 20).unref();
      }
      return;
    }

    if (url.pathname === "/api/shutdown" && req.method === "POST") {
      if (!isLocalAddress(req.socket.remoteAddress)) throw makeHttpError(403, "Shutdown is only allowed from localhost");
      sendJson(res, 200, { ok: true, message: "Pi Web UI shutting down", webuiPid: process.pid });
      setTimeout(() => shutdown("api shutdown"), 20).unref();
      return;
    }

    if (url.pathname === "/api/workspace" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, {
        ok: true,
        data: await getWorkspaceInfo(tab.cwd, tab.rpc.startedAt),
      });
      return;
    }

    if (url.pathname === "/api/directories" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, {
        ok: true,
        data: await getDirectoryPickerData(url.searchParams.get("path"), tab.cwd),
      });
      return;
    }

    if (url.pathname.startsWith("/api/git-workflow/")) {
      const body = req.method === "POST" ? await readJsonBody(req) : {};
      const tab = getRequestedTab(req, url, body);
      const response = await handleGitWorkflowRequest(url.pathname, body, tab.cwd);
      if (response) {
        sendJson(res, 200, response);
        return;
      }
    }

    const getCommand = req.method === "GET" ? commandFromGet(url.pathname) : undefined;
    if (getCommand) {
      const tab = getRequestedTab(req, url);
      const response = await tab.rpc.send(getCommand);
      sendJson(res, response.success === false ? 400 : 200, response);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/extension-ui-response") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const { tabId, tab: _tab, ...payload } = body;
      if (payload.type !== "extension_ui_response") payload.type = "extension_ui_response";
      if (!payload.id) throw new Error("id is required");
      await tab.rpc.writeRaw(payload);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const command = commandFromPost(url.pathname, body);
      if (command) {
        const tab = getRequestedTab(req, url, body);
        const response = await tab.rpc.send(command);
        sendJson(res, response.success === false ? 400 : 200, response);
        return;
      }
    }

    if (await serveStatic(req, res, url)) return;

    sendError(res, 404, "Not found");
  } catch (error) {
    sendError(res, error?.statusCode || 500, error);
  }
});

server.on("error", (error) => {
  if (networkRebindInProgress) {
    console.error("Web UI network rebind failed:", sanitizeError(error));
    return;
  }
  console.error("Web UI server failed:", sanitizeError(error));
  for (const tab of tabs.values()) tab.rpc.stop();
  process.exit(1);
});

server.listen(options.port, currentHost, () => {
  const urlHost = formatUrlHost(currentHost);
  console.log(`Pi Web UI: http://${urlHost}:${options.port}/`);
  console.log(`Working directory: ${options.cwd}`);
  console.log(`Pi RPC: ${initialTab.rpc.displayCommand}`);
  if (!isLocalHost(currentHost)) {
    console.warn("WARNING: Web UI has no authentication. Only expose it on trusted networks.");
  }
});

function shutdown(signal) {
  console.log(`\n${signal}: shutting down Pi Web UI...`);
  server.close(() => process.exit(0));
  for (const tab of tabs.values()) tab.rpc.stop();
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
