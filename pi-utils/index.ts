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
