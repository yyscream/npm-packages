# @firstpick/pi-package-webui

Local browser companion for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

This package provides:

- `pi-webui`: a local HTTP/SSE server that starts `pi --mode rpc`, serves the static browser UI, and proxies browser actions to Pi RPC commands.
- `/webui-start`: a Pi slash command that launches `pi-webui` for the current Pi working directory and opens the browser.
- `/webui-status`: a Pi slash command that reports the Web UI URL, online state, network exposure, and optional detailed runtime info.
- A no-build web app in `public/` with no runtime frontend dependencies.

> **Security:** Pi Web UI has no authentication. It can control the spawned Pi session, including any tools Pi is allowed to run. It binds to `127.0.0.1` by default; do not expose it on untrusted networks.

## Requirements

- Node.js `>=22.19.0`
- Pi available through this package dependency or as `pi` on `PATH`
- A modern browser with Server-Sent Events support

## Quick start

Install the package from npm into Pi, then restart Pi so `/webui-start` and `/webui-status` are loaded:

```bash
pi install npm:@firstpick/pi-package-webui
```

From inside terminal Pi:

```text
/webui-start
```

Open the printed URL, usually <http://127.0.0.1:31415/>. The command opens it automatically unless `--no-open` is passed. Check a running instance with `/webui-status` or `/webui-status detailed`.

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
- Isolated terminal tabs: each Web UI tab starts its own separate `pi --mode rpc` subprocess, event stream, session state, and prompt draft
- Live assistant text streaming, including streamed thinking blocks when exposed by the provider
- Prompt, steer, follow-up, abort, new session, and manual compact controls
- Busy-session behavior selector for follow-up vs steer
- Model and thinking-level controls
- Slash-command autocomplete while typing `/...`
- Tool, process, compaction, queue, and extension event log
- Collapsible side panel with session state, queue, available commands, events, and local-network exposure status/control
- Pi-style footer with token, cache, estimated Pi-context tokens, speed, cost, context usage, clickable per-tab cwd picker with server-persisted fast picks, git branch, changes, runtime, model, and thinking level
- Guided Git workflow: `git add .`, ask Pi to run `/git-staged-msg`, preview short/long messages, commit with the selected message, and `git push`
- Basic rendering for user, assistant, tool result, bash execution, and thinking messages
- Basic extension UI bridge for `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`, `select`, `confirm`, `input`, and `editor`
- Cyberpunk/Catppuccin-inspired theme
- PWA metadata, icons, and service worker for install-to-home-screen support when served from a secure context
- Static frontend: no bundler, no frontend install step

## Mobile/PWA notes

- The mobile composer starts as a one-line `Ask Pi…` input, grows with user-entered lines, and scrolls the transcript to the latest output when focused.
- When Pi is idle, `Steer` and `Follow-up` live inside `Actions`; while a run is active, they move back into the main composer row for quick steering/follow-up.
- PWA install support requires browser service-worker support and usually HTTPS or `localhost`. Plain `http://<LAN-IP>` may show the app but may not offer install on Chrome/Safari.

## Pi slash commands

```text
/webui-start [port] [options] [-- <pi args...>]
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
/webui-start
/webui-start 31500
/webui-start --port 31500 --no-open
/webui-start --name browser -- --model anthropic/claude-sonnet-4-5:high
```

If a compatible Web UI is already running on the target URL, `/webui-start` stops that instance first, then starts a fresh server for the current cwd and opens it.

Status commands:

```text
/webui-status
/webui-status detailed
/webui-status detailed --port 31500
```

`/webui-status` reports the page URL, whether the server is online, and whether it is open to the local network. `detailed` adds Web UI/Pi PIDs, bind info, tabs, current session/model/thinking state, available providers, per-tab workspace/stats summaries, and recent backend events.

## CLI

```text
pi-webui [options] [-- <pi args...>]
```

Options:

```text
  --host <host>       HTTP bind host (default: 127.0.0.1)
  --port <port>       HTTP port (default: 31415)
  --cwd <path>        Default working directory for Pi tabs (default: current dir)
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

`pi-webui` starts a Pi RPC subprocess for the initial browser terminal tab, and each additional Web UI tab starts another isolated subprocess:

```bash
pi --mode rpc
```

With options, each spawned command becomes:

```bash
pi --mode rpc [--no-session] [--name <name>] [...extra Pi args]
```

The local server exposes:

- static files from `public/`
- `GET /api/tabs`, `POST /api/tabs`, `PATCH /api/tabs/:id`, and `DELETE /api/tabs/:id` for isolated Web UI terminal tabs and per-tab cwd changes
- `GET /api/directories?tab=<tabId>&path=<path>` for the browser cwd picker
- `GET /api/path-fast-picks` and `POST /api/path-fast-picks` for cwd picker fast picks persisted across browser tabs, Pi terminal tabs, and Web UI server restarts
- `GET /api/network` and localhost-only `POST /api/network/open` for local-network exposure status/control
- `GET /api/webui-status?detailed=1` for slash-command status reporting
- `POST /api/shutdown` for localhost-only graceful restarts from `/webui-start`
- HTTP endpoints for prompt/session/model/thinking/compact/git actions; tab-scoped calls use `?tab=<tabId>`
- `/api/events?tab=<tabId>` as a per-tab Server-Sent Events stream for Pi RPC events
- `/api/extension-ui-response?tab=<tabId>` for browser responses to extension UI prompts

Pi stdout is read as JSONL and split only on `\n`, matching Pi RPC framing.

## Network and safety notes

- Default bind is localhost-only: `127.0.0.1:31415`.
- The side-panel "Open to network" button rebinds the current server to `0.0.0.0` and shows LAN URLs when available.
- `--host 0.0.0.0` also makes the UI reachable from the network and is unsafe unless the network is trusted.
- The UI is intended as a local companion, not a hardened multi-user web service.
- Browser actions can trigger Pi tools, shell commands, file edits, and git operations according to the spawned Pi session's permissions.
