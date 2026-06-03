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

## Implementation progress

_Last implementation update: 2026-06-03_

Implemented in `public/app.js` / `public/styles.css` and covered by `tests/mobile-static.test.mjs`:

- [x] Generic live tool cards for `tool_execution_start`, `tool_execution_update`, and `tool_execution_end`.
- [x] Paired assistant tool-call parts with matching `toolResult` messages by `toolCallId`, hiding paired raw result rows.
- [x] Browser-side built-in tool renderer registry for `bash`, `read`, `write`, `edit`, `grep`, `find`, and `ls`.
- [x] TUI-like `bash` output previews, tool metadata pills, tool state styling, and `edit` diff rendering.
- [x] Transcript-visible `auto_retry_start`, `auto_retry_end`, and `extension_error` event cards.
- [x] Safe browser-native Markdown rendering for assistant output, including headings, lists, code fences, links, blockquotes, and tables.
- [x] Thinking output show/hide toggle with persisted local preference.
- [x] Tool renderer polish: consistent status/elapsed metadata and safe raw tool-data expanders.
- [x] Hidden redundant assistant final-output headers.
- [x] Browser-native native slash selector dialogs for `/model`, `/settings`, `/theme`, `/fork`, `/clone`, `/resume`, `/tree`, and `/scoped-models`.
- [x] Session-selector backend helpers for fork points, session lists, session trees, session switching, clone/fork, and Web UI-assisted tree navigation.

Still open / intentionally deferred:

- [ ] Syntax highlighting for code fences and file previews.
- [ ] Credential-entry parity for `/login` / `/logout` remains intentionally deferred; Web UI currently shows non-secret guidance instead of accepting or storing API keys.
- [ ] Formal serializable extension/custom renderer descriptors.
- [ ] Footer/status, startup resources, and full custom TUI component parity.

### Next possible implementations

Recommended next work, ordered by low-risk/high-value first:

1. **Syntax highlighting for code fences and tool/file previews** — add a browser-side highlighter or small tokenizer while preserving plain-text fallback.
2. **Tool expansion controls** — persisted defaults for collapsed/expanded tools, raw details, and thinking/tool sections.
3. **Read/write renderer polish** — better file labels, image/file previews, truncation summaries, and copied TUI preview limits.
4. **Compaction/retry status polish** — closer TUI-like countdown/cancel hints, compaction summary display, and retry outcome states.
5. **Visual parity smoke fixtures** — fixture transcript or scripted side-by-side sessions for Markdown, tools, thinking, retries, widgets, and extension dialogs.
6. **Startup/resources panel** — show loaded context files, skills, prompts, extensions, themes, and diagnostics when RPC/server data is available.
7. **Slash selector polish** — persisted selector preferences, richer `/tree` current-branch detection, and a designed credential flow for `/login` / `/logout` if browser credential entry is accepted.
8. **Footer/status parity prototype** — decide between browser-native footer refinement and serializable footer/status descriptors.
9. **Serializable extension/custom renderer descriptors** — formal protocol for safe rich extension output in Web UI.

---

## Executive summary

The Web UI already has broad functional coverage: browser chat, multiple isolated RPC tabs, live assistant text/thinking streaming, model/thinking controls, queue controls, extension dialogs, status/widgets, a Pi-style footer, optional release/todo widgets, Git workflow, and action feedback.

The biggest output differences come from one architectural fact:

> The TUI renders inside Pi's interactive runtime using `@earendil-works/pi-tui` components and tool/message renderer functions. The Web UI talks to `pi --mode rpc`, receives semantic JSON events/messages, and reimplements display in browser DOM/CSS.

Because of that, the Web UI **does not automatically get** TUI-only rendering features such as built-in tool `renderCall`/`renderResult`, extension `registerMessageRenderer`, extension `ctx.ui.custom()` components, custom footers/headers/editors, overlays, or TUI keybinding-driven expansion behavior.

Highest-impact remaining gaps if the goal is “similar output”:

1. **Syntax highlighting and richer previews:** Web UI now renders Markdown and diffs, but code fences and file/tool previews still lack TUI-style syntax coloring.
2. **Extension UI parity:** TUI supports full custom components, overlays, widgets as components, custom footer/header/editor, working indicators, and custom message renderers; RPC/Web UI only supports a subset.
3. **Footer/status parity:** Web UI approximates a Pi-style footer independently. It cannot render the TUI custom footer from `git-footer-status` because `setFooter()` is a no-op in RPC mode.
4. **Startup/resources display:** TUI shows loaded context, skills, prompts, extensions, themes, diagnostics, and key hints. Web UI mostly shows commands/optional features in the side panel instead.
5. **Selector/editor parity:** Web UI now has browser-native selectors for the common native slash commands, but they remain approximations and do not execute TUI selector components; extension autocomplete providers and custom editor replacement APIs are still TUI-only.
6. **Visual regression evidence:** Current parity is source/static-test based; it still needs side-by-side TUI/Web UI fixture or screenshot verification.

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
  - decomposes assistant messages into thinking, paired tool-execution, and final-output cards
  - implements Web UI-specific widgets/footer/dialogs

---

## Current feature parity at a glance

| Area | TUI | Web UI | Current parity |
|---|---|---|---|
| User/assistant chat | Direct pi-tui components | DOM cards from RPC messages | Partial |
| Assistant streaming text | Live TUI component updates | Live browser stream bubble with safe Markdown | Good |
| Thinking stream | Inline/Markdown, hide toggle | Separate thinking card/bubble with persisted show/hide toggle | Good/partial layout difference |
| Tool calls/results | Rich paired tool components | Paired browser tool-execution cards by `toolCallId` | Good for built-ins |
| Live tool output | Handles `tool_execution_update` | Transcript-visible live tool cards keyed by `toolCallId` | Good |
| Built-in tool renderers | Full `renderCall`/`renderResult` | Browser-native renderers for common built-ins | Good/partial polish |
| Custom tool renderers | Supported | Not supported over RPC except known browser renderers | Low |
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
| Compaction/retry | Loaders, cancel hints, retry countdown | Run indicator/compact button plus visible retry cards; countdown/cancel parity incomplete | Partial |

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
  - paired `role: "toolExecution"` cards for assistant tool calls with `toolCallId`
  - `role: "assistantEvent"`
  - final `role: "assistant"`
- Final and streaming assistant text render through a browser-native Markdown renderer.
- Thinking is a separate card or streaming bubble, with a persisted show/hide toggle.
- Final output parts are collected only when there is no later tool call after that content part.
- During streaming, text may be delayed briefly and suppressed before a tool call to avoid transient tool/checklist-looking text.

Relevant functions:

- `renderContent()`
- `assistantDisplayMessages()`
- `appendMessage()`
- `appendTranscriptMessage()`
- `handleMessageUpdate()`

#### Difference

The TUI presents assistant output as themed Markdown within Pi's component tree. The Web UI now presents browser Markdown cards for assistant output, but it is still a browser-native renderer rather than the exact TUI Markdown component.

Remaining output gaps:

- No syntax highlighting for code fences or file previews yet.
- Thinking appears as separate cards instead of inline themed blocks.
- Web UI has a local show/hide thinking toggle, but does not consume TUI `setHiddenThinkingLabel()` custom labels.
- No OSC 133 markers, which are terminal-specific and probably not relevant in the browser.

---

### 3. Thinking output

#### TUI behavior

- Thinking can be shown or hidden via `Ctrl+T` / configured keybinding.
- Hidden thinking becomes a label like `Thinking...`.
- `ctx.ui.setHiddenThinkingLabel()` can customize the hidden label.
- Thinking is rendered through Markdown with thinking color + italic styling.

#### Web UI behavior

- Web UI streams thinking into `streamThinkingBubble` when thinking output is visible.
- Final thinking appears as a separate `role: "thinking"` message/card when thinking output is visible.
- The side panel has a persisted “Show thinking output” toggle stored in localStorage.
- It does not consume TUI's `setHiddenThinkingLabel()` behavior as a visual mode because RPC/Web UI only receives semantic events/messages.

#### Difference

Web UI has good raw thinking visibility when providers expose thinking and can now hide/show it locally, but presentation still differs from TUI inline themed thinking blocks.

Remaining parity improvements:

- Optionally render thinking as collapsible `<details>` by default.
- Consider a compact hidden `Thinking...` placeholder if hiding all thinking feels too abrupt.
- Expose TUI custom hidden-thinking labels through RPC if Pi adds a serializable field.

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

The Web UI receives the same RPC event stream and now renders generic tool executions as browser-native action cards:

- `tool_execution_start` creates/updates a live tool card and run indicator.
- `tool_execution_update` updates the same live tool card with partial output.
- `tool_execution_end` marks the card success/error and schedules message reconciliation.
- Final transcript rehydration via `/api/messages` pairs assistant tool-call parts with matching `toolResult` messages by `toolCallId`.
- Paired raw `toolResult` rows are suppressed; raw call/result details remain available in the paired tool card.
- No shared TUI `renderCall`/`renderResult` functions are invoked in the browser.

Relevant Web UI functions:

- `handleEvent()` handles `tool_execution_start`, `tool_execution_update`, and `tool_execution_end`.
- `appendMessage()` renders paired `toolExecution` cards plus fallback raw `toolResult` messages.
- `renderToolExecution()` dispatches to browser-side built-in tool renderers.
- `appendToolRawDetails()` keeps safe raw call/result data available.

#### Built-in tool renderer differences

| Tool | TUI output | Web UI output today |
|---|---|---|
| `read` | Compact path/resource/skill/docs labels; optional line range; syntax-highlighted preview when expanded; image handling | Browser card with path/range, image handling, text preview, warnings; no syntax highlighting yet |
| `bash` | `$ command` header; live partial output; elapsed/took time; tail preview in collapsed mode; truncation/full-output warnings | Browser card with command, live/tail output, elapsed/took/status pills, warnings |
| `edit` | Pre-execution diff preview once args complete; success/error-colored diff shell; final diff reconciliation | Browser card with path, edit count, diff rendering from `details.diff`/`details.patch`, status/result |
| `write` | Path header plus syntax-highlighted content preview; compact collapsed view; errors in result | Browser card with path, content preview, status/result; no syntax highlighting yet |
| `grep` | Compact `/pattern/ in path`; limited preview; truncation warnings | Browser card with pattern/path, glob/literal/case pills, preview, warnings |
| `find` | Compact pattern/path; limited preview; truncation warnings | Browser card with pattern/path, limit/status pills, preview, warnings |
| `ls` | Compact path; limited preview; truncation warnings | Browser card with path, limit/status pills, preview, warnings |

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

The practical near-term path was implemented: Web UI now has a browser-side renderer registry for built-in tools. Remaining tool parity work is renderer polish, syntax highlighting, expansion defaults, and safe custom renderer descriptors.

---

### 5. Live tool progress and partial output

#### TUI behavior

`InteractiveMode` explicitly handles `tool_execution_update`:

- Finds the existing `ToolExecutionComponent` by `toolCallId`.
- Calls `component.updateResult({ ...event.partialResult, isError: false }, true)`.
- Re-renders the TUI.

This is why long-running `bash` output can appear live in the TUI.

#### Web UI behavior

`handleEvent()` now has a `tool_execution_update` case. It maintains live tool cards keyed by `toolCallId`, updates partial output, marks success/error on end, and reconciles with `/api/messages` final history to avoid duplicates.

#### Difference

Generic live tool progress is now present in Web UI. Remaining differences are visual/component-level: the browser renderer approximates the TUI component but does not reuse `pi-tui` render functions, terminal image fallbacks, or TUI expansion/keybinding semantics.

Remaining recommended behavior:

- Persist expansion defaults for live/final tool cards.
- Keep improving truncation, full-output, and preview metadata.
- Add fixture tests for long-running `bash` and custom tools that emit incremental updates.

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

The Web UI now pairs assistant tool-call parts with matching `toolResult` messages and renders a single `toolExecution` card per `toolCallId`. Raw result rows are hidden once paired, while raw data remains available in the tool card.

#### Difference

The Web UI transcript now resembles TUI's structured action timeline for built-in tools. Remaining differences are visual polish, expansion behavior, and unsupported custom TUI tool renderers.

Remaining parity improvement:

- Add persisted expansion controls.
- Improve browser tool renderers for edge cases and syntax-highlighted previews.
- Define a safe descriptor path for custom extension renderers.

---

### 7. Markdown, code, syntax highlighting, and diffs

#### TUI behavior

The TUI uses Pi's `Markdown` component and tool-specific syntax/diff renderers:

- Assistant text is Markdown.
- Read/write previews can be syntax-highlighted by file extension.
- Edit previews use `renderDiff()`.
- Markdown themes are derived from the active TUI theme.

#### Web UI behavior

The Web UI now uses:

- Browser-native Markdown rendering for final/streaming assistant text.
- JSON pretty-printing for unknown/non-text objects.
- CSS classes for card styling.
- Some ANSI stripping/rendering in dialogs/widgets.
- Specialized release widgets with line tone classes.
- Browser diff rendering for `edit` tool `details.diff` / `details.patch`.

It does not yet have syntax highlighting for code fences or known file previews.

#### Difference

The same content is now much more structured in Web UI, but code-heavy output is still less rich than TUI because syntax highlighting is missing.

Remaining parity improvement:

- Add syntax highlighting for code fences and known file previews.
- Preserve plain `<pre>` fallback for logs, unknown languages, raw tool output, and very large content.

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
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `compaction_start` / `compaction_end`
- `auto_retry_start` / `auto_retry_end`
- `queue_update`
- `extension_error`
- `extension_ui_request`

Current event handling does **not** explicitly render:

- `turn_start`
- `turn_end`

#### Difference

Web UI has a good browser-native notion of “the agent is running” and now renders major tool/retry/error events, but it is not the same as TUI's spinner/loader/working indicator system.

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

`handleNativeSlashCommand()` implements non-selector commands such as `/new`, `/compact`, `/name`, `/session`, `/copy`, `/hotkeys`, `/clone`, and `/reload` directly. The browser now intercepts exact selector-style commands before prompt forwarding and opens Web UI dialogs for:

- `/model`
- `/settings`
- `/theme`
- `/fork`
- `/clone`
- `/resume`
- `/tree`
- `/scoped-models`

`/login` and `/logout` currently open a non-secret guidance dialog instead of accepting credentials in the browser.

#### Difference

The command list now has browser behavior for the common native selectors, but these are Web UI-controlled DOM selectors, not reused TUI components. Some native commands remain informational or unimplemented in Web UI.

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
- Transcript-visible auto-retry start/end/failure cards.

#### Difference

Compaction and retries are visible, but not identical to TUI. Remaining differences are countdown/cancel-loader polish and compaction summary presentation.

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

Web UI has its own terminal tabs plus browser-native selector dialogs:

- `/fork` loads fork points from RPC `get_fork_messages`, calls RPC `fork`, switches the active tab to the forked session, and restores selected user text into the browser composer when available.
- `/clone` confirms and calls RPC `clone`.
- `/resume` lists current-cwd or all persisted sessions through `SessionManager.list()` / `SessionManager.listAll()`, then calls RPC `switch_session`.
- `/tree` reads the current session JSONL tree with `SessionManager`, then navigates by sending an internal `/webui-tree-navigate` extension command that calls `ctx.navigateTree()` and can restore editor text through RPC extension UI events.
- `/model`, `/settings`, and `/theme` use browser DOM selectors backed by existing Web UI/RPC endpoints.

`/login` / `/logout` remain guidance-only to avoid browser credential entry without a dedicated security design.

#### Difference

Session navigation controls are now available in Web UI, but their interaction model and visuals are browser-native. Tree current-branch detection is derived from persisted session data and may not match every transient in-memory TUI branch state until Pi persists or reports it.

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
  - `tool_execution_update`
  - `tool_execution_end`
  - `compaction_start`
  - `compaction_end`
  - `auto_retry_start`
  - `auto_retry_end`
  - `extension_error`
  - `extension_ui_request`
  - `response`

### Explicit gaps

Web UI now has transcript-visible output handling for `tool_execution_update`, `auto_retry_start`, `auto_retry_end`, and `extension_error`.

Remaining event-level gaps are lower-impact/debug-oriented:

- `turn_start`
- `turn_end`

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

### Completed phases

These high-impact transcript-parity phases are now implemented in the Web UI source:

1. **Event visibility**
   - `tool_execution_start` / `tool_execution_update` / `tool_execution_end` live cards.
   - Transcript-visible `auto_retry_start`, `auto_retry_end`, and `extension_error` cards.
2. **Paired tool calls and results**
   - Assistant tool-call parts are paired with matching `toolResult` messages by `toolCallId`.
   - Paired raw tool-result rows are suppressed, with raw data available inside tool cards.
3. **Built-in browser tool renderers**
   - Browser renderers exist for `bash`, `read`, `write`, `edit`, `grep`, `find`, and `ls`.
   - Cards include tool state, elapsed/took time, previews, warnings, and edit diffs.
4. **Assistant Markdown and thinking visibility**
   - Assistant final/streaming text renders as safe browser-native Markdown.
   - Thinking output can be hidden/shown with persisted local preference.
   - Redundant assistant final-output headers are hidden.
5. **Native slash selector UIs**
   - Browser-native dialogs exist for `/model`, `/settings`, `/theme`, `/fork`, `/clone`, `/resume`, `/tree`, and `/scoped-models`.
   - Backend helpers expose fork points, session lists, session trees, clone/fork, session switching, and internal tree navigation.
   - `/login` and `/logout` deliberately remain guidance-only until credential-entry/security design is settled.

### Phase 5 — Syntax highlighting and preview polish

Low/medium complexity, high visual value.

- Add syntax highlighting for Markdown code fences.
- Add syntax-highlighted read/write previews by file extension.
- Keep plain-text fallback for logs, unknown languages, and very large output.
- Preserve copyable code text and safe link handling.

Expected improvement: code-heavy assistant/tool output will look closer to TUI while preserving browser safety.

### Phase 6 — Tool expansion and renderer defaults

Low/medium complexity.

- Add persisted defaults for tool output expansion, raw tool-data details, and thinking sections.
- Tighten renderer edge cases for empty output, truncation, full-output-path warnings, and image previews.
- Add richer file/resource labels for `read` and `write` where data is available.

Expected improvement: better control over dense transcripts and closer TUI action-row behavior.

### Phase 7 — Visual parity fixtures

Low complexity, high confidence value.

- Add a fixture transcript or scripted smoke flow that exercises Markdown, tools, thinking, retries, widgets, and extension dialogs.
- Use it for side-by-side TUI/Web UI checks before larger renderer changes.

Expected improvement: future parity changes can be verified against reproducible output instead of manual ad-hoc prompts.

### Phase 8 — Startup/resources display

Medium complexity.

- Add a Web UI “Startup resources” card/side panel section.
- Show loaded context files, skills, prompts, extensions, themes, diagnostics.
- Source from RPC where available; otherwise add a Web UI server helper if needed.

Expected improvement: first-screen Web UI context resembles TUI startup output.

### Phase 9 — Footer/status parity decision

Medium/high complexity depending on design.

Choose one:

1. **Browser-native footer remains canonical for Web UI**
   - Copy desired `git-footer-status` fields into Web UI.
   - Display selected `setStatus()` entries in footer meta.
2. **Serializable footer/status descriptor**
   - Extension can emit a footer/status descriptor through status/widget/custom RPC event.
   - Browser renders it with CSS.

Expected improvement: less drift between TUI custom footer and Web UI footer.

### Phase 10 — Formalize Web UI extension render hooks

Highest complexity; design first.

Possible API conventions:

- `details.webui` with serializable card descriptors.
- `customType` browser renderer registry for known extensions.
- `toolName` browser renderer registry.
- Optional package-provided browser render modules loaded only from trusted/local packages.

Expected improvement: custom extension output can be rich without attempting to execute pi-tui components in the browser.

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

## Suggested concrete next patch set

If continuing parity work now, start with this order:

1. Add syntax highlighting for Markdown code fences and read/write previews, with plain-text fallback.
2. Add persisted expansion defaults for tool output, raw tool data, and thinking sections.
3. Improve `read` / `write` / `grep` / `find` / `ls` renderer edge cases: truncation summaries, file/image labels, preview line limits, and empty-output wording.
4. Add a fixture-based visual parity smoke test or documented side-by-side test transcript.
5. Add a startup/resources side-panel section if the data is available from RPC/server helpers.
6. Polish native slash selectors: richer tree branch/current markers, persisted selector defaults, and decide whether `/login` / `/logout` can safely accept credentials in-browser.
7. Prototype footer/status parity: either browser-native field copy or a serializable footer/status descriptor.
8. Design serializable extension/custom renderer descriptors after the safer browser-native work above is stable.

This order keeps low-risk browser-renderer improvements first and defers protocol/trust-boundary changes.

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

For “similar output,” the already-implemented browser-native semantic renderers have closed the largest transcript gaps: live tool cards, paired tool/result cards, built-in tool cards, Markdown/diff rendering, thinking visibility, and retry/error visibility.

The next useful focus is **polish and safe extensibility**:

1. syntax-highlighted code/file previews,
2. persisted expansion controls,
3. richer tool preview metadata,
4. startup/resources visibility,
5. footer/status parity,
6. fixture-based visual verification,
7. serializable extension/custom renderer descriptors.

Those continue to improve parity without requiring risky browser execution of TUI extension code.
