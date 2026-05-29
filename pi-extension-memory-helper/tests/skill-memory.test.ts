import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import memoryHelper, {
  appendSkillMemory,
  getSkillMemoryDir,
  listSkillMemory,
  normalizeSkillName,
  readSkillMemory,
  searchSkillMemory,
} from "../index";

const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
const originalTimezone = process.env.PI_MEMORY_HELPER_TIMEZONE;
let tempAgentDir: string;

beforeEach(async () => {
  tempAgentDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-skill-memory-test-"));
  process.env.PI_CODING_AGENT_DIR = tempAgentDir;
  process.env.PI_MEMORY_HELPER_TIMEZONE = "UTC";
});

afterEach(async () => {
  if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = originalAgentDir;

  if (originalTimezone === undefined) delete process.env.PI_MEMORY_HELPER_TIMEZONE;
  else process.env.PI_MEMORY_HELPER_TIMEZONE = originalTimezone;

  await fs.rm(tempAgentDir, { recursive: true, force: true });
});

describe("per-skill memory helpers", () => {
  test("normalizes skill names without allowing paths", () => {
    expect(normalizeSkillName("repo explorer")).toBe("repo-explorer");
    expect(normalizeSkillName("/skill:Repo_Explorer")).toBe("repo-explorer");
    expect(() => normalizeSkillName("../repo-explorer")).toThrow("not a path");
  });

  test("appendSkillMemory creates the skill memory file with a timestamped entry", async () => {
    const result = await appendSkillMemory(
      "repo-explorer",
      "compact budget was enough for structure-only audit.",
      { kind: "Observation" },
    );

    expect(result.skill).toBe("repo-explorer");
    expect(result.file).toBe(path.join(tempAgentDir, "memory", "skills", "repo-explorer.md"));

    const content = await fs.readFile(result.file, "utf8");
    expect(content).toContain("# Skill Memory: repo-explorer");
    expect(content).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
    expect(content).toContain("- Observation: compact budget was enough for structure-only audit.");
  });

  test("readSkillMemory returns only the requested skill memory", async () => {
    await appendSkillMemory("repo-explorer", "repo-only observation");
    await appendSkillMemory("deep-research", "deep-only observation");

    const repoMemory = await readSkillMemory("repo-explorer");
    expect(repoMemory.found).toBe(true);
    expect(repoMemory.content).toContain("repo-only observation");
    expect(repoMemory.content).not.toContain("deep-only observation");
  });

  test("searchSkillMemory finds entries across skill memory files", async () => {
    await appendSkillMemory("repo-explorer", "compact budget was enough for structure-only audit.");
    await appendSkillMemory("deep-research", "source diversity matters for online synthesis.");

    const hits = await searchSkillMemory("compact budget");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].skill).toBe("repo-explorer");
    expect(hits[0].line).toContain("compact budget");
  });

  test("listSkillMemory reports skill memory files without package repo writes", async () => {
    await appendSkillMemory("repo-explorer", "one");
    await appendSkillMemory("repo-explorer", "two");

    const entries = await listSkillMemory();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ skill: "repo-explorer", entries: 2 });
    expect(getSkillMemoryDir()).toBe(path.join(tempAgentDir, "memory", "skills"));
  });

  test("appendSkillMemory refuses likely secrets by default", async () => {
    await expect(appendSkillMemory("repo-explorer", "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456")).rejects.toThrow(
      "Refusing to store likely sensitive content",
    );
  });

  test("extension registers per-skill memory tools and commands", () => {
    const tools: string[] = [];
    const commands: string[] = [];

    memoryHelper({
      registerTool(definition: { name: string }) {
        tools.push(definition.name);
      },
      registerCommand(name: string) {
        commands.push(name);
      },
    } as never);

    expect(tools).toContain("skill_memory_add");
    expect(tools).toContain("skill_memory_read");
    expect(tools).toContain("skill_memory_search");
    expect(tools).toContain("skill_memory_list");
    expect(commands).toContain("skill-memory-add");
    expect(commands).toContain("skill-memory-read");
    expect(commands).toContain("skill-memory-search");
    expect(commands).toContain("skill-memory-list");
  });
});
