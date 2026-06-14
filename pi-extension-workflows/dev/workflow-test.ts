import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findWorkflowSource, loadWorkflowRegistry } from "../src/loader.ts";
import { runWorkflow } from "../src/runner.ts";
import { createWorkflowStateStore, type WorkflowStateStore } from "../src/state.ts";
import type { TaskContext, TaskResult, TaskRunner, WorkflowRun, WorkflowSource, WorkflowTask } from "../src/types.ts";
import type { WorkflowUIContext } from "../src/ui.ts";

export const WORKFLOW_SELF_TEST_KEY = "workflow-runtime-self-test";

type WorkflowSelfTestMode = "deterministic" | "real";

export type WorkflowSelfTestRunOptions = {
  extensionDir: string;
  parentCwd: string;
  ctx: WorkflowUIContext;
  state?: WorkflowStateStore;
  realTaskRunner?: TaskRunner;
  signal?: AbortSignal;
  mode?: WorkflowSelfTestMode;
  keepTarget?: boolean;
};

export type WorkflowSelfTestCheck = {
  name: string;
  ok: boolean;
  details: string;
};

export type WorkflowSelfTestResult = {
  verdict: "PASS" | "FAIL";
  mode: WorkflowSelfTestMode;
  targetDir: string;
  targetRetained: boolean;
  workflowKey: string;
  run: WorkflowRun;
  checks: WorkflowSelfTestCheck[];
};

type SelfTestTarget = {
  dir: string;
  workflowPath: string;
};

function selfTestWorkflowJson(): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      key: WORKFLOW_SELF_TEST_KEY,
      name: "Workflow Runtime Self-Test",
      description: "Exercises the Pi workflow runner against an isolated multi-file target project.",
      defaults: {
        maxConcurrency: 2,
        maxTasks: 8,
      },
      phases: [
        {
          id: "inspect",
          name: "Inspect isolated target",
          mode: "parallel",
          maxConcurrency: 2,
          tasks: [
            {
              id: "inventory",
              name: "Inventory architecture",
              agent: "scout",
              tools: ["read", "grep", "find", "ls"],
              prompt:
                "Inspect the isolated target project. Identify src/auth.ts, src/report.ts, tests/auth.test.ts, and docs/risk-notes.md. Return the exact marker SELF_TEST_INVENTORY_OK when all are found.",
            },
            {
              id: "auth-evidence",
              name: "Validate auth behavior evidence",
              agent: "reviewer",
              tools: ["read", "grep", "find", "ls"],
              prompt:
                "Inspect src/auth.ts and tests/auth.test.ts. Verify locked users are rejected, password hashing is used, and tests cover success/failure paths. Return AUTH_SERVICE_FOUND and AUTH_TESTS_FOUND when verified.",
            },
            {
              id: "risk-evidence",
              name: "Validate risk evidence",
              agent: "reviewer",
              tools: ["read", "grep", "find", "ls"],
              prompt:
                "Inspect src/report.ts and docs/risk-notes.md. Verify anomaly reporting and documented retry/timeout risks. Return REPORT_PIPELINE_FOUND and RISK_REGISTER_FOUND when verified.",
            },
          ],
        },
        {
          id: "synthesis",
          name: "Synthesize verified result",
          mode: "sequential",
          tasks: [
            {
              id: "final-verification",
              name: "Final verification summary",
              agent: "planner",
              tools: ["read", "grep", "find", "ls"],
              prompt:
                "Use prior task outputs to produce a final verification summary. Include exactly these markers if supported by evidence: SELF_TEST_SYNTHESIS_OK, SELF_TEST_INVENTORY_OK, AUTH_SERVICE_FOUND, AUTH_TESTS_FOUND, REPORT_PIPELINE_FOUND, RISK_REGISTER_FOUND.",
            },
          ],
        },
      ],
    },
    null,
    2,
  );
}

async function writeTargetFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolute = join(root, relativePath);
  await mkdir(join(absolute, ".."), { recursive: true });
  await writeFile(absolute, content.trimStart(), "utf8");
}

export async function createWorkflowSelfTestTarget(): Promise<SelfTestTarget> {
  const dir = await mkdtemp(join(tmpdir(), "pi-workflow-test-"));

  await writeTargetFile(
    dir,
    "package.json",
    `{
  "name": "workflow-self-test-target",
  "private": true,
  "type": "module"
}
`,
  );

  await writeTargetFile(
    dir,
    "README.md",
    `# Workflow Self-Test Target

This isolated project is intentionally small but non-trivial. It contains an authentication service, a report pipeline, tests, and a risk register so workflow fanout has multiple evidence streams to inspect.
`,
  );

  await writeTargetFile(
    dir,
    "src/auth.ts",
    `import { createHash } from "node:crypto";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  locked: boolean;
  roles: string[];
};

export class AuthService {
  constructor(private readonly users: UserRecord[]) {}

  login(email: string, password: string): { userId: string; roles: string[] } {
    const user = this.users.find((candidate) => candidate.email === email);
    if (!user) throw new Error("invalid credentials");
    if (user.locked) throw new Error("user locked");
    if (user.passwordHash !== hashPassword(password)) throw new Error("invalid credentials");
    return { userId: user.id, roles: user.roles };
  }
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
`,
  );

  await writeTargetFile(
    dir,
    "src/report.ts",
    `export type QualityEvent = {
  batchId: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

export function generateQualityReport(events: QualityEvent[]): string {
  const critical = events.filter((event) => event.severity === "critical");
  const warnings = events.filter((event) => event.severity === "warning");
  return [
    "# Quality Report",
    \`Critical: \${critical.length}\`,
    \`Warnings: \${warnings.length}\`,
    ...critical.map((event) => \`- CRITICAL \${event.batchId}: \${event.message}\`),
  ].join("\\n");
}
`,
  );

  await writeTargetFile(
    dir,
    "tests/auth.test.ts",
    `import { AuthService, hashPassword } from "../src/auth";

const users = [
  { id: "u1", email: "qa@example.test", passwordHash: hashPassword("correct"), locked: false, roles: ["qa"] },
  { id: "u2", email: "locked@example.test", passwordHash: hashPassword("correct"), locked: true, roles: ["qa"] },
];

export function testLoginSuccess() {
  const result = new AuthService(users).login("qa@example.test", "correct");
  if (result.userId !== "u1") throw new Error("expected u1");
}

export function testLockedUserRejected() {
  try {
    new AuthService(users).login("locked@example.test", "correct");
  } catch (error) {
    if (String(error).includes("user locked")) return;
  }
  throw new Error("locked users must be rejected");
}
`,
  );

  await writeTargetFile(
    dir,
    "docs/risk-notes.md",
    `# Risk Register

- Retry policy is not implemented around report generation.
- Timeout boundaries are not explicit for authentication lookups.
- Error messages are intentionally generic for invalid credentials.
`,
  );

  await mkdir(join(dir, ".pi", "workflows"), { recursive: true });
  const workflowPath = join(dir, ".pi", "workflows", `${WORKFLOW_SELF_TEST_KEY}.json`);
  await writeFile(workflowPath, `${selfTestWorkflowJson()}\n`, "utf8");

  return { dir, workflowPath };
}

async function readTarget(relativePath: string, context: TaskContext): Promise<string> {
  return await readFile(join(context.cwd, relativePath), "utf8");
}

function markerLine(marker: string, detail: string): string {
  return `${marker}: ${detail}`;
}

export function createDeterministicSelfTestTaskRunner(): TaskRunner {
  return {
    async runTask(task: WorkflowTask, context: TaskContext): Promise<TaskResult> {
      if (context.signal?.aborted) return { ok: false, output: "", error: "Self-test task aborted." };

      const [auth, report, tests, risks, readme] = await Promise.all([
        readTarget("src/auth.ts", context),
        readTarget("src/report.ts", context),
        readTarget("tests/auth.test.ts", context),
        readTarget("docs/risk-notes.md", context),
        readTarget("README.md", context),
      ]);

      if (task.id === "inventory") {
        const ok = auth.includes("class AuthService") && report.includes("generateQualityReport") && tests.includes("testLockedUserRejected") && risks.includes("Risk Register") && readme.includes("non-trivial");
        return {
          ok,
          output: [
            markerLine("SELF_TEST_INVENTORY_OK", "found src/auth.ts, src/report.ts, tests/auth.test.ts, docs/risk-notes.md, and README.md"),
            "Target complexity: auth service + report pipeline + tests + risk register.",
          ].join("\n"),
          error: ok ? undefined : "Target inventory markers were missing.",
          usage: { turns: 1 },
        };
      }

      if (task.id === "auth-evidence") {
        const ok = auth.includes("user.locked") && auth.includes("sha256") && tests.includes("testLoginSuccess") && tests.includes("testLockedUserRejected");
        return {
          ok,
          output: [
            markerLine("AUTH_SERVICE_FOUND", "src/auth.ts rejects locked users and hashes passwords with sha256"),
            markerLine("AUTH_TESTS_FOUND", "tests/auth.test.ts covers successful login and locked-user rejection"),
          ].join("\n"),
          error: ok ? undefined : "Auth evidence markers were missing.",
          usage: { turns: 1 },
        };
      }

      if (task.id === "risk-evidence") {
        const ok = report.includes("generateQualityReport") && report.includes("critical") && risks.includes("Retry policy") && risks.includes("Timeout boundaries");
        return {
          ok,
          output: [
            markerLine("REPORT_PIPELINE_FOUND", "src/report.ts generates critical/warning quality summaries"),
            markerLine("RISK_REGISTER_FOUND", "docs/risk-notes.md documents retry and timeout risks"),
          ].join("\n"),
          error: ok ? undefined : "Risk/report evidence markers were missing.",
          usage: { turns: 1 },
        };
      }

      if (task.id === "final-verification") {
        const required = ["SELF_TEST_INVENTORY_OK", "AUTH_SERVICE_FOUND", "AUTH_TESTS_FOUND", "REPORT_PIPELINE_FOUND", "RISK_REGISTER_FOUND"];
        const missing = required.filter((marker) => !context.priorOutputs.includes(marker));
        return {
          ok: missing.length === 0,
          output: [
            markerLine("SELF_TEST_SYNTHESIS_OK", "prior fanout outputs contain all required evidence markers"),
            ...required.map((marker) => markerLine(marker, "verified in prior output")),
          ].join("\n"),
          error: missing.length === 0 ? undefined : `Missing prior output markers: ${missing.join(", ")}`,
          usage: { turns: 1 },
        };
      }

      return { ok: false, output: "", error: `Unexpected self-test task id: ${task.id}` };
    },
  };
}

async function loadSelfTestSource(extensionDir: string, targetDir: string): Promise<WorkflowSource> {
  const sources = await loadWorkflowRegistry({
    cwd: targetDir,
    extensionDir,
    includeProject: true,
    projectTrusted: true,
  });
  const source = findWorkflowSource(sources, WORKFLOW_SELF_TEST_KEY);
  if (!source) throw new Error(`Self-test workflow '${WORKFLOW_SELF_TEST_KEY}' was not loaded from target project.`);
  return source;
}

function evaluateWorkflowSelfTest(run: WorkflowRun): WorkflowSelfTestCheck[] {
  const summary = run.summary ?? "";
  const taskRuns = run.phases.flatMap((phase) => phase.tasks);
  const expectedMarkers = [
    "SELF_TEST_INVENTORY_OK",
    "AUTH_SERVICE_FOUND",
    "AUTH_TESTS_FOUND",
    "REPORT_PIPELINE_FOUND",
    "RISK_REGISTER_FOUND",
    "SELF_TEST_SYNTHESIS_OK",
  ];

  return [
    {
      name: "run completed",
      ok: run.status === "completed",
      details: `status=${run.status}${run.error ? ` error=${run.error}` : ""}`,
    },
    {
      name: "all phases completed",
      ok: run.phases.length === 2 && run.phases.every((phase) => phase.status === "completed"),
      details: run.phases.map((phase) => `${phase.phaseId}:${phase.status}`).join(", "),
    },
    {
      name: "all tasks completed",
      ok: taskRuns.length === 4 && taskRuns.every((task) => task.status === "completed"),
      details: taskRuns.map((task) => `${task.taskId}:${task.status}`).join(", "),
    },
    {
      name: "parallel fanout exercised",
      ok: run.phases[0]?.phaseId === "inspect" && run.phases[0].tasks.length === 3,
      details: `inspect task count=${run.phases[0]?.tasks.length ?? 0}`,
    },
    ...expectedMarkers.map((marker) => ({
      name: `summary contains ${marker}`,
      ok: summary.includes(marker),
      details: summary.includes(marker) ? "marker present" : "marker missing",
    })),
  ];
}

export function formatWorkflowSelfTestReport(result: WorkflowSelfTestResult): string {
  const failed = result.checks.filter((check) => !check.ok);
  return [
    "# Workflow Self-Test Report",
    "",
    `Verdict: ${result.verdict}`,
    `Mode: ${result.mode}`,
    `Workflow: ${result.workflowKey}`,
    `Run: ${result.run.runId}`,
    `Target: ${result.targetDir}${result.targetRetained ? "" : " (removed after test)"}`,
    "",
    "## Checks",
    ...result.checks.map((check) => `- ${check.ok ? "PASS" : "FAIL"}: ${check.name} — ${check.details}`),
    "",
    "## Failed checks",
    failed.length ? failed.map((check) => `- ${check.name}: ${check.details}`).join("\n") : "None",
    "",
    "## Summary excerpt",
    (result.run.summary ?? "(no summary)").slice(0, 4000),
  ].join("\n");
}

export async function runWorkflowSelfTest(options: WorkflowSelfTestRunOptions): Promise<WorkflowSelfTestResult> {
  const mode = options.mode ?? "deterministic";
  const target = await createWorkflowSelfTestTarget();
  const state = options.state ?? createWorkflowStateStore();
  let targetRetained = Boolean(options.keepTarget);

  try {
    const source = await loadSelfTestSource(options.extensionDir, target.dir);
    const taskRunner = mode === "real" ? options.realTaskRunner : createDeterministicSelfTestTaskRunner();
    if (!taskRunner) throw new Error("Real workflow self-test requested, but no real task runner was provided.");

    const run = await runWorkflow(
      source,
      {
        topic: "isolated Pi workflow runtime self-test",
        targetDir: target.dir,
        expectedMarkers: ["SELF_TEST_SYNTHESIS_OK", "AUTH_SERVICE_FOUND", "REPORT_PIPELINE_FOUND"],
      },
      options.ctx,
      {
        cwd: target.dir,
        taskRunner,
        state,
        signal: options.signal,
      },
    );

    const checks = evaluateWorkflowSelfTest(run);
    const verdict = checks.every((check) => check.ok) ? "PASS" : "FAIL";
    return {
      verdict,
      mode,
      targetDir: target.dir,
      targetRetained,
      workflowKey: source.definition.key,
      run,
      checks,
    };
  } finally {
    if (!options.keepTarget) {
      await rm(target.dir, { recursive: true, force: true });
      targetRetained = false;
    }
  }
}
