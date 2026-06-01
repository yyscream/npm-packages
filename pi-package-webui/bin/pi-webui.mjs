#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { access, readFile, stat } from "node:fs/promises";
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

async function handleGitWorkflowRequest(pathname, body = {}) {
  try {
    switch (pathname) {
      case "/api/git-workflow/message":
        return { ok: true, data: await readGitWorkflowMessages(options.cwd) };
      case "/api/git-workflow/add":
        await getGitRoot(options.cwd);
        return gitWorkflowCommandPayload(await runGitWorkflowCommand(["add", "."], { cwd: options.cwd }));
      case "/api/git-workflow/commit": {
        const variant = String(body.variant || "").trim();
        if (!["short", "long"].includes(variant)) throw new Error("variant must be 'short' or 'long'");
        const messages = await readGitWorkflowMessages(options.cwd);
        if (variant === "short") {
          const message = messages.short.trim();
          if (!message) throw new Error(`${messages.shortPath} is empty`);
          return gitWorkflowCommandPayload(await runGitWorkflowCommand(["commit", "-m", message], { cwd: messages.root, label: "git commit -m <dev/COMMIT/staged-commit-short.txt>" }));
        }
        if (!messages.long.trim()) throw new Error(`${messages.longPath} is empty`);
        return gitWorkflowCommandPayload(await runGitWorkflowCommand(["commit", "-F", messages.longPath], { cwd: messages.root, label: "git commit -F dev/COMMIT/staged-commit-long.txt" }));
      }
      case "/api/git-workflow/push": {
        const root = await getGitRoot(options.cwd);
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

const piArgs = ["--mode", "rpc"];
if (options.noSession) piArgs.push("--no-session");
if (options.name) piArgs.push("--name", options.name);
piArgs.push(...options.piArgs);

async function resolvePiCommand() {
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

const piCommand = await resolvePiCommand();
const rpc = new PiRpcProcess({ ...piCommand, cwd: options.cwd });
const sseClients = new Set();
rpc.onEvent((event) => {
  for (const client of sseClients) sendSse(client, event);
});
rpc.start();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/events" && req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-content-type-options": "nosniff",
      });
      res.write(": connected\n\n");
      sseClients.add(res);
      sendSse(res, {
        type: "webui_connected",
        version: packageJson.version,
        pid: rpc.child?.pid,
        cwd: options.cwd,
        startedAt: rpc.startedAt,
      });
      const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 15000);
      req.on("close", () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
      return;
    }

    if (url.pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        webuiVersion: packageJson.version,
        piPid: rpc.child?.pid,
        piRunning: !!rpc.child && rpc.child.exitCode === null,
        cwd: options.cwd,
      });
      return;
    }

    if (url.pathname === "/api/workspace" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        data: await getWorkspaceInfo(options.cwd, rpc.startedAt),
      });
      return;
    }

    if (url.pathname.startsWith("/api/git-workflow/")) {
      const body = req.method === "POST" ? await readJsonBody(req) : {};
      const response = await handleGitWorkflowRequest(url.pathname, body);
      if (response) {
        sendJson(res, 200, response);
        return;
      }
    }

    const getCommand = req.method === "GET" ? commandFromGet(url.pathname) : undefined;
    if (getCommand) {
      const response = await rpc.send(getCommand);
      sendJson(res, response.success === false ? 400 : 200, response);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/extension-ui-response") {
      const body = await readJsonBody(req);
      if (body.type !== "extension_ui_response") body.type = "extension_ui_response";
      if (!body.id) throw new Error("id is required");
      await rpc.writeRaw(body);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const command = commandFromPost(url.pathname, body);
      if (command) {
        const response = await rpc.send(command);
        sendJson(res, response.success === false ? 400 : 200, response);
        return;
      }
    }

    if (await serveStatic(req, res, url)) return;

    sendError(res, 404, "Not found");
  } catch (error) {
    sendError(res, 500, error);
  }
});

server.on("error", (error) => {
  console.error("Web UI server failed:", sanitizeError(error));
  rpc.stop();
  process.exit(1);
});

server.listen(options.port, options.host, () => {
  const urlHost = options.host.includes(":") && !options.host.startsWith("[") ? `[${options.host}]` : options.host;
  console.log(`Pi Web UI: http://${urlHost}:${options.port}/`);
  console.log(`Working directory: ${options.cwd}`);
  console.log(`Pi RPC: ${piCommand.displayCommand}`);
  if (!isLocalHost(options.host)) {
    console.warn("WARNING: Web UI has no authentication. Only expose it on trusted networks.");
  }
});

function shutdown(signal) {
  console.log(`\n${signal}: shutting down Pi Web UI...`);
  server.close(() => process.exit(0));
  rpc.stop();
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
