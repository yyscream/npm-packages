#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir, networkInterfaces } from "node:os";
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
const EXTENSION_UI_BLOCKING_METHODS = new Set(["select", "confirm", "input", "editor"]);
const STATUS_RPC_TIMEOUT_MS = 1_800;
const FAST_PICK_LIMIT = 30;
const AUTO_TAB_TITLE_MAX_LENGTH = 44;
const AUTO_TAB_TITLE_WORD_LIMIT = 8;
const AUTO_TAB_TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "s",
  "should",
  "that",
  "the",
  "this",
  "to",
  "way",
  "what",
  "whats",
  "when",
  "with",
  "you",
  "your",
]);

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

const NATIVE_SLASH_COMMANDS = [
  { name: "settings", description: "Open settings menu" },
  { name: "model", description: "Select model (opens selector UI)" },
  { name: "scoped-models", description: "Enable/disable models for Ctrl+P cycling" },
  { name: "export", description: "Export session (HTML default, or specify path: .html/.jsonl)" },
  { name: "import", description: "Import and resume a session from a JSONL file" },
  { name: "share", description: "Share session as a secret GitHub gist" },
  { name: "copy", description: "Copy last agent message to clipboard" },
  { name: "name", description: "Set session display name" },
  { name: "session", description: "Show session info and stats" },
  { name: "changelog", description: "Show changelog entries" },
  { name: "hotkeys", description: "Show all keyboard shortcuts" },
  { name: "fork", description: "Create a new fork from a previous user message" },
  { name: "clone", description: "Duplicate the current session at the current position" },
  { name: "tree", description: "Navigate session tree (switch branches)" },
  { name: "login", description: "Configure provider authentication" },
  { name: "logout", description: "Remove provider authentication" },
  { name: "new", description: "Start a new session" },
  { name: "compact", description: "Manually compact the session context" },
  { name: "resume", description: "Resume a different session" },
  { name: "reload", description: "Reload keybindings, extensions, skills, prompts, and themes" },
  { name: "quit", description: "Quit Pi" },
].map((command) => ({ ...command, source: "native", location: "Pi" }));
const NATIVE_SLASH_COMMAND_NAMES = new Set(NATIVE_SLASH_COMMANDS.map((command) => command.name));

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

function rpcSuccess(command, data = {}) {
  return { type: "response", command, success: true, data };
}

const ACTION_FEEDBACK_REACTIONS = new Set(["up", "down", "question"]);

function trimFeedbackField(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeActionFeedbackItems(body) {
  const rawItems = Array.isArray(body?.feedback) ? body.feedback : Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) throw new Error("feedback is required");
  if (rawItems.length > 20) throw new Error("feedback is limited to 20 reactions per submission");
  return rawItems.map((item, index) => {
    const reaction = String(item?.reaction || "").trim();
    if (!ACTION_FEEDBACK_REACTIONS.has(reaction)) throw new Error(`Invalid feedback reaction at item ${index + 1}`);
    return {
      reaction,
      comment: trimFeedbackField(item?.comment, 800),
      kind: trimFeedbackField(item?.kind || "action", 80),
      title: trimFeedbackField(item?.title || `item ${index + 1}`, 240),
      snippet: trimFeedbackField(item?.snippet, 2000),
      messageIndex: Number.isFinite(Number(item?.messageIndex)) ? Number(item.messageIndex) : index,
      createdAt: trimFeedbackField(item?.createdAt, 80),
    };
  });
}

function actionFeedbackReactionLabel(reaction) {
  if (reaction === "up") return "👍 thumbs up — Good job; repeat this pattern when appropriate.";
  if (reaction === "down") return "👎 thumbs down — avoid or reconsider this target/pattern; prioritize the user comment.";
  return "? question mark — explain this target in detail in the final output.";
}

function formatActionFeedbackLearningPrompt(items) {
  const lines = [
    "The user submitted direct feedback on specific Web UI action or final-output cards from your last run.",
    "Use it to steer future behavior and create or update a concise LEARNING note from this feedback.",
    "Reaction semantics:",
    "- 👍 thumbs up: treat as 'Good job!' and reinforce the action/pattern.",
    "- 👎 thumbs down: avoid or reconsider this target/pattern; include any user comment.",
    "- ? question mark: explain the target in detail in your final output.",
    "",
    "Feedback items:",
  ];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${actionFeedbackReactionLabel(item.reaction)}`,
      `   Target (${item.kind}): ${item.title}`,
      item.comment ? `   User comment: ${item.comment}` : undefined,
      item.snippet ? `   Action excerpt:\n${item.snippet.split(/\r?\n/).map((line) => `     ${line}`).join("\n")}` : undefined,
    );
  });

  lines.push(
    "",
    "After processing this feedback, report which LEARNING was created or updated. If any item used '?', include the requested detailed explanation in the final response.",
  );
  return lines.filter((line) => line !== undefined).join("\n");
}

async function handleActionFeedback(tab, body) {
  const feedbackItems = normalizeActionFeedbackItems(body);
  const state = await tab.rpc.send({ type: "get_state" });
  if (state.success === false) return state;
  if (state.data?.isStreaming || state.data?.isCompacting) {
    throw makeHttpError(409, "Wait for the current agent run or compaction to finish before sending feedback.");
  }

  const command = { type: "prompt", message: formatActionFeedbackLearningPrompt(feedbackItems) };
  markTabWorking(tab);
  const response = await tab.rpc.send(command);
  if (response.success === false) markTabIdle(tab);
  return response;
}

function parseSlashCommand(message) {
  const text = String(message || "").trim();
  if (!text.startsWith("/") || text.includes("\n")) return undefined;
  const match = text.match(/^\/([^\s]+)(?:\s+([\s\S]*))?$/);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  if (!NATIVE_SLASH_COMMAND_NAMES.has(name)) return undefined;
  return { name, args: (match[2] || "").trim(), text };
}

function truncateTabTitle(title, maxLength = AUTO_TAB_TITLE_MAX_LENGTH) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function titleCaseTabTitle(title) {
  return title ? `${title.charAt(0).toUpperCase()}${title.slice(1)}` : "";
}

function generatedTabTitleFromPrompt(message) {
  const line = String(message || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("```"));
  if (!line) return "";

  const cleaned = line
    .replace(/https?:\/\/\S+/gi, "link")
    .replace(/^\/+/, "")
    .replace(/[-_]+/g, " ")
    .replace(/[`*_~#>{}\[\]()<>'"“”‘’,;:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:please\s+)?(?:can|could|would)\s+you\s+/i, "")
    .replace(/^(?:please\s+)?(?:help\s+me\s+|i\s+(?:need|want)\s+(?:you\s+to\s+)?)/i, "")
    .replace(/^(?:for|in|on)\s+the\s+/i, "");
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).map((word) => word.replace(/^[^\w]+|[^\w]+$/g, "")).filter(Boolean);
  const meaningfulWords = words.filter((word) => !AUTO_TAB_TITLE_STOP_WORDS.has(word.toLowerCase()));
  const selectedWords = (meaningfulWords.length >= 3 ? meaningfulWords : words).slice(0, AUTO_TAB_TITLE_WORD_LIMIT);
  return truncateTabTitle(titleCaseTabTitle(selectedWords.join(" ")));
}

function uniqueTabTitle(title, currentTab, maxLength = AUTO_TAB_TITLE_MAX_LENGTH) {
  const base = truncateTabTitle(title, maxLength);
  if (!base) return "";
  const existing = new Set([...tabs.values()].filter((tab) => tab.id !== currentTab?.id).map((tab) => tab.title));
  if (!existing.has(base)) return base;
  for (let suffix = 2; suffix < 100; suffix++) {
    const suffixText = ` ${suffix}`;
    const candidate = `${truncateTabTitle(base, Math.max(1, maxLength - suffixText.length))}${suffixText}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${truncateTabTitle(base, Math.max(1, maxLength - 4))} ${currentTab?.index || 1}`;
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
  for (const key of ["id", "tabId", "tabTitle", "previousTabTitle", "titleSource", "pid", "cwd", "code", "signal", "command", "method", "replayed", "queueLength", "pendingMessageCount", "pendingExtensionUiRequestCount"]) {
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

function normalizePathFastPicks(value) {
  const items = Array.isArray(value) ? value : Array.isArray(value?.picks) ? value.picks : [];
  const seen = new Set();
  const picks = [];
  for (const item of items) {
    const rawCwd = typeof item === "string" ? item : item?.cwd;
    if (!rawCwd) continue;
    let cwd;
    try {
      cwd = path.resolve(options.cwd, expandUserPath(rawCwd));
    } catch {
      continue;
    }
    if (!cwd || seen.has(cwd)) continue;
    seen.add(cwd);
    const displayCwd = String(typeof item === "object" && item?.displayCwd ? item.displayCwd : displayPath(cwd)).slice(0, 4096);
    picks.push({ cwd, displayCwd });
    if (picks.length >= FAST_PICK_LIMIT) break;
  }
  return picks;
}

function fastPicksStorageFile() {
  if (process.env.PI_WEBUI_FAST_PICKS_FILE) return path.resolve(expandUserPath(process.env.PI_WEBUI_FAST_PICKS_FILE));
  const stateRoot = process.env.XDG_STATE_HOME || path.join(homedir(), ".local", "state");
  return path.join(stateRoot, "pi-webui", "fast-picks.json");
}

let pathFastPicksCache = null;

async function readPathFastPicks() {
  if (pathFastPicksCache) return pathFastPicksCache;
  try {
    const parsed = JSON.parse(await readFile(fastPicksStorageFile(), "utf8"));
    pathFastPicksCache = normalizePathFastPicks(parsed);
  } catch (error) {
    if (error?.code !== "ENOENT") console.warn(`failed to read path fast picks: ${sanitizeError(error)}`);
    pathFastPicksCache = [];
  }
  return pathFastPicksCache;
}

async function writePathFastPicks(picks) {
  const normalized = normalizePathFastPicks(picks);
  const storageFile = fastPicksStorageFile();
  await mkdir(path.dirname(storageFile), { recursive: true });
  const tmpFile = `${storageFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify({ version: 1, picks: normalized }, null, 2)}\n`, { mode: 0o600 });
  await rename(tmpFile, storageFile);
  pathFastPicksCache = normalized;
  return normalized;
}

function parseCliScopedModelPatterns() {
  for (let index = 0; index < options.piArgs.length; index++) {
    const arg = options.piArgs[index];
    if (arg === "--models" && options.piArgs[index + 1]) return options.piArgs[index + 1].split(",").map((item) => item.trim()).filter(Boolean);
    if (arg.startsWith("--models=")) return arg.slice("--models=".length).split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}

async function readJsonFileIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    console.warn(`failed to read ${filePath}: ${sanitizeError(error)}`);
    return undefined;
  }
}

async function configuredScopedModelPatterns(cwd = options.cwd) {
  const cliPatterns = parseCliScopedModelPatterns();
  if (cliPatterns !== undefined) return { patterns: cliPatterns, source: "cli" };

  const agentDir = process.env.PI_CODING_AGENT_DIR ? path.resolve(expandUserPath(process.env.PI_CODING_AGENT_DIR)) : path.join(homedir(), ".pi", "agent");
  const [globalSettings, projectSettings] = await Promise.all([
    readJsonFileIfExists(path.join(agentDir, "settings.json")),
    readJsonFileIfExists(path.join(cwd, ".pi", "settings.json")),
  ]);

  if (Array.isArray(projectSettings?.enabledModels)) return { patterns: projectSettings.enabledModels, source: "project" };
  if (Array.isArray(globalSettings?.enabledModels)) return { patterns: globalSettings.enabledModels, source: "global" };
  return { patterns: [], source: "none" };
}

function stripThinkingSuffix(pattern) {
  const text = String(pattern || "").trim();
  const slashIndex = text.indexOf("/");
  const colonIndex = text.lastIndexOf(":");
  if (colonIndex > (slashIndex === -1 ? -1 : slashIndex)) return text.slice(0, colonIndex);
  return text;
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function modelMatchesPattern(model, pattern) {
  const clean = stripThinkingSuffix(pattern).toLowerCase();
  if (!clean) return false;
  const full = `${model.provider}/${model.id}`.toLowerCase();
  const id = String(model.id || "").toLowerCase();
  if (/[?*\[]/.test(clean)) return globToRegExp(clean).test(full) || globToRegExp(clean).test(id);
  return full === clean || id === clean || full.includes(clean) || id.includes(clean);
}

function resolveScopedModelsFromPatterns(patterns, models) {
  const scoped = [];
  const seen = new Set();
  for (const pattern of patterns || []) {
    for (const model of models || []) {
      const key = `${model.provider}/${model.id}`;
      if (seen.has(key) || !modelMatchesPattern(model, pattern)) continue;
      seen.add(key);
      scoped.push(model);
    }
  }
  return scoped;
}

async function getScopedModelData(tab) {
  const { patterns, source } = await configuredScopedModelPatterns(tab.cwd);
  if (!patterns.length) return { models: [], patterns, source };
  const response = await tab.rpc.send({ type: "get_available_models" });
  if (response.success === false) throw makeHttpError(400, response.error || "failed to load available models");
  return { models: resolveScopedModelsFromPatterns(patterns, response.data?.models || []), patterns, source };
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
  if (!["index.html", "app.js", "styles.css", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest", "service-worker.js"].includes(name)) return undefined;
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
const TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS = 1200;
const TAB_ACTIVITY_STATE_RECONCILE_INTERVAL_MS = 2500;
const TAB_ACTIVITY_STATE_RECONCILE_TIMEOUT_MS = 1200;

function createTabActivity(now = new Date().toISOString()) {
  return {
    status: "idle",
    isWorking: false,
    completionSerial: 0,
    lastChangedAt: now,
    lastStartedAt: null,
    lastCompletedAt: null,
  };
}

function resetTabActivity(tab) {
  tab.activity = createTabActivity();
}

function tabActivitySnapshot(tab) {
  return { ...(tab.activity || createTabActivity(tab.createdAt)) };
}

function pendingExtensionUiMap(tab) {
  if (!tab.pendingExtensionUiRequests) tab.pendingExtensionUiRequests = new Map();
  return tab.pendingExtensionUiRequests;
}

function isPendingExtensionUiRequest(event) {
  return event?.type === "extension_ui_request" && EXTENSION_UI_BLOCKING_METHODS.has(event.method) && event.id;
}

function pruneExpiredPendingExtensionUiRequests(tab, nowMs = Date.now()) {
  const pending = tab?.pendingExtensionUiRequests;
  if (!pending) return;
  for (const [id, request] of pending) {
    const expiresAtMs = Date.parse(request.expiresAt || "");
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) pending.delete(id);
  }
}

function pendingExtensionUiRequests(tab) {
  pruneExpiredPendingExtensionUiRequests(tab);
  return [...(tab?.pendingExtensionUiRequests?.values() || [])];
}

function pendingExtensionUiRequestSummaries(tab) {
  return pendingExtensionUiRequests(tab).map((request) => ({
    id: request.id,
    method: request.method,
    title: truncateStatusText(request.title || request.placeholder || "", 120),
    message: request.message ? truncateStatusText(request.message, 180) : undefined,
    receivedAt: request.receivedAt,
    expiresAt: request.expiresAt,
  }));
}

function trackPendingExtensionUiRequest(tab, event) {
  if (!isPendingExtensionUiRequest(event)) return;
  const receivedAt = new Date().toISOString();
  const timeoutMs = Number(event.timeout);
  const expiresAt = Number.isFinite(timeoutMs) && timeoutMs > 0 ? new Date(Date.parse(receivedAt) + timeoutMs + 1000).toISOString() : undefined;
  pendingExtensionUiMap(tab).set(String(event.id), { ...event, receivedAt, expiresAt });
}

function resolvePendingExtensionUiRequest(tab, id) {
  if (!id) return false;
  return !!tab?.pendingExtensionUiRequests?.delete(String(id));
}

function clearPendingExtensionUiRequests(tab) {
  tab?.pendingExtensionUiRequests?.clear();
}

function replayPendingExtensionUiRequests(tab, res) {
  const pending = pendingExtensionUiRequests(tab);
  for (const request of pending) {
    sendSse(res, {
      ...request,
      type: "extension_ui_request",
      replayed: true,
      tabId: tab.id,
      tabTitle: tab.title,
      pendingExtensionUiRequestCount: pending.length,
      tabActivity: tabActivitySnapshot(tab),
    });
  }
}

async function cancelPendingExtensionUiRequests(tab) {
  const pending = pendingExtensionUiRequests(tab);
  if (!pending.length) return 0;
  const ids = [];
  for (const request of pending) {
    ids.push(String(request.id));
    try {
      await tab.rpc.writeRaw({ type: "extension_ui_response", id: request.id, cancelled: true });
    } catch {
      // Abort should remain best-effort even if the RPC process already exited.
    }
    resolvePendingExtensionUiRequest(tab, request.id);
  }
  broadcastTabEvent(tab, {
    type: "webui_extension_ui_cancelled",
    tabId: tab.id,
    tabTitle: tab.title,
    ids,
    pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length,
    tabActivity: tabActivitySnapshot(tab),
  });
  return ids.length;
}

function markTabWorking(tab, timestamp = new Date().toISOString()) {
  const activity = tab.activity || createTabActivity(timestamp);
  activity.status = "working";
  activity.isWorking = true;
  activity.lastStartedAt = timestamp;
  activity.lastChangedAt = timestamp;
  tab.activity = activity;
}

function markTabDone(tab, timestamp = new Date().toISOString()) {
  const activity = tab.activity || createTabActivity(timestamp);
  activity.status = "done";
  activity.isWorking = false;
  activity.completionSerial = (Number(activity.completionSerial) || 0) + 1;
  activity.lastCompletedAt = timestamp;
  activity.lastChangedAt = timestamp;
  tab.activity = activity;
}

function markTabIdle(tab, timestamp = new Date().toISOString()) {
  const activity = tab.activity || createTabActivity(timestamp);
  activity.status = "idle";
  activity.isWorking = false;
  activity.lastChangedAt = timestamp;
  tab.activity = activity;
}

function commandStartsVisibleWork(command) {
  return command?.type === "compact" || (command?.type === "prompt" && !command.streamingBehavior);
}

function commandStartsConversation(command) {
  return command?.type === "prompt" && !command.streamingBehavior;
}

function stateHasVisibleWork(state) {
  return !!state?.isStreaming || !!state?.isCompacting || Number(state?.pendingMessageCount || 0) > 0;
}

function activityRecentlyStarted(activity, nowMs = Date.now()) {
  const startedMs = Date.parse(activity?.lastStartedAt || activity?.lastChangedAt || "");
  return Number.isFinite(startedMs) && nowMs - startedMs < TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS;
}

function reconcileTabActivityFromState(tab, state, timestamp = new Date().toISOString()) {
  if (!tab) return createTabActivity(timestamp);
  if (!state || typeof state !== "object") return tabActivitySnapshot(tab);
  if (stateHasVisibleWork(state)) {
    if (!tab.activity?.isWorking) markTabWorking(tab, timestamp);
    return tabActivitySnapshot(tab);
  }
  if (tab.activity?.isWorking && !activityRecentlyStarted(tab.activity)) {
    markTabDone(tab, timestamp);
  }
  return tabActivitySnapshot(tab);
}

async function reconcileWorkingTabActivity(tab) {
  if (!tab?.activity?.isWorking) return;
  if (activityRecentlyStarted(tab.activity)) return;
  const now = Date.now();
  if (now - (tab.activityStateReconcileAt || 0) < TAB_ACTIVITY_STATE_RECONCILE_INTERVAL_MS) return;
  tab.activityStateReconcileAt = now;
  try {
    const response = await tab.rpc.send({ type: "get_state" }, TAB_ACTIVITY_STATE_RECONCILE_TIMEOUT_MS);
    if (response?.success !== false) reconcileTabActivityFromState(tab, response.data);
  } catch {
    // Ignore reconciliation failures; normal RPC events will still update activity.
  }
}

async function listTabsWithReconciledActivity() {
  await Promise.all([...tabs.values()].map(reconcileWorkingTabActivity));
  return listTabs();
}

function updateTabActivityFromEvent(tab, event) {
  const timestamp = new Date().toISOString();
  switch (event?.type) {
    case "agent_start":
    case "compaction_start":
      markTabWorking(tab, timestamp);
      break;
    case "agent_end":
    case "compaction_end":
      markTabDone(tab, timestamp);
      break;
    case "pi_process_exit":
    case "pi_process_error":
      if (tab.activity?.isWorking) markTabDone(tab, timestamp);
      else markTabIdle(tab, timestamp);
      break;
    case "response":
      if (event.command === "get_state" && event.success !== false) reconcileTabActivityFromState(tab, event.data, timestamp);
      else if (!tab.activity) tab.activity = createTabActivity(timestamp);
      break;
    default:
      if (!tab.activity) tab.activity = createTabActivity(timestamp);
      break;
  }
  return tabActivitySnapshot(tab);
}

function defaultTabTitle(tabIndex) {
  if (options.name) return tabIndex === 1 ? options.name : `${options.name} ${tabIndex}`;
  return `Terminal ${tabIndex}`;
}

function attachRpcToTab(tab, rpc) {
  tab.rpcUnsubscribe?.();
  tab.rpc = rpc;
  tab.rpcUnsubscribe = rpc.onEvent((event) => {
    const tabActivity = updateTabActivityFromEvent(tab, event);
    const scopedEvent = { ...event, tabId: tab.id, tabTitle: tab.title, tabActivity };
    if (event?.type === "pi_process_exit" || event?.type === "pi_process_error") clearPendingExtensionUiRequests(tab);
    else trackPendingExtensionUiRequest(tab, scopedEvent);
    recordEvent(scopedEvent);
    for (const client of tab.sseClients) sendSse(client, scopedEvent);
  });
}

async function createTab({ title, cwd } = {}) {
  const tabIndex = nextTabIndex++;
  const explicitTitle = String(title || "").trim();
  const tabTitle = explicitTitle || defaultTabTitle(tabIndex);
  const titleIsExplicit = Boolean(explicitTitle || (options.name && tabIndex === 1));
  const titleSource = titleIsExplicit ? "explicit" : "default";
  const tabCwd = cwd ? await resolveCwd(cwd, options.cwd) : options.cwd;
  const id = randomUUID();
  const piArgs = buildPiArgsForTab(tabIndex, tabTitle);
  const piCommand = await resolvePiCommand(piArgs);
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tabCwd });
  const createdAt = new Date().toISOString();
  const tab = {
    id,
    index: tabIndex,
    title: tabTitle,
    titleSource,
    conversationStarted: false,
    cwd: tabCwd,
    createdAt,
    activity: createTabActivity(createdAt),
    pendingExtensionUiRequests: new Map(),
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
    titleSource: tab.titleSource || "default",
    conversationStarted: !!tab.conversationStarted,
    cwd: tab.cwd,
    createdAt: tab.createdAt,
    startedAt: tab.rpc.startedAt,
    pid: tab.rpc.child?.pid,
    running: !!tab.rpc.child && tab.rpc.child.exitCode === null,
    command: tab.rpc.displayCommand,
    clientCount: tab.sseClients.size,
    pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length,
    activity: tabActivitySnapshot(tab),
  };
}

function listTabs() {
  return [...tabs.values()].map(tabMeta);
}

function broadcastTabEvent(tab, event) {
  recordEvent(event);
  for (const client of tab.sseClients) sendSse(client, event);
}

function renameTab(tab, title, { source = "explicit", maxLength, unique = source === "auto" } = {}) {
  if (!tab) return false;
  const rawTitle = maxLength ? truncateTabTitle(title, maxLength) : String(title || "").replace(/\s+/g, " ").trim();
  const nextTitle = unique ? uniqueTabTitle(rawTitle, tab, maxLength || AUTO_TAB_TITLE_MAX_LENGTH) : rawTitle;
  if (!nextTitle) return false;

  const previousTitle = tab.title;
  tab.title = nextTitle;
  tab.titleSource = source;
  if (previousTitle === nextTitle) return false;

  broadcastTabEvent(tab, {
    type: "webui_tab_renamed",
    tabId: tab.id,
    tabTitle: tab.title,
    previousTabTitle: previousTitle,
    titleSource: source,
    tab: tabMeta(tab),
    tabActivity: tabActivitySnapshot(tab),
  });
  return true;
}

function maybeNameTabForConversation(tab, command) {
  if (!tab || !commandStartsConversation(command) || tab.conversationStarted || tab.titleSource === "explicit") return false;
  tab.conversationStarted = true;
  const title = generatedTabTitleFromPrompt(command.message) || `Conversation ${tab.index}`;
  return renameTab(tab, title, { source: "auto", maxLength: AUTO_TAB_TITLE_MAX_LENGTH });
}

function responseWithTab(response, tab) {
  if (!response || typeof response !== "object") return response;
  return { ...response, tab: tabMeta(tab) };
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
  resetTabActivity(tab);
  clearPendingExtensionUiRequests(tab);
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tab.cwd });
  attachRpcToTab(tab, rpc);
  rpc.start();

  const changedEvent = { type: "webui_cwd_changed", tabId: tab.id, tabTitle: tab.title, cwd: tab.cwd, pid: tab.rpc.child?.pid, tabActivity: tabActivitySnapshot(tab) };
  recordEvent(changedEvent);
  for (const client of tab.sseClients) {
    sendSse(client, changedEvent);
  }
  return { tab, changed: true };
}

async function restartTabRpc(tab, reason = "reload") {
  const state = await tab.rpc.send({ type: "get_state" });
  if (state.success === false) throw makeHttpError(400, state.error || "Unable to read Pi state before reload");
  if (state.data?.isStreaming) throw makeHttpError(409, "Wait for the current response to finish before reloading.");
  if (state.data?.isCompacting) throw makeHttpError(409, "Wait for compaction to finish before reloading.");

  const piArgs = buildPiArgsForTab(tab.index, tab.title);
  if (state.data?.sessionFile && !options.noSession) piArgs.push("--session", state.data.sessionFile);
  const piCommand = await resolvePiCommand(piArgs);
  const reloadingEvent = { type: "webui_tab_reloading", tabId: tab.id, tabTitle: tab.title, cwd: tab.cwd, reason, sessionFile: state.data?.sessionFile };
  recordEvent(reloadingEvent);
  for (const client of tab.sseClients) sendSse(client, reloadingEvent);

  const oldRpc = tab.rpc;
  tab.rpcUnsubscribe?.();
  tab.rpcUnsubscribe = undefined;
  oldRpc.stop();

  resetTabActivity(tab);
  clearPendingExtensionUiRequests(tab);
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tab.cwd });
  attachRpcToTab(tab, rpc);
  rpc.start();

  const reloadedEvent = { type: "webui_tab_reloaded", tabId: tab.id, tabTitle: tab.title, cwd: tab.cwd, pid: tab.rpc.child?.pid, reason, sessionFile: state.data?.sessionFile, tabActivity: tabActivitySnapshot(tab) };
  recordEvent(reloadedEvent);
  for (const client of tab.sseClients) sendSse(client, reloadedEvent);
  return tab;
}

async function getCommandData(tab) {
  const response = await tab.rpc.send({ type: "get_commands" });
  if (response.success === false) throw makeHttpError(400, response.error || "failed to load commands");
  return { commands: [...NATIVE_SLASH_COMMANDS, ...(response.data?.commands || [])] };
}

function formatSessionOutput(tab, state, stats) {
  return [
    `Session: ${state.sessionName || state.sessionId || "unknown"}`,
    `Tab: ${tab.title}`,
    `CWD: ${tab.cwd}`,
    `Model: ${state.model ? `${state.model.provider}/${state.model.id}` : "none"}`,
    `Thinking: ${state.thinkingLevel || "unknown"}`,
    `Status: ${state.isStreaming ? "running" : state.isCompacting ? "compacting" : "idle"}`,
    `Messages: ${state.messageCount ?? "?"}`,
    `Queue: ${state.pendingMessageCount ?? 0}`,
    `Session file: ${state.sessionFile || "none"}`,
    stats ? `Tokens: input ${stats.tokens?.input ?? 0}, output ${stats.tokens?.output ?? 0}, cache read ${stats.tokens?.cacheRead ?? 0}` : undefined,
    stats?.cost !== undefined ? `Cost: ${stats.cost}` : undefined,
  ].filter(Boolean).join("\n");
}

function webuiHotkeysOutput() {
  return [
    "Web UI hotkeys:",
    "Enter: send on desktop; newline on mobile",
    "Ctrl/Cmd+Enter: send from textarea",
    "Tab: accept slash-command suggestion",
    "Arrow up/down: move through slash-command suggestions",
    "Escape: close actions, tabs, model picker, or mobile drawer",
    "Mobile: Send button submits; Return inserts a newline",
  ].join("\n");
}

async function handleNativeSlashCommand(tab, body) {
  const parsed = parseSlashCommand(body.message);
  if (!parsed) return undefined;

  switch (parsed.name) {
    case "reload": {
      const reloaded = await restartTabRpc(tab, "slash-command");
      return rpcSuccess("native_slash_command", { command: "reload", tab: tabMeta(reloaded), message: "Reloaded keybindings, extensions, skills, prompts, and themes." });
    }
    case "new": {
      const response = await tab.rpc.send({ type: "new_session" });
      if (response.success === false) return response;
      tab.conversationStarted = false;
      return rpcSuccess("native_slash_command", { command: "new", tab: tabMeta(tab), message: "Started a new session.", result: response.data });
    }
    case "compact": {
      const response = await tab.rpc.send(parsed.args ? { type: "compact", customInstructions: parsed.args } : { type: "compact" });
      return response.success === false ? response : rpcSuccess("native_slash_command", { command: "compact", message: "Compaction finished.", result: response.data });
    }
    case "name": {
      if (!parsed.args) throw makeHttpError(400, "Usage: /name <session name>");
      const response = await tab.rpc.send({ type: "set_session_name", name: parsed.args });
      if (response.success === false) return response;
      renameTab(tab, parsed.args, { source: "explicit" });
      return rpcSuccess("native_slash_command", { command: "name", tab: tabMeta(tab), message: `Session and tab name set to: ${tab.title}` });
    }
    case "session": {
      const [state, stats] = await Promise.all([
        tab.rpc.send({ type: "get_state" }),
        tab.rpc.send({ type: "get_session_stats" }).catch((error) => ({ success: false, error: sanitizeError(error) })),
      ]);
      if (state.success === false) return state;
      return rpcSuccess("native_slash_command", { command: "session", message: formatSessionOutput(tab, state.data || {}, stats.success === false ? null : stats.data) });
    }
    case "copy": {
      const response = await tab.rpc.send({ type: "get_last_assistant_text" });
      if (response.success === false) return response;
      const text = String(response.data?.text || "");
      if (!text.trim()) throw makeHttpError(400, "No assistant message to copy.");
      return rpcSuccess("native_slash_command", { command: "copy", message: "Copied the last assistant message.", copyText: text });
    }
    case "hotkeys": {
      return rpcSuccess("native_slash_command", { command: "hotkeys", message: webuiHotkeysOutput() });
    }
    case "clone": {
      const response = await tab.rpc.send({ type: "clone" });
      return response.success === false ? response : rpcSuccess("native_slash_command", { command: "clone", message: "Cloned the current session.", result: response.data });
    }
    default:
      throw makeHttpError(400, `/${parsed.name} is a native Pi TUI command, but this Web UI cannot run that interactive command yet.`);
  }
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
    pendingExtensionUiRequests: pendingExtensionUiRequestSummaries(tab),
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
      sendJson(res, 200, { ok: true, data: { tabs: await listTabsWithReconciledActivity() } });
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
        tabActivity: tabActivitySnapshot(tab),
        pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length,
      });
      replayPendingExtensionUiRequests(tab, res);
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

    if (url.pathname === "/api/path-fast-picks" && req.method === "GET") {
      sendJson(res, 200, { ok: true, data: { picks: await readPathFastPicks() } });
      return;
    }

    if (url.pathname === "/api/path-fast-picks" && req.method === "POST") {
      const body = await readJsonBody(req);
      const picks = await writePathFastPicks(body.picks ?? body);
      sendJson(res, 200, { ok: true, data: { picks } });
      return;
    }

    if (url.pathname === "/api/scoped-models" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getScopedModelData(tab) });
      return;
    }

    if (url.pathname === "/api/commands" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { type: "response", command: "get_commands", success: true, data: await getCommandData(tab) });
      return;
    }

    if (url.pathname === "/api/action-feedback" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const response = await handleActionFeedback(tab, body);
      sendJson(res, response.success === false ? 400 : 200, response);
      return;
    }

    if (url.pathname === "/api/prompt" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const nativeResponse = await handleNativeSlashCommand(tab, body);
      if (nativeResponse) {
        sendJson(res, nativeResponse.success === false ? 400 : 200, responseWithTab(nativeResponse, tab));
        return;
      }
      const command = commandFromPost(url.pathname, body);
      const startsVisibleWork = commandStartsVisibleWork(command);
      if (startsVisibleWork) {
        maybeNameTabForConversation(tab, command);
        markTabWorking(tab);
      }
      const response = await tab.rpc.send(command);
      if (response.success === false && startsVisibleWork) markTabIdle(tab);
      sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
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
      resolvePendingExtensionUiRequest(tab, payload.id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const command = commandFromPost(url.pathname, body);
      if (command) {
        const tab = getRequestedTab(req, url, body);
        if (command.type === "abort") await cancelPendingExtensionUiRequests(tab);
        const startsVisibleWork = commandStartsVisibleWork(command);
        if (startsVisibleWork) {
          maybeNameTabForConversation(tab, command);
          markTabWorking(tab);
        }
        const response = await tab.rpc.send(command);
        if (response.success === false && startsVisibleWork) markTabIdle(tab);
        if (response.success !== false && command.type === "new_session") {
          tab.conversationStarted = false;
          clearPendingExtensionUiRequests(tab);
        }
        sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
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
