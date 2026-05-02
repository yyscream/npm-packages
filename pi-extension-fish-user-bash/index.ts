import * as fs from "node:fs";
import * as path from "node:path";
import { createLocalBashOperations, type ExtensionAPI } from "@mariozechner/pi-coding-agent";

function resolveFromPath(binName: string): string | undefined {
  const envPath = process.env.PATH ?? "";
  for (const dir of envPath.split(":").filter(Boolean)) {
    const candidate = path.join(dir, binName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function resolveShellPath(): string {
  const configured = process.env.PI_USER_BASH_SHELL_PATH?.trim();
  if (configured) {
    if (configured.startsWith("/") && fs.existsSync(configured)) return configured;

    const resolvedConfigured = resolveFromPath(configured);
    if (resolvedConfigured) return resolvedConfigured;
  }

  // Prefer fish when available, but always return an absolute existing binary path.
  return (
    resolveFromPath("fish") ??
    ["/usr/bin/fish", "/bin/fish", "/usr/local/bin/fish"].find((p) => fs.existsSync(p)) ??
    "/bin/bash"
  );
}

export default function fishUserBash(pi: ExtensionAPI) {
  const shellPath = resolveShellPath();

  pi.on("user_bash", () => {
    return {
      operations: createLocalBashOperations({ shellPath }),
    };
  });

  pi.registerCommand("user-bash-shell", {
    description: "Show configured shell path for !/!! commands",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `user_bash shell: ${shellPath}${process.env.PI_USER_BASH_SHELL_PATH ? " (from PI_USER_BASH_SHELL_PATH)" : " (default)"}`,
        "info",
      );
    },
  });
}
