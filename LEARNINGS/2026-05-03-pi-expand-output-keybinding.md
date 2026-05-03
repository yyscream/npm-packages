# Pi tool output expand keybinding issue

- **What happened:** Expanding tool output via `Ctrl+O` / `Ctrl+Shift+O` was not working reliably.
- **What was tried:** Checked Pi keybinding docs and local `~/.pi/agent/keybindings.json`; verified current bindings and terminal key-handling behavior assumptions.
- **Solution:** Updated `~/.pi/agent/keybindings.json` to bind `app.tools.expand` to both `ctrl+o` and `ctrl+shift+o`.
