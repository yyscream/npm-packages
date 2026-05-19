import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getSettingsListTheme, type ExtensionAPI, type ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { Container, Input, Key, matchesKey, type SettingItem, SettingsList, truncateToWidth } from "@earendil-works/pi-tui";

const DEFAULT_DIR = "/mnt/SSD_NVME/LEARNINGS";
const DEFAULT_TIMER = "20:00";
const DEFAULT_INSTALL_SCRIPTS = true;
const DEFAULT_CREATE_README = true;
const DEFAULT_GENERATE_SUMMARY = true;
const DEFAULT_BACKUP_EXISTING = true;

function packageRoot(): string {
  const candidates = [
    __dirname,
    path.join(process.cwd(), "pi-package-learnings"),
    path.join(os.homedir(), "npm-packages", "pi-package-learnings"),
    path.join(os.homedir(), ".bun", "install", "global", "node_modules", "pi-package-learnings"),
  ];
  const root = candidates.find((candidate) => fs.existsSync(path.join(candidate, "scripts", "sync-learnings.py")));
  return root || __dirname;
}

function agentDir(): string {
  return path.join(os.homedir(), ".pi", "agent");
}

function envPath(): string {
  return path.join(agentDir(), "learnings.env");
}

function symlinkPath(): string {
  return path.join(agentDir(), "LEARNINGS");
}

function systemdUserDir(): string {
  return path.join(os.homedir(), ".config", "systemd", "user");
}

function readConfiguredDir(): string | undefined {
  const envFile = envPath();
  if (!fs.existsSync(envFile)) return undefined;
  const raw = fs.readFileSync(envFile, "utf8");
  const match = raw.match(/^LEARNINGS_DIR=(.*)$/m);
  return match?.[1]?.trim() || undefined;
}

function parseArgs(args: string): { dir?: string; timer?: string; noTimer: boolean; check: boolean } {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const result = { dir: undefined as string | undefined, timer: undefined as string | undefined, noTimer: false, check: false };
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === "--dir") result.dir = parts[++i];
    else if (part.startsWith("--dir=")) result.dir = part.slice("--dir=".length);
    else if (part === "--timer") result.timer = parts[++i];
    else if (part.startsWith("--timer=")) result.timer = part.slice("--timer=".length);
    else if (part === "--no-timer") result.noTimer = true;
    else if (part === "--check") result.check = true;
  }
  return result;
}

function normalizeDir(input: string): string {
  const expanded = input.startsWith("~/") ? path.join(os.homedir(), input.slice(2)) : input;
  return path.resolve(expanded);
}

function validTimerTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

type SetupSettings = {
  targetDir: string;
  envFile: string;
  stableSymlink: string;
  timer: string;
  useTimer: boolean;
  installScripts: boolean;
  createReadme: boolean;
  generateSummary: boolean;
  backupExisting: boolean;
};

async function configureSetupSettings(
  ctx: ExtensionCommandContext,
  initial: SetupSettings,
): Promise<SetupSettings | undefined> {
  const values = { ...initial };
  let cancelled = false;

  await ctx.ui.custom((tui, theme, _keybindings, done) => {
    let submenuActive = false;
    const inputSubmenu = (label: string, fallbackValue: string, getInitialValue?: () => string) => (currentValue: string, submit: (selectedValue?: string) => void) => {
      submenuActive = true;
      const initialValue = getInitialValue?.() || currentValue.replace(/\s*->.*$/, "") || fallbackValue;
      const input = new Input();
      input.setValue(initialValue);
      input.onSubmit = (value) => {
        submenuActive = false;
        submit(value.trim() || initialValue);
      };
      input.onEscape = () => {
        submenuActive = false;
        submit(undefined);
      };
      return {
        render(width: number) {
          return [
            truncateToWidth(theme.fg("accent", theme.bold(`Edit ${label}`)), width, ""),
            truncateToWidth(theme.fg("dim", "Enter saves input · Esc cancels input"), width, ""),
            "",
            ...input.render(width),
          ];
        },
        invalidate() {},
        handleInput(data: string) {
          input.handleInput(data);
        },
      };
    };

    const items: SettingItem[] = [
      { id: "targetDir", label: "Archive directory", currentValue: values.targetDir, submenu: inputSubmenu("Archive directory", values.targetDir) },
      { id: "envFile", label: "Env file", currentValue: values.envFile, submenu: inputSubmenu("Env file", values.envFile) },
      { id: "stableSymlink", label: "Stable symlink", currentValue: `${values.stableSymlink} -> ${values.targetDir}`, submenu: inputSubmenu("Stable symlink target directory", values.targetDir, () => values.targetDir) },
      { id: "timer", label: "Daily timer", currentValue: values.useTimer ? values.timer : "disabled", values: [values.timer, "disabled"], submenu: inputSubmenu("Daily timer", values.useTimer ? values.timer : "disabled") },
      { id: "installScripts", label: "Install scripts into archive", currentValue: yesNo(values.installScripts), values: ["yes", "no"] },
      { id: "createReadme", label: "Create README if missing", currentValue: yesNo(values.createReadme), values: ["yes", "no"] },
      { id: "generateSummary", label: "Generate summary/index now", currentValue: yesNo(values.generateSummary), values: ["yes", "no"] },
      { id: "backupExisting", label: "Back up existing replaced files", currentValue: yesNo(values.backupExisting), values: ["yes", "no"] },
      { id: "notes", label: "Existing troubleshooting notes", currentValue: "keep", values: ["keep", "skip"] },
      { id: "notifications", label: "Sync notifications", currentValue: "yes if notify-send exists", values: ["yes if notify-send exists", "no"] },
    ];

    const container = new Container();
    container.addChild(
      new (class {
        render(width: number) {
          return [
            truncateToWidth(theme.fg("accent", theme.bold("LEARNINGS setup settings")), width, ""),
            truncateToWidth(theme.fg("dim", "Toggle yes/no values in the right column."), width, ""),
            "",
          ];
        }
        invalidate() {}
      })(),
    );

    const settingsTheme = getSettingsListTheme();
    let settingsList: SettingsList;
    settingsList = new SettingsList(
      items,
      Math.min(items.length + 2, 20),
      {
        ...settingsTheme,
        hint: (text) => text.includes("Enter/Space to change") ? "" : settingsTheme.hint(text),
      },
      (id, newValue) => {
        const enabled = newValue === "yes";
        if (id === "targetDir") values.targetDir = normalizeDir(newValue);
        else if (id === "envFile") values.envFile = normalizeDir(newValue);
        else if (id === "stableSymlink") values.targetDir = normalizeDir(newValue.replace(/\s*->.*$/, ""));
        else if (id === "timer") {
          const lowered = newValue.toLowerCase();
          values.useTimer = !(lowered === "disabled" || lowered === "none" || lowered === "no" || lowered === "skip");
          if (values.useTimer) values.timer = newValue;
        }
        else if (id === "installScripts") values.installScripts = enabled;
        else if (id === "createReadme") values.createReadme = enabled;
        else if (id === "generateSummary") values.generateSummary = enabled;
        else if (id === "backupExisting") values.backupExisting = enabled;

        settingsList.updateValue("targetDir", values.targetDir);
        settingsList.updateValue("envFile", values.envFile);
        settingsList.updateValue("stableSymlink", `${values.stableSymlink} -> ${values.targetDir}`);
        settingsList.updateValue("timer", values.useTimer ? values.timer : "disabled");
      },
      () => {
        cancelled = true;
        done(undefined);
      },
    );

    container.addChild(settingsList);
    container.addChild(
      new (class {
        render(width: number) {
          return [
            truncateToWidth(theme.fg("dim", "  ↑/↓ or j/k move · Enter/Space change/edit · Ctrl+S save setup · Esc/Ctrl+C cancel"), width, ""),
          ];
        }
        invalidate() {}
      })(),
    );

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        if (!submenuActive && matchesKey(data, Key.ctrl("s"))) done(undefined);
        else if (!submenuActive && data === "j") settingsList.handleInput?.("\u001b[B");
        else if (!submenuActive && data === "k") settingsList.handleInput?.("\u001b[A");
        else settingsList.handleInput?.(data);
        tui.requestRender();
      },
    };
  });

  return cancelled ? undefined : values;
}

function backupPath(filePath: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  let candidate = `${filePath}.pre-learnings-setup.${stamp}.bak`;
  let i = 1;
  while (fs.existsSync(candidate)) candidate = `${filePath}.pre-learnings-setup.${stamp}.bak.${i++}`;
  return candidate;
}

function replaceWithSymlink(dest: string, target: string, backupExisting: boolean, lines: string[]): void {
  if (fs.existsSync(dest) || fs.lstatSync(path.dirname(dest)).isDirectory() && fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) fs.rmSync(dest, { force: true });
    else if (backupExisting) {
      const backup = backupPath(dest);
      fs.renameSync(dest, backup);
      lines.push(`Backed up ${dest} -> ${backup}`);
    } else {
      fs.rmSync(dest, { recursive: true, force: true });
      lines.push(`Replaced existing ${dest}`);
    }
  }
  fs.symlinkSync(target, dest);
}

function copyScript(name: string, targetDir: string): void {
  const src = path.join(packageRoot(), "scripts", name);
  const dest = path.join(targetDir, name);
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

function ensureArchiveReadme(targetDir: string): void {
  const readme = path.join(targetDir, "README.md");
  if (fs.existsSync(readme)) return;
  fs.writeFileSync(readme, `# LEARNINGS\n\nCanonical troubleshooting learnings archive for Pi agents.\n\nConfigured root: \`${targetDir}\`\n\nRun:\n\n\`\`\`bash\n~/.pi/agent/bin/learnings-summary\n\`\`\`\n`, "utf8");
}

function writeSystemdUnits(timer: string): void {
  const dir = systemdUserDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sync-learnings.service"), `[Unit]\nDescription=Sync Pi LEARNINGS archive\n\n[Service]\nType=oneshot\nEnvironmentFile=-%h/.pi/agent/learnings.env\nExecStart=%h/.pi/agent/bin/learnings-sync\n`, "utf8");
  fs.writeFileSync(path.join(dir, "sync-learnings.timer"), `[Unit]\nDescription=Daily Pi LEARNINGS archive sync\n\n[Timer]\nOnCalendar=*-*-* ${timer}:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n`, "utf8");
}

function run(command: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 20_000 }, (error, stdout, stderr) => {
      resolve({ code: error && "code" in error ? Number(error.code) : 0, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
    });
  });
}

async function maybeEnableTimer(timer: string, lines: string[]): Promise<void> {
  writeSystemdUnits(timer);
  lines.push(`Wrote systemd user timer for ${timer}`);

  const daemon = await run("systemctl", ["--user", "daemon-reload"]);
  if (daemon.code !== 0) {
    lines.push(`WARN: systemctl --user daemon-reload failed: ${daemon.stderr.trim() || daemon.stdout.trim()}`);
    return;
  }
  const enable = await run("systemctl", ["--user", "enable", "--now", "sync-learnings.timer"]);
  if (enable.code !== 0) {
    lines.push(`WARN: enabling sync-learnings.timer failed: ${enable.stderr.trim() || enable.stdout.trim()}`);
    return;
  }
  const list = await run("systemctl", ["--user", "list-timers", "sync-learnings.timer", "--all", "--no-pager"]);
  lines.push("Timer enabled and active.");
  if (list.stdout.trim()) lines.push(list.stdout.trim());
}

function healthLines(targetDir: string): string[] {
  const files = ["README.md", "INDEX.md", "manifest.json", "LEARNINGS-SUMMARY.md", "sync-learnings.py", "summarize-learnings.py", "run-sync-with-notification.sh"];
  const lines = [`Archive: ${targetDir}`, `Env: ${envPath()}`, `Symlink: ${symlinkPath()}`];
  for (const file of files) lines.push(`${fs.existsSync(path.join(targetDir, file)) ? "OK" : "MISSING"} ${file}`);
  for (const dir of ["archive", "logs"]) lines.push(`${fs.existsSync(path.join(targetDir, dir)) ? "OK" : "MISSING"} ${dir}/`);
  return lines;
}

async function setup(args: string, ctx: ExtensionCommandContext): Promise<void> {
  const parsed = parseArgs(args);
  const configured = readConfiguredDir();
  let targetDir = parsed.dir;

  if (parsed.check) {
    const dir = normalizeDir(targetDir || configured || DEFAULT_DIR);
    ctx.ui.notify(healthLines(dir).join("\n"), "info");
    return;
  }

  targetDir = normalizeDir(targetDir || configured || DEFAULT_DIR);

  let useTimer = !parsed.noTimer;
  let timer = parsed.timer || DEFAULT_TIMER;
  let installScripts = DEFAULT_INSTALL_SCRIPTS;
  let createReadme = DEFAULT_CREATE_README;
  let generateSummary = DEFAULT_GENERATE_SUMMARY;
  let backupExisting = DEFAULT_BACKUP_EXISTING;

  const configuredSettings = await configureSetupSettings(ctx, {
    targetDir,
    envFile: envPath(),
    stableSymlink: symlinkPath(),
    timer,
    useTimer,
    installScripts,
    createReadme,
    generateSummary,
    backupExisting,
  });
  if (!configuredSettings) {
    ctx.ui.notify("LEARNINGS setup cancelled.", "warning");
    return;
  }
  targetDir = configuredSettings.targetDir;
  const configuredEnvPath = configuredSettings.envFile;
  const configuredSymlinkPath = configuredSettings.stableSymlink;
  useTimer = configuredSettings.useTimer;
  timer = configuredSettings.timer;
  installScripts = configuredSettings.installScripts;
  createReadme = configuredSettings.createReadme;
  generateSummary = configuredSettings.generateSummary;
  backupExisting = configuredSettings.backupExisting;

  if (useTimer && !validTimerTime(timer)) {
    ctx.ui.notify(`Invalid timer time '${timer}'. Use HH:MM, e.g. 20:00.`, "error");
    return;
  }

  const lines: string[] = [];
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, "archive"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "logs"), { recursive: true });
  lines.push(`Created/verified ${targetDir}`);

  fs.mkdirSync(path.dirname(configuredEnvPath), { recursive: true });
  fs.writeFileSync(configuredEnvPath, `LEARNINGS_DIR=${targetDir}\n`, "utf8");
  lines.push(`Wrote ${configuredEnvPath}`);

  fs.mkdirSync(path.dirname(configuredSymlinkPath), { recursive: true });
  replaceWithSymlink(configuredSymlinkPath, targetDir, backupExisting, lines);
  lines.push(`Linked ${configuredSymlinkPath} -> ${targetDir}`);

  if (installScripts) {
    for (const script of ["sync-learnings.py", "summarize-learnings.py", "run-sync-with-notification.sh"]) copyScript(script, targetDir);
    lines.push("Installed archive scripts");
  } else {
    lines.push("Skipped archive script install");
  }

  if (createReadme) {
    ensureArchiveReadme(targetDir);
    lines.push("Created/verified archive README");
  }

  if (generateSummary) {
    const summary = await run(path.join(packageRoot(), "scripts", "learnings-summary"), []);
    if (summary.code === 0) lines.push(`Generated summary: ${summary.stdout.trim()}`);
    else lines.push(`WARN: summary generation failed: ${summary.stderr.trim() || summary.stdout.trim()}`);
  } else {
    lines.push("Skipped summary generation");
  }

  if (useTimer) await maybeEnableTimer(timer, lines);

  lines.push("", ...healthLines(targetDir));
  ctx.ui.notify(lines.join("\n"), "info");
}

export default function learningsExtension(pi: ExtensionAPI): void {
  pi.registerCommand("learnings-setup", {
    description: "Interactively configure the LEARNINGS archive, symlink/env, scripts, summary, and optional daily timer. Usage: /learnings-setup [--dir PATH] [--timer HH:MM|--no-timer] [--check]",
    handler: setup,
  });
}
