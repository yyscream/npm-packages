# @firstpick/pi-extension-btw

Ephemeral `/btw` side questions for Pi.

## What it does

- Adds `/btw <question>` as a Pi extension command.
- Answers from the current session transcript without appending the question or answer to the main conversation.
- Does not expose tools to the side request.
- In the TUI, shows the answer in a centered overlay with scrolling and dismiss keys.
- In Pi Web UI RPC mode, emits a structured status payload consumed by the Web UI optional overlay.

## Install

```bash
pi install npm:@firstpick/pi-extension-btw
```

## Usage

```text
/btw what was the config file name again?
```

TUI keys while the overlay is open:

- `↑` / `↓` — scroll
- `PageUp` / `PageDown` — scroll faster
- `Home` / `End` — jump to top/bottom
- `Enter`, `Space`, `Esc`, `Ctrl+C` — close the overlay; if the side request is still running, it is aborted

## Web UI integration

When loaded inside `@firstpick/pi-package-webui`, `/btw` publishes structured updates through the extension UI `setStatus` bridge using the `btw-webui` status key. The Web UI renders those updates as an optional browser overlay.

## Notes

`/btw` makes a separate model request. It keeps the main transcript clean, but it is not free: provider token usage still applies. The request serializes the current branch transcript for context and appends the side question only to that ephemeral request.
