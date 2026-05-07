import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type TodoItem = { text: string; done: boolean };
type TodoState = { visible: boolean; items: TodoItem[]; offset: number; doneDismissHint: boolean };

const KEY = "todo-progress";
const MAX_ROWS = 5;

function splitGoals(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^(-|\*|\d+[.)])\s+/.test(l)).map((l) => l.replace(/^(-|\*|\d+[.)])\s+/, ""));
  if (bullets.length >= 2) return bullets;
  const parts = text.split(/\band then\b|\bthen\b|,\s*and\s+/gi).map((s) => s.trim()).filter((s) => s.length > 8);
  return parts.slice(0, 12);
}

function render(ctx: ExtensionContext, s: TodoState) {
  if (!ctx.hasUI || !s.visible || s.items.length === 0) return;
  const done = s.items.filter((i) => i.done).length;
  const top = s.items.slice(s.offset, s.offset + MAX_ROWS);
  const lines = [ctx.ui.theme.fg("accent", `Todo ${done}/${s.items.length}`)];
  for (const item of top) lines.push(`${item.done ? "[x]" : "[ ]"} ${item.text}`);
  if (s.items.length > MAX_ROWS) lines.push(ctx.ui.theme.fg("dim", `Scroll ${s.offset + 1}-${Math.min(s.offset + MAX_ROWS, s.items.length)} of ${s.items.length}`));
  if (done === s.items.length && s.doneDismissHint) lines.push(ctx.ui.theme.fg("success", "Done — Ctrl+Alt+X to dismiss"));
  ctx.ui.setWidget(KEY, lines);
}

export default function todoProgress(pi: ExtensionAPI) {
  const state: TodoState = { visible: true, items: [], offset: 0, doneDismissHint: true };

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n[TODO PROGRESS POLICY] Aggressively use a todo list for multi-goal requests. Prefer creating/updating todos once too much rather than once too little. Mark items done as soon as completed.",
    };
  });

  pi.on("input", async (event, ctx) => {
    if (event.text.startsWith("/")) return { action: "continue" as const };
    const goals = splitGoals(event.text);
    if (goals.length >= 2) {
      state.items = goals.map((g) => ({ text: g, done: false }));
      state.offset = 0;
      state.visible = true;
      render(ctx, state);
    }
    return { action: "continue" as const };
  });

  pi.on("message_end", async (event, ctx) => {
    if (!state.items.length || event.message.role !== "assistant") return;
    const text = event.message.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").toLowerCase();
    for (const item of state.items) {
      if (!item.done && text.includes(item.text.toLowerCase().slice(0, 24))) item.done = true;
    }
    render(ctx, state);
  });

  pi.registerShortcut("ctrl+alt+x", {
    description: "Dismiss completed todo widget",
    handler: async (ctx) => {
      const done = state.items.length > 0 && state.items.every((i) => i.done);
      if (!done) {
        ctx.ui.notify("Todo not complete yet", "warning");
        return;
      }
      state.visible = false;
      ctx.ui.setWidget(KEY, []);
      ctx.ui.notify("Todo widget dismissed", "info");
    },
  });

  pi.registerShortcut("ctrl+alt+j", { description: "Todo scroll down", handler: async (ctx) => { state.offset = Math.min(Math.max(0, state.items.length - MAX_ROWS), state.offset + 1); render(ctx, state); } });
  pi.registerShortcut("ctrl+alt+k", { description: "Todo scroll up", handler: async (ctx) => { state.offset = Math.max(0, state.offset - 1); render(ctx, state); } });

  pi.on("session_start", async (_event, ctx) => render(ctx, state));
}
