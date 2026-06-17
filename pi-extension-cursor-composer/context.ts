const DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES = 32_000;
const DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES = 500;

export type ProviderToolResultSerializationOptions = {
	truncateToolResults: boolean;
	maxToolResultBytes: number;
	maxToolResultLines: number;
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
	truncated: boolean;
	originalBytes: number;
	originalLines: number;
	previewBytes: number;
	previewLines: number;
};

function envBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	const normalized = value.trim().toLowerCase();
	if (["0", "false", "no", "off"].includes(normalized)) return false;
	if (["1", "true", "yes", "on"].includes(normalized)) return true;
	return fallback;
}

function envPositiveInteger(value: string | undefined, fallback: number): number {
	const parsed = value ? Number(value) : NaN;
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.floor(parsed);
}

function byteLength(text: string): number {
	return Buffer.byteLength(text, "utf8");
}

function lineCount(text: string): number {
	if (!text) return 0;
	return text.split(/\r?\n/).length;
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

export function providerToolResultSerializationOptionsFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): ProviderToolResultSerializationOptions {
	return {
		truncateToolResults: envBoolean(env.CURSOR_COMPOSER_PROVIDER_TRUNCATE_TOOL_RESULTS, true),
		maxToolResultBytes: envPositiveInteger(
			env.CURSOR_COMPOSER_PROVIDER_TOOL_RESULT_MAX_BYTES,
			DEFAULT_PROVIDER_TOOL_RESULT_MAX_BYTES,
		),
		maxToolResultLines: envPositiveInteger(
			env.CURSOR_COMPOSER_PROVIDER_TOOL_RESULT_MAX_LINES,
			DEFAULT_PROVIDER_TOOL_RESULT_MAX_LINES,
		),
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
	if (originalBytes <= maxBytes && originalLines <= maxLines) {
		return {
			text,
			truncated: false,
			originalBytes,
			originalLines,
			previewBytes: originalBytes,
			previewLines: originalLines,
		};
	}

	const lines = text.split(/\r?\n/).slice(0, Math.max(0, maxLines));
	const previewParts: string[] = [];
	let usedBytes = 0;
	for (const line of lines) {
		const suffix = previewParts.length === 0 ? "" : "\n";
		const candidate = `${suffix}${line}`;
		const candidateBytes = byteLength(candidate);
		if (usedBytes + candidateBytes > maxBytes) {
			const remaining = Math.max(0, maxBytes - usedBytes - byteLength(suffix));
			if (remaining > 0) {
				let clipped = "";
				for (const char of line) {
					if (byteLength(clipped + char) > remaining) break;
					clipped += char;
				}
				if (clipped) previewParts.push(`${suffix}${clipped}`);
			}
			break;
		}
		previewParts.push(candidate);
		usedBytes += candidateBytes;
	}

	const preview = previewParts.join("");
	return {
		text: preview,
		truncated: true,
		originalBytes,
		originalLines,
		previewBytes: byteLength(preview),
		previewLines: lineCount(preview),
	};
}

export function serializeToolResultContent(
	content: unknown,
	options: ProviderToolResultSerializationOptions,
): string {
	const text = contentToText(content);
	if (!options.truncateToolResults) return text;
	const preview = previewTextByBytesAndLines(text, options.maxToolResultBytes, options.maxToolResultLines);
	if (!preview.truncated) return text;
	return [
		"[Large tool result truncated by Pi Cursor provider wrapper]",
		`Original: ${preview.originalLines} lines, ${formatBytes(preview.originalBytes)}.`,
		`Included preview: ${preview.previewLines} lines, ${formatBytes(preview.previewBytes)}.`,
		"Reason: avoid resending very large prior Pi tool outputs to Cursor Composer on every provider turn.",
		"If exact content is needed, use available tools to re-read the referenced file or re-run the relevant command from the conversation context.",
		"",
		"<tool_result_preview>",
		preview.text,
		"</tool_result_preview>",
	].join("\n");
}

export function serializeProviderContext(context: unknown, options: ProviderContextSerializationOptions = {}): string {
	const contextObject = (context ?? {}) as any;
	const toolOptions: ProviderToolResultSerializationOptions = {
		...providerToolResultSerializationOptionsFromEnv(),
		...options,
	};
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
			lines.push(
				`## toolResult ${message.toolName ?? "tool"}`,
				serializeToolResultContent(message.content, toolOptions),
				"",
			);
		} else {
			lines.push(`## ${message?.role ?? "message"}`, contentToText(message?.content), "");
		}
	}
	return lines.join("\n").trim();
}
