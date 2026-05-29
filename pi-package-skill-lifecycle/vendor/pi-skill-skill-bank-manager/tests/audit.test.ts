import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { auditSkillBank, renderAuditMarkdown, writeAuditReport } from "../src/audit";

async function makeSkill(root: string, name: string, description: string, extras: string[] = []): Promise<string> {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n## Verification\n\nRun package tests when available.\n`,
    "utf8",
  );
  for (const extra of extras) await fs.mkdir(path.join(dir, extra), { recursive: true });
  return dir;
}

async function tempRoot(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "pi-skillbank-test-"));
}

describe("skill-bank audit", () => {
  test("covers enabled settings skills, package skills, and top-level symlinked skills", async () => {
    const root = await tempRoot();
    const agentDir = path.join(root, "agent");
    const agentSkills = path.join(agentDir, "skills");
    await fs.mkdir(agentSkills, { recursive: true });

    const alphaPackage = path.join(root, "pi-skill-alpha");
    await fs.mkdir(path.join(alphaPackage, "skills"), { recursive: true });
    await fs.writeFile(path.join(alphaPackage, "package.json"), JSON.stringify({ name: "alpha-package", pi: { skills: ["./skills"] } }), "utf8");
    await makeSkill(path.join(alphaPackage, "skills"), "alpha", "Use when auditing alpha-specific Pi skill routing and lifecycle hygiene.");
    await fs.symlink(path.join(alphaPackage, "skills", "alpha"), path.join(agentSkills, "alpha"), "dir");

    const betaPackage = path.join(root, "pi-skill-beta");
    await fs.mkdir(path.join(betaPackage, "skills"), { recursive: true });
    await fs.writeFile(
      path.join(betaPackage, "package.json"),
      JSON.stringify({ name: "beta-package", scripts: { test: "echo ok" }, pi: { skills: ["./skills"] } }),
      "utf8",
    );
    await makeSkill(path.join(betaPackage, "skills"), "beta", "Use when auditing beta package skills, tests, scripts, references, and validation metadata.", [
      "scripts",
      "references",
    ]);

    await makeSkill(agentSkills, "gamma", "Use when checking disabled gamma skill routing examples and lifecycle metadata.");

    await fs.writeFile(
      path.join(agentDir, "settings.json"),
      JSON.stringify(
        {
          skills: ["!**", `+${path.join(agentSkills, "alpha", "SKILL.md")}`],
          packages: [{ source: betaPackage, skills: ["beta"] }],
        },
        null,
        2,
      ),
      "utf8",
    );

    const audit = await auditSkillBank({ agentDir, cwd: root, includeProject: false });
    const byName = new Map(audit.records.map((record) => [record.name, record]));

    expect(byName.get("alpha")?.enabled).toBe(true);
    expect(byName.get("alpha")?.topLevelSkillBank).toBe(true);
    expect(byName.get("alpha")?.isTopLevelSymlink).toBe(true);
    expect(byName.get("beta")?.enabled).toBe(true);
    expect(byName.get("beta")?.hasTests).toBe(true);
    expect(byName.get("gamma")?.enabled).toBe(false);

    const markdown = renderAuditMarkdown(audit);
    expect(markdown).toContain("| skill | enabled status | package path | has tests | has scripts | has references | risk | recommendation |");
    expect(markdown).toContain("## Enabled skills resolved from settings.json");
    expect(markdown).toContain("## Top-level skill-bank entries");

    const reportPath = path.join(root, "audit.md");
    await writeAuditReport(audit, reportPath);
    expect(await fs.readFile(reportPath, "utf8")).toContain("Pi Skill Bank Audit");
  });

  test("detects likely overlapping skill descriptions", async () => {
    const root = await tempRoot();
    const agentDir = path.join(root, "agent");
    const agentSkills = path.join(agentDir, "skills");
    await fs.mkdir(agentSkills, { recursive: true });

    await makeSkill(
      agentSkills,
      "review-one",
      "Use when reviewing TypeScript code quality, linting, formatting, maintainability, complexity, and warning cleanup.",
    );
    await makeSkill(
      agentSkills,
      "review-two",
      "Use when auditing TypeScript code quality, linting, formatting, maintainability, complexity, and warning cleanup.",
    );
    await fs.writeFile(path.join(agentDir, "settings.json"), JSON.stringify({ skills: [] }, null, 2), "utf8");

    const audit = await auditSkillBank({ agentDir, cwd: root, includeProject: false });
    expect(audit.overlapGroups.some((group) => group.skills.includes("review-one") && group.skills.includes("review-two"))).toBe(true);
  });
});
