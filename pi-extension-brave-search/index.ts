import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
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

const BraveSearchParams = Type.Object({
	query: Type.String({ description: "Search query" }),
	count: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, description: "Maximum number of results (1-10)" })),
	country: Type.Optional(Type.String({ description: "Optional country code such as CH, DE, or US" })),
	search_lang: Type.Optional(Type.String({ description: "Optional language code such as en or de" })),
	freshness: Type.Optional(Type.String({ description: "Optional freshness filter such as pd, pw, pm, or py" })),
	safesearch: Type.Optional(Type.String({ description: "Optional safesearch mode such as off, moderate, or strict" })),
});

export default function braveSearchExtension(pi: ExtensionAPI): void {
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
		async execute(_toolCallId, params, signal) {
			const apiKey = process.env.BRAVE_SEARCH_API_KEY;
			if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is not set");

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
		},
	});
}
