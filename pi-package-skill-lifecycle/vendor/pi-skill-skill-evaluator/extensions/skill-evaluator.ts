import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(extensionDir);
const evaluatorScript = join(packageRoot, "skills", "skill-evaluator", "scripts", "skill_eval.py");

type ExecResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;

let cachedPython: string | undefined;

const OutputOptions = {
	format: Type.Optional(StringEnum(["markdown", "json"] as const, { description: "Report format returned to the tool result. Defaults to markdown." })),
	jsonOutput: Type.Optional(Type.String({ description: "Optional path to write the JSON report. Relative paths resolve from cwd." })),
	markdownOutput: Type.Optional(Type.String({ description: "Optional path to write the Markdown report. Relative paths resolve from cwd." })),
	skipTests: Type.Optional(Type.Boolean({ description: "Do not execute tests under target skill tests/ directories." })),
	testTimeout: Type.Optional(Type.Number({ description: "Per-skill test timeout in seconds. Defaults to 60." })),
};

const EvalRunParams = Type.Object({
	skillPath: Type.String({ description: "Path to SKILL.md or a skill directory. Relative paths resolve from cwd; leading @ is accepted." }),
	...OutputOptions,
});

const EvalAllParams = Type.Object({
	enabledOnly: Type.Optional(Type.Boolean({ description: "Only evaluate skills that appear enabled by Pi settings filters." })),
	cwd: Type.Optional(Type.String({ description: "Project cwd used for project skill discovery. Defaults to the current Pi cwd." })),
	agentDir: Type.Optional(Type.String({ description: "Optional Pi agent directory override. Defaults to PI_CODING_AGENT_DIR or ~/.pi/agent." })),
	skillRoot: Type.Optional(Type.Array(Type.String(), { description: "Additional skill roots to discover." })),
	noSettings: Type.Optional(Type.Boolean({ description: "Ignore Pi settings and evaluate only default/explicit roots." })),
	...OutputOptions,
});

function cleanPath(value: string): string {
	return value.trim().replace(/^@+/, "");
}

function resolveFromCwd(value: string | undefined, cwd: string): string | undefined {
	if (!value) return undefined;
	const clean = cleanPath(value);
	return isAbsolute(clean) ? clean : resolve(cwd, clean);
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
	throw new Error("skill evaluator requires python3/python/py on PATH.");
}

async function runEvaluator(pi: ExtensionAPI, args: string[], signal?: AbortSignal): Promise<ExecResult> {
	const python = await resolvePython(pi, signal);
	return await pi.exec(python, [evaluatorScript, ...args], {
		cwd: packageRoot,
		timeout: 180_000,
		signal,
	});
}

function appendOutputArgs(args: string[], params: { format?: string; jsonOutput?: string; markdownOutput?: string; skipTests?: boolean; testTimeout?: number }, ctx: ExtensionContext): void {
	args.push("--format", params.format ?? "markdown");
	if (params.jsonOutput) args.push("--json-output", resolveFromCwd(params.jsonOutput, ctx.cwd)!);
	if (params.markdownOutput) args.push("--markdown-output", resolveFromCwd(params.markdownOutput, ctx.cwd)!);
	if (params.skipTests) args.push("--skip-tests");
	if (typeof params.testTimeout === "number") args.push("--test-timeout", String(Math.max(1, Math.floor(params.testTimeout))));
}

function formatToolResult(result: ExecResult): string {
	const text = result.stdout || result.stderr || "skill evaluator produced no output";
	if (result.code === 0) return text;
	return `${text}\n\n[skill evaluator exited with code ${result.code}; code 1 means blocking skill-evaluation failures were found.]`;
}

export default function skillEvaluatorExtension(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "skill_eval_run",
		label: "Skill Eval Run",
		description: "Evaluate one Pi/Agent Skill for structure, routing quality, safety, referenced files, and tests. Returns Markdown or JSON and exits code 1 on blocking failures.",
		promptSnippet: "Evaluate one Pi or Agent Skills SKILL.md contract and return a JSON/Markdown report.",
		promptGuidelines: [
			"Use skill_eval_run when reviewing one skill before enabling, publishing, or relying on it.",
			"Use skill_eval_run with skipTests=true for untrusted third-party skills because skill tests execute code.",
		],
		parameters: EvalRunParams,
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const skillPath = resolveFromCwd(params.skillPath, ctx.cwd)!;
			const args = ["run", skillPath];
			appendOutputArgs(args, params, ctx);
			const result = await runEvaluator(pi, args, signal);
			return {
				content: [{ type: "text", text: formatToolResult(result) }],
				details: { exitCode: result.code, stdout: result.stdout, stderr: result.stderr, args },
			};
		},
	});

	pi.registerTool({
		name: "skill_eval_all",
		label: "Skill Eval All",
		description: "Evaluate discovered Pi/Agent Skills, optionally enabled-only, for structure, routing quality, safety, referenced files, and tests. Returns Markdown or JSON and exits code 1 on blocking failures.",
		promptSnippet: "Evaluate discovered Pi skills, including enabled-only mode, and return a JSON/Markdown report.",
		promptGuidelines: [
			"Use skill_eval_all -- enabledOnly=true when the user asks for a quality gate over enabled skills.",
			"Use skill_eval_all with skipTests=true for a read-only structural audit of untrusted skills.",
		],
		parameters: EvalAllParams,
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const args = ["all"];
			if (params.enabledOnly) args.push("--enabled-only");
			if (params.cwd) args.push("--cwd", resolveFromCwd(params.cwd, ctx.cwd)!);
			if (params.agentDir) args.push("--agent-dir", resolveFromCwd(params.agentDir, ctx.cwd)!);
			for (const root of params.skillRoot ?? []) args.push("--skill-root", resolveFromCwd(root, ctx.cwd)!);
			if (params.noSettings) args.push("--no-settings");
			appendOutputArgs(args, params, ctx);
			const result = await runEvaluator(pi, args, signal);
			return {
				content: [{ type: "text", text: formatToolResult(result) }],
				details: { exitCode: result.code, stdout: result.stdout, stderr: result.stderr, args },
			};
		},
	});
}
