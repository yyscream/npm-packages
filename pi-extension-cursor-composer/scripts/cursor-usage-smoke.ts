import { Agent } from "@cursor/sdk";
import { serializeProviderContext } from "../context.ts";

const MODEL_ID = "composer-2.5";

type Usage = {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
};

function bytes(text: string): number {
	return Buffer.byteLength(text, "utf8");
}

function makeContext(extraUserText = "Reply with exactly: OK") {
	const hugeToolText = Array.from(
		{ length: 1_200 },
		(_, i) => `fixture-line-${i.toString().padStart(4, "0")} ${"x".repeat(90)}`,
	).join("\n");
	return {
		systemPrompt: "You are a smoke-test assistant. Do not edit files. Do not run shell commands unless explicitly required.",
		messages: [
			{ role: "user", content: [{ type: "text", text: "Read this large prior tool output and keep it in mind." }] },
			{ role: "toolResult", toolName: "read", content: [{ type: "text", text: hugeToolText }] },
			{ role: "assistant", content: [{ type: "text", text: "Acknowledged the prior tool output." }] },
			{ role: "user", content: [{ type: "text", text: extraUserText }] },
		],
	};
}

function totalUsage(usage: Usage | undefined): number {
	if (!usage) return 0;
	return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
}

function usageSummary(usage: Usage | undefined): string {
	if (!usage) return "usage=none";
	return `input=${usage.inputTokens ?? 0} output=${usage.outputTokens ?? 0} cacheRead=${usage.cacheReadTokens ?? 0} cacheWrite=${usage.cacheWriteTokens ?? 0} total=${totalUsage(usage)}`;
}

async function runPrompt(label: string, prompt: string): Promise<Usage | undefined> {
	const apiKey = process.env.CURSOR_API_KEY;
	if (!apiKey) throw new Error("CURSOR_API_KEY is required for live smoke test");
	let usage: Usage | undefined;
	const agent = await Agent.create({
		apiKey,
		model: { id: MODEL_ID },
		mode: "plan",
		local: {
			cwd: process.cwd(),
			autoReview: false,
			sandboxOptions: { enabled: false },
		},
	});
	try {
		const run = await agent.send(prompt, {
			mode: "plan",
			onDelta: ({ update }: { update: any }) => {
				if (update?.type === "turn-ended" && update.usage) usage = update.usage;
			},
		});
		const result = await run.wait();
		console.log(`${label}: status=${result?.status ?? "unknown"} promptBytes=${bytes(prompt)} ${usageSummary(usage)}`);
		console.log(`${label}: result=${String(result?.result ?? "").slice(0, 200).replace(/\s+/g, " ")}`);
		return usage;
	} finally {
		await agent[Symbol.asyncDispose]?.();
		agent.close?.();
	}
}

async function main() {
	if (!process.argv.includes("--live") && process.env.CURSOR_COMPOSER_LIVE_SMOKE !== "true") {
		console.log("Dry run only. Set CURSOR_COMPOSER_LIVE_SMOKE=true or pass --live to call Cursor.");
	}
	const live = process.argv.includes("--live") || process.env.CURSOR_COMPOSER_LIVE_SMOKE === "true";
	const context = makeContext();
	const baseline = serializeProviderContext(context, { truncateToolResults: false });
	const optimized = serializeProviderContext(context, {
		truncateToolResults: true,
		maxToolResultBytes: 8_000,
		maxToolResultLines: 80,
	});

	console.log(`baselinePromptBytes=${bytes(baseline)}`);
	console.log(`optimizedPromptBytes=${bytes(optimized)}`);
	console.log(`reduction=${((1 - bytes(optimized) / bytes(baseline)) * 100).toFixed(1)}%`);
	if (bytes(optimized) >= bytes(baseline) * 0.2) {
		throw new Error("optimized prompt should be at least 80% smaller than baseline for the smoke fixture");
	}
	if (!live) return;

	const baselineUsage = await runPrompt("baseline", baseline);
	const optimizedUsage = await runPrompt("optimized", optimized);
	if (totalUsage(optimizedUsage) >= totalUsage(baselineUsage)) {
		throw new Error("optimized live Cursor usage should be lower than baseline live Cursor usage");
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
