import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type CommandSource = "common" | "history" | "runtime";

const DEFAULT_RUNTIME_STORE_PATH = path.join(
  os.homedir(),
  ".pi",
  "agent",
  "state",
  "bang-command-autocomplete-runtime.json",
);

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

function parseCommandLine(commandLine: string): { executable?: string; flags: string[] } {
  const trimmed = commandLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return { flags: [] };

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { flags: [] };

  let startIndex = 0;
  let executable = tokens[startIndex] ?? "";

  if (executable === "sudo") {
    startIndex += 1;
    executable = tokens[startIndex] ?? "";
  }

  if (executable.startsWith("!")) executable = executable.slice(1);
  if (!executable) return { flags: [] };

  const flags = tokens
    .slice(startIndex + 1)
    .filter((token) => token.startsWith("-") && token !== "-");

  return { executable, flags };
}

function extractExecutable(commandLine: string): string | undefined {
  return parseCommandLine(commandLine).executable;
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

function getRuntimeStorePath(): string {
  const configured = process.env.PI_BANG_AUTOCOMPLETE_RUNTIME_STORE_PATH?.trim();
  return configured ? path.resolve(configured) : DEFAULT_RUNTIME_STORE_PATH;
}

type RuntimeStoreData = {
  commands: Set<string>;
  flagsByCommand: Map<string, Set<string>>;
  lines: Set<string>;
};

function readRuntimeData(storePath: string): RuntimeStoreData {
  const empty: RuntimeStoreData = { commands: new Set<string>(), flagsByCommand: new Map<string, Set<string>>(), lines: new Set<string>() };
  if (!fs.existsSync(storePath)) return empty;

  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as unknown;

    // Backward compatibility with older format: string[]
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string" && item.trim()) {
          const normalized = item.trim();
          empty.commands.add(normalized);
          empty.lines.add(normalized);
        }
      }
      return empty;
    }

    if (!parsed || typeof parsed !== "object") return empty;

    const commandsRaw = (parsed as { commands?: unknown }).commands;
    if (Array.isArray(commandsRaw)) {
      for (const item of commandsRaw) {
        if (typeof item === "string" && item.trim()) {
          empty.commands.add(item.trim());
        }
      }
    }

    const flagsRaw = (parsed as { flags?: unknown }).flags;
    if (flagsRaw && typeof flagsRaw === "object") {
      for (const [command, flags] of Object.entries(flagsRaw)) {
        if (!command.trim() || !Array.isArray(flags)) continue;
        const normalizedFlags = flags
          .map((flag) => (typeof flag === "string" ? flag.trim() : ""))
          .filter(Boolean);
        if (normalizedFlags.length === 0) continue;
        empty.flagsByCommand.set(command.trim(), new Set(normalizedFlags));
      }
    }

    const linesRaw = (parsed as { lines?: unknown }).lines;
    if (Array.isArray(linesRaw)) {
      for (const item of linesRaw) {
        if (typeof item === "string" && item.trim()) {
          empty.lines.add(item.trim());
        }
      }
    }

    return empty;
  } catch {
    return empty;
  }
}

function writeRuntimeData(storePath: string, data: RuntimeStoreData): void {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });

    const commands = Array.from(data.commands).sort((a, b) => a.localeCompare(b));
    const flags: Record<string, string[]> = {};
    const sortedCommands = Array.from(data.flagsByCommand.keys()).sort((a, b) => a.localeCompare(b));

    for (const command of sortedCommands) {
      const commandFlags = Array.from(data.flagsByCommand.get(command) ?? []).sort((a, b) => a.localeCompare(b));
      if (commandFlags.length > 0) {
        flags[command] = commandFlags;
      }
    }

    const lines = Array.from(data.lines).sort((a, b) => a.localeCompare(b));

    fs.writeFileSync(storePath, `${JSON.stringify({ commands, flags, lines }, null, 2)}\n`, "utf8");
  } catch {
    // Ignore persistence errors; autocomplete should still work in-memory.
  }
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

function addRuntimeCommand(
  index: Array<{ command: string; source: CommandSource }>,
  command: string,
): Array<{ command: string; source: CommandSource }> {
  const normalized = command.trim();
  if (!normalized) return index;

  const existingIndex = index.findIndex((entry) => entry.command === normalized);
  if (existingIndex === -1) {
    return [...index, { command: normalized, source: "runtime" }];
  }

  const existing = index[existingIndex];
  if (existing?.source === "runtime") {
    return index;
  }

  const next = [...index];
  next[existingIndex] = { command: normalized, source: "runtime" };
  return next;
}

function rankCommands(commands: Array<{ command: string; source: CommandSource }>, query: string) {
  const q = query.toLowerCase();

  const startsWith = commands.filter((c) => c.command.toLowerCase().startsWith(q));
  const includes = commands.filter(
    (c) => !c.command.toLowerCase().startsWith(q) && c.command.toLowerCase().includes(q),
  );

  return [...startsWith, ...includes].slice(0, 24);
}

function rankFlags(flags: string[], query: string): string[] {
  const q = query.toLowerCase();
  const startsWith = flags.filter((flag) => flag.toLowerCase().startsWith(q));
  const includes = flags.filter((flag) => !flag.toLowerCase().startsWith(q) && flag.toLowerCase().includes(q));
  return [...startsWith, ...includes].slice(0, 24);
}

function rankLineCandidates(lines: string[], query: string): string[] {
  const q = query.toLowerCase();
  const startsWith = lines.filter((line) => line.toLowerCase().startsWith(q));
  const includes = lines.filter((line) => !line.toLowerCase().startsWith(q) && line.toLowerCase().includes(q));
  return [...startsWith, ...includes].slice(0, 24);
}

export default function bangCommandAutocomplete(pi: ExtensionAPI) {
  const includeHistory = envFlag("PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY", false);
  const runtimeStorePath = getRuntimeStorePath();
  const runtimeData = readRuntimeData(runtimeStorePath);
  const runtimeLearned = runtimeData.commands;
  const runtimeFlagsByCommand = runtimeData.flagsByCommand;
  const runtimeLearnedLines = runtimeData.lines;
  let commandIndex = buildCommandIndex(includeHistory);

  const learnFromCommandLine = (commandLine: string | undefined) => {
    if (!commandLine) return;
    const normalizedLine = commandLine.trim().replace(/^!+/, "");
    if (!normalizedLine) return;

    const parsed = parseCommandLine(commandLine);
    const executable = parsed.executable;
    if (!executable) return;

    let changed = false;

    const beforeSize = runtimeLearned.size;
    runtimeLearned.add(executable);
    commandIndex = addRuntimeCommand(commandIndex, executable);
    if (runtimeLearned.size !== beforeSize) {
      changed = true;
    }

    const beforeLines = runtimeLearnedLines.size;
    runtimeLearnedLines.add(normalizedLine);
    if (runtimeLearnedLines.size !== beforeLines) {
      changed = true;
    }

    if (parsed.flags.length > 0) {
      const flagSet = runtimeFlagsByCommand.get(executable) ?? new Set<string>();
      const beforeFlags = flagSet.size;
      for (const flag of parsed.flags) {
        flagSet.add(flag);
      }
      if (flagSet.size !== beforeFlags) {
        runtimeFlagsByCommand.set(executable, flagSet);
        changed = true;
      }
    }

    if (changed) {
      writeRuntimeData(runtimeStorePath, {
        commands: runtimeLearned,
        flagsByCommand: runtimeFlagsByCommand,
        lines: runtimeLearnedLines,
      });
    }
  };

  const refreshIndex = () => {
    commandIndex = buildCommandIndex(includeHistory);
    for (const command of runtimeLearned) {
      commandIndex = addRuntimeCommand(commandIndex, command);
    }
  };

  pi.on("session_start", (_event, ctx) => {
    refreshIndex();

    ctx.ui.addAutocompleteProvider((current) => ({
      async getSuggestions(lines, cursorLine, cursorCol, options) {
        const line = lines[cursorLine] ?? "";
        const beforeCursor = line.slice(0, cursorCol);

        const flagMatch = beforeCursor.match(/(?:^|[ \t])!([^\s!]+)\s+([^\s]*)$/);
        if (flagMatch) {
          const command = flagMatch[1] ?? "";
          const partialFlag = flagMatch[2] ?? "";

          if (partialFlag === "" || partialFlag.startsWith("-")) {
            const knownFlags = Array.from(runtimeFlagsByCommand.get(command) ?? []);
            const rankedFlags = rankFlags(knownFlags, partialFlag);

            if (rankedFlags.length > 0) {
              return {
                prefix: partialFlag,
                items: rankedFlags.map((flag) => ({
                  value: flag,
                  label: flag,
                  description: `learned for ${command}`,
                })),
              };
            }
          }
        }

        const fullLineMatch = beforeCursor.match(/(?:^|[ \t])!(.*)$/);
        if (fullLineMatch) {
          const partialLine = fullLineMatch[1] ?? "";
          if (partialLine.includes(" ")) {
            const rankedLines = rankLineCandidates(Array.from(runtimeLearnedLines), partialLine);
            if (rankedLines.length > 0) {
              return {
                prefix: `!${partialLine}`,
                items: rankedLines.map((lineCandidate) => ({
                  value: `!${lineCandidate}`,
                  label: `!${lineCandidate}`,
                  description: "learned full line",
                })),
              };
            }
          }
        }

        // Trigger on `!<command>` in the current token.
        const match = beforeCursor.match(/(?:^|[ \t])!([^\s!]*)$/);
        if (!match) {
          return current.getSuggestions(lines, cursorLine, cursorCol, options);
        }

        const partial = match[1] ?? "";
        const ranked = rankCommands(commandIndex, partial);

        const commandItems = ranked.map((entry) => ({
          value: `!${entry.command}`,
          label: `!${entry.command}`,
          description:
            entry.source === "history"
              ? "shell history"
              : entry.source === "runtime"
                ? "current session"
                : "common command",
        }));

        const commandWithFlagItems = ranked.flatMap((entry) => {
          const knownFlags = Array.from(runtimeFlagsByCommand.get(entry.command) ?? []);
          return knownFlags.slice(0, 3).map((flag) => ({
            value: `!${entry.command} ${flag}`,
            label: `!${entry.command} ${flag}`,
            description: "learned command + flag",
          }));
        });

        const fullLineItems = rankLineCandidates(Array.from(runtimeLearnedLines), partial)
          .map((lineCandidate) => ({
            value: `!${lineCandidate}`,
            label: `!${lineCandidate}`,
            description: "learned full line",
          }))
          .filter((item) => item.value.startsWith(`!${partial}`));

        return {
          prefix: `!${partial}`,
          items: [...fullLineItems, ...commandItems, ...commandWithFlagItems].slice(0, 24),
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
        if (
          beforeCursor.match(/(?:^|[ \t])![^\s!]*$/) ||
          beforeCursor.match(/(?:^|[ \t])![^\s!]+\s+[^\s]*$/)
        ) {
          return true;
        }

        return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
      },
    }));
  });

  pi.on("user_bash", (event) => {
    learnFromCommandLine(event.command);
  });

  // Compatibility with extensions that intercept user_bash and short-circuit
  // subsequent handlers (e.g. fish-user-bash).
  pi.events.on("fish-user-bash:executed", (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const command = (payload as { command?: unknown }).command;
    if (typeof command !== "string") return;
    learnFromCommandLine(command);
  });

  pi.registerCommand("bang-refresh", {
    description: "Refresh !command autocomplete index",
    handler: async (_args, ctx) => {
      refreshIndex();
      ctx.ui.notify(
        `Bang autocomplete refreshed (${commandIndex.length} commands, history ${includeHistory ? "enabled" : "disabled"}, runtime learned commands ${runtimeLearned.size}, learned lines ${runtimeLearnedLines.size}, learned flags ${Array.from(runtimeFlagsByCommand.values()).reduce((acc, set) => acc + set.size, 0)})`,
        "info",
      );
    },
  });

  pi.registerCommand("bang-status", {
    description: "Show !command autocomplete configuration",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `Bang autocomplete: ${commandIndex.length} commands · history ${includeHistory ? "enabled" : "disabled"} · runtime learned commands ${runtimeLearned.size} · learned lines ${runtimeLearnedLines.size} · learned flags ${Array.from(runtimeFlagsByCommand.values()).reduce((acc, set) => acc + set.size, 0)} (${includeHistory ? "PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY=1" : "set PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY=1 to enable"}) · store ${runtimeStorePath}`,
        "info",
      );
    },
  });
}
