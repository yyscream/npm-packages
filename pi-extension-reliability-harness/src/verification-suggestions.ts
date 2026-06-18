import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VerificationCommandSuggestion } from "./types.ts";
import { readJsonFile } from "./utils.ts";

export function isVerificationCommand(command: string): boolean {
  return /\b(npm|pnpm|yarn|bun)\s+(test|run\s+(test|check|lint|typecheck|build))\b/i.test(command)
    || /\b(pytest|ruff|mypy|tox|go\s+test|cargo\s+test|cargo\s+check|cargo\s+clippy|gradle\s+test|mvn\s+test|tsc\b|eslint\b)\b/i.test(command)
    || /\b(test|check|lint|typecheck|verify)\b/i.test(command);
}

export function packageManagerFor(cwd: string): "npm" | "pnpm" | "yarn" | "bun" {
  if (existsSync(resolve(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(cwd, "bun.lockb")) || existsSync(resolve(cwd, "bun.lock"))) return "bun";
  return "npm";
}

export function readPackageScripts(cwd: string): Record<string, string> {
  const pkg = readJsonFile<{ scripts?: Record<string, unknown> }>(resolve(cwd, "package.json"));
  const scripts = pkg?.scripts;
  if (!scripts || typeof scripts !== "object") return {};
  return Object.fromEntries(
    Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function isMeaningfulScript(scriptName: string, scriptBody: string): boolean {
  if (!scriptBody.trim()) return false;
  if (scriptName === "test" && /no test specified|echo\s+['"]?error|exit\s+1/i.test(scriptBody)) return false;
  return true;
}

export function suggestVerificationCommands(cwd: string): VerificationCommandSuggestion[] {
  const suggestions: VerificationCommandSuggestion[] = [];
  const add = (command: string, label: string, reason: string) => {
    if (suggestions.some((item) => item.command === command)) return;
    suggestions.push({ command, label, reason });
  };

  const packageJson = resolve(cwd, "package.json");
  if (existsSync(packageJson)) {
    const manager = packageManagerFor(cwd);
    const scripts = readPackageScripts(cwd);
    const scriptPriority = ["test", "check", "typecheck", "lint", "build"];
    for (const scriptName of scriptPriority) {
      const body = scripts[scriptName];
      if (!body || !isMeaningfulScript(scriptName, body)) continue;
      add(scriptName === "test" ? `${manager} test` : `${manager} run ${scriptName}`, `${scriptName} script`, `package.json defines scripts.${scriptName}`);
    }
  }

  const pyproject = existsSync(resolve(cwd, "pyproject.toml")) ? readFileSync(resolve(cwd, "pyproject.toml"), "utf8") : "";
  const hasPythonProject = Boolean(pyproject || existsSync(resolve(cwd, "pytest.ini")) || existsSync(resolve(cwd, "tox.ini")) || existsSync(resolve(cwd, "requirements.txt")));
  if (hasPythonProject) {
    if (/pytest|\[tool\.pytest/i.test(pyproject) || existsSync(resolve(cwd, "pytest.ini"))) add("pytest", "pytest", "Python project appears to use pytest");
    if (/\[tool\.ruff\]|ruff/i.test(pyproject)) add("ruff check .", "ruff", "pyproject.toml references Ruff");
    if (/\[tool\.mypy\]|mypy/i.test(pyproject)) add("mypy .", "mypy", "pyproject.toml references mypy");
    if (existsSync(resolve(cwd, "tox.ini"))) add("tox", "tox", "tox.ini exists");
  }

  if (existsSync(resolve(cwd, "Cargo.toml"))) {
    add("cargo test", "cargo test", "Cargo.toml exists");
    add("cargo check", "cargo check", "Cargo.toml exists");
  }

  if (existsSync(resolve(cwd, "go.mod"))) {
    add("go test ./...", "go test", "go.mod exists");
  }

  if (existsSync(resolve(cwd, "pom.xml"))) add("mvn test", "maven test", "pom.xml exists");
  if (existsSync(resolve(cwd, "gradlew"))) add("./gradlew test", "gradle wrapper test", "gradlew exists");
  else if (existsSync(resolve(cwd, "build.gradle")) || existsSync(resolve(cwd, "build.gradle.kts"))) add("gradle test", "gradle test", "Gradle build file exists");

  return suggestions.slice(0, 8);
}
