import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { delay, getAgentEnvPath, getWorkspaceEnvPath, readEnvValue, upsertEnvValue } from "@firstpick/pi-utils";
import { Text } from "@earendil-works/pi-tui";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

type BraveSearchResult = {
	title?: string;
	url?: string;
	description?: string;
	age?: string;
};

type BraveSearchResponse = {
	web?: {
		results?: BraveSearchResult[];
	};
};

type ApiKeySource = "environment" | "workspace .env" | "Pi global .env";

type ApiKeyResolution = {
	apiKey?: string;
	source?: ApiKeySource;
	path?: string;
};

type SetupUiContext = {
	ui: {
		confirm(title: string, message: string): Promise<boolean>;
		input(title: string, placeholder?: string): Promise<string | undefined>;
		select(title: string, options: string[]): Promise<string | undefined>;
		notify(message: string, level?: "info" | "warning" | "error" | "success"): void;
	};
};

const ENV_KEY = "BRAVE_SEARCH_API_KEY";
const SETUP_PROMPTED_KEY = "__piExtensionBraveSearchSetupPrompted";
const POST_SEARCH_DELAY_MS = 500;

const BraveSearchParams = Type.Object({
	query: Type.String({ description: "Search query" }),
	count: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, description: "Maximum number of results (1-10)" })),
	country: Type.Optional(Type.String({ description: "Optional country code such as CH, DE, or US" })),
	search_lang: Type.Optional(Type.String({ description: "Optional language code such as en or de" })),
	freshness: Type.Optional(Type.String({ description: "Optional freshness filter such as pd, pw, pm, or py" })),
	safesearch: Type.Optional(Type.String({ description: "Optional safesearch mode such as off, moderate, or strict" })),
});

function resolveApiKey(): ApiKeyResolution {
	if (process.env[ENV_KEY]) return { apiKey: process.env[ENV_KEY], source: "environment" };

	const workspaceEnvPath = getWorkspaceEnvPath();
	const workspaceKey = readEnvValue(workspaceEnvPath, ENV_KEY);
	if (workspaceKey) return { apiKey: workspaceKey, source: "workspace .env", path: workspaceEnvPath };

	const globalEnvPath = getAgentEnvPath();
	const globalKey = readEnvValue(globalEnvPath, ENV_KEY);
	if (globalKey) return { apiKey: globalKey, source: "Pi global .env", path: globalEnvPath };

	return {};
}

async function promptForSetup(ctx: SetupUiContext): Promise<void> {
	const existing = resolveApiKey();
	if (existing.apiKey) return;

	const state = globalThis as typeof globalThis & { [SETUP_PROMPTED_KEY]?: boolean };
	if (state[SETUP_PROMPTED_KEY]) return;
	state[SETUP_PROMPTED_KEY] = true;

	const shouldConfigure = await ctx.ui.confirm(
		"Brave Search API key missing",
		`${ENV_KEY} is not configured. Set it up now?`
	);
	if (!shouldConfigure) return;

	const apiKey = await ctx.ui.input("Brave Search API key", "Paste your Brave Search API key");
	const trimmedApiKey = apiKey?.trim();
	if (!trimmedApiKey) {
		ctx.ui.notify("Brave Search setup cancelled: no API key entered.", "warning");
		return;
	}

	const target = await ctx.ui.select("Save Brave Search API key where?", [
		"Current workspace .env",
		"Pi global .env",
	]);
	if (!target) {
		ctx.ui.notify("Brave Search setup cancelled: no save location selected.", "warning");
		return;
	}

	const filePath = target === "Pi global .env" ? getAgentEnvPath() : getWorkspaceEnvPath();
	upsertEnvValue(filePath, ENV_KEY, trimmedApiKey);
	process.env[ENV_KEY] = trimmedApiKey;
	ctx.ui.notify(`Brave Search API key saved to ${filePath}`, "info");
}

export default function braveSearchExtension(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		await promptForSetup(ctx);
	});

	pi.registerCommand("brave-search-status", {
		description: "Show Brave Search API key configuration status",
		handler: async (_args, ctx) => {
			const resolution = resolveApiKey();
			if (!resolution.apiKey) {
				ctx.ui.notify(`${ENV_KEY} is not configured.`, "warning");
				return;
			}
			ctx.ui.notify(
				`Brave Search configured via ${resolution.source}${resolution.path ? ` (${resolution.path})` : ""}.`,
				"info"
			);
		},
	});

	pi.registerCommand("brave-search-setup", {
		description: "Interactively configure the Brave Search API key",
		handler: async (_args, ctx) => {
			const state = globalThis as typeof globalThis & { [SETUP_PROMPTED_KEY]?: boolean };
			state[SETUP_PROMPTED_KEY] = false;
			await promptForSetup(ctx);
		},
	});

	pi.registerTool({
		name: "brave_search",
		label: "Brave Search",
		description: `Search the public web with Brave Search API for current information and official documentation. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)} (whichever is hit first).`,
		promptSnippet: "Search the public web for current information, documentation, and official references.",
		promptGuidelines: [
			"Use brave_search before claiming current facts from the web.",
			"Use brave_search for official documentation and up-to-date external references.",
		],
		parameters: BraveSearchParams,
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("brave_search "));
			if (typeof args.query === "string" && args.query.trim()) {
				text += theme.fg("accent", `\"${args.query}\"`);
			} else {
				text += theme.fg("muted", "searching...");
			}
			if (typeof args.count === "number") {
				text += theme.fg("dim", ` (${args.count} results)`);
			}
			return new Text(text, 0, 0);
		},
		async execute(_toolCallId, params, signal) {
			const { apiKey } = resolveApiKey();
			if (!apiKey) throw new Error(`${ENV_KEY} is not set. Run /brave-search-setup to configure it.`);

			try {
				const url = new URL("https://api.search.brave.com/res/v1/web/search");
				url.searchParams.set("q", params.query);
				url.searchParams.set("count", String(params.count ?? 5));
				if (params.country) url.searchParams.set("country", params.country);
				if (params.search_lang) url.searchParams.set("search_lang", params.search_lang);
				if (params.freshness) url.searchParams.set("freshness", params.freshness);
				if (params.safesearch) url.searchParams.set("safesearch", params.safesearch);

				const response = await fetch(url, {
					method: "GET",
					headers: {
						Accept: "application/json",
						"Accept-Encoding": "gzip",
						"X-Subscription-Token": apiKey,
					},
					signal,
				});

				if (!response.ok) {
					throw new Error(`Brave Search API failed: ${response.status} ${response.statusText}`);
				}

				const data = (await response.json()) as BraveSearchResponse;
				const results = data.web?.results ?? [];

				if (results.length === 0) {
					return {
						content: [{ type: "text", text: "No results found." }],
						details: { query: params.query, resultCount: 0, results: [] },
					};
				}

				const rawOutput = results
					.map((result, index) => {
						const lines = [`${index + 1}. ${result.title ?? "Untitled"}`, result.url ?? ""];
						if (result.description) lines.push(result.description);
						if (result.age) lines.push(`Age: ${result.age}`);
						return lines.join("\n");
					})
					.join("\n\n");

				const truncation = truncateHead(rawOutput, {
					maxLines: DEFAULT_MAX_LINES,
					maxBytes: DEFAULT_MAX_BYTES,
				});

				let text = truncation.content;
				if (truncation.truncated) {
					text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
				}

				return {
					content: [{ type: "text", text }],
					details: {
						query: params.query,
						resultCount: results.length,
						results: results.map((result) => ({
							title: result.title,
							url: result.url,
							description: result.description,
							age: result.age,
						})),
						truncation: truncation.truncated ? truncation : undefined,
					},
				};
			} finally {
				await delay(POST_SEARCH_DELAY_MS);
			}
		},
	});
}
