# @firstpick/pi-package-remote-webui

Mobile connection helper for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

This package adds a `/remote` slash command that reuses the existing `@firstpick/pi-package-webui` server/UI, opens it to a trusted local network, and shows a QR code in Pi so a phone can connect quickly.

> **Security:** Pi Web UI can control the Web UI/Pi session. Remote PIN authentication is off by default; enable it in Web UI **Controls → Network → Remote PIN auth** if you want a 4-digit PIN for non-local clients. Use `/remote` only on trusted local networks and close LAN access when done.

## Install

```bash
pi install npm:@firstpick/pi-package-remote-webui
```

Restart Pi after installation so the `/remote` command is loaded. The QR renderer (`qrcode-terminal`) is a runtime dependency of this Pi package and is installed with the package. For local checkout development, run `npm install` in this package directory instead of installing `qrcode-terminal` globally.

## Usage

```text
/remote
```

Default behavior:

1. Reuse a running Pi Web UI on `127.0.0.1:31415`, or start one for the current working directory.
2. Open the Web UI listener to the local network through the existing Web UI `/api/network/open` endpoint.
3. Show a terminal QR code, the LAN URL, and the current Remote PIN auth state.
4. Scan the QR code from your phone and use the normal Pi Web UI. If Remote PIN auth is enabled, enter the displayed 4-digit PIN on the phone.

## Commands

```text
/remote
/remote status
/remote refresh
/remote close
/remote --port 31500
/remote --name mobile
/remote --yes
```

| Command | Behavior |
|---|---|
| `/remote` | Start/reuse Web UI, confirm, open LAN access, and show QR plus Remote PIN auth state. |
| `/remote status` | Show Web UI online/network state, LAN URLs, and auth state. |
| `/remote refresh` | Re-read current LAN URL/auth state and redraw the QR widget. |
| `/remote close` | Close Web UI LAN exposure and clear the QR widget. |
| `/remote --port 31500` | Use another Web UI port. |
| `/remote --name mobile` | Name the initial Web UI tab when this package starts the server. |
| `/remote --yes` | Skip the LAN exposure confirmation. |

## Remote PIN auth

`/remote` does not enable Remote PIN auth by itself. Auth is intentionally controlled by the Web UI server:

- In the local Web UI, open **Controls → Network → Remote PIN auth**.
- Enabling it generates a random 4-digit PIN.
- Non-local browser clients must enter that PIN before reaching Web UI.
- Localhost clients can always use the UI and toggle the setting.

The `/remote` QR widget shows `Remote PIN auth: off` or `Remote PIN auth: on · PIN 1234` when the Web UI server reports it. You can also start Web UI with auth already enabled by using `pi-webui --remote-auth` or `/webui-start --remote-auth` from `@firstpick/pi-package-webui`.

## Caveat

This package does not mirror the exact live TUI conversation into the phone. It connects mobile to the existing Pi Web UI package, which starts/uses Pi RPC tabs with the same Pi installation, working directory, settings, packages, and session storage.

## Development

```bash
cd pi-package-remote-webui
npm test
npm run check
```

## Network safety

`/remote` intentionally uses `pi-package-webui`'s direct LAN mode instead of a reverse proxy, preserving Web UI's current localhost-vs-remote trust boundaries. Remote PIN auth remains an explicit Web UI Controls toggle and is a trusted-LAN convenience gate, not hardened multi-user authentication. Use `/remote close` when you are done.
