# pi-extension-memory-helper

Local memory capture and lookup helpers for Pi.

## What it does

- Appends fast notes to daily memory files.
- Searches daily memory markdown files.
- Adds per-skill memory outside package repos at `~/.pi/agent/memory/skills/<skill>.md`.
- Exposes commands and tools for both users and agents.
- Uses plain markdown files (human-readable, git-friendly).

## Install

This is vendored inside `@firstpick/pi-package-skill-lifecycle`; install the parent package:

```bash
pi install npm:@firstpick/pi-package-skill-lifecycle
```

## Configuration

- `PI_MEMORY_HELPER_TIMEZONE`
  - Controls timestamps for `/remember`, `remember_note`, and per-skill memory.
  - Default: `UTC`.
- `PI_CODING_AGENT_DIR`
  - Controls the Pi agent directory.
  - Default: `~/.pi/agent`.

## Daily memory commands

- `/remember <note>` - append a timestamped note to today's memory file.
- `/memory-search <query>` - search daily memory markdown files.
- `/memory-helper-status` - show active memory directories and timezone.

## Daily memory tools

- `remember_note`
  - Input: `note`
  - Action: append to today's memory file.
- `memory_search`
  - Input: `query`, optional `limit` (1–50)
  - Action: search daily memory markdown files.

## Per-skill memory

Per-skill memory is local and personal. Normal writes never modify skill package directories; they append under:

```text
~/.pi/agent/memory/skills/<skill-name>.md
```

Format:

```md
# Skill Memory: repo-explorer

Personal, local-only memory for this Pi skill.
Do not store secrets, credentials, API keys, or portable package instructions here.

## 2026-05-29 22:10 UTC
- Observation: repo-explorer gives better results before broad grep/read passes.
- Failure mode: compact budget may omit enough evidence for final citations.
- Next invocation hint: retry with includeEvidence=true when exact snippets matter.
```

### Per-skill memory commands

- `/skill-memory-add <skill> :: <non-secret note>` - append a note.
- `/skill-memory-read <skill>` - read one skill's memory file.
- `/skill-memory-search <query>` - search across skill memory files.
- `/skill-memory-list` - list skill memory files.

### Per-skill memory tools

- `skill_memory_add`
  - Input: `skill`, `note`, optional `kind`, optional `allowSensitive`.
  - Action: append a timestamped entry to `~/.pi/agent/memory/skills/<skill>.md`.
  - Safety: refuses likely secrets by default. Set `allowSensitive=true` only after explicit user approval.
- `skill_memory_read`
  - Input: `skill`, optional `maxChars`.
  - Action: read only that skill's memory file.
- `skill_memory_search`
  - Input: `query`, optional `limit` (1–50).
  - Action: search across per-skill memory files.
- `skill_memory_list`
  - Input: optional `limit`.
  - Action: list per-skill memory files with entry counts and last timestamp.

## Redaction guidance

Do not store secrets, API keys, tokens, passwords, private keys, customer data, or other sensitive content in memory. Store durable observations, failure modes, successful patterns, and next-invocation hints instead.

Good:

```text
Observation: repo-explorer compact budget is enough for structure-only audits.
```

Bad:

```text
password=...
OPENAI_API_KEY=...
-----BEGIN PRIVATE KEY-----
```

## Verification examples

Inside Pi, use the tools:

```text
skill_memory_add repo-explorer "Test entry: compact budget was enough for structure-only audit."
skill_memory_read repo-explorer
skill_memory_search "compact budget"
skill_memory_list
```

Filesystem check:

```bash
ls ~/.pi/agent/memory/skills
```

For package tests:

```bash
cd <package-root>
bun test
```
