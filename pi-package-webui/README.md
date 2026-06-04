# @firstpick/pi-package-webui

Local browser companion for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

![Pi Web UI main window showing multi-tab chat, controls, theme picker, and local status](https://unpkg.com/@firstpick/pi-package-webui/images/Main_Window_v0.1.7.png)

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

## Optional companion packages

The Web UI declares its companion Pi packages as npm `optionalDependencies`. A normal npm/Pi install will install them, while minimal installs can skip them with npm's optional-dependency controls such as `npm install --omit=optional`.

At startup, the browser checks loaded Pi capabilities directly through RPC-visible commands and live widget events; it does not inspect npm package folders. That means locally symlinked/dev packages and separately installed Pi packages work as long as their commands/widgets are loaded in the active Pi tab.

The side panel shows each optional feature as enabled, disabled, or install-needed. Disabling a feature is Web UI-local and hides Web UI affordances/specialized renderers without uninstalling or unloading the underlying Pi package. Installing a missing feature is an explicit, warned action: the server runs npm install for the whitelisted package from localhost only, then prompts you to `/reload` the active Pi tab so newly installed resources can load.

Optional companions:

- `@firstpick/pi-prompts-git-pr` for the guided Git workflow's `/git-staged-msg` prompt.
- `@firstpick/pi-extension-release-npm` and `@firstpick/pi-extension-release-aur` for Publish menu commands and live release widgets.
- `@firstpick/pi-extension-todo-progress` for the specialized todo-progress widget.
- `@firstpick/pi-extension-git-footer-status` and `@firstpick/pi-extension-stats` for richer Pi status/footer and stats commands.
- `@firstpick/pi-themes-bundle` for theme resources used by the browser theme picker and Pi themes.

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
- Automatic tab naming from the first prompt on default-named tabs, plus `/name <title>` to manually sync the Pi session and browser tab name
- Per-tab activity indicators for idle, working, blocked, and completed unseen work, with browser notifications when a tab needs an extension UI response and an optional side-panel toggle for agent-done notifications
- Live assistant text streaming, including streamed thinking blocks when exposed by the provider
- Prompt, steer, follow-up, abort, new session, and manual compact controls
- Attachment button plus drag/drop and clipboard paste for images, documents, video, audio, and other files; uploaded files are saved to a server temp path and supported images are also sent through Pi RPC image attachments
- Busy-session behavior selector for follow-up vs steer
- Model and thinking-level controls
- Browser-native selector dialogs for native slash commands such as `/model`, `/settings`, `/theme`, `/fork`, `/clone`, `/resume`, and `/tree`; `/login`/`/logout` currently show non-secret guidance rather than accepting credentials in the browser
- Slash-command autocomplete while typing `/...`
- `@` file/path references with live suggestions from the active tab cwd
- Tool, process, compaction, queue, and extension event log
- Collapsible side panel with independently collapsible sections for controls, optional features, session state, queue, available commands, events, local-network exposure status/control, and a theme picker
- Pi-style footer with token, cache, estimated Pi-context tokens, speed, cost, context usage, clickable per-tab cwd picker with server-persisted fast picks, git branch, changes, runtime, model, and thinking level
- Guided Git workflow: `git add .`, ask Pi to run `/git-staged-msg`, preview short/long messages, commit with the selected message, and `git push`
- Hover-expand Publish workflow menu beside Git workflow, currently offering NPM Release and AUR Release
- Basic rendering for user, assistant, tool result, bash execution, and thinking messages
- Feedback reactions (`👍`, `👎`, `?`) on final assistant output plus tool/bash action cards, with queued post-run submission that asks Pi to create/update a LEARNING
- Basic extension UI bridge for `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`, `select`, `confirm`, `input`, and `editor`
- Specialized `/release-npm` and `/release-aur` widget rendering with scrollable live logs plus toggle/abort actions
- Side-panel theme picker backed by optional `@firstpick/pi-themes-bundle` themes when loaded
- PWA metadata, icons, and service worker for install-to-home-screen support when served from a secure context
- Static frontend: no bundler, no frontend install step

## Mobile/PWA notes

- The mobile composer starts as a one-line `Ask Pi…` input, grows with user-entered lines, and scrolls the transcript to the latest output when focused.
- When Pi is idle, `Steer` and `Follow-up` live inside `Actions`; while a run is active, they move back into the main composer row for quick steering/follow-up.
- PWA install support, blocked-tab browser notifications, and optional agent-done notifications require browser service-worker/notification support and usually HTTPS or `localhost`. Plain `http://<LAN-IP>` may show the app but may not offer install or notifications on Chrome/Safari.

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
  --name <name>      Initial Web UI tab display name
  -- <pi args...>    Extra arguments forwarded to Pi RPC
```

Examples:

```text
/webui-start
/webui-start 31500
/webui-start --port 31500 --no-open
/webui-start --name browser -- --model anthropic/claude-sonnet-4-5:high
```

If a compatible Web UI is already running on the target URL, `/webui-start` captures its currently open terminal tabs, stops that instance, then starts a fresh server and reopens only those open tabs from their session files when available. Tabs you closed in the Web UI stay closed; use `/resume` if you want to reopen an older Pi session manually.

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
  --name <name>       Initial Web UI tab display name
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

This workflow requires `/git-staged-msg` from `@firstpick/pi-prompts-git-pr`, which writes the two `dev/COMMIT/` files above. The Web UI enables the Git workflow button only when that command is loaded in the active Pi tab. If package resources are filtered or optional dependencies were omitted, make sure `/git-staged-msg` remains enabled. The workflow can be cancelled between steps; active native git commands are terminated on cancel where possible.

## How it works

`pi-webui` starts a Pi RPC subprocess for the initial browser terminal tab, and each additional Web UI tab starts another isolated subprocess:

```bash
pi --mode rpc
```

With options, each spawned command becomes:

```bash
pi --mode rpc [--no-session] [...extra Pi args]
```

Web UI tab titles are stored in Web UI metadata instead of being forwarded as Pi CLI `--name` flags, so multiple tabs remain compatible with bundled Pi CLI versions that do not support session naming.

The local server exposes:

- static files from `public/`
- `GET /api/tabs`, `POST /api/tabs`, `PATCH /api/tabs/:id`, and `DELETE /api/tabs/:id` for isolated Web UI terminal tabs and per-tab cwd changes; default-named tabs are auto-renamed from the first conversation prompt
- `GET /api/directories?tab=<tabId>&path=<path>` for the browser cwd picker
- `GET /api/path-suggestions?tab=<tabId>&query=<path>` for `@` file/path reference autocomplete in the prompt composer
- `GET /api/path-fast-picks` and `POST /api/path-fast-picks` for cwd picker fast picks persisted across browser tabs, Pi terminal tabs, and Web UI server restarts
- `POST /api/attachments` for browser-selected, pasted, or dropped files; files are stored under the OS temp directory and referenced in the prompt, while supported images can also be sent inline via RPC `images`
- `GET /api/themes` for optional theme data from `@firstpick/pi-themes-bundle` when available
- `GET /api/fork-messages`, `POST /api/fork`, `POST /api/clone`, `GET /api/sessions`, `POST /api/switch-session`, `GET /api/session-tree`, and `POST /api/tree-navigate` for browser-native native slash selectors
- localhost-only `POST /api/optional-feature-install` for explicit, warned installation of whitelisted optional feature packages
- `GET /api/network` and localhost-only `POST /api/network/open` for local-network exposure status/control
- `GET /api/webui-status?detailed=1` for slash-command status reporting
- `POST /api/shutdown` for localhost-only graceful restarts from `/webui-start`; restart captures detailed open-tab status first so currently open tabs can be restored with their session files
- HTTP endpoints for prompt/session/model/thinking/compact/git actions; tab-scoped calls use `?tab=<tabId>`
- `POST /api/action-feedback?tab=<tabId>` to turn queued action/final-output reactions into a Pi prompt that creates/updates a LEARNING after the run is idle
- `/api/events?tab=<tabId>` as a per-tab Server-Sent Events stream for Pi RPC events
- `/api/extension-ui-response?tab=<tabId>` for browser responses to extension UI prompts

Pi stdout is read as JSONL and split only on `\n`, matching Pi RPC framing.

## Network and safety notes

- Default bind is localhost-only: `127.0.0.1:31415`.
- The side-panel "Open to network" button rebinds the current server to `0.0.0.0`, shows LAN URLs when available, and toggles to "Close for network" to rebind back to localhost-only access.
- `--host 0.0.0.0` also makes the UI reachable from the network and is unsafe unless the network is trusted.
- The UI is intended as a local companion, not a hardened multi-user web service.
- Browser actions can trigger Pi tools, shell commands, file edits, and git operations according to the spawned Pi session's permissions.
