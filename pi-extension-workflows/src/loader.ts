import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { WorkflowLoadError, WorkflowValidationError, errorMessage } from "./errors.ts";
import { validateWorkflowDefinition } from "./schema.ts";
import type { WorkflowSource, WorkflowSourceScope } from "./types.ts";

export type WorkflowLoaderOptions = {
  cwd: string;
  extensionDir: string;
  includeProject?: boolean;
  projectTrusted?: boolean;
};

type WorkflowFileCandidate = {
  path: string;
  scope: WorkflowSourceScope;
};

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function jsonFilesInDirectory(path: string): Promise<string[]> {
  if (!(await isDirectory(path))) return [];
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(path, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export async function discoverWorkflowFiles(options: WorkflowLoaderOptions): Promise<WorkflowFileCandidate[]> {
  const bundledDir = join(options.extensionDir, "workflows");
  const bundled = (await jsonFilesInDirectory(bundledDir)).map((path) => ({ path, scope: "bundled" as const }));

  const projectDir = resolve(options.cwd, ".pi", "workflows");
  const project = options.includeProject && options.projectTrusted
    ? (await jsonFilesInDirectory(projectDir)).map((path) => ({ path, scope: "project" as const }))
    : [];

  return [...bundled, ...project];
}

export async function loadWorkflowFile(candidate: WorkflowFileCandidate): Promise<WorkflowSource> {
  let raw: string;
  try {
    raw = await readFile(candidate.path, "utf8");
  } catch (error) {
    throw new WorkflowLoadError([`${candidate.path}: ${errorMessage(error)}`]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new WorkflowLoadError([`${candidate.path}: invalid JSON: ${errorMessage(error)}`]);
  }

  try {
    return {
      path: candidate.path,
      scope: candidate.scope,
      definition: validateWorkflowDefinition(parsed, { sourcePath: candidate.path }),
    };
  } catch (error) {
    if (error instanceof WorkflowValidationError) {
      throw new WorkflowLoadError(error.issues.map((issue) => `${candidate.path}: ${issue}`));
    }
    throw error;
  }
}

export async function loadWorkflowRegistry(options: WorkflowLoaderOptions): Promise<WorkflowSource[]> {
  const candidates = await discoverWorkflowFiles(options);
  const sources: WorkflowSource[] = [];
  const issues: string[] = [];

  for (const candidate of candidates) {
    try {
      sources.push(await loadWorkflowFile(candidate));
    } catch (error) {
      if (error instanceof WorkflowLoadError) issues.push(...error.issues);
      else issues.push(`${candidate.path}: ${errorMessage(error)}`);
    }
  }

  const seen = new Map<string, WorkflowSource>();
  for (const source of sources) {
    const existing = seen.get(source.definition.key);
    if (existing) {
      issues.push(`duplicate workflow key '${source.definition.key}' in ${existing.path} and ${source.path}.`);
    } else {
      seen.set(source.definition.key, source);
    }
  }

  if (issues.length > 0) throw new WorkflowLoadError(issues);
  return sources;
}

export function findWorkflowSource(sources: WorkflowSource[], key: string): WorkflowSource | undefined {
  return sources.find((source) => source.definition.key === key);
}

export function formatWorkflowList(sources: WorkflowSource[]): string {
  if (sources.length === 0) return "No workflows found.";
  return sources
    .map((source) => `- ${source.definition.key} (${source.scope}): ${source.definition.name}`)
    .join("\n");
}
