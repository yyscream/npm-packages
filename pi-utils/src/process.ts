import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

export const ANSI_ESCAPE_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  signal?: NodeJS.Signals | null;
  error?: string;
  timedOut?: boolean;
};

export type RunCommandOptions = {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  maxStdoutChars?: number;
  maxStderrChars?: number;
};

export type AbortableProcess = ChildProcessByStdio<null, Readable, Readable> & {
  abortProcessGroup?: () => void;
  abortReleaseStep?: () => void;
};

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function stripAnsi(input: string): string {
  return input.replace(ANSI_ESCAPE_RE, "");
}

export function resolveExecutableFromPath(binName: string, envPath = process.env.PATH ?? ""): string | undefined {
  const candidates = os.platform() === "win32" && !binName.toLowerCase().endsWith(".exe") ? [binName, `${binName}.exe`] : [binName];
  for (const dir of envPath.split(path.delimiter).filter(Boolean)) {
    for (const name of candidates) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

export async function commandExists(command: string, args: string[] = ["--version"], timeoutMs = 3000): Promise<boolean> {
  const result = await runCommand(command, args, { timeoutMs });
  return result.ok;
}

function trimBuffer(value: string, maxChars: number | undefined): string {
  if (!maxChars || value.length <= maxChars) return value;
  return value.slice(-maxChars);
}

export function runCommand(command: string, args: string[] = [], options: RunCommandOptions = {}): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = execFile(command, args, { cwd: options.cwd, env: options.env, timeout: options.timeoutMs }, (error, stdout, stderr) => {
      const exitCode = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({
        ok: !error,
        stdout: trimBuffer(String(stdout ?? ""), options.maxStdoutChars),
        stderr: trimBuffer(String(stderr ?? ""), options.maxStderrChars),
        exitCode,
        signal: error && "signal" in error ? (error.signal as NodeJS.Signals | null) : null,
        error: error instanceof Error ? error.message : undefined,
        timedOut: error && "killed" in error ? Boolean(error.killed) : false,
      });
    });
    child.on("error", (error) => {
      resolve({ ok: false, stdout: "", stderr: "", error: error.message, exitCode: 1 });
    });
  });
}

export function runShellCommand(cwd: string, command: string, options: RunCommandOptions = {}): Promise<CommandResult> {
  return runCommand("bash", ["-lc", command], { ...options, cwd });
}

export function runLiveShellCommand(args: {
  cwd: string;
  command: string;
  onChunk: (chunk: string) => void;
  onChild?: (child: AbortableProcess) => void;
  timeoutMs?: number;
  detached?: boolean;
}): Promise<CommandResult & { output: string; aborted: boolean }> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", args.command], {
      cwd: args.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      detached: args.detached ?? true,
    }) as AbortableProcess;
    let output = "";
    let aborted = false;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const abort = () => {
      aborted = true;
      try {
        if (child.pid && child.pid > 0) process.kill(-child.pid, "SIGINT");
      } catch {
        child.kill("SIGINT");
      }
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try {
            if (child.pid && child.pid > 0) process.kill(-child.pid, "SIGTERM");
          } catch {
            child.kill("SIGTERM");
          }
        }
      }, 1500).unref();
    };
    child.abortProcessGroup = abort;
    child.abortReleaseStep = abort;

    const finish = (result: CommandResult & { output: string; aborted: boolean }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    if (args.timeoutMs && args.timeoutMs > 0) {
      timer = setTimeout(() => {
        abort();
        finish({ ok: false, stdout: output, stderr: "", output, aborted: true, timedOut: true });
      }, args.timeoutMs);
    }

    args.onChild?.(child);
    child.stdout.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      args.onChunk(chunk);
    });
    child.stderr.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      args.onChunk(chunk);
    });
    child.on("error", (error) => finish({ ok: false, stdout: output, stderr: error.message, output, aborted, error: error.message }));
    child.on("close", (code, signal) => finish({ ok: code === 0 && !aborted, stdout: output, stderr: "", output, aborted, exitCode: code ?? undefined, signal }));
  });
}
