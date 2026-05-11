import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir, resolvePathFromAgentDir } from "@firstpick/pi-utils";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

type FileSnapshot = {
  absPath: string;
  previousExists: boolean;
  previousContent?: string;
};

type UndoOperation = {
  id: string;
  toolName: "write" | "edit";
  timestamp: number;
  files: FileSnapshot[];
};

type SessionUndoState = {
  stack: UndoOperation[];
};

const EXTENSION_ID = "reverse-last";
const MAX_STACK = 100;

function resolveToolPath(cwd: string, inputPath: string): string {
  return path.isAbsolute(inputPath) ? path.normalize(inputPath) : path.resolve(cwd, inputPath);
}

function getStateDir(): string {
  const configured = process.env.PI_REVERSE_LAST_STATE_DIR?.trim();
  if (configured) return resolvePathFromAgentDir(configured);

  return path.join(getAgentDir(), "state", "reverse-last");
}

function getStatePath(sessionId: string): string {
  return path.join(getStateDir(), `${sessionId}.json`);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readTextFile(absPath: string): string | undefined {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch {
    return undefined;
  }
}

function loadState(sessionId: string): SessionUndoState {
  const statePath = getStatePath(sessionId);
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw) as SessionUndoState;
    if (!parsed || !Array.isArray(parsed.stack)) return { stack: [] };
    return { stack: parsed.stack.filter((x) => x && Array.isArray(x.files)).slice(-MAX_STACK) };
  } catch {
    return { stack: [] };
  }
}

function saveState(sessionId: string, state: SessionUndoState): void {
  const dir = getStateDir();
  ensureDir(dir);
  const statePath = getStatePath(sessionId);
  fs.writeFileSync(statePath, JSON.stringify({ stack: state.stack.slice(-MAX_STACK) }), "utf8");
}

export default function reverseLastExtension(pi: ExtensionAPI) {
  const pending = new Map<string, UndoOperation>();

  let activeSessionId = "";
  let state: SessionUndoState = { stack: [] };

  const reloadForSession = (sessionId: string) => {
    activeSessionId = sessionId;
    pending.clear();
    state = loadState(sessionId);
  };

  pi.on("session_start", async (_event, ctx) => {
    reloadForSession(ctx.sessionManager.getSessionId());
  });

  pi.on("session_shutdown", async () => {
    if (!activeSessionId) return;
    saveState(activeSessionId, state);
  });

  pi.on("tool_call", async (event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    if (!activeSessionId) reloadForSession(sessionId);
    if (sessionId !== activeSessionId) reloadForSession(sessionId);

    if (isToolCallEventType("write", event)) {
      const absPath = resolveToolPath(ctx.cwd, event.input.path);
      const before = readTextFile(absPath);
      pending.set(event.toolCallId, {
        id: event.toolCallId,
        toolName: "write",
        timestamp: Date.now(),
        files: [
          {
            absPath,
            previousExists: before !== undefined,
            previousContent: before,
          },
        ],
      });
      return;
    }

    if (isToolCallEventType("edit", event)) {
      const absPath = resolveToolPath(ctx.cwd, event.input.path);
      const before = readTextFile(absPath);
      pending.set(event.toolCallId, {
        id: event.toolCallId,
        toolName: "edit",
        timestamp: Date.now(),
        files: [
          {
            absPath,
            previousExists: before !== undefined,
            previousContent: before,
          },
        ],
      });
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    const op = pending.get(event.toolCallId);
    if (!op) return;

    pending.delete(event.toolCallId);
    if (event.isError) return;

    const changedFiles = op.files.filter((f) => {
      const after = readTextFile(f.absPath);
      if (!f.previousExists) return after !== undefined;
      return after !== f.previousContent;
    });

    if (changedFiles.length === 0) return;

    state.stack.push({
      ...op,
      files: changedFiles,
      timestamp: Date.now(),
    });
    state.stack = state.stack.slice(-MAX_STACK);

    const sessionId = ctx.sessionManager.getSessionId();
    if (sessionId !== activeSessionId) {
      reloadForSession(sessionId);
    }
    if (activeSessionId) saveState(activeSessionId, state);

    pi.appendEntry(EXTENSION_ID, {
      type: "capture",
      at: Date.now(),
      toolName: op.toolName,
      count: changedFiles.length,
      files: changedFiles.map((f) => path.relative(ctx.cwd, f.absPath) || f.absPath),
    });
  });

  pi.registerCommand("reverse-last", {
    description: "Undo last Pi file change in this active session. Usage: /reverse-last [count]",
    handler: async (args, ctx) => {
      await ctx.waitForIdle();

      const sessionId = ctx.sessionManager.getSessionId();
      if (!activeSessionId || sessionId !== activeSessionId) {
        reloadForSession(sessionId);
      }

      const trimmed = args.trim();
      const count = trimmed ? Number.parseInt(trimmed, 10) : 1;
      if (!Number.isFinite(count) || count <= 0) {
        ctx.ui.notify("Usage: /reverse-last [count]  (count must be a positive integer)", "warning");
        return;
      }

      if (state.stack.length === 0) {
        ctx.ui.notify("Nothing to undo in this session yet.", "info");
        return;
      }

      const steps = Math.min(count, state.stack.length);
      const restored: string[] = [];

      for (let i = 0; i < steps; i++) {
        const op = state.stack.pop();
        if (!op) break;

        for (const file of op.files) {
          if (file.previousExists) {
            ensureDir(path.dirname(file.absPath));
            fs.writeFileSync(file.absPath, file.previousContent ?? "", "utf8");
            restored.push(path.relative(ctx.cwd, file.absPath) || file.absPath);
          } else {
            if (fs.existsSync(file.absPath)) {
              fs.unlinkSync(file.absPath);
            }
            restored.push(`${path.relative(ctx.cwd, file.absPath) || file.absPath} (deleted)`);
          }
        }

        pi.appendEntry(EXTENSION_ID, {
          type: "undo",
          at: Date.now(),
          toolName: op.toolName,
          count: op.files.length,
          files: op.files.map((f) => path.relative(ctx.cwd, f.absPath) || f.absPath),
        });
      }

      saveState(activeSessionId, state);
      ctx.ui.notify(
        `Reverted ${steps} change${steps === 1 ? "" : "s"}.\n${restored.slice(0, 12).join("\n")}${restored.length > 12 ? `\n...and ${restored.length - 12} more` : ""}`,
        "info",
      );
    },
  });
}
