import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createLocalBashOperations, type ExtensionAPI } from "@mariozechner/pi-coding-agent";

function resolveFromPath(binName: string): string | undefined {
  const envPath = process.env.PATH ?? "";
  const candidates = os.platform() === "win32" && !binName.toLowerCase().endsWith(".exe") ? [binName, `${binName}.exe`] : [binName];

  for (const dir of envPath.split(path.delimiter).filter(Boolean)) {
    for (const name of candidates) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function resolveShellPath(): string {
  const configured = process.env.PI_USER_BASH_SHELL_PATH?.trim();
  if (configured) {
    if (path.isAbsolute(configured) && fs.existsSync(configured)) return configured;

    const resolvedConfigured = resolveFromPath(configured);
    if (resolvedConfigured) return resolvedConfigured;
  }

  const fish =
    resolveFromPath("fish") ??
    ["/usr/bin/fish", "/bin/fish", "/usr/local/bin/fish", "/opt/homebrew/bin/fish"].find((p) => fs.existsSync(p));
  if (fish) return fish;

  const shellFromEnv = process.env.SHELL?.trim();
  if (shellFromEnv && path.isAbsolute(shellFromEnv) && fs.existsSync(shellFromEnv)) return shellFromEnv;

  const bash =
    resolveFromPath("bash") ??
    ["/bin/bash", "/usr/bin/bash", "C:\\Program Files\\Git\\bin\\bash.exe"].find((p) => fs.existsSync(p));
  if (bash) return bash;

  if (os.platform() === "win32") {
    const pwsh = resolveFromPath("pwsh") ?? resolveFromPath("powershell");
    if (pwsh) return pwsh;

    const comspec = process.env.ComSpec?.trim();
    if (comspec && fs.existsSync(comspec)) return comspec;
  }

  return process.execPath;
}

export default function fishUserBash(pi: ExtensionAPI) {
  const shellPath = resolveShellPath();

  pi.on("user_bash", (event) => {
    // Emit for companion extensions (e.g. bang autocomplete learning), because
    // user_bash short-circuits on first non-undefined handler result.
    pi.events.emit("fish-user-bash:executed", { command: event.command });

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
