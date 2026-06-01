import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type TodoStatus = "todo" | "partial" | "done";
type TodoItem = { text: string; status: TodoStatus };
type TodoState = { visible: boolean; items: TodoItem[]; offset: number };

const KEY = "todo-progress";
const MAX_ROWS = 5;
const MAX_ITEMS = 12;
const TODO_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[( |x|X|-)\]\s+(.+)$/;

function statusLabel(status: TodoStatus): string {
  if (status === "done") return "[x]";
  if (status === "partial") return "[-]";
  return "[ ]";
}

function clear(ctx: ExtensionContext, s: TodoState) {
  s.visible = false;
  s.items = [];
  s.offset = 0;
  if (ctx.hasUI) ctx.ui.setWidget(KEY, undefined);
}

function render(ctx: ExtensionContext, s: TodoState) {
  if (!ctx.hasUI) return;
  if (!s.visible || s.items.length === 0) {
    ctx.ui.setWidget(KEY, undefined);
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

function parseTodoLine(line: string): TodoItem | undefined {
  const match = TODO_LINE_REGEX.exec(line);
  if (!match) return undefined;

  const mark = (match[1] || " ").toLowerCase();
  const label = (match[2] || "").trim().replace(/\s+/g, " ");
  if (!label) return undefined;

  return {
    status: mark === "x" ? "done" : mark === "-" ? "partial" : "todo",
    text: label,
  };
}

function extractChecklist(text: string): TodoItem[] {
  const checklist: TodoItem[] = [];
  let inFence = false;

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const item = parseTodoLine(line);
    if (item) checklist.push(item);
  }

  return checklist;
}

function stripChecklistLines(text: string): string {
  let inFence = false;
  const kept: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      kept.push(line);
      continue;
    }

    if (!inFence && parseTodoLine(line)) continue;
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function todoProgress(pi: ExtensionAPI) {
  const state: TodoState = { visible: false, items: [], offset: 0 };

  pi.on("before_agent_start", async (event, ctx) => {
    clear(ctx, state);
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n[TODO PROGRESS POLICY] For multi-step work, create a concise agent-authored checklist with 2-6 short items. Do not copy raw user-prompt lines as todos; rewrite them into clear action items. Emit todo updates as markdown checklist lines exactly like `- [ ] item`, `- [-] item`, or `- [x] item`; do not use raw user prompt lines as todos. Update checklist markers as work changes. Todo checklists are live-turn progress only: still emit `[x]` updates when possible, but the extension will close the widget deterministically when the agent turn ends.",
    };
  });

  pi.on("input", async (event, ctx) => {
    if (!event.text.startsWith("/")) clear(ctx, state);
    return { action: "continue" as const };
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    const textParts = event.message.content.filter((c: any) => c.type === "text");
    const checklist = textParts.flatMap((c: any) => extractChecklist(c.text));

    if (checklist.length === 0) return;

    state.items = checklist.slice(0, MAX_ITEMS);
    state.offset = Math.min(state.offset, Math.max(0, state.items.length - MAX_ROWS));
    state.visible = true;
    render(ctx, state);

    return {
      message: {
        ...event.message,
        content: event.message.content.map((c: any) => (c.type === "text" ? { ...c, text: stripChecklistLines(c.text) } : c)),
      },
    };
  });

  pi.on("agent_end", async (_event, ctx) => {
    // The widget represents live progress for the active turn, not persistent task state.
    // Do not leave stale partial/todo items visible if the model forgets a final update.
    clear(ctx, state);
  });

  pi.on("session_shutdown", async (_event, ctx) => clear(ctx, state));
  pi.on("session_before_switch", async (_event, ctx) => {
    clear(ctx, state);
    return undefined;
  });
  pi.on("session_before_fork", async (_event, ctx) => {
    clear(ctx, state);
    return undefined;
  });
  pi.on("session_tree", async (_event, ctx) => clear(ctx, state));

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
