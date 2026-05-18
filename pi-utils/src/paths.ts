import os from "node:os";
import path from "node:path";

export function getAgentDir(): string {
  const env = process.env.PI_CODING_AGENT_DIR?.trim();
  if (env) return path.resolve(env);
  return path.join(os.homedir(), ".pi", "agent");
}

export function resolvePathFromAgentDir(configuredPath: string): string {
  return path.isAbsolute(configuredPath) ? path.normalize(configuredPath) : path.resolve(getAgentDir(), configuredPath);
}

export function getPiDir(): string {
  return path.dirname(getAgentDir());
}

export function getAgentEnvPath(): string {
  return path.join(getAgentDir(), ".env");
}

export function getAgentSettingsPath(): string {
  return path.join(getAgentDir(), "settings.json");
}

export function getWorkspaceEnvPath(cwd = process.cwd()): string {
  return path.join(cwd, ".env");
}
