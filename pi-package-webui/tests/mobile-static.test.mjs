import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [pkgRaw, html, css, app, server, readme, manifestRaw, serviceWorker, appleIcon, icon192, icon512] = await Promise.all([
  readFile(join(root, "package.json"), "utf8"),
  readFile(join(root, "public", "index.html"), "utf8"),
  readFile(join(root, "public", "styles.css"), "utf8"),
  readFile(join(root, "public", "app.js"), "utf8"),
  readFile(join(root, "bin", "pi-webui.mjs"), "utf8"),
  readFile(join(root, "README.md"), "utf8"),
  readFile(join(root, "public", "manifest.webmanifest"), "utf8"),
  readFile(join(root, "public", "service-worker.js"), "utf8"),
  readFile(join(root, "public", "apple-touch-icon.png")),
  readFile(join(root, "public", "icon-192.png")),
  readFile(join(root, "public", "icon-512.png")),
]);
const pkg = JSON.parse(pkgRaw);
const manifest = JSON.parse(manifestRaw);

assert.match(html, /viewport-fit=cover/, "viewport should opt into safe-area-aware full-screen layout");
assert.match(html, /interactive-widget=resizes-content/, "viewport should request keyboard-driven content resizing where supported");
assert.match(html, /<meta name="theme-color" content="#11111b" \/>/, "PWA should declare a mobile browser theme color");
assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/, "PWA should expose a web app manifest");
assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" \/>/, "PWA should expose the conventional iOS home-screen icon path");
assert.match(html, /id="terminalTabsToggleButton"/, "mobile should expose a compact terminal-tabs toggle");
assert.match(html, /id="sidePanelBackdrop"/, "mobile side panel needs an overlay/backdrop close target");
assert.match(html, /id="jumpToLatestButton"/, "chat should expose a jump-to-latest control for non-forced streaming");
assert.match(html, /<textarea id="promptInput"[^>]*rows="1"[^>]*enterkeyhint="enter"/, "prompt textarea should start at one row and hint that Return inserts a newline");
assert.match(html, /id="composerActionsButton"/, "mobile composer should expose a compact actions trigger");
assert.match(html, /id="composerActionsPanel"/, "secondary composer controls should live in a mobile actions panel");
assert.match(html, /id="steerButton"[\s\S]*?data-tooltip="Steer usage:/, "Steer should explain type-first usage in a tooltip");
assert.match(html, /id="followUpButton"[\s\S]*?data-tooltip="Follow-up usage:/, "Follow-up should explain type-first usage in a tooltip");
assert.ok(
  html.indexOf('<main class="layout">') < html.indexOf('id="sidePanelBackdrop"') &&
    html.indexOf('id="sidePanelBackdrop"') < html.indexOf('id="sidePanel"'),
  "side-panel backdrop should live inside the layout before the panel so the panel can stack above it",
);

assert.match(css, /--visual-viewport-height:\s*100dvh/, "CSS should define a visual viewport height fallback");
assert.match(css, /height:\s*var\(--visual-viewport-height, 100dvh\)/, "layout should consume visual viewport height");
assert.match(css, /button, select, input \{ min-height: 44px; \}/, "base controls should meet 44px touch-target height");
assert.match(css, /\.composer-row button[\s\S]*?min-height:\s*44px/, "mobile composer buttons should keep 44px touch targets");
assert.match(css, /#promptInput \{[\s\S]*?min-height:\s*calc\(1\.5em \+ 1\.8rem\)/, "prompt input should default to a compact single-line height");
assert.match(css, /#promptInput \{[\s\S]*?overflow-y:\s*hidden/, "prompt input should be JS-resized instead of showing a scrollbar by default");
assert.match(css, /\.message\.extension,[\s\S]*?\.message\.native/, "extension and native command output should have visible transcript styling");
assert.match(css, /\.todo-widget \{[\s\S]*?display:\s*grid/, "todo-progress widget should render as a styled checklist card");
assert.match(css, /\.todo-widget-item\.partial \.todo-widget-marker/, "todo-progress partial items should have distinct styling");
assert.match(css, /\.todo-widget-item\.done \.todo-widget-text[\s\S]*?text-decoration:\s*line-through/, "todo-progress completed items should be visually crossed out");
assert.match(css, /\.message\.warn \.message-role \{ color: var\(--ctp-yellow\); \}/, "warning-level command output should be visually distinct");
assert.match(css, /\.composer-row button\[data-tooltip\]::after/, "composer button tooltips should be shared across Git, Steer, and Follow-up buttons");
assert.match(css, /\.composer-row button\[data-tooltip\]\.tooltip-open::after/, "composer button tooltips should be triggerable from JS for empty mobile taps");
assert.match(css, /\.composer-actions-panel[\s\S]*?bottom:\s*calc\(100% \+ 0\.42rem\)/, "mobile composer actions should open as an above-composer sheet");
assert.match(css, /body\.composer-actions-open \.composer-actions-panel \{ display: grid; \}/, "composer actions panel should only open when toggled");
assert.match(css, /\.terminal-tabs-toggle-button \{ display: none; \}/, "terminal tab toggle should be hidden outside mobile CSS");
assert.match(css, /body\.mobile-tabs-expanded \.terminal-tabs \{ display: flex; \}/, "mobile tabs should expand only when toggled");
assert.match(css, /\.terminal-tabs[\s\S]*?position:\s*absolute/, "expanded mobile tabs should overlay instead of consuming transcript space");
assert.match(css, /body\.mobile-keyboard-open \.terminal-tabs-shell,[\s\S]*?body\.mobile-keyboard-open \.widget-area,[\s\S]*?body\.mobile-keyboard-open \.statusbar/, "mobile keyboard mode should hide header, widgets, and footer");
assert.match(css, /body\.mobile-keyboard-open \.composer-actions-button,[\s\S]*?body\.mobile-keyboard-open #steerButton,[\s\S]*?body\.mobile-keyboard-open #followUpButton/, "mobile keyboard mode should hide secondary composer buttons");
assert.match(css, /body:not\(\.pi-run-active\):not\(\.mobile-keyboard-open\) \.composer-row button\.primary \{ grid-column: span 4; \}/, "idle mobile composer should keep Actions and Send on one compact row");
assert.match(css, /\.composer-actions-panel > #followUpButton,[\s\S]*?\.composer-actions-panel > #steerButton/, "idle Steer and Follow-up should fit inside the Actions sheet");
assert.match(css, /\.footer-details-toggle \{ display: none; \}/, "footer details toggle should be hidden outside mobile CSS");
assert.match(css, /\.footer-workspace,\n\s+\.footer-context \{ display: grid !important; \}/, "collapsed mobile footer should primarily show cwd and context");
assert.match(css, /\.footer-model \{ order: 7; \}/, "model should move into expanded footer details on mobile");
assert.match(css, /\.footer-model-picker[\s\S]*?position:\s*absolute/, "footer model picker should render as a dropdown/popover");
assert.match(css, /@media \(max-width: 720px\), \(max-device-width: 720px\), \(pointer: coarse\) and \(hover: none\)[\s\S]*?\.footer-model-picker \{[\s\S]*?position:\s*fixed/, "mobile footer model picker should escape footer-details stacking as a fixed overlay on narrow, device-width-narrow, or touch-only devices");
assert.match(css, /bottom:\s*var\(--footer-model-picker-bottom/, "mobile footer model picker should be anchored by a JS-computed viewport offset");
assert.match(css, /\.footer-model-option\.active/, "footer model picker should style the selected scoped model");
assert.match(css, /body\.footer-details-expanded \.footer-line-meta[\s\S]*?display:\s*grid/, "mobile footer metadata should be expandable");
assert.match(css, /(?:^|\n)\s*\.side-panel-backdrop\s*\{[\s\S]*?position:\s*fixed/, "mobile side panel backdrop should be fixed overlay UI");
assert.match(css, /(?:^|\n)\s*\.side-panel\s*\{[\s\S]*?position:\s*fixed/, "mobile side panel should be an overlay drawer instead of stacked content");
assert.match(css, /\.extension-dialog[\s\S]*?max-height:\s*calc\(var\(--visual-viewport-height/, "dialogs should fit the visual viewport on mobile");
assert.match(css, /\.extension-dialog[\s\S]*?inset:\s*auto 0 0 0/, "mobile dialogs should behave like bottom sheets");
assert.match(css, /#dialogMessage \{[\s\S]*?white-space:\s*pre-wrap/, "extension dialog messages should preserve multiline prompts");
assert.match(css, /\.extension-dialog\.guardrail-dialog[\s\S]*?border-color:\s*rgba\(249, 226, 175/, "guardrail dialogs should have warning-specific styling");

assert.match(app, /const MOBILE_VIEW_QUERY = "\(max-width: 720px\), \(max-device-width: 720px\), \(pointer: coarse\) and \(hover: none\)"/, "mobile detection should include phones that report desktop-like layout widths");
assert.match(app, /window\.visualViewport/, "app should listen to VisualViewport for keyboard/viewport updates");
assert.match(app, /function syncMobileChatToBottomForInput\(\)/, "mobile input focus should force the output view to the latest message");
assert.match(app, /elements\.promptInput\.addEventListener\("focus", \(\) => \{\n\s+syncMobileChatToBottomForInput\(\);/, "focusing mobile input should scroll output to bottom");
assert.match(app, /navigator\.serviceWorker\.register\("\/service-worker\.js"\)/, "PWA service worker should be registered by the app");
assert.match(app, /function isChatNearBottom\(/, "chat should detect whether the user is reading above the bottom");
assert.match(app, /function stripAnsi\(text\)/, "widget rendering should strip ANSI color escapes before display");
assert.match(app, /\(\?:\\x1B\|\\u241B\)/, "ANSI stripping should handle literal escape characters and visible escape glyphs");
assert.match(app, /function normalizeDialogPrompt\(request\)/, "extension dialogs should split multiline prompts into title and body");
assert.match(app, /elements\.dialog\.classList\.toggle\("guardrail-dialog", isGuardrailDialog\)/, "guardrail extension dialogs should get dedicated styling");
assert.match(app, /guardrail-safe-action/, "guardrail dialogs should distinguish safe and allow actions");
assert.match(app, /function parseTodoProgressWidget\(lines\)/, "todo-progress widgets should be parsed from extension widget lines");
assert.match(app, /key === "todo-progress" \? renderTodoProgressWidget\(key, lines\) : null/, "todo-progress should use the specialized widget renderer");
assert.match(app, /let transientMessages = \[\]/, "frontend should keep transient Web UI/extension output messages");
assert.match(app, /function addTransientMessage\(\{ role = "notice"/, "frontend should render transient command output into the transcript");
assert.match(app, /addTransientMessage\(\{ role: "extension", title: "extension output"/, "extension notify output should appear in the transcript, not only the event log");
assert.match(app, /function resizePromptInput\(\)/, "prompt textarea should auto-resize from a one-line default");
assert.match(app, /elements\.promptInput\.addEventListener\("input", \(\) => \{\n\s+resizePromptInput\(\);/, "prompt textarea should resize whenever the user edits it");
assert.match(app, /function updateComposerModeButtons\(\)/, "composer should relocate Steer and Follow-up based on run state");
assert.match(app, /const target = runActive \? elements\.composerRow : elements\.composerActionsPanel/, "Steer and Follow-up should live in Actions unless a run is active");
assert.match(app, /document\.body\.classList\.toggle\("pi-run-active", runActive\)/, "run-active state should be reflected in CSS for mobile composer layout");
assert.match(app, /function showComposerButtonTooltip\(button\)/, "empty mode-button taps should show the usage tooltip");
assert.match(app, /sendPromptFromModeButton\("steer", elements\.steerButton\)/, "Steer should show tooltip instead of silently doing nothing when input is empty");
assert.match(app, /sendPromptFromModeButton\("follow-up", elements\.followUpButton\)/, "Follow-up should show tooltip instead of silently doing nothing when input is empty");
assert.match(app, /function shouldSendPromptFromEnter\(event\)/, "prompt keyboard handling should be centralized");
assert.match(app, /return !isMobileView\(\);/, "plain Enter should send only outside mobile view so mobile Return can insert newlines");
assert.match(app, /mobile-keyboard-open/, "JS should toggle mobile keyboard mode from viewport/focus state");
assert.match(app, /maxVisualViewportHeight - viewportHeight > 120/, "keyboard mode should detect viewport shrink even when keyboard inset is unavailable");
assert.match(app, /jumpToLatestButton/, "jump-to-latest button should be wired in JS");
assert.match(app, /function setComposerActionsOpen\(/, "mobile composer actions panel should be JS-toggleable");
assert.match(app, /function setMobileTabsExpanded\(/, "mobile tab strip should be JS-toggleable");
assert.match(app, /terminalTabsToggleButton\.addEventListener\("click"/, "terminal tabs trigger should be wired in JS");
assert.match(app, /composerActionsButton\.addEventListener\("click"/, "composer actions trigger should be wired in JS");
assert.match(app, /function setMobileFooterExpanded\(/, "mobile footer should have an expandable details state");
assert.match(app, /function updateFooterModelPickerPosition\(\)/, "mobile model picker should compute a fixed overlay position above the footer");
assert.match(app, /mobileFooterExpanded = false;[\s\S]*?document\.body\.classList\.remove\("footer-details-expanded"\)/, "opening mobile model picker should collapse footer details so details cannot cover the dropdown");
assert.match(app, /footerMeta\("context", contextLabel, "footer-context"\)/, "footer should render context as a primary mobile meta item");
assert.match(app, /footerMeta\("model", modelLine, "footer-model", \{/, "footer model item should be clickable");
assert.match(app, /function renderFooterModelPicker\(\)/, "footer should render a scoped-model picker dropdown");
assert.match(app, /api\("\/api\/scoped-models"\)/, "footer model picker should load scoped models instead of all available models");
assert.match(app, /for \(const model of footerScopedModels\)/, "footer model picker should render only scoped models");
assert.match(app, /api\("\/api\/model", \{ method: "POST"/, "footer model picker should apply selected model through the model API");
assert.match(app, /footer-details-toggle/, "footer details toggle should be rendered by JS");
assert.match(app, /bindMobileViewChanges\(/, "side panel state should react to mobile breakpoint changes");
assert.match(app, /function restoreSidePanelState\(\) \{\n\s+if \(isMobileView\(\)\)/, "mobile should start with side panel collapsed even if desktop state was expanded");
assert.match(app, /case "webui_tab_reloaded":/, "frontend should handle native /reload tab restart events");
assert.match(app, /addTransientMessage\(\{ role: "native", title: "\/reload"/, "native /reload should produce visible transcript output");
assert.match(app, /navigator\.clipboard\.writeText\(response\.data\.copyText\)/, "native /copy should use the browser clipboard when available");
assert.match(app, /Clipboard access failed:[\s\S]*?response\.data\.copyText/, "native /copy should show text in transcript when clipboard access fails");
assert.match(app, /setTimeout\(\(\) => refreshAll\(\)\.catch/, "frontend should refresh state after native /reload restarts the RPC process");
assert.match(app, /api\("\/api\/path-fast-picks"/, "frontend should load/save fast picks through the server API");
assert.match(app, /loadLegacyFastPicks\(/, "frontend should migrate existing browser-local fast picks");

assert.equal(manifest.display, "standalone", "PWA manifest should request standalone display");
assert.equal(manifest.start_url, "/", "PWA manifest should start at the web UI root");
assert.ok(manifest.icons?.some((icon) => icon.src === "/apple-touch-icon.png" && icon.sizes === "180x180"), "PWA manifest should include a conventional 180px apple touch icon");
assert.ok(manifest.icons?.some((icon) => icon.src === "/icon-192.png" && icon.sizes === "192x192"), "PWA manifest should include a 192px icon");
assert.ok(manifest.icons?.some((icon) => icon.src === "/icon-512.png" && icon.sizes === "512x512"), "PWA manifest should include a 512px icon");
assert.match(serviceWorker, /const CACHE_NAME = "pi-webui-pwa-v1"/, "PWA service worker should define an app-shell cache");
assert.match(serviceWorker, /"\/apple-touch-icon\.png"/, "PWA service worker should cache the apple touch icon");
assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/, "PWA service worker should not cache live API or SSE calls");
assert.ok(appleIcon.length > 1000, "PWA apple touch icon should be present");
assert.ok(icon192.length > 1000, "PWA 192px icon should be present");
assert.ok(icon512.length > icon192.length, "PWA 512px icon should be present and larger than 192px icon");

assert.match(server, /const NATIVE_SLASH_COMMANDS = \[/, "server should define Pi native slash commands for autocomplete");
assert.match(server, /\{ name: "reload", description: "Reload keybindings, extensions, skills, prompts, and themes" \}/, "native /reload should be advertised for autocomplete");
assert.match(server, /function parseSlashCommand\(message\)/, "server should parse native slash commands before prompt forwarding");
assert.match(server, /async function handleNativeSlashCommand\(tab, body\)/, "server should intercept supported native slash commands");
assert.match(server, /if \(state\.data\?\.sessionFile && !options\.noSession\) piArgs\.push\("--session", state\.data\.sessionFile\)/, "native /reload should resume the same session file when restarting the RPC tab");
assert.match(server, /case "reload": \{[\s\S]*?restartTabRpc\(tab, "slash-command"\)/, "native /reload should restart the active RPC tab");
assert.match(server, /message: "Reloaded keybindings, extensions, skills, prompts, and themes\."/, "native /reload should return visible command output");
assert.match(server, /function formatSessionOutput\(tab, state, stats\)/, "native /session should have visible Web UI output");
assert.match(server, /case "session": \{[\s\S]*?formatSessionOutput\(tab, state\.data \|\| \{\}, stats\.success === false \? null : stats\.data\)/, "native /session should render state and stats through Web UI");
assert.match(server, /case "copy": \{[\s\S]*?get_last_assistant_text[\s\S]*?copyText: text/, "native /copy should return text for browser clipboard handling");
assert.match(server, /case "hotkeys": \{[\s\S]*?webuiHotkeysOutput\(\)/, "native /hotkeys should return Web UI hotkey output");
assert.match(server, /url\.pathname === "\/api\/commands" && req\.method === "GET"[\s\S]*?getCommandData\(tab\)/, "GET /api/commands should merge native and RPC-visible commands");
assert.match(server, /url\.pathname === "\/api\/prompt" && req\.method === "POST"[\s\S]*?handleNativeSlashCommand\(tab, body\)/, "POST /api/prompt should intercept native slash commands before normal prompt forwarding");
assert.match(server, /function fastPicksStorageFile\(/, "server should define a persistent fast-picks storage file");
assert.match(server, /PI_WEBUI_FAST_PICKS_FILE/, "server should allow overriding the fast-picks storage path");
assert.match(server, /url\.pathname === "\/api\/path-fast-picks" && req\.method === "GET"/, "server should expose GET /api/path-fast-picks");
assert.match(server, /url\.pathname === "\/api\/path-fast-picks" && req\.method === "POST"/, "server should expose POST /api/path-fast-picks");
assert.match(server, /url\.pathname === "\/api\/scoped-models" && req\.method === "GET"/, "server should expose GET /api/scoped-models");
assert.match(server, /"apple-touch-icon\.png", "icon-192\.png"/, "server should serve the conventional apple touch icon path");
assert.match(server, /"manifest\.webmanifest", "service-worker\.js"/, "server should serve PWA manifest and service worker as static assets");
assert.match(server, /\["\.webmanifest", "application\/manifest\+json; charset=utf-8"\]/, "server should serve manifest with the correct MIME type");
assert.match(server, /\["\.png", "image\/png"\]/, "server should serve PWA PNG icons with the correct MIME type");
assert.match(server, /function configuredScopedModelPatterns\(cwd = options\.cwd\)/, "server should read Pi configured scoped-model patterns for the active tab cwd");
assert.match(server, /readJsonFileIfExists\(path\.join\(cwd, "\.pi", "settings\.json"\)\)/, "server should read project-local scoped-model settings from active tab cwd");
assert.match(server, /resolveScopedModelsFromPatterns\(patterns, response\.data\?\.models/, "server should resolve scoped patterns against available models");
assert.match(server, /writeFile\(tmpFile[\s\S]*?rename\(tmpFile, storageFile\)/, "server should persist fast picks with an atomic temp-file rename");
assert.match(readme, /server-persisted fast picks/, "README should describe server-persisted fast picks");

assert.equal(pkg.scripts?.test, "node tests/mobile-static.test.mjs", "package test script should run the mobile static harness");
assert.ok(pkg.scripts?.check?.includes("node --check public/app.js"), "check script should syntax-check app.js");
assert.ok(pkg.scripts?.check?.includes("node tests/mobile-static.test.mjs"), "check script should include mobile static assertions");

console.log("mobile static checks passed");
