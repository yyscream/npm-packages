# @firstpick/pi-package-webui

Pi Web UI companion package for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

Category: **Pi package / companion app**. It bundles both:

- a CLI server, `pi-webui`, that starts `pi --mode rpc`, serves a small no-build web app, and proxies prompts/events over HTTP + Server-Sent Events
- a Pi extension command, `/start-webui`, that launches the local server from terminal Pi and opens the browser

## Features

- Chat with Pi from a browser
- Live assistant text streaming
- Tool start/finish event log
- Prompt, steer, follow-up, abort, new session
- Model and thinking-level controls
- Guided git workflow: `git add .`, `/git-staged-msg`, preview generated messages, short/long commit, and `git push`
- Pi slash command `/start-webui` to launch the local server from terminal Pi and open the browser
- ChatGPT-style collapsible session/queue/commands/events side panel with in-panel control
- Pi-style footer between transcript and input with token, cost, context, model, cwd, and git summary
- Slash-command autocomplete while typing `/...` in the prompt box
- Enter sends, Shift+Enter inserts a new line
- Cyberpunk Catppuccin-inspired visual theme
- Basic rendering for user/assistant/tool/bash messages
- Basic RPC extension UI support: `select`, `confirm`, `input`, `editor`, notifications, status, widgets
- No frontend build step and no runtime web dependencies

## Usage

```bash
# from this package directory during development
node bin/pi-webui.mjs --cwd /path/to/project

# after global install
pi-webui --cwd /path/to/project

# pass Pi CLI args after --
pi-webui --port 3000 -- --model anthropic/claude-sonnet-4-5:high
```

Open the printed URL, usually <http://127.0.0.1:31415/>.

## Pi slash command

Install this package as a Pi package, then reload Pi:

```bash
pi install ./pi-package-webui
```

From terminal Pi, run:

```text
/start-webui
/start-webui --port 31500
/start-webui --no-open
```

The command starts `pi-webui` for the current Pi cwd, shows the localhost URL, and opens it in the default browser unless `--no-open` is passed.

## CLI

```text
pi-webui [options] [-- <pi args...>]

Options:
  --host <host>       HTTP bind host (default: 127.0.0.1)
  --port <port>       HTTP port (default: 31415)
  --cwd <path>        Working directory for the Pi session (default: current dir)
  --pi <command>      Pi executable to spawn (default: bundled dependency, then "pi")
  --no-session        Start Pi RPC with --no-session
  --name <name>       Initial Pi session name
```

Environment:

- `PI_WEBUI_HOST`
- `PI_WEBUI_PORT`
- `PI_WEBUI_PI_BIN` (overrides bundled Pi resolution)

## Security

This UI has **no authentication**. It can control Pi, including tools such as shell commands and file edits if enabled in the spawned Pi session.

Default binding is `127.0.0.1`. Do not use `--host 0.0.0.0` unless you are on a trusted network and understand the risk.

## How it works

The server spawns Pi in RPC mode:

```bash
pi --mode rpc
```

Browser actions call local HTTP endpoints. Agent events from Pi stdout are broadcast to the browser through Server-Sent Events. The JSONL reader follows Pi RPC framing rules and splits records only on `\n`.
