import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { Message } from "@earendil-works/pi-ai";
import type { ReliabilityConfig, ReliabilityRole, TaskState, VerificationStatus } from "./types.ts";
import { buildContextHeader, computeVerification, truncate } from "./core.ts";
import type { SupervisorDecision, WorkerResultInput } from "./supervisor.ts";
import { buildSupervisorDecision, buildWorkerContractPrompt } from "./supervisor.ts";

export type RolePromptSet = Record<ReliabilityRole, string>;

export type RoleRunResult = {
  role: ReliabilityRole;
  model?: string;
  prompt: string;
  output: string;
  exitCode: number;
  stderr: string;
  messages: Message[];
  error?: string;
};

export type SeparateModelOrchestrationResult = {
  mode: "dry-run" | "separate-model";
  decision: SupervisorDecision;
  prompts: RolePromptSet;
  roleResults: RoleRunResult[];
  workerResult?: WorkerResultInput;
  verificationEvidence?: Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string }>;
  errors: string[];
};

type RoleRunner = (role: ReliabilityRole, prompt: string, state: TaskState, config: ReliabilityConfig, signal?: AbortSignal) => Promise<RoleRunResult>;

function roleSystemPrompt(role: ReliabilityRole): string {
  if (role === "supervisor") {
    return [
      "You are the reliability supervisor.",
      "Review the persistent task state and selected step. Do not execute tools or modify files.",
      "Return concise JSON with keys: decision_ok, risks, revised_next_action.",
    ].join("\n");
  }
  if (role === "worker") {
    return [
      "You are the reliability worker for exactly one supervisor-selected step.",
      "Use only the context and tools needed for that step. Avoid unrelated changes.",
      "End with a JSON object matching: { step_id, action_taken, result, files_changed, errors, next_recommendation, status }.",
    ].join("\n");
  }
  return [
    "You are the reliability verifier.",
    "Verify the worker result against the task success criteria and current evidence.",
    "Return concise JSON with key evidence: [{ criterion, status, evidence, remainingWork }]. Use status passed, failed, or unknown.",
  ].join("\n");
}

function taskStateExcerpt(state: TaskState, config: ReliabilityConfig): string {
  const { header } = buildContextHeader(state, { ...config, contextMode: "compact" });
  return header;
}

export function buildRolePrompts(state: TaskState, config: ReliabilityConfig, decision = buildSupervisorDecision(state, config), workerOutput = ""): RolePromptSet {
  const stateExcerpt = taskStateExcerpt(state, config);
  const verification = computeVerification(state)
    .map((item) => `${item.status.toUpperCase()}: ${item.criterion} — ${item.evidence || item.remaining_work}`)
    .join("\n") || "No verification evidence recorded yet.";
  const workerContract = buildWorkerContractPrompt(decision);

  return {
    supervisor: [
      roleSystemPrompt("supervisor"),
      "",
      stateExcerpt,
      "",
      "Deterministic supervisor decision:",
      JSON.stringify(decision, null, 2),
    ].join("\n"),
    worker: [
      roleSystemPrompt("worker"),
      "",
      workerContract,
      "",
      stateExcerpt,
      "",
      "Return only the worker contract JSON after any necessary tool work.",
    ].join("\n"),
    verifier: [
      roleSystemPrompt("verifier"),
      "",
      stateExcerpt,
      "",
      "Current verification evidence:",
      verification,
      "",
      "Worker output to verify:",
      workerOutput || "(no worker output yet)",
    ].join("\n"),
  };
}

export function buildDryRunOrchestration(state: TaskState, config: ReliabilityConfig): SeparateModelOrchestrationResult {
  const decision = buildSupervisorDecision(state, config);
  return {
    mode: "dry-run",
    decision,
    prompts: buildRolePrompts(state, config, decision),
    roleResults: [],
    errors: [],
  };
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }
  const execName = basename(process.execPath).toLowerCase();
  const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
  return isGenericRuntime ? { command: "pi", args } : { command: process.execPath, args };
}

function finalAssistantOutput(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    for (const part of message.content) {
      if (part.type === "text") return part.text;
    }
  }
  return "";
}

function parseJsonObject<T>(text: string): T | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidates = [fenced, text.match(/\{[\s\S]*\}/)?.[0]].filter((item): item is string => Boolean(item));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

export function parseWorkerResultFromText(text: string): WorkerResultInput | undefined {
  const parsed = parseJsonObject<Partial<WorkerResultInput>>(text);
  if (!parsed || typeof parsed !== "object") return undefined;
  if (typeof parsed.step_id !== "string" || typeof parsed.action_taken !== "string" || typeof parsed.result !== "string") return undefined;
  if (parsed.status !== "complete" && parsed.status !== "blocked" && parsed.status !== "failed") return undefined;
  return {
    step_id: parsed.step_id,
    action_taken: parsed.action_taken,
    result: parsed.result,
    files_changed: Array.isArray(parsed.files_changed) ? parsed.files_changed.filter((item): item is string => typeof item === "string") : [],
    errors: Array.isArray(parsed.errors) ? parsed.errors.filter((item): item is string => typeof item === "string") : [],
    next_recommendation: typeof parsed.next_recommendation === "string" ? parsed.next_recommendation : undefined,
    status: parsed.status,
  };
}

export function parseVerificationEvidenceFromText(text: string): Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string }> | undefined {
  const parsed = parseJsonObject<{ evidence?: Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string; remaining_work?: string }> }>(text);
  const evidence = parsed?.evidence;
  if (!Array.isArray(evidence)) return undefined;
  return evidence
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      criterion: typeof item.criterion === "string" ? item.criterion : undefined,
      status: item.status === "passed" || item.status === "failed" || item.status === "unknown" ? item.status : undefined,
      evidence: typeof item.evidence === "string" ? item.evidence : undefined,
      remainingWork: typeof item.remainingWork === "string" ? item.remainingWork : typeof item.remaining_work === "string" ? item.remaining_work : undefined,
    }));
}

export async function runPiJsonRole(role: ReliabilityRole, prompt: string, state: TaskState, config: ReliabilityConfig, signal?: AbortSignal): Promise<RoleRunResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pi-reliability-role-"));
  const systemPromptPath = join(tmpDir, `${role}-system.md`);
  await writeFile(systemPromptPath, roleSystemPrompt(role), { encoding: "utf8", mode: 0o600 });

  const args = ["--mode", "json", "-p", "--no-session", "--append-system-prompt", systemPromptPath];
  const model = config.orchestrationModels[role];
  if (model) args.push("--model", model);
  if (role === "worker") args.push("--tools", config.orchestrationTools.join(","));
  else args.push("--tools", "read,grep,find,ls");
  args.push(prompt);

  const result: RoleRunResult = { role, model, prompt, output: "", exitCode: 0, stderr: "", messages: [] };
  try {
    const exitCode = await new Promise<number>((resolve) => {
      const invocation = getPiInvocation(args);
      const child = spawn(invocation.command, invocation.args, {
        cwd: state.cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PI_RELIABILITY_ORCHESTRATION_CHILD: "1" },
      });
      let buffer = "";
      const processLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const event = JSON.parse(line) as { type?: string; message?: Message };
          if (event.message && (event.type === "message_end" || event.type === "tool_result_end")) {
            result.messages.push(event.message);
          }
        } catch {
          // Ignore non-JSON stderr/stdout noise.
        }
      };
      child.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      });
      child.stderr.on("data", (data) => {
        result.stderr += data.toString();
      });
      child.on("close", (code) => {
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });
      child.on("error", (error) => {
        result.error = error.message;
        resolve(1);
      });
      if (signal) {
        const abort = () => {
          result.error = "Role subprocess aborted";
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 5000).unref();
        };
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      }
    });
    result.exitCode = exitCode;
    result.output = truncate(finalAssistantOutput(result.messages), config.orchestrationMaxOutputChars);
    return result;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function runSeparateModelOrchestration(state: TaskState, config: ReliabilityConfig, signal?: AbortSignal, runner: RoleRunner = runPiJsonRole): Promise<SeparateModelOrchestrationResult> {
  const decision = buildSupervisorDecision(state, config);
  const initialPrompts = buildRolePrompts(state, config, decision);
  const roleResults: RoleRunResult[] = [];
  const errors: string[] = [];

  const supervisor = await runner("supervisor", initialPrompts.supervisor, state, config, signal);
  roleResults.push(supervisor);
  if (supervisor.exitCode !== 0 || supervisor.error) errors.push(`Supervisor failed: ${supervisor.error || supervisor.stderr || supervisor.exitCode}`);

  const worker = await runner("worker", initialPrompts.worker, state, config, signal);
  roleResults.push(worker);
  if (worker.exitCode !== 0 || worker.error) errors.push(`Worker failed: ${worker.error || worker.stderr || worker.exitCode}`);
  const workerResult = parseWorkerResultFromText(worker.output);
  if (!workerResult) errors.push("Worker did not return a valid worker-result JSON object.");

  const verifierPrompts = buildRolePrompts(state, config, decision, worker.output);
  const verifier = await runner("verifier", verifierPrompts.verifier, state, config, signal);
  roleResults.push(verifier);
  if (verifier.exitCode !== 0 || verifier.error) errors.push(`Verifier failed: ${verifier.error || verifier.stderr || verifier.exitCode}`);
  const verificationEvidence = parseVerificationEvidenceFromText(verifier.output);
  if (!verificationEvidence) errors.push("Verifier did not return evidence JSON.");

  return {
    mode: "separate-model",
    decision,
    prompts: verifierPrompts,
    roleResults,
    workerResult,
    verificationEvidence,
    errors,
  };
}

export function formatOrchestrationResult(result: SeparateModelOrchestrationResult): string {
  const lines = [
    `Orchestration mode: ${result.mode}`,
    `Supervisor step: ${result.decision.step_id} — ${result.decision.step_title}`,
    result.workerResult ? `Worker status: ${result.workerResult.status}` : "Worker status: not available",
    result.verificationEvidence ? `Verifier evidence items: ${result.verificationEvidence.length}` : "Verifier evidence: not available",
  ];
  for (const roleResult of result.roleResults) {
    lines.push(`- ${roleResult.role}: exit ${roleResult.exitCode}${roleResult.model ? ` (${roleResult.model})` : ""}`);
    const output = roleResult.output.trim();
    if (output) lines.push(`  ${truncate(output.replace(/\s+/g, " "), 300)}`);
  }
  if (result.errors.length) lines.push("Errors:\n" + result.errors.map((error) => `- ${error}`).join("\n"));
  if (result.mode === "dry-run") lines.push("Use `/reliability orchestrate --run` to run separate pi subprocesses for supervisor, worker, and verifier.");
  return lines.join("\n");
}
