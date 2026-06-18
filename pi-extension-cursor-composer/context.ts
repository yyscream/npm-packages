import { createHash } from "node:crypto";

// Keep provider replay truncation aligned with Pi's normal tool-output truncation defaults.
// These mirror @earendil-works/pi-coding-agent DEFAULT_MAX_BYTES / DEFAULT_MAX_LINES
// without adding a test-time dependency on Pi internals for this source-repo package.
export const DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES = 51_200;
export const DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES = 2_000;

export type ProviderToolResultSerializationOptions = {
	truncateToolResults: boolean;
	maxToolResultBytes: number;
	maxToolResultLines: number;
};

export type TruncatedToolResultMetadata = {
	toolName: string;
	originalBytes: number;
	originalLines: number;
	previewBytes: number;
	previewLines: number;
	omittedBytes: number;
	sha256: string;
};

export type ProviderContextSerializationMetadata = {
	truncatedToolResults: TruncatedToolResultMetadata[];
};

export type ProviderContextSerializationResult = {
	prompt: string;
	metadata: ProviderContextSerializationMetadata;
};

export type ProviderContextSerializationOptions = Partial<ProviderToolResultSerializationOptions> & {
	includeSystemPrompt?: boolean;
	systemPrompt?: string;
	messages?: unknown[];
	taskLines?: string[];
	conversationTitle?: string;
};

type TextPreview = {
	text: string;
	headText: string;
	tailText: string;
	truncated: boolean;
	originalBytes: number;
	originalLines: number;
	previewBytes: number;
	previewLines: number;
	sha256: string;
};

function envBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	const normalized = value.trim().toLowerCase();
	if (["0", "false", "no", "off"].includes(normalized)) return false;
	if (["1", "true", "yes", "on"].includes(normalized)) return true;
	return fallback;
}

function byteLength(text: string): number {
	return Buffer.byteLength(text, "utf8");
}

function lineCount(text: string): number {
	if (!text) return 0;
	return text.split(/\r?\n/).length;
}

function sha256(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kib = bytes / 1024;
	if (kib < 1024) return `${kib.toFixed(1)} KiB`;
	return `${(kib / 1024).toFixed(1)} MiB`;
}

function normalizeText(value: unknown): string {
	if (typeof value === "string") return value;
	if (value == null) return "";
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function clipTextToBytes(text: string, maxBytes: number): string {
	if (byteLength(text) <= maxBytes) return text;
	let clipped = "";
	for (const char of text) {
		if (byteLength(clipped + char) > maxBytes) break;
		clipped += char;
	}
	return clipped;
}

function takeHead(lines: string[], maxLines: number, maxBytes: number): string {
	const selected = lines.slice(0, Math.max(0, maxLines));
	const parts: string[] = [];
	let usedBytes = 0;
	for (const line of selected) {
		const prefix = parts.length === 0 ? "" : "\n";
		const candidate = `${prefix}${line}`;
		const candidateBytes = byteLength(candidate);
		if (usedBytes + candidateBytes > maxBytes) {
			const remaining = Math.max(0, maxBytes - usedBytes - byteLength(prefix));
			const clipped = clipTextToBytes(line, remaining);
			if (clipped) parts.push(`${prefix}${clipped}`);
			break;
		}
		parts.push(candidate);
		usedBytes += candidateBytes;
	}
	return parts.join("");
}

function takeTail(lines: string[], maxLines: number, maxBytes: number): string {
	const selected = lines.slice(Math.max(0, lines.length - Math.max(0, maxLines)));
	const parts: string[] = [];
	let usedBytes = 0;
	for (let index = selected.length - 1; index >= 0; index -= 1) {
		const line = selected[index];
		const suffix = parts.length === 0 ? "" : "\n";
		const candidate = `${line}${suffix}`;
		const candidateBytes = byteLength(candidate);
		if (usedBytes + candidateBytes > maxBytes) {
			const remaining = Math.max(0, maxBytes - usedBytes - byteLength(suffix));
			const clipped = clipTextToBytes(line, remaining);
			if (clipped) parts.unshift(`${clipped}${suffix}`);
			break;
		}
		parts.unshift(candidate);
		usedBytes += candidateBytes;
	}
	return parts.join("");
}

export function providerToolResultSerializationOptionsFromEnv(
	env: NodeJS.ProcessEnv = process.env,
	defaults: Pick<ProviderToolResultSerializationOptions, "maxToolResultBytes" | "maxToolResultLines"> = {
		maxToolResultBytes: DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES,
		maxToolResultLines: DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES,
	},
): ProviderToolResultSerializationOptions {
	return {
		truncateToolResults: envBoolean(env.CURSOR_COMPOSER_PROVIDER_TRUNCATE_TOOL_RESULTS, true),
		maxToolResultBytes: defaults.maxToolResultBytes,
		maxToolResultLines: defaults.maxToolResultLines,
	};
}

export function contentToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return normalizeText(content);
	return content
		.map((block: any) => {
			if (block?.type === "text") return block.text ?? "";
			if (block?.type === "thinking") return `[thinking]\n${block.thinking ?? ""}`;
			if (block?.type === "toolCall") return `[tool call: ${block.name ?? "unknown"}]\n${normalizeText(block.arguments)}`;
			if (block?.type === "image") return "[image omitted by Pi Cursor provider wrapper]";
			return normalizeText(block);
		})
		.filter(Boolean)
		.join("\n");
}

export function previewTextByBytesAndLines(
	text: string,
	maxBytes: number,
	maxLines: number,
): TextPreview {
	const originalBytes = byteLength(text);
	const originalLines = lineCount(text);
	const digest = sha256(text);
	if (originalBytes <= maxBytes && originalLines <= maxLines) {
		return {
			text,
			headText: text,
			tailText: "",
			truncated: false,
			originalBytes,
			originalLines,
			previewBytes: originalBytes,
			previewLines: originalLines,
			sha256: digest,
		};
	}

	const lines = text.split(/\r?\n/);
	const headLineBudget = Math.max(1, Math.ceil(maxLines / 2));
	const tailLineBudget = Math.max(0, maxLines - headLineBudget);
	const headByteBudget = Math.max(1, Math.ceil(maxBytes / 2));
	const tailByteBudget = Math.max(0, maxBytes - headByteBudget);
	const headText = takeHead(lines, headLineBudget, headByteBudget);
	const tailText = tailLineBudget > 0 && tailByteBudget > 0 ? takeTail(lines, tailLineBudget, tailByteBudget) : "";
	const textParts = [headText];
	if (tailText) textParts.push("[... middle omitted ...]", tailText);
	const previewText = textParts.filter(Boolean).join("\n");

	return {
		text: previewText,
		headText,
		tailText,
		truncated: true,
		originalBytes,
		originalLines,
		previewBytes: byteLength(headText) + byteLength(tailText),
		previewLines: lineCount(headText) + lineCount(tailText),
		sha256: digest,
	};
}

export function serializeToolResultContent(
	content: unknown,
	options: ProviderToolResultSerializationOptions,
	metadata?: { toolName?: string; truncatedToolResults?: TruncatedToolResultMetadata[] },
): string {
	const text = contentToText(content);
	if (!options.truncateToolResults) return text;
	const preview = previewTextByBytesAndLines(text, options.maxToolResultBytes, options.maxToolResultLines);
	if (!preview.truncated) return text;
	const toolName = metadata?.toolName ?? "tool";
	metadata?.truncatedToolResults?.push({
		toolName,
		originalBytes: preview.originalBytes,
		originalLines: preview.originalLines,
		previewBytes: preview.previewBytes,
		previewLines: preview.previewLines,
		omittedBytes: Math.max(0, preview.originalBytes - preview.previewBytes),
		sha256: preview.sha256,
	});
	return [
		"[Large tool result truncated by Pi Cursor provider wrapper]",
		`Tool: ${toolName}.`,
		`Original: ${preview.originalLines} lines, ${formatBytes(preview.originalBytes)}.`,
		`Included preview: ${preview.previewLines} lines, ${formatBytes(preview.previewBytes)}.`,
		`Original SHA-256: ${preview.sha256}.`,
		"Reason: avoid resending very large prior Pi tool outputs to Cursor Composer on every provider turn.",
		"If exact historical content is required, disable CURSOR_COMPOSER_PROVIDER_TRUNCATE_TOOL_RESULTS or use available tools to re-read/rerun when safe and equivalent.",
		"",
		"<tool_result_preview_head>",
		preview.headText,
		"</tool_result_preview_head>",
		...(preview.tailText
			? ["", "<tool_result_preview_tail>", preview.tailText, "</tool_result_preview_tail>"]
			: []),
	].join("\n");
}

export function serializeProviderContextWithMetadata(
	context: unknown,
	options: ProviderContextSerializationOptions = {},
): ProviderContextSerializationResult {
	const contextObject = (context ?? {}) as any;
	const toolOptions: ProviderToolResultSerializationOptions = {
		...providerToolResultSerializationOptionsFromEnv(),
		...options,
	};
	const metadata: ProviderContextSerializationMetadata = { truncatedToolResults: [] };
	const includeSystemPrompt = options.includeSystemPrompt ?? true;
	const systemPrompt = options.systemPrompt ?? contextObject.systemPrompt;
	const messages = options.messages ?? contextObject.messages ?? [];
	const taskLines = options.taskLines ?? [
		"You are being called from Pi through the Cursor SDK Composer 2.5 provider wrapper.",
		"Respond to the latest user request. If you modify files, summarize the exact changes and verification.",
	];
	const lines: string[] = [];
	if (includeSystemPrompt && systemPrompt) {
		lines.push("# Pi system prompt", String(systemPrompt), "");
	}
	lines.push("# Task", ...taskLines, "", options.conversationTitle ?? "# Conversation");
	for (const message of messages as any[]) {
		if (message?.role === "toolResult") {
			const toolName = message.toolName ?? "tool";
			lines.push(
				`## toolResult ${toolName}`,
				serializeToolResultContent(message.content, toolOptions, {
					toolName,
					truncatedToolResults: metadata.truncatedToolResults,
				}),
				"",
			);
		} else {
			lines.push(`## ${message?.role ?? "message"}`, contentToText(message?.content), "");
		}
	}
	return { prompt: lines.join("\n").trim(), metadata };
}

export function serializeProviderContext(context: unknown, options: ProviderContextSerializationOptions = {}): string {
	return serializeProviderContextWithMetadata(context, options).prompt;
}
