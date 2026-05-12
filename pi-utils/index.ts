import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function getAgentDir(): string {
  const env = process.env.PI_CODING_AGENT_DIR?.trim();
  if (env) return path.resolve(env);
  return path.join(os.homedir(), ".pi", "agent");
}

export function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function resolvePathFromAgentDir(configuredPath: string): string {
  return path.isAbsolute(configuredPath) ? path.normalize(configuredPath) : path.resolve(getAgentDir(), configuredPath);
}

export default function piUtilsExtension(_pi: ExtensionAPI): void {
  // Utility package: no runtime behavior.
}
