import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES,
	DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES,
	previewTextByBytesAndLines,
	providerToolResultSerializationOptionsFromEnv,
	serializeProviderContext,
	serializeProviderContextWithMetadata,
	serializeToolResultContent,
} from "../context.ts";

function contextWithToolResult(toolText: string, toolName = "read") {
	return {
		systemPrompt: "system instructions stay visible",
		messages: [
			{ role: "user", content: [{ type: "text", text: "please inspect the file" }] },
			{ role: "toolResult", toolName, content: [{ type: "text", text: toolText }] },
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
	const { prompt: optimized, metadata } = serializeProviderContextWithMetadata(contextWithToolResult(huge), {
		truncateToolResults: true,
		maxToolResultBytes: 4_000,
		maxToolResultLines: 50,
	});

	assert.ok(optimized.length < unoptimized.length * 0.25, `expected optimized prompt to be <25% of baseline (${optimized.length}/${unoptimized.length})`);
	assert.match(optimized, /# Pi system prompt/);
	assert.match(optimized, /## user/);
	assert.match(optimized, /## toolResult read/);
	assert.match(optimized, /## assistant/);
	assert.match(optimized, /Original: 2000 lines/);
	assert.match(optimized, /Original SHA-256: [a-f0-9]{64}/);
	assert.match(optimized, /If exact historical content is required/);
	assert.match(optimized, /<tool_result_preview_head>/);
	assert.match(optimized, /<tool_result_preview_tail>/);
	assert.match(optimized, /line-0000/);
	assert.match(optimized, /line-1999/);
	assert.equal(metadata.truncatedToolResults.length, 1);
	assert.equal(metadata.truncatedToolResults[0].toolName, "read");
	assert.equal(metadata.truncatedToolResults[0].originalLines, 2_000);
	assert.ok(metadata.truncatedToolResults[0].omittedBytes > 0);
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

test("preview preserves head and tail while respecting byte and line content ceilings", () => {
	const preview = previewTextByBytesAndLines("one\ntwo\nthree\nfour", 9, 2);
	assert.equal(preview.truncated, true);
	assert.match(preview.headText, /one/);
	assert.match(preview.tailText, /four/);
	assert.ok(preview.previewLines <= 2);
	assert.ok(preview.previewBytes <= 9);
});

test("env parser uses Pi-sized defaults and accepts common false values", () => {
	assert.deepEqual(providerToolResultSerializationOptionsFromEnv({}), {
		truncateToolResults: true,
		maxToolResultBytes: DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES,
		maxToolResultLines: DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES,
	});
	for (const value of ["0", "false", "no", "off"]) {
		assert.equal(providerToolResultSerializationOptionsFromEnv({ CURSOR_COMPOSER_PROVIDER_TRUNCATE_TOOL_RESULTS: value }).truncateToolResults, false);
	}
	assert.deepEqual(
		providerToolResultSerializationOptionsFromEnv({}, { maxToolResultBytes: 12_345, maxToolResultLines: 678 }),
		{ truncateToolResults: true, maxToolResultBytes: 12_345, maxToolResultLines: 678 },
	);
	assert.equal(DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES, 51_200);
	assert.equal(DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES, 2_000);
});

test("ten-turn provider context keeps conversation structure while truncating large historical tool outputs", () => {
	const messages: Array<{ role: string; content: Array<{ type: string; text: string }>; toolName?: string }> = [];
	for (let turn = 1; turn <= 10; turn += 1) {
		messages.push({
			role: "user",
			content: [{ type: "text", text: `turn-${turn}: inspect evidence and answer with the turn marker` }],
		});
		const toolName = turn % 2 === 0 ? "bash" : "read";
		const tailMarker = toolName === "bash" ? `TURN-${turn}-TAIL-EXIT-STATUS-1` : `TURN-${turn}-TAIL-FILE-END`;
		const toolText = Array.from(
			{ length: 120 },
			(_, line) => `turn-${turn} ${toolName} line-${line.toString().padStart(3, "0")} ${line === 119 ? tailMarker : "x".repeat(60)}`,
		).join("\n");
		messages.push({
			role: "toolResult",
			toolName,
			content: [{ type: "text", text: toolText }],
		});
		messages.push({
			role: "assistant",
			content: [{ type: "text", text: `turn-${turn}: evidence acknowledged` }],
		});
	}
	messages.push({
		role: "user",
		content: [{ type: "text", text: "final: summarize all ten turns" }],
	});

	const context = { systemPrompt: "system instructions stay visible", messages };
	const baseline = serializeProviderContext(context, { truncateToolResults: false });
	const { prompt, metadata } = serializeProviderContextWithMetadata(context, {
		truncateToolResults: true,
		maxToolResultBytes: 1_000,
		maxToolResultLines: 12,
	});

	assert.ok(prompt.length < baseline.length * 0.3, `expected ten-turn optimized prompt to be <30% of baseline (${prompt.length}/${baseline.length})`);
	assert.equal(metadata.truncatedToolResults.length, 10);
	assert.equal(metadata.truncatedToolResults.filter((item) => item.toolName === "bash").length, 5);
	assert.equal(metadata.truncatedToolResults.filter((item) => item.toolName === "read").length, 5);
	assert.match(prompt, /# Pi system prompt/);
	assert.match(prompt, /final: summarize all ten turns/);
	for (let turn = 1; turn <= 10; turn += 1) {
		assert.match(prompt, new RegExp(`turn-${turn}: inspect evidence`));
		assert.match(prompt, new RegExp(`turn-${turn}: evidence acknowledged`));
		assert.match(prompt, new RegExp(`turn-${turn} (bash|read) line-000`));
		assert.match(prompt, new RegExp(`TURN-${turn}-TAIL-(EXIT-STATUS-1|FILE-END)`));
	}
	assert.match(prompt, /Original SHA-256: [a-f0-9]{64}/);
	assert.match(prompt, /<tool_result_preview_head>/);
	assert.match(prompt, /<tool_result_preview_tail>/);
});
