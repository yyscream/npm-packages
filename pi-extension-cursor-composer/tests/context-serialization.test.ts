import assert from "node:assert/strict";
import test from "node:test";
import {
	previewTextByBytesAndLines,
	serializeProviderContext,
	serializeToolResultContent,
} from "../context.ts";

function contextWithToolResult(toolText: string) {
	return {
		systemPrompt: "system instructions stay visible",
		messages: [
			{ role: "user", content: [{ type: "text", text: "please inspect the file" }] },
			{ role: "toolResult", toolName: "read", content: [{ type: "text", text: toolText }] },
			{ role: "assistant", content: [{ type: "text", text: "I inspected it." }] },
			{ role: "user", content: [{ type: "text", text: "now summarize" }] },
		],
	};
}

test("small tool results remain intact", () => {
	const small = "alpha\nbeta\ngamma";
	const prompt = serializeProviderContext(contextWithToolResult(small), {
		truncateToolResults: true,
		maxToolResultBytes: 1_000,
		maxToolResultLines: 100,
	});
	assert.match(prompt, /# Pi system prompt/);
	assert.match(prompt, /## user/);
	assert.match(prompt, /## toolResult read/);
	assert.match(prompt, /alpha\nbeta\ngamma/);
	assert.doesNotMatch(prompt, /Large tool result truncated/);
});

test("large tool results are previewed with metadata while preserving conversation skeleton", () => {
	const huge = Array.from({ length: 2_000 }, (_, i) => `line-${i.toString().padStart(4, "0")} ${"x".repeat(80)}`).join("\n");
	const unoptimized = serializeProviderContext(contextWithToolResult(huge), {
		truncateToolResults: false,
	});
	const optimized = serializeProviderContext(contextWithToolResult(huge), {
		truncateToolResults: true,
		maxToolResultBytes: 4_000,
		maxToolResultLines: 50,
	});

	assert.ok(optimized.length < unoptimized.length * 0.2, `expected optimized prompt to be <20% of baseline (${optimized.length}/${unoptimized.length})`);
	assert.match(optimized, /# Pi system prompt/);
	assert.match(optimized, /## user/);
	assert.match(optimized, /## toolResult read/);
	assert.match(optimized, /## assistant/);
	assert.match(optimized, /Original: 2000 lines/);
	assert.match(optimized, /If exact content is needed, use available tools to re-read/);
	assert.match(optimized, /<tool_result_preview>/);
	assert.match(optimized, /line-0000/);
	assert.doesNotMatch(optimized, /line-1999/);
});

test("tool-result truncation can be disabled", () => {
	const huge = "a".repeat(20_000);
	const rendered = serializeToolResultContent([{ type: "text", text: huge }], {
		truncateToolResults: false,
		maxToolResultBytes: 10,
		maxToolResultLines: 1,
	});
	assert.equal(rendered, huge);
});

test("preview respects byte and line ceilings", () => {
	const preview = previewTextByBytesAndLines("one\ntwo\nthree\nfour", 9, 2);
	assert.equal(preview.truncated, true);
	assert.equal(preview.text, "one\ntwo");
	assert.equal(preview.previewLines, 2);
	assert.ok(preview.previewBytes <= 9);
});
