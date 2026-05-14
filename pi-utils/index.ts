import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type ExtensionWorkingIndicator = {
  update(message: string): void;
  stop(): void;
};

export type ExtensionWorkingIndicatorOptions = {
  id?: string;
  title?: string;
  placement?: "aboveEditor" | "belowEditor";
  intervalMs?: number;
  frames?: string[];
};

export type EnvResolution = {
  value?: string;
  source?: "environment" | "workspace .env" | "Pi global .env";
  path?: string;
};

export type SlugifyOptions = {
  maxLength?: number;
  fallback?: string;
};

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

export function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const values: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2] ?? "";
    const commentStart = value.search(/\s#/);
    if (commentStart >= 0) value = value.slice(0, commentStart);
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1] ?? ""] = value.replace(/\\n/g, "\n");
  }
  return values;
}

export function readEnvValue(filePath: string, key: string): string | undefined {
  return parseEnvFile(filePath)[key];
}

export function resolveEnvValue(key: string, options: { includeWorkspace?: boolean; cwd?: string } = {}): EnvResolution {
  const envValue = process.env[key]?.trim();
  if (envValue) return { value: envValue, source: "environment" };

  if (options.includeWorkspace) {
    const workspaceEnvPath = getWorkspaceEnvPath(options.cwd);
    const workspaceValue = readEnvValue(workspaceEnvPath, key)?.trim();
    if (workspaceValue) return { value: workspaceValue, source: "workspace .env", path: workspaceEnvPath };
  }

  const globalEnvPath = getAgentEnvPath();
  const globalValue = readEnvValue(globalEnvPath, key)?.trim();
  if (globalValue) return { value: globalValue, source: "Pi global .env", path: globalEnvPath };

  return {};
}

export function quoteEnvValue(value: string): string {
  return JSON.stringify(value);
}

export function upsertEnvValue(filePath: string, key: string, value: string): void {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const line = `${key}=${quoteEnvValue(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  content = pattern.test(content) ? content.replace(pattern, line) : `${content}${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? 80;
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return slug || options.fallback || "";
}

export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

export function estimateTokensFromCharCount(charCount: number): number {
  return Math.max(0, Math.round(charCount / 4));
}

export function estimatePromptInjectionTokens(systemPrompt: string): number {
  return estimateTokensFromCharCount(systemPrompt.length);
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createExtensionWorkingIndicator(ctx: any, initialMessage: string, options: ExtensionWorkingIndicatorOptions = {}): ExtensionWorkingIndicator {
  const id = options.id ?? "extension-working";
  const title = options.title ?? "Working";
  const frames = options.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const intervalMs = options.intervalMs ?? 100;
  const placement = options.placement ?? "aboveEditor";
  let frameIndex = 0;
  let message = initialMessage;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    const frame = frames[frameIndex % frames.length] ?? "•";
    frameIndex += 1;
    ctx?.ui?.setStatus?.(id, `${frame} ${message}`);
    ctx?.ui?.setWidget?.(id, [`${frame} ${title}… ${message}`], { placement });
  };

  render();
  const timer = setInterval(render, intervalMs);

  return {
    update(nextMessage: string) {
      message = nextMessage;
      render();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      ctx?.ui?.setStatus?.(id, undefined);
      ctx?.ui?.setWidget?.(id, undefined);
    },
  };
}

export async function withExtensionWorkingIndicator<T>(ctx: any, initialMessage: string, run: (indicator: ExtensionWorkingIndicator) => Promise<T>, options?: ExtensionWorkingIndicatorOptions): Promise<T> {
  const indicator = createExtensionWorkingIndicator(ctx, initialMessage, options);
  try {
    return await run(indicator);
  } finally {
    indicator.stop();
  }
}

export default function piUtilsExtension(_pi: ExtensionAPI): void {
  // Utility package: no runtime behavior.
}
