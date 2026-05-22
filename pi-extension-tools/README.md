# pi-extension-tools

Interactive active-tool manager for Pi.

## Commands

- `/tools` — open a TUI to enable/disable individual tools, then press `Ctrl+S` to save or `q` to cancel.
- `/tools list` — print active/inactive tools grouped by source extension.
- `/tools enable <tool...>` — enable one or more tools.
- `/tools disable <tool...>` — disable one or more tools.
- `/tools reset` — enable all currently available tools.

Saved tool choices are stored globally in `~/.pi/agent/tools.json` (or `$PI_CODING_AGENT_DIR/tools.json`) with both `active` and `inactive` tool lists. On startup, only `active` tools are restored from that file. If the file is missing, the extension falls back to the current session branch state, then Pi's current active tools.

The current session branch still receives custom entries for branch history/debugging, but the global file is the cross-session source of truth.
