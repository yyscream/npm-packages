# Bang autocomplete persistence across sessions

- **What happened:** Commands learned via `!` in Pi appeared in autocomplete during the session, but disappeared after restarting Pi.
- **What was tried:** Verified `PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY` behavior and checked extension flow; learned commands were only stored in-memory (`runtimeLearned`) and depended on shell history for cross-session persistence.
- **Solution:** Added extension-managed persistence to `~/.pi/agent/state/bang-command-autocomplete-runtime.json` (configurable via `PI_BANG_AUTOCOMPLETE_RUNTIME_STORE_PATH`) and now reload persisted commands at session start.
