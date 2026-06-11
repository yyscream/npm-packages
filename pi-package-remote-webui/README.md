# @firstpick/pi-package-remote-webui

Mobile connection helper for [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

This package adds a `/remote` slash command that reuses the existing `@firstpick/pi-package-webui` server/UI, opens it to a trusted local network, and shows a QR code in Pi so a phone can connect quickly.

> **Security:** Pi Web UI has no authentication. Anyone who can reach the LAN URL can control the Web UI and run actions allowed by that Web UI/Pi session. Use `/remote` only on trusted local networks and close LAN access when done.

## Install

```bash
pi install npm:@firstpick/pi-package-remote-webui
```

Restart Pi after installation so the `/remote` command is loaded.

## Usage

```text
/remote
```

Default behavior:

1. Reuse a running Pi Web UI on `127.0.0.1:31415`, or start one for the current working directory.
2. Open the Web UI listener to the local network through the existing Web UI `/api/network/open` endpoint.
3. Show a terminal QR code and the LAN URL.
4. Scan the QR code from your phone and use the normal Pi Web UI.

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
| `/remote` | Start/reuse Web UI, confirm, open LAN access, and show QR. |
| `/remote status` | Show Web UI online/network state and LAN URLs. |
| `/remote refresh` | Re-read current LAN URL and redraw the QR widget. |
| `/remote close` | Close Web UI LAN exposure and clear the QR widget. |
| `/remote --port 31500` | Use another Web UI port. |
| `/remote --name mobile` | Name the initial Web UI tab when this package starts the server. |
| `/remote --yes` | Skip the LAN exposure confirmation. |

## Caveat

This package does not mirror the exact live TUI conversation into the phone. It connects mobile to the existing Pi Web UI package, which starts/uses Pi RPC tabs with the same Pi installation, working directory, settings, packages, and session storage.

## Development

```bash
cd pi-package-remote-webui
npm test
npm run check
```

## Network safety

`/remote` intentionally uses `pi-package-webui`'s direct LAN mode instead of a reverse proxy, preserving Web UI's current localhost-vs-remote trust boundaries. Use `/remote close` when you are done.
