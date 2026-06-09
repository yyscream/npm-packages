import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(extensionDir);
const skillDir = join(packageRoot, "skills", "repo-explorer");
const scriptsDir = join(skillDir, "scripts");
const cacheDir = join(homedir(), ".pi", "agent", "state", "repo-explorer");

const ExploreParams = Type.Object({
	targetPath: Type.String({ description: "Repository or directory to explore. Relative paths resolve from cwd; leading @ is ignored." }),
	goal: Type.String({ description: "What the caller needs to understand, e.g. 'find auth flow'." }),
	depth: Type.Optional(StringEnum(["shallow", "standard", "deep"] as const, { description: "Exploration depth. Defaults to standard." })),
	budget: Type.Optional(StringEnum(["compact", "normal", "full"] as const, { description: "Output budget for model-visible content. Defaults to compact." })),
	includeEvidence: Type.Optional(Type.Boolean({ description: "Include selected evidence snippets in model-visible output. Defaults to false." })),
});

type Budget = "compact" | "normal" | "full";
type ExecResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;
type ReportStatus = "completed" | "failed";

type EffectivenessReportOptions = {
	startedAt: Date;
	completedAt: Date;
	params: {
		targetPath: string;
		goal: string;
		depth?: string;
		budget?: string;
		includeEvidence?: boolean;
	};
	repoPath?: string;
	depth: string;
	budget: Budget;
	includeEvidence: boolean;
	status: ReportStatus;
	handoff?: any;
	validation?: any;
	error?: unknown;
};

let cachedPython: string | undefined;

function cleanInputPath(value: string): string {
	return value.trim().replace(/^@+/, "");
}

function cacheKey(repoPath: string): string {
	const name = basename(repoPath).replace(/[^a-zA-Z0-9_.-]/g, "_") || "repo";
	const hash = createHash("sha256").update(repoPath).digest("hex").slice(0, 10);
	return `${name}-${hash}`;
}

function rel(repoRoot: string, filePath: string): string {
	const value = relative(repoRoot, filePath).replace(/\\/g, "/");
	return value && !value.startsWith("..") ? value : filePath.replace(/\\/g, "/");
}

async function resolvePython(pi: ExtensionAPI, signal?: AbortSignal): Promise<string> {
	if (cachedPython) return cachedPython;
	for (const command of ["python3", "python", "py"]) {
		const result = await pi.exec(command, ["--version"], { timeout: 5_000, signal }).catch(() => undefined);
		if (result?.code === 0) {
			cachedPython = command;
			return command;
		}
	}
	throw new Error("repo_explorer_explore requires python3/python/py on PATH.");
}

async function runPython(pi: ExtensionAPI, scriptName: string, args: string[], signal?: AbortSignal, timeout = 120_000): Promise<ExecResult> {
	const python = await resolvePython(pi, signal);
	const scriptPath = join(scriptsDir, scriptName);
	const result = await pi.exec(python, ["-X", "utf8", scriptPath, ...args], {
		cwd: packageRoot,
		timeout,
		signal,
	});
	if (result.code !== 0) {
		throw new Error(`${scriptName} failed (${result.code}): ${result.stderr || result.stdout}`.trim());
	}
	return result;
}

async function ensureReadableDirectory(targetPath: string, cwd: string): Promise<string> {
	const absolutePath = resolve(cwd, cleanInputPath(targetPath));
	await access(absolutePath);
	const info = await stat(absolutePath);
	if (!info.isDirectory()) throw new Error(`Target path is not a directory: ${absolutePath}`);
	return absolutePath;
}

function limitsFor(budget: Budget, includeEvidence: boolean) {
	if (budget === "full") return { files: 25, symbols: 30, deps: 20, evidence: includeEvidence ? 15 : 0 };
	if (budget === "normal") return { files: 15, symbols: 15, deps: 10, evidence: includeEvidence ? 3 : 0 };
	return { files: 8, symbols: 8, deps: 6, evidence: includeEvidence ? 2 : 0 };
}

function safeTimestamp(date: Date): string {
	return date.toISOString().replace(/[:.]/g, "-");
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function redactReportText(value: unknown): string {
	return String(value ?? "").replace(
		/(sk-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9_]{10,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]+|token\s*=\s*[^&\s]+|password\s*[:=]\s*[^,\s]+)/gi,
		"[REDACTED]",
	);
}

function markdownList(items: string[], fallback = "- None"): string {
	return items.length > 0 ? items.map((item) => `- ${redactReportText(item)}`).join("\n") : fallback;
}

function assessEffectiveness(status: ReportStatus, handoff?: any, validation?: any): { label: string; rationale: string[] } {
	if (status === "failed") {
		return { label: "failed", rationale: ["The invocation failed before a validated handoff could be returned."] };
	}

	const errors = handoff?.errors ?? [];
	const risks = handoff?.risks_and_unknowns ?? [];
	const keyFiles = handoff?.key_files ?? [];
	const symbols = handoff?.relevant_symbols ?? [];
	const errorCodes = new Set(errors.map((item: any) => item?.code).filter(Boolean));
	const rationale: string[] = [];

	if (!validation?.valid) {
		rationale.push("Handoff validation failed, so the exploration output needs review before use.");
		return { label: "needs-follow-up", rationale };
	}

	if (errorCodes.has("insufficient_scope") || errorCodes.has("no_match")) {
		rationale.push("The exploration reported insufficient scope or no goal-relevant matches.");
		return { label: "needs-follow-up", rationale };
	}

	if (keyFiles.length === 0 && symbols.length === 0) {
		rationale.push("No key files or symbols were identified, which limits downstream usefulness.");
		return { label: "partial", rationale };
	}

	if (errorCodes.size > 0 || risks.some((item: any) => item?.severity === "high")) {
		rationale.push("The handoff is valid but includes errors or high-severity risks that the caller should inspect.");
		return { label: "partial", rationale };
	}

	rationale.push("The handoff validated and identified goal-relevant files or symbols without blocking errors.");
	return { label: "effective", rationale };
}

function formatEffectivenessReport(options: EffectivenessReportOptions): string {
	const handoff = options.handoff ?? {};
	const validation = options.validation ?? {};
	const assessment = assessEffectiveness(options.status, handoff, validation);
	const errors = handoff.errors ?? [];
	const risks = handoff.risks_and_unknowns ?? [];
	const validationErrors = validation.errors ?? [];
	const targetPath = options.repoPath ?? cleanInputPath(options.params.targetPath);
	const runSeconds = Math.max(0, (options.completedAt.getTime() - options.startedAt.getTime()) / 1000).toFixed(2);

	const lines: string[] = [
		"# Repo Explorer Effectiveness Report",
		"",
		`- Generated: ${options.completedAt.toISOString()}`,
		`- Status: ${options.status}`,
		`- Assessment: ${assessment.label}`,
		`- Runtime: ${runSeconds}s`,
		`- Target path: \`${redactReportText(targetPath)}\``,
		`- Goal: ${redactReportText(options.params.goal)}`,
		"",
		"## Run Configuration",
		"",
		`- Depth: ${options.depth}`,
		`- Budget: ${options.budget}`,
		`- Evidence requested in tool output: ${options.includeEvidence ? "yes" : "no"}`,
		"",
		"## Effectiveness Signals",
		"",
		`- Handoff validation: ${validation.valid === true ? "valid" : validation.valid === false ? "invalid" : "not available"}`,
		`- Files indexed: ${handoff.index_info?.files_indexed ?? "not available"}`,
		`- Key files found: ${(handoff.key_files ?? []).length}`,
		`- Relevant symbols found: ${(handoff.relevant_symbols ?? []).length}`,
		`- Dependency edges found: ${(handoff.dependency_map ?? []).length}`,
		`- Evidence snippets collected: ${(handoff.evidence ?? []).length}`,
		`- Risks reported: ${risks.length}`,
		`- Errors reported: ${errors.length}`,
		"",
		"## Assessment Rationale",
		"",
		markdownList(assessment.rationale),
		"",
		"## Risks and Errors",
		"",
		markdownList([
			...risks.map((item: any) => `[${item?.severity ?? "unknown"}] ${item?.description ?? "Unnamed risk"}`),
			...errors.map((item: any) => `${item?.code ?? "unknown"}: ${item?.message ?? "Unnamed error"}`),
			...validationErrors.map((item: any) => `validation: ${item}`),
		]),
	];

	if (options.error) {
		lines.push("", "## Invocation Failure", "", `- ${redactReportText(errorMessage(options.error))}`);
	}

	lines.push("", "## Notes", "", "This report is written automatically by `repo_explorer_explore` after every invocation.");
	return lines.join("\n") + "\n";
}

async function writeEffectivenessReport(options: EffectivenessReportOptions): Promise<string> {
	await mkdir(skillDir, { recursive: true });
	const keySource = options.repoPath ?? cleanInputPath(options.params.targetPath) ?? "unresolved-target";
	const reportPath = join(skillDir, `repo-explorer-effectiveness-${safeTimestamp(options.startedAt)}-${cacheKey(keySource)}.md`);
	await writeFile(reportPath, formatEffectivenessReport(options), "utf8");
	return reportPath;
}

function formatHandoff(handoff: any, repoRoot: string, budget: Budget, includeEvidence: boolean, validation: any): string {
	const limits = limitsFor(budget, includeEvidence);
	const lines: string[] = [];
	const keyFiles = handoff.key_files ?? [];
	const symbols = handoff.relevant_symbols ?? [];
	const deps = handoff.dependency_map ?? [];
	const risks = handoff.risks_and_unknowns ?? [];
	const errors = handoff.errors ?? [];
	const evidence = handoff.evidence ?? [];

	lines.push(`repo_explorer_explore: ${validation?.valid ? "valid" : "invalid"} handoff`);
	lines.push(`goal: ${handoff.request?.goal ?? ""}`);
	lines.push(`repo: ${repoRoot}`);
	lines.push(`indexed: ${handoff.index_info?.files_indexed ?? 0} files, age ${handoff.index_info?.index_age_seconds ?? 0}s`);

	lines.push(`\nkey_files (${Math.min(keyFiles.length, limits.files)}/${keyFiles.length}):`);
	for (const item of keyFiles.slice(0, limits.files)) {
		const confidence = item.confidence ? `, confidence=${item.confidence}` : "";
		lines.push(`- ${rel(repoRoot, item.path)} — ${item.role}, ${item.relevance}${confidence}`);
	}

	if (symbols.length > 0) {
		lines.push(`\nsymbols (${Math.min(symbols.length, limits.symbols)}/${symbols.length}):`);
		for (const item of symbols.slice(0, limits.symbols)) {
			const confidence = item.confidence ? `, confidence=${item.confidence}` : "";
			lines.push(`- ${item.name} (${item.kind}) @ ${rel(repoRoot, item.file)}:${item.line_start}-${item.line_end}${confidence}`);
		}
	}

	if (deps.length > 0) {
		lines.push(`\ndependencies (${Math.min(deps.length, limits.deps)}/${deps.length}):`);
		for (const item of deps.slice(0, limits.deps)) lines.push(`- ${item.source} -> ${item.target} (${item.kind})`);
	}

	if (risks.length > 0) {
		lines.push("\nrisks:");
		for (const item of risks.slice(0, 5)) lines.push(`- [${item.severity}] ${item.description}`);
	}

	if (errors.length > 0) {
		lines.push("\nerrors:");
		for (const item of errors.slice(0, 5)) lines.push(`- ${item.code}: ${item.message}`);
	}

	if (limits.evidence > 0 && evidence.length > 0) {
		lines.push(`\nevidence (${Math.min(evidence.length, limits.evidence)}/${evidence.length}):`);
		for (const item of evidence.slice(0, limits.evidence)) {
			const confidence = item.confidence ? `, confidence=${item.confidence}` : "";
			lines.push(`- ${rel(repoRoot, item.file)}:${item.line_start}-${item.line_end}${confidence} — ${item.context}`);
			lines.push("```text");
			lines.push(String(item.snippet ?? "").split(/\r?\n/).slice(0, 12).join("\n"));
			lines.push("```");
		}
	}

	if (budget !== "full") lines.push("\nUse budget='normal'/'full' or includeEvidence=true only when more detail is needed.");
	return lines.join("\n");
}

async function buildOrRefreshIndex(pi: ExtensionAPI, repoPath: string, indexPath: string, signal?: AbortSignal): Promise<void> {
	await mkdir(cacheDir, { recursive: true });
	const refresh = await (async () => {
		try {
			return await runPython(pi, "refresh_repo_index.py", ["--repo", repoPath, "--data-dir", cacheDir], signal);
		} catch (error) {
			return error;
		}
	})();

	if (!(refresh instanceof Error)) return;
	await runPython(pi, "build_repo_index.py", ["--repo", repoPath, "--output", indexPath], signal);
}

export default function repoExplorerExtension(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "repo_explorer_explore",
		label: "Repo Explorer",
		description: "Build or refresh a local repo index, extract a goal-focused handoff, validate it, write an effectiveness report, and return compact repository exploration results.",
		promptSnippet: "Explore a local repository with cached indexing, compact validated handoff output, and a saved effectiveness report.",
		promptGuidelines: [
			"Use repo_explorer_explore before broad manual grep/read passes in unfamiliar repositories.",
			"Use repo_explorer_explore with budget='compact' first; request larger budgets only when the compact result is insufficient.",
			"Expect every invocation to write a Markdown effectiveness report under skills/repo-explorer/.",
		],
		parameters: ExploreParams,

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const startedAt = new Date();
			const depth = params.depth ?? "standard";
			const budget = (params.budget ?? "compact") as Budget;
			const includeEvidence = params.includeEvidence ?? false;
			let repoPath: string | undefined;

			try {
				repoPath = await ensureReadableDirectory(params.targetPath, ctx.cwd);
				const key = cacheKey(repoPath);
				const indexPath = join(cacheDir, `${key}-index.json`);
				const handoffPath = join(cacheDir, `${key}-handoff.json`);

				await buildOrRefreshIndex(pi, repoPath, indexPath, signal);

				const extract = await runPython(pi, "extract_explorer_handoff.py", [
					"--index", indexPath,
					"--goal", params.goal,
					"--depth", depth,
					"--target-paths", repoPath,
				], signal);
				await writeFile(handoffPath, extract.stdout, "utf8");

				const validate = await runPython(pi, "validate_handoff.py", ["--input", handoffPath], signal);
				const handoff = JSON.parse(await readFile(handoffPath, "utf8"));
				const validation = JSON.parse(validate.stdout);
				const reportPath = await writeEffectivenessReport({
					startedAt,
					completedAt: new Date(),
					params,
					repoPath,
					depth,
					budget,
					includeEvidence,
					status: "completed",
					handoff,
					validation,
				});
				const text = `${formatHandoff(handoff, repoPath, budget, includeEvidence, validation)}\n\neffectiveness_report: ${reportPath}`;

				return {
					content: [{ type: "text", text }],
					details: {
						repoPath,
						indexPath,
						handoffPath,
						effectivenessReportPath: reportPath,
						budget,
						includeEvidence,
						validation,
						handoff,
					},
				};
			} catch (error) {
				let reportPath: string;
				try {
					reportPath = await writeEffectivenessReport({
						startedAt,
						completedAt: new Date(),
						params,
						repoPath,
						depth,
						budget,
						includeEvidence,
						status: "failed",
						error,
					});
				} catch (reportError) {
					throw new Error(`${errorMessage(error)}\nAdditionally failed to write repo-explorer effectiveness report: ${errorMessage(reportError)}`);
				}
				throw new Error(`${errorMessage(error)}\nrepo_explorer_effectiveness_report: ${reportPath}`);
			}
		},
	});
}
