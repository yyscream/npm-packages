import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDocs = path.join(__dirname, "fixtures", "nixos-docs");
process.env.NIXOSWIKI_DOCS_PATH = fixtureDocs;

const { default: extension } = await import("../index.ts");

type ToolDef = { name: string; execute: (_id: string, params: any) => Promise<any> };
type CommandDef = { handler: (args: string, ctx: any) => Promise<void> };
type Handler = (event: any, ctx: any) => Promise<any>;

const tools = new Map<string, ToolDef>();
const commands = new Map<string, CommandDef>();
const handlers = new Map<string, Handler[]>();
const notifications: Array<{ message: string; level: string }> = [];
const widgetUpdates: Array<string[] | undefined> = [];
let aborted = false;

extension({
  on(event: string, handler: Handler) {
    handlers.set(event, [...(handlers.get(event) ?? []), handler]);
  },
  registerTool(tool: ToolDef) {
    tools.set(tool.name, tool);
  },
  registerCommand(name: string, command: CommandDef) {
    commands.set(name, command);
  },
} as any);

assert.deepEqual([...tools.keys()].sort(), [
  "nixoswiki_extract",
  "nixoswiki_read",
  "nixoswiki_related",
  "nixoswiki_search",
  "nixoswiki_sections",
]);
assert(commands.has("nixoswiki-status"));
assert(commands.has("nixoswiki-local-setup"));

const search = await tools.get("nixoswiki_search")!.execute("1", { query: "flake check", limit: 3 });
assert.equal(search.details.results[0].title, "Nix Flakes");
assert(search.details.results[0].path.includes("nix.dev"));
assert(search.details.expandedTokens.includes("flake.nix"));
assert(search.details.expandedTokens.includes("flake.lock"));

const sections = await tools.get("nixoswiki_sections")!.execute("2", { page: "Nix Flakes" });
assert.deepEqual(sections.details.sections.map((s: any) => s.title), ["Nix Flakes", "flake check", "flake metadata"]);

const extract = await tools.get("nixoswiki_extract")!.execute("3", { page: "Nix Flakes", section: "metadata" });
assert.equal(extract.details.citation.endsWith("— flake metadata"), true);
assert.match(extract.details.text, /--no-write-lock-file/);

const related = await tools.get("nixoswiki_related")!.execute("4", { page: "NixOS Configuration" });
assert.equal(related.details.links.length, 1);
assert.equal(related.details.links[0].title, "Packages");

const mockUi = {
  notify: (message: string, level: string) => notifications.push({ message, level }),
  setWidget: (_key: string, lines: string[] | undefined) => widgetUpdates.push(lines),
};
await commands.get("nixoswiki-status")!.handler("", { ui: mockUi });
assert.match(notifications.at(-1)!.message, /"available": true/);
assert.match(notifications.at(-1)!.message, /"pageCount": 4/);

await commands.get("nixoswiki-local-setup")!.handler("", { ui: mockUi });
assert(widgetUpdates.some((lines) => lines?.some((line) => line.includes("target docs path"))));
assert.equal(widgetUpdates.at(-1), undefined);
assert(notifications.some((note) => note.message.includes("cache: rebuilt search index")));

const before = handlers.get("before_agent_start")![0];
const route = await before(
  { prompt: "How do I use NixOS options?", systemPrompt: "base", systemPromptOptions: { skills: [] } },
  { ui: { notify: (message: string, level: string) => notifications.push({ message, level }) }, abort: () => { aborted = true; } },
);
assert.equal(aborted, false);
assert.match(route.systemPrompt, /nixoswiki_search before web sources/);

console.log("mock NixOS wiki extension tests passed");
