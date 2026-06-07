import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type RunLog = {
  id: string;
  startedAt: string;
  cwd: string;
  chunks: string[];
  saved: boolean;
};

export type RunLogEntry = {
  file: string;
  title: string;
  mtimeMs: number;
};

export function sanitizeLogId(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, "-");
}

export function createRunLog(cwd: string, now = new Date()): RunLog {
  const startedAt = now.toISOString();
  return { id: sanitizeLogId(startedAt), startedAt, cwd, chunks: [], saved: false };
}

export function appendRunLog(runLog: RunLog, chunk: string): void {
  runLog.chunks.push(chunk);
}

export function saveRunLog(runLog: RunLog, args: { logDir: string; title: string; status: string; summary?: string; now?: Date }): string | undefined {
  if (runLog.saved) return undefined;
  runLog.saved = true;
  try {
    mkdirSync(args.logDir, { recursive: true });
    const filePath = join(args.logDir, `${runLog.id}-${sanitizeLogId(args.status)}.log`);
    const content = [
      args.title,
      `started_at=${runLog.startedAt}`,
      `finished_at=${(args.now ?? new Date()).toISOString()}`,
      `status=${args.status}`,
      `cwd=${runLog.cwd}`,
      args.summary ? `summary=${args.summary.replace(/\r?\n/g, " | ")}` : undefined,
      "",
      "--- output ---",
      runLog.chunks.join(""),
    ].filter((line): line is string => line !== undefined).join("\n");
    writeFileSync(filePath, content, "utf8");
    return filePath;
  } catch {
    return undefined;
  }
}

export function listRunLogs(logDir: string): RunLogEntry[] {
  if (!existsSync(logDir)) return [];
  return readdirSync(logDir)
    .filter((file) => file.endsWith(".log"))
    .map((file) => {
      const filePath = join(logDir, file);
      const stat = statSync(filePath);
      return { file: filePath, title: file.replace(/\.log$/, ""), mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}
