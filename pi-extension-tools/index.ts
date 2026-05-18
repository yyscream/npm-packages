import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, type SettingItem, SettingsList } from "@earendil-works/pi-tui";

type ToolsState = {
  enabledTools: string[];
};

type ToolsFileState = {
  active: string[];
  inactive: string[];
};

const CUSTOM_TYPE = "tools-config";
const TOOLS_STATE_PATH = join(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"), "tools.json");

function sourceLabel(tool: ToolInfo): string {
  const source = tool.sourceInfo?.source ?? "unknown";
  if (source === "builtin") return "Pi built-in";
  if (source === "sdk") return "SDK custom tools";
  return source.replace(/^extension:/, "");
}

function formatToolList(allTools: ToolInfo[], enabledTools: Set<string>): string {
  const groups = new Map<string, ToolInfo[]>();
  for (const tool of allTools) {
    const label = sourceLabel(tool);
    const group = groups.get(label) ?? [];
    group.push(tool);
    groups.set(label, group);
  }

  const lines = [`Tools: ${enabledTools.size}/${allTools.length} active`];
  for (const [source, tools] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push("", source);
    for (const tool of tools.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`  ${enabledTools.has(tool.name) ? "✓" : "·"} ${tool.name}`);
    }
  }
  return lines.join("\n");
}

function parseToolNames(args: string): string[] {
  return args
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function toolsExtension(pi: ExtensionAPI) {
  let enabledTools: Set<string> = new Set();
  let allTools: ToolInfo[] = [];

  function refreshToolList() {
    allTools = pi.getAllTools();
  }

  function getSortedToolNames() {
    return allTools.map((tool) => tool.name).sort();
  }

  function readFileState(): string[] | undefined {
    try {
      if (!existsSync(TOOLS_STATE_PATH)) return undefined;
      const parsed = JSON.parse(readFileSync(TOOLS_STATE_PATH, "utf8")) as Partial<ToolsFileState>;
      return Array.isArray(parsed.active) ? parsed.active.filter((name) => typeof name === "string") : undefined;
    } catch (error) {
      console.warn(`Failed to read ${TOOLS_STATE_PATH}:`, error);
      return undefined;
    }
  }

  function persistFileState() {
    const allToolNames = getSortedToolNames();
    const active = allToolNames.filter((name) => enabledTools.has(name));
    const inactive = allToolNames.filter((name) => !enabledTools.has(name));
    const state: ToolsFileState = { active, inactive };

    try {
      mkdirSync(dirname(TOOLS_STATE_PATH), { recursive: true });
      writeFileSync(TOOLS_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    } catch (error) {
      console.warn(`Failed to write ${TOOLS_STATE_PATH}:`, error);
    }
  }

  function persistState() {
    pi.appendEntry<ToolsState>(CUSTOM_TYPE, {
      enabledTools: Array.from(enabledTools).sort(),
    });
    persistFileState();
  }

  function applyTools() {
    pi.setActiveTools(Array.from(enabledTools));
  }

  function restoreFromBranch(ctx: ExtensionContext) {
    refreshToolList();
    const allToolNames = new Set(allTools.map((tool) => tool.name));
    let savedTools: string[] | undefined;

    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "custom" || entry.customType !== CUSTOM_TYPE) continue;
      const data = entry.data as ToolsState | undefined;
      if (data?.enabledTools) savedTools = data.enabledTools;
    }

    const fileTools = readFileState();
    const toolsToRestore = fileTools ?? savedTools;

    if (toolsToRestore) {
      enabledTools = new Set(toolsToRestore.filter((name) => allToolNames.has(name)));
      applyTools();
    } else {
      enabledTools = new Set(pi.getActiveTools());
      persistFileState();
    }
  }

  function mutateTools(args: string, enable: boolean): string {
    refreshToolList();
    const allToolNames = new Set(allTools.map((tool) => tool.name));
    const names = parseToolNames(args);
    const unknown = names.filter((name) => !allToolNames.has(name));
    const known = names.filter((name) => allToolNames.has(name));

    for (const name of known) {
      if (enable) enabledTools.add(name);
      else enabledTools.delete(name);
    }
    applyTools();
    persistState();

    const action = enable ? "Enabled" : "Disabled";
    const parts = [`${action}: ${known.length > 0 ? known.join(", ") : "none"}`];
    if (unknown.length > 0) parts.push(`Unknown: ${unknown.join(", ")}`);
    parts.push(`${enabledTools.size}/${allTools.length} active`);
    return parts.join("\n");
  }

  pi.registerCommand("tools", {
    description: "Manage active tools. Usage: /tools, /tools list, /tools enable <name...>, /tools disable <name...>, /tools reset",
    handler: async (args, ctx) => {
      refreshToolList();
      const trimmed = args.trim();
      const [subcommand = ""] = trimmed.split(/\s+/, 1);
      const rest = trimmed.slice(subcommand.length).trim();

      if (subcommand === "list") {
        ctx.ui.notify(formatToolList(allTools, enabledTools), "info");
        return;
      }

      if (subcommand === "enable") {
        ctx.ui.notify(mutateTools(rest, true), "info");
        return;
      }

      if (subcommand === "disable") {
        ctx.ui.notify(mutateTools(rest, false), "info");
        return;
      }

      if (subcommand === "reset") {
        enabledTools = new Set(allTools.map((tool) => tool.name));
        applyTools();
        persistState();
        ctx.ui.notify(`Enabled all ${enabledTools.size} tools.`, "info");
        return;
      }

      if (trimmed.length > 0) {
        ctx.ui.notify("Usage: /tools, /tools list, /tools enable <name...>, /tools disable <name...>, /tools reset", "warning");
        return;
      }

      await ctx.ui.custom((tui, theme, _kb, done) => {
        const items: SettingItem[] = allTools
          .slice()
          .sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b)) || a.name.localeCompare(b.name))
          .map((tool) => ({
            id: tool.name,
            label: `${tool.name} (${sourceLabel(tool)})`,
            currentValue: enabledTools.has(tool.name) ? "enabled" : "disabled",
            values: ["enabled", "disabled"],
          }));

        const container = new Container();
        container.addChild(
          new (class {
            render() {
              return [theme.fg("accent", theme.bold(`Tool Configuration (${enabledTools.size}/${allTools.length} active)`)), ""];
            }
            invalidate() {}
          })(),
        );

        const settingsList = new SettingsList(
          items,
          Math.min(items.length + 2, 20),
          getSettingsListTheme(),
          (id, newValue) => {
            if (newValue === "enabled") enabledTools.add(id);
            else enabledTools.delete(id);
            applyTools();
            persistState();
          },
          () => done(undefined),
        );

        container.addChild(settingsList);

        return {
          render(width: number) {
            return container.render(width);
          },
          invalidate() {
            container.invalidate();
          },
          handleInput(data: string) {
            settingsList.handleInput?.(data);
            tui.requestRender();
          },
        };
      });
    },
  });

  pi.on("session_start", async (_event, ctx) => restoreFromBranch(ctx));
  pi.on("session_tree", async (_event, ctx) => restoreFromBranch(ctx));
}
