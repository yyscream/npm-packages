import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type CommandSource = "common" | "history";

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

const COMMON_COMMANDS = [
  "ls",
  "la",
  "ll",
  "cd",
  "pwd",
  "cat",
  "less",
  "bat",
  "rg",
  "fd",
  "find",
  "grep",
  "sed",
  "awk",
  "jq",
  "git",
  "gh",
  "g",
  "pnpm",
  "bun",
  "npm",
  "node",
  "python",
  "python3",
  "uv",
  "cargo",
  "rustc",
  "make",
  "just",
  "docker",
  "docker-compose",
  "systemctl",
  "journalctl",
  "pacman",
  "yay",
  "curl",
  "wget",
  "ssh",
  "scp",
  "rsync",
  "tmux",
  "htop",
  "btop",
] as const;

function extractExecutable(commandLine: string): string | undefined {
  const trimmed = commandLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  let executable = tokens[0] ?? "";
  if (executable === "sudo") executable = tokens[1] ?? "";
  if (executable.startsWith("!")) executable = executable.slice(1);

  if (!executable) return undefined;
  return executable;
}

function readFishHistoryExecutables(): string[] {
  const historyPath = path.join(os.homedir(), ".local", "share", "fish", "fish_history");
  if (!fs.existsSync(historyPath)) return [];

  const content = fs.readFileSync(historyPath, "utf8");
  const lines = content.split(/\r?\n/);
  const commands: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*-\s*cmd:\s*(.*)$/);
    if (!match) continue;

    const executable = extractExecutable(match[1] ?? "");
    if (executable) commands.push(executable);
  }

  return commands;
}

function readBashHistoryExecutables(): string[] {
  const historyPath = path.join(os.homedir(), ".bash_history");
  if (!fs.existsSync(historyPath)) return [];

  const content = fs.readFileSync(historyPath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => extractExecutable(line))
    .filter((v): v is string => Boolean(v));
}

function buildCommandIndex(includeHistory: boolean): Array<{ command: string; source: CommandSource }> {
  const merged = new Map<string, CommandSource>();

  for (const command of COMMON_COMMANDS) {
    merged.set(command, "common");
  }

  if (includeHistory) {
    const historyExecutables = [...readFishHistoryExecutables(), ...readBashHistoryExecutables()];
    for (let i = historyExecutables.length - 1; i >= 0; i--) {
      const command = historyExecutables[i];
      if (!command) continue;

      // History wins over common list and keeps most-recent-first order.
      if (!merged.has(command) || merged.get(command) === "common") {
        merged.set(command, "history");
      }
    }
  }

  return Array.from(merged.entries()).map(([command, source]) => ({ command, source }));
}

function rankCommands(commands: Array<{ command: string; source: CommandSource }>, query: string) {
  const q = query.toLowerCase();

  const startsWith = commands.filter((c) => c.command.toLowerCase().startsWith(q));
  const includes = commands.filter(
    (c) => !c.command.toLowerCase().startsWith(q) && c.command.toLowerCase().includes(q),
  );

  return [...startsWith, ...includes].slice(0, 24);
}

export default function bangCommandAutocomplete(pi: ExtensionAPI) {
  const includeHistory = envFlag("PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY", false);
  let commandIndex = buildCommandIndex(includeHistory);

  const refreshIndex = () => {
    commandIndex = buildCommandIndex(includeHistory);
  };

  pi.on("session_start", (_event, ctx) => {
    refreshIndex();

    ctx.ui.addAutocompleteProvider((current) => ({
      async getSuggestions(lines, cursorLine, cursorCol, options) {
        const line = lines[cursorLine] ?? "";
        const beforeCursor = line.slice(0, cursorCol);

        // Trigger on `!<command>` in the current token.
        const match = beforeCursor.match(/(?:^|[ \t])!([^\s!]*)$/);
        if (!match) {
          return current.getSuggestions(lines, cursorLine, cursorCol, options);
        }

        const partial = match[1] ?? "";
        const ranked = rankCommands(commandIndex, partial);

        return {
          prefix: `!${partial}`,
          items: ranked.map((entry) => ({
            value: `!${entry.command}`,
            label: `!${entry.command}`,
            description: entry.source === "history" ? "shell history" : "common command",
          })),
        };
      },

      applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
        return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
      },

      shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
        const line = lines[cursorLine] ?? "";
        const beforeCursor = line.slice(0, cursorCol);

        // Allow Tab-forced autocomplete for bang commands (editor reserves auto-popups
        // for /, @, # contexts by default).
        if (beforeCursor.match(/(?:^|[ \t])![^\s!]*$/)) {
          return true;
        }

        return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
      },
    }));
  });

  pi.registerCommand("bang-refresh", {
    description: "Refresh !command autocomplete index",
    handler: async (_args, ctx) => {
      refreshIndex();
      ctx.ui.notify(
        `Bang autocomplete refreshed (${commandIndex.length} commands, history ${includeHistory ? "enabled" : "disabled"})`,
        "info",
      );
    },
  });

  pi.registerCommand("bang-status", {
    description: "Show !command autocomplete configuration",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `Bang autocomplete: ${commandIndex.length} commands · history ${includeHistory ? "enabled" : "disabled"} (${includeHistory ? "PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY=1" : "set PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY=1 to enable"})`,
        "info",
      );
    },
  });
}
