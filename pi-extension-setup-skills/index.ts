import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder, getAgentDir, getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, getKeybindings, Key, matchesKey, type SettingItem, SettingsList, Text } from "@earendil-works/pi-tui";

type PackageEntry = string | { source?: string; skills?: string[]; extensions?: string[]; prompts?: string[]; [key: string]: unknown };
type SettingsShape = { packages?: PackageEntry[]; skills?: string[]; [key: string]: unknown };

function getAgentSettingsPath(): string {
  return join(getAgentDir(), "settings.json");
}

type SkillCandidate = {
  name: string;
  description: string;
  skillPath: string;
  enableKind: "settings-skill" | "package" | "package-skill";
  enablePath: string;
  packageSource?: string;
  packageSkillName?: string;
};

function readJson(path: string): SettingsShape {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as SettingsShape;
}

function writeJson(path: string, data: SettingsShape): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function walkSkillFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      let st;
      try {
        st = statSync(path);
      } catch {
        continue;
      }
      if (st.isDirectory()) visit(path);
      else if (entry === "SKILL.md") out.push(path);
    }
  };
  visit(root);
  return out;
}

function parseSkill(path: string): { name: string; description: string } | undefined {
  const text = readFileSync(path, "utf8");
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) return undefined;
  const name = frontmatter[1].match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!name) return undefined;
  return { name, description };
}

function packageSource(entry: PackageEntry): string | undefined {
  return typeof entry === "string" ? entry : entry.source;
}

function stripNpmVersion(spec: string): string {
  if (spec.startsWith("@")) {
    const at = spec.lastIndexOf("@");
    return at > 0 ? spec.slice(0, at) : spec;
  }
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

function expandTilde(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function resolveConfiguredPath(path: string, baseDir: string): string {
  const expanded = expandTilde(path);
  return isAbsolute(expanded) ? resolve(expanded) : resolve(baseDir, expanded);
}

function resolvePackageInstallDir(source: string, settingsDir: string): string | undefined {
  if (source.startsWith("npm:")) {
    const name = stripNpmVersion(source.slice(4));
    return join(getAgentDir(), "npm", "node_modules", ...name.split("/"));
  }
  if (source.startsWith("git:") || source.startsWith("http://") || source.startsWith("https://") || source.startsWith("ssh://")) {
    return undefined;
  }
  return resolveConfiguredPath(source, settingsDir);
}

function discoverPackageSkills(packageDir: string, source: string, candidates: Map<string, SkillCandidate>): void {
  if (!existsSync(packageDir)) return;
  for (const skillPath of walkSkillFiles(join(packageDir, "skills"))) {
    const parsed = parseSkill(skillPath);
    if (!parsed) continue;
    candidates.set(parsed.name, {
      ...parsed,
      skillPath,
      enableKind: "package-skill",
      enablePath: packageDir,
      packageSource: source,
      packageSkillName: parsed.name,
    });
  }
}

function addLocalSkills(root: string, candidates: Map<string, SkillCandidate>): void {
  for (const skillPath of walkSkillFiles(root)) {
    const parsed = parseSkill(skillPath);
    if (!parsed) continue;
    candidates.set(parsed.name, {
      ...parsed,
      skillPath,
      enableKind: "settings-skill",
      enablePath: skillPath,
    });
  }
}

function discoverProjectSkillRoots(cwd: string): string[] {
  const roots: string[] = [];
  let current = resolve(cwd);
  while (true) {
    roots.push(join(current, ".pi", "skills"), join(current, ".agents", "skills"));
    if (existsSync(join(current, ".git"))) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return roots;
}

function discoverCandidates(settings: SettingsShape, cwd: string): SkillCandidate[] {
  const candidates = new Map<string, SkillCandidate>();

  for (const root of [join(getAgentDir(), "skills"), join(homedir(), ".agents", "skills"), ...discoverProjectSkillRoots(cwd)]) {
    addLocalSkills(root, candidates);
  }

  const settingsDir = dirname(getAgentSettingsPath());
  for (const entry of settings.packages ?? []) {
    const source = packageSource(entry);
    if (!source) continue;
    const packageDir = resolvePackageInstallDir(source, settingsDir);
    if (!packageDir) continue;
    discoverPackageSkills(packageDir, source, candidates);
  }

  return [...candidates.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName || (a.packageSource ?? a.enablePath).localeCompare(b.packageSource ?? b.enablePath);
  });
}

function normalizePath(path: string): string {
  return resolve(path);
}

function isEnabled(candidate: SkillCandidate, settings: SettingsShape): boolean {
  if (candidate.enableKind === "package-skill") {
    const source = candidate.packageSource;
    const skillName = candidate.packageSkillName;
    if (!source || !skillName) return false;
    const entry = (settings.packages ?? []).find((pkg) => packageSource(pkg) === source);
    if (!entry) return false;
    if (typeof entry === "string" || entry.skills === undefined) return true;
    return entry.skills.includes(skillName);
  }

  if (candidate.enableKind === "package") {
    const target = normalizePath(candidate.enablePath);
    return (settings.packages ?? []).some((entry) => {
      const source = packageSource(entry);
      return source ? normalizePath(source) === target : false;
    });
  }

  const skillSettings = settings.skills ?? [];
  if (skillSettings.length === 0) return true;

  const direct = normalizePath(candidate.enablePath);
  const plusDirect = `+${direct}`;
  return skillSettings.some((entry) => {
    if (entry === plusDirect) return true;
    if (entry.startsWith("!") || entry.startsWith("-")) return false;
    const raw = entry.startsWith("+") ? entry.slice(1) : entry;
    return normalizePath(raw) === direct || normalizePath(raw) === normalizePath(dirname(direct));
  });
}

function applySelection(settings: SettingsShape, candidates: SkillCandidate[], selected: boolean[]): SettingsShape {
  const next: SettingsShape = { ...settings };
  const packageTargets = new Set(candidates.filter((c) => c.enableKind === "package").map((c) => normalizePath(c.enablePath)));
  const skillTargets = new Set(candidates.filter((c) => c.enableKind === "settings-skill").map((c) => normalizePath(c.enablePath)));
  const managedPackageSources = new Set(
    candidates.filter((c) => c.enableKind === "package-skill" && c.packageSource).map((c) => c.packageSource!),
  );

  const selectedPackageSkills = new Map<string, string[]>();
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (candidate.enableKind !== "package-skill" || !candidate.packageSource || !candidate.packageSkillName || !selected[i]) continue;
    const list = selectedPackageSkills.get(candidate.packageSource) ?? [];
    list.push(candidate.packageSkillName);
    selectedPackageSkills.set(candidate.packageSource, list);
  }

  next.packages = (next.packages ?? [])
    .filter((entry) => {
      const source = packageSource(entry);
      return !source || !packageTargets.has(normalizePath(source));
    })
    .map((entry) => {
      const source = packageSource(entry);
      if (!source || !managedPackageSources.has(source)) return entry;
      const selectedSkills = selectedPackageSkills.get(source) ?? [];
      const base = typeof entry === "string" ? { source: entry } : { ...entry, source };
      return { ...base, skills: selectedSkills.sort() };
    });

  const existingSkillFilters = (next.skills ?? []).filter((entry) => {
    if (entry === "!**") return false;
    const raw = entry.startsWith("+") || entry.startsWith("-") ? entry.slice(1) : entry;
    return !skillTargets.has(normalizePath(raw));
  });
  next.skills = ["!**", ...existingSkillFilters];

  for (let i = 0; i < candidates.length; i++) {
    if (!selected[i]) continue;
    const candidate = candidates[i];
    if (candidate.enableKind === "package") next.packages.push(candidate.enablePath);
    else if (candidate.enableKind === "settings-skill") next.skills.push(`+${candidate.enablePath}`);
  }

  return next;
}

async function selectSkills(
  ctx: ExtensionCommandContext,
  candidates: SkillCandidate[],
  initialSelected: boolean[],
): Promise<boolean[] | undefined> {
  if (!ctx.hasUI) return initialSelected;

  return await ctx.ui.custom<boolean[] | undefined>((tui, theme, _kb, done) => {
    const selected = [...initialSelected];
    const items: SettingItem[] = candidates.map((candidate, index) => ({
      id: String(index),
      label: candidate.name,
      description: `${candidate.packageSource ?? (candidate.enableKind === "package" ? "package" : "local")}: ${candidate.description}`,
      currentValue: selected[index] ? "enabled" : "disabled",
      values: ["enabled", "disabled"],
    }));

    const container = new Container();
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    container.addChild(new Text(theme.fg("accent", theme.bold("Skills")), 0, 0));

    const settingsList = new SettingsList(
      items,
      12,
      getSettingsListTheme(),
      (id, newValue) => {
        selected[Number(id)] = newValue === "enabled";
      },
      () => done(undefined),
      { enableSearch: true },
    );

    container.addChild(settingsList);
    container.addChild(new Text(theme.fg("dim", "  Ctrl+S save • q cancel"), 0, 0));
    container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        if (data === "q") {
          done(undefined);
          return;
        }
        const kb = getKeybindings();
        if (kb.matches(data, "app.models.save") || matchesKey(data, Key.ctrl("s")) || data === "\x13") {
          done(selected);
          return;
        }
        settingsList.handleInput(data);
        tui.requestRender();
      },
    };
  });
}

export default function setupSkillsExtension(pi: ExtensionAPI): void {
  pi.registerCommand("skills", {
    description: "Enable/disable local Pi skills with a multi-selection list",
    handler: async (_args, ctx) => {
      const settingsPath = getAgentSettingsPath();
      let settings: SettingsShape;
      try {
        settings = readJson(settingsPath);
      } catch (error) {
        ctx.ui.notify(`Could not read ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`, "error");
        return;
      }

      const candidates = discoverCandidates(settings, ctx.cwd);
      if (candidates.length === 0) {
        ctx.ui.notify("No skills found.", "warning");
        return;
      }

      const initial = candidates.map((candidate) => isEnabled(candidate, settings));
      const selected = await selectSkills(ctx, candidates, initial);
      if (!selected) {
        ctx.ui.notify("Skill setup cancelled.", "info");
        return;
      }

      try {
        writeJson(settingsPath, applySelection(settings, candidates, selected));
      } catch (error) {
        ctx.ui.notify(`Could not write ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`, "error");
        return;
      }

      const changed = candidates.filter((_, i) => initial[i] !== selected[i]).length;
      ctx.ui.notify(`Skill setup saved (${changed} changed).`, "info");
      if (changed > 0 && ctx.hasUI) {
        const reload = await ctx.ui.select("Reload Pi now to apply skill changes?", ["Yes", "No"]);
        if (reload === "Yes") await ctx.reload();
      }
    },
  });
}
