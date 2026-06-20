import type { ContextHeaderMode, OrchestrationMode, ReliabilityConfig, ReliabilityProfile, ReliabilityRole, ReliabilitySupervisionMode } from "./types.ts";
import { DEFAULT_CONFIG, PROFILE_DEFAULTS } from "./types.ts";

export function normalizeProfile(value: unknown): ReliabilityProfile {
  return value === "strict" || value === "balanced" || value === "relaxed" ? value : DEFAULT_CONFIG.profile;
}

export function normalizeContextMode(value: unknown, fallback: ContextHeaderMode): ContextHeaderMode {
  return value === "full" || value === "compact" || value === "delta" ? value : fallback;
}

export function normalizeOrchestrationMode(value: unknown, fallback: OrchestrationMode): OrchestrationMode {
  return value === "prompt" || value === "separate-model" ? value : fallback;
}

export function normalizeSupervisionMode(value: unknown, fallback: ReliabilitySupervisionMode): ReliabilitySupervisionMode {
  return value === "adaptive" || value === "lite" || value === "supervised" ? value : fallback;
}

function normalizeRoleModels(value: unknown): Partial<Record<ReliabilityRole, string>> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const result: Partial<Record<ReliabilityRole, string>> = {};
  for (const role of ["supervisor", "worker", "verifier"] as const) {
    const model = input[role];
    if (typeof model === "string" && model.trim()) result[role] = model.trim();
  }
  return result;
}

function normalizeTools(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const tools = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
  return tools.length > 0 ? [...new Set(tools)] : fallback;
}

export function normalizeConfig(input: Partial<ReliabilityConfig>): ReliabilityConfig {
  const profile = normalizeProfile(input.profile);
  const profileDefaults = PROFILE_DEFAULTS[profile];
  const maxRepeatedActionSource = input.maxRepeatedAction ?? profileDefaults.maxRepeatedAction;
  const contextBudgetSource = input.contextBudgetChars ?? profileDefaults.contextBudgetChars;
  const rawLogMaxSource = input.rawLogMaxChars ?? profileDefaults.rawLogMaxChars;
  const orchestrationOutputSource = input.orchestrationMaxOutputChars ?? profileDefaults.orchestrationMaxOutputChars;
  return {
    ...DEFAULT_CONFIG,
    ...profileDefaults,
    ...input,
    profile,
    contextMode: normalizeContextMode(input.contextMode, profileDefaults.contextMode),
    supervisionMode: normalizeSupervisionMode(input.supervisionMode, profileDefaults.supervisionMode),
    storeRawToolLogs: input.storeRawToolLogs === true,
    maxRepeatedAction: Math.max(2, Math.min(10, Math.trunc(Number(maxRepeatedActionSource) || profileDefaults.maxRepeatedAction))),
    contextBudgetChars: Math.max(1800, Math.min(20000, Math.trunc(Number(contextBudgetSource) || profileDefaults.contextBudgetChars))),
    rawLogMaxChars: Math.max(1000, Math.min(500000, Math.trunc(Number(rawLogMaxSource) || profileDefaults.rawLogMaxChars))),
    orchestrationMode: normalizeOrchestrationMode(input.orchestrationMode, profileDefaults.orchestrationMode),
    orchestrationModels: normalizeRoleModels(input.orchestrationModels),
    orchestrationTools: normalizeTools(input.orchestrationTools, profileDefaults.orchestrationTools),
    orchestrationMaxOutputChars: Math.max(2000, Math.min(200000, Math.trunc(Number(orchestrationOutputSource) || profileDefaults.orchestrationMaxOutputChars))),
  };
}
