import fs from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@firstpick/pi-utils";
import { Type } from "typebox";

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_READ_MAX_CHARS = 20_000;
const MAX_READ_CHARS = 100_000;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

type SensitivePattern = {
  name: string;
  pattern: RegExp;
};

export type SkillMemoryAppendOptions = {
  kind?: string;
  allowSensitive?: boolean;
};

export type SkillMemoryAppendResult = {
  skill: string;
  file: string;
  timestamp: string;
  entry: string;
};

export type SkillMemoryReadResult = {
  skill: string;
  file: string;
  found: boolean;
  content: string;
  truncated: boolean;
};

export type SkillMemorySearchHit = {
  skill: string;
  file: string;
  lineNumber: number;
  line: string;
  score: number;
};

export type SkillMemoryListEntry = {
  skill: string;
  file: string;
  bytes: number;
  entries: number;
  lastTimestamp?: string;
};

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  {
    name: "credential assignment",
    pattern: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password|passwd|credential)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/i,
  },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/i },
  { name: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

function getMemoryTimezone(): string {
  return process.env.PI_MEMORY_HELPER_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
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

function timestampInTz(timeZone: string): string {
  return `${dateInTz(timeZone)} ${timeInTz(timeZone)} ${timeZone}`;
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const matches = haystack.match(new RegExp(escapeRegExp(needle), "g"));
  return matches?.length ?? 0;
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function findSensitivePattern(text: string): SensitivePattern | undefined {
  return SENSITIVE_PATTERNS.find((entry) => entry.pattern.test(text));
}

function truncateTail(content: string, maxChars: number): { content: string; truncated: boolean } {
  if (content.length <= maxChars) return { content, truncated: false };
  return {
    content: `[Truncated to last ${maxChars} characters]\n${content.slice(-maxChars)}`,
    truncated: true,
  };
}

export function normalizeSkillName(rawSkill: string): string {
  const trimmed = rawSkill
    .trim()
    .replace(/^\/?skill:/i, "")
    .replace(/^@/, "")
    .trim();

  if (!trimmed) {
    throw new Error("skill must be a non-empty Pi skill name");
  }

  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new Error("skill must be a skill name, not a path");
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/^-+|-+$/g, "");

  if (!normalized || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(normalized)) {
    throw new Error(`invalid skill name: ${rawSkill}`);
  }

  return normalized;
}

export function getSkillMemoryDir(): string {
  return path.join(getAgentDir(), "memory", "skills");
}

function getSkillMemoryFile(skill: string): string {
  return path.join(getSkillMemoryDir(), `${skill}.md`);
}

function skillFromFileName(fileName: string): string | undefined {
  if (!fileName.endsWith(".md")) return undefined;
  const skill = fileName.slice(0, -3);
  try {
    return normalizeSkillName(skill);
  } catch {
    return undefined;
  }
}

function sanitizeKind(kind: string | undefined): string | undefined {
  const cleaned = kind
    ?.trim()
    .replace(/[:\r\n]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40)
    .trim();
  return cleaned || undefined;
}

function formatMemoryBullet(note: string, kind?: string): string {
  const lines = note.replace(/\r\n/g, "\n").trim().split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  const cleanKind = sanitizeKind(kind);
  const hasInlineLabel = /^[A-Za-z][A-Za-z -]{1,40}:/.test(firstLine);
  const prefix = cleanKind ? `${cleanKind}: ` : hasInlineLabel ? "" : "Note: ";
  const output = [`- ${prefix}${firstLine}`];

  for (const line of lines.slice(1)) {
    output.push(`  ${line.trimEnd()}`);
  }

  return output.join("\n");
}

function skillMemoryHeader(skill: string): string {
  return [
    `# Skill Memory: ${skill}`,
    "",
    "Personal, local-only memory for this Pi skill.",
    "Do not store secrets, credentials, API keys, or portable package instructions here.",
    "",
  ].join("\n");
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

async function searchMemory(query: string, limit = 10): Promise<Array<{ file: string; score: number; line: string }>> {
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
      const score = countOccurrences(lower, q);
      hits.push({ file, score, line: line.trim() });
    }
  }

  const safeLimit = clampInt(limit, 10, 1, 50);
  return hits.sort((a, b) => b.score - a.score).slice(0, safeLimit);
}

export async function appendSkillMemory(
  rawSkill: string,
  note: string,
  options: SkillMemoryAppendOptions = {},
): Promise<SkillMemoryAppendResult> {
  const skill = normalizeSkillName(rawSkill);
  const cleanNote = note.trim();
  if (!cleanNote) throw new Error("note must be a non-empty string");

  const sensitive = findSensitivePattern(cleanNote);
  if (sensitive && !options.allowSensitive) {
    throw new Error(
      `Refusing to store likely sensitive content (${sensitive.name}). Remove secrets or set allowSensitive=true only after explicit user approval.`,
    );
  }

  const dir = getSkillMemoryDir();
  await fs.mkdir(dir, { recursive: true });

  const file = getSkillMemoryFile(skill);
  const timestamp = timestampInTz(getMemoryTimezone());
  const entry = `\n## ${timestamp}\n${formatMemoryBullet(cleanNote, options.kind)}\n`;

  if (!(await pathExists(file))) {
    await fs.appendFile(file, skillMemoryHeader(skill), "utf8");
  }
  await fs.appendFile(file, entry, "utf8");

  return { skill, file, timestamp, entry };
}

export async function readSkillMemory(rawSkill: string, maxChars?: number): Promise<SkillMemoryReadResult> {
  const skill = normalizeSkillName(rawSkill);
  const file = getSkillMemoryFile(skill);
  const safeMaxChars = clampInt(maxChars, DEFAULT_READ_MAX_CHARS, 1_000, MAX_READ_CHARS);

  const content = await fs.readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });

  if (!content) {
    return { skill, file, found: false, content: "", truncated: false };
  }

  const truncated = truncateTail(content, safeMaxChars);
  return { skill, file, found: true, content: truncated.content, truncated: truncated.truncated };
}

function scoreSearchLine(line: string, query: string, terms: string[]): number {
  const lower = line.toLowerCase();
  let score = 0;

  if (lower.includes(query)) {
    score += 10 + countOccurrences(lower, query);
  }

  if (terms.length > 0 && terms.every((term) => lower.includes(term))) {
    score += terms.reduce((sum, term) => sum + countOccurrences(lower, term), 0);
  }

  return score;
}

export async function searchSkillMemory(query: string, limit?: number): Promise<SkillMemorySearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) throw new Error("query must be a non-empty string");

  const terms = q.split(/\s+/).filter(Boolean);
  const safeLimit = clampInt(limit, DEFAULT_SEARCH_LIMIT, 1, MAX_SEARCH_LIMIT);
  const dir = getSkillMemoryDir();
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const hits: SkillMemorySearchHit[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const skill = skillFromFileName(entry.name);
    if (!skill) continue;

    const file = path.join(dir, entry.name);
    const content = await fs.readFile(file, "utf8").catch(() => "");
    if (!content) continue;

    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const score = scoreSearchLine(line, q, terms);
      if (score <= 0) return;
      hits.push({ skill, file, lineNumber: index + 1, line: line.trim(), score });
    });
  }

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.skill !== b.skill) return a.skill.localeCompare(b.skill);
      return a.lineNumber - b.lineNumber;
    })
    .slice(0, safeLimit);
}

export async function listSkillMemory(limit?: number): Promise<SkillMemoryListEntry[]> {
  const safeLimit = clampInt(limit, 100, 1, 500);
  const dir = getSkillMemoryDir();
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const result: SkillMemoryListEntry[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const skill = skillFromFileName(entry.name);
    if (!skill) continue;

    const file = path.join(dir, entry.name);
    const [stat, content] = await Promise.all([
      fs.stat(file),
      fs.readFile(file, "utf8").catch(() => ""),
    ]);
    const timestamps = [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]?.trim()).filter(Boolean) as string[];

    result.push({
      skill,
      file,
      bytes: stat.size,
      entries: timestamps.length,
      lastTimestamp: timestamps.at(-1),
    });
  }

  return result.sort((a, b) => a.skill.localeCompare(b.skill)).slice(0, safeLimit);
}

function parseSkillMemoryAddArgs(args: string): { skill: string; note: string } | null {
  const trimmed = args.trim();
  if (!trimmed) return null;

  if (trimmed.includes("::")) {
    const [rawSkill, ...rest] = trimmed.split("::");
    const skill = rawSkill.trim();
    const note = rest.join("::").trim();
    if (skill && note) return { skill, note };
    return null;
  }

  const match = trimmed.match(/^(\S+)\s+([\s\S]+)$/);
  if (!match) return null;
  return { skill: match[1], note: match[2].trim() };
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

  pi.registerCommand("skill-memory-add", {
    description: "Append local per-skill memory. Usage: /skill-memory-add <skill> :: <non-secret note>",
    handler: async (args, ctx) => {
      const parsed = parseSkillMemoryAddArgs(args);
      if (!parsed) {
        ctx.ui.notify("Usage: /skill-memory-add <skill> :: <non-secret note>", "warning");
        return;
      }

      try {
        const result = await appendSkillMemory(parsed.skill, parsed.note);
        ctx.ui.notify(`Saved skill memory for ${result.skill} to ${result.file}`, "success");
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("skill-memory-read", {
    description: "Read local per-skill memory. Usage: /skill-memory-read <skill>",
    handler: async (args, ctx) => {
      const skill = args.trim();
      if (!skill) {
        ctx.ui.notify("Usage: /skill-memory-read <skill>", "warning");
        return;
      }

      try {
        const result = await readSkillMemory(skill);
        const text = result.found ? result.content : `No skill memory found for ${result.skill}.`;
        pi.sendMessage({ customType: "skill-memory-read-result", content: text, display: true, details: result });
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("skill-memory-search", {
    description: "Search local per-skill memory. Usage: /skill-memory-search <query>",
    handler: async (args, ctx) => {
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Usage: /skill-memory-search <query>", "warning");
        return;
      }

      try {
        const results = await searchSkillMemory(query);
        if (results.length === 0) {
          ctx.ui.notify("No skill memory matches found", "info");
          return;
        }
        const text = results
          .map((r, i) => `${i + 1}. ${r.skill}:${r.lineNumber} — ${r.line}`)
          .join("\n");
        pi.sendMessage({
          customType: "skill-memory-search-result",
          content: `Skill memory matches for '${query}':\n\n${text}`,
          display: true,
          details: { query, count: results.length, results },
        });
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });

  pi.registerCommand("skill-memory-list", {
    description: "List local per-skill memory files",
    handler: async (_args, ctx) => {
      const entries = await listSkillMemory();
      if (entries.length === 0) {
        ctx.ui.notify("No skill memory files found", "info");
        return;
      }
      const text = entries
        .map((entry, index) => `${index + 1}. ${entry.skill} — ${entry.entries} entries, ${entry.bytes} bytes`)
        .join("\n");
      pi.sendMessage({
        customType: "skill-memory-list-result",
        content: `Skill memory files:\n\n${text}`,
        display: true,
        details: { count: entries.length, entries },
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

  pi.registerTool({
    name: "memory_search",
    label: "Memory Search",
    description: "Search persisted memory markdown files for relevant notes",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, description: "Max results to return (1-50)" })),
    }),
    async execute(_toolCallId, params) {
      const query = params.query.trim();
      if (!query) {
        throw new Error("query must be a non-empty string");
      }

      const limit = typeof params.limit === "number" ? params.limit : 10;
      const results = await searchMemory(query, limit);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No memory matches found for '${query}'.` }],
          details: { query, count: 0, results: [] },
        };
      }

      const lines = results.map((r, i) => `${i + 1}. ${path.basename(r.file)} — ${r.line}`);
      return {
        content: [{ type: "text", text: `Memory matches for '${query}':\n\n${lines.join("\n")}` }],
        details: { query, count: results.length, results },
      };
    },
  });

  pi.registerTool({
    name: "skill_memory_add",
    label: "Skill Memory Add",
    description:
      "Append a timestamped, local-only, non-secret memory note for a Pi skill under ~/.pi/agent/memory/skills/<skill>.md. Refuses likely secrets by default.",
    promptSnippet: "Append non-secret usage observations to local per-skill memory",
    promptGuidelines: [
      "Use skill_memory_add only for local, personal, non-secret skill observations, failure modes, and reusable invocation hints.",
      "Do not use skill_memory_add to store API keys, credentials, tokens, private user data, or portable package documentation.",
    ],
    parameters: Type.Object({
      skill: Type.String({ description: "Pi skill name, e.g. repo-explorer" }),
      note: Type.String({ description: "Non-secret memory text to append" }),
      kind: Type.Optional(Type.String({ description: "Optional short label, e.g. Observation, Failure mode, Next invocation hint" })),
      allowSensitive: Type.Optional(Type.Boolean({ description: "Leave false unless the user explicitly asked to store sensitive text" })),
    }),
    async execute(_toolCallId, params) {
      const result = await appendSkillMemory(params.skill, params.note, {
        kind: params.kind,
        allowSensitive: params.allowSensitive === true,
      });
      return {
        content: [{ type: "text", text: `Saved skill memory for '${result.skill}' to ${result.file}` }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "skill_memory_read",
    label: "Skill Memory Read",
    description: "Read local per-skill memory for exactly one requested Pi skill from ~/.pi/agent/memory/skills/<skill>.md.",
    promptSnippet: "Read local per-skill memory for one skill",
    promptGuidelines: [
      "Use skill_memory_read when prior local observations for a specific skill may improve the current task.",
      "skill_memory_read returns only the requested skill's local memory file; use skill_memory_search for cross-skill lookup.",
    ],
    parameters: Type.Object({
      skill: Type.String({ description: "Pi skill name, e.g. repo-explorer" }),
      maxChars: Type.Optional(Type.Number({ minimum: 1000, maximum: 100000, description: "Maximum characters to return" })),
    }),
    async execute(_toolCallId, params) {
      const result = await readSkillMemory(params.skill, params.maxChars);
      if (!result.found) {
        return {
          content: [{ type: "text", text: `No skill memory found for '${result.skill}'.` }],
          details: result,
        };
      }
      const suffix = result.truncated ? "\n\n[Result truncated; increase maxChars for more.]" : "";
      return {
        content: [{ type: "text", text: `${result.content}${suffix}` }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "skill_memory_search",
    label: "Skill Memory Search",
    description: "Search across local per-skill memory files under ~/.pi/agent/memory/skills without reading package repositories.",
    promptSnippet: "Search local per-skill memory across skills",
    promptGuidelines: [
      "Use skill_memory_search to find prior non-secret observations across all local skill memory files.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, description: "Max results to return (1-50)" })),
    }),
    async execute(_toolCallId, params) {
      const query = params.query.trim();
      if (!query) throw new Error("query must be a non-empty string");
      const results = await searchSkillMemory(query, params.limit);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No skill memory matches found for '${query}'.` }],
          details: { query, count: 0, results: [] },
        };
      }

      const lines = results.map((r, i) => `${i + 1}. ${r.skill}:${r.lineNumber} — ${r.line}`);
      return {
        content: [{ type: "text", text: `Skill memory matches for '${query}':\n\n${lines.join("\n")}` }],
        details: { query, count: results.length, results },
      };
    },
  });

  pi.registerTool({
    name: "skill_memory_list",
    label: "Skill Memory List",
    description: "List local per-skill memory files under ~/.pi/agent/memory/skills.",
    promptSnippet: "List local per-skill memory files",
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500, description: "Maximum skill memory files to return" })),
    }),
    async execute(_toolCallId, params) {
      const entries = await listSkillMemory(params.limit);
      if (entries.length === 0) {
        return {
          content: [{ type: "text", text: "No skill memory files found." }],
          details: { count: 0, entries: [] },
        };
      }

      const lines = entries.map((entry, index) => {
        const last = entry.lastTimestamp ? `, last ${entry.lastTimestamp}` : "";
        return `${index + 1}. ${entry.skill} — ${entry.entries} entries, ${entry.bytes} bytes${last}`;
      });
      return {
        content: [{ type: "text", text: `Skill memory files:\n\n${lines.join("\n")}` }],
        details: { count: entries.length, entries },
      };
    },
  });

  pi.registerCommand("memory-helper-status", {
    description: "Show memory-helper configuration",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `memory-helper: timezone=${getMemoryTimezone()} · dir=${path.join(getAgentDir(), "memory")} · skillDir=${getSkillMemoryDir()}`,
        "info",
      );
    },
  });
}
