# pi-extension-utils

Shared helper utilities used by `@firstpick/pi-extension-*` packages.

## Exports

- `getAgentDir()`
- `getPiDir()`
- `getAgentEnvPath()`
- `getAgentSettingsPath()`
- `getWorkspaceEnvPath(cwd?)`
- `envFlag(name, fallback?)`
- `resolvePathFromAgentDir(configuredPath)`
- `parseEnvFile(filePath)`
- `readEnvValue(filePath, key)`
- `resolveEnvValue(key, options?)`
- `quoteEnvValue(value)`
- `upsertEnvValue(filePath, key, value)`
- `slugify(input, options?)`
- `formatTokens(count)`
- `estimateTokensFromCharCount(charCount)`
- `estimatePromptInjectionTokens(systemPrompt)`
- `delay(ms)`
- `createExtensionWorkingIndicator(ctx, initialMessage, options?)`
- `withExtensionWorkingIndicator(ctx, initialMessage, run, options?)`

`createExtensionWorkingIndicator` renders a reusable extension-owned spinner using `ctx.ui.setWidget` plus footer `setStatus`, so it works inside slash-command handlers where Pi's built-in model-streaming working row is not shown.
