---
name: learnings
description: Use for repeated-looking troubleshooting, solved-issue recall, adding durable troubleshooting notes, and maintaining the local LEARNINGS archive. Reads LEARNINGS-SUMMARY.md first, follows referenced archive/source files before applying lessons, and verifies against current system evidence.
---

# LEARNINGS

This skill manages and uses Firstpick's durable troubleshooting LEARNINGS archive.

The archive is not chat memory. It is a local, file-based knowledge base of short solved-issue notes plus generated indexes and summaries.

## When to use

Use this skill when:

- a troubleshooting issue looks similar to something solved before
- the user asks about LEARNINGS, `/ret-LEARNINGS`, or `/sum-LEARNINGS`
- a troubleshooting session ended with a real solution and should be recorded
- the LEARNINGS symlink/env/timer/scripts need inspection or repair

Do **not** blindly apply a past solution. Always verify against current files, commands, logs, and system state.

## Path resolution

Resolve the archive root in this order:

1. Source `~/.pi/agent/learnings.env` if present and use `$LEARNINGS_DIR`.
2. Otherwise use the stable symlink `~/.pi/agent/LEARNINGS`.
3. Otherwise ask before creating a new archive.

Expected current value on Firstpick's system:

```text
/mnt/SSD_NVME/LEARNINGS
```

Portable shell snippet:

```bash
source "$HOME/.pi/agent/learnings.env" 2>/dev/null || true
LEARNINGS_DIR="${LEARNINGS_DIR:-$HOME/.pi/agent/LEARNINGS}"
```

## Retrieval workflow

1. Resolve `LEARNINGS_DIR`.
2. Read `$LEARNINGS_DIR/LEARNINGS-SUMMARY.md`.
3. Identify relevant entries.
4. Read the referenced `source` or `archive` file for each relevant entry.
5. Apply the lesson only after verifying the current system/repo state.
6. In the final answer, briefly cite which LEARNINGS files influenced the solution.

If `LEARNINGS-SUMMARY.md` is missing or stale, run:

```bash
~/.pi/agent/bin/learnings-summary
```

or, from this package directory:

```bash
./scripts/sync-learnings.py
./scripts/summarize-learnings.py
```

## Adding a learning

This is an implicit completion requirement, not an optional reminder.

At the end of every troubleshooting/configuration/repair task where a real solution was found, automatically create or update one concise LEARNINGS `.md` note before the final answer. Do not wait for the user to ask. This applies especially when this skill was used for inspection, repair, cleanup, setup, repeated-issue retrieval, or LEARNINGS maintenance.

Skip writing a note only when one of these is true:

- no solution was found
- the task was pure explanation/research with no fix or reusable operational lesson
- the user explicitly says not to write a learning
- writing would duplicate an existing note; in that case update the existing note only if the new solution materially changes it

Use this format:

```markdown
# concise-title-date

- Issue: what happened.
- Tried: key diagnostics/fixes attempted.
- Solution: what worked at the end.
- Verification: command/output or observed behavior proving it worked.
```

If no solution was found, skip creating a note unless the user explicitly asks for a failed-attempt record.

After adding or updating a note, always regenerate summary/index:

```bash
~/.pi/agent/bin/learnings-summary
```

Before the final answer, verify the note exists and mention the path briefly.

## Maintenance workflow

Health check:

```bash
source "$HOME/.pi/agent/learnings.env" 2>/dev/null || true
LEARNINGS_DIR="${LEARNINGS_DIR:-$HOME/.pi/agent/LEARNINGS}"
ls -la "$HOME/.pi/agent/LEARNINGS" "$HOME/.pi/agent/learnings.env" "$LEARNINGS_DIR"
python -m json.tool "$LEARNINGS_DIR/manifest.json" >/dev/null
systemctl --user list-timers sync-learnings.timer --all --no-pager
```

Expected core files:

```text
README.md
INDEX.md
manifest.json
LEARNINGS-SUMMARY.md
archive/
logs/
sync-learnings.py
summarize-learnings.py
run-sync-with-notification.sh
```

## Package scripts

This package includes maintenance scripts in `scripts/`:

- `sync-learnings.py` — archives root learning notes and writes `manifest.json` + `INDEX.md`.
- `summarize-learnings.py` — generates `LEARNINGS-SUMMARY.md` from `manifest.json`.
- `run-sync-with-notification.sh` — runs both and writes `logs/latest.log`.

When referenced from this skill, relative paths are resolved against the skill directory parent/package root as needed.
