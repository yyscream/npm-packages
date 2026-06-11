#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const tests = [
  path.join("tests", "remote-args.test.mjs"),
  path.join("tests", "remote-webui-control.test.mjs"),
];

const result = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: packageRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
