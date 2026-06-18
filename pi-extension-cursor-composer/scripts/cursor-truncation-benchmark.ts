import { Agent } from "@cursor/sdk";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeProviderContext } from "../context.ts";

const MODEL_ID = "composer-2.5";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = join(PACKAGE_DIR, "benchmark-output");
const TURN_COUNT = Math.min(10, Math.max(1, Number(process.env.CURSOR_COMPOSER_BENCHMARK_TURNS ?? 10)));
const TOOL_RESULT_TARGET_BYTES = Math.max(12_000, Number(process.env.CURSOR_COMPOSER_BENCHMARK_TOOL_BYTES ?? 32_000));
const BENCHMARK_ORDER = ["optimized", "original"] as const;

type Usage = {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
};

type BenchmarkTask = {
	id: string;
	prompt: string;
	expectedEvidence: string[];
};

type TurnRecord = {
	variant: "original" | "optimized";
	turn: number;
	taskId: string;
	promptBytes: number;
	usage?: Usage;
	totalUsage: number;
	status?: string;
	durationMs: number;
	result: string;
	resultChars: number;
	eventTypes: Record<string, number>;
	toolLikeEvents: number;
	quality: {
		nonEmpty: boolean;
		mentionsExpectedEvidence: boolean;
		refusalOrUnable: boolean;
		jsonLike: boolean;
	};
};

const TASKS: BenchmarkTask[] = [
	{
		id: "purpose",
		prompt: "Inspect the local package files if needed. Explain this Pi extension's purpose and name the provider/model it registers. Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["README.md", "package.json"],
	},
	{
		id: "commands",
		prompt: "Inspect index.ts or README.md. List the registered slash commands exposed by this extension. Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["index.ts", "README.md"],
	},
	{
		id: "tool-truncation-default",
		prompt: "Inspect context.ts. What happens to a large Pi toolResult by default, and what metadata is preserved? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["context.ts"],
	},
	{
		id: "truncation-env",
		prompt: "Inspect context.ts and README.md. Which environment variables control provider tool-result truncation? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["context.ts", "README.md"],
	},
	{
		id: "provider-usage",
		prompt: "Inspect index.ts. How does the provider report Cursor SDK token usage back to Pi? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["index.ts"],
	},
	{
		id: "pricing",
		prompt: "Inspect index.ts and README.md. Summarize the default Composer 2.5 pricing tier and override variables. Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["index.ts", "README.md"],
	},
	{
		id: "heartbeat",
		prompt: "Inspect index.ts and README.md. Explain provider heartbeat/verbosity behavior. Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["index.ts", "README.md"],
	},
	{
		id: "tests",
		prompt: "Inspect package.json and tests. What offline tests exist for truncation behavior? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["package.json", "tests/context-serialization.test.ts"],
	},
	{
		id: "package-files",
		prompt: "Inspect package.json. Which files are included in the published package and why does context.ts need to be there? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["package.json", "context.ts"],
	},
	{
		id: "safety",
		prompt: "Inspect README.md and index.ts. What safety warnings or defaults matter before letting Cursor Composer run tools or edit files? Return compact JSON with keys answer, evidenceFiles, and confidence.",
		expectedEvidence: ["README.md", "index.ts"],
	},
];

function bytes(text: string): number {
	return Buffer.byteLength(text, "utf8");
}

function totalUsage(usage: Usage | undefined): number {
	if (!usage) return 0;
	return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
}

function usageString(usage: Usage | undefined): string {
	if (!usage) return "usage=none";
	return `input=${usage.inputTokens ?? 0} output=${usage.outputTokens ?? 0} cacheRead=${usage.cacheReadTokens ?? 0} cacheWrite=${usage.cacheWriteTokens ?? 0} total=${totalUsage(usage)}`;
}

async function createBenchmarkWorkspace(): Promise<string> {
	const workspace = mkdtempSync(join(tmpdir(), "cursor-composer-benchmark-"));
	for (const entry of ["README.md", "index.ts", "context.ts", "package.json", "tests"]) {
		await cp(join(PACKAGE_DIR, entry), join(workspace, entry), { recursive: true });
	}
	return workspace;
}

async function sourceCorpus(): Promise<string> {
	const files = ["README.md", "index.ts", "context.ts", "package.json", "tests/context-serialization.test.ts"];
	const parts: string[] = [];
	for (const file of files) {
		const text = await readFile(join(PACKAGE_DIR, file), "utf8");
		parts.push(`===== ${file} =====\n${text}`);
	}
	return parts.join("\n\n");
}

function makeLargeToolResult(corpus: string, turn: number): string {
	const header = [
		`Synthetic Pi prior tool output for benchmark turn ${turn}.`,
		"This simulates a large read/bash result already present in Pi conversation history.",
		"The current user request should still be answered by inspecting local files when exact details are needed.",
		"",
	].join("\n");
	let body = header;
	let pass = 0;
	while (bytes(body) < TOOL_RESULT_TARGET_BYTES) {
		body += `\n--- corpus repetition ${pass++} ---\n${corpus.slice(0, 12_000)}\n`;
	}
	return body.slice(0, TOOL_RESULT_TARGET_BYTES);
}

function quality(result: string, expectedEvidence: string[]): TurnRecord["quality"] {
	const lower = result.toLowerCase();
	return {
		nonEmpty: result.trim().length > 20,
		mentionsExpectedEvidence: expectedEvidence.some((file) => result.includes(file)),
		refusalOrUnable: /unable|can't access|cannot access|don't have access|i can’t access/i.test(result),
		jsonLike: result.trim().startsWith("{") || result.includes('"answer"'),
	};
}

async function runCursorTurn(workspace: string, prompt: string): Promise<{ result: string; status?: string; usage?: Usage; eventTypes: Record<string, number>; toolLikeEvents: number }> {
	const apiKey = process.env.CURSOR_API_KEY;
	if (!apiKey) throw new Error("CURSOR_API_KEY is required for live benchmark");
	let usage: Usage | undefined;
	const eventTypes: Record<string, number> = {};
	let toolLikeEvents = 0;
	const agent = await Agent.create({
		apiKey,
		model: { id: MODEL_ID },
		mode: "agent",
		local: {
			cwd: workspace,
			autoReview: false,
			sandboxOptions: { enabled: false },
		},
	});
	try {
		const run = await agent.send(prompt, {
			mode: "agent",
			onDelta: ({ update }: { update: any }) => {
				const type = String(update?.type ?? "unknown");
				eventTypes[type] = (eventTypes[type] ?? 0) + 1;
				const serialized = JSON.stringify(update ?? {}).toLowerCase();
				if (/tool|read|grep|search|command|file/.test(serialized)) toolLikeEvents++;
				if (update?.type === "turn-ended" && update.usage) usage = update.usage;
			},
		});
		const result = await run.wait();
		return {
			result: String(result?.result ?? ""),
			status: result?.status,
			usage,
			eventTypes,
			toolLikeEvents,
		};
	} finally {
		await agent[Symbol.asyncDispose]?.();
		agent.close?.();
	}
}

async function runVariant(variant: "original" | "optimized", workspace: string, corpus: string): Promise<TurnRecord[]> {
	const truncateToolResults = variant === "optimized";
	const transcript: any[] = [];
	const records: TurnRecord[] = [];
	const tasks = TASKS.slice(0, TURN_COUNT);
	for (let index = 0; index < tasks.length; index++) {
		const task = tasks[index];
		const turn = index + 1;
		const priorToolResult = {
			role: "toolResult",
			toolName: "read",
			content: [{ type: "text", text: makeLargeToolResult(corpus, turn) }],
		};
		const user = { role: "user", content: [{ type: "text", text: task.prompt }] };
		const context = {
			systemPrompt: [
				"You are Composer 2.5 running through a Pi provider benchmark.",
				"Use local workspace inspection tools when useful. Do not modify files. Do not run destructive commands.",
				"Return compact JSON only, with keys answer, evidenceFiles, and confidence.",
			].join("\n"),
			messages: [...transcript, priorToolResult, user],
		};
		const prompt = serializeProviderContext(context, {
			truncateToolResults,
			maxToolResultBytes: 8_000,
			maxToolResultLines: 80,
		});
		const started = Date.now();
		const run = await runCursorTurn(workspace, prompt);
		const record: TurnRecord = {
			variant,
			turn,
			taskId: task.id,
			promptBytes: bytes(prompt),
			usage: run.usage,
			totalUsage: totalUsage(run.usage),
			status: run.status,
			durationMs: Date.now() - started,
			result: run.result,
			resultChars: run.result.length,
			eventTypes: run.eventTypes,
			toolLikeEvents: run.toolLikeEvents,
			quality: quality(run.result, task.expectedEvidence),
		};
		records.push(record);
		transcript.push(priorToolResult, user, { role: "assistant", content: [{ type: "text", text: run.result }] });
		console.log(`${variant} turn=${turn} task=${task.id} promptBytes=${record.promptBytes} ${usageString(record.usage)} quality=${JSON.stringify(record.quality)}`);
	}
	return records;
}

function summarize(records: TurnRecord[]) {
	const totalPromptBytes = records.reduce((sum, record) => sum + record.promptBytes, 0);
	const totalTokens = records.reduce((sum, record) => sum + record.totalUsage, 0);
	return {
		turns: records.length,
		totalPromptBytes,
		totalTokens,
		inputTokens: records.reduce((sum, record) => sum + (record.usage?.inputTokens ?? 0), 0),
		outputTokens: records.reduce((sum, record) => sum + (record.usage?.outputTokens ?? 0), 0),
		cacheReadTokens: records.reduce((sum, record) => sum + (record.usage?.cacheReadTokens ?? 0), 0),
		cacheWriteTokens: records.reduce((sum, record) => sum + (record.usage?.cacheWriteTokens ?? 0), 0),
		jsonLike: records.filter((record) => record.quality.jsonLike).length,
		nonEmpty: records.filter((record) => record.quality.nonEmpty).length,
		mentionsExpectedEvidence: records.filter((record) => record.quality.mentionsExpectedEvidence).length,
		refusalOrUnable: records.filter((record) => record.quality.refusalOrUnable).length,
		toolLikeEvents: records.reduce((sum, record) => sum + record.toolLikeEvents, 0),
	};
}

async function writeOutputs(original: TurnRecord[], optimized: TurnRecord[], runOrder: string[]) {
	await mkdir(OUTPUT_DIR, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const recordsPath = join(OUTPUT_DIR, `cursor-truncation-benchmark-${stamp}.jsonl`);
	const summaryPath = join(OUTPUT_DIR, `cursor-truncation-benchmark-${stamp}.summary.json`);
	const records = [...original, ...optimized];
	await writeFile(recordsPath, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
	const originalSummary = summarize(original);
	const optimizedSummary = summarize(optimized);
	const summary = {
		generatedAt: new Date().toISOString(),
		turns: TURN_COUNT,
		toolResultTargetBytes: TOOL_RESULT_TARGET_BYTES,
		runOrder,
		original: originalSummary,
		optimized: optimizedSummary,
		reductions: {
			promptBytesPct: Number(((1 - optimizedSummary.totalPromptBytes / originalSummary.totalPromptBytes) * 100).toFixed(1)),
			totalTokensPct: Number(((1 - optimizedSummary.totalTokens / originalSummary.totalTokens) * 100).toFixed(1)),
			inputTokensPct: Number(((1 - optimizedSummary.inputTokens / originalSummary.inputTokens) * 100).toFixed(1)),
		},
		recordsPath,
	};
	await writeFile(summaryPath, JSON.stringify(summary, null, 2));
	console.log(`recordsPath=${recordsPath}`);
	console.log(`summaryPath=${summaryPath}`);
	console.log(JSON.stringify(summary, null, 2));
}

async function main() {
	if (!process.argv.includes("--live") && process.env.CURSOR_COMPOSER_LIVE_BENCHMARK !== "true") {
		console.log("Dry run only. Set CURSOR_COMPOSER_LIVE_BENCHMARK=true or pass --live to call Cursor.");
		const corpus = await sourceCorpus();
		const originalPrompt = serializeProviderContext({ systemPrompt: "dry", messages: [{ role: "toolResult", toolName: "read", content: [{ type: "text", text: makeLargeToolResult(corpus, 1) }] }] }, { truncateToolResults: false });
		const optimizedPrompt = serializeProviderContext({ systemPrompt: "dry", messages: [{ role: "toolResult", toolName: "read", content: [{ type: "text", text: makeLargeToolResult(corpus, 1) }] }] }, { truncateToolResults: true, maxToolResultBytes: 8_000, maxToolResultLines: 80 });
		console.log(`dryOriginalPromptBytes=${bytes(originalPrompt)}`);
		console.log(`dryOptimizedPromptBytes=${bytes(optimizedPrompt)}`);
		console.log(`dryReduction=${((1 - bytes(optimizedPrompt) / bytes(originalPrompt)) * 100).toFixed(1)}%`);
		return;
	}
	const corpus = await sourceCorpus();
	const workspace = await createBenchmarkWorkspace();
	try {
		console.log(`benchmarkWorkspace=${workspace}`);
		console.log(`turns=${TURN_COUNT} toolResultTargetBytes=${TOOL_RESULT_TARGET_BYTES} order=${BENCHMARK_ORDER.join(",")}`);
		let original: TurnRecord[] = [];
		let optimized: TurnRecord[] = [];
		for (const variant of BENCHMARK_ORDER) {
			if (variant === "optimized") optimized = await runVariant("optimized", workspace, corpus);
			else original = await runVariant("original", workspace, corpus);
		}
		await writeOutputs(original, optimized, [...BENCHMARK_ORDER]);
	} finally {
		if (process.env.CURSOR_COMPOSER_KEEP_BENCHMARK_WORKSPACE !== "true") {
			await rm(workspace, { recursive: true, force: true });
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
