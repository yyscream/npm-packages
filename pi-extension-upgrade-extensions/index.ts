import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getAgentSettingsPath } from "@firstpick/pi-utils";

type SettingsShape = { packages?: string[] };
type UpdateCandidate = { spec: string; name: string; latest: string };

function run(cwd: string, cmd: string): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn("bash", ["-lc", cmd], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += String(d)));
    child.stderr.on("data", (d) => (out += String(d)));
    child.on("close", (code) => resolvePromise({ ok: code === 0, out }));
  });
}

function parseNpmSpecifier(spec: string): { name: string } | undefined {
  if (!spec.startsWith("npm:")) return undefined;
  const raw = spec.slice(4).trim();
  if (!raw) return undefined;
  if (raw.startsWith("@")) {
    const at = raw.lastIndexOf("@");
    if (at > 0) return { name: raw.slice(0, at) };
    return { name: raw };
  }
  const at = raw.lastIndexOf("@");
  return { name: at > 0 ? raw.slice(0, at) : raw };
}

function renderSelector(items: UpdateCandidate[], selected: boolean[], cursor: number): string[] {
  return [
    "Extension updates (Space=toggle, a=all/none, Enter=confirm, Esc=cancel)",
    "",
    ...items.map((it, i) => `${i === cursor ? ">" : " "} ${selected[i] ? "[x]" : "[ ]"} ${it.name}@${it.latest}`),
  ];
}

async function selectUpdates(ctx: ExtensionCommandContext, items: UpdateCandidate[]): Promise<UpdateCandidate[] | undefined> {
  if (!ctx.hasUI) return items;

  const selected = items.map(() => false);
  let cursor = 0;
  const widgetKey = "extensions-update-picker";

  return await new Promise<UpdateCandidate[] | undefined>((resolvePromise) => {
    const cleanup = (result: UpdateCandidate[] | undefined) => {
      unsubscribe();
      ctx.ui.setWidget(widgetKey, undefined);
      resolvePromise(result);
    };

    const repaint = () => ctx.ui.setWidget(widgetKey, renderSelector(items, selected, cursor), { placement: "aboveEditor" });
    repaint();

    const unsubscribe = ctx.ui.onTerminalInput((data) => {
      if (data === "\u001b") return cleanup(undefined), { consume: true };
      if (data === "\r" || data === "\n") {
        const picks = items.filter((_, i) => selected[i]);
        return cleanup(picks), { consume: true };
      }
      if (data === "a" || data === "A") {
        const anyUnselected = selected.some((v) => !v);
        for (let i = 0; i < selected.length; i++) selected[i] = anyUnselected;
        repaint();
        return { consume: true };
      }
      if (data === " ") {
        selected[cursor] = !selected[cursor];
        repaint();
        return { consume: true };
      }
      if (data === "\u001b[A" || data === "k") {
        cursor = cursor > 0 ? cursor - 1 : items.length - 1;
        repaint();
        return { consume: true };
      }
      if (data === "\u001b[B" || data === "j") {
        cursor = cursor < items.length - 1 ? cursor + 1 : 0;
        repaint();
        return { consume: true };
      }
      return undefined;
    });
  });
}

export default function upgradeExtensions(pi: ExtensionAPI) {
  pi.registerCommand("extensions-update", {
    description: "Check and update npm-installed Pi extensions (use 'all' to update all without selection)",
    handler: async (args, ctx) => {
      const updateAll = args?.trim().toLowerCase() === "all";
      const settingsPath = getAgentSettingsPath();
      let settings: SettingsShape = {};
      try {
        settings = JSON.parse(await readFile(settingsPath, "utf8")) as SettingsShape;
      } catch {
        ctx.ui.notify(`Could not read ${settingsPath}`, "error");
        return;
      }

      const npmSpecs = (settings.packages ?? []).filter((p) => p.startsWith("npm:"));
      if (npmSpecs.length === 0) {
        ctx.ui.notify("No npm: package entries found in ~/.pi/agent/settings.json (packages).", "warning");
        return;
      }

      const candidates: UpdateCandidate[] = [];
      for (const spec of npmSpecs) {
        const parsed = parseNpmSpecifier(spec);
        if (!parsed) continue;

        const current = await run(ctx.cwd, `npm view ${parsed.name} version --json`);
        if (!current.ok) {
          ctx.ui.notify(`Skip ${parsed.name}: failed to query latest version`, "warning");
          continue;
        }
        const latest = current.out.trim().replace(/^"|"$/g, "");

        const installedRes = await run(ctx.cwd, `pi install ${spec} --dry-run`);
        const isUpToDate = /already installed|up to date|no changes/i.test(installedRes.out);
        if (isUpToDate) continue;

        candidates.push({ spec, name: parsed.name, latest });
      }

      if (candidates.length === 0) {
        ctx.ui.notify("All npm-installed extensions are up-to-date.", "info");
        return;
      }

      const selected = updateAll ? candidates : await selectUpdates(ctx, candidates);
      if (!selected) {
        ctx.ui.notify("Update cancelled.", "info");
        return;
      }
      if (selected.length === 0) {
        ctx.ui.notify("No extensions selected.", "warning");
        return;
      }

      let updated = 0;
      for (const ext of selected) {
        ctx.ui.notify(`Updating ${ext.name} -> latest`, "info");
        const install = await run(ctx.cwd, `pi install npm:${ext.name}@latest`);
        if (!install.ok) {
          ctx.ui.notify(`Failed to update ${ext.name}`, "error");
          continue;
        }
        updated += 1;
        ctx.ui.notify(`Updated ${ext.name}@${ext.latest}`, "success");
      }

      ctx.ui.notify(`extensions-update finished. Updated: ${updated}/${selected.length}`, "info");
      if (updated > 0) {
        const reload = await ctx.ui.select("Reload Pi now?", ["Yes", "No"]);
        if (reload === "Yes") await ctx.reload();
      }
    },
  });
}
