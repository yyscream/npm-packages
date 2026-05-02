import { createLocalBashOperations, type ExtensionAPI } from "@mariozechner/pi-coding-agent";

function resolveShellPath(): string {
  const configured = process.env.PI_USER_BASH_SHELL_PATH?.trim();
  if (configured) return configured;

  // Portable default: rely on PATH lookup instead of distro-specific absolute paths.
  return "fish";
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
