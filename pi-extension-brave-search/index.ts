import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_RESULT_COUNT = 5;
const MAX_RESULT_COUNT = 10;

type BraveToolInput = {
	query: string;
	count?: number;
	country?: string;
	search_lang?: string;
	freshness?: string;
	safesearch?: string;
};

type BraveResult = {
	title?: string;
	url?: string;
	description?: string;
	age?: string;
	extra_snippets?: string[];
	language?: string;
	family_friendly?: boolean;
};

type BraveResponse = {
	query?: { original?: string };
	web?: {
		results?: BraveResult[];
	};
};

type BraveSearchExecution = {
	query: string;
	results: BraveResult[];
	apiKeySource: "env" | "cwd-dotenv" | "agent-dotenv";
};

function getAgentDir(): string {
	const env = process.env.PI_CODING_AGENT_DIR;
	if (env && env.trim().length > 0) return env;
	return path.join(os.homedir(), ".pi", "agent");
}

function stripWrappingQuotes(value: string): string {
	if (value.length < 2) return value;
	const first = value[0];
	const last = value[value.length - 1];
	if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
		const inner = value.slice(1, -1);
		if (first === '"') {
			return inner
				.replace(/\\n/g, "\n")
				.replace(/\\r/g, "\r")
				.replace(/\\t/g, "\t")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, "\\");
		}
		return inner;
	}
	return value;
}

function parseDotEnv(content: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
		const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
		if (!match) continue;

		const [, key, rawValue] = match;
		let value = rawValue.trim();
		if (!(value.startsWith('"') || value.startsWith("'"))) {
			value = value.replace(/\s+#.*$/, "").trim();
		}
		values[key] = stripWrappingQuotes(value);
	}
	return values;
}

async function readDotEnvFile(filePath: string): Promise<Record<string, string>> {
	const content = await fs.readFile(filePath, "utf8");
	return parseDotEnv(content);
}

async function resolveBraveApiKey(
	cwd: string,
): Promise<{ apiKey?: string; source: "env" | "cwd-dotenv" | "agent-dotenv"; checked: string[] }> {
	const envValue = process.env.BRAVE_SEARCH_API_KEY?.trim();
	if (envValue) {
		return {
			apiKey: envValue,
			source: "env",
			checked: ["process.env.BRAVE_SEARCH_API_KEY"],
		};
	}

	const checked = new Set<string>();
	const cwdEnvPath = path.join(cwd, ".env");
	const agentEnvPath = path.join(getAgentDir(), ".env");
	const candidates: Array<{
		filePath: string;
		source: "cwd-dotenv" | "agent-dotenv";
		checkedLabel: "cwd .env" | "agent .env";
	}> = [
		{ filePath: cwdEnvPath, source: "cwd-dotenv", checkedLabel: "cwd .env" },
		{ filePath: agentEnvPath, source: "agent-dotenv", checkedLabel: "agent .env" },
	];

	for (const candidate of candidates) {
		if (checked.has(candidate.checkedLabel)) continue;
		checked.add(candidate.checkedLabel);

		try {
			const values = await readDotEnvFile(candidate.filePath);
			const apiKey = values.BRAVE_SEARCH_API_KEY?.trim();
			if (!apiKey) continue;
			process.env.BRAVE_SEARCH_API_KEY = apiKey;
			return {
				apiKey,
				source: candidate.source,
				checked: ["process.env.BRAVE_SEARCH_API_KEY", ...Array.from(checked)],
			};
		} catch {
			continue;
		}
	}

	return {
		source: "env",
		checked: ["process.env.BRAVE_SEARCH_API_KEY", ...Array.from(checked)],
	};
}

function clampResultCount(count?: number): number {
	if (!Number.isFinite(count)) return DEFAULT_RESULT_COUNT;
	return Math.min(MAX_RESULT_COUNT, Math.max(1, Math.trunc(count ?? DEFAULT_RESULT_COUNT)));
}

function normalizeOptional(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function formatResult(result: BraveResult, index: number): string {
	const lines: string[] = [];
	lines.push(`${index + 1}. ${result.title ?? "(no title)"}`);
	if (result.url) lines.push(result.url);
	if (result.description) lines.push(result.description);
	if (result.age) lines.push(`Age: ${result.age}`);
	if (result.language) lines.push(`Language: ${result.language}`);

	for (const snippet of result.extra_snippets ?? []) {
		const trimmed = snippet.trim();
		if (trimmed) lines.push(`- ${trimmed}`);
	}

	return lines.join("\n");
}

function formatSearchOutput(execution: BraveSearchExecution): string {
	if (execution.results.length === 0) {
		return `No Brave Search results for: ${execution.query}`;
	}

	let text = execution.results.map((result, index) => formatResult(result, index)).join("\n\n");
	const truncation = truncateHead(text, {
		maxLines: DEFAULT_MAX_LINES,
		maxBytes: DEFAULT_MAX_BYTES,
	});

	text = truncation.content;
	if (truncation.truncated) {
		text += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
	}

	return text;
}

async function runBraveSearch(params: BraveToolInput, cwd: string, signal?: AbortSignal): Promise<BraveSearchExecution> {
	const keyResolution = await resolveBraveApiKey(cwd);
	if (!keyResolution.apiKey) {
		throw new Error(
			`Missing BRAVE_SEARCH_API_KEY. Checked ${keyResolution.checked.join(", ")} and process.env.BRAVE_SEARCH_API_KEY.`,
		);
	}

	const url = new URL(BRAVE_API_URL);
	url.searchParams.set("q", params.query.trim());
	url.searchParams.set("count", String(clampResultCount(params.count)));
	url.searchParams.set("text_decorations", "false");
	url.searchParams.set("spellcheck", "true");

	const country = normalizeOptional(params.country);
	const searchLang = normalizeOptional(params.search_lang);
	const freshness = normalizeOptional(params.freshness);
	const safesearch = normalizeOptional(params.safesearch);

	if (country) url.searchParams.set("country", country);
	if (searchLang) url.searchParams.set("search_lang", searchLang);
	if (freshness) url.searchParams.set("freshness", freshness);
	if (safesearch) url.searchParams.set("safesearch", safesearch);

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Accept-Encoding": "gzip",
			"X-Subscription-Token": keyResolution.apiKey,
		},
		signal,
	});

	if (!response.ok) {
		const body = (await response.text()).trim();
		const excerpt = body.length > 500 ? `${body.slice(0, 500)}…` : body;
		throw new Error(`Brave Search API error ${response.status}: ${excerpt || response.statusText}`);
	}

	const payload = (await response.json()) as BraveResponse;
	const results = (payload.web?.results ?? []).slice(0, clampResultCount(params.count));
	return {
		query: payload.query?.original?.trim() || params.query.trim(),
		results,
		apiKeySource: keyResolution.source,
	};
}

export default function braveSearch(pi: ExtensionAPI) {
	pi.registerTool({
		name: "brave_search",
		label: "Brave Search",
		description: "Search the web with the Brave Search API and return current search results.",
		promptSnippet: "Search the public web for current information, documentation, and references",
		promptGuidelines: [
			"Use brave_search when the user asks for current web information or up-to-date external references.",
			"Use brave_search before claiming current facts from the web.",
		],
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			count: Type.Optional(
				Type.Integer({
					minimum: 1,
					maximum: MAX_RESULT_COUNT,
					description: `Maximum number of results to return (1-${MAX_RESULT_COUNT})`,
				}),
			),
			country: Type.Optional(Type.String({ description: "Optional country code such as CH, DE, or US" })),
			search_lang: Type.Optional(Type.String({ description: "Optional language code such as en or de" })),
			freshness: Type.Optional(
				Type.String({ description: "Optional freshness filter such as pd, pw, pm, or py" }),
			),
			safesearch: Type.Optional(
				Type.String({ description: "Optional safesearch mode such as off, moderate, or strict" }),
			),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const execution = await runBraveSearch(params, ctx.cwd, signal);
			return {
				content: [{ type: "text", text: formatSearchOutput(execution) }],
				details: {
					query: execution.query,
					resultCount: execution.results.length,
					apiKeySource: execution.apiKeySource,
					results: execution.results,
				},
			};
		},
	});

	pi.registerCommand("brave-search-status", {
		description: "Check whether Brave Search is configured",
		handler: async (_args, ctx) => {
			const resolution = await resolveBraveApiKey(ctx.cwd);
			if (resolution.apiKey) {
				ctx.ui.notify(`Brave Search configured via ${resolution.source}`, "info");
				return;
			}

			ctx.ui.notify(
				`Missing BRAVE_SEARCH_API_KEY. Checked ${resolution.checked.join(", ")} and process.env.BRAVE_SEARCH_API_KEY.`,
				"warning",
			);
		},
	});

	pi.registerCommand("brave-search-test", {
		description: "Run a Brave Search query directly: /brave-search-test <query>",
		handler: async (args, ctx) => {
			const query = (args || "").trim();
			if (!query) {
				ctx.ui.notify("Usage: /brave-search-test <query>", "warning");
				return;
			}

			const execution = await runBraveSearch({ query }, ctx.cwd, ctx.signal);
			pi.sendMessage({
				customType: "brave-search-test",
				content: formatSearchOutput(execution),
				display: true,
				details: {
					query: execution.query,
					resultCount: execution.results.length,
					apiKeySource: execution.apiKeySource,
				},
			});
		},
	});
}
