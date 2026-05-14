import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir, envFlag, slugify } from "@firstpick/pi-utils";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { Type } from "typebox";

type NoteMeta = {
	slug: string;
	title: string;
	file: string;
	createdAt: string;
	updatedAt: string;
	isRule: boolean;
	preview: string;
};

type NotesIndex = {
	version: 1;
	notes: Record<string, NoteMeta>;
};

function getNotesDir(): string {
	const configured = process.env.PI_NOTES_DIR?.trim();
	if (configured) return path.resolve(configured);
	return path.join(getAgentDir(), "memory", "notes");
}

function getIndexFile(): string {
	return path.join(getNotesDir(), "index.json");
}

function includeRulesInPrompt(): boolean {
	return envFlag("PI_NOTES_INCLUDE_RULES_IN_PROMPT", false);
}

function ensureStorage(): void {
	const notesDir = getNotesDir();
	const indexFile = getIndexFile();
	fs.mkdirSync(notesDir, { recursive: true });
	if (!fs.existsSync(indexFile)) {
		const index: NotesIndex = { version: 1, notes: {} };
		fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf8");
	}
}

function loadIndex(): NotesIndex {
	ensureStorage();
	try {
		const raw = fs.readFileSync(getIndexFile(), "utf8");
		const parsed = JSON.parse(raw) as Partial<NotesIndex>;
		if (parsed && parsed.version === 1 && parsed.notes && typeof parsed.notes === "object") {
			return { version: 1, notes: parsed.notes as Record<string, NoteMeta> };
		}
	} catch {
		// ignore and recreate
	}
	return { version: 1, notes: {} };
}

function saveIndex(index: NotesIndex): void {
	ensureStorage();
	fs.writeFileSync(getIndexFile(), JSON.stringify(index, null, 2), "utf8");
}

function firstTwoWordsForAutoTitle(text: string): string {
	const words = text
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
		.filter(Boolean);
	return words.join("_") || "note";
}

function formatTimestampForAutoTitle(date: Date): string {
	const y = String(date.getFullYear());
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	const ss = String(date.getSeconds()).padStart(2, "0");
	return `${y}${m}${d}-${hh}:${mm}:${ss}`;
}

function isRuleNote(title: string, content: string): boolean {
	const t = title.trim().toLowerCase();
	const c = content.trim().toLowerCase();
	return t.startsWith("rule") || c.startsWith("rule");
}

function parseNoteArgs(args: string): { title: string; content: string } | null {
	const trimmed = args.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.includes("::")) {
		const [rawTitle, ...rest] = trimmed.split("::");
		const title = rawTitle.trim();
		const content = rest.join("::").trim();
		if (!title || !content) {
			return null;
		}
		return { title, content };
	}

	const content = trimmed;
	const title = `${firstTwoWordsForAutoTitle(trimmed)}_${formatTimestampForAutoTitle(new Date())}`;
	return { title, content };
}

function scoreNote(note: NoteMeta, query: string): number {
	const q = query.trim().toLowerCase();
	if (!q) return Number.POSITIVE_INFINITY;

	const slug = note.slug.toLowerCase();
	const title = note.title.toLowerCase();

	if (slug === q) return 0;
	if (title === q) return 1;
	if (slug.startsWith(q)) return 2;
	if (title.startsWith(q)) return 3;
	if (slug.includes(q)) return 4;
	if (title.includes(q)) return 5;

	return Number.POSITIVE_INFINITY;
}

function rankNotes(notes: Record<string, NoteMeta>, query: string): NoteMeta[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	return Object.values(notes)
		.map((note) => ({ note, score: scoreNote(note, q) }))
		.filter((entry) => Number.isFinite(entry.score))
		.sort((a, b) => {
			if (a.score !== b.score) return a.score - b.score;
			return b.note.updatedAt.localeCompare(a.note.updatedAt);
		})
		.map((entry) => entry.note);
}

function resolveNote(notes: Record<string, NoteMeta>, query: string): NoteMeta | undefined {
	return rankNotes(notes, query)[0];
}

function parseNoteUpdateArgs(args: string): { query: string; content: string } | null {
	const trimmed = args.trim();
	if (!trimmed || !trimmed.includes("::")) {
		return null;
	}

	const [rawQuery, ...rest] = trimmed.split("::");
	const query = rawQuery.trim();
	const content = rest.join("::").trim();
	if (!query || !content) {
		return null;
	}

	return { query, content };
}

export default function notesExtension(pi: ExtensionAPI) {
	let index: NotesIndex = { version: 1, notes: {} };
	const contentCache = new Map<string, string>();

	const refreshIndex = () => {
		index = loadIndex();
	};

	const listNotes = (): NoteMeta[] => {
		return Object.values(index.notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	};

	const readNoteContent = (meta: NoteMeta): string | null => {
		const cached = contentCache.get(meta.slug);
		if (cached !== undefined) {
			return cached;
		}

		try {
			const fullPath = path.join(getNotesDir(), meta.file);
			const content = fs.readFileSync(fullPath, "utf8");
			contentCache.set(meta.slug, content);
			return content;
		} catch {
			return null;
		}
	};

	pi.on("session_start", async (_event, _ctx) => {
		refreshIndex();
	});

	pi.registerCommand("note", {
		description: "Save a note. Use '/note title :: content' or '/note content'",
		handler: async (args, ctx) => {
			const parsed = parseNoteArgs(args);
			if (!parsed) {
				ctx.ui.notify("Usage: /note <title> :: <content>  (or /note <content>)", "warning");
				return;
			}

			refreshIndex();
			const now = new Date().toISOString();
			const title = parsed.title.trim();
			let slug = slugify(title);
			if (!slug) {
				slug = `note-${Date.now()}`;
			}

			const existing = index.notes[slug];
			const meta: NoteMeta = {
				slug,
				title,
				file: `${slug}.md`,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
				isRule: isRuleNote(title, parsed.content),
				preview: parsed.content.replace(/\s+/g, " ").trim().slice(0, 120),
			};

			ensureStorage();
			fs.writeFileSync(path.join(getNotesDir(), meta.file), parsed.content, "utf8");
			index.notes[slug] = meta;
			saveIndex(index);
			contentCache.set(slug, parsed.content);

			ctx.ui.notify(
				meta.isRule
					? `Saved rule note '${meta.title}' (${meta.slug})${includeRulesInPrompt() ? " — included in system prompt" : ""}`
					: `Saved note '${meta.title}' (${meta.slug})`,
				"info",
			);
		},
	});

	pi.registerCommand("note-list", {
		description: "List saved notes",
		handler: async (_args, ctx) => {
			refreshIndex();
			const notes = listNotes();
			if (notes.length === 0) {
				ctx.ui.notify("No notes saved yet. Use /note ...", "info");
				return;
			}

			const lines = notes.slice(0, 30).map((n) => {
				const flag = n.isRule ? "[rule] " : "";
				return `- ${n.slug}: ${flag}${n.title}`;
			});
			const suffix = notes.length > 30 ? `\n... ${notes.length - 30} more` : "";
			ctx.ui.notify(`Notes (${notes.length}):\n${lines.join("\n")}${suffix}`, "info");
		},
	});

	pi.registerCommand("note-read", {
		description: "Read a saved note (supports fuzzy query and picker)",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			refreshIndex();
			const items = rankNotes(index.notes, prefix)
				.slice(0, 25)
				.map((n) => ({
					value: n.slug,
					label: n.slug,
					description: `${n.isRule ? "[rule] " : ""}${n.title}`,
				}));

			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			refreshIndex();
			let query = args.trim();

			if (!query) {
				const notes = listNotes();
				if (notes.length === 0) {
					ctx.ui.notify("No notes saved yet. Use /note ...", "info");
					return;
				}
				if (!ctx.hasUI) {
					ctx.ui.notify("Usage: /note-read <note-slug>", "warning");
					return;
				}

				const options = notes.slice(0, 40).map((n) => `${n.slug} :: ${n.title}`);
				const picked = await ctx.ui.select("Select note", options);
				if (!picked) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}
				query = picked.split(" :: ")[0] ?? "";
			}

			const note = resolveNote(index.notes, query);
			if (!note) {
				ctx.ui.notify(`Note not found: ${query}`, "warning");
				return;
			}

			const content = readNoteContent(note);
			if (content == null) {
				ctx.ui.notify(`Failed to read note '${note.slug}'`, "error");
				return;
			}

			ctx.ui.notify(`${note.title} (${note.slug})\n${content}`, "info");
		},
	});

	pi.registerCommand("note-update", {
		description: "Update a note. Use '/note-update <slug|title> :: <content>'",
		handler: async (args, ctx) => {
			refreshIndex();
			const parsed = parseNoteUpdateArgs(args);
			if (!parsed) {
				ctx.ui.notify("Usage: /note-update <slug|title> :: <content>", "warning");
				return;
			}

			const note = resolveNote(index.notes, parsed.query);
			if (!note) {
				ctx.ui.notify(`Note not found: ${parsed.query}`, "warning");
				return;
			}

			const updatedAt = new Date().toISOString();
			note.updatedAt = updatedAt;
			note.isRule = isRuleNote(note.title, parsed.content);
			note.preview = parsed.content.replace(/\s+/g, " ").trim().slice(0, 120);

			fs.writeFileSync(path.join(getNotesDir(), note.file), parsed.content, "utf8");
			saveIndex(index);
			contentCache.set(note.slug, parsed.content);

			ctx.ui.notify(
				note.isRule
					? `Updated rule note '${note.title}' (${note.slug})${includeRulesInPrompt() ? " — included in system prompt" : ""}`
					: `Updated note '${note.title}' (${note.slug})`,
				"info",
			);
		},
	});

	pi.registerCommand("note-delete", {
		description: "Delete a note: /note-delete <slug|title>",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			refreshIndex();
			const items = rankNotes(index.notes, prefix)
				.slice(0, 25)
				.map((n) => ({
					value: n.slug,
					label: n.slug,
					description: `${n.isRule ? "[rule] " : ""}${n.title}`,
				}));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			refreshIndex();
			const query = args.trim();
			if (!query) {
				ctx.ui.notify("Usage: /note-delete <slug|title>", "warning");
				return;
			}

			const note = resolveNote(index.notes, query);
			if (!note) {
				ctx.ui.notify(`Note not found: ${query}`, "warning");
				return;
			}

			if (ctx.hasUI) {
				const confirmed = await ctx.ui.confirm("Delete note?", `${note.slug} :: ${note.title}`);
				if (!confirmed) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}
			}

			delete index.notes[note.slug];
			saveIndex(index);
			contentCache.delete(note.slug);

			try {
				fs.unlinkSync(path.join(getNotesDir(), note.file));
			} catch {
				// ignore missing file; index is already canonical
			}

			ctx.ui.notify(`Deleted note '${note.title}' (${note.slug})`, "info");
		},
	});

	pi.registerTool({
		name: "note_list",
		label: "Note List",
		description: "List notes with optional rule filtering",
		parameters: Type.Object({
			limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, description: "Maximum notes to return (1-100)" })),
			includeRulesOnly: Type.Optional(Type.Boolean({ description: "If true, return only rule notes" })),
		}),
		async execute(_toolCallId, params) {
			refreshIndex();
			const raw = listNotes();
			const filtered = params.includeRulesOnly ? raw.filter((n) => n.isRule) : raw;
			const limit = typeof params.limit === "number" ? Math.min(100, Math.max(1, Math.trunc(params.limit))) : 20;
			const notes = filtered.slice(0, limit);
			const text = notes.length
				? notes.map((n, i) => `${i + 1}. ${n.slug} :: ${n.title}${n.isRule ? " [rule]" : ""}`).join("\n")
				: "No notes found.";

			return {
				content: [{ type: "text", text }],
				details: {
					count: notes.length,
					total: filtered.length,
					notes: notes.map((n) => ({
						slug: n.slug,
						title: n.title,
						updatedAt: n.updatedAt,
						isRule: n.isRule,
						preview: n.preview,
					})),
				},
			};
		},
	});

	pi.registerTool({
		name: "note_read",
		label: "Note Read",
		description: "Read one note by slug/title using fuzzy matching",
		parameters: Type.Object({
			query: Type.String({ description: "Note slug or title query" }),
		}),
		async execute(_toolCallId, params) {
			refreshIndex();
			const query = params.query.trim();
			if (!query) throw new Error("query must be a non-empty string");

			const note = resolveNote(index.notes, query);
			if (!note) throw new Error(`Note not found: ${query}`);

			const content = readNoteContent(note);
			if (content == null) throw new Error(`Failed to read note '${note.slug}'`);

			return {
				content: [{ type: "text", text: `${note.title} (${note.slug})\n${content}` }],
				details: {
					note: {
						slug: note.slug,
						title: note.title,
						updatedAt: note.updatedAt,
						isRule: note.isRule,
						content,
					},
				},
			};
		},
	});

	pi.registerTool({
		name: "note_update",
		label: "Note Update",
		description: "Update an existing note's content by slug/title",
		parameters: Type.Object({
			query: Type.String({ description: "Note slug or title query" }),
			content: Type.String({ description: "New note content" }),
		}),
		async execute(_toolCallId, params) {
			refreshIndex();
			const query = params.query.trim();
			if (!query) throw new Error("query must be a non-empty string");

			const note = resolveNote(index.notes, query);
			if (!note) throw new Error(`Note not found: ${query}`);

			const nextContent = params.content.trim();
			if (!nextContent) throw new Error("content must be non-empty");

			note.updatedAt = new Date().toISOString();
			note.isRule = isRuleNote(note.title, nextContent);
			note.preview = nextContent.replace(/\s+/g, " ").trim().slice(0, 120);

			fs.writeFileSync(path.join(getNotesDir(), note.file), nextContent, "utf8");
			saveIndex(index);
			contentCache.set(note.slug, nextContent);

			return {
				content: [{ type: "text", text: `Updated note '${note.title}' (${note.slug})` }],
				details: { slug: note.slug, title: note.title, updatedAt: note.updatedAt, isRule: note.isRule },
			};
		},
	});

	pi.registerTool({
		name: "note_delete",
		label: "Note Delete",
		description: "Delete a note by slug/title. Requires explicit confirm=true.",
		parameters: Type.Object({
			query: Type.String({ description: "Note slug or title query" }),
			confirm: Type.Boolean({ description: "Must be true only when user explicitly requested deletion" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!params.confirm) {
				throw new Error("Deletion blocked: confirm must be true and user intent must be explicit.");
			}

			refreshIndex();
			const query = params.query.trim();
			if (!query) throw new Error("query must be a non-empty string");

			const note = resolveNote(index.notes, query);
			if (!note) throw new Error(`Note not found: ${query}`);

			if (ctx.hasUI) {
				const ok = await ctx.ui.confirm("Delete note?", `${note.slug} :: ${note.title}`);
				if (!ok) throw new Error("Deletion cancelled by user.");
			}

			delete index.notes[note.slug];
			saveIndex(index);
			contentCache.delete(note.slug);

			try {
				fs.unlinkSync(path.join(getNotesDir(), note.file));
			} catch {
				// ignore missing file; index is canonical
			}

			return {
				content: [{ type: "text", text: `Deleted note '${note.title}' (${note.slug})` }],
				details: { slug: note.slug, title: note.title },
			};
		},
	});

	pi.registerCommand("note-status", {
		description: "Show notes extension configuration",
		handler: async (_args, ctx) => {
			ctx.ui.notify(
				`notes: dir=${getNotesDir()} · includeRulesInPrompt=${includeRulesInPrompt() ? "on" : "off"}`,
				"info",
			);
		},
	});

	pi.on("before_agent_start", async (event) => {
		if (!includeRulesInPrompt()) return;

		refreshIndex();
		const ruleNotes = listNotes().filter((n) => n.isRule);
		if (ruleNotes.length === 0) {
			return;
		}

		const blocks: string[] = [];
		for (const note of ruleNotes.slice(0, 20)) {
			const content = readNoteContent(note);
			if (!content) continue;
			blocks.push(`### ${note.title}\n${content}`);
		}

		if (blocks.length === 0) {
			return;
		}

		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n## Persistent User Rules (from /note entries starting with 'rule')\n\n${blocks.join("\n\n")}`,
		};
	});
}
