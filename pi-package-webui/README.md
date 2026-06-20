# @firstpick/pi-package-webui

Local browser UI for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

![Pi Web UI main window showing multi-tab chat, controls, theme picker, and local status](https://unpkg.com/@firstpick/pi-package-webui/images/WebUI_v0.3.7.png)

Pi Web UI gives you a local browser companion for Pi: multi-tab chat, streaming output, model controls, uploads, slash-command helpers, workspace navigation, and optional extension widgets.

> **Security:** Pi Web UI can control the spawned Pi session and run anything that session is allowed to run. It binds to `127.0.0.1` by default. Trusted-LAN opening/closing and Remote PIN auth controls are owned by the optional `@firstpick/pi-package-remote-webui` companion; when enabled, Remote PIN auth persists for later Web UI starts.

## Requirements

- Node.js `>=22.19.0`
- Pi installed and configured
- A modern browser with Server-Sent Events support

## Install

Install the package into Pi:

```bash
pi install npm:@firstpick/pi-package-webui
```

Restart Pi after installation so the Web UI commands are loaded.

## Start from Pi

Run this inside Pi:

```text
/webui-start
```

Open the printed URL, usually <http://127.0.0.1:31415/>. The command opens your browser automatically unless you pass `--no-open`.

Check a running Web UI with:

```text
/webui-status
/webui-status detailed
```

### `/webui-start` options

```text
/webui-start [port] [options] [-- <pi args...>]
```

```text
  [port]             Port shortcut
  --host <host>      HTTP bind host (default: 127.0.0.1)
  --port <port>      HTTP port (default: 31415)
  --no-open          Do not open the browser automatically
  --no-session       Start Pi RPC with --no-session
  --name <name>      Initial Web UI tab name
  --remote-auth      Enable startup PIN authentication for non-local clients
  --no-remote-auth   Disable startup PIN authentication
  -- <pi args...>    Extra arguments forwarded to Pi RPC
```

Examples:

```text
/webui-start
/webui-start 31500
/webui-start --port 31500 --no-open
/webui-start --remote-auth --host 0.0.0.0
/webui-start --name browser -- --model anthropic/claude-sonnet-4-5:high
```

Running `/webui-start` again on the same URL restarts the server and restores currently open Web UI tabs from their session files when possible.

### `/webui-status` options

```text
/webui-status [detailed] [port] [--port N] [--host HOST]
```

`/webui-status` reports the URL, online state, network exposure, and Remote PIN auth state. `detailed` adds tabs, sessions, models/providers, and recent backend events.

## Standalone CLI

Use the CLI when you want to start the Web UI without first opening terminal Pi:

```bash
npm install -g @firstpick/pi-package-webui
pi-webui
```

```text
pi-webui [options] [-- <pi args...>]
```

```text
  --host <host>       HTTP bind host (default: 127.0.0.1)
  --port <port>       HTTP port (default: 31415)
  --cwd <path>        Start the first Pi terminal in this working directory
  --pi <command>      Pi executable to spawn (default: bundled dependency, then "pi")
  --no-session        Start Pi RPC with --no-session
  --name <name>       Initial Web UI tab name
  --remote-auth       Enable startup PIN authentication for non-local clients
  --no-remote-auth    Disable startup PIN authentication
  -h, --help          Show help
  -v, --version       Print version
```

If `--cwd` is omitted, the server starts first and the browser asks for the first terminal CWD.

Examples:

```bash
pi-webui
pi-webui --cwd ~/src/my-project
pi-webui --host 0.0.0.0 --remote-auth --cwd ~/src/my-project
pi-webui --port 3000 -- --model anthropic/claude-sonnet-4-5:high
PI_WEBUI_PI_BIN=/path/to/pi pi-webui --no-session
```

Environment variables:

- `PI_WEBUI_HOST`
- `PI_WEBUI_PORT`
- `PI_WEBUI_PI_BIN`
- `PI_WEBUI_REMOTE_AUTH=1` to start with remote PIN authentication enabled
- `PI_WEBUI_SETTINGS_FILE=/path/to/settings.json` to override where Web UI stores persisted settings such as the Remote PIN auth preference

## Main features

- Pathless `pi-webui` startup: the server opens first, then the browser prompts for the first terminal CWD.
- Multi-tab Pi sessions with isolated processes, working directories, prompt drafts, activity state, and a workspace dashboard for common actions.
- Unified command palette (`Ctrl/Cmd+K`) for commands, tabs, models, sessions, settings, and frequent Web UI actions.
- Automatic tab naming from the first prompt, with `--name <name>` still available for an explicit initial tab name.
- Streaming chat transcript with Markdown, thinking output, tool/bash cards, queue and compaction events, edit-and-retry from user prompts, and guarded abort controls that require holding Esc or the Abort button for 3 seconds.
- Prompt composer with uploads, drag/drop/paste, inline image support, slash-command autocomplete, and `@` file/path references with live suggestions.
- Browser dialogs for common Pi selectors such as `/model`, `/settings`, `/theme`, `/fork`, `/clone`, `/resume`, `/tree`, `/scoped-models`, `/tools`, and `/skills`.
- Model, thinking, session, workspace, theme, optional-feature, Codex usage, optional Remote WebUI, update/restart, event, and notification controls in the side panel.
- Persistent context-window meter with manual compact and auto-compaction controls near the composer.
- Side-panel theme picker backed by optional `@firstpick/pi-themes-bundle` themes when loaded.
- Per-tab cwd changes, a clickable footer cwd picker, saved path fast picks, server-persisted fast picks, and restart-safe restoration of open tabs.
- Detected app runner dropdown for the active tab cwd, including Cargo, Bun, npm/npx/pnpm, Python/uv, Go/Golang, Zig, C/C++, Docker Compose, root/dev/scripts shell scripts, and other common project runners with live output pinned at the top of the terminal. Running app runners expose line-oriented stdin in the widget for interactive scripts. Projects can add browseable custom runners in `.pi-webui-runners.json` with a command (default `./`) plus a relative path to the file to run.
- Browser support for Pi extension UI prompts, widgets, status updates, `/btw` side-question output widgets with optional context transfer/live steering, browser notifications when a tab needs an extension UI response, and an optional side-panel toggle for agent-done notifications.
- Localhost-only Pi/Web UI update checks with a top-right update notification and confirmed restart actions: **Update Pi & restart** runs `pi update` for Pi-only updates, while **Update Pi + Packages & Restart** runs `pi update --all` for Pi plus configured packages.
- Feedback reactions (`👍`, `👎`, `?`) on final assistant output plus tool/bash action cards, which can ask Pi to create or update a LEARNING.
- Mobile-friendly layout and PWA install support where the browser allows it.

Useful browser endpoints exposed by the local server include:

- `GET /api/path-suggestions?tab=<tabId>&query=<path>` for `@` file/path references with live suggestions.
- `POST /api/action-feedback?tab=<tabId>` for feedback on final assistant output and action cards.
- `GET /api/optional-features` for optional companion package install/update status.
- `POST /api/optional-feature-install` for installing or updating known optional companion packages from the side panel.
- `GET /api/update-status` and localhost-only `POST /api/update` for checking Pi/Web UI updates and running `pi update` followed by a Web UI server restart. Use `POST /api/update?all=1` to run `pi update --all` for Pi plus configured packages.
- `GET /api/remote-auth`, `POST /api/remote-auth`, and localhost-only `POST /api/remote-auth/settings` for optional 4-digit PIN authentication when serving non-local browser clients.

For local development, run the checkout helper directly, for example:

```bash
./dev/scripts/start-webui.sh --dev --cwd /path/to/project
```

Run `../dev/scripts/sync-pi-package-symlinks.sh` first when developing companion packages from this workspace. The Web UI manifest loads companions through `node_modules/` paths, and the sync script links those paths to the top-level dev packages so only one copy is loaded.

## Optional companion packages

A normal Pi/npm install includes the optional companion packages unless optional dependencies are disabled. Each Web UI tab curates Pi resources from the Web UI package that started the server, while preserving unrelated user/project resources. Companion packages installed as global/npm-prefix siblings of the started Web UI package are reused when the Web UI package does not have its own nested optional dependency copy, avoiding duplicate loads while keeping global `pi-webui` launches working. Startup checks loaded Pi capabilities directly through RPC-visible commands and live widget events, then the side panel shows each optional feature as enabled, disabled, installed-but-not-loaded, update-available, or install-needed. Installing or updating a feature is an explicit, warned action with running/failure feedback in the row and activity log; it is localhost-only, limited to known packages, and requires reloading the active Pi tab after installation.

When the standalone global `pi-webui` launcher is used, optional companion installs target the npm prefix containing the Web UI package when that prefix is safe, otherwise the Pi agent npm root if it contains Web UI. Override the target explicitly with `PI_WEBUI_OPTIONAL_FEATURE_INSTALL_ROOT=/path/to/package-root` when needed.

Optional companions:

- `@firstpick/pi-extension-btw` — ephemeral `/btw` side-question command with a TUI overlay, Web UI live output widget, and Transfer Context action.
- `@firstpick/pi-prompts-git-pr` — guided Git commit/push workflow.
- `@firstpick/pi-extension-release-npm` — NPM publish menu and release widgets.
- `@firstpick/pi-extension-release-aur` — AUR publish menu and release widgets.
- `@firstpick/pi-extension-workflows` — `/workflow` runtime with non-blocking Web UI subprocess-output widgets.
- `@firstpick/pi-extension-safety-guard` — interactive guardrails for dangerous bash commands and protected file edits.
- `@firstpick/pi-extension-setup-skills` — TUI `/skills` setup command alongside WebUI-native skill toggles.
- `@firstpick/pi-extension-todo-progress` — todo-progress rendering.
- `@firstpick/pi-extension-tools` — TUI `/tools` active-tool manager alongside WebUI-native tool toggles.
- `@firstpick/pi-package-remote-webui` — `/remote` trusted-LAN QR helper plus the optional browser controls for opening/closing LAN access and Remote PIN auth.
- `@firstpick/pi-extension-git-footer-status` — richer extension-owned git/footer status, including the structured Web UI footer payload.
- `@firstpick/pi-extension-stats` — stats commands and status data.
- `@firstpick/pi-themes-bundle` — Web UI and Pi theme resources.

## Guided Git workflow

The Git workflow button runs local git commands in the active Pi working directory:

1. `git add .`
2. Send `/git-staged-msg` to Pi
3. Read the generated commit message files from `dev/COMMIT/`
4. Commit with the selected generated message, or type a manual message in the Message stage and use **Commit input**
5. Run `git push`

After the message is generated, **Create PR** asks Pi to generate `dev/COMMIT/staged-branch-name.txt`, lets you confirm or edit the `type/feature-name` branch, then switches with `git switch -c` before committing. In PR mode, choose **Commit short**, **Commit long**, or type a message and use **Commit input**, then **Push and Create PR** pushes the branch, sends `/pr`, shows the generated `dev/PR/<branch>.md` description for editing/confirmation, and creates the pull request with `gh pr create`. Use **Manual branch** to skip agent branch-name generation and type the branch directly.

Use the workflow process buttons to jump directly to **Stage**, **Message**, **Commit**, or **Push** when earlier work was already completed manually. Selecting **Message** lets you either run `/git-staged-msg` or type a commit message and use **Commit input** directly. Selecting **Commit** loads the current generated files from `dev/COMMIT/` before enabling the commit choices. A yellow dot means that process was selected or is available but its action has not completed in this workflow; green means the process action completed.

This requires `/git-staged-msg` and `/pr` from `@firstpick/pi-prompts-git-pr`; branch-name generation uses `/git-branch-name` when available and otherwise sends an equivalent inline prompt. Creating the PR also requires an authenticated GitHub CLI (`gh`). Review the generated commit message, branch name, and PR description before committing, pushing, or creating a PR.

## Mobile and PWA notes

- The mobile composer starts as a compact `Ask Pi…` input and grows as you type.
- Installable PWA support, blocked-tab browser notifications, and optional agent-done notifications require browser service-worker/notification support and usually require `localhost` or HTTPS.
- Plain `http://<LAN-IP>` can show the app, but some browsers disable PWA install and notifications there.

## Network safety

- Default bind is localhost-only: `127.0.0.1:31415`.
- When `@firstpick/pi-package-remote-webui` is loaded and enabled, the side-panel **Remote WebUI** controls dispatch through `/remote`: opening rebinds the server to `0.0.0.0`, shows LAN URLs when available, and toggles to "Close for network".
- The optional **Remote PIN auth** toggle is off by default on first use. When enabled through `/remote auth on` or the Remote WebUI controls, the server saves that preference, generates a fresh random 4-digit PIN for each server start, shows it in the Remote WebUI controls and `/webui-status`, and requires it from non-local browser clients.
- Localhost clients stay frictionless and can toggle Remote PIN auth through the remote companion; changing the toggle persists the preference and disconnects existing event streams so remote clients must re-authenticate after enablement.
- `--host 0.0.0.0` also exposes the Web UI to the local network; pass `--remote-auth` to start with PIN auth already enabled.
- Any connected browser client with access (and the PIN, if enabled) can control Pi and run Web UI bash actions as the Web UI process user.
- Remote PIN auth is a simple trusted-LAN HTTP gate, not hardened multi-user authentication; do not expose it to untrusted networks.
- The Web UI update endpoint is restricted to localhost, because it runs package update commands and restarts the server.
- Treat Pi Web UI as a local companion, not a hardened multi-user web service.

## Troubleshooting

- **`/webui-start` is missing:** restart Pi after installing the package.
- **Wrong port or existing server:** use `/webui-status detailed`, or start on another port with `/webui-start --port 31500`.
- **Optional feature is disabled or missing:** check the side panel, install the companion package if needed, then run `/reload` in the active Pi tab.
- **Remote browser asks for a PIN:** read it from the optional **Remote WebUI** side-panel controls, `/webui-status`, `/remote status`, or the local Web UI server log. Disable the toggle from localhost to remove the PIN gate.
- **PWA install or notifications are unavailable:** use `localhost` or HTTPS; browser support varies on LAN HTTP URLs.
