# PATCH.md — <short patch title>

## Purpose

<what this patch fixes or improves, in 1-3 sentences>

### Root cause

<why the issue exists today; concrete mechanism>

### Expected outcome

<what behavior should change after patch>

---

## Scope (exact files changed)

> Use POSIX-style paths for portability on Linux/macOS.

Path variables:

- `<VAR_NAME>=<value or expression>` (example: `PI_HOME=${HOME}/.pi`)

Files:
1. `<relative/or/absolute/path/file1>`
2. `<relative/or/absolute/path/file2>`

---

## Change 1 — <short change title>

**File:** `<path>`

### What was changed

<exact code/data change; include minimal before/after snippets>

### Why

<reason this change is needed>

---

## Change 2 — <short change title>

**File:** `<path>`

### What was changed

<exact code/data change; include minimal before/after snippets>

### Why

<reason this change is needed>

---

## Verification steps

Run from `<working directory>`:

```bash
<command 1>
<command 2>
```

Expected:
- <observable proof 1>
- <observable proof 2>

---

## Operational notes

- <restart/reload requirements>
- <known limitations>
- <persistence note, e.g., generated/dist file may be overwritten>
