#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = dirname(dirname(fileURLToPath(import.meta.url)));
const indexPath = join(repoDir, "index.ts");
const outputPath = join(repoDir, "skills", "arch-linux-local", "references", "query-expansions.md");

const source = readFileSync(indexPath, "utf8");
const match = source.match(/const QUERY_EXPANSIONS:\s*Record<string, string\[]>\s*=\s*({[\s\S]*?\n});/);

if (!match) {
  console.error(`Could not find QUERY_EXPANSIONS in ${indexPath}`);
  process.exit(1);
}

let queryExpansions;
try {
  queryExpansions = Function(`"use strict"; return (${match[1]});`)();
} catch (error) {
  console.error(`Could not evaluate QUERY_EXPANSIONS from ${indexPath}:`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!queryExpansions || typeof queryExpansions !== "object" || Array.isArray(queryExpansions)) {
  console.error("QUERY_EXPANSIONS did not evaluate to an object.");
  process.exit(1);
}

for (const [key, values] of Object.entries(queryExpansions)) {
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string")) {
    console.error(`Invalid query expansion entry for ${key}: expected string[]`);
    process.exit(1);
  }
}

const lines = [
  "# Query Expansions",
  "",
  "The `archwiki_search` tool expands common Arch/Linux terms.",
  "",
  "This file is generated from `QUERY_EXPANSIONS` in `index.ts`; do not edit it by hand.",
  "Run `npm run docs:generate` from the package directory to refresh it.",
  "",
  ...Object.entries(queryExpansions).map(([key, values]) => `- ${key} -> ${values.join(", ")}`),
  "",
];

writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Generated ${outputPath}`);
