# Pi TUI vs Web UI Output Differences

_Last inspected: 2026-06-03_

This document captures the **current source-based differences** between Pi's native terminal UI (TUI) output and the browser-based Web UI in this repository. It is intended as a practical parity map for making Web UI output feel closer to the TUI.

## Scope

Compared code and docs:

- Web UI package: `pi-package-webui` (`@firstpick/pi-package-webui` v0.1.5)
  - Server/RPC bridge: `pi-package-webui/bin/pi-webui.mjs`
  - Browser renderer: `pi-package-webui/public/app.js`
  - Layout/CSS: `pi-package-webui/public/index.html`, `pi-package-webui/public/styles.css`
- Pi TUI implementation from installed `@earendil-works/pi-coding-agent` v0.78.0
  - TUI docs: `docs/tui.md`, `docs/extensions.md`, `docs/rpc.md`
  - Interactive mode: `dist/modes/interactive/interactive-mode.js`
  - Assistant renderer: `dist/modes/interactive/components/assistant-message.js`
  - Tool renderer: `dist/modes/interactive/components/tool-execution.js`
  - Footer renderer: `dist/modes/interactive/components/footer.js`
  - Custom messages: `dist/modes/interactive/components/custom-message.js`
  - Built-in tool renderers: `dist/core/tools/*.js`
- Companion extensions bundled by Web UI:
  - `pi-extension-todo-progress/index.ts`
  - `pi-extension-git-footer-status/index.ts`
  - `pi-extension-release-npm/index.ts`
  - `pi-extension-release-aur/index.ts`

This is a **source inspection** report, not a screenshot/UI test report.

---

## Executive summary

The Web UI already has broad functional coverage: browser chat, multiple isolated RPC tabs, live assistant text/thinking streaming, model/thinking controls, queue controls, extension dialogs, status/widgets, a Pi-style footer, optional release/todo widgets, Git workflow, and action feedback.

The biggest output differences come from one architectural fact:

> The TUI renders inside Pi's interactive runtime using `@earendil-works/pi-tui` components and tool/message renderer functions. The Web UI talks to `pi --mode rpc`, receives semantic JSON events/messages, and reimplements display in browser DOM/CSS.

Because of that, the Web UI **does not automatically get** TUI-only rendering features such as built-in tool `renderCall`/`renderResult`, extension `registerMessageRenderer`, extension `ctx.ui.custom()` components, custom footers/headers/editors, overlays, or TUI keybinding-driven expansion behavior.

Highest-impact gaps if the goal is “similar output”:

1. **Tool cards:** TUI has rich built-in and custom renderers; Web UI mostly shows raw tool-call JSON plus raw/collapsed tool results.
2. **Markdown/code/diff rendering:** TUI uses a Markdown component, syntax highlighting, compact previews, and diffs; Web UI currently renders most text as `<pre>` blocks.
3. **Live tool progress:** TUI displays `tool_execution_update` output in the tool component; Web UI currently handles `tool_execution_start`/`tool_execution_end`, but not `tool_execution_update` as transcript output.
4. **Extension UI parity:** TUI supports full custom components, overlays, widgets as components, custom footer/header/editor, working indicators, custom message renderers; RPC/Web UI only supports a subset.
5. **Footer/status parity:** Web UI approximates a Pi-style footer independently. It cannot render the TUI custom footer from `git-footer-status` because `setFooter()` is a no-op in RPC mode.
6. **Startup/resources display:** TUI shows loaded context, skills, prompts, extensions, themes, diagnostics, and key hints. Web UI mostly shows commands/optional features in the side panel instead.

---

## Architecture map

### Native TUI path

The TUI runs `InteractiveMode` directly in the Pi process:

```text
InteractiveMode
  ├─ TUI + ProcessTerminal
  ├─ chatContainer / statusContainer / widget containers / editor / footer
  ├─ AssistantMessageComponent
  ├─ ToolExecutionComponent
  ├─ CustomMessageComponent
  ├─ built-in tool renderers from createAllToolDefinitions(cwd)
  └─ extension UI context backed by pi-tui components
```

Important implementation files:

- `dist/modes/interactive/interactive-mode.js`
  - owns event handling and component tree updates
  - handles `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `agent_*`, `queue_update`, `compaction_*`, `auto_retry_*`
- `dist/modes/interactive/components/assistant-message.js`
  - renders assistant text/thinking as Markdown/italic thinking blocks
- `dist/modes/interactive/components/tool-execution.js`
  - creates tool rows with pending/success/error background shells
  - calls tool `renderCall` and `renderResult`
  - pairs assistant tool calls with matching tool results
- `dist/core/tools/*.js`
  - built-in renderers for `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`

### Web UI path

The Web UI runs a local HTTP/SSE server that starts one or more isolated RPC Pi subprocesses:

```text
Browser DOM/CSS
  ⇅ HTTP + SSE
pi-webui.mjs
  ⇅ JSONL over stdin/stdout
pi --mode rpc
```

Important implementation files:

- `pi-package-webui/bin/pi-webui.mjs`
  - starts `pi --mode rpc`
  - reads Pi stdout as strict LF-delimited JSONL
  - proxies browser actions to RPC commands
  - sends Pi events to browser via SSE
  - tracks tab activity and pending extension UI requests
- `pi-package-webui/public/app.js`
  - renders browser transcript and side panel
  - handles selected RPC/SSE events
  - fetches full messages through `/api/messages` → RPC `get_messages`
  - decomposes assistant messages into separate thinking/tool-call/final-output cards
  - implements Web UI-specific widgets/footer/dialogs

---

## Current feature parity at a glance

| Area | TUI | Web UI | Current parity |
|---|---|---|---|
| User/assistant chat | Direct pi-tui components | DOM cards from RPC messages | Partial |
| Assistant streaming text | Live TUI component updates | Live browser stream bubble | Good, but plain text |
| Thinking stream | Inline/Markdown, hide toggle | Separate thinking card/bubble | Partial |
| Tool calls/results | Rich paired tool components | Tool-call JSON + tool-result cards after refresh | Low/partial |
| Live tool output | Handles `tool_execution_update` | Not rendered as transcript output currently | Low |
| Built-in tool renderers | Full `renderCall`/`renderResult` | Not reused | Low |
| Custom tool renderers | Supported | Not supported over RPC | Low |
| Custom message renderers | Supported | Not supported | Low |
| Extension dialogs | Native TUI components | Browser modal bridge | Good for basic dialogs |
| Extension custom components/overlays | Supported | Not supported (`custom()` degrades in RPC) | None |
| Widgets | Above/below editor; strings or components | One browser widget area; strings only; known special widgets | Partial |
| Footer | Built-in or extension-replaced component | Hard-coded browser footer | Partial |
| Header/startup resources | Rich startup resource display | Mostly absent/side-panel only | Low |
| Commands | Built-ins + ext/prompts/skills | RPC commands + Web UI-native emulation for some built-ins | Partial |
| Keybindings | Full terminal keybinding system | Browser controls; no extension shortcuts bridge | Low |
| Themes | TUI theme objects + ANSI | Browser CSS variables from optional theme bundle | Partial |
| Images | TUI image components when terminal supports | Browser `<img>` data URI display | Different but browser-friendly |
| Queue | Inline pending-message UI | Side panel queue + busy behavior selector | Partial |
| Compaction/retry | Loaders, cancel hints, retry countdown | Run indicator/compact button; no explicit retry UI | Partial |

---

## Detailed differences

### 1. Startup/header/resource output

#### TUI behavior

At startup, the TUI prints/renders:

- Pi version/logo and keybinding hints.
- Loaded `AGENTS.md`/context files.
- Loaded skills.
- Loaded prompt templates.
- Loaded extensions.
- Loaded themes.
- Resource diagnostics/collisions.
- Changelog/update notices when applicable.

Implementation: `InteractiveMode.showLoadedResources()` and startup header setup in `dist/modes/interactive/interactive-mode.js`.

#### Web UI behavior

The Web UI has a browser tab bar, side panel, status line, commands list, optional features list, event log, and footer. It does **not** reproduce the TUI startup transcript/header/resource listing.

It does expose some resource-derived state indirectly:

- Commands from `/api/commands`, backed by RPC `get_commands` plus Web UI-native command entries.
- Optional feature detection from known commands/widgets/status events.
- Theme picker from `/api/themes` when `@firstpick/pi-themes-bundle` is available.

#### Difference

The TUI gives immediate startup context about what Pi loaded. The Web UI focuses on controls and current state. If the goal is visual/output parity, a “Startup resources” card or side-panel section would be needed.

---

### 2. Assistant message rendering

#### TUI behavior

`AssistantMessageComponent` renders assistant content as:

- Markdown with the Pi markdown theme.
- Thinking content inline, italic, and theme-colored.
- Optional hidden thinking label when thinking is toggled hidden.
- Ordered text/thinking content from the assistant message.
- OSC 133 shell integration markers for non-tool-call assistant output.

Implementation: `dist/modes/interactive/components/assistant-message.js`.

#### Web UI behavior

`public/app.js` renders final assistant messages through `assistantDisplayMessages()` and `appendTranscriptMessage()`:

- Assistant messages are decomposed into separate display messages:
  - `role: "thinking"`
  - `role: "toolCall"`
  - `role: "assistantEvent"`
  - final `role: "assistant"`
- Most textual content is rendered with `appendText()` into `<pre>`-style blocks.
- Thinking is a separate card or streaming bubble.
- Final output parts are collected only when there is no later tool call after that content part.
- During streaming, text may be delayed briefly and suppressed before a tool call to avoid transient tool/checklist-looking text.

Relevant functions:

- `renderContent()`
- `assistantDisplayMessages()`
- `appendMessage()`
- `appendTranscriptMessage()`
- `handleMessageUpdate()`

#### Difference

The TUI presents assistant output as themed Markdown within Pi's component tree. The Web UI presents a browser transcript of semantic cards, mostly plain text/preformatted output.

Main output gaps:

- No full Markdown rendering parity in Web UI.
- No TUI markdown theme/syntax highlighting for normal assistant text.
- Thinking appears as separate cards instead of inline themed blocks.
- No TUI hidden-thinking toggle equivalent.
- No OSC 133 markers, which are terminal-specific and probably not relevant in the browser.

---

### 3. Thinking output

#### TUI behavior

- Thinking can be shown or hidden via `Ctrl+T` / configured keybinding.
- Hidden thinking becomes a label like `Thinking...`.
- `ctx.ui.setHiddenThinkingLabel()` can customize the hidden label.
- Thinking is rendered through Markdown with thinking color + italic styling.

#### Web UI behavior

- Web UI streams thinking into `streamThinkingBubble`.
- Final thinking appears as a separate `role: "thinking"` message/card.
- There is no direct hide/expand thinking toggle mirroring TUI behavior.
- It does not consume TUI's `setHiddenThinkingLabel()` behavior as a visual mode because RPC/Web UI only receives semantic events/messages.

#### Difference

Web UI has good raw thinking visibility when providers expose thinking, but different presentation and controls.

Parity improvements:

- Add a Web UI setting: “show/hide thinking blocks”.
- Preserve hidden state in local storage.
- When hidden, render a compact `Thinking...` card or inline label.
- Optionally render thinking as collapsible `<details>` by default.

---

### 4. Tool rendering: largest output gap

This is the biggest practical difference.

#### TUI behavior

The TUI creates a `ToolExecutionComponent` for each tool call. It:

- Renders the tool call while arguments stream.
- Updates the same component when execution starts.
- Renders partial results from `tool_execution_update`.
- Renders final results from `tool_execution_end`.
- Uses pending/success/error backgrounds.
- Uses built-in tool renderers or extension tool renderers.
- Supports custom `renderShell: "self"` for tools such as `edit`.
- Shows images through terminal image capabilities when possible.
- Pairs a `toolCall` and its matching `toolResult` into one visual row.

Implementation: `dist/modes/interactive/components/tool-execution.js`.

#### Web UI behavior

The Web UI receives the same RPC event stream, but current transcript rendering is much simpler:

- `tool_execution_start` updates the run indicator and adds an event-log entry.
- `tool_execution_end` updates the run indicator, adds an event-log entry, and schedules message refresh.
- `tool_execution_update` is not currently rendered into the transcript.
- Final transcript rehydration via `/api/messages` renders:
  - assistant tool-call parts as separate `toolCall` cards with JSON arguments
  - tool results as separate collapsible `toolResult` cards with raw content
- No shared TUI `renderCall`/`renderResult` functions are invoked in the browser.

Relevant Web UI functions:

- `handleEvent()` handles `tool_execution_start` and `tool_execution_end`.
- `appendMessage()` renders `toolCall` and `toolResult` messages.
- `toolResultPreviewText()` creates a generic preview for collapsed tool results.

#### Built-in tool renderer differences

| Tool | TUI output | Web UI output today |
|---|---|---|
| `read` | Compact path/resource/skill/docs labels; optional line range; syntax-highlighted preview when expanded; image handling | Tool-call JSON and raw/collapsed text result |
| `bash` | `$ command` header; live partial output; elapsed/took time; tail preview in collapsed mode; truncation/full-output warnings | Event log says tool started/finished; final raw tool result after refresh; no live partial transcript output |
| `edit` | Pre-execution diff preview once args complete; success/error-colored diff shell; final diff reconciliation | JSON args and raw success/error result; no diff preview unless raw content happens to include it |
| `write` | Path header plus syntax-highlighted content preview; compact collapsed view; errors in result | JSON args and raw result |
| `grep` | Compact `/pattern/ in path`; limited preview; truncation warnings | JSON args and raw/collapsed result |
| `find` | Compact pattern/path; limited preview; truncation warnings | JSON args and raw/collapsed result |
| `ls` | Compact path; limited preview; truncation warnings | JSON args and raw/collapsed result |

#### Custom tool renderer differences

TUI supports extension-defined:

- `renderCall(args, theme, context)`
- `renderResult(result, options, theme, context)`
- `renderShell: "self"`

Web UI does not receive or execute those renderer functions. RPC emits semantic data, not component instances or render callbacks.

#### Required for parity

To make Web UI tools look like TUI output, one of these approaches is needed:

1. **Browser-side renderer registry:** implement Web UI renderers for each built-in tool and known companion tools, using RPC message data and `details`.
2. **Shared neutral render descriptors:** add/introduce a shared render-model layer where Pi/tool renderers return serializable blocks that both TUI and Web UI can render.
3. **ANSI-to-HTML TUI snapshot:** render TUI components to ANSI lines server-side and convert to HTML. This might help visually, but it is brittle for width, interactivity, widgets, dialogs, images, and browser responsiveness.

Most practical near-term path: implement a Web UI renderer registry for built-in tools first.

---

### 5. Live tool progress and partial output

#### TUI behavior

`InteractiveMode` explicitly handles `tool_execution_update`:

- Finds the existing `ToolExecutionComponent` by `toolCallId`.
- Calls `component.updateResult({ ...event.partialResult, isError: false }, true)`.
- Re-renders the TUI.

This is why long-running `bash` output can appear live in the TUI.

#### Web UI behavior

`handleEvent()` does not currently have a `tool_execution_update` case. It handles `tool_execution_start` and `tool_execution_end`, but partial output is not displayed as a live transcript card.

The release workflow widgets are an exception because the release extensions send string widgets (`setWidget`) that the Web UI special-cases. That is not generic tool-progress parity.

#### Difference

Generic live tool progress is missing in Web UI. This is very visible for `bash`, long-running custom tools, and tools that emit incremental updates.

Recommended Web UI behavior:

- Maintain a `toolRuns` map keyed by `toolCallId`.
- On `tool_execution_start`, create/update a live tool card.
- On `tool_execution_update`, replace the accumulated partial output in that card.
- On `tool_execution_end`, mark success/error and keep the final card.
- Reconcile with `/api/messages` final history to avoid duplicates.

---

### 6. Tool/result alignment

#### TUI behavior

During session render/rebuild, the TUI walks session context and:

- Adds assistant message text.
- Creates a `ToolExecutionComponent` for each assistant `toolCall`.
- Stores pending components by `toolCallId`.
- When a matching `toolResult` appears, updates that same component.

So the user sees tool call + result as one action row.

#### Web UI behavior

The Web UI decomposes assistant content into separate `toolCall` cards and renders `toolResult` messages separately. There is no single paired action row for generic tools.

#### Difference

The Web UI transcript feels more like an event log/raw RPC transcript. The TUI feels like a structured action timeline.

Parity improvement:

- During `renderAllMessages()`, build a map of assistant tool calls and matching `toolResult` messages.
- Render a single tool/action card per `toolCallId`.
- Hide or collapse the raw separate `toolResult` card once paired.

---

### 7. Markdown, code, syntax highlighting, and diffs

#### TUI behavior

The TUI uses Pi's `Markdown` component and tool-specific syntax/diff renderers:

- Assistant text is Markdown.
- Read/write previews can be syntax-highlighted by file extension.
- Edit previews use `renderDiff()`.
- Markdown themes are derived from the active TUI theme.

#### Web UI behavior

The Web UI primarily uses:

- `<pre>` blocks via `appendText()`.
- JSON pretty-printing for unknown/non-text objects.
- CSS classes for card styling.
- Some ANSI stripping/rendering in dialogs/widgets.
- Specialized release widgets with line tone classes.

It does not currently have equivalent Markdown rendering or built-in diff rendering for generic assistant/tool output.

#### Difference

Even when the same content is present, it often looks much less structured in Web UI.

Parity improvement:

- Add a safe Markdown renderer for assistant text and custom text blocks.
- Add syntax highlighting for code fences and known file previews.
- Add a Web UI diff renderer for `edit` tool `details.diff` / `details.patch`.
- Preserve plain `<pre>` fallback for logs and raw tool output.

---

### 8. Custom messages and custom message renderers

#### TUI behavior

Extensions can call:

```ts
pi.registerMessageRenderer(customType, renderer)
pi.sendMessage({ customType, content, display: true, details })
```

The TUI uses `CustomMessageComponent`, which calls the registered renderer if available. If no renderer is available, it falls back to a styled custom-message box.

#### Web UI behavior

RPC `get_messages` can expose custom messages as message objects, but Web UI rendering does not call extension `registerMessageRenderer()` and cannot execute pi-tui component renderers in the browser.

Web UI can still show generic message content, and it creates its own transient `role: "extension"` cards for extension `notify` requests, but custom renderer parity is absent.

#### Difference

Any extension relying on custom TUI message renderers will not look the same in Web UI.

Parity options:

- Support a Web UI-specific serializable `details.webui` convention for custom messages.
- Add a browser renderer registry keyed by `customType` for known packages.
- Longer-term: formalize serializable message render descriptors in Pi RPC.

---

### 9. Extension UI support

Pi docs explicitly describe different mode behavior:

- Interactive mode: full TUI.
- RPC mode: JSON protocol; host handles UI.
- Some TUI-specific methods are unsupported/degraded in RPC.

#### Supported in Web UI via RPC extension UI protocol

The Web UI implements these extension UI requests:

- `notify`
- `setStatus`
- `setWidget`
- `setTitle`
- `set_editor_text`
- `select`
- `confirm`
- `input`
- `editor`

Browser behavior:

- Dialog methods become browser modal dialogs.
- Blocking requests are queued and replayed to reconnecting clients.
- Tabs show blocked/working/done indicators.
- Notifications become event-log entries and transient transcript cards.

Relevant Web UI functions:

- Server: `trackPendingExtensionUiRequest()`, `replayPendingExtensionUiRequests()`, `/api/extension-ui-response`
- Browser: `handleExtensionUiRequest()`, `showNextDialog()`, `sendDialogResponse()`

#### Not supported / degraded in RPC-Web UI

Per Pi RPC docs, these do not behave like TUI:

- `ctx.ui.custom()` returns `undefined`.
- `setWorkingMessage()` is no-op in RPC mode.
- `setWorkingIndicator()` is no-op in RPC mode.
- `setFooter()` is no-op in RPC mode.
- `setHeader()` is no-op in RPC mode.
- `setEditorComponent()` is no-op in RPC mode.
- `setToolsExpanded()` is no-op in RPC mode.
- `getEditorText()` returns `""` in RPC mode.
- `getToolsExpanded()` returns `false` in RPC mode.
- `getAllThemes()` returns `[]` in RPC mode.
- `getTheme()` returns `undefined` in RPC mode.
- `setTheme()` returns failure in RPC mode.
- Widget component factories are ignored; only string arrays are supported.

#### Difference

The Web UI's extension bridge is good for dialogs and string widgets, but it is not a general TUI component renderer.

---

### 10. Widgets

#### TUI behavior

TUI widgets:

- Can be placed `aboveEditor` or `belowEditor`.
- Can be string arrays or component factories.
- Render inside the TUI component tree.
- String-array widgets are capped by `InteractiveMode.MAX_WIDGET_LINES = 10`.
- Component widgets can style with current TUI theme.

#### Web UI behavior

Web UI widgets:

- Are received through RPC `extension_ui_request` method `setWidget`.
- Are stored in a `widgets` map.
- Render into one browser `#widgetArea`, located above the chat transcript.
- Generic widgets strip ANSI and render plain text.
- Known widget keys get special renderers:
  - `todo-progress`
  - `release-npm:output`
  - `release-npm:logs`
  - `release-aur:output`
  - `release-aur:logs`
- Optional feature toggles can hide specialized widgets.

Relevant Web UI functions:

- `renderWidgets()`
- `renderTodoProgressWidget()`
- `renderReleaseNpmOutputWidget()`
- `renderReleaseAurOutputWidget()`

#### Difference

The Web UI supports widget content but not TUI component widgets or exact placement. `aboveEditor`/`belowEditor` does not map directly to the TUI layout; Web UI puts widgets in the top widget area.

#### Todo-progress exception

The `todo-progress` extension is relatively well-supported:

- Extension emits a string widget with key `todo-progress`.
- Web UI detects and renders it as a styled checklist card.
- Web UI also strips visible checklist lines from streaming assistant text when the optional feature is enabled, matching the extension's intent.

Remaining differences:

- TUI widget is an editor-adjacent live helper.
- Web UI widget sits above the transcript.
- TUI uses ANSI/theme strings directly; Web UI parses/strips ANSI and restyles with CSS.

---

### 11. Footer/status output

#### TUI behavior

The default TUI footer shows:

- cwd and git branch
- session name
- cumulative token/cache/cost stats
- context usage
- model and thinking level
- extension statuses

Extensions can replace it completely via `ctx.ui.setFooter()`.

The bundled `git-footer-status` extension does replace the TUI footer with a richer custom footer containing:

- token/cache sections
- estimated Pi prompt/context tokens
- live/historical token speed
- cost/subscription marker
- context usage colorization
- model/thinking
- cwd + branch/status details
- git status extras

#### Web UI behavior

The Web UI has its own hard-coded browser footer in `renderFooter()`:

- input/output tokens
- cache read/write
- estimated Pi tokens
- speed
- cost
- context usage
- cwd picker
- git branch and change counts from `/api/workspace`
- runtime
- model and thinking level
- scoped model picker

Extension `setStatus()` values are shown in the side-panel session line, not as arbitrary custom footer components.

Because RPC mode makes `setFooter()` a no-op, Web UI does not render the `git-footer-status` extension's custom footer. It independently approximates some of the same information.

#### Difference

The Web UI footer is similar in spirit but not the same component or data path. It will not automatically match future custom footer changes from TUI extensions.

Parity improvement:

- Decide whether Web UI footer should continue as a browser-native implementation or consume a serializable footer descriptor from extensions.
- If browser-native, copy the desired fields/layout from `git-footer-status` into `renderFooter()`.
- Move selected `setStatus()` entries into footer meta if they are meant to appear footer-like.

---

### 12. Status and working indicators

#### TUI behavior

TUI has:

- A working loader in `statusContainer`.
- Extension control via `setWorkingMessage()`, `setWorkingVisible()`, and `setWorkingIndicator()`.
- Terminal progress indicator support when enabled.
- Compaction and retry loaders.

#### Web UI behavior

Web UI has:

- A run-indicator transcript card.
- Tab activity indicators.
- Browser notifications for blocked/done tabs.
- Side-panel status line.
- Event log entries.

Current event handling includes:

- `agent_start` / `agent_end`
- `message_start` / `message_update` / `message_end`
- `tool_execution_start` / `tool_execution_end`
- `compaction_start` / `compaction_end`
- `queue_update`
- `extension_ui_request`

Current event handling does **not** explicitly render:

- `tool_execution_update`
- `turn_start`
- `turn_end`
- `auto_retry_start`
- `auto_retry_end`
- `extension_error`

#### Difference

Web UI has a good browser-native notion of “the agent is running”, but it is not the same as TUI's spinner/loader/working indicator system, and some RPC events are ignored for output purposes.

---

### 13. Queue output

#### TUI behavior

The TUI displays queued steering/follow-up messages in a pending-message area and supports keybindings for retrieving queued messages.

#### Web UI behavior

The Web UI displays queues in the side panel via `renderQueue()`. It also has explicit `Steer`, `Follow-up`, and busy-prompt behavior controls.

#### Difference

Functionality is present, but layout and interaction model differ.

---

### 14. Commands and slash output

#### TUI behavior

The TUI has built-in interactive commands (`/settings`, `/model`, `/tree`, `/fork`, `/resume`, etc.) plus extension commands, prompt templates, and skills.

#### RPC/Web UI behavior

Pi RPC `get_commands` does not include built-in TUI commands. The Web UI works around this by adding `NATIVE_SLASH_COMMANDS` in `pi-webui.mjs` and implementing a subset as native Web UI behavior.

Current `NATIVE_SLASH_COMMANDS` entries include:

- `settings`
- `model`
- `scoped-models`
- `export`
- `import`
- `share`
- `copy`
- `name`
- `session`
- `changelog`
- `hotkeys`
- `fork`
- `clone`
- `tree`
- `login`
- `logout`
- `new`
- `compact`
- `resume`
- `reload`
- `quit`

But `handleNativeSlashCommand()` currently implements only some of them directly (not the full native TUI feature set).

#### Difference

The command list may show TUI-like native commands, but not all have equivalent browser UI behavior yet.

---

### 15. Autocomplete and editor behavior

#### TUI behavior

TUI editor supports:

- Slash command autocomplete.
- `@` file reference fuzzy search.
- Path completion.
- Multiline shortcuts.
- Image paste/drag into terminal.
- External editor.
- Extension autocomplete providers.
- Custom editor replacement via `setEditorComponent()`.
- Modal editor examples (vim-like).

#### Web UI behavior

Web UI composer supports:

- Slash-command suggestions from `/api/commands`.
- `@` file/path suggestions through `/api/path-suggestions`.
- Browser textarea behavior with mobile-specific handling.
- Buttons for prompt/steer/follow-up/new/compact/Git/publish.

It does not support TUI custom editor components, terminal keybindings, or extension autocomplete providers.

#### Difference

The Web UI composer is browser-native, not a port of the TUI editor.

---

### 16. Images

#### TUI behavior

TUI uses `Image` components when the terminal supports images (Kitty/iTerm2/Ghostty/WezTerm). It may convert non-PNG images for Kitty.

#### Web UI behavior

Web UI uses `<img>` elements with data URIs from image content blocks.

#### Difference

This is intentionally different. Browser image rendering is likely better for Web UI, but it will not match terminal image sizing/capability fallback behavior.

---

### 17. Compaction and retry output

#### TUI behavior

TUI shows:

- Compaction loader with cancel hint.
- Auto-compaction status.
- Compaction summary component.
- Auto-retry countdown loader with cancel behavior.
- Error display on final retry failure.

#### Web UI behavior

Web UI shows:

- Compact button state.
- Run indicator text for compaction.
- Event log entries for compaction start/end.
- Message refresh after compaction.

It does not currently render explicit `auto_retry_start` / `auto_retry_end` UI.

#### Difference

Compaction is visible but not identical. Retry visibility is lower than in TUI.

---

### 18. Session tree/fork/resume output

#### TUI behavior

TUI has rich selector components for:

- `/tree`
- `/fork`
- `/resume`
- `/model`
- `/settings`
- `/theme`
- `/login`

#### Web UI behavior

Web UI has its own terminal tabs and some native slash command emulation. It does not yet reproduce all selector UIs.

#### Difference

Session navigation output/controls are structurally different.

---

### 19. Security/network presentation

#### TUI behavior

TUI runs locally in the terminal; no browser server is exposed.

#### Web UI behavior

Web UI runs an unauthenticated local server. It binds to `127.0.0.1` by default, with controls to open to the LAN.

This is a Web UI feature, not a TUI parity item, but it affects output: Web UI displays network status and warnings that do not exist in TUI.

---

## Event handling comparison

### Events TUI explicitly uses for output

From `InteractiveMode.handleAgentEvent()`:

- `agent_start`
- `agent_end`
- `queue_update`
- `session_info_changed`
- `thinking_level_changed`
- `message_start`
- `message_update`
- `message_end`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`
- `compaction_start`
- `compaction_end`
- `auto_retry_start`
- `auto_retry_end`

### Events Web UI explicitly uses for output

From `public/app.js#handleEvent()`:

- Web UI server events:
  - `webui_connected`
  - `webui_tab_renamed`
  - `webui_tab_restarting`
  - `webui_tab_reloading`
  - `webui_tab_reloaded`
  - `webui_extension_ui_cancelled`
  - `webui_cwd_changed`
  - `webui_network_rebinding`
- Pi process events:
  - `pi_process_start`
  - `pi_process_exit`
  - `pi_process_error`
  - `pi_stderr`
- Pi RPC/agent events:
  - `queue_update`
  - `agent_start`
  - `agent_end`
  - `message_start`
  - `message_update`
  - `message_end`
  - `tool_execution_start`
  - `tool_execution_end`
  - `compaction_start`
  - `compaction_end`
  - `extension_ui_request`
  - `response`

### Explicit gaps

Web UI currently does not have output handling for:

- `tool_execution_update`
- `turn_start`
- `turn_end`
- `auto_retry_start`
- `auto_retry_end`
- `extension_error`

---

## Root causes of the differences

### 1. TUI renderers are functions/components, not serializable data

Tool renderers and custom message renderers return `Component` instances. The RPC stream cannot ship those to a browser.

### 2. RPC mode intentionally degrades TUI-only UI APIs

Pi docs state that in RPC mode:

- `custom()` returns `undefined`.
- Custom footer/header/editor/working indicator APIs are no-ops.
- Widgets are string arrays only.
- Theme APIs do not provide TUI theme resources through RPC.

### 3. Web UI uses polling/reconciliation in addition to events

The Web UI often schedules `/api/messages`, `/api/state`, and `/api/stats` refreshes after lifecycle events. This is robust, but it means the display may update after short delays and may not preserve the same live component lifecycle as TUI.

### 4. Browser layout has different constraints

A browser can do things the TUI cannot (tabs, PWA, mouse UI, responsive layout, images), but it cannot directly use terminal width, ANSI SGR, OSC zones, hardware cursor, or pi-tui component focus semantics.

---

## Recommended parity roadmap

### Phase 1 — Handle missing events

High value, low/medium complexity.

- Add `tool_execution_update` handling in `public/app.js`.
- Maintain live tool cards keyed by `toolCallId`.
- Add explicit `auto_retry_start` / `auto_retry_end` UI.
- Add `extension_error` display as a visible warning/error card.
- Optionally show `turn_start` / `turn_end` in debug/event log.

Expected improvement: Web UI will feel much more alive during long-running commands/tools.

### Phase 2 — Pair tool calls and results

High value, medium complexity.

- In `orderedTranscriptItems()` / `renderAllMessages()`, build a tool-call/result relationship map.
- Render paired tool action cards instead of separate raw `toolCall` + `toolResult` cards.
- Keep raw view available behind an “expand raw” details block.

Expected improvement: transcript structure will resemble TUI's action rows.

### Phase 3 — Implement built-in Web UI tool renderers

Highest visual impact.

Implement browser renderers for:

1. `bash`
   - command header
   - live partial output
   - elapsed/took time
   - tail preview
   - truncation/full-output path warnings
2. `read`
   - path + line range
   - compact resource/docs/skill labels
   - syntax-highlighted expanded preview
   - image preview
3. `edit`
   - diff preview from streamed args/details
   - success/error state
4. `write`
   - path + content preview
   - syntax highlighting
5. `grep` / `find` / `ls`
   - compact call headers
   - limited preview with expand hint
   - truncation warnings

Expected improvement: main tool output starts matching TUI closely.

### Phase 4 — Add Markdown/diff rendering

Medium/high value.

- Safe Markdown renderer for assistant messages.
- Code fence highlighting.
- Diff renderer for edit patches/diffs.
- Keep log-like output as `<pre>`.

Expected improvement: final assistant output and code-heavy content will look much closer to TUI.

### Phase 5 — Formalize Web UI extension render hooks

Medium/high complexity.

Possible API conventions:

- `details.webui` with serializable card descriptors.
- `customType` browser renderer registry for known extensions.
- `toolName` browser renderer registry.
- Optional package-provided browser render modules loaded only from trusted/local packages.

Expected improvement: custom extension output can be rich without attempting to execute pi-tui components in the browser.

### Phase 6 — Footer/status parity decision

Choose one:

1. **Browser-native footer remains canonical for Web UI**
   - Copy desired `git-footer-status` fields into Web UI.
   - Display selected `setStatus()` entries in footer meta.
2. **Serializable footer descriptor**
   - Extension can emit a footer descriptor through status/widget/custom RPC event.
   - Browser renders it with CSS.

Expected improvement: less drift between TUI custom footer and Web UI footer.

### Phase 7 — Startup/resources display

- Add a Web UI “Startup resources” card/side panel section.
- Show loaded context files, skills, prompts, extensions, themes, diagnostics.
- Source from RPC where available; otherwise add a Web UI server helper if needed.

Expected improvement: first-screen Web UI context resembles TUI startup output.

---

## Implementation notes and pitfalls

### Avoid executing extension UI code in the browser

TUI renderers are trusted local TypeScript running in the Pi process. Sending arbitrary renderer code to the browser would create a new security surface and does not fit the current local/no-auth Web UI model.

Prefer serializable data descriptors or Web UI-controlled renderer registries.

### Preserve RPC as the source of truth

The Web UI should continue to use RPC messages/events as canonical state. If it adds local live cards, reconcile them against `/api/messages` to avoid duplicates and stale output.

### Keep raw output available

Even with rich renderers, keep a raw JSON/text details view. This is useful for debugging renderer mismatches.

### Be careful with ANSI

The TUI uses ANSI heavily. Web UI should strip or parse ANSI deliberately. Generic text should avoid leaking raw escape sequences; specialized widgets can map ANSI/tone patterns to CSS classes.

### Respect optional feature toggles

The Web UI already lets users disable optional feature affordances locally. New renderers for optional packages should respect that mechanism.

### Handle disconnected/reconnected browsers

The server already tracks pending extension UI requests and replays them. Live tool-card state should similarly be reconstructible from current messages plus recent events, or safely discardable on refresh.

---

## Suggested concrete first patch set

If implementing parity now, start with this order:

1. Add `tool_execution_update` handling and live generic tool cards.
2. Pair final `toolCall` + `toolResult` transcript cards by `toolCallId`.
3. Add Web UI built-in renderer for `bash`.
4. Add Web UI built-in renderer for `edit` diffs.
5. Add Markdown renderer for assistant text.
6. Add Web UI settings/toggles for thinking visibility and tool expansion.
7. Add retry/extension-error event display.

This order gives the most visible improvement before touching harder extension-renderer API design.

---

## Quick verification checklist for future parity work

Use one test session in TUI and one in Web UI that exercises:

- Assistant Markdown with headings, lists, tables, code fences.
- Thinking output on a reasoning model.
- `bash` command with live multi-line output.
- `read` on a TypeScript/Markdown file.
- `edit` that creates a visible diff.
- `write` of a new code file.
- `grep`, `find`, and `ls` with enough output to collapse/expand.
- A long-running command that emits `tool_execution_update`.
- An extension `notify`, `setStatus`, `setWidget`, `select`, `confirm`, `input`, and `editor` request.
- `todo-progress` checklist output.
- `/release-npm` or `/release-aur` widget path if available.
- Manual compaction.
- Forced transient model/provider error if testing retry UI.

Suggested package check after Web UI code changes:

```bash
npm --prefix pi-package-webui run check
```

---

## Bottom line

The Web UI is already a capable RPC client, but it is not a TUI renderer. The current differences are mostly not bugs; they follow from the TUI using local `pi-tui` components while Web UI consumes RPC JSON.

For “similar output,” focus first on **browser-native reimplementations of the TUI's semantic renderers**:

1. live tool cards,
2. paired tool call/result cards,
3. built-in tool-specific renderers,
4. Markdown/diff rendering,
5. thinking/tool expansion controls,
6. richer event handling.

Those changes would close most user-visible parity gaps without requiring risky browser execution of TUI extension code.
