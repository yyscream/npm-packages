import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  auditSkillBank,
  buildSkillTestPlan,
  DEFAULT_REPORT_PATH,
  renderAuditMarkdown,
  renderOverlapMarkdown,
  renderPrunePlanMarkdown,
  renderTestPlanMarkdown,
  truncateText,
  writeAuditReport,
} from "./src/audit";

function jsonToolResult(payload: unknown, text?: string) {
  return {
    content: [{ type: "text" as const, text: text ?? JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

const AuditParams = Type.Object({
  outputPath: Type.Optional(Type.String({ description: `Markdown report path. Defaults to ${DEFAULT_REPORT_PATH}.` })),
  includeProject: Type.Optional(Type.Boolean({ description: "Also scan project .pi/.agents skill roots from the current cwd (default true)." })),
  cwd: Type.Optional(Type.String({ description: "Override working directory used for project skill discovery." })),
});

const PlanParams = Type.Object({
  outputPath: Type.Optional(Type.String({ description: "Optional path to write the Markdown plan/report." })),
  includeProject: Type.Optional(Type.Boolean({ description: "Also scan project .pi/.agents skill roots from the current cwd (default true)." })),
  cwd: Type.Optional(Type.String({ description: "Override working directory used for project skill discovery." })),
});

const RunTestsParams = Type.Object({
  skill: Type.Optional(Type.String({ description: "Optional exact skill name to test." })),
  run: Type.Optional(Type.Boolean({ description: "Actually run tests. Defaults to false, returning a read-only plan." })),
  timeoutMs: Type.Optional(Type.Number({ minimum: 1000, maximum: 600000, description: "Per-command timeout in milliseconds (default 120000)." })),
  includeProject: Type.Optional(Type.Boolean({ description: "Also scan project .pi/.agents skill roots from the current cwd (default true)." })),
  cwd: Type.Optional(Type.String({ description: "Override working directory used for project skill discovery." })),
});

function expandTilde(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

async function writeOptional(outputPath: string | undefined, markdown: string): Promise<string | undefined> {
  if (!outputPath) return undefined;
  const resolved = path.resolve(expandTilde(outputPath));
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, markdown, "utf8");
  return resolved;
}

export default function skillBankManager(pi: ExtensionAPI) {
  pi.registerTool({
    name: "skillbank_audit",
    label: "Skill Bank Audit",
    description:
      "Read-only audit of the local Pi skill bank. Discovers enabled skills from the selected Pi settings file, top-level skills under the selected agent skill directory, package skills, quality gaps, overlaps, and writes a Markdown report.",
    promptSnippet: "Audit the local Pi skill bank and produce a read-only Markdown lifecycle report.",
    promptGuidelines: [
      "Use skillbank_audit when the user asks to inventory, audit, or assess local Pi skills; it is read-only except for writing the requested report file.",
      "Do not prune, merge, delete, or edit skills based on skillbank_audit output without explicit user approval.",
    ],
    parameters: AuditParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const audit = await auditSkillBank({ cwd: params.cwd ?? ctx.cwd, includeProject: params.includeProject ?? true });
      const outputPath = await writeAuditReport(audit, params.outputPath ?? DEFAULT_REPORT_PATH);
      const markdown = renderAuditMarkdown(audit);
      return jsonToolResult(
        { outputPath, summary: audit.summary, overlapGroups: audit.overlapGroups, unresolved: audit.unresolved, records: audit.records },
        `Wrote read-only skill-bank audit to ${outputPath}.\n\n${truncateText(markdown)}`,
      );
    },
  });

  pi.registerTool({
    name: "skillbank_find_overlap",
    label: "Skill Bank Overlap",
    description: "Read-only report of likely duplicate or overlapping Pi skill scopes based on skill names and frontmatter descriptions.",
    parameters: PlanParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const audit = await auditSkillBank({ cwd: params.cwd ?? ctx.cwd, includeProject: params.includeProject ?? true });
      const markdown = renderOverlapMarkdown(audit);
      const outputPath = await writeOptional(params.outputPath, markdown);
      return jsonToolResult(
        { outputPath, overlapGroups: audit.overlapGroups, summary: audit.summary },
        `${outputPath ? `Wrote overlap report to ${outputPath}.\n\n` : ""}${markdown}`,
      );
    },
  });

  pi.registerTool({
    name: "skillbank_prune_plan",
    label: "Skill Bank Prune Plan",
    description:
      "Create a read-only merge/update/prune plan for Pi skills. The tool never deletes or edits skill files; it only emits recommendations.",
    promptGuidelines: ["skillbank_prune_plan is plan-only; never treat it as permission to remove or edit skill files."],
    parameters: PlanParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const audit = await auditSkillBank({ cwd: params.cwd ?? ctx.cwd, includeProject: params.includeProject ?? true });
      const markdown = renderPrunePlanMarkdown(audit);
      const outputPath = await writeOptional(params.outputPath, markdown);
      return jsonToolResult({ outputPath, summary: audit.summary }, `${outputPath ? `Wrote prune plan to ${outputPath}.\n\n` : ""}${markdown}`);
    },
  });

  pi.registerTool({
    name: "skillbank_run_tests",
    label: "Skill Bank Test Plan",
    description:
      "Build a skill-bank test plan, or explicitly run detected npm/bun tests when run=true. Defaults to read-only plan mode.",
    parameters: RunTestsParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const audit = await auditSkillBank({ cwd: params.cwd ?? ctx.cwd, includeProject: params.includeProject ?? true });
      const plan = await buildSkillTestPlan(audit, params.skill);
      const planMarkdown = renderTestPlanMarkdown(plan);
      if (!params.run) {
        return jsonToolResult({ run: false, plan }, planMarkdown);
      }

      const timeout = params.timeoutMs ?? 120000;
      const results = [];
      for (const entry of plan) {
        const result = await pi.exec(entry.command, entry.args, { cwd: entry.cwd, timeout, signal });
        results.push({ ...entry, result });
      }

      const text = [
        planMarkdown.trimEnd(),
        "",
        "## Results",
        "",
        ...results.map((entry) => {
          const cmd = [entry.command, ...entry.args].join(" ");
          const output = [entry.result.stdout, entry.result.stderr].filter(Boolean).join("\n").trim();
          return `### ${cmd} in ${entry.cwd}\n\nExit: ${entry.result.code}${entry.result.killed ? " (killed)" : ""}\n\n\`\`\`text\n${truncateText(output || "<no output>", 8000)}\n\`\`\``;
        }),
      ].join("\n");

      return jsonToolResult({ run: true, results }, text);
    },
  });

  pi.registerCommand("skillbank-audit", {
    description: "Write a read-only local skill-bank audit report",
    handler: async (args, ctx) => {
      const outputPath = args.trim() || DEFAULT_REPORT_PATH;
      const audit = await auditSkillBank({ cwd: ctx.cwd });
      const written = await writeAuditReport(audit, outputPath);
      pi.sendMessage({
        customType: "skillbank-audit",
        content: `Wrote read-only skill-bank audit to ${written}.\n\nSummary: ${audit.summary.enabled}/${audit.summary.total} enabled, ${audit.summary.highRisk} high risk, ${audit.summary.overlapGroups} overlap groups.`,
        display: true,
        details: { outputPath: written, summary: audit.summary },
      });
    },
  });

  pi.registerCommand("skillbank-overlap", {
    description: "Show likely duplicate/overlapping local Pi skill scopes",
    handler: async (_args, ctx) => {
      const audit = await auditSkillBank({ cwd: ctx.cwd });
      pi.sendMessage({ customType: "skillbank-overlap", content: renderOverlapMarkdown(audit), display: true, details: audit.overlapGroups });
    },
  });

  pi.registerCommand("skillbank-prune-plan", {
    description: "Show a plan-only merge/update/prune recommendation report for local Pi skills",
    handler: async (_args, ctx) => {
      const audit = await auditSkillBank({ cwd: ctx.cwd });
      pi.sendMessage({ customType: "skillbank-prune-plan", content: renderPrunePlanMarkdown(audit), display: true });
    },
  });
}
