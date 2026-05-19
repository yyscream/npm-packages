---
description: Retrieve LEARNINGS summary for repeated issue solving
argument-hint: "[issue/context]"
---
Use the canonical LEARNINGS summary as prior troubleshooting memory for this issue/context:

$ARGUMENTS

Portable path resolution:
1. Source `~/.pi/agent/learnings.env` if present and use `$LEARNINGS_DIR`.
2. Otherwise use the stable symlink `~/.pi/agent/LEARNINGS`.

Steps:
1. Read `${LEARNINGS_DIR:-$HOME/.pi/agent/LEARNINGS}/LEARNINGS-SUMMARY.md`.
2. Identify potentially relevant past learnings.
3. If a match looks useful, read the referenced source/archive files for details.
4. Apply the relevant lesson to the current issue, but verify against current files/commands before acting.
5. Briefly cite which learning entries/files influenced the solution.

If the summary file is missing or stale, run `~/.pi/agent/bin/learnings-summary` first.
