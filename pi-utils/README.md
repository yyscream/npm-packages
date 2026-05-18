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
- `estimateTokensFromText(text)`
- `estimatePromptInjectionTokens(systemPrompt)`
- `estimateInitialPromptInput(options)`
- `collectInitialPromptCalibration(sessionDir, maxSamples?)`
- `buildInitialPromptCalibrationRecord(args)`
- `appendInitialPromptCalibrationRecord(appendEntry, record)`
- `delay(ms)`
- `createExtensionWorkingIndicator(ctx, initialMessage, options?)`
- `withExtensionWorkingIndicator(ctx, initialMessage, run, options?)`
- `createLocalWikiEngine(config)`

`createExtensionWorkingIndicator` renders a reusable extension-owned spinner using `ctx.ui.setWidget` plus footer `setStatus`, so it works inside slash-command handlers where Pi's built-in model-streaming working row is not shown.

`createLocalWikiEngine` centralizes local documentation corpus handling for wiki-style extensions: file discovery, Markdown/HTML parsing, section/link extraction, cache freshness, query expansion, search ranking, snippets, page reads, focused extracts, related links, and status payloads.
