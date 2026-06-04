#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir, networkInterfaces, tmpdir } from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";
import { AuthStorage, SessionManager } from "@earendil-works/pi-coding-agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageRoot = path.resolve(__dirname, "..");
const publicDir = path.join(packageRoot, "public");
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 31415;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const CODEX_USAGE_TIMEOUT_MS = 15 * 1000;
const CODEX_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const OPENAI_CODEX_PROVIDER_ID = "openai-codex";
const OPENAI_CODEX_USAGE_ENDPOINT = process.env.PI_WEBUI_CODEX_USAGE_URL || "https://chatgpt.com/backend-api/wham/usage";
const BODY_LIMIT_BYTES = 1024 * 1024;
const PROMPT_BODY_LIMIT_BYTES = 24 * 1024 * 1024;
const UPLOAD_BODY_LIMIT_BYTES = 96 * 1024 * 1024;
const ATTACHMENT_UPLOAD_MAX_FILES = 12;
const ATTACHMENT_UPLOAD_MAX_FILE_BYTES = 64 * 1024 * 1024;
const ATTACHMENT_UPLOAD_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const INLINE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const INLINE_IMAGE_TOTAL_MAX_BYTES = 16 * 1024 * 1024;
const RPC_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EVENT_HISTORY_LIMIT = 200;
const EXTENSION_UI_BLOCKING_METHODS = new Set(["select", "confirm", "input", "editor"]);
const STATUS_RPC_TIMEOUT_MS = 1_800;
const FAST_PICK_LIMIT = 30;
const PATH_SUGGESTION_LIMIT = 20;
const PATH_SUGGESTION_QUERY_LIMIT = 512;
const PATH_SUGGESTION_SCAN_LIMIT = 5000;
const PATH_SUGGESTION_MAX_OUTPUT_LENGTH = 300000;
const PATH_SUGGESTION_EXCLUDED_DIRS = new Set([".git", "node_modules"]);
const RESTORE_TAB_LIMIT = 30;
const SESSION_SELECTOR_LIMIT = 200;
const TREE_SELECTOR_TEXT_LIMIT = 260;
const NETWORK_REBIND_DELAY_MS = 100;
const NETWORK_REBIND_FORCE_CLOSE_MS = 750;
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
  [".webp", "image/webp"],
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
const OPTIONAL_FEATURE_PACKAGES = new Map([
  ["gitWorkflow", "@firstpick/pi-prompts-git-pr"],
  ["releaseNpm", "@firstpick/pi-extension-release-npm"],
  ["releaseAur", "@firstpick/pi-extension-release-aur"],
  ["todoProgressWidget", "@firstpick/pi-extension-todo-progress"],
  ["gitFooterStatus", "@firstpick/pi-extension-git-footer-status"],
  ["statsCommand", "@firstpick/pi-extension-stats"],
  ["themeBundle", "@firstpick/pi-themes-bundle"],
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
  --name <name>       Initial Web UI tab display name
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  isRunning() {
    return !!this.child && this.child.exitCode === null && !this.child.killed;
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
    if (!this.isRunning() || !this.child?.stdin) {
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
    if (!this.isRunning() || !this.child?.stdin) {
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

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
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

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let scaled = value / 1024;
  for (const unit of units) {
    if (scaled < 1024 || unit === units[units.length - 1]) return `${scaled.toFixed(scaled >= 10 ? 1 : 2)} ${unit}`;
    scaled /= 1024;
  }
  return `${value} B`;
}

async function readJsonBody(req, { limitBytes = BODY_LIMIT_BYTES } = {}) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw makeHttpError(413, `Request body too large (limit ${formatBytes(limitBytes)})`);
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

function runCommand(command, args, { cwd, timeoutMs = 2000, maxOutputLength = 20000 } = {}) {
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
      if (stdout.length > maxOutputLength) stdout = stdout.slice(-maxOutputLength);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > maxOutputLength) stderr = stderr.slice(-maxOutputLength);
    });
    child.on("error", (error) => finish({ exitCode: undefined, stdout, stderr: sanitizeError(error), error: sanitizeError(error) }));
    child.on("exit", (exitCode) => finish({ exitCode, stdout, stderr, timedOut: false }));
  });
}

function optionalDependencyInstallRoot() {
  const parts = packageRoot.split(path.sep);
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex >= 0) {
    const root = parts.slice(0, nodeModulesIndex).join(path.sep);
    return root || path.parse(packageRoot).root;
  }
  return packageRoot;
}

function formatCommandForDisplay(command, args) {
  return [command, ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(" ");
}

async function installOptionalFeaturePackage(featureId) {
  const packageName = OPTIONAL_FEATURE_PACKAGES.get(featureId);
  if (!packageName) throw makeHttpError(400, `Unknown optional feature: ${featureId}`);

  const installRoot = optionalDependencyInstallRoot();
  const npmCommand = process.env.PI_WEBUI_NPM_BIN || "npm";
  const args = ["install", "--prefix", installRoot, packageName];
  const result = await runCommand(npmCommand, args, {
    cwd: installRoot,
    timeoutMs: 5 * 60 * 1000,
    maxOutputLength: 80000,
  });
  const command = formatCommandForDisplay(npmCommand, args);
  const ok = result.exitCode === 0 && !result.timedOut && !result.error;
  if (!ok) {
    const details = [result.error, result.timedOut ? "timed out" : undefined, result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join("\n");
    throw makeHttpError(500, `Optional feature install failed: ${command}${details ? `\n${details}` : ""}`);
  }
  return {
    featureId,
    packageName,
    installRoot,
    command,
    stdout: result.stdout,
    stderr: result.stderr,
    message: `Installed optional feature package ${packageName}. Reload the active Pi tab to load new resources.`,
  };
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

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function numericValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function booleanValue(value) {
  return typeof value === "boolean" ? value : undefined;
}

function isoTimestamp(value) {
  const number = numericValue(value);
  if (number !== undefined) {
    const milliseconds = number > 1e12 ? number : number * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }
  return undefined;
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return null;
    const padded = `${payload}${"=".repeat((4 - (payload.length % 4)) % 4)}`;
    return JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function codexAccountIdFromAccessToken(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const auth = payload?.["https://api.openai.com/auth"];
  const accountId = auth?.chatgpt_account_id;
  return typeof accountId === "string" && accountId ? accountId : null;
}

function normalizeCodexRateLimitWindow(rawWindow) {
  if (!rawWindow || typeof rawWindow !== "object") return null;
  const windowDurationSeconds = firstDefined(
    numericValue(rawWindow.windowDurationSeconds),
    numericValue(rawWindow.limitWindowSeconds),
    numericValue(rawWindow.limit_window_seconds),
    numericValue(rawWindow.windowDurationMins) !== undefined ? numericValue(rawWindow.windowDurationMins) * 60 : undefined,
  );
  const windowDurationMins = firstDefined(
    numericValue(rawWindow.windowDurationMins),
    windowDurationSeconds !== undefined ? windowDurationSeconds / 60 : undefined,
  );
  const normalized = {
    usedPercent: numericValue(firstDefined(rawWindow.usedPercent, rawWindow.used_percent)),
    windowDurationSeconds,
    windowDurationMins,
    resetAfterSeconds: numericValue(firstDefined(rawWindow.resetAfterSeconds, rawWindow.reset_after_seconds)),
    resetsAt: isoTimestamp(firstDefined(rawWindow.resetsAt, rawWindow.resetAt, rawWindow.reset_at)),
  };
  return Object.values(normalized).some((value) => value !== undefined) ? normalized : null;
}

function normalizeCodexCredits(rawCredits) {
  if (!rawCredits || typeof rawCredits !== "object") return null;
  return {
    hasCredits: booleanValue(firstDefined(rawCredits.hasCredits, rawCredits.has_credits)),
    unlimited: booleanValue(rawCredits.unlimited),
    balance: firstDefined(rawCredits.balance),
    approxLocalMessages: firstDefined(rawCredits.approxLocalMessages, rawCredits.approx_local_messages),
    approxCloudMessages: firstDefined(rawCredits.approxCloudMessages, rawCredits.approx_cloud_messages),
  };
}

function normalizeCodexRateLimitDetails(rawDetails) {
  if (!rawDetails || typeof rawDetails !== "object") return { primary: null, secondary: null };
  return {
    allowed: booleanValue(rawDetails.allowed),
    limitReached: booleanValue(firstDefined(rawDetails.limitReached, rawDetails.limit_reached)),
    primary: normalizeCodexRateLimitWindow(firstDefined(rawDetails.primary, rawDetails.primaryWindow, rawDetails.primary_window)),
    secondary: normalizeCodexRateLimitWindow(firstDefined(rawDetails.secondary, rawDetails.secondaryWindow, rawDetails.secondary_window)),
  };
}

function normalizeCodexRateLimitReachedType(rawType) {
  if (typeof rawType === "string" && rawType) return rawType;
  if (rawType && typeof rawType === "object") {
    const value = firstDefined(rawType.type, rawType.kind);
    return typeof value === "string" && value ? value : null;
  }
  return null;
}

function makeCodexUsageSnapshot({ limitId, limitName, rateLimit, credits, planType, rateLimitReachedType }) {
  const details = normalizeCodexRateLimitDetails(rateLimit);
  return {
    limitId: limitId || null,
    limitName: limitName || null,
    primary: details.primary,
    secondary: details.secondary,
    allowed: details.allowed,
    limitReached: details.limitReached,
    credits: normalizeCodexCredits(credits),
    planType: planType || null,
    rateLimitReachedType: rateLimitReachedType || null,
  };
}

function normalizeCodexUsagePayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const planType = firstDefined(payload.planType, payload.plan_type, null);
  const rateLimitReachedType = normalizeCodexRateLimitReachedType(firstDefined(payload.rateLimitReachedType, payload.rate_limit_reached_type));
  const snapshotsByKey = new Map();
  const addSnapshot = (snapshot) => {
    if (!snapshot) return;
    const key = snapshot.limitId || snapshot.limitName || `snapshot-${snapshotsByKey.size + 1}`;
    if (!snapshotsByKey.has(key)) snapshotsByKey.set(key, snapshot);
  };

  const directRateLimits = firstDefined(payload.rateLimits, payload.rate_limits);
  if (directRateLimits && typeof directRateLimits === "object" && (directRateLimits.primary || directRateLimits.primary_window || directRateLimits.primaryWindow)) {
    addSnapshot(makeCodexUsageSnapshot({
      limitId: firstDefined(directRateLimits.limitId, directRateLimits.limit_id, "codex"),
      limitName: firstDefined(directRateLimits.limitName, directRateLimits.limit_name),
      rateLimit: directRateLimits,
      credits: firstDefined(directRateLimits.credits, payload.credits),
      planType: firstDefined(directRateLimits.planType, directRateLimits.plan_type, planType),
      rateLimitReachedType: firstDefined(directRateLimits.rateLimitReachedType, directRateLimits.rate_limit_reached_type, rateLimitReachedType),
    }));
  } else {
    addSnapshot(makeCodexUsageSnapshot({
      limitId: "codex",
      rateLimit: firstDefined(payload.rateLimit, payload.rate_limit),
      credits: payload.credits,
      planType,
      rateLimitReachedType,
    }));
  }

  const byLimitId = firstDefined(payload.rateLimitsByLimitId, payload.rate_limits_by_limit_id);
  if (byLimitId && typeof byLimitId === "object" && !Array.isArray(byLimitId)) {
    for (const [limitId, rawSnapshot] of Object.entries(byLimitId)) {
      if (!rawSnapshot || typeof rawSnapshot !== "object") continue;
      addSnapshot(makeCodexUsageSnapshot({
        limitId: firstDefined(rawSnapshot.limitId, rawSnapshot.limit_id, limitId),
        limitName: firstDefined(rawSnapshot.limitName, rawSnapshot.limit_name),
        rateLimit: rawSnapshot,
        credits: rawSnapshot.credits,
        planType: firstDefined(rawSnapshot.planType, rawSnapshot.plan_type, planType),
        rateLimitReachedType: firstDefined(rawSnapshot.rateLimitReachedType, rawSnapshot.rate_limit_reached_type),
      }));
    }
  }

  const additionalRateLimits = firstDefined(payload.additionalRateLimits, payload.additional_rate_limits);
  if (Array.isArray(additionalRateLimits)) {
    for (const item of additionalRateLimits) {
      if (!item || typeof item !== "object") continue;
      addSnapshot(makeCodexUsageSnapshot({
        limitId: firstDefined(item.limitId, item.limit_id, item.meteredFeature, item.metered_feature, item.limitName, item.limit_name),
        limitName: firstDefined(item.limitName, item.limit_name),
        rateLimit: firstDefined(item.rateLimit, item.rate_limit),
        credits: item.credits,
        planType,
      }));
    }
  }

  const snapshots = [...snapshotsByKey.values()];
  const selected = snapshots.find((snapshot) => snapshot.limitId === "codex") || snapshots[0] || null;
  const rateLimitsByLimitId = Object.fromEntries(snapshots.filter((snapshot) => snapshot.limitId).map((snapshot) => [snapshot.limitId, snapshot]));
  return {
    planType: planType || selected?.planType || null,
    rateLimitReachedType: rateLimitReachedType || selected?.rateLimitReachedType || null,
    credits: normalizeCodexCredits(payload.credits) || selected?.credits || null,
    selected,
    snapshots,
    rateLimits: selected,
    rateLimitsByLimitId,
  };
}

async function getOpenAICodexUsageCredentials({ forceRefresh = false } = {}) {
  const authStorage = AuthStorage.create();
  const stored = authStorage.get(OPENAI_CODEX_PROVIDER_ID);
  const storedExpires = numericValue(stored?.expires);
  const shouldRefresh = stored?.type === "oauth" && (forceRefresh || storedExpires === undefined || Date.now() + CODEX_TOKEN_REFRESH_SKEW_MS >= storedExpires);
  let accessToken;
  let refreshed = false;

  if (shouldRefresh) {
    try {
      const refreshResult = await authStorage.refreshOAuthTokenWithLock(OPENAI_CODEX_PROVIDER_ID);
      if (refreshResult?.apiKey) {
        accessToken = refreshResult.apiKey;
        refreshed = forceRefresh || refreshResult.newCredentials?.access !== stored?.access;
      }
    } catch (error) {
      if (forceRefresh || !storedExpires || Date.now() >= storedExpires) {
        throw makeHttpError(401, "OpenAI Codex OAuth token refresh failed. Run /login and choose ChatGPT Plus/Pro (Codex Subscription) to re-authenticate.");
      }
      console.warn(`OpenAI Codex token refresh warning: ${sanitizeError(error)}`);
    }
  }

  if (!accessToken) {
    accessToken = await authStorage.getApiKey(OPENAI_CODEX_PROVIDER_ID, { includeFallback: false });
  }
  if (!accessToken) {
    const status = authStorage.getAuthStatus(OPENAI_CODEX_PROVIDER_ID);
    if (status.configured) throw makeHttpError(401, "OpenAI Codex OAuth token is expired or unavailable. Run /login to refresh credentials.");
    throw makeHttpError(401, "OpenAI Codex OAuth is not configured. Run /login and choose ChatGPT Plus/Pro (Codex Subscription).");
  }

  const latest = authStorage.get(OPENAI_CODEX_PROVIDER_ID) || stored || {};
  const accountId = latest.accountId || codexAccountIdFromAccessToken(accessToken);
  if (!accountId) {
    throw makeHttpError(401, "OpenAI Codex account id is unavailable. Run /login and choose ChatGPT Plus/Pro (Codex Subscription) again.");
  }

  return {
    accessToken,
    accountId,
    refreshed,
    source: latest.type === "oauth" ? "stored-oauth" : "api-key",
    expiresAt: numericValue(latest.expires) ? new Date(numericValue(latest.expires)).toISOString() : undefined,
  };
}

async function fetchOpenAICodexUsagePayload(credentials) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CODEX_USAGE_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await fetch(OPENAI_CODEX_USAGE_ENDPOINT, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${credentials.accessToken}`,
        "chatgpt-account-id": credentials.accountId,
        originator: "pi-webui",
      },
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      const error = makeHttpError(response.status === 401 ? 401 : 502, `OpenAI Codex usage request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`);
      error.openaiStatus = response.status;
      throw error;
    }
    try {
      return JSON.parse(text || "{}");
    } catch {
      throw makeHttpError(502, "OpenAI Codex usage response was not valid JSON");
    }
  } catch (error) {
    if (error?.name === "AbortError") throw makeHttpError(504, "OpenAI Codex usage request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getOpenAICodexUsageStatus({ forceRefresh = false } = {}) {
  let credentials = await getOpenAICodexUsageCredentials({ forceRefresh });
  let rawPayload;
  try {
    rawPayload = await fetchOpenAICodexUsagePayload(credentials);
  } catch (error) {
    if (error?.openaiStatus === 401 && !credentials.refreshed) {
      credentials = await getOpenAICodexUsageCredentials({ forceRefresh: true });
      rawPayload = await fetchOpenAICodexUsagePayload(credentials);
    } else {
      throw error;
    }
  }

  return {
    available: true,
    providerId: OPENAI_CODEX_PROVIDER_ID,
    source: "chatgpt.com",
    fetchedAt: new Date().toISOString(),
    auth: {
      source: credentials.source,
      expiresAt: credentials.expiresAt,
      refreshed: credentials.refreshed,
    },
    ...normalizeCodexUsagePayload(rawPayload),
  };
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
  const response = await safeRpcResponse(tab, { type: "get_available_models" });
  if (response.success === false) throw makeHttpError(400, response.error || "failed to load available models");
  return { models: resolveScopedModelsFromPatterns(patterns, response.data?.models || []), patterns, source, rpcRunning: response.rpcRunning !== false };
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

function normalizeSuggestionPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function cleanPathSuggestionQuery(value) {
  return normalizeSuggestionPath(value).replace(/\0/g, "").slice(0, PATH_SUGGESTION_QUERY_LIMIT);
}

function splitSuggestionPathQuery(query) {
  const normalized = normalizeSuggestionPath(query);
  if (normalized === "~") return { displayBase: "~", prefix: "" };
  if (!normalized || normalized.endsWith("/")) return { displayBase: normalized, prefix: "" };
  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex === -1) return { displayBase: "", prefix: normalized };
  return { displayBase: normalized.slice(0, slashIndex + 1), prefix: normalized.slice(slashIndex + 1) };
}

function resolveSuggestionBase(displayBase, cwd) {
  const base = displayBase || ".";
  if (base === "~" || base.startsWith("~/")) return path.resolve(expandUserPath(base));
  if (base.startsWith("/")) return path.resolve(base);
  return path.resolve(cwd, base);
}

function joinSuggestionDisplayPath(displayBase, name) {
  const base = normalizeSuggestionPath(displayBase);
  if (!base || base === ".") return name;
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}

function pathSuggestionLabel(pathText) {
  const normalized = normalizeSuggestionPath(pathText).replace(/\/+$/, "");
  const name = normalized ? path.posix.basename(normalized) : pathText;
  return `${name || pathText}${pathText.endsWith("/") ? "/" : ""}`;
}

function sortPathSuggestions(items) {
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" });
  });
}

async function getDirectPathSuggestions(query, cwd) {
  const { displayBase, prefix } = splitSuggestionPathQuery(query);
  const searchDir = resolveSuggestionBase(displayBase, cwd);
  let entries;
  try {
    entries = await readdir(searchDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const normalizedPrefix = prefix.toLowerCase();
  const suggestions = [];
  for (const entry of entries) {
    if (entry.name === ".git" || (!normalizedPrefix && PATH_SUGGESTION_EXCLUDED_DIRS.has(entry.name))) continue;
    if (normalizedPrefix && !entry.name.toLowerCase().startsWith(normalizedPrefix)) continue;
    let isDirectory = entry.isDirectory();
    if (!isDirectory && entry.isSymbolicLink()) {
      try {
        isDirectory = (await stat(path.join(searchDir, entry.name))).isDirectory();
      } catch {
        isDirectory = false;
      }
    }
    const pathText = normalizeSuggestionPath(`${joinSuggestionDisplayPath(displayBase, entry.name)}${isDirectory ? "/" : ""}`);
    suggestions.push({
      path: pathText,
      label: `${entry.name}${isDirectory ? "/" : ""}`,
      type: isDirectory ? "directory" : "file",
      description: pathText,
    });
  }
  return sortPathSuggestions(suggestions).slice(0, PATH_SUGGESTION_LIMIT);
}

function addSuggestionEntry(entries, pathText, isDirectory) {
  const normalized = normalizeSuggestionPath(pathText).replace(/^\.\//, "");
  if (!normalized || normalized === ".git" || normalized.startsWith(".git/")) return;
  const value = isDirectory && !normalized.endsWith("/") ? `${normalized}/` : normalized;
  if (!entries.has(value)) entries.set(value, { path: value, isDirectory });
}

function addSuggestionPathWithParents(entries, pathText) {
  const normalized = normalizeSuggestionPath(pathText).replace(/^\.\//, "");
  if (!normalized || normalized.startsWith(".git/")) return;
  const parts = normalized.split("/").filter(Boolean);
  let parent = "";
  for (let index = 0; index < parts.length - 1; index++) {
    parent = parent ? `${parent}/${parts[index]}` : parts[index];
    addSuggestionEntry(entries, `${parent}/`, true);
  }
  addSuggestionEntry(entries, normalized, false);
}

async function getGitPathSuggestionEntries(cwd) {
  const result = await runCommand("git", ["-C", cwd, "ls-files", "-co", "--exclude-standard"], {
    timeoutMs: 1200,
    maxOutputLength: PATH_SUGGESTION_MAX_OUTPUT_LENGTH,
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) return null;
  const entries = new Map();
  for (const line of result.stdout.split("\n")) addSuggestionPathWithParents(entries, line.trim());
  return [...entries.values()];
}

async function getFilesystemPathSuggestionEntries(cwd) {
  const entries = new Map();
  async function walk(dir, relativeDir = "", depth = 0) {
    if (entries.size >= PATH_SUGGESTION_SCAN_LIMIT || depth > 6) return;
    let dirEntries;
    try {
      dirEntries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    dirEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    for (const entry of dirEntries) {
      if (entries.size >= PATH_SUGGESTION_SCAN_LIMIT) return;
      const relativePath = normalizeSuggestionPath(relativeDir ? `${relativeDir}/${entry.name}` : entry.name);
      let isDirectory = entry.isDirectory();
      if (!isDirectory && entry.isSymbolicLink()) {
        try {
          isDirectory = (await stat(path.join(dir, entry.name))).isDirectory();
        } catch {
          isDirectory = false;
        }
      }
      if (isDirectory) {
        addSuggestionEntry(entries, `${relativePath}/`, true);
        if (!PATH_SUGGESTION_EXCLUDED_DIRS.has(entry.name)) await walk(path.join(dir, entry.name), relativePath, depth + 1);
      } else {
        addSuggestionEntry(entries, relativePath, false);
      }
    }
  }
  await walk(cwd);
  return [...entries.values()];
}

function isSubsequence(needle, haystack) {
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index++;
    if (index >= needle.length) return true;
  }
  return needle.length === 0;
}

function scorePathSuggestion(entry, query) {
  const q = normalizeSuggestionPath(query).replace(/^\.\//, "").replace(/\/+$/, "").toLowerCase();
  if (!q) return entry.isDirectory ? 2 : 1;
  const entryPath = entry.path.replace(/\/+$/, "").toLowerCase();
  const name = path.posix.basename(entryPath);
  let score = 0;
  if (name === q) score = 100;
  else if (name.startsWith(q)) score = 90;
  else if (entryPath.startsWith(q)) score = 80;
  else if (name.includes(q)) score = 70;
  else if (entryPath.includes(q)) score = 55;
  else if (isSubsequence(q, name)) score = 40;
  else if (isSubsequence(q, entryPath)) score = 25;
  if (entry.isDirectory && score > 0) score += 5;
  return score;
}

function formatRankedPathSuggestions(entries, query) {
  return entries
    .map((entry) => ({ ...entry, score: scorePathSuggestion(entry, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path))
    .slice(0, PATH_SUGGESTION_LIMIT)
    .map((entry) => ({
      path: entry.path,
      label: pathSuggestionLabel(entry.path),
      type: entry.isDirectory ? "directory" : "file",
      description: entry.path,
    }));
}

async function getPathSuggestionData(tab, rawQuery) {
  const query = cleanPathSuggestionQuery(rawQuery);
  const shouldUseDirect = !query || query.includes("/") || query.startsWith(".") || query.startsWith("~");
  let suggestions = shouldUseDirect ? await getDirectPathSuggestions(query, tab.cwd) : [];
  if (suggestions.length === 0 && query) {
    const entries = (await getGitPathSuggestionEntries(tab.cwd)) ?? (await getFilesystemPathSuggestionEntries(tab.cwd));
    suggestions = formatRankedPathSuggestions(entries, query);
  }
  return { cwd: tab.cwd, displayCwd: displayPath(tab.cwd), query, suggestions };
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

function themeLabel(name) {
  return String(name || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function stringRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") record[key] = String(item);
  }
  return record;
}

async function directoryExists(dir) {
  try {
    const info = await stat(dir);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function resolveBundledThemesDir() {
  const candidates = [];
  try {
    const manifestPath = require.resolve("@firstpick/pi-themes-bundle/package.json");
    const root = path.dirname(manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const declaredThemes = Array.isArray(manifest.pi?.themes) ? manifest.pi.themes : ["./themes"];
    for (const entry of declaredThemes) {
      if (typeof entry === "string" && entry.trim()) candidates.push(path.resolve(root, entry));
    }
  } catch {
    // In repo development the bundle may be a sibling package rather than an installed dependency.
  }
  candidates.push(path.resolve(packageRoot, "..", "pi-package-themes-bundle", "themes"));

  for (const candidate of candidates) {
    if (await directoryExists(candidate)) return candidate;
  }
  return null;
}

function sanitizeBundledTheme(theme, fileName) {
  const name = typeof theme?.name === "string" && theme.name.trim() ? theme.name.trim() : path.basename(fileName, ".json");
  return {
    name,
    label: themeLabel(name),
    vars: stringRecord(theme?.vars),
    colors: stringRecord(theme?.colors),
    export: stringRecord(theme?.export),
  };
}

async function readBundledThemes() {
  const dir = await resolveBundledThemesDir();
  if (!dir) return { source: "@firstpick/pi-themes-bundle", themes: [] };

  const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort((a, b) => a.localeCompare(b));
  const themes = [];
  for (const file of files) {
    try {
      const raw = await readFile(path.join(dir, file), "utf8");
      themes.push(sanitizeBundledTheme(JSON.parse(raw), file));
    } catch (error) {
      console.error(`Skipping invalid theme ${file}: ${sanitizeError(error)}`);
    }
  }
  themes.sort((a, b) => a.label.localeCompare(b.label));
  return { source: "@firstpick/pi-themes-bundle", themes };
}

function normalizeStaticPath(urlPath) {
  if (urlPath === "/") return "index.html";
  const name = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  if (!["index.html", "app.js", "styles.css", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "catppuccin-mocha-background.png", "matrix-background.webp", "manifest.webmanifest", "service-worker.js"].includes(name)) return undefined;
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

function requestBodyLimitForPath(pathname) {
  if (pathname === "/api/attachments") return UPLOAD_BODY_LIMIT_BYTES;
  if (["/api/prompt", "/api/steer", "/api/follow-up"].includes(pathname)) return PROMPT_BODY_LIMIT_BYTES;
  return BODY_LIMIT_BYTES;
}

function sanitizeUploadFileName(name) {
  const base = path.basename(String(name || "attachment").replace(/\0/g, ""));
  const safe = base.replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 180);
  return safe && safe !== "." && safe !== ".." ? safe : "attachment";
}

function normalizeMimeType(value) {
  const mimeType = String(value || "application/octet-stream").split(";", 1)[0].trim().toLowerCase();
  return mimeType || "application/octet-stream";
}

function stripDataUrlPrefix(data) {
  const text = String(data || "").trim();
  if (!text.toLowerCase().startsWith("data:")) return text;
  const comma = text.indexOf(",");
  return comma === -1 ? text : text.slice(comma + 1);
}

function decodeAttachmentData(data) {
  const base64 = stripDataUrlPrefix(data).replace(/\s+/g, "");
  if (!base64) throw new Error("attachment data is required");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error("attachment data must be base64 encoded");
  return Buffer.from(base64, "base64");
}

async function saveUploadedAttachments(body) {
  const rawFiles = Array.isArray(body?.files) ? body.files : [];
  if (rawFiles.length === 0) throw new Error("files are required");
  if (rawFiles.length > ATTACHMENT_UPLOAD_MAX_FILES) throw new Error(`attachments are limited to ${ATTACHMENT_UPLOAD_MAX_FILES} files`);

  const decoded = [];
  let totalBytes = 0;
  for (const [index, file] of rawFiles.entries()) {
    const buffer = decodeAttachmentData(file?.data);
    if (buffer.length === 0) throw new Error(`attachment ${index + 1} is empty`);
    if (buffer.length > ATTACHMENT_UPLOAD_MAX_FILE_BYTES) throw new Error(`attachment ${index + 1} exceeds ${formatBytes(ATTACHMENT_UPLOAD_MAX_FILE_BYTES)}`);
    totalBytes += buffer.length;
    if (totalBytes > ATTACHMENT_UPLOAD_MAX_TOTAL_BYTES) throw new Error(`attachments exceed ${formatBytes(ATTACHMENT_UPLOAD_MAX_TOTAL_BYTES)} total`);
    decoded.push({
      id: String(file?.id || `attachment-${index + 1}`).slice(0, 120),
      name: sanitizeUploadFileName(file?.name),
      mimeType: normalizeMimeType(file?.mimeType || file?.type),
      size: buffer.length,
      buffer,
    });
  }

  const uploadDir = path.join(tmpdir(), "pi-webui-uploads", randomUUID());
  await mkdir(uploadDir, { recursive: true });
  const saved = [];
  for (const [index, file] of decoded.entries()) {
    const fileName = `${String(index + 1).padStart(2, "0")}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, file.buffer);
    saved.push({ id: file.id, name: file.name, mimeType: file.mimeType, size: file.size, path: filePath });
  }
  return { files: saved, uploadDir };
}

function normalizeRpcImages(value) {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (value.length > ATTACHMENT_UPLOAD_MAX_FILES) throw new Error(`images are limited to ${ATTACHMENT_UPLOAD_MAX_FILES} files`);
  const images = [];
  let totalBytes = 0;
  for (const [index, image] of value.entries()) {
    const mimeType = normalizeMimeType(image?.mimeType);
    if (!RPC_IMAGE_MIME_TYPES.has(mimeType)) throw new Error(`image ${index + 1} has unsupported MIME type ${mimeType}`);
    const data = stripDataUrlPrefix(image?.data).replace(/\s+/g, "");
    if (!data) throw new Error(`image ${index + 1} data is required`);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw new Error(`image ${index + 1} data must be base64 encoded`);
    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > INLINE_IMAGE_MAX_BYTES) throw new Error(`image ${index + 1} exceeds ${formatBytes(INLINE_IMAGE_MAX_BYTES)} inline limit`);
    totalBytes += approxBytes;
    if (totalBytes > INLINE_IMAGE_TOTAL_MAX_BYTES) throw new Error(`inline images exceed ${formatBytes(INLINE_IMAGE_TOTAL_MAX_BYTES)} total`);
    images.push({ type: "image", data, mimeType });
  }
  return images.length ? images : undefined;
}

function attachImages(command, body) {
  const images = normalizeRpcImages(body?.images);
  if (images) command.images = images;
  return command;
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
      return attachImages(command, body);
    }
    case "/api/steer": {
      const message = String(body.message || "").trim();
      if (!message) throw new Error("message is required");
      return attachImages({ type: "steer", message }, body);
    }
    case "/api/follow-up": {
      const message = String(body.message || "").trim();
      if (!message) throw new Error("message is required");
      return attachImages({ type: "follow_up", message }, body);
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
    case "/api/steering-mode": {
      const mode = String(body.mode || "").trim();
      if (!["all", "one-at-a-time"].includes(mode)) throw new Error("Invalid steering mode");
      return { type: "set_steering_mode", mode };
    }
    case "/api/follow-up-mode": {
      const mode = String(body.mode || "").trim();
      if (!["all", "one-at-a-time"].includes(mode)) throw new Error("Invalid follow-up mode");
      return { type: "set_follow_up_mode", mode };
    }
    case "/api/auto-compaction":
      return { type: "set_auto_compaction", enabled: body.enabled === true };
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

const restoreTabs = readRestoreTabsFromEnv();

function normalizedRestoreString(value, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maxLength) : undefined;
}

function normalizeRestoreTabDescriptor(item, seenIds) {
  if (!item || typeof item !== "object") return null;
  const state = item.state && typeof item.state === "object" ? item.state : {};
  const rawId = normalizedRestoreString(item.id, 128);
  const id = rawId && /^[A-Za-z0-9._:-]+$/.test(rawId) && !seenIds.has(rawId) ? rawId : undefined;
  if (id) seenIds.add(id);

  const descriptor = {
    id,
    title: normalizedRestoreString(item.title, 160),
    titleSource: ["explicit", "auto", "default"].includes(item.titleSource) ? item.titleSource : undefined,
    cwd: normalizedRestoreString(item.cwd || item.workspace?.cwd, 4096),
    conversationStarted: item.conversationStarted === true,
    sessionFile: normalizedRestoreString(item.sessionFile || state.sessionFile, 4096),
  };

  if (Number.isInteger(item.index) && item.index > 0) descriptor.index = item.index;
  return descriptor;
}

function readRestoreTabsFromEnv() {
  const raw = process.env.PI_WEBUI_RESTORE_TABS;
  delete process.env.PI_WEBUI_RESTORE_TABS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [];
    const seenIds = new Set();
    return items.map((item) => normalizeRestoreTabDescriptor(item, seenIds)).filter(Boolean).slice(0, RESTORE_TAB_LIMIT);
  } catch (error) {
    console.warn(`failed to parse PI_WEBUI_RESTORE_TABS: ${sanitizeError(error)}`);
    return [];
  }
}

function buildPiArgsForTab(tabIndex, title) {
  const args = ["--mode", "rpc"];
  if (options.noSession) args.push("--no-session");

  // Keep tab naming inside Web UI metadata. Some bundled Pi CLI versions do not
  // support --name, and passing Web UI-generated tab titles through to child
  // RPC processes makes every tab after the first exit immediately.
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
const closedRestorableTabs = [];
let nextTabIndex = 1;
const TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS = 1200;
const TAB_ACTIVITY_STATE_RECONCILE_INTERVAL_MS = 2500;
const TAB_ACTIVITY_STATE_RECONCILE_TIMEOUT_MS = 1200;

function sessionFileFromState(state) {
  return state && typeof state === "object" ? normalizedRestoreString(state.sessionFile, 4096) : undefined;
}

function rememberTabState(tab, state) {
  if (!tab || !state || typeof state !== "object") return;
  tab.lastState = state;
  if (!options.noSession && Object.prototype.hasOwnProperty.call(state, "sessionFile")) tab.sessionFile = sessionFileFromState(state);
}

function forgetTabState(tab) {
  if (!tab) return;
  tab.lastState = null;
  tab.sessionFile = undefined;
}

function tabRestorableSessionFile(tab) {
  if (options.noSession) return undefined;
  return normalizedRestoreString(tab?.sessionFile || tab?.lastState?.sessionFile, 4096);
}

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
  if (!tab.activity?.isWorking) markTabWorking(tab, receivedAt);
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
  if (pendingExtensionUiRequests(tab).length > 0) {
    if (!tab.activity?.isWorking) markTabWorking(tab, timestamp);
    return tabActivitySnapshot(tab);
  }
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
    if (response?.success !== false) {
      rememberTabState(tab, response.data);
      reconcileTabActivityFromState(tab, response.data);
    }
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
      if (event.command === "get_state" && event.success !== false) {
        rememberTabState(tab, event.data);
        reconcileTabActivityFromState(tab, event.data, timestamp);
      } else if (!tab.activity) tab.activity = createTabActivity(timestamp);
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

async function primeTabRpc(tab) {
  try {
    const response = await tab.rpc.send({ type: "get_state" }, 1500);
    if (response.success !== false) {
      rememberTabState(tab, response.data);
      reconcileTabActivityFromState(tab, response.data);
    }
  } catch (error) {
    if (!/Timed out waiting for RPC response/i.test(sanitizeError(error))) throw error;
  }
}

function attachRpcToTab(tab, rpc) {
  tab.rpcUnsubscribe?.();
  tab.rpc = rpc;
  tab.rpcUnsubscribe = rpc.onEvent((event) => {
    updateTabActivityFromEvent(tab, event);
    let scopedEvent = { ...event, tabId: tab.id, tabTitle: tab.title, tabActivity: tabActivitySnapshot(tab) };
    if (event?.type === "pi_process_exit" || event?.type === "pi_process_error") clearPendingExtensionUiRequests(tab);
    else trackPendingExtensionUiRequest(tab, scopedEvent);
    scopedEvent = { ...scopedEvent, tabActivity: tabActivitySnapshot(tab), pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length };
    recordEvent(scopedEvent);
    for (const client of tab.sseClients) sendSse(client, scopedEvent);
  });
}

async function createTab({ id: requestedId, index, title, titleSource, conversationStarted, cwd, sessionFile } = {}) {
  const tabIndex = Number.isInteger(index) && index > 0 ? index : nextTabIndex;
  nextTabIndex = Math.max(nextTabIndex, tabIndex + 1);
  const explicitTitle = String(title || "").trim();
  const tabTitle = explicitTitle || defaultTabTitle(tabIndex);
  const titleIsExplicit = Boolean(explicitTitle || (options.name && tabIndex === 1));
  const resolvedTitleSource = ["explicit", "auto", "default"].includes(titleSource) ? titleSource : titleIsExplicit ? "explicit" : "default";
  const tabCwd = cwd ? await resolveCwd(cwd, options.cwd) : options.cwd;
  const id = requestedId && !tabs.has(requestedId) ? requestedId : randomUUID();
  const piArgs = buildPiArgsForTab(tabIndex, tabTitle);
  if (sessionFile && !options.noSession) piArgs.push("--session", sessionFile);
  const piCommand = await resolvePiCommand(piArgs);
  const rpc = new PiRpcProcess({ ...piCommand, cwd: tabCwd });
  const createdAt = new Date().toISOString();
  const tab = {
    id,
    index: tabIndex,
    title: tabTitle,
    titleSource: resolvedTitleSource,
    conversationStarted: conversationStarted === true,
    cwd: tabCwd,
    createdAt,
    sessionFile: options.noSession ? undefined : normalizedRestoreString(sessionFile, 4096),
    lastState: null,
    activity: createTabActivity(createdAt),
    pendingExtensionUiRequests: new Map(),
    rpc: undefined,
    rpcUnsubscribe: undefined,
    sseClients: new Set(),
  };

  attachRpcToTab(tab, rpc);
  tabs.set(id, tab);
  rpc.start();
  try {
    await primeTabRpc(tab);
  } catch (error) {
    if (!tab.rpc.isRunning()) {
      tab.rpcUnsubscribe?.();
      tabs.delete(id);
      throw new Error(`Pi RPC process failed while starting ${tabTitle}: ${sanitizeError(error)}`);
    }
  }
  if (sessionFile && !options.noSession) {
    recordEvent({ type: "webui_tab_restored", tabId: tab.id, tabTitle: tab.title, cwd: tab.cwd });
  }
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
    sessionFile: tabRestorableSessionFile(tab),
    createdAt: tab.createdAt,
    startedAt: tab.rpc.startedAt,
    pid: tab.rpc.child?.pid,
    running: tab.rpc.isRunning(),
    command: tab.rpc.displayCommand,
    clientCount: tab.sseClients.size,
    pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length,
    activity: tabActivitySnapshot(tab),
  };
}

function listTabs() {
  return [...tabs.values()].map(tabMeta);
}

function restorableTabDescriptor(tab, state = null) {
  return normalizeRestoreTabDescriptor({
    id: tab.id,
    index: tab.index,
    title: tab.title,
    titleSource: tab.titleSource,
    conversationStarted: tab.conversationStarted,
    cwd: tab.cwd,
    sessionFile: sessionFileFromState(state) || tabRestorableSessionFile(tab),
  }, new Set());
}

function restorableTabKey(tab) {
  if (tab.id) return `id:${tab.id}`;
  if (tab.sessionFile) return `session:${tab.sessionFile}`;
  return `tab:${tab.index || "?"}:${tab.title || ""}:${tab.cwd || ""}`;
}

function restorableTabSortIndex(tab) {
  return Number.isInteger(tab.index) && tab.index > 0 ? tab.index : Number.MAX_SAFE_INTEGER;
}

function mergeRestorableTabDescriptors(...sources) {
  const merged = [];
  const seen = new Set();
  for (const source of sources) {
    for (const item of Array.isArray(source) ? source : []) {
      const descriptor = normalizeRestoreTabDescriptor(item, new Set());
      if (!descriptor) continue;
      const key = restorableTabKey(descriptor);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(descriptor);
    }
  }
  return merged
    .sort((a, b) => restorableTabSortIndex(a) - restorableTabSortIndex(b) || String(a.title || "").localeCompare(String(b.title || "")))
    .slice(0, RESTORE_TAB_LIMIT);
}

function rememberClosedRestorableTab(tab, state = null) {
  const descriptor = restorableTabDescriptor(tab, state);
  if (!descriptor) return;
  const key = restorableTabKey(descriptor);
  const existingIndex = closedRestorableTabs.findIndex((item) => restorableTabKey(item) === key);
  if (existingIndex !== -1) closedRestorableTabs.splice(existingIndex, 1);
  closedRestorableTabs.push(descriptor);
  while (closedRestorableTabs.length > RESTORE_TAB_LIMIT) closedRestorableTabs.shift();
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
  forgetTabState(tab);
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
  rememberTabState(tab, state.data);
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

function rpcUnavailableMessage(tab) {
  return `Pi RPC process for ${tab?.title || "terminal"} is not running`;
}

function fallbackRpcResponse(tab, command, error) {
  const message = sanitizeError(error) || rpcUnavailableMessage(tab);
  const base = { type: "response", command: command.type, success: true, rpcRunning: false, error: message };
  switch (command.type) {
    case "get_state":
      return {
        ...base,
        data: {
          model: null,
          thinkingLevel: "off",
          isStreaming: false,
          isCompacting: false,
          steeringMode: "one-at-a-time",
          followUpMode: "one-at-a-time",
          sessionFile: tab?.sessionFile,
          sessionId: tab?.id,
          sessionName: tab?.title,
          autoCompactionEnabled: false,
          messageCount: 0,
          pendingMessageCount: 0,
          rpcRunning: false,
          rpcError: message,
        },
      };
    case "get_messages":
      return { ...base, data: { messages: [] } };
    case "get_available_models":
      return { ...base, data: { models: [] } };
    case "get_session_stats":
      return { ...base, data: null };
    case "get_last_assistant_text":
      return { ...base, data: { text: "" } };
    default:
      return { ...base, success: false, error: message };
  }
}

async function safeRpcResponse(tab, command, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    return await tab.rpc.send(command, timeoutMs);
  } catch (error) {
    const message = sanitizeError(error);
    if (/Pi RPC process is not running/i.test(message)) return fallbackRpcResponse(tab, command, error);
    throw error;
  }
}

async function getCommandData(tab) {
  try {
    const response = await tab.rpc.send({ type: "get_commands" });
    if (response.success === false) throw makeHttpError(400, response.error || "failed to load commands");
    return { commands: [...NATIVE_SLASH_COMMANDS, ...(response.data?.commands || [])], rpcRunning: true };
  } catch (error) {
    const message = sanitizeError(error);
    if (!/Pi RPC process is not running/i.test(message)) throw error;
    return { commands: [...NATIVE_SLASH_COMMANDS], rpcRunning: false, error: message };
  }
}

function resolveCliPath(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return path.isAbsolute(text) ? text : path.resolve(options.cwd, text);
}

function resolveTabPath(tab, value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return path.isAbsolute(text) ? text : path.resolve(tab?.cwd || options.cwd, text);
}

function configuredSessionDir() {
  for (let index = 0; index < options.piArgs.length; index++) {
    const arg = options.piArgs[index];
    if (arg === "--session-dir" && options.piArgs[index + 1]) return resolveCliPath(options.piArgs[index + 1]);
    if (arg.startsWith("--session-dir=")) return resolveCliPath(arg.slice("--session-dir=".length));
  }
  return undefined;
}

function requirePersistentSessions() {
  if (options.noSession) throw makeHttpError(400, "Session selectors are unavailable when Web UI was started with --no-session.");
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeSessionInfo(info, currentSessionFile) {
  const sessionPath = String(info.path || "");
  return {
    path: sessionPath,
    id: String(info.id || ""),
    name: info.name || undefined,
    cwd: String(info.cwd || ""),
    created: isoDate(info.created),
    modified: isoDate(info.modified),
    messageCount: Number.isFinite(info.messageCount) ? info.messageCount : 0,
    firstMessage: truncateStatusText(info.firstMessage || "(no messages)", 220),
    parentSessionPath: info.parentSessionPath || undefined,
    current: !!currentSessionFile && path.resolve(sessionPath) === path.resolve(currentSessionFile),
  };
}

async function currentSessionState(tab) {
  const response = await safeRpcResponse(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
  if (response.success === false) throw makeHttpError(400, response.error || "failed to load current session state");
  rememberTabState(tab, response.data);
  return response.data || {};
}

async function getSessionSelectorData(tab, scope = "current") {
  requirePersistentSessions();
  const state = await currentSessionState(tab).catch(() => tab.lastState || {});
  const sessionDir = configuredSessionDir();
  const listAll = String(scope || "current").toLowerCase() === "all";
  const sessions = listAll ? await SessionManager.listAll(sessionDir) : await SessionManager.list(tab.cwd, sessionDir);
  return {
    scope: listAll ? "all" : "current",
    sessionDir: sessionDir || undefined,
    currentSessionFile: state.sessionFile || tabRestorableSessionFile(tab),
    sessions: sessions.slice(0, SESSION_SELECTOR_LIMIT).map((info) => normalizeSessionInfo(info, state.sessionFile || tabRestorableSessionFile(tab))),
    limited: sessions.length > SESSION_SELECTOR_LIMIT,
  };
}

function extractSessionTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text" && typeof part.text === "string") return part.text;
      if (part?.type === "toolCall") return `[tool call: ${part.toolName || "tool"}]`;
      if (part?.type === "thinking") return "[thinking]";
      if (part?.type === "image") return "[image]";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function sessionTreeEntryLabel(entry) {
  if (!entry || typeof entry !== "object") return "entry";
  if (entry.type === "message") return entry.message?.role || "message";
  if (entry.type === "branch_summary") return "branch summary";
  if (entry.type === "compaction") return "compaction";
  if (entry.type === "model_change") return "model";
  if (entry.type === "thinking_level_change") return "thinking";
  if (entry.type === "custom_message") return entry.customType || "custom";
  return entry.type || "entry";
}

function sessionTreeEntryText(entry) {
  if (!entry || typeof entry !== "object") return "";
  if (entry.type === "message") return extractSessionTextContent(entry.message?.content);
  if (entry.type === "custom_message") return extractSessionTextContent(entry.content);
  if (entry.type === "branch_summary") return entry.summary || "branch summary";
  if (entry.type === "compaction") return entry.summary || "compaction summary";
  if (entry.type === "model_change") return [entry.provider, entry.modelId].filter(Boolean).join("/");
  if (entry.type === "thinking_level_change") return entry.thinkingLevel || "";
  return "";
}

function flattenSessionTree(nodes, { depth = 0, leafId, result = [] } = {}) {
  for (const node of nodes || []) {
    const entry = node.entry || {};
    result.push({
      id: entry.id,
      parentId: entry.parentId ?? null,
      depth,
      type: entry.type || "entry",
      role: entry.message?.role || undefined,
      label: node.label || undefined,
      timestamp: entry.timestamp || undefined,
      title: sessionTreeEntryLabel(entry),
      text: truncateStatusText(sessionTreeEntryText(entry), TREE_SELECTOR_TEXT_LIMIT),
      childCount: Array.isArray(node.children) ? node.children.length : 0,
      currentLeaf: !!leafId && entry.id === leafId,
    });
    flattenSessionTree(node.children || [], { depth: depth + 1, leafId, result });
  }
  return result;
}

async function getSessionTreeData(tab) {
  requirePersistentSessions();
  const state = await currentSessionState(tab).catch(() => tab.lastState || {});
  const sessionFile = state.sessionFile || tabRestorableSessionFile(tab);
  if (!sessionFile) throw makeHttpError(400, "No persisted session file is available for /tree.");
  const manager = SessionManager.open(sessionFile, configuredSessionDir(), tab.cwd);
  const leafId = manager.getLeafId();
  return {
    sessionFile: manager.getSessionFile(),
    sessionId: manager.getSessionId(),
    cwd: manager.getCwd(),
    leafId,
    nodes: flattenSessionTree(manager.getTree(), { leafId }),
  };
}

async function getForkMessagesData(tab) {
  const response = await safeRpcResponse(tab, { type: "get_fork_messages" });
  if (response.success === false) throw makeHttpError(400, response.error || "failed to load fork points");
  return { messages: Array.isArray(response.data?.messages) ? response.data.messages : [] };
}

async function requireIdleForSessionAction(tab, actionLabel) {
  const state = await currentSessionState(tab);
  if (state.isStreaming || state.isCompacting) throw makeHttpError(409, `Wait for the current agent run or compaction to finish before ${actionLabel}.`);
}

async function runForkCommand(tab, entryId) {
  await requireIdleForSessionAction(tab, "forking the session");
  const targetEntryId = String(entryId || "").trim();
  if (!targetEntryId) throw makeHttpError(400, "entryId is required");
  const response = await tab.rpc.send({ type: "fork", entryId: targetEntryId });
  if (response.success === false) return response;
  const state = await safeRpcData(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
  if (state.ok) rememberTabState(tab, state.data);
  return rpcSuccess("fork", {
    message: response.data?.cancelled ? "Fork cancelled." : "Forked the current session.",
    text: response.data?.text || "",
    result: response.data,
    tab: tabMeta(tab),
  });
}

async function runCloneCommand(tab) {
  await requireIdleForSessionAction(tab, "cloning the session");
  const response = await tab.rpc.send({ type: "clone" });
  if (response.success === false) return response;
  const state = await safeRpcData(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
  if (state.ok) rememberTabState(tab, state.data);
  return rpcSuccess("clone", {
    message: response.data?.cancelled ? "Clone cancelled." : "Cloned the current session.",
    result: response.data,
    tab: tabMeta(tab),
  });
}

async function switchTabSession(tab, sessionPath) {
  requirePersistentSessions();
  await requireIdleForSessionAction(tab, "switching sessions");
  const targetPath = resolveTabPath(tab, sessionPath);
  if (!targetPath) throw makeHttpError(400, "sessionPath is required");
  if (!targetPath.endsWith(".jsonl")) throw makeHttpError(400, "sessionPath must point to a .jsonl session file");
  const targetStats = await stat(targetPath).catch(() => null);
  if (!targetStats?.isFile()) throw makeHttpError(404, `Session file not found: ${targetPath}`);
  const manager = SessionManager.open(targetPath, configuredSessionDir());
  const response = await tab.rpc.send({ type: "switch_session", sessionPath: manager.getSessionFile() });
  if (response.success === false) return response;
  if (!response.data?.cancelled) {
    tab.cwd = manager.getCwd();
    const state = await safeRpcData(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
    if (state.ok) rememberTabState(tab, state.data);
  }
  return rpcSuccess("switch_session", {
    message: response.data?.cancelled ? "Resume cancelled." : "Resumed selected session.",
    result: response.data,
    tab: tabMeta(tab),
  });
}

async function navigateSessionTree(tab, body) {
  requirePersistentSessions();
  await requireIdleForSessionAction(tab, "navigating the session tree");
  const entryId = String(body.entryId || body.targetId || "").trim();
  if (!entryId) throw makeHttpError(400, "entryId is required");
  const payload = {
    entryId,
    summarize: body.summarize === true,
    customInstructions: typeof body.customInstructions === "string" ? body.customInstructions : undefined,
    replaceInstructions: body.replaceInstructions === true,
    label: typeof body.label === "string" ? body.label : undefined,
  };
  const response = await tab.rpc.send({ type: "prompt", message: `/webui-tree-navigate ${JSON.stringify(payload)}` });
  if (response.success === false) return response;
  const state = await safeRpcData(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
  if (state.ok) rememberTabState(tab, state.data);
  return rpcSuccess("tree", {
    message: "Navigated the session tree.",
    result: response.data,
    tab: tabMeta(tab),
  });
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
    "Tab: accept slash-command or @path suggestion",
    "Arrow up/down: move through slash-command or @path suggestions",
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
      const response = await runCloneCommand(tab);
      return response.success === false ? response : rpcSuccess("native_slash_command", { command: "clone", message: response.data?.message || "Cloned the current session.", result: response.data?.result });
    }
    default:
      throw makeHttpError(400, `/${parsed.name} is a native Pi TUI command, but this Web UI cannot run that interactive command yet.`);
  }
}

async function closeTab(id) {
  const tab = tabs.get(id);
  if (!tab) throw makeHttpError(404, `Unknown Pi tab: ${id}`);
  if (tabs.size <= 1) throw makeHttpError(400, "Cannot close the last Pi tab");

  let restorableState = null;
  if (!options.noSession) {
    const stateResult = await safeRpcData(tab, { type: "get_state" }, STATUS_RPC_TIMEOUT_MS);
    if (stateResult.ok) restorableState = stateResult.data;
  }
  rememberClosedRestorableTab(tab, restorableState);

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

async function closeTabs(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean))];
  const targetTabs = uniqueIds.map((id) => tabs.get(id)).filter(Boolean);
  if (!targetTabs.length) return [];

  if (targetTabs.length >= tabs.size) {
    await createTab({ cwd: targetTabs[0]?.cwd || options.cwd });
  }

  const closed = [];
  for (const tab of targetTabs) {
    if (!tabs.has(tab.id)) continue;
    closed.push(await closeTab(tab.id));
  }
  return closed;
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

async function createInitialTabs() {
  if (!restoreTabs.length) return [await createTab()];

  const created = [];
  for (const descriptor of restoreTabs) {
    try {
      created.push(await createTab(descriptor));
    } catch (error) {
      console.warn(`failed to restore Web UI tab ${descriptor.title || descriptor.id || "unknown"}: ${sanitizeError(error)}`);
    }
  }

  return created.length ? created : [await createTab()];
}

const serverStartedAt = new Date().toISOString();
const initialTabs = await createInitialTabs();
const initialTab = initialTabs[0];
let currentHost = options.host;
let networkRebindInProgress = false;
let networkRebindTargetHost = null;

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
  const targetHost = networkRebindTargetHost || currentHost;
  const opening = networkRebindInProgress && !isLocalHost(targetHost);
  const closing = networkRebindInProgress && isLocalHost(targetHost);
  const networkUrls = open ? localNetworkAddresses().map((address) => `http://${address}:${options.port}/`) : [];
  return {
    open,
    opening,
    closing,
    host: currentHost,
    port: options.port,
    localUrl: `http://127.0.0.1:${options.port}/`,
    networkUrls,
  };
}

function closeSseClientsForRebind(nextHost) {
  for (const tab of tabs.values()) {
    const rebindEvent = {
      type: "webui_network_rebinding",
      tabId: tab.id,
      tabTitle: tab.title,
      host: nextHost,
      port: options.port,
      opening: !isLocalHost(nextHost),
      closing: isLocalHost(nextHost),
    };
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
    const forceCloseTimer = setTimeout(() => {
      // Rebinding is intentionally disruptive. Long-poll/SSE/keep-alive clients can
      // otherwise keep server.close() pending and leave currentHost stuck on 0.0.0.0.
      server.closeAllConnections?.();
    }, NETWORK_REBIND_FORCE_CLOSE_MS);
    forceCloseTimer.unref?.();
    server.close((error) => {
      clearTimeout(forceCloseTimer);
      if (error) reject(error);
      else resolve();
    });
    server.closeIdleConnections?.();
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
  networkRebindTargetHost = nextHost;
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
    networkRebindTargetHost = null;
  }
}

async function closeNetworkAccess() {
  const nextHost = "127.0.0.1";
  if (isLocalHost(currentHost) || networkRebindInProgress) return networkStatus();

  networkRebindInProgress = true;
  networkRebindTargetHost = nextHost;
  closeSseClientsForRebind(nextHost);
  const previousHost = currentHost;
  try {
    await closeServerListener();
    await listenOn(nextHost);
    currentHost = nextHost;
    console.warn("Web UI network access closed; listening on localhost only.");
    return networkStatus();
  } catch (error) {
    console.error("Failed to close Web UI network access:", sanitizeError(error));
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
    networkRebindTargetHost = null;
  }
}

async function safeRpcData(tab, command, timeoutMs = STATUS_RPC_TIMEOUT_MS) {
  try {
    const response = await tab.rpc.send(command, timeoutMs);
    if (response?.success === false) return { ok: false, error: response.error || `${command.type} failed` };
    if (command?.type === "get_state") rememberTabState(tab, response?.data);
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
  const stateData = stateResult.ok ? stateResult.data : tab.lastState || null;
  return {
    ...tabMeta(tab),
    state: stateData,
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
  const statusTabs = listTabs();
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
    tabs: statusTabs,
    restorableTabs: mergeRestorableTabDescriptors(statusTabs),
  };

  if (detailed) {
    const detailedTabs = await Promise.all([...tabs.values()].map((item) => tabStatusDetails(item)));
    data.tabs = detailedTabs;
    data.restorableTabs = mergeRestorableTabDescriptors(detailedTabs);
    data.closedTabs = closedRestorableTabs.slice();
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

    if (url.pathname === "/api/tabs/close" && req.method === "POST") {
      const body = await readJsonBody(req);
      const closed = await closeTabs(body.ids || body.tabIds || []);
      sendJson(res, 200, { ok: true, data: { closedIds: closed.map((tab) => tab.id), tabs: listTabs(), activeTabId: firstTab()?.id || null } });
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
      await closeTab(id);
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
        restorableTabs: status.restorableTabs,
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

    if (url.pathname === "/api/themes" && req.method === "GET") {
      sendJson(res, 200, { ok: true, data: await readBundledThemes() });
      return;
    }

    if (url.pathname === "/api/codex-usage" && req.method === "GET") {
      try {
        const forceRefresh = ["1", "true", "yes"].includes(String(url.searchParams.get("refresh") || "").toLowerCase());
        sendJson(res, 200, { ok: true, data: await getOpenAICodexUsageStatus({ forceRefresh }) });
      } catch (error) {
        sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || "Failed to read OpenAI Codex usage" });
      }
      return;
    }

    if (url.pathname === "/api/network" && req.method === "GET") {
      sendJson(res, 200, { ok: true, data: networkStatus() });
      return;
    }

    if (url.pathname === "/api/network/open" && req.method === "POST") {
      if (!isLocalAddress(req.socket.remoteAddress)) throw makeHttpError(403, "Opening to the network is only allowed from localhost");
      const before = networkStatus();
      const shouldOpen = !before.open && !networkRebindInProgress;
      sendJson(res, 202, { ok: true, data: { ...before, opening: shouldOpen || before.opening, closing: before.closing } }, { connection: "close" });
      if (shouldOpen) {
        setTimeout(() => openToLocalNetwork().catch((error) => console.error("network open failed:", sanitizeError(error))), NETWORK_REBIND_DELAY_MS).unref();
      }
      return;
    }

    if (url.pathname === "/api/network/close" && req.method === "POST") {
      const before = networkStatus();
      const shouldClose = before.open && !networkRebindInProgress;
      sendJson(res, 202, { ok: true, data: { ...before, opening: before.opening, closing: shouldClose || before.closing } }, { connection: "close" });
      if (shouldClose) {
        setTimeout(() => closeNetworkAccess().catch((error) => console.error("network close failed:", sanitizeError(error))), NETWORK_REBIND_DELAY_MS).unref();
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

    if (url.pathname === "/api/path-suggestions" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getPathSuggestionData(tab, url.searchParams.get("query")) });
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

    if (url.pathname === "/api/attachments" && req.method === "POST") {
      const body = await readJsonBody(req, { limitBytes: requestBodyLimitForPath(url.pathname) });
      sendJson(res, 201, { ok: true, data: await saveUploadedAttachments(body) });
      return;
    }

    if (url.pathname === "/api/scoped-models" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getScopedModelData(tab) });
      return;
    }

    if (url.pathname === "/api/fork-messages" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getForkMessagesData(tab) });
      return;
    }

    if (url.pathname === "/api/sessions" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getSessionSelectorData(tab, url.searchParams.get("scope") || "current") });
      return;
    }

    if (url.pathname === "/api/session-tree" && req.method === "GET") {
      const tab = getRequestedTab(req, url);
      sendJson(res, 200, { ok: true, data: await getSessionTreeData(tab) });
      return;
    }

    if (url.pathname === "/api/fork" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const response = await runForkCommand(tab, body.entryId);
      sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
      return;
    }

    if (url.pathname === "/api/clone" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const response = await runCloneCommand(tab);
      sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
      return;
    }

    if (url.pathname === "/api/switch-session" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const response = await switchTabSession(tab, body.sessionPath || body.path);
      sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
      return;
    }

    if (url.pathname === "/api/tree-navigate" && req.method === "POST") {
      const body = await readJsonBody(req);
      const tab = getRequestedTab(req, url, body);
      const response = await navigateSessionTree(tab, body);
      sendJson(res, response.success === false ? 400 : 200, responseWithTab(response, tab));
      return;
    }

    if (url.pathname === "/api/optional-feature-install" && req.method === "POST") {
      if (!isLocalAddress(req.socket.remoteAddress)) throw makeHttpError(403, "Installing optional Web UI features is only allowed from localhost");
      const body = await readJsonBody(req);
      const data = await installOptionalFeaturePackage(String(body.featureId || ""));
      sendJson(res, 200, { ok: true, data });
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
      const body = await readJsonBody(req, { limitBytes: requestBodyLimitForPath(url.pathname) });
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
      const response = await safeRpcResponse(tab, getCommand);
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
      const resolved = resolvePendingExtensionUiRequest(tab, payload.id);
      if (resolved) {
        broadcastTabEvent(tab, {
          type: "webui_extension_ui_resolved",
          tabId: tab.id,
          tabTitle: tab.title,
          id: String(payload.id),
          pendingExtensionUiRequestCount: pendingExtensionUiRequests(tab).length,
          tabActivity: tabActivitySnapshot(tab),
        });
      }
      sendJson(res, 200, { ok: true, tab: tabMeta(tab) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req, { limitBytes: requestBodyLimitForPath(url.pathname) });
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
          forgetTabState(tab);
          rememberTabState(tab, response.data);
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
  if (restoreTabs.length) console.log(`Restored Web UI tabs: ${initialTabs.length}`);
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
