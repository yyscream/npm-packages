import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

const DEFAULT_TIMEZONE = "UTC";

function getMemoryTimezone(): string {
  return process.env.PI_MEMORY_HELPER_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

function getAgentDir(): string {
  const env = process.env.PI_CODING_AGENT_DIR;
  if (env && env.trim().length > 0) return env;
  return path.join(os.homedir(), ".pi", "agent");
}

function dateInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function appendMemoryNote(note: string): Promise<string> {
  const memoryDir = path.join(getAgentDir(), "memory");
  await fs.mkdir(memoryDir, { recursive: true });

  const timeZone = getMemoryTimezone();
  const day = dateInTz(timeZone);
  const file = path.join(memoryDir, `${day}.md`);
  const timestamp = timeInTz(timeZone);

  const chunk = `\n## ${timestamp} — Note\n- ${note.trim()}\n`;
  await fs.appendFile(file, chunk, "utf8");

  return file;
}

async function searchMemory(query: string): Promise<Array<{ file: string; score: number; line: string }>> {
  const memoryDir = path.join(getAgentDir(), "memory");
  const entries = await fs.readdir(memoryDir, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(memoryDir, e.name));

  const q = query.toLowerCase();
  const hits: Array<{ file: string; score: number; line: string }> = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8").catch(() => "");
    if (!content) continue;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.includes(q)) continue;
      const score = (lower.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      hits.push({ file, score, line: line.trim() });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 10);
}

export default function memoryHelper(pi: ExtensionAPI) {
  pi.registerCommand("remember", {
    description: "Append a note to today's memory file",
    handler: async (args, ctx) => {
      const note = (args || "").trim();
      if (!note) {
        ctx.ui.notify("Usage: /remember <note>", "warning");
        return;
      }

      const file = await appendMemoryNote(note);
      ctx.ui.notify(`Saved note to ${file}`, "success");
    },
  });

  pi.registerCommand("memory-search", {
    description: "Search memory markdown files",
    handler: async (args, ctx) => {
      const query = (args || "").trim();
      if (!query) {
        ctx.ui.notify("Usage: /memory-search <query>", "warning");
        return;
      }

      const results = await searchMemory(query);
      if (results.length === 0) {
        ctx.ui.notify("No memory matches found", "info");
        return;
      }

      const text = results
        .map((r, i) => `${i + 1}. ${path.basename(r.file)} — ${r.line}`)
        .join("\n");

      pi.sendMessage({
        customType: "memory-search-result",
        content: `Memory matches for '${query}':\n\n${text}`,
        display: true,
      });
    },
  });

  pi.registerTool({
    name: "remember_note",
    label: "Remember Note",
    description: "Persist a short note to today's memory file",
    parameters: Type.Object({
      note: Type.String({ description: "Note to persist" }),
    }),
    async execute(_toolCallId, params) {
      const file = await appendMemoryNote(params.note);
      return {
        content: [{ type: "text", text: `Saved note to ${file}` }],
        details: { file, timezone: getMemoryTimezone() },
      };
    },
  });

  pi.registerCommand("memory-helper-status", {
    description: "Show memory-helper configuration",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `memory-helper: timezone=${getMemoryTimezone()} · dir=${path.join(getAgentDir(), "memory")}`,
        "info",
      );
    },
  });
}

