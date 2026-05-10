import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type TodoStatus = "todo" | "partial" | "done";
type TodoItem = { text: string; status: TodoStatus };
type TodoState = { visible: boolean; items: TodoItem[]; offset: number };

const KEY = "todo-progress";
const MAX_ROWS = 5;

function statusLabel(status: TodoStatus): string {
  if (status === "done") return "[x]";
  if (status === "partial") return "[-]";
  return "[ ]";
}

function clear(ctx: ExtensionContext, s: TodoState) {
  s.visible = false;
  s.items = [];
  s.offset = 0;
  if (ctx.hasUI) ctx.ui.setWidget(KEY, []);
}

function render(ctx: ExtensionContext, s: TodoState) {
  if (!ctx.hasUI) return;
  if (!s.visible || s.items.length === 0) {
    ctx.ui.setWidget(KEY, []);
    return;
  }

  const done = s.items.filter((i) => i.status === "done").length;
  if (done === s.items.length) {
    clear(ctx, s);
    return;
  }

  const partial = s.items.filter((i) => i.status === "partial").length;
  const top = s.items.slice(s.offset, s.offset + MAX_ROWS);
  const lines = [ctx.ui.theme.fg("accent", `Todo ${done}/${s.items.length} done${partial ? `, ${partial} partial` : ""}`)];
  for (const item of top) lines.push(`${statusLabel(item.status)} ${item.text}`);
  if (s.items.length > MAX_ROWS) lines.push(ctx.ui.theme.fg("dim", `Scroll ${s.offset + 1}-${Math.min(s.offset + MAX_ROWS, s.items.length)} of ${s.items.length}`));
  ctx.ui.setWidget(KEY, lines);
}

export default function todoProgress(pi: ExtensionAPI) {
  const state: TodoState = { visible: false, items: [], offset: 0 };

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n[TODO PROGRESS POLICY] For multi-step work, create a concise agent-authored checklist with 2-6 short items. Do not copy raw user-prompt lines as todos; rewrite them into clear action items. Use explicit markers: [ ] not started, [-] partial/in progress, [x] complete. Update checklist markers as work changes. Before your final answer, close the todo list by marking every remaining item [x] or by explicitly stating no todo list is needed for the completed single-step task.",
    };
  });

  pi.on("input", async (event, ctx) => {
    if (!event.text.startsWith("/")) clear(ctx, state);
    return { action: "continue" as const };
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    const text = event.message.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

    const checklistRegex = /^\s*(?:[-*]|\d+[.)])\s*\[( |x|X|-)\]\s+(.+)$/gm;
    const checklist: Array<TodoItem> = [];
    for (const match of text.matchAll(checklistRegex)) {
      const mark = (match[1] || " ").toLowerCase();
      const label = (match[2] || "").trim().replace(/\s+/g, " ");
      const status: TodoStatus = mark === "x" ? "done" : mark === "-" ? "partial" : "todo";
      if (label) checklist.push({ status, text: label });
    }

    if (checklist.length === 0) return;

    state.items = checklist.slice(0, 12);
    state.offset = Math.min(state.offset, Math.max(0, state.items.length - MAX_ROWS));
    state.visible = true;
    render(ctx, state);
  });

  pi.registerShortcut("ctrl+alt+x", {
    description: "Dismiss completed todo widget",
    handler: async (ctx) => {
      clear(ctx, state);
      ctx.ui.notify("Todo widget dismissed", "info");
    },
  });

  pi.registerShortcut("ctrl+alt+j", { description: "Todo scroll down", handler: async (ctx) => { state.offset = Math.min(Math.max(0, state.items.length - MAX_ROWS), state.offset + 1); render(ctx, state); } });
  pi.registerShortcut("ctrl+alt+k", { description: "Todo scroll up", handler: async (ctx) => { state.offset = Math.max(0, state.offset - 1); render(ctx, state); } });

  pi.on("session_start", async (_event, ctx) => clear(ctx, state));
}
