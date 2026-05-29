import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_REPORT_PATH = "/tmp/pi-skill-bank-audit.md";

export type PackageEntry =
  | string
  | {
      source?: string;
      skills?: string[];
      extensions?: string[];
      prompts?: string[];
      [key: string]: unknown;
    };

export type SettingsShape = {
  packages?: PackageEntry[];
  skills?: string[];
  [key: string]: unknown;
};

export type RiskLevel = "low" | "medium" | "high";

export type SkillRecord = {
  name: string;
  description: string;
  skillPath: string;
  realSkillPath: string;
  packagePath: string;
  packageSource?: string;
  sources: string[];
  pathAliases: string[];
  enabled: boolean;
  enabledReason: string;
  topLevelSkillBank: boolean;
  topLevelEntryPath?: string;
  isTopLevelSymlink: boolean;
  hasTests: boolean;
  hasScripts: boolean;
  hasReferences: boolean;
  hasValidationMetadata: boolean;
  descriptionQuality: "ok" | "vague" | "missing";
  risk: RiskLevel;
  issues: string[];
  recommendation: string;
};

export type OverlapGroup = {
  skills: string[];
  score: number;
  reason: string;
};

export type PrunePlanEntry = {
  action: "keep" | "update" | "merge-review" | "prune-review";
  skill: string;
  reason: string;
  recommendation: string;
  paths: string[];
};

export type TestPlanEntry = {
  skills: string[];
  cwd: string;
  command: string;
  args: string[];
  reason: string;
};

export type AuditSummary = {
  total: number;
  enabled: number;
  disabled: number;
  topLevel: number;
  highRisk: number;
  mediumRisk: number;
  overlapGroups: number;
};

export type SkillBankAudit = {
  generatedAt: string;
  agentDir: string;
  cwd: string;
  settingsPath: string;
  settings: SettingsShape;
  records: SkillRecord[];
  overlapGroups: OverlapGroup[];
  unresolved: string[];
  summary: AuditSummary;
};

export type AuditOptions = {
  agentDir?: string;
  cwd?: string;
  settingsPath?: string;
  includeProject?: boolean;
  now?: Date;
};

type Frontmatter = {
  raw: string;
  name?: string;
  description?: string;
};

type MutableRecord = Omit<SkillRecord, "sources" | "pathAliases"> & {
  sources: Set<string>;
  pathAliases: Set<string>;
};

const STOPWORDS = new Set([
  "a",
  "about",
  "across",
  "agent",
  "agents",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "assistant",
  "at",
  "be",
  "by",
  "can",
  "code",
  "for",
  "from",
  "has",
  "have",
  "help",
  "helps",
  "in",
  "including",
  "into",
  "is",
  "it",
  "local",
  "of",
  "on",
  "or",
  "pi",
  "should",
  "skill",
  "skills",
  "that",
  "the",
  "this",
  "to",
  "tool",
  "tools",
  "use",
  "used",
  "using",
  "when",
  "with",
  "workflow",
  "workflows",
  "you",
]);

export function getDefaultAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR?.trim() || path.join(os.homedir(), ".pi", "agent");
}

function packageSource(entry: PackageEntry): string | undefined {
  return typeof entry === "string" ? entry : entry.source;
}

function expandTilde(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function resolveConfiguredPath(input: string, baseDir: string): string {
  const expanded = expandTilde(input);
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(baseDir, expanded);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function realpathSafe(filePath: string): Promise<string> {
  try {
    return await fs.realpath(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function frontmatterValue(raw: string, key: string): string | undefined {
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]?.match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!match) continue;

    const first = match[1]?.trim() ?? "";
    if (first === "|" || first === ">") {
      const block: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j] ?? "";
        if (line.trim() === "") {
          block.push("");
          continue;
        }
        if (!/^\s+/.test(line)) break;
        block.push(line.trim());
      }
      return block.join(first === ">" ? " " : "\n").trim();
    }

    return stripQuotes(first);
  }
  return undefined;
}

function parseFrontmatter(markdown: string): Frontmatter {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return { raw: "" };
  const raw = match[1] ?? "";
  return {
    raw,
    name: frontmatterValue(raw, "name"),
    description: frontmatterValue(raw, "description"),
  };
}

function hasValidationMetadata(frontmatter: Frontmatter, markdown: string): boolean {
  if (/^(metadata|validation|validated|tests?|routing-examples):\s*/im.test(frontmatter.raw)) return true;
  return /^##?\s+(verification|validation|acceptance|tests?|safety|failure modes?|quality gates?)\b/im.test(markdown);
}

function tokenSet(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return new Set(tokens);
}

function descriptionQuality(description: string): { quality: "ok" | "vague" | "missing"; reasons: string[] } {
  const trimmed = description.trim();
  if (!trimmed) return { quality: "missing", reasons: ["missing description frontmatter"] };

  const reasons: string[] = [];
  const tokens = tokenSet(trimmed);
  if (trimmed.length < 55) reasons.push("short description");
  if (tokens.size < 6) reasons.push("few concrete routing terms");
  if (/\b(help(s|er)?|useful|things?|stuff|various|general|misc|utilities)\b/i.test(trimmed)) {
    reasons.push("generic wording");
  }
  if (!/\b(use|when|for|asks?|working|troubleshooting|review|audit|detect|create|update|run|manage|choose|evaluate)\b/i.test(trimmed)) {
    reasons.push("missing clear trigger/action language");
  }

  return { quality: reasons.length >= 2 ? "vague" : "ok", reasons };
}

async function discoverSkillFilesAt(inputPath: string, includeDirectMarkdown: boolean): Promise<string[]> {
  const resolved = path.resolve(inputPath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return [];
  }

  if (stat.isFile()) {
    return resolved.endsWith(".md") ? [resolved] : [];
  }

  const directSkill = path.join(resolved, "SKILL.md");
  if (await exists(directSkill)) return [directSkill];

  const out: string[] = [];
  const visited = new Set<string>();

  async function visit(dir: string, depth: number): Promise<void> {
    const real = await realpathSafe(dir);
    if (visited.has(real)) return;
    visited.add(real);

    let entries: Array<import("node:fs").Dirent>;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        if (depth === 0 && includeDirectMarkdown && entry.name.endsWith(".md")) out.push(entryPath);
        continue;
      }

      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

      let childStat;
      try {
        childStat = await fs.stat(entryPath);
      } catch {
        continue;
      }
      if (!childStat.isDirectory()) {
        if (depth === 0 && includeDirectMarkdown && childStat.isFile() && entry.name.endsWith(".md")) out.push(entryPath);
        continue;
      }

      const childSkill = path.join(entryPath, "SKILL.md");
      if (await exists(childSkill)) {
        out.push(childSkill);
        continue;
      }
      await visit(entryPath, depth + 1);
    }
  }

  await visit(resolved, 0);
  return [...new Set(out.map((file) => path.resolve(file)))];
}

async function findPackageRoot(startDir: string): Promise<string | undefined> {
  let current = path.resolve(startDir);
  while (true) {
    if (await exists(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function stripNpmVersion(spec: string): string {
  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/");
    const versionAt = spec.indexOf("@", slash + 1);
    return versionAt > 0 ? spec.slice(0, versionAt) : spec;
  }
  const versionAt = spec.indexOf("@");
  return versionAt > 0 ? spec.slice(0, versionAt) : spec;
}

function stripGitRef(input: string): string {
  const raw = input.replace(/^git:/, "");
  if (/^git@[^:]+:.+/.test(raw)) {
    const colon = raw.indexOf(":");
    const at = raw.lastIndexOf("@");
    return at > colon ? raw.slice(0, at) : raw;
  }

  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts.at(-1);
    if (last?.includes("@")) parts[parts.length - 1] = last.slice(0, last.lastIndexOf("@"));
    url.pathname = `/${parts.join("/")}`;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    const at = raw.lastIndexOf("@");
    const slash = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf(":"));
    return at > slash ? raw.slice(0, at) : raw;
  }
}

function resolveGitPackageDir(source: string, agentDir: string): string | undefined {
  const raw = stripGitRef(source);
  const withoutPrefix = raw.replace(/^git:/, "");

  const sshMatch = withoutPrefix.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    return path.join(agentDir, "git", sshMatch[1]!, ...sshMatch[2]!.replace(/\.git$/i, "").split("/"));
  }

  try {
    const url = new URL(withoutPrefix);
    return path.join(agentDir, "git", url.hostname, ...url.pathname.replace(/^\/+/, "").replace(/\.git$/i, "").split("/"));
  } catch {
    const shorthand = withoutPrefix.match(/^([^/]+\.[^/]+)\/(.+)$/);
    if (shorthand) return path.join(agentDir, "git", shorthand[1]!, ...shorthand[2]!.replace(/\.git$/i, "").split("/"));
    return undefined;
  }
}

function resolvePackageInstallDir(source: string, agentDir: string, settingsDir: string): string | undefined {
  if (source.startsWith("npm:")) {
    const packageName = stripNpmVersion(source.slice(4));
    return path.join(agentDir, "npm", "node_modules", ...packageName.split("/"));
  }
  if (source.startsWith("git:") || source.startsWith("http://") || source.startsWith("https://") || source.startsWith("ssh://") || source.startsWith("git@")) {
    return resolveGitPackageDir(source, agentDir);
  }
  return resolveConfiguredPath(source, settingsDir);
}

async function packageSkillRoots(packageDir: string): Promise<string[]> {
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = await readJsonIfExists<{ pi?: { skills?: string[] } }>(packageJsonPath, {});
  const configured = packageJson.pi?.skills;
  const rawRoots = configured && configured.length > 0 ? configured : ["skills"];
  const roots: string[] = [];

  for (const raw of rawRoots) {
    if (!raw || raw.startsWith("!") || raw.startsWith("-")) continue;
    const normalized = raw.startsWith("+") ? raw.slice(1) : raw;
    if (/[*?\[]/.test(normalized)) {
      const beforeGlob = normalized.slice(0, normalized.search(/[*?\[]/));
      const base = beforeGlob.endsWith("/") ? beforeGlob.slice(0, -1) : path.dirname(beforeGlob);
      roots.push(path.resolve(packageDir, base || "."));
    } else {
      roots.push(path.resolve(packageDir, normalized));
    }
  }

  return [...new Set(roots)];
}

async function packageHasTestScript(packagePath: string | undefined): Promise<boolean> {
  if (!packagePath) return false;
  const packageJson = await readJsonIfExists<{ scripts?: Record<string, unknown> }>(path.join(packagePath, "package.json"), {});
  return typeof packageJson.scripts?.test === "string";
}

async function addSkillRecord(
  records: Map<string, MutableRecord>,
  skillPath: string,
  source: string,
  options: {
    packageSource?: string;
    topLevelEntryPath?: string;
    isTopLevelSymlink?: boolean;
  } = {},
): Promise<void> {
  const resolvedSkillPath = path.resolve(skillPath);
  const realSkillPath = await realpathSafe(resolvedSkillPath);
  const markdown = await fs.readFile(resolvedSkillPath, "utf8").catch(() => "");
  const frontmatter = parseFrontmatter(markdown);
  const name = frontmatter.name?.trim() || `(invalid:${path.basename(path.dirname(resolvedSkillPath))})`;
  const description = frontmatter.description?.trim() || "";
  const key = realSkillPath;
  const packageRoot = await findPackageRoot(path.dirname(realSkillPath));
  const fallbackPackage = options.topLevelEntryPath ? path.resolve(options.topLevelEntryPath) : path.dirname(resolvedSkillPath);

  let record = records.get(key);
  if (!record) {
    record = {
      name,
      description,
      skillPath: resolvedSkillPath,
      realSkillPath,
      packagePath: packageRoot ?? fallbackPackage,
      packageSource: options.packageSource,
      sources: new Set(),
      pathAliases: new Set(),
      enabled: false,
      enabledReason: "not evaluated",
      topLevelSkillBank: false,
      topLevelEntryPath: undefined,
      isTopLevelSymlink: false,
      hasTests: false,
      hasScripts: false,
      hasReferences: false,
      hasValidationMetadata: hasValidationMetadata(frontmatter, markdown),
      descriptionQuality: "ok",
      risk: "low",
      issues: [],
      recommendation: "",
    };
    records.set(key, record);
  }

  record.sources.add(source);
  record.pathAliases.add(resolvedSkillPath);
  record.pathAliases.add(realSkillPath);
  if (!record.packageSource && options.packageSource) record.packageSource = options.packageSource;
  if (options.topLevelEntryPath) {
    record.topLevelSkillBank = true;
    record.topLevelEntryPath = path.resolve(options.topLevelEntryPath);
    record.isTopLevelSymlink = Boolean(options.isTopLevelSymlink);
  }
}

async function discoverPackageSkills(
  records: Map<string, MutableRecord>,
  packageDir: string,
  source: string,
  unresolved: string[],
): Promise<void> {
  if (!(await dirExists(packageDir))) {
    unresolved.push(`Package source '${source}' resolved to missing directory: ${packageDir}`);
    return;
  }

  const roots = await packageSkillRoots(packageDir);
  let found = 0;
  for (const root of roots) {
    const files = await discoverSkillFilesAt(root, true);
    found += files.length;
    for (const skillPath of files) {
      await addSkillRecord(records, skillPath, `package:${source}`, { packageSource: source });
    }
  }

  if (found === 0) unresolved.push(`Package source '${source}' has no discoverable skills under ${roots.join(", ")}`);
}

async function discoverTopLevelSkillBank(records: Map<string, MutableRecord>, agentDir: string): Promise<void> {
  const skillRoot = path.join(agentDir, "skills");
  let entries: Array<import("node:fs").Dirent>;
  try {
    entries = await fs.readdir(skillRoot, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(skillRoot, entry.name);
    const isSymlink = entry.isSymbolicLink();
    const files = await discoverSkillFilesAt(entryPath, entry.isFile() || isSymlink);
    for (const skillPath of files) {
      await addSkillRecord(records, skillPath, "top-level-skill-bank", {
        topLevelEntryPath: entryPath,
        isTopLevelSymlink: isSymlink,
      });
    }
  }
}

async function discoverConfiguredSkillPaths(records: Map<string, MutableRecord>, settings: SettingsShape, settingsDir: string): Promise<void> {
  for (const entry of settings.skills ?? []) {
    const normalized = entry.replace(/^[+!-]/, "");
    if (!normalized || normalized === "**" || normalized === "*") continue;
    if (/[*?\[]/.test(normalized)) continue;
    const resolved = resolveConfiguredPath(normalized, settingsDir);
    const files = await discoverSkillFilesAt(resolved, true);
    for (const skillPath of files) {
      await addSkillRecord(records, skillPath, "settings.skills");
    }
  }
}

async function discoverStandardSkillRoots(records: Map<string, MutableRecord>, agentDir: string, cwd: string, includeProject: boolean): Promise<void> {
  const roots: Array<{ root: string; includeDirectMarkdown: boolean; label: string }> = [
    { root: path.join(agentDir, "skills"), includeDirectMarkdown: true, label: "global:~/.pi/agent/skills" },
    { root: path.join(os.homedir(), ".agents", "skills"), includeDirectMarkdown: false, label: "global:~/.agents/skills" },
  ];

  if (includeProject) {
    let current = path.resolve(cwd);
    while (true) {
      roots.push(
        { root: path.join(current, ".pi", "skills"), includeDirectMarkdown: true, label: `project:${path.join(current, ".pi", "skills")}` },
        { root: path.join(current, ".agents", "skills"), includeDirectMarkdown: false, label: `project:${path.join(current, ".agents", "skills")}` },
      );
      if (await exists(path.join(current, ".git"))) break;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  for (const root of roots) {
    const files = await discoverSkillFilesAt(root.root, root.includeDirectMarkdown);
    for (const skillPath of files) await addSkillRecord(records, skillPath, root.label);
  }
}

function filterEntryKind(entry: string): "include" | "exclude" | "normal" {
  if (entry.startsWith("+")) return "include";
  if (entry.startsWith("!") || entry.startsWith("-")) return "exclude";
  return "normal";
}

function normalizeFilterEntry(entry: string): string {
  return entry.replace(/^[+!-]/, "");
}

function pathMatchesRecord(candidatePath: string, record: MutableRecord, settingsDir: string): boolean {
  if (candidatePath === "**" || candidatePath === "*") return true;
  if (/[*?\[]/.test(candidatePath)) return false;

  const resolved = resolveConfiguredPath(candidatePath, settingsDir);
  const aliases = [...record.pathAliases, record.skillPath, record.realSkillPath, path.dirname(record.skillPath), path.dirname(record.realSkillPath)];
  return aliases.some((alias) => {
    const normalizedAlias = path.resolve(alias);
    return normalizedAlias === resolved || normalizedAlias.startsWith(`${resolved}${path.sep}`);
  });
}

function packageFilterMatches(filter: string, record: MutableRecord, packageDir: string): boolean {
  const normalized = normalizeFilterEntry(filter);
  if (normalized === record.name) return true;
  if (normalized === "**" || normalized === "*") return true;
  if (/[*?\[]/.test(normalized)) return false;

  const candidate = path.resolve(packageDir, normalized);
  const aliases = [...record.pathAliases, record.skillPath, record.realSkillPath, path.dirname(record.skillPath), path.dirname(record.realSkillPath)];
  return aliases.some((alias) => {
    const resolved = path.resolve(alias);
    return resolved === candidate || resolved.startsWith(`${candidate}${path.sep}`);
  });
}

function packageEntryEnablesRecord(entry: PackageEntry, record: MutableRecord, packageDir: string): boolean {
  if (typeof entry === "string" || entry.skills === undefined) return true;
  if (entry.skills.length === 0) return false;

  let included = false;
  for (const filter of entry.skills) {
    const kind = filterEntryKind(filter);
    const matches = packageFilterMatches(filter, record, packageDir);
    if (!matches) continue;
    if (kind === "exclude") return false;
    included = true;
  }
  return included;
}

function evaluateEnabled(record: MutableRecord, settings: SettingsShape, settingsDir: string, agentDir: string): { enabled: boolean; reason: string } {
  const skillFilters = settings.skills ?? [];
  const hasDenyAll = skillFilters.some((entry) => filterEntryKind(entry) === "exclude" && normalizeFilterEntry(entry) === "**");

  for (const entry of skillFilters) {
    const kind = filterEntryKind(entry);
    if (kind !== "include" && hasDenyAll) continue;
    const raw = normalizeFilterEntry(entry);
    if (!pathMatchesRecord(raw, record, settingsDir)) continue;
    if (kind === "exclude") return { enabled: false, reason: `excluded by settings.skills:${entry}` };
    return { enabled: true, reason: `included by settings.skills:${entry}` };
  }

  for (const entry of settings.packages ?? []) {
    const source = packageSource(entry);
    if (!source) continue;
    const packageDir = resolvePackageInstallDir(source, agentDir, settingsDir);
    if (!packageDir) continue;
    const resolvedPackageDir = path.resolve(packageDir);
    const recordPackagePath = path.resolve(record.packagePath);
    if (record.packageSource !== source && recordPackagePath !== resolvedPackageDir && !record.realSkillPath.startsWith(`${resolvedPackageDir}${path.sep}`)) continue;
    const enabled = packageEntryEnablesRecord(entry, record, resolvedPackageDir);
    return { enabled, reason: enabled ? `enabled by package:${source}` : `disabled by package skill filter:${source}` };
  }

  if (hasDenyAll) return { enabled: false, reason: "disabled by settings.skills !**" };

  const globalSkillRoot = path.join(agentDir, "skills");
  if ([...record.pathAliases, record.skillPath].some((alias) => path.resolve(alias).startsWith(`${globalSkillRoot}${path.sep}`))) {
    return { enabled: true, reason: "enabled by default global skill discovery" };
  }

  return { enabled: false, reason: "installed but not enabled in settings" };
}

async function enrichRecord(record: MutableRecord): Promise<void> {
  const dirs = new Set([...record.pathAliases].map((alias) => path.dirname(alias)));
  dirs.add(path.dirname(record.skillPath));
  dirs.add(path.dirname(record.realSkillPath));

  for (const dir of dirs) {
    if (await dirExists(path.join(dir, "tests"))) record.hasTests = true;
    if (await dirExists(path.join(dir, "scripts"))) record.hasScripts = true;
    if (await dirExists(path.join(dir, "references"))) record.hasReferences = true;
  }

  if (!record.hasTests && (await packageHasTestScript(record.packagePath))) record.hasTests = true;

  const quality = descriptionQuality(record.description);
  record.descriptionQuality = quality.quality;
  record.issues.push(...quality.reasons);
  if (!record.hasTests) record.issues.push("missing tests/ or package test script");
  if (!record.hasScripts) record.issues.push("missing scripts/ directory");
  if (!record.hasReferences) record.issues.push("missing references/ directory");
  if (!record.hasValidationMetadata) record.issues.push("missing validation/verification metadata");
}

function computeOverlapGroups(records: MutableRecord[]): OverlapGroup[] {
  const tokenized = records.map((record) => ({ record, tokens: tokenSet(`${record.name} ${record.description}`) }));
  const edges = new Map<string, Set<string>>();
  const scores = new Map<string, number>();

  for (let i = 0; i < tokenized.length; i++) {
    for (let j = i + 1; j < tokenized.length; j++) {
      const left = tokenized[i]!;
      const right = tokenized[j]!;
      if (left.tokens.size === 0 || right.tokens.size === 0) continue;
      const intersection = [...left.tokens].filter((token) => right.tokens.has(token));
      const union = new Set([...left.tokens, ...right.tokens]);
      const jaccard = intersection.length / union.size;
      const containment = intersection.length / Math.min(left.tokens.size, right.tokens.size);
      const similar = jaccard >= 0.34 || (intersection.length >= 5 && containment >= 0.62);
      if (!similar) continue;

      const a = left.record.realSkillPath;
      const b = right.record.realSkillPath;
      if (!edges.has(a)) edges.set(a, new Set());
      if (!edges.has(b)) edges.set(b, new Set());
      edges.get(a)!.add(b);
      edges.get(b)!.add(a);
      scores.set([a, b].sort().join("\0"), Math.max(jaccard, containment));
    }
  }

  const byPath = new Map(records.map((record) => [record.realSkillPath, record]));
  const seen = new Set<string>();
  const groups: OverlapGroup[] = [];

  for (const start of edges.keys()) {
    if (seen.has(start)) continue;
    const stack = [start];
    const component: string[] = [];
    seen.add(start);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of edges.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    if (component.length < 2) continue;

    let maxScore = 0;
    for (let i = 0; i < component.length; i++) {
      for (let j = i + 1; j < component.length; j++) {
        maxScore = Math.max(maxScore, scores.get([component[i]!, component[j]!].sort().join("\0")) ?? 0);
      }
    }

    groups.push({
      skills: component.map((skillPath) => byPath.get(skillPath)?.name ?? skillPath).sort(),
      score: Number(maxScore.toFixed(2)),
      reason: "description/name token overlap",
    });
  }

  return groups.sort((a, b) => b.score - a.score || a.skills.join(",").localeCompare(b.skills.join(",")));
}

function overlapPeers(record: MutableRecord, groups: OverlapGroup[]): string[] {
  return groups.flatMap((group) => (group.skills.includes(record.name) ? group.skills.filter((skill) => skill !== record.name) : []));
}

function riskRank(risk: RiskLevel): number {
  return risk === "high" ? 0 : risk === "medium" ? 1 : 2;
}

function finalizeRiskAndRecommendation(record: MutableRecord, groups: OverlapGroup[]): void {
  const peers = overlapPeers(record, groups);
  if (peers.length > 0) record.issues.push(`possible overlap with ${peers.join(", ")}`);

  const hasHardFrontmatterIssue = record.name.startsWith("(invalid:") || record.descriptionQuality === "missing";
  if (hasHardFrontmatterIssue) record.risk = "high";
  else if (peers.length > 0 || record.descriptionQuality === "vague" || !record.hasTests || !record.hasValidationMetadata) record.risk = "medium";
  else record.risk = "low";

  if (hasHardFrontmatterIssue) {
    record.recommendation = "Fix SKILL.md frontmatter; Pi will not reliably route/load this skill.";
  } else if (peers.length > 0) {
    record.recommendation = `Review overlap with ${peers.slice(0, 3).join(", ")}; merge, prune, or sharpen descriptions.`;
  } else if (record.descriptionQuality === "vague") {
    record.recommendation = "Rewrite description with concrete triggers and should/should-not-use boundaries.";
  } else if (!record.hasTests || !record.hasValidationMetadata) {
    record.recommendation = "Add lightweight tests or validation metadata; keep doc-only status explicit if intentional.";
  } else if (!record.enabled) {
    record.recommendation = "Keep disabled unless needed; consider prune after confirming no active routing use.";
  } else {
    record.recommendation = "Keep; no immediate action.";
  }
}

function toPublicRecord(record: MutableRecord): SkillRecord {
  return {
    ...record,
    sources: [...record.sources].sort(),
    pathAliases: [...record.pathAliases].sort(),
    issues: [...new Set(record.issues)].sort(),
  };
}

export async function auditSkillBank(options: AuditOptions = {}): Promise<SkillBankAudit> {
  const agentDir = path.resolve(expandTilde(options.agentDir ?? getDefaultAgentDir()));
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const settingsPath = path.resolve(expandTilde(options.settingsPath ?? path.join(agentDir, "settings.json")));
  const settingsDir = path.dirname(settingsPath);
  const settings = await readJsonIfExists<SettingsShape>(settingsPath, {});
  const records = new Map<string, MutableRecord>();
  const unresolved: string[] = [];

  await discoverConfiguredSkillPaths(records, settings, settingsDir);
  await discoverStandardSkillRoots(records, agentDir, cwd, options.includeProject ?? true);
  await discoverTopLevelSkillBank(records, agentDir);

  for (const entry of settings.packages ?? []) {
    const source = packageSource(entry);
    if (!source) continue;
    const packageDir = resolvePackageInstallDir(source, agentDir, settingsDir);
    if (!packageDir) {
      unresolved.push(`Could not resolve package source '${source}'`);
      continue;
    }
    await discoverPackageSkills(records, packageDir, source, unresolved);
  }

  const mutableRecords = [...records.values()];
  for (const record of mutableRecords) {
    const enabled = evaluateEnabled(record, settings, settingsDir, agentDir);
    record.enabled = enabled.enabled;
    record.enabledReason = enabled.reason;
    await enrichRecord(record);
  }

  const overlapGroups = computeOverlapGroups(mutableRecords);
  for (const record of mutableRecords) finalizeRiskAndRecommendation(record, overlapGroups);

  const publicRecords = mutableRecords.map(toPublicRecord).sort((a, b) => {
    const byEnabled = Number(b.enabled) - Number(a.enabled);
    const byRisk = riskRank(a.risk) - riskRank(b.risk);
    return byEnabled || byRisk || a.name.localeCompare(b.name) || a.skillPath.localeCompare(b.skillPath);
  });

  const summary: AuditSummary = {
    total: publicRecords.length,
    enabled: publicRecords.filter((record) => record.enabled).length,
    disabled: publicRecords.filter((record) => !record.enabled).length,
    topLevel: publicRecords.filter((record) => record.topLevelSkillBank).length,
    highRisk: publicRecords.filter((record) => record.risk === "high").length,
    mediumRisk: publicRecords.filter((record) => record.risk === "medium").length,
    overlapGroups: overlapGroups.length,
  };

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    agentDir,
    cwd,
    settingsPath,
    settings,
    records: publicRecords,
    overlapGroups,
    unresolved: unresolved.sort(),
    summary,
  };
}

function yn(value: boolean): string {
  return value ? "yes" : "no";
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function shortPath(value: string, home = os.homedir()): string {
  return value.startsWith(`${home}${path.sep}`) ? `~/${value.slice(home.length + 1)}` : value;
}

export function renderAuditMarkdown(audit: SkillBankAudit): string {
  const lines: string[] = [];
  lines.push("# Pi Skill Bank Audit");
  lines.push("");
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push(`Agent dir: \`${esc(shortPath(audit.agentDir))}\``);
  lines.push(`Settings: \`${esc(shortPath(audit.settingsPath))}\``);
  lines.push(`CWD: \`${esc(shortPath(audit.cwd))}\``);
  lines.push("");
  lines.push("> Read-only audit: recommendations are plans only. No skill files are changed by this report.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total discovered skills: ${audit.summary.total}`);
  lines.push(`- Enabled skills: ${audit.summary.enabled}`);
  lines.push(`- Disabled/installed skills: ${audit.summary.disabled}`);
  lines.push(`- Top-level skill-bank entries covered: ${audit.summary.topLevel}`);
  lines.push(`- High risk: ${audit.summary.highRisk}`);
  lines.push(`- Medium risk: ${audit.summary.mediumRisk}`);
  lines.push(`- Overlap groups: ${audit.summary.overlapGroups}`);
  lines.push("");

  lines.push("## Enabled skills resolved from settings.json");
  lines.push("");
  const enabled = audit.records.filter((record) => record.enabled);
  if (enabled.length === 0) {
    lines.push("No enabled skills resolved.");
  } else {
    for (const record of enabled) {
      lines.push(`- **${esc(record.name)}** — ${esc(record.enabledReason)} — \`${esc(shortPath(record.skillPath))}\``);
    }
  }
  lines.push("");

  lines.push("## Top-level skill-bank entries");
  lines.push("");
  const topLevel = audit.records.filter((record) => record.topLevelSkillBank);
  if (topLevel.length === 0) {
    lines.push("No top-level entries found under `~/.pi/agent/skills`.");
  } else {
    for (const record of topLevel) {
      const linkType = record.isTopLevelSymlink ? "symlink" : "directory/file";
      lines.push(`- **${esc(record.name)}** (${linkType}) — \`${esc(shortPath(record.topLevelEntryPath ?? record.skillPath))}\``);
    }
  }
  lines.push("");

  lines.push("## Skill inventory");
  lines.push("");
  lines.push("| skill | enabled status | package path | has tests | has scripts | has references | risk | recommendation |");
  lines.push("|---|---:|---|---:|---:|---:|---|---|");
  for (const record of audit.records) {
    lines.push(
      `| ${esc(record.name)} | ${record.enabled ? "enabled" : "disabled"} | \`${esc(shortPath(record.packagePath))}\` | ${yn(record.hasTests)} | ${yn(record.hasScripts)} | ${yn(record.hasReferences)} | ${record.risk} | ${esc(record.recommendation)} |`,
    );
  }
  lines.push("");

  lines.push("## Issues by skill");
  lines.push("");
  for (const record of audit.records) {
    const issues = record.issues.length > 0 ? record.issues.join("; ") : "none";
    lines.push(`- **${esc(record.name)}** (${record.risk}): ${esc(issues)}`);
  }
  lines.push("");

  lines.push("## Likely overlap groups");
  lines.push("");
  if (audit.overlapGroups.length === 0) {
    lines.push("No likely duplicate skill scopes detected by the current heuristic.");
  } else {
    for (const group of audit.overlapGroups) {
      lines.push(`- score ${group.score}: ${group.skills.map((skill) => `\`${esc(skill)}\``).join(", ")} — ${esc(group.reason)}`);
    }
  }
  lines.push("");

  lines.push("## Plan-only prune/update recommendations");
  lines.push("");
  const plan = buildPrunePlan(audit);
  if (plan.length === 0) {
    lines.push("No prune/update candidates found.");
  } else {
    for (const entry of plan) {
      lines.push(`- **${entry.action}** \`${esc(entry.skill)}\`: ${esc(entry.reason)} Recommendation: ${esc(entry.recommendation)}`);
    }
  }
  lines.push("");

  if (audit.unresolved.length > 0) {
    lines.push("## Unresolved configured sources");
    lines.push("");
    for (const item of audit.unresolved) lines.push(`- ${esc(item)}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export async function writeAuditReport(audit: SkillBankAudit, outputPath = DEFAULT_REPORT_PATH): Promise<string> {
  const resolved = path.resolve(expandTilde(outputPath));
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, renderAuditMarkdown(audit), "utf8");
  return resolved;
}

export function buildPrunePlan(audit: SkillBankAudit): PrunePlanEntry[] {
  return audit.records
    .map((record): PrunePlanEntry => {
      const paths = [record.skillPath, ...record.pathAliases].filter((value, index, array) => array.indexOf(value) === index);
      if (audit.overlapGroups.some((group) => group.skills.includes(record.name))) {
        return {
          action: "merge-review",
          skill: record.name,
          reason: "Potential duplicate/overlapping scope.",
          recommendation: record.recommendation,
          paths,
        };
      }
      if (!record.enabled && record.risk !== "low") {
        return {
          action: "prune-review",
          skill: record.name,
          reason: "Disabled skill with quality/routing warnings.",
          recommendation: "Confirm unused, then remove symlink/package entry in a separate explicit change.",
          paths,
        };
      }
      if (record.risk !== "low") {
        return {
          action: "update",
          skill: record.name,
          reason: record.issues.join("; ") || "Quality warnings.",
          recommendation: record.recommendation,
          paths,
        };
      }
      return {
        action: "keep",
        skill: record.name,
        reason: "No blocking audit issue detected.",
        recommendation: record.recommendation,
        paths,
      };
    })
    .filter((entry) => entry.action !== "keep")
    .sort((a, b) => a.action.localeCompare(b.action) || a.skill.localeCompare(b.skill));
}

export function renderPrunePlanMarkdown(audit: SkillBankAudit): string {
  const plan = buildPrunePlan(audit);
  const lines = ["# Pi Skill Bank Prune/Merge Plan", "", "> Plan only. Do not apply automatically.", ""];
  if (plan.length === 0) {
    lines.push("No prune, merge, or update candidates found.");
  } else {
    for (const entry of plan) {
      lines.push(`## ${entry.action}: ${entry.skill}`);
      lines.push("");
      lines.push(`- Reason: ${entry.reason}`);
      lines.push(`- Recommendation: ${entry.recommendation}`);
      lines.push("- Paths:");
      for (const item of entry.paths) lines.push(`  - \`${shortPath(item)}\``);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

export function renderOverlapMarkdown(audit: SkillBankAudit): string {
  const lines = ["# Pi Skill Bank Overlap Report", ""];
  if (audit.overlapGroups.length === 0) {
    lines.push("No likely duplicate skill scopes detected.");
  } else {
    for (const group of audit.overlapGroups) {
      lines.push(`- score ${group.score}: ${group.skills.map((skill) => `\`${skill}\``).join(", ")} — ${group.reason}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export async function buildSkillTestPlan(audit: SkillBankAudit, skillName?: string): Promise<TestPlanEntry[]> {
  const selected = skillName ? audit.records.filter((record) => record.name === skillName) : audit.records;
  const plans = new Map<string, TestPlanEntry>();

  for (const record of selected) {
    const packageJson = await readJsonIfExists<{ scripts?: Record<string, unknown> }>(path.join(record.packagePath, "package.json"), {});
    if (typeof packageJson.scripts?.test === "string") {
      const key = `${record.packagePath}\0npm test`;
      const entry = plans.get(key) ?? {
        skills: [],
        cwd: record.packagePath,
        command: "npm",
        args: ["test"],
        reason: "package.json test script",
      };
      entry.skills.push(record.name);
      plans.set(key, entry);
      continue;
    }

    const skillDir = path.dirname(record.realSkillPath);
    if (record.hasTests && (await dirExists(path.join(skillDir, "tests")))) {
      const key = `${skillDir}\0bun test`;
      plans.set(key, {
        skills: [record.name],
        cwd: skillDir,
        command: "bun",
        args: ["test"],
        reason: "skill tests/ directory without package test script",
      });
    }
  }

  return [...plans.values()].sort((a, b) => a.cwd.localeCompare(b.cwd));
}

export function renderTestPlanMarkdown(plan: TestPlanEntry[]): string {
  const lines = ["# Pi Skill Bank Test Plan", ""];
  if (plan.length === 0) {
    lines.push("No runnable test commands detected.");
  } else {
    for (const entry of plan) {
      lines.push(`- \`${[entry.command, ...entry.args].join(" ")}\` in \`${shortPath(entry.cwd)}\` (${entry.reason}; skills: ${entry.skills.join(", ")})`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function truncateText(text: string, maxChars = 24000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`;
}
