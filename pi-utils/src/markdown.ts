export type ChecklistStatus = "todo" | "partial" | "done";

export type ChecklistItem = {
  text: string;
  status: ChecklistStatus;
};

export type ChecklistProgress = {
  total: number;
  done: number;
  partial: number;
  remaining: number;
};

export const CHECKLIST_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[( |x|X|-)\]\s+(.+)$/;

export function parseChecklistLine(line: string): ChecklistItem | undefined {
  const match = CHECKLIST_LINE_REGEX.exec(line);
  if (!match) return undefined;

  const mark = (match[1] || " ").toLowerCase();
  const label = (match[2] || "").trim().replace(/\s+/g, " ");
  if (!label) return undefined;

  return {
    status: mark === "x" ? "done" : mark === "-" ? "partial" : "todo",
    text: label,
  };
}

export function extractChecklist(text: string): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  let inFence = false;

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const item = parseChecklistLine(line);
    if (item) checklist.push(item);
  }

  return checklist;
}

export function stripChecklistLines(text: string): string {
  let inFence = false;
  const kept: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      kept.push(line);
      continue;
    }

    if (!inFence && parseChecklistLine(line)) continue;
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function countChecklistProgress(textOrItems: string | ChecklistItem[]): ChecklistProgress {
  const items = typeof textOrItems === "string" ? extractChecklist(textOrItems) : textOrItems;
  const done = items.filter((item) => item.status === "done").length;
  const partial = items.filter((item) => item.status === "partial").length;
  return {
    total: items.length,
    done,
    partial,
    remaining: Math.max(0, items.length - done),
  };
}
