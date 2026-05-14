# pi-extension-utils

Shared helper utilities used by `@firstpick/pi-extension-*` packages.

## Exports

- `getAgentDir()`
- `envFlag(name, fallback?)`
- `resolvePathFromAgentDir(configuredPath)`
- `createExtensionWorkingIndicator(ctx, initialMessage, options?)`
- `withExtensionWorkingIndicator(ctx, initialMessage, run, options?)`

`createExtensionWorkingIndicator` renders a reusable extension-owned spinner using `ctx.ui.setWidget` plus footer `setStatus`, so it works inside slash-command handlers where Pi's built-in model-streaming working row is not shown.
