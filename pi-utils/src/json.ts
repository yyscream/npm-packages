import fs from "node:fs";
import path from "node:path";

export function readJsonFile<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function readJsonIfExists<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return readJsonFile<T>(filePath);
}

export function writeJsonFile(filePath: string, data: unknown, options: { mode?: number } = {}): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode: options.mode });
}

export async function readJsonFileAsync<T = unknown>(filePath: string): Promise<T> {
  return JSON.parse(await fs.promises.readFile(filePath, "utf8")) as T;
}

export async function readJsonIfExistsAsync<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return await readJsonFileAsync<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonFileAsync(filePath: string, data: unknown, options: { mode?: number } = {}): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode: options.mode });
}
