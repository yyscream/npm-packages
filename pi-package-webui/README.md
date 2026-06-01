# @firstpick/pi-package-webui

Local browser companion for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

This package provides:

- `pi-webui`: a local HTTP/SSE server that starts `pi --mode rpc`, serves the static browser UI, and proxies browser actions to Pi RPC commands.
- `/start-webui`: a Pi slash command that launches `pi-webui` for the current Pi working directory and opens the browser.
- A no-build web app in `public/` with no runtime frontend dependencies.

> **Security:** Pi Web UI has no authentication. It can control the spawned Pi session, including any tools Pi is allowed to run. It binds to `127.0.0.1` by default; do not expose it on untrusted networks.

## Requirements

- Node.js `>=22.19.0`
- Pi available through this package dependency or as `pi` on `PATH`
- A modern browser with Server-Sent Events support

## Quick start

Install the package from npm into Pi, then restart Pi so `/start-webui` is loaded:

```bash
pi install npm:@firstpick/pi-package-webui
```

From inside terminal Pi:

```text
/start-webui
```

Open the printed URL, usually <http://127.0.0.1:31415/>. The command opens it automatically unless `--no-open` is passed.

For direct development from this package directory:

```bash
node bin/pi-webui.mjs --cwd /path/to/project
```

After a global npm install:

```bash
npm install -g @firstpick/pi-package-webui
pi-webui --cwd /path/to/project
```

## Features

- Browser chat with Pi over RPC
- Live assistant text streaming, including streamed thinking blocks when exposed by the provider
- Prompt, steer, follow-up, abort, new session, and manual compact controls
- Busy-session behavior selector for follow-up vs steer
- Model and thinking-level controls
- Slash-command autocomplete while typing `/...`
- Tool, process, compaction, queue, and extension event log
- Collapsible side panel with session state, queue, available commands, and events
- Pi-style footer with token, cache, estimated Pi-context tokens, speed, cost, context usage, cwd, git branch, changes, runtime, model, and thinking level
- Guided Git workflow: `git add .`, ask Pi to run `/git-staged-msg`, preview short/long messages, commit with the selected message, and `git push`
- Basic rendering for user, assistant, tool result, bash execution, and thinking messages
- Basic extension UI bridge for `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`, `select`, `confirm`, `input`, and `editor`
- Cyberpunk/Catppuccin-inspired theme
- Static frontend: no bundler, no frontend install step

## Pi slash command

```text
/start-webui [port] [options] [-- <pi args...>]
```

Options:

```text
  [port]             Positional port shortcut
  --host <host>      HTTP bind host (default: 127.0.0.1)
  --port <port>      HTTP port (default: 31415)
  --no-open          Do not open the browser automatically
  --no-session       Start Pi RPC with --no-session
  --name <name>      Initial Pi session name
  -- <pi args...>    Extra arguments forwarded to Pi RPC
```

Examples:

```text
/start-webui
/start-webui 31500
/start-webui --port 31500 --no-open
/start-webui --name browser -- --model anthropic/claude-sonnet-4-5:high
```

If a compatible Web UI is already running on the target URL, `/start-webui` reuses it and opens the browser instead of spawning another server.

## CLI

```text
pi-webui [options] [-- <pi args...>]
```

Options:

```text
  --host <host>       HTTP bind host (default: 127.0.0.1)
  --port <port>       HTTP port (default: 31415)
  --cwd <path>        Working directory for the Pi session (default: current dir)
  --pi <command>      Pi executable to spawn (default: bundled dependency, then "pi")
  --no-session        Start Pi RPC with --no-session
  --name <name>       Initial Pi session name
  -h, --help          Show help
  -v, --version       Print version
```

Examples:

```bash
pi-webui --cwd ~/src/my-project
pi-webui --port 3000 -- --model anthropic/claude-sonnet-4-5:high
PI_WEBUI_PI_BIN=/path/to/pi pi-webui --no-session
```

Environment variables:

- `PI_WEBUI_HOST`
- `PI_WEBUI_PORT`
- `PI_WEBUI_PI_BIN` (same purpose as `--pi`)

## Guided Git workflow

The browser button runs a native local workflow in the Web UI server process:

1. `git add .` in the active Pi working directory.
2. Send `/git-staged-msg` to Pi.
3. Read `dev/COMMIT/staged-commit-short.txt` and `dev/COMMIT/staged-commit-long.txt` from the git root.
4. Commit with either the short message (`git commit -m ...`) or the long message (`git commit -F ...`).
5. Run `git push`.

This workflow assumes `/git-staged-msg` is available in the Pi session and writes the two `dev/COMMIT/` files above. It can be cancelled between steps; active native git commands are terminated on cancel where possible.

## How it works

`pi-webui` starts a Pi RPC subprocess:

```bash
pi --mode rpc
```

With options, the spawned command becomes:

```bash
pi --mode rpc [--no-session] [--name <name>] [...extra Pi args]
```

The local server exposes:

- static files from `public/`
- HTTP endpoints for prompt/session/model/thinking/compact/git actions
- `/api/events` as a Server-Sent Events stream for Pi RPC events
- `/api/extension-ui-response` for browser responses to extension UI prompts

Pi stdout is read as JSONL and split only on `\n`, matching Pi RPC framing.

## Network and safety notes

- Default bind is localhost-only: `127.0.0.1:31415`.
- `--host 0.0.0.0` makes the UI reachable from the network and is unsafe unless the network is trusted.
- The UI is intended as a local companion, not a hardened multi-user web service.
- Browser actions can trigger Pi tools, shell commands, file edits, and git operations according to the spawned Pi session's permissions.
