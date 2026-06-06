# PATCH.md — Avoid redundant async subagent widget clears

## Purpose

Reduce avoidable Pi TUI work in the installed `pi-subagents` package by preventing repeated `setWidget(undefined)` calls for the async subagent widget when that widget has never been shown. This patch targets startup/session-reset responsiveness and avoids unnecessary widget invalidation.

### Root cause

`renderWidget(ctx, jobs)` cleared the async widget every time it was called with an empty `jobs` array. On session startup/reset paths, this can call `ctx.ui.setWidget(WIDGET_KEY, undefined)` even when no async subagent widget is currently mounted, causing redundant UI state updates and potential TUI re-render work.

### Expected outcome

When there are no async subagent jobs and the async widget has not been shown, `renderWidget()` returns without touching TUI widget state. If the widget was previously shown, the next empty-job render still clears it exactly once.

---

## Scope (exact files changed)

> Use POSIX-style paths for portability on Linux/macOS.

Path variables:

- `PI_AGENT_DIR=${HOME}/.pi/agent`

Files:
1. `${PI_AGENT_DIR}/npm/node_modules/pi-subagents/src/tui/render.ts`

---

## Change 1 — Track async widget visibility before clearing

**File:** `${PI_AGENT_DIR}/npm/node_modules/pi-subagents/src/tui/render.ts`

### What was changed

Added a module-level visibility flag near the TUI theme type:

Before:

```ts
type Theme = ExtensionContext["ui"]["theme"];

function getTermWidth(): number {
	return process.stdout.columns || 120;
}
```

After:

```ts
type Theme = ExtensionContext["ui"]["theme"];

let asyncWidgetVisible = false;

function getTermWidth(): number {
	return process.stdout.columns || 120;
}
```

Changed `renderWidget()` so empty job lists only clear the widget if this extension previously showed it:

Before:

```ts
export function renderWidget(ctx: ExtensionContext, jobs: AsyncJobState[]): void {
	if (jobs.length === 0) {
		if (ctx.hasUI) ctx.ui.setWidget(WIDGET_KEY, undefined);
		return;
	}
	if (!ctx.hasUI) return;
	ctx.ui.setWidget(WIDGET_KEY, buildWidgetComponent(jobs, ctx.ui.getToolsExpanded?.() ?? false));
}
```

After:

```ts
export function renderWidget(ctx: ExtensionContext, jobs: AsyncJobState[]): void {
	if (jobs.length === 0) {
		if (ctx.hasUI && asyncWidgetVisible) {
			ctx.ui.setWidget(WIDGET_KEY, undefined);
			asyncWidgetVisible = false;
		}
		return;
	}
	if (!ctx.hasUI) return;
	asyncWidgetVisible = true;
	ctx.ui.setWidget(WIDGET_KEY, buildWidgetComponent(jobs, ctx.ui.getToolsExpanded?.() ?? false));
}
```

### Why

The async widget only needs clearing after it has been mounted. Tracking visibility avoids unnecessary `setWidget(undefined)` calls during cold startup, session reset, or idle polling paths where no async widget existed.

---

## Verification steps

Run from any directory:

```bash
node --experimental-strip-types --check "${HOME}/.pi/agent/npm/node_modules/pi-subagents/src/tui/render.ts"
grep -n "asyncWidgetVisible\|renderWidget" "${HOME}/.pi/agent/npm/node_modules/pi-subagents/src/tui/render.ts"
```

Expected:
- `node --experimental-strip-types --check` exits with status `0` and prints no syntax errors.
- `grep` shows the `asyncWidgetVisible` declaration and the guarded `renderWidget()` logic.

---

## Operational notes

- Restart Pi or run `/reload` for the modified installed package source to be reloaded by the TUI process.
- This patch edits an installed npm package under `${PI_AGENT_DIR}/npm/node_modules/pi-subagents`; it may be overwritten by `pi update`, package reinstall, or package upgrade.
- For a durable upstream fix, apply the same source change in the `pi-subagents` package repository and publish/update the package.
