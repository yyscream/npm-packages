---
description: Generate one consolidated LEARNINGS summary with references
---
Refresh and summarize the canonical LEARNINGS archive.

Portable path resolution:
1. Source `~/.pi/agent/learnings.env` if present and use `$LEARNINGS_DIR`.
2. Otherwise use the stable symlink `~/.pi/agent/LEARNINGS`.

Steps:
1. Run `~/.pi/agent/bin/learnings-summary`.
2. Verify `${LEARNINGS_DIR:-$HOME/.pi/agent/LEARNINGS}/LEARNINGS-SUMMARY.md` exists.
3. Report the output path and a short count/summary.

The summary must preserve references to the respective original files for detail checking.
