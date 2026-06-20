import type { ParsedVerificationResult, TaskState, VerificationRecord, VerificationStatus } from "./types.ts";
import { nowIso, truncate } from "./utils.ts";

export function normalizeCriterion(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function explicitVerificationFor(state: TaskState, criterion: string): VerificationRecord | undefined {
  const key = normalizeCriterion(criterion);
  return [...state.verification].reverse().find((record) => normalizeCriterion(record.criterion) === key && record.source !== "harness");
}

export function addOrUpdateVerification(state: TaskState, record: VerificationRecord): void {
  const key = normalizeCriterion(record.criterion);
  const index = state.verification.findIndex((item) => normalizeCriterion(item.criterion) === key && item.source === record.source);
  if (index >= 0) state.verification[index] = record;
  else state.verification.push(record);
  if (state.verification.length > 50) state.verification.splice(0, state.verification.length - 50);
}

function latestVerification(state: TaskState, criterion: string): VerificationRecord | undefined {
  const key = normalizeCriterion(criterion);
  return [...state.verification].reverse().find((record) => normalizeCriterion(record.criterion) === key);
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeCriterion(value).split(/\s+/).filter((token) => token.length > 2));
}

function tokenOverlapScore(candidate: string, target: string): number {
  const candidateTokens = tokenSet(candidate);
  const targetTokens = tokenSet(target);
  if (candidateTokens.size === 0 || targetTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of candidateTokens) if (targetTokens.has(token)) overlap += 1;
  return overlap / Math.min(candidateTokens.size, targetTokens.size);
}

export function resolveVerificationCriterion(state: TaskState, criterion: string): string {
  const key = normalizeCriterion(criterion);
  const exact = state.success_criteria.find((candidate) => normalizeCriterion(candidate) === key);
  if (exact) return exact;

  const contains = state.success_criteria.find((candidate) => {
    const candidateKey = normalizeCriterion(candidate);
    return candidateKey.includes(key) || key.includes(candidateKey);
  });
  if (contains) return contains;

  if (state.success_criteria.length === 1) return state.success_criteria[0];

  const unresolved = computeVerification(state).filter((item) => item.status !== "passed");
  if (unresolved.length === 1) return unresolved[0].criterion;

  const scored = state.success_criteria
    .map((candidate) => ({ candidate, score: tokenOverlapScore(criterion, candidate) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best && best.score >= 0.6) return best.candidate;

  return criterion;
}

export function computeVerification(state: TaskState): VerificationRecord[] {
  const timestamp = nowIso();
  return state.success_criteria.map((criterion) => {
    const existing = latestVerification(state, criterion);
    if (existing) return existing;
    return {
      criterion,
      status: "unknown",
      evidence: "No explicit verification evidence recorded yet.",
      remaining_work: "Record evidence with reliability_verify_completion or run relevant checks.",
      source: "harness",
      updated_at: timestamp,
    } satisfies VerificationRecord;
  });
}

export function mergeVerificationEvidence(state: TaskState, evidence: Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string }> | undefined): void {
  if (!evidence) return;
  for (const item of evidence) {
    if (!item.criterion || !item.status) continue;
    addOrUpdateVerification(state, {
      criterion: resolveVerificationCriterion(state, item.criterion),
      status: item.status,
      evidence: truncate(item.evidence || "Evidence recorded by model.", 800),
      remaining_work: truncate(item.remainingWork || (item.status === "passed" ? "" : "Additional verification or fixes required."), 800),
      source: "model",
      updated_at: nowIso(),
    });
  }
}

export function formatVerification(records: VerificationRecord[]): string {
  if (records.length === 0) return "No verification criteria recorded.";
  return records.map((record) => {
    const status = record.status.toUpperCase();
    const rest = [record.evidence, record.remaining_work].filter(Boolean).join(" Remaining: ");
    return `${status}: ${record.criterion}${rest ? ` — ${rest}` : ""}`;
  }).join("\n");
}

export function markTaskCompleteIfVerified(state: TaskState): boolean {
  const verification = computeVerification(state);
  const allPassed = verification.length > 0 && verification.every((item) => item.status === "passed");
  if (!allPassed) return false;
  for (const step of state.plan) {
    if (step.status === "pending" || step.status === "in_progress") step.status = "complete";
  }
  state.completed_steps = state.plan.map((step) => step.step_id);
  state.status = "complete";
  state.current_phase = "complete";
  state.current_step_id = state.plan.at(-1)?.step_id ?? state.current_step_id;
  return true;
}

export function applyParsedVerificationToCriteria(state: TaskState, parsed: ParsedVerificationResult): void {
  const criteria = state.success_criteria.length ? state.success_criteria : ["The original user goal is addressed."];
  for (const criterion of criteria) {
    addOrUpdateVerification(state, {
      criterion,
      status: parsed.status,
      evidence: parsed.summary,
      remaining_work: parsed.status === "passed" ? "" : parsed.failure_excerpt || parsed.summary,
      source: "model",
      updated_at: nowIso(),
    });
  }
}
