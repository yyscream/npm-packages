import { spawn, type ChildProcessByStdio } from "node:child_process";
import path from "node:path";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = __dirname;
const webuiBin = path.join(packageRoot, "bin", "pi-webui.mjs");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 31415;
const START_TIMEOUT_MS = 12_000;

type StartWebuiOptions = {
  host: string;
  port: number;
  open: boolean;
  noSession: boolean;
  name?: string;
  piArgs: string[];
};

type ExistingWebui = {
  webuiVersion?: string;
  webuiPid?: number;
  piPid?: number;
};

type WebuiChild = ChildProcessByStdio<null, Readable, Readable>;

function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaped) current += "\\";
  if (quote) throw new Error(`Unclosed ${quote} quote`);
  if (current) tokens.push(current);
  return tokens;
}

function takeValue(tokens: string[], index: number, flag: string): string {
  const value = tokens[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseStartWebuiArgs(args: string): StartWebuiOptions {
  const options: StartWebuiOptions = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    open: true,
    noSession: false,
    piArgs: [],
  };
  const tokens = tokenizeArgs(args || "");

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "--") {
      options.piArgs.push(...tokens.slice(i + 1));
      break;
    }
    if (token === "--no-open") {
      options.open = false;
      continue;
    }
    if (token === "--no-session") {
      options.noSession = true;
      continue;
    }
    if (token === "--host") {
      options.host = takeValue(tokens, i, token);
      i++;
      continue;
    }
    if (token === "--port") {
      const port = Number.parseInt(takeValue(tokens, i, token), 10);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) throw new Error("--port must be between 1 and 65535");
      options.port = port;
      i++;
      continue;
    }
    if (token === "--name") {
      options.name = takeValue(tokens, i, token);
      i++;
      continue;
    }
    if (/^\d+$/.test(token)) {
      const port = Number.parseInt(token, 10);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) throw new Error("port must be between 1 and 65535");
      options.port = port;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  return options;
}

function urlFor(options: StartWebuiOptions): string {
  const host = options.host.includes(":") && !options.host.startsWith("[") ? `[${options.host}]` : options.host;
  return `http://${host}:${options.port}/`;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 900): Promise<{ ok: boolean; status: number; body: any } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => undefined);
    return { ok: response.ok, status: response.status, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function probeExistingWebui(url: string): Promise<ExistingWebui | null> {
  const result = await fetchJsonWithTimeout(`${url.replace(/\/$/, "")}/api/health`);
  const body = result?.body;
  if (!result?.ok || body?.ok !== true || typeof body.webuiVersion !== "string") return null;
  return body;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWebuiToStop(url: string, timeoutMs = 7_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await probeExistingWebui(url))) return true;
    await sleep(180);
  }
  return !(await probeExistingWebui(url));
}

async function requestWebuiShutdown(url: string): Promise<boolean> {
  const result = await fetchJsonWithTimeout(`${url.replace(/\/$/, "")}/api/shutdown`, { method: "POST" }, 1_500);
  return result?.ok === true && result.body?.ok === true;
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

async function terminatePid(pid: number): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid || !isProcessRunning(pid)) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) return;
    await sleep(160);
  }

  try {
    if (isProcessRunning(pid)) process.kill(pid, "SIGKILL");
  } catch {
    // Ignore kill races; the restart path verifies the port separately.
  }
}

function runCommand(command: string, args: string[], timeoutMs = 1_500): Promise<{ exitCode?: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result: { exitCode?: number; stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ stdout, stderr });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 100_000) stdout = stdout.slice(-100_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (error) => finish({ stdout, stderr: stderr || (error instanceof Error ? error.message : String(error)) }));
    child.on("exit", (exitCode) => finish({ exitCode: exitCode ?? undefined, stdout, stderr }));
  });
}

function commandLooksLikeWebui(command: string, options: StartWebuiOptions): boolean {
  if (!command.includes("pi-webui.mjs")) return false;
  const escapedPort = String(options.port).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)--port\\s+${escapedPort}(?:\\s|$)`).test(command);
}

async function findWebuiPidsByCommand(options: StartWebuiOptions): Promise<number[]> {
  if (process.platform === "win32") return [];
  let result = await runCommand("ps", ["-Ao", "pid=,args="], 1_500);
  if (result.exitCode !== 0) result = await runCommand("ps", ["-eo", "pid=,args="], 1_500);
  if (result.exitCode !== 0) return [];

  const pids: number[] = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const command = match[2];
    if (pid !== process.pid && commandLooksLikeWebui(command, options)) pids.push(pid);
  }
  return [...new Set(pids)];
}

async function stopExistingWebui(url: string, options: StartWebuiOptions, existing: ExistingWebui): Promise<void> {
  if (await requestWebuiShutdown(url)) {
    if (await waitForWebuiToStop(url)) return;
  }

  if (Number.isInteger(existing.webuiPid)) {
    await terminatePid(existing.webuiPid!);
    if (await waitForWebuiToStop(url)) return;
  }

  for (const pid of await findWebuiPidsByCommand(options)) {
    await terminatePid(pid);
  }
  if (await waitForWebuiToStop(url)) return;

  throw new Error(`Existing Pi Web UI is still running at ${url}. Stop it manually and retry.`);
}

function openDefaultBrowser(url: string): void {
  let command: string;
  let args: string[];

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

function releaseStartedChild(child: WebuiChild): void {
  child.stdout.removeAllListeners("data");
  child.stderr.removeAllListeners("data");
  (child.stdout as Readable & { unref?: () => void }).unref?.();
  (child.stderr as Readable & { unref?: () => void }).unref?.();
  child.unref();
}

function terminateFailedChild(child: WebuiChild): void {
  if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 2000).unref?.();
  child.stdout.destroy();
  child.stderr.destroy();
}

function waitForWebuiUrl(child: WebuiChild): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    const finish = (error: Error | null, url?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (url) releaseStartedChild(child);
      if (error) {
        terminateFailedChild(child);
        reject(error);
      } else resolve(url!);
    };

    const inspect = (chunk: Buffer | string) => {
      output += String(chunk);
      if (output.length > 20_000) output = output.slice(-20_000);
      const match = output.match(/Pi Web UI:\s+(https?:\/\/\S+)/);
      if (match?.[1]) finish(null, match[1]);
    };

    const timeout = setTimeout(() => {
      finish(new Error(`Timed out waiting for Pi Web UI to start. Output:\n${output.trim() || "(no output)"}`));
    }, START_TIMEOUT_MS);

    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.on("error", (error) => finish(error));
    child.on("exit", (code, signal) => {
      if (!settled) finish(new Error(`Pi Web UI exited before startup (${code ?? signal ?? "unknown"}). Output:\n${output.trim() || "(no output)"}`));
    });
  });
}

async function startWebui(options: StartWebuiOptions, ctx: ExtensionCommandContext): Promise<string> {
  const args = [webuiBin, "--host", options.host, "--port", String(options.port), "--cwd", ctx.cwd];
  if (options.noSession) args.push("--no-session");
  if (options.name) args.push("--name", options.name);
  if (options.piArgs.length > 0) args.push("--", ...options.piArgs);

  const child = spawn(process.execPath, args, {
    cwd: ctx.cwd,
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  return waitForWebuiUrl(child);
}

function usage(): string {
  return [
    "Usage: /start-webui [port] [--port N] [--no-open] [--no-session] [--name NAME] [-- --model provider/model]",
    "Starts the Pi Web UI companion server for the current cwd, prints the localhost URL, and opens it in your default browser.",
  ].join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("start-webui", {
    description: "Start the local Pi browser Web UI and open it",
    handler: async (args, ctx) => {
      let options: StartWebuiOptions;
      try {
        options = parseStartWebuiArgs(args);
      } catch (error) {
        ctx.ui.notify(`${error instanceof Error ? error.message : String(error)}\n${usage()}`, "error");
        return;
      }

      const url = urlFor(options);
      ctx.ui.setStatus("pi-webui", "starting webui…");
      try {
        const existing = await probeExistingWebui(url);
        if (existing) {
          ctx.ui.setStatus("pi-webui", "restarting existing webui…");
          await stopExistingWebui(url, options, existing);
        }

        const startedUrl = await startWebui(options, ctx);
        if (options.open) openDefaultBrowser(startedUrl);
        ctx.ui.notify(`${existing ? "Pi Web UI restarted" : "Pi Web UI started"}:\n${startedUrl}`, "info");
        ctx.ui.setStatus("pi-webui", startedUrl);
        setTimeout(() => ctx.ui.setStatus("pi-webui", ""), 20_000).unref?.();
      } catch (error) {
        ctx.ui.setStatus("pi-webui", "");
        ctx.ui.notify(`Failed to start Pi Web UI:\n${error instanceof Error ? error.message : String(error)}\n${usage()}`, "error");
      }
    },
  });
}
