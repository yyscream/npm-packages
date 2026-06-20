import { join, relative, resolve } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";

export function taskRoot(cwd: string): string {
  return resolve(cwd, CONFIG_DIR_NAME, "tasks");
}

export function taskDir(cwd: string, taskId: string): string {
  return join(taskRoot(cwd), taskId);
}

export function statePathFor(cwd: string, taskId: string): string {
  return join(taskDir(cwd, taskId), "state.json");
}

export function scratchpadPathFor(cwd: string, taskId: string): string {
  return join(taskDir(cwd, taskId), "scratchpad.md");
}

export function latestPointerPath(cwd: string): string {
  return join(taskRoot(cwd), "latest.json");
}

export function archivedMarkerPath(cwd: string, taskId: string): string {
  return join(taskDir(cwd, taskId), ".archived");
}

export function displayPath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  if (rel && !rel.startsWith("..") && !rel.startsWith("/")) return rel;
  return absolutePath;
}
