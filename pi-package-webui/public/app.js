const $ = (selector) => document.querySelector(selector);

const elements = {
  sessionLine: $("#sessionLine"),
  tabBar: $("#tabBar"),
  terminalTabsToggleButton: $("#terminalTabsToggleButton"),
  newTabButton: $("#newTabButton"),
  statusBar: $("#statusBar"),
  widgetArea: $("#widgetArea"),
  stickyUserPromptButton: $("#stickyUserPromptButton"),
  chat: $("#chat"),
  feedbackTray: $("#feedbackTray"),
  feedbackTraySummary: $("#feedbackTraySummary"),
  sendFeedbackButton: $("#sendFeedbackButton"),
  jumpToLatestButton: $("#jumpToLatestButton"),
  composer: $("#composer"),
  composerRow: $(".composer-row"),
  composerActionsButton: $("#composerActionsButton"),
  composerActionsPanel: $("#composerActionsPanel"),
  promptInput: $("#promptInput"),
  sendButton: $("#sendButton"),
  commandSuggest: $("#commandSuggest"),
  busyBehavior: $("#busyBehavior"),
  steerButton: $("#steerButton"),
  followUpButton: $("#followUpButton"),
  abortButton: $("#abortButton"),
  newSessionButton: $("#newSessionButton"),
  compactButton: $("#compactButton"),
  gitWorkflowButton: $("#gitWorkflowButton"),
  gitWorkflowPanel: $("#gitWorkflowPanel"),
  gitWorkflowTitle: $("#gitWorkflowTitle"),
  gitWorkflowHint: $("#gitWorkflowHint"),
  gitWorkflowSteps: $("#gitWorkflowSteps"),
  gitWorkflowOutput: $("#gitWorkflowOutput"),
  gitWorkflowActions: $("#gitWorkflowActions"),
  gitWorkflowCancelButton: $("#gitWorkflowCancelButton"),
  modelSelect: $("#modelSelect"),
  setModelButton: $("#setModelButton"),
  thinkingSelect: $("#thinkingSelect"),
  setThinkingButton: $("#setThinkingButton"),
  themeSelect: $("#themeSelect"),
  networkStatus: $("#networkStatus"),
  openNetworkButton: $("#openNetworkButton"),
  toggleSidePanelButton: $("#toggleSidePanelButton"),
  sidePanelExpandButton: $("#sidePanelExpandButton"),
  sidePanelBackdrop: $("#sidePanelBackdrop"),
  sidePanel: $("#sidePanel"),
  stateDetails: $("#stateDetails"),
  queueBox: $("#queueBox"),
  commandsBox: $("#commandsBox"),
  eventLog: $("#eventLog"),
  dialog: $("#extensionDialog"),
  dialogTitle: $("#dialogTitle"),
  dialogMessage: $("#dialogMessage"),
  dialogBody: $("#dialogBody"),
  dialogActions: $("#dialogActions"),
  pathPickerDialog: $("#pathPickerDialog"),
  pathPickerTitle: $("#pathPickerTitle"),
  pathPickerCurrent: $("#pathPickerCurrent"),
  pathPickerAddFastPickButton: $("#pathPickerAddFastPickButton"),
  pathPickerFastPicks: $("#pathPickerFastPicks"),
  pathPickerRoots: $("#pathPickerRoots"),
  pathPickerList: $("#pathPickerList"),
  pathPickerError: $("#pathPickerError"),
  pathPickerCancelButton: $("#pathPickerCancelButton"),
  pathPickerChooseButton: $("#pathPickerChooseButton"),
};

let currentState = null;
let tabs = [];
let activeTabId = null;
let tabDrafts = new Map();
let tabActivities = new Map();
let tabSeenCompletionSerials = new Map();
let streamBubble = null;
let streamText = null;
let streamRawText = "";
let streamThinkingBubble = null;
let streamThinking = null;
let runIndicatorBubble = null;
let runIndicatorText = null;
let runIndicatorMeta = null;
let runIndicatorTimer = null;
let runIndicatorGraceCheckTimer = null;
let runIndicatorLastStateCheckAt = 0;
let runIndicatorLocallyActive = false;
let runIndicatorStartedAt = null;
let runIndicatorActivity = "Waiting for output or action…";
let refreshMessagesTimer = null;
let refreshStateTimer = null;
let refreshFooterTimer = null;
let refreshTabsTimer = null;
let eventSource = null;
let activeDialog = null;
let pathPickerState = null;
let pathFastPicks = [];
let pathFastPicksReady = false;
let pathFastPicksLoadPromise = null;
let mobileTabsExpanded = false;
let openTerminalTabGroupKey = null;
let availableCommands = [];
let commandSuggestions = [];
let pathSuggestions = [];
let suggestionMode = "none";
let commandSuggestIndex = 0;
let pathSuggestRequestSerial = 0;
let pathSuggestAbortController = null;
let latestStats = null;
let latestWorkspace = null;
let latestNetwork = null;
let latestMessages = [];
let transientMessages = [];
let lastUserPromptByTab = new Map();
let actionFeedbackByTab = new Map();
let actionFeedbackSendBusy = false;
let blockedTabNotificationKeys = new Set();
let blockedTabNotificationPermissionRequested = false;
let blockedTabNotificationFallbackNoted = false;
let availableModels = [];
let availableThemes = [];
let currentThemeName = "catppuccin-mocha";
let footerScopedModels = [];
let footerScopedModelPatterns = [];
let footerScopedModelSource = "none";
let autoFollowChat = true;
let chatFollowFrame = null;
let chatFollowSettleTimer = null;
let lastChatProgrammaticScrollAt = 0;
let chatUserScrollIntentUntil = 0;
let mobileFooterExpanded = false;
let footerModelPickerOpen = false;
let maxVisualViewportHeight = 0;
let currentRunStartedAt = null;
let currentRunStreamChars = 0;
let latestTokPerSecond = null;
const dialogQueue = [];
const SIDE_PANEL_STORAGE_KEY = "pi-webui-side-panel-collapsed";
const TAB_STORAGE_KEY = "pi-webui-active-tab";
const PATH_FAST_PICKS_STORAGE_KEY = "pi-webui-path-fast-picks";
const THEME_STORAGE_KEY = "pi-webui-theme";
const LAST_USER_PROMPT_STORAGE_KEY = "pi-webui-last-user-prompts";
const DEFAULT_THEME_NAME = "catppuccin-mocha";
const MOBILE_VIEW_QUERY = "(max-width: 720px), (max-device-width: 720px), (pointer: coarse) and (hover: none)";
const CHAT_BOTTOM_THRESHOLD_PX = 96;
const STICKY_USER_PROMPT_PREVIEW_LIMIT = 220;
const STICKY_USER_PROMPT_TOP_GAP_PX = 12;
const CHAT_FOLLOW_SETTLE_DELAY_MS = 80;
const CHAT_PROGRAMMATIC_SCROLL_GRACE_MS = 500;
const CHAT_USER_SCROLL_INTENT_MS = 700;
const RUN_INDICATOR_TICK_MS = 1000;
const RUN_INDICATOR_START_GRACE_MS = 2500;
const RUN_INDICATOR_STATE_RECHECK_MS = 5000;
const TODO_PROGRESS_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[(?: |x|X|-)\]\s+.+$/;
const TODO_PROGRESS_PARTIAL_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[(?: |x|X|-)?\]?\s*.*$/;
const CHAT_SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);
const TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS = 1200;
const TAB_GROUP_STATUS_PRIORITY = ["blocked", "done", "idle", "working"];
const EXTENSION_UI_BLOCKING_METHODS = new Set(["select", "confirm", "input", "editor"]);
const BLOCKED_TAB_NOTIFICATION_TAG_PREFIX = "pi-webui-blocked-tab";
const BLOCKED_TAB_NOTIFICATION_ICON = "/icon-192.png";
const mobileViewMedia = window.matchMedia?.(MOBILE_VIEW_QUERY) || null;
const statusEntries = new Map();
const widgets = new Map();
const gitWorkflow = {
  active: false,
  step: "idle",
  busy: false,
  runId: 0,
  output: "",
  error: "",
  message: null,
  messageRequestedAt: 0,
};
const GIT_WORKFLOW_STEPS = ["Stage", "Message", "Commit", "Push"];
const ACTION_FEEDBACK_REACTIONS = {
  up: { icon: "👍", label: "Good job", title: "Good job!" },
  down: { icon: "👎", label: "Avoid this", title: "Avoid this" },
  question: { icon: "?", label: "Explain this", title: "Explain this in the final output" },
};
const ACTION_FEEDBACK_SNIPPET_LIMIT = 1200;
const GIT_WORKFLOW_ACTIVE_INDEX = {
  add: 0,
  generate: 1,
  generating: 1,
  message: 2,
  committing: 2,
  push: 3,
  pushing: 3,
  done: 4,
};

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMobileView() {
  return mobileViewMedia?.matches || false;
}

function readStoredSidePanelCollapsed() {
  try {
    const stored = localStorage.getItem(SIDE_PANEL_STORAGE_KEY);
    return stored === null ? null : stored === "1";
  } catch {
    return null;
  }
}

function setComposerActionsOpen(open) {
  const shouldOpen = open && isMobileView();
  document.body.classList.toggle("composer-actions-open", shouldOpen);
  elements.composerActionsButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

function isRunActive() {
  return !!currentState?.isStreaming;
}

function resizePromptInput() {
  const input = elements.promptInput;
  input.style.height = "auto";
  const maxHeight = Number.parseFloat(getComputedStyle(input).maxHeight);
  const nextHeight = Number.isFinite(maxHeight) ? Math.min(input.scrollHeight, maxHeight) : input.scrollHeight;
  input.style.height = `${Math.ceil(nextHeight)}px`;
  input.style.overflowY = Number.isFinite(maxHeight) && input.scrollHeight > maxHeight + 1 ? "auto" : "hidden";
}

function updateComposerModeButtons() {
  const runActive = isRunActive();
  const target = runActive ? elements.composerRow : elements.composerActionsPanel;
  const before = runActive ? elements.sendButton : null;
  for (const button of [elements.steerButton, elements.followUpButton]) {
    if (button.parentElement !== target) target.insertBefore(button, before);
  }
  document.body.classList.toggle("pi-run-active", runActive);
}

function updateFooterModelPickerPosition() {
  if (!footerModelPickerOpen || !isMobileView()) {
    document.documentElement.style.removeProperty("--footer-model-picker-bottom");
    return;
  }
  const viewportHeight = window.innerHeight || window.visualViewport?.height || document.documentElement.clientHeight;
  const statusTop = elements.statusBar.getBoundingClientRect().top;
  const bottom = Math.max(8, Math.round(viewportHeight - statusTop + 6));
  document.documentElement.style.setProperty("--footer-model-picker-bottom", `${bottom}px`);
}

function setMobileFooterExpanded(expanded) {
  mobileFooterExpanded = expanded && isMobileView();
  if (mobileFooterExpanded && footerModelPickerOpen) {
    footerModelPickerOpen = false;
    document.body.classList.remove("footer-model-picker-open");
    elements.statusBar.querySelector(".footer-model-picker")?.remove();
  }
  document.body.classList.toggle("footer-details-expanded", mobileFooterExpanded);
  const button = elements.statusBar.querySelector(".footer-details-toggle");
  if (button) {
    button.textContent = mobileFooterExpanded ? "Less" : "Details";
    button.setAttribute("aria-expanded", mobileFooterExpanded ? "true" : "false");
  }
  updateFooterModelPickerPosition();
}

function setMobileTabsExpanded(expanded) {
  mobileTabsExpanded = expanded && isMobileView();
  document.body.classList.toggle("mobile-tabs-expanded", mobileTabsExpanded);
  elements.terminalTabsToggleButton.setAttribute("aria-expanded", mobileTabsExpanded ? "true" : "false");
}

function syncMobileSidePanelState(collapsed) {
  const showBackdrop = !collapsed && isMobileView();
  elements.sidePanelBackdrop.hidden = !showBackdrop;
  if (showBackdrop) elements.sidePanel.setAttribute("aria-modal", "true");
  else elements.sidePanel.removeAttribute("aria-modal");
}

function setSidePanelCollapsed(collapsed, { persist = true, focusPanel = false } = {}) {
  document.body.classList.toggle("side-panel-collapsed", collapsed);
  elements.toggleSidePanelButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
  elements.toggleSidePanelButton.setAttribute("title", collapsed ? "Expand side panel" : "Collapse side panel");
  elements.toggleSidePanelButton.setAttribute("aria-label", collapsed ? "Expand side panel" : "Collapse side panel");
  elements.sidePanelExpandButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
  syncMobileSidePanelState(collapsed);

  if (!collapsed && focusPanel && isMobileView()) {
    requestAnimationFrame(() => elements.toggleSidePanelButton.focus());
  }

  if (!persist || isMobileView()) return;
  try {
    localStorage.setItem(SIDE_PANEL_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures; the toggle should still work for this page load.
  }
}

function restoreSidePanelState() {
  if (isMobileView()) {
    setSidePanelCollapsed(true, { persist: false });
    return;
  }
  const stored = readStoredSidePanelCollapsed();
  setSidePanelCollapsed(stored ?? false, { persist: stored !== null });
}

function bindMobileViewChanges() {
  if (!mobileViewMedia) return;
  const syncForViewport = (event) => {
    setComposerActionsOpen(false);
    setMobileFooterExpanded(false);
    setMobileTabsExpanded(false);
    if (event.matches) {
      setSidePanelCollapsed(true, { persist: false });
      return;
    }
    const stored = readStoredSidePanelCollapsed();
    setSidePanelCollapsed(stored ?? false, { persist: false });
  };
  if (typeof mobileViewMedia.addEventListener === "function") mobileViewMedia.addEventListener("change", syncForViewport);
  else mobileViewMedia.addListener?.(syncForViewport);
}

function updateVisualViewportVars() {
  const viewport = window.visualViewport;
  const viewportHeight = viewport?.height || window.innerHeight || document.documentElement.clientHeight;
  const offsetTop = viewport?.offsetTop || 0;
  const layoutHeight = window.innerHeight || viewportHeight;
  if (viewportHeight > maxVisualViewportHeight) maxVisualViewportHeight = viewportHeight;
  const keyboardInset = viewport ? Math.max(0, Math.round(layoutHeight - viewportHeight - offsetTop)) : 0;
  const promptFocused = document.activeElement === elements.promptInput;
  const keyboardOpen = isMobileView() && promptFocused && (keyboardInset > 80 || maxVisualViewportHeight - viewportHeight > 120);
  document.documentElement.style.setProperty("--visual-viewport-height", `${Math.round(viewportHeight)}px`);
  document.documentElement.style.setProperty("--visual-viewport-offset-top", `${Math.round(offsetTop)}px`);
  document.documentElement.style.setProperty("--keyboard-inset-bottom", `${keyboardInset}px`);
  document.body.classList.toggle("mobile-keyboard-open", keyboardOpen);
  if (keyboardOpen) {
    setComposerActionsOpen(false);
    setMobileTabsExpanded(false);
    setMobileFooterExpanded(false);
    setFooterModelPickerOpen(false);
    syncMobileChatToBottomForInput();
  }
  updateFooterModelPickerPosition();
}

function installViewportHandlers() {
  updateVisualViewportVars();
  const update = () => updateVisualViewportVars();
  window.visualViewport?.addEventListener("resize", update, { passive: true });
  window.visualViewport?.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(update, 80));
}

function registerPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) {
    addEvent("PWA install needs HTTPS or localhost for service-worker support on most mobile browsers.", "warn");
    return;
  }
  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    addEvent(`PWA service worker registration failed: ${error.message}`, "warn");
  });
}

function scopedApiPath(path, tabId = activeTabId) {
  if (!tabId || !path.startsWith("/api/") || path === "/api/tabs" || path.startsWith("/api/tabs?") || path.startsWith("/api/tabs/")) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("tab", tabId);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function api(path, { method = "GET", body, tabId = activeTabId, scoped = true, signal } = {}) {
  const response = await fetch(scoped ? scopedApiPath(path, tabId) : path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || JSON.stringify(data));
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function storedThemeName() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_NAME;
  } catch {
    return DEFAULT_THEME_NAME;
  }
}

function storeThemeName(name) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    // Ignore storage failures; theme switching should still work for this page load.
  }
}

function displayThemeName(name) {
  return String(name || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function resolveThemeValue(theme, value, fallback, seen = new Set()) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^(#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(raw)) return raw;
  if (seen.has(raw)) return fallback;
  seen.add(raw);
  return resolveThemeValue(theme, theme?.vars?.[raw] ?? theme?.colors?.[raw], fallback, seen);
}

function themeColor(theme, key, fallback) {
  return resolveThemeValue(theme, theme?.colors?.[key] ?? theme?.vars?.[key], fallback);
}

function themeExportColor(theme, key, fallback) {
  return resolveThemeValue(theme, theme?.export?.[key], fallback);
}

function hexToRgb(color) {
  const raw = String(color || "").trim();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].split("").map((ch) => ch + ch).join("") : match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function colorWithAlpha(color, alpha, fallback) {
  const rgb = hexToRgb(color);
  if (!rgb) return fallback;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function rgbTriplet(color, fallback) {
  const rgb = hexToRgb(color);
  if (!rgb) return fallback;
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

function cssColorToRgb(color) {
  const hex = hexToRgb(color);
  if (hex) return hex;
  const match = String(color || "").trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!match) return null;
  const [r, g, b] = match.slice(1, 4).map((value) => Math.min(255, Math.max(0, Number(value))));
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

function mixRgb(left, right, amount) {
  const t = Math.min(1, Math.max(0, amount));
  return {
    r: left.r + (right.r - left.r) * t,
    g: left.g + (right.g - left.g) * t,
    b: left.b + (right.b - left.b) * t,
  };
}

function rgbColor(rgb) {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

function rgbaColor(rgb, alpha) {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

function relativeLuminance(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function applyTheme(theme, { persist = false, announce = false } = {}) {
  if (!theme) return;
  const root = document.documentElement;
  const current = getComputedStyle(root);
  const fallback = (name, value) => current.getPropertyValue(name).trim() || value;

  const accent = themeColor(theme, "accent", fallback("--ctp-blue", "#89b4fa"));
  const accent2 = themeColor(theme, "borderAccent", themeColor(theme, "accent2", fallback("--ctp-teal", "#94e2d5")));
  const green = themeColor(theme, "success", fallback("--ctp-green", "#a6e3a1"));
  const red = themeColor(theme, "error", fallback("--ctp-red", "#f38ba8"));
  const yellow = themeColor(theme, "warning", fallback("--ctp-yellow", "#f9e2af"));
  const text = themeColor(theme, "userMessageText", themeColor(theme, "text", fallback("--ctp-text", "#cdd6f4")));
  const muted = themeColor(theme, "muted", fallback("--ctp-subtext", "#bac2de"));
  const dim = themeColor(theme, "dim", fallback("--ctp-overlay", "#6c7086"));
  const borderMuted = themeColor(theme, "borderMuted", dim);
  const selectedBg = themeColor(theme, "selectedBg", fallback("--ctp-surface", "#313244"));
  const cardBg = themeExportColor(theme, "cardBg", themeColor(theme, "userMessageBg", fallback("--ctp-base", "#1e1e2e")));
  const pageBg = themeExportColor(theme, "pageBg", fallback("--ctp-crust", "#11111b"));
  const infoBg = themeExportColor(theme, "infoBg", themeColor(theme, "customMessageBg", fallback("--ctp-mantle", "#181825")));
  const pendingBg = themeColor(theme, "toolPendingBg", infoBg);
  const pink = themeColor(theme, "mdHeading", themeColor(theme, "customMessageLabel", fallback("--ctp-pink", "#f5c2e7")));
  const mauve = themeColor(theme, "customMessageLabel", themeColor(theme, "thinkingHigh", fallback("--ctp-mauve", "#cba6f7")));
  const peach = themeColor(theme, "syntaxNumber", yellow);
  const sky = themeColor(theme, "mdListBullet", accent2);
  const sapphire = themeColor(theme, "thinkingLow", accent);
  const lavender = themeColor(theme, "thinkingHigh", mauve);
  const isLight = relativeLuminance(pageBg) > 0.62;
  const panelAlpha = isLight ? 0.86 : 0.72;
  const panel2Alpha = isLight ? 0.90 : 0.78;
  const panel3Alpha = isLight ? 0.94 : 0.92;
  const borderAlpha = isLight ? 0.34 : 0.22;

  const vars = {
    "--theme-color-scheme": isLight ? "light" : "dark",
    "--ctp-rosewater": themeColor(theme, "customMessageText", text),
    "--ctp-flamingo": pink,
    "--ctp-pink": pink,
    "--ctp-mauve": mauve,
    "--ctp-red": red,
    "--ctp-maroon": themeColor(theme, "toolDiffRemoved", red),
    "--ctp-peach": peach,
    "--ctp-yellow": yellow,
    "--ctp-green": green,
    "--ctp-teal": accent2,
    "--ctp-sky": sky,
    "--ctp-sapphire": sapphire,
    "--ctp-blue": accent,
    "--ctp-lavender": lavender,
    "--ctp-text": text,
    "--ctp-subtext": muted,
    "--ctp-overlay": borderMuted,
    "--ctp-surface": selectedBg,
    "--ctp-base": cardBg,
    "--ctp-mantle": pendingBg,
    "--ctp-crust": pageBg,
    "--ctp-text-rgb": rgbTriplet(text, "205, 214, 244"),
    "--ctp-subtext-rgb": rgbTriplet(muted, "186, 194, 222"),
    "--ctp-overlay-rgb": rgbTriplet(borderMuted, "108, 112, 134"),
    "--ctp-surface-rgb": rgbTriplet(selectedBg, "49, 50, 68"),
    "--ctp-base-rgb": rgbTriplet(cardBg, "30, 30, 46"),
    "--ctp-mantle-rgb": rgbTriplet(pendingBg, "24, 24, 37"),
    "--ctp-crust-rgb": rgbTriplet(pageBg, "17, 17, 27"),
    "--bg": pageBg,
    "--panel": colorWithAlpha(cardBg, panelAlpha, cardBg),
    "--panel-2": colorWithAlpha(selectedBg, panel2Alpha, selectedBg),
    "--panel-3": colorWithAlpha(pendingBg, panel3Alpha, pendingBg),
    "--text": text,
    "--muted": muted,
    "--border": colorWithAlpha(lavender, borderAlpha, lavender),
    "--accent": mauve,
    "--accent-2": accent2,
    "--accent-3": pink,
    "--danger": red,
    "--warning": yellow,
    "--ok": green,
    "--shadow": colorWithAlpha(isLight ? borderMuted : pageBg, isLight ? 0.24 : 0.78, isLight ? "rgba(108, 111, 133, 0.24)" : "rgba(17, 17, 27, 0.78)"),
    "--glow-mauve": colorWithAlpha(mauve, isLight ? 0.24 : 0.42, mauve),
    "--glow-blue": colorWithAlpha(accent, isLight ? 0.22 : 0.36, accent),
    "--glow-pink": colorWithAlpha(pink, isLight ? 0.22 : 0.34, pink),
    "--glow-teal": colorWithAlpha(accent2, isLight ? 0.20 : 0.26, accent2),
    "--panel-gradient": `linear-gradient(145deg, ${colorWithAlpha(selectedBg, panel2Alpha, selectedBg)}, ${colorWithAlpha(pendingBg, panel3Alpha, pendingBg)} 52%, ${colorWithAlpha(pageBg, isLight ? 0.92 : 0.9, pageBg)})`,
    "--neon-gradient": `linear-gradient(120deg, ${pink}, ${mauve} 32%, ${accent} 66%, ${accent2})`,
    "--context-card-gradient": `linear-gradient(100deg, ${colorWithAlpha(green, isLight ? 0.48 : 0.62, green)} 0%, ${colorWithAlpha(yellow, isLight ? 0.50 : 0.66, yellow)} 36%, ${colorWithAlpha(accent, isLight ? 0.50 : 0.64, accent)} 62%, ${colorWithAlpha(red, isLight ? 0.62 : 0.78, red)} 100%)`,
    "--background-glow-pink": colorWithAlpha(pink, isLight ? 0.16 : 0.34, pink),
    "--background-glow-blue": colorWithAlpha(accent, isLight ? 0.15 : 0.32, accent),
    "--background-glow-teal": colorWithAlpha(accent2, isLight ? 0.12 : 0.20, accent2),
  };

  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.style.colorScheme = isLight ? "light" : "dark";
  document.body.classList.toggle("theme-light", isLight);
  document.body.classList.toggle("theme-dark", !isLight);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", pageBg);
  currentThemeName = theme.name;
  if (elements.themeSelect && elements.themeSelect.value !== theme.name) elements.themeSelect.value = theme.name;
  if (persist) storeThemeName(theme.name);
  if (announce) addEvent(`theme changed to ${theme.label || displayThemeName(theme.name) || theme.name}`);
}

function renderThemeSelect({ unavailableLabel = "Theme bundle unavailable" } = {}) {
  if (!elements.themeSelect) return;
  elements.themeSelect.replaceChildren();
  if (!availableThemes.length) {
    const option = make("option", undefined, unavailableLabel);
    option.value = "";
    elements.themeSelect.append(option);
    elements.themeSelect.disabled = true;
    return;
  }
  elements.themeSelect.disabled = false;
  for (const theme of availableThemes) {
    const option = make("option", undefined, theme.label || displayThemeName(theme.name) || theme.name);
    option.value = theme.name;
    elements.themeSelect.append(option);
  }
  elements.themeSelect.value = currentThemeName;
}

function setThemeByName(name, options = {}) {
  const theme = availableThemes.find((item) => item.name === name);
  if (!theme) return;
  applyTheme(theme, options);
}

async function initializeThemes() {
  let response;
  try {
    response = await api("/api/themes", { scoped: false });
  } catch (error) {
    availableThemes = [];
    const label = error.statusCode === 404 ? "Restart Web UI to load themes" : "Theme bundle unavailable";
    renderThemeSelect({ unavailableLabel: label });
    throw error;
  }
  availableThemes = Array.isArray(response.data?.themes) ? response.data.themes : [];
  const stored = storedThemeName();
  currentThemeName = availableThemes.some((theme) => theme.name === stored) ? stored : DEFAULT_THEME_NAME;
  renderThemeSelect();
  setThemeByName(currentThemeName, { persist: false });
  if (!availableThemes.some((theme) => theme.name === currentThemeName) && availableThemes[0]) applyTheme(availableThemes[0], { persist: false });
  if (!availableThemes.length) addEvent("theme bundle unavailable; using built-in default theme", "warn");
}

function activeTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
}

function normalizeTabActivity(activity = {}) {
  const status = activity.status === "working" || activity.isWorking ? "working" : activity.status === "done" ? "done" : "idle";
  const completionSerial = Number(activity.completionSerial);
  return {
    ...activity,
    status,
    isWorking: status === "working",
    completionSerial: Number.isFinite(completionSerial) ? completionSerial : 0,
  };
}

function normalizePendingExtensionUiRequestCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function tabPendingBlockerCount(tab) {
  return normalizePendingExtensionUiRequestCount(tab?.pendingExtensionUiRequestCount);
}

function setTabPendingBlockerCount(tabId, count) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  const previous = tabPendingBlockerCount(tab);
  const next = normalizePendingExtensionUiRequestCount(count);
  if (previous === next) return false;
  tab.pendingExtensionUiRequestCount = next;
  if (next === 0) clearBlockedTabNotificationKeys(tabId);
  return true;
}

function decrementTabPendingBlockerCount(tabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  return setTabPendingBlockerCount(tabId, Math.max(0, tabPendingBlockerCount(tab) - 1));
}

function tabActivityStateChanged(previous, next) {
  return !previous || previous.status !== next.status || previous.isWorking !== next.isWorking || previous.completionSerial !== next.completionSerial;
}

function setTabActivity(tabId, activity = {}) {
  if (!tabId) return null;
  const previous = tabActivities.get(tabId);
  const normalized = normalizeTabActivity(activity);
  tabActivities.set(tabId, normalized);
  if (!tabSeenCompletionSerials.has(tabId) || (previous && normalized.completionSerial < previous.completionSerial)) {
    tabSeenCompletionSerials.set(tabId, normalized.completionSerial);
  }
  return normalized;
}

function syncTabMetadata(nextTabs = []) {
  const liveIds = new Set();
  for (const tab of nextTabs) {
    if (!tab?.id) continue;
    liveIds.add(tab.id);
    setTabActivity(tab.id, tab.activity);
  }
  for (const tabId of tabActivities.keys()) {
    if (!liveIds.has(tabId)) {
      tabActivities.delete(tabId);
      tabSeenCompletionSerials.delete(tabId);
      actionFeedbackByTab.delete(tabId);
    }
  }
}

function applyTabMetadata(tab) {
  if (!tab?.id) return false;
  const index = tabs.findIndex((item) => item.id === tab.id);
  if (index === -1) tabs.push(tab);
  else tabs[index] = { ...tabs[index], ...tab };
  if (tab.activity) setTabActivity(tab.id, tab.activity);
  renderTabs();
  return true;
}

function applyResponseTab(response) {
  return applyTabMetadata(response?.tab || response?.data?.tab);
}

function activityForTab(tab) {
  if (!tab?.id) return normalizeTabActivity();
  return tabActivities.get(tab.id) || setTabActivity(tab.id, tab.activity) || normalizeTabActivity();
}

function tabIndicator(tab) {
  const activity = activityForTab(tab);
  const pendingBlockerCount = tabPendingBlockerCount(tab);
  if (tab?.running && pendingBlockerCount > 0) {
    return {
      state: "blocked",
      label: pendingBlockerCount === 1 ? "Blocked waiting for response" : `Blocked waiting on ${pendingBlockerCount} responses`,
      meta: pendingBlockerCount === 1 ? "blocked" : `blocked · ${pendingBlockerCount}`,
      glyph: "!",
    };
  }
  if (tab?.running && activity.isWorking) {
    return { state: "working", label: "Working", meta: "working", glyph: "●" };
  }
  const seenSerial = tabSeenCompletionSerials.get(tab?.id) ?? activity.completionSerial;
  if (tab?.running && activity.completionSerial > seenSerial) {
    return { state: "done", label: "Work done", meta: "done", glyph: "◆" };
  }
  return { state: "idle", label: tab?.running ? "Idle" : "Stopped", meta: tab?.running ? "idle" : "stopped", glyph: "○" };
}

function hasWorkingTab() {
  return tabs.some((tab) => ["working", "blocked"].includes(tabIndicator(tab).state));
}

function scheduleRefreshTabs(delay = 1500) {
  clearTimeout(refreshTabsTimer);
  refreshTabsTimer = setTimeout(() => {
    refreshTabsTimer = null;
    if (openTerminalTabGroupKey) {
      scheduleRefreshTabs(600);
      return;
    }
    refreshTabs().catch((error) => addEvent(error.message, "error"));
  }, delay);
}

function syncTabPolling() {
  if (hasWorkingTab()) {
    if (!refreshTabsTimer) scheduleRefreshTabs();
  } else {
    clearTimeout(refreshTabsTimer);
    refreshTabsTimer = null;
  }
}

function markTabWorkingLocally(tabId = activeTabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  const previous = activityForTab(tab);
  const next = normalizeTabActivity({ ...previous, status: "working", isWorking: true });
  tabActivities.set(tabId, next);
  if (tabActivityStateChanged(previous, next)) renderTabs();
  return true;
}

function markTabIdleLocally(tabId = activeTabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  const previous = activityForTab(tab);
  const next = normalizeTabActivity({ ...previous, status: "idle", isWorking: false });
  tabActivities.set(tabId, next);
  if (tabActivityStateChanged(previous, next)) renderTabs();
  return true;
}

function markTabDoneLocally(tabId = activeTabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  const previous = activityForTab(tab);
  const next = normalizeTabActivity({
    ...previous,
    status: "done",
    isWorking: false,
    completionSerial: (Number(previous.completionSerial) || 0) + 1,
    lastCompletedAt: new Date().toISOString(),
  });
  tabActivities.set(tabId, next);
  if (tabActivityStateChanged(previous, next)) renderTabs();
  return true;
}

function tabActivityRecentlyStarted(activity, nowMs = Date.now()) {
  const startedMs = Date.parse(activity?.lastStartedAt || activity?.lastChangedAt || "");
  return Number.isFinite(startedMs) && nowMs - startedMs < TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS;
}

function stateHasVisibleWork(state) {
  return !!state?.isStreaming || !!state?.isCompacting || Number(state?.pendingMessageCount || 0) > 0;
}

function syncActiveTabActivityFromState(state = currentState) {
  const tab = activeTab();
  if (!tab || !state || typeof state !== "object") return false;
  const activity = activityForTab(tab);
  if (tabPendingBlockerCount(tab) > 0) {
    if (!activity.isWorking) return markTabWorkingLocally(tab.id);
    return false;
  }
  if (stateHasVisibleWork(state)) {
    if (!activity.isWorking) return markTabWorkingLocally(tab.id);
    return false;
  }
  if (activity.isWorking && !tabActivityRecentlyStarted(activity)) return markTabDoneLocally(tab.id);
  return false;
}

function markTabOutputSeen(tabId = activeTabId, { force = false } = {}) {
  if (!tabId) return false;
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return false;
  const activity = activityForTab(tab);
  if (activity.isWorking) return false;
  if (!force && tabId === activeTabId && !(autoFollowChat || isChatNearBottom())) return false;
  const completionSerial = activity.completionSerial || 0;
  const previousSerial = tabSeenCompletionSerials.get(tabId) ?? 0;
  if (previousSerial >= completionSerial) return false;
  tabSeenCompletionSerials.set(tabId, completionSerial);
  renderTabs();
  return true;
}

function ingestEventTabActivity(event) {
  if (!event?.tabId) return;
  const tab = tabs.find((item) => item.id === event.tabId);
  let changed = false;
  if (tab && event.tabTitle && tab.title !== event.tabTitle) {
    tab.title = event.tabTitle;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(event, "pendingExtensionUiRequestCount")) {
    changed = setTabPendingBlockerCount(event.tabId, event.pendingExtensionUiRequestCount) || changed;
  }
  if (event.tabActivity) {
    const previous = tabActivities.get(event.tabId);
    const next = setTabActivity(event.tabId, event.tabActivity);
    changed = tabActivityStateChanged(previous, next) || changed;
  }
  if (changed) renderTabs();
}

function rememberActiveTab() {
  try {
    if (activeTabId) localStorage.setItem(TAB_STORAGE_KEY, activeTabId);
  } catch {
    // Ignore storage failures; tabs still work for this page load.
  }
}

function restoreStoredTabId() {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function updateDocumentTitle() {
  const tab = activeTab();
  document.title = tab ? `Pi Web UI · ${tab.title}` : "Pi Web UI";
}

function saveActiveDraft() {
  if (activeTabId) tabDrafts.set(activeTabId, elements.promptInput.value || "");
}

function restoreActiveDraft() {
  elements.promptInput.value = activeTabId ? tabDrafts.get(activeTabId) || "" : "";
  resizePromptInput();
  renderCommandSuggestions();
}

function focusPromptInput({ defer = false } = {}) {
  const focus = () => {
    if (!elements.promptInput || elements.dialog.open || elements.pathPickerDialog.open || document.visibilityState === "hidden") return;
    try {
      elements.promptInput.focus({ preventScroll: true });
    } catch {
      elements.promptInput.focus();
    }
    syncMobileChatToBottomForInput();
    setTimeout(updateVisualViewportVars, 0);
  };
  if (defer) requestAnimationFrame(focus);
  else focus();
}

function clearRefreshTimers() {
  clearTimeout(refreshMessagesTimer);
  clearTimeout(refreshStateTimer);
  clearTimeout(refreshFooterTimer);
  refreshMessagesTimer = null;
  refreshStateTimer = null;
  refreshFooterTimer = null;
}

function cancelPendingDialogs() {
  const pending = activeDialog ? [activeDialog] : [];
  pending.push(...dialogQueue.splice(0));
  for (const request of pending) {
    if (!request?.id || !EXTENSION_UI_BLOCKING_METHODS.has(request.method)) continue;
    api("/api/extension-ui-response", {
      method: "POST",
      body: { type: "extension_ui_response", id: request.id, cancelled: true },
      tabId: request.tabId || activeTabId,
    }).catch((error) => console.warn("failed to cancel stale extension dialog", error));
  }
  activeDialog = null;
  if (elements.dialog.open) elements.dialog.close();
}

function resetActiveTabUi() {
  clearRefreshTimers();
  eventSource?.close();
  eventSource = null;
  currentState = null;
  latestStats = null;
  latestWorkspace = null;
  latestMessages = [];
  currentRunStartedAt = null;
  currentRunStreamChars = 0;
  latestTokPerSecond = null;
  clearRunIndicatorActivity({ render: false });
  statusEntries.clear();
  widgets.clear();
  transientMessages = [];
  availableCommands = [];
  commandSuggestions = [];
  pathSuggestions = [];
  suggestionMode = "none";
  commandSuggestIndex = 0;
  resetStreamBubble();
  removeRunIndicatorBubble();
  hideCommandSuggestions();
  cancelPendingDialogs();
  Object.assign(gitWorkflow, {
    active: false,
    step: "idle",
    busy: false,
    output: "",
    error: "",
    message: null,
    messageRequestedAt: 0,
  });
  resetChatOutput();
  elements.stateDetails.replaceChildren();
  elements.eventLog.replaceChildren();
  elements.queueBox.textContent = "No queued messages.";
  elements.queueBox.classList.add("muted");
  elements.commandsBox.textContent = "Loading…";
  elements.commandsBox.classList.add("muted");
  elements.sessionLine.textContent = activeTab() ? "Connecting…" : "No terminal tabs.";
  renderWidgets();
  renderGitWorkflow();
  renderFooter();
  renderFeedbackTray();
}

function tabGroupStatusRank(state) {
  const index = TAB_GROUP_STATUS_PRIORITY.indexOf(state);
  return index === -1 ? TAB_GROUP_STATUS_PRIORITY.indexOf("idle") : index;
}

function tabGroupIndicator(groupTabs) {
  let selected = null;
  let selectedRank = Number.POSITIVE_INFINITY;
  for (const tab of groupTabs) {
    const indicator = tabIndicator(tab);
    const rank = tabGroupStatusRank(indicator.state);
    if (rank < selectedRank) {
      selected = indicator;
      selectedRank = rank;
    }
  }
  return selected || { state: "idle", label: "Idle", meta: "idle", glyph: "○" };
}

function tabCwdGroupKey(tab) {
  const cwd = String(tab?.cwd || "");
  return cwd ? `cwd:${cwd}` : `tab:${tab?.id || "unknown"}`;
}

function tabCwdGroups() {
  const groups = [];
  const byKey = new Map();
  for (const tab of tabs) {
    const key = tabCwdGroupKey(tab);
    let group = byKey.get(key);
    if (!group) {
      group = { key, cwd: tab.cwd || "", tabs: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.tabs.push(tab);
  }
  return groups;
}

function tabGroupTitle(cwd, fallback = "cwd") {
  const normalized = normalizeDisplayPath(cwd).replace(/\/+$/, "");
  const leaf = normalized.split("/").filter(Boolean).pop() || normalized || fallback;
  return leaf.length > 26 ? `…${leaf.slice(-25)}` : leaf;
}

function terminalTabMeta(tab, indicator) {
  return tab.running ? `${indicator.meta} · pid ${tab.pid || "…"}` : "stopped";
}

function appendTerminalTabContent(button, { title, indicator, meta, count = null }) {
  const titleRow = make("span", "terminal-tab-title-row");
  const indicatorDot = make("span", "terminal-tab-activity-indicator");
  indicatorDot.setAttribute("aria-hidden", "true");
  titleRow.append(indicatorDot, make("span", "terminal-tab-title", title));
  if (count !== null) titleRow.append(make("span", "terminal-tab-group-count", String(count)));
  button.append(titleRow, make("span", "terminal-tab-meta", meta));
}

function renderTerminalTab(tab) {
  const isActive = tab.id === activeTabId;
  const indicator = tabIndicator(tab);
  const wrapper = make("div", `terminal-tab activity-${indicator.state}${isActive ? " active" : ""}${tab.running ? "" : " stopped"}`);
  const button = make("button", "terminal-tab-button");
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", isActive ? "true" : "false");
  button.setAttribute("aria-label", `${tab.title}: ${indicator.label}`);
  button.title = `${tab.title} · ${indicator.label}${tab.running ? ` · pid ${tab.pid || "starting"}` : " · stopped"}`;
  appendTerminalTabContent(button, { title: tab.title, indicator, meta: terminalTabMeta(tab, indicator) });
  button.addEventListener("click", () => switchTab(tab.id));
  wrapper.append(button);

  if (tabs.length > 1) {
    const close = make("button", "terminal-tab-close", "×");
    close.type = "button";
    close.title = `Close ${tab.title}`;
    close.setAttribute("aria-label", `Close ${tab.title}`);
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTerminalTab(tab.id);
    });
    wrapper.append(close);
  }

  return wrapper;
}

function renderTerminalTabGroupItem(tab) {
  const isActive = tab.id === activeTabId;
  const indicator = tabIndicator(tab);
  const item = make("div", `terminal-tab-group-item activity-${indicator.state}${isActive ? " active" : ""}${tab.running ? "" : " stopped"}`);
  const button = make("button", "terminal-tab-button terminal-tab-group-item-button");
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", isActive ? "true" : "false");
  button.setAttribute("aria-label", `${tab.title}: ${indicator.label}`);
  button.title = `${tab.title} · ${indicator.label}${tab.running ? ` · pid ${tab.pid || "starting"}` : " · stopped"}`;
  appendTerminalTabContent(button, { title: tab.title, indicator, meta: terminalTabMeta(tab, indicator) });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    switchTab(tab.id);
  });
  item.append(button);

  if (tabs.length > 1) {
    const close = make("button", "terminal-tab-close terminal-tab-group-item-close", "×");
    close.type = "button";
    close.title = `Close ${tab.title}`;
    close.setAttribute("aria-label", `Close ${tab.title}`);
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTerminalTab(tab.id);
    });
    item.append(close);
  }

  return item;
}

function shouldRenderTerminalTabGroup(group, groupCount) {
  return groupCount > 1 && group.tabs.length > 1 && Boolean(group.cwd);
}

function renderTerminalTabGroup(group) {
  const groupTabs = group.tabs;
  const activeGroupTab = groupTabs.find((tab) => tab.id === activeTabId) || groupTabs[0];
  const isActive = groupTabs.some((tab) => tab.id === activeTabId);
  const isStopped = groupTabs.every((tab) => !tab.running);
  const indicator = tabGroupIndicator(groupTabs);
  const title = tabGroupTitle(group.cwd, activeGroupTab?.title || "cwd");
  const displayCwd = normalizeDisplayPath(group.cwd || title);
  const wrapper = make("div", `terminal-tab terminal-tab-group activity-${indicator.state}${isActive ? " active" : ""}${isStopped ? " stopped" : ""}`);
  wrapper.dataset.groupKey = group.key;
  wrapper.addEventListener("pointerenter", () => setOpenTerminalTabGroup(group.key));
  wrapper.addEventListener("pointerleave", () => clearOpenTerminalTabGroup(group.key));
  wrapper.addEventListener("focusin", () => setOpenTerminalTabGroup(group.key));
  wrapper.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!wrapper.contains(document.activeElement)) clearOpenTerminalTabGroup(group.key);
    }, 0);
  });
  const button = make("button", "terminal-tab-button terminal-tab-group-button");
  button.type = "button";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", isActive ? "true" : "false");
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", group.key === openTerminalTabGroupKey ? "true" : "false");
  button.setAttribute("aria-label", `${title} group: ${groupTabs.length} tabs, ${indicator.label}. Active ${activeGroupTab?.title || "terminal"}`);
  button.title = `${displayCwd} · ${groupTabs.length} tabs · ${indicator.label}`;
  appendTerminalTabContent(button, { title, indicator, meta: `${indicator.meta} · ${groupTabs.length} tabs`, count: groupTabs.length });
  button.addEventListener("click", () => switchTab(activeGroupTab.id));
  wrapper.append(button);

  const menu = make("div", "terminal-tab-group-menu");
  menu.setAttribute("role", "group");
  menu.setAttribute("aria-label", `${displayCwd} tabs`);
  for (const tab of groupTabs) menu.append(renderTerminalTabGroupItem(tab));

  const add = make("button", "terminal-tab-group-add", "+ Tab");
  add.type = "button";
  add.title = `Add tab in ${displayCwd}`;
  add.setAttribute("aria-label", `Add tab in ${displayCwd}`);
  add.addEventListener("click", (event) => {
    event.stopPropagation();
    createTerminalTab(group.cwd, { triggerButton: add });
  });
  menu.append(add);
  wrapper.append(menu);
  return wrapper;
}

function updateTerminalTabGroupOpenState() {
  for (const group of elements.tabBar.querySelectorAll(".terminal-tab-group")) {
    const open = Boolean(openTerminalTabGroupKey && group.dataset.groupKey === openTerminalTabGroupKey);
    group.classList.toggle("menu-open", open);
    group.querySelector(".terminal-tab-group-button")?.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function setOpenTerminalTabGroup(groupKey) {
  if (!groupKey || openTerminalTabGroupKey === groupKey) return;
  openTerminalTabGroupKey = groupKey;
  updateTerminalTabGroupOpenState();
}

function clearOpenTerminalTabGroup(groupKey, { force = false } = {}) {
  if (!openTerminalTabGroupKey || (!force && openTerminalTabGroupKey !== groupKey)) return;
  openTerminalTabGroupKey = null;
  updateTerminalTabGroupOpenState();
  syncTabPolling();
}

function renderTabs() {
  const active = activeTab();
  const activeIndicator = active ? tabIndicator(active) : null;
  elements.terminalTabsToggleButton.textContent = active ? `${activeIndicator.glyph} ${active.title}${tabs.length > 1 ? ` · ${tabs.length}` : ""}` : "Tabs";
  elements.terminalTabsToggleButton.title = active ? `Show terminal tabs · active: ${active.title} · ${activeIndicator.label}` : "Show terminal tabs";
  elements.tabBar.replaceChildren();
  const groups = tabCwdGroups();
  const renderedGroupKeys = new Set(groups.filter((group) => shouldRenderTerminalTabGroup(group, groups.length)).map((group) => group.key));
  if (openTerminalTabGroupKey && !renderedGroupKeys.has(openTerminalTabGroupKey)) openTerminalTabGroupKey = null;
  for (const group of groups) {
    if (shouldRenderTerminalTabGroup(group, groups.length)) {
      elements.tabBar.append(renderTerminalTabGroup(group));
    } else {
      for (const tab of group.tabs) elements.tabBar.append(renderTerminalTab(tab));
    }
  }
  elements.tabBar.append(elements.newTabButton);
  updateTerminalTabGroupOpenState();
  setMobileTabsExpanded(mobileTabsExpanded);
  updateDocumentTitle();
  syncTabPolling();
}

async function refreshTabs({ selectStored = false } = {}) {
  const previousTabs = tabs;
  const response = await api("/api/tabs", { scoped: false });
  tabs = response.data?.tabs || [];
  syncTabMetadata(tabs);
  syncBlockedTabNotificationsFromTabs(tabs, previousTabs);
  const stored = selectStored ? restoreStoredTabId() : null;
  if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
    activeTabId = (stored && tabs.some((tab) => tab.id === stored) ? stored : tabs[0]?.id) || null;
    rememberActiveTab();
  }
  renderTabs();
  return tabs;
}

async function switchTab(tabId) {
  if (!tabId || tabId === activeTabId || !tabs.some((tab) => tab.id === tabId)) return;
  clearOpenTerminalTabGroup(null, { force: true });
  setMobileTabsExpanded(false);
  footerModelPickerOpen = false;
  saveActiveDraft();
  activeTabId = tabId;
  rememberActiveTab();
  resetActiveTabUi();
  renderTabs();
  restoreActiveDraft();
  focusPromptInput({ defer: true });
  connectEvents();
  await refreshAll();
  markTabOutputSeen();
}

async function createTerminalTab(cwd = activeTab()?.cwd, { triggerButton = elements.newTabButton } = {}) {
  setMobileTabsExpanded(false);
  const disabledButtons = new Set([elements.newTabButton, triggerButton].filter(Boolean));
  for (const button of disabledButtons) button.disabled = true;
  try {
    const response = await api("/api/tabs", { method: "POST", body: { cwd: cwd || activeTab()?.cwd }, scoped: false });
    tabs = response.data?.tabs || tabs;
    syncTabMetadata(tabs);
    const tab = response.data?.tab;
    renderTabs();
    if (tab?.id) {
      await switchTab(tab.id);
      addEvent(`created isolated terminal ${tab.title}`, "info");
    }
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    for (const button of disabledButtons) button.disabled = false;
  }
}

async function closeTerminalTab(tabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab || tabs.length <= 1) return;
  if (!confirm(`Close ${tab.title}? This terminates its isolated Pi process.`)) return;

  const wasActive = tabId === activeTabId;
  const fallbackTabId = tabs.find((item) => item.id !== tabId)?.id || null;
  try {
    if (wasActive) eventSource?.close();
    const response = await api(`/api/tabs/${encodeURIComponent(tabId)}`, { method: "DELETE", scoped: false });
    tabs = response.data?.tabs || tabs.filter((item) => item.id !== tabId);
    syncTabMetadata(tabs);
    tabDrafts.delete(tabId);
    if (wasActive) {
      activeTabId = (fallbackTabId && tabs.some((item) => item.id === fallbackTabId) ? fallbackTabId : tabs[0]?.id) || null;
      rememberActiveTab();
      resetActiveTabUi();
      renderTabs();
      restoreActiveDraft();
      focusPromptInput({ defer: true });
      connectEvents();
      if (activeTabId) {
        await refreshAll();
        markTabOutputSeen();
      }
    } else {
      renderTabs();
    }
  } catch (error) {
    addEvent(error.message, "error");
  }
}

async function initializeTabs() {
  await refreshTabs({ selectStored: true });
  resetActiveTabUi();
  renderTabs();
  restoreActiveDraft();
  focusPromptInput({ defer: true });
  connectEvents();
  if (activeTabId) {
    await refreshAll();
    markTabOutputSeen();
  }
}

function addEvent(message, level = "info") {
  const line = make("div", `event ${level}`.trim());
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${message}`;
  elements.eventLog.prepend(line);
  while (elements.eventLog.children.length > 120) elements.eventLog.lastElementChild?.remove();
}

function blockedTabNotificationSupported() {
  return "Notification" in window && window.isSecureContext;
}

function blockedTabNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission || "default";
}

async function ensureBlockedTabNotificationPermission() {
  if (!blockedTabNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied" || blockedTabNotificationPermissionRequested || typeof Notification.requestPermission !== "function") return false;

  blockedTabNotificationPermissionRequested = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      addEvent("browser notifications enabled for blocked tabs", "info");
      return true;
    }
  } catch (error) {
    addEvent(`blocked-tab notification permission request failed: ${error.message}`, "warn");
  }
  return false;
}

function noteBlockedTabNotificationFallback(reason) {
  if (blockedTabNotificationFallbackNoted) return;
  blockedTabNotificationFallbackNoted = true;
  addEvent(`browser notifications unavailable for blocked tabs: ${reason}`, "warn");
}

function blockedTabNotificationDetail({ method, count } = {}) {
  if (method) return `waiting for your ${method} response`;
  if (count > 1) return `waiting for ${count} responses`;
  return "waiting for your response";
}

function blockedTabNotificationKey(tabId, request) {
  return request?.id ? `${tabId}:${request.id}` : `${tabId}:blocked`;
}

function clearBlockedTabNotificationKeys(tabId) {
  if (!tabId) return;
  const prefix = `${tabId}:`;
  blockedTabNotificationKeys = new Set([...blockedTabNotificationKeys].filter((key) => !key.startsWith(prefix)));
}

async function showBlockedTabBrowserNotification({ tabId, title, body, method, count }) {
  if (!blockedTabNotificationSupported()) {
    noteBlockedTabNotificationFallback("requires HTTPS or localhost");
    return false;
  }
  if (!(await ensureBlockedTabNotificationPermission())) {
    const permission = blockedTabNotificationPermission();
    noteBlockedTabNotificationFallback(permission === "denied" ? "permission denied" : "permission not granted");
    return false;
  }

  const options = {
    body,
    tag: `${BLOCKED_TAB_NOTIFICATION_TAG_PREFIX}:${tabId}`,
    renotify: true,
    requireInteraction: true,
    icon: BLOCKED_TAB_NOTIFICATION_ICON,
    badge: BLOCKED_TAB_NOTIFICATION_ICON,
    data: { tabId, method, count, url: location.href },
  };

  try {
    let registration = null;
    if ("serviceWorker" in navigator) {
      registration = await Promise.race([navigator.serviceWorker.ready, delay(1200).then(() => null)]).catch(() => null);
    }
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return true;
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      if (tabId && tabId !== activeTabId) switchTab(tabId).catch((error) => addEvent(error.message, "error"));
      notification.close();
    };
    return true;
  } catch (error) {
    noteBlockedTabNotificationFallback(error.message || "notification failed");
    return false;
  }
}

function notifyBlockedTab(tabOrId, { request = null, count } = {}) {
  const tabId = typeof tabOrId === "string" ? tabOrId : tabOrId?.id || request?.tabId || activeTabId;
  if (!tabId || request?.replayed) return;
  const tab = typeof tabOrId === "object" && tabOrId !== null ? tabOrId : tabs.find((item) => item.id === tabId);
  const key = blockedTabNotificationKey(tabId, request);
  if (blockedTabNotificationKeys.has(key)) return;
  blockedTabNotificationKeys.add(key);

  const pendingCount = normalizePendingExtensionUiRequestCount(count ?? request?.pendingExtensionUiRequestCount ?? tabPendingBlockerCount(tab));
  const method = request?.method && EXTENSION_UI_BLOCKING_METHODS.has(request.method) ? request.method : "";
  const tabTitle = tab?.title || request?.tabTitle || "terminal";
  const detail = blockedTabNotificationDetail({ method, count: pendingCount });
  const title = "Pi needs your response";
  const body = `${tabTitle} is blocked, ${detail}.`;
  addEvent(`${tabTitle} blocked: ${detail}`, "warn");
  showBlockedTabBrowserNotification({ tabId, title, body, method, count: pendingCount });
}

function syncBlockedTabNotificationsFromTabs(nextTabs = [], previousTabs = []) {
  if (previousTabs.length === 0) return;
  const previousCounts = new Map(previousTabs.filter((tab) => tab?.id).map((tab) => [tab.id, tabPendingBlockerCount(tab)]));
  const liveIds = new Set();
  for (const tab of nextTabs) {
    if (!tab?.id) continue;
    liveIds.add(tab.id);
    const previousCount = previousCounts.get(tab.id) || 0;
    const nextCount = tabPendingBlockerCount(tab);
    if (previousCount === 0 && nextCount > 0) notifyBlockedTab(tab, { count: nextCount });
    if (nextCount === 0) clearBlockedTabNotificationKeys(tab.id);
  }
  for (const tab of previousTabs) {
    if (tab?.id && !liveIds.has(tab.id)) clearBlockedTabNotificationKeys(tab.id);
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function stripAnsi(text) {
  return String(text ?? "").replace(/(?:\x1B|\u241B)(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

const ANSI_16_COLORS = [
  "#000000",
  "#800000",
  "#008000",
  "#808000",
  "#000080",
  "#800080",
  "#008080",
  "#c0c0c0",
  "#808080",
  "#ff0000",
  "#00ff00",
  "#ffff00",
  "#0000ff",
  "#ff00ff",
  "#00ffff",
  "#ffffff",
];

function ansi256ToHex(index) {
  const n = Number(index);
  if (!Number.isInteger(n) || n < 0 || n > 255) return "";
  if (n < 16) return ANSI_16_COLORS[n];
  if (n < 232) {
    const cubeIndex = n - 16;
    const r = Math.floor(cubeIndex / 36);
    const g = Math.floor((cubeIndex % 36) / 6);
    const b = cubeIndex % 6;
    const toHex = (value) => (value === 0 ? 0 : 55 + value * 40).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  const gray = 8 + (n - 232) * 10;
  const grayHex = gray.toString(16).padStart(2, "0");
  return `#${grayHex}${grayHex}${grayHex}`;
}

function applyAnsiSgr(codes, state) {
  const values = codes.length ? codes : [0];
  for (let i = 0; i < values.length; i += 1) {
    const code = Number(values[i] || 0);
    if (code === 0) {
      state.color = "";
      state.backgroundColor = "";
      state.fontWeight = "";
      state.fontStyle = "";
      state.textDecoration = "";
    } else if (code === 1) {
      state.fontWeight = "700";
    } else if (code === 3) {
      state.fontStyle = "italic";
    } else if (code === 4) {
      state.textDecoration = "underline";
    } else if (code === 22) {
      state.fontWeight = "";
    } else if (code === 23) {
      state.fontStyle = "";
    } else if (code === 24) {
      state.textDecoration = "";
    } else if (code === 39) {
      state.color = "";
    } else if (code === 49) {
      state.backgroundColor = "";
    } else if (code >= 30 && code <= 37) {
      state.color = ANSI_16_COLORS[code - 30];
    } else if (code >= 90 && code <= 97) {
      state.color = ANSI_16_COLORS[code - 90 + 8];
    } else if (code >= 40 && code <= 47) {
      state.backgroundColor = ANSI_16_COLORS[code - 40];
    } else if (code >= 100 && code <= 107) {
      state.backgroundColor = ANSI_16_COLORS[code - 100 + 8];
    } else if ((code === 38 || code === 48) && Number(values[i + 1]) === 2) {
      const r = Number(values[i + 2]);
      const g = Number(values[i + 3]);
      const b = Number(values[i + 4]);
      if ([r, g, b].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
        state[code === 38 ? "color" : "backgroundColor"] = `rgb(${r}, ${g}, ${b})`;
      }
      i += 4;
    } else if ((code === 38 || code === 48) && Number(values[i + 1]) === 5) {
      const color = ansi256ToHex(values[i + 2]);
      if (color) state[code === 38 ? "color" : "backgroundColor"] = color;
      i += 2;
    }
  }
}

function appendAnsiSegment(parent, text, state) {
  const value = stripAnsi(text);
  if (!value) return;
  if (!state.color && !state.backgroundColor && !state.fontWeight && !state.fontStyle && !state.textDecoration) {
    parent.append(document.createTextNode(value));
    return;
  }
  const span = make("span", "ansi-segment");
  span.textContent = value;
  if (state.color) span.style.color = state.color;
  if (state.backgroundColor) span.style.backgroundColor = state.backgroundColor;
  if (state.fontWeight) span.style.fontWeight = state.fontWeight;
  if (state.fontStyle) span.style.fontStyle = state.fontStyle;
  if (state.textDecoration) span.style.textDecoration = state.textDecoration;
  parent.append(span);
}

function renderAnsiText(parent, text) {
  parent.replaceChildren();
  const raw = String(text ?? "");
  const pattern = /(?:\x1B|\u241B)\[([0-9;]*)m/g;
  const state = { color: "", backgroundColor: "", fontWeight: "", fontStyle: "", textDecoration: "" };
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(raw))) {
    appendAnsiSegment(parent, raw.slice(lastIndex, match.index), state);
    const codes = match[1].split(";").filter((part) => part !== "").map((part) => Number(part));
    applyAnsiSgr(codes, state);
    lastIndex = pattern.lastIndex;
  }
  appendAnsiSegment(parent, raw.slice(lastIndex), state);
}

function cleanStatusText(value) {
  return stripAnsi(value).replace(/\s+/g, " ").trim();
}

function modelLabel(model) {
  if (!model) return "none";
  return `${model.provider}/${model.id}`;
}

function shortSessionLabel(state) {
  const label = cleanStatusText(state?.sessionName || state?.sessionId || "session");
  return /^[0-9a-f]{8}-[0-9a-f-]{18,}$/i.test(label) ? label.slice(0, 8) : label;
}

function formatStatusEntry(key, value) {
  const cleanKey = cleanStatusText(key);
  const cleanValue = cleanStatusText(value);
  if (!cleanValue) return "";
  if (cleanKey === "plan-mode") return `Plan: ${cleanValue}`;
  if (cleanKey === "extension") return cleanValue;
  return `${cleanKey}: ${cleanValue}`;
}

function shortModelLabel(model) {
  if (!model) return "unknown";
  return `(${model.provider}) ${model.id}`;
}

function formatTokenCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "?";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

function formatCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "$0.000";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 100) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes > 0 ? `${minutes}m` : ""}`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function normalizeDisplayPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return JSON.stringify(content ?? "");
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return String(part ?? "");
      if (typeof part.text === "string") return part.text;
      if (typeof part.thinking === "string") return part.thinking;
      if (part.type === "toolCall") return JSON.stringify(part.arguments || {});
      if (typeof part.content === "string") return part.content;
      return "";
    })
    .join("\n");
}

function estimateMessageTokens(messages) {
  let chars = 0;
  for (const message of messages || []) {
    chars += textFromContent(message.content).length;
    if (message.role === "toolResult") chars += textFromContent(message.content).length;
    if (message.role === "bashExecution") chars += String(message.command || "").length + String(message.output || "").length;
    chars += 16;
  }
  return Math.round(chars / 4);
}

function estimatePiTokens() {
  const contextTokens = latestStats?.contextUsage?.tokens;
  if (!Number.isFinite(Number(contextTokens))) return null;
  return Math.max(0, Number(contextTokens) - estimateMessageTokens(latestMessages));
}

function subscriptionSuffix() {
  const provider = currentState?.model?.provider || "";
  return /codex|copilot|chatgpt/i.test(provider) ? "sub" : "metered";
}

function footerMetric(icon, label, value, tone = "") {
  const node = make("span", `footer-metric ${tone}`.trim());
  node.append(make("span", "footer-metric-icon", icon), make("span", "footer-metric-label", label), make("span", "footer-metric-value", value));
  node.title = `${label}: ${value}`;
  return node;
}

function contextUsageActiveColor(percent) {
  const styles = getComputedStyle(document.documentElement);
  const cssVar = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  const stops = [
    { at: 0, color: cssVar("--ctp-green", "#a6e3a1") },
    { at: 36, color: cssVar("--ctp-yellow", "#f9e2af") },
    { at: 62, color: cssVar("--ctp-blue", "#89b4fa") },
    { at: 100, color: cssVar("--ctp-red", "#f38ba8") },
  ];
  const value = Math.min(100, Math.max(0, Number(percent)));
  const right = stops.find((stop) => value <= stop.at) || stops.at(-1);
  const left = stops[Math.max(0, stops.indexOf(right) - 1)];
  const leftRgb = cssColorToRgb(left.color);
  const rightRgb = cssColorToRgb(right.color);
  if (!leftRgb || !rightRgb || left.at === right.at) {
    return { color: right.color, glow: right.color };
  }
  const mixed = mixRgb(leftRgb, rightRgb, (value - left.at) / (right.at - left.at));
  return { color: rgbColor(mixed), glow: rgbaColor(mixed, 0.42) };
}

function applyFooterContextUsage(node, contextUsage) {
  node.classList.add("footer-context-card");
  const percent = Number(contextUsage?.percent);
  if (Number.isFinite(percent)) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    const activeColor = contextUsageActiveColor(clampedPercent);
    node.classList.add("has-context-usage");
    node.style.setProperty("--context-usage", `${clampedPercent.toFixed(1)}%`);
    node.style.setProperty("--context-active-color", activeColor.color);
    node.style.setProperty("--context-active-glow", activeColor.glow);
  }
  return node;
}

function footerMeta(label, value, className = "", options = {}) {
  const isAction = typeof options.onClick === "function";
  const node = make(isAction ? "button" : "span", `footer-meta ${className}${isAction ? " footer-meta-action" : ""}`.trim());
  if (isAction) {
    node.type = "button";
    node.addEventListener("click", options.onClick);
  }
  node.append(make("span", "footer-meta-label", label), make("span", "footer-meta-value", value));
  node.title = options.title || `${label}: ${value}`;
  return node;
}

function setFooterModelPickerOpen(open) {
  footerModelPickerOpen = !!open;
  if (footerModelPickerOpen && isMobileView()) {
    mobileFooterExpanded = false;
    document.body.classList.remove("footer-details-expanded");
    setComposerActionsOpen(false);
    setMobileTabsExpanded(false);
  }
  document.body.classList.toggle("footer-model-picker-open", footerModelPickerOpen);
  renderFooter();
  updateFooterModelPickerPosition();
}

async function applyFooterModel(model) {
  if (!model?.provider || !model?.id) return;
  try {
    footerModelPickerOpen = false;
    await api("/api/model", { method: "POST", body: { provider: model.provider, modelId: model.id } });
    await refreshState();
    await refreshModels();
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    document.body.classList.toggle("footer-model-picker-open", footerModelPickerOpen);
    renderFooter();
  }
}

function renderFooterModelPicker() {
  const picker = make("div", "footer-model-picker");
  picker.setAttribute("role", "listbox");
  picker.setAttribute("aria-label", "Scoped models");
  picker.append(make("div", "footer-model-picker-title", "Scoped models"));
  picker.append(make("div", "footer-model-picker-source", footerScopedModelSource === "none" ? "No saved scope" : `Source: ${footerScopedModelSource}${footerScopedModelPatterns.length ? ` · ${footerScopedModelPatterns.join(", ")}` : ""}`));
  if (footerScopedModels.length === 0) {
    const empty = make("div", "footer-model-picker-empty muted");
    empty.append(
      make("strong", undefined, "No scoped models available."),
      make("span", undefined, " If you changed /scoped-models in the terminal UI, choose its Save action so Web UI can read it from settings, or start Web UI with forwarded Pi args like -- --models model-a,model-b."),
    );
    picker.append(empty);
    return picker;
  }
  const current = currentState?.model;
  for (const model of footerScopedModels) {
    const selected = current?.provider === model.provider && current?.id === model.id;
    const button = make("button", `footer-model-option${selected ? " active" : ""}`);
    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.title = `${model.provider}/${model.id}${model.name ? ` · ${model.name}` : ""}`;
    button.append(
      make("span", "footer-model-option-main", `${model.provider}/${model.id}`),
      make("span", "footer-model-option-name", model.name || ""),
    );
    button.addEventListener("click", () => applyFooterModel(model));
    picker.append(button);
  }
  return picker;
}

function pathPickerButton(label, title, onClick, className = "") {
  const button = make("button", className, label);
  button.type = "button";
  button.title = title || label;
  button.addEventListener("click", onClick);
  return button;
}

function setPathPickerError(message) {
  elements.pathPickerError.textContent = message || "";
  elements.pathPickerError.hidden = !message;
}

function normalizeFastPicks(value) {
  const items = Array.isArray(value) ? value : [];
  const seen = new Set();
  const picks = [];
  for (const item of items) {
    const cwd = typeof item === "string" ? item : String(item?.cwd || "");
    if (!cwd || seen.has(cwd)) continue;
    seen.add(cwd);
    picks.push({ cwd, displayCwd: String(item?.displayCwd || cwd) });
  }
  return picks.slice(0, 30);
}

function loadLegacyFastPicks() {
  try {
    return normalizeFastPicks(JSON.parse(localStorage.getItem(PATH_FAST_PICKS_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function clearLegacyFastPicks() {
  try {
    localStorage.removeItem(PATH_FAST_PICKS_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures; server persistence is authoritative.
  }
}

function loadFastPicks() {
  return pathFastPicks;
}

async function fetchFastPicks() {
  const response = await api("/api/path-fast-picks", { scoped: false });
  return normalizeFastPicks(response.data?.picks || []);
}

async function saveFastPicks(picks) {
  pathFastPicks = normalizeFastPicks(picks);
  pathFastPicksReady = true;
  renderFastPicks();
  try {
    const response = await api("/api/path-fast-picks", { method: "POST", body: { picks: pathFastPicks }, scoped: false });
    pathFastPicks = normalizeFastPicks(response.data?.picks || pathFastPicks);
    clearLegacyFastPicks();
  } catch (error) {
    try {
      localStorage.setItem(PATH_FAST_PICKS_STORAGE_KEY, JSON.stringify(pathFastPicks));
    } catch {
      // Ignore fallback storage failure; the event log still reports the server-side error.
    }
    addEvent(`failed to persist path fast picks on server; saved in this browser only: ${error.message}`, "error");
  }
  renderFastPicks();
}

async function initializeFastPicks() {
  if (pathFastPicksLoadPromise) return pathFastPicksLoadPromise;
  pathFastPicksLoadPromise = (async () => {
    const legacy = loadLegacyFastPicks();
    try {
      const serverPicks = await fetchFastPicks();
      const merged = normalizeFastPicks([...serverPicks, ...legacy]);
      pathFastPicks = merged;
      pathFastPicksReady = true;
      if (legacy.length > 0 && JSON.stringify(merged) !== JSON.stringify(serverPicks)) await saveFastPicks(merged);
      else clearLegacyFastPicks();
    } catch (error) {
      pathFastPicks = legacy;
      pathFastPicksReady = true;
      if (legacy.length > 0) addEvent(`using browser-only path fast picks; server load failed: ${error.message}`, "warn");
      else addEvent(`failed to load path fast picks: ${error.message}`, "error");
    }
    renderFastPicks();
  })();
  return pathFastPicksLoadPromise;
}

function fastPickLabel(pick) {
  const cwd = String(pick.cwd || pick.displayCwd || "");
  const trimmed = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!trimmed) return cwd || "directory";
  return trimmed.split("/").filter(Boolean).pop() || trimmed;
}

function currentFastPick() {
  if (!pathPickerState?.cwd) return null;
  return { cwd: pathPickerState.cwd, displayCwd: elements.pathPickerCurrent.textContent || pathPickerState.cwd };
}

function updateAddFastPickButton() {
  if (!pathFastPicksReady) {
    elements.pathPickerAddFastPickButton.disabled = true;
    elements.pathPickerAddFastPickButton.textContent = "Loading fast picks…";
    return;
  }
  const pick = currentFastPick();
  const exists = !!pick && loadFastPicks().some((item) => item.cwd === pick.cwd);
  elements.pathPickerAddFastPickButton.disabled = !pick || exists;
  elements.pathPickerAddFastPickButton.textContent = exists ? "Fast pick added" : "Add fast pick";
}

function renderFastPicks() {
  const picks = loadFastPicks();
  elements.pathPickerFastPicks.replaceChildren();
  if (!pathFastPicksReady) {
    elements.pathPickerFastPicks.append(make("div", "path-picker-fast-picks-empty muted", "Loading fast picks…"));
    updateAddFastPickButton();
    return;
  }
  if (picks.length === 0) {
    elements.pathPickerFastPicks.append(make("div", "path-picker-fast-picks-empty muted", "No fast picks yet."));
    updateAddFastPickButton();
    return;
  }

  for (const pick of picks) {
    const item = make("span", "path-picker-fast-pick");
    const jump = pathPickerButton(fastPickLabel(pick), pick.cwd, () => loadPathPickerDirectory(pick.cwd), "path-picker-fast-pick-button");
    const remove = pathPickerButton("×", `Remove fast pick ${pick.cwd}`, async () => {
      await saveFastPicks(loadFastPicks().filter((item) => item.cwd !== pick.cwd));
    }, "path-picker-fast-pick-remove");
    item.append(jump, remove);
    elements.pathPickerFastPicks.append(item);
  }
  updateAddFastPickButton();
}

async function addCurrentFastPick() {
  const pick = currentFastPick();
  if (!pick) return;
  const picks = loadFastPicks().filter((item) => item.cwd !== pick.cwd);
  picks.unshift(pick);
  await saveFastPicks(picks);
}

function renderPathPicker(data) {
  if (!pathPickerState) return;
  pathPickerState.cwd = data.cwd;
  elements.pathPickerCurrent.textContent = data.displayCwd || data.cwd;
  elements.pathPickerCurrent.title = data.cwd;
  elements.pathPickerChooseButton.disabled = false;
  elements.pathPickerChooseButton.textContent = "Use this directory";
  setPathPickerError(data.truncated ? "Showing the first 500 directories." : "");
  renderFastPicks();

  elements.pathPickerRoots.replaceChildren();
  if (data.parent) {
    elements.pathPickerRoots.append(pathPickerButton("↑ Parent", data.parent, () => loadPathPickerDirectory(data.parent), "path-picker-root-button"));
  }
  for (const root of data.roots || []) {
    elements.pathPickerRoots.append(pathPickerButton(root.label, root.cwd, () => loadPathPickerDirectory(root.cwd), "path-picker-root-button"));
  }

  elements.pathPickerList.replaceChildren();
  if (!data.directories?.length) {
    elements.pathPickerList.append(make("div", "path-picker-empty muted", "No subdirectories."));
    return;
  }

  for (const directory of data.directories) {
    const button = pathPickerButton(`${directory.name}/`, directory.cwd, () => loadPathPickerDirectory(directory.cwd), `path-picker-directory${directory.hidden ? " hidden-directory" : ""}`);
    button.setAttribute("role", "option");
    elements.pathPickerList.append(button);
  }
}

async function loadPathPickerDirectory(cwd) {
  if (!pathPickerState) return;
  const requestId = ++pathPickerState.requestId;
  elements.pathPickerAddFastPickButton.disabled = true;
  elements.pathPickerChooseButton.disabled = true;
  elements.pathPickerCurrent.textContent = "Loading…";
  setPathPickerError("");

  try {
    const query = cwd ? `?path=${encodeURIComponent(cwd)}` : "";
    const response = await api(`/api/directories${query}`);
    if (!pathPickerState || pathPickerState.requestId !== requestId) return;
    renderPathPicker(response.data || {});
  } catch (error) {
    if (!pathPickerState || pathPickerState.requestId !== requestId) return;
    elements.pathPickerChooseButton.disabled = false;
    elements.pathPickerCurrent.textContent = pathPickerState.cwd || "Unable to load directory";
    setPathPickerError(error.message);
    updateAddFastPickButton();
  }
}

function closePathPicker(cwd) {
  const state = pathPickerState;
  if (!state) return;
  pathPickerState = null;
  if (elements.pathPickerDialog.open) elements.pathPickerDialog.close();
  state.resolve(cwd || null);
}

function pickCwd(tab, initialCwd) {
  if (pathPickerState) return Promise.resolve(null);

  return new Promise((resolve) => {
    pathPickerState = { tabId: tab.id, cwd: initialCwd, requestId: 0, resolve };
    elements.pathPickerTitle.textContent = `Choose CWD for ${tab.title}`;
    elements.pathPickerCurrent.textContent = "Loading…";
    elements.pathPickerFastPicks.replaceChildren();
    elements.pathPickerRoots.replaceChildren();
    elements.pathPickerList.replaceChildren();
    setPathPickerError("");
    elements.pathPickerAddFastPickButton.disabled = true;
    elements.pathPickerChooseButton.disabled = true;
    initializeFastPicks().catch((error) => addEvent(`failed to initialize path fast picks: ${error.message}`, "error"));
    elements.pathPickerDialog.showModal();
    loadPathPickerDirectory(initialCwd);
  });
}

async function changeActiveTabCwd() {
  const tab = activeTab();
  if (!tab) return;

  const currentCwd = latestWorkspace?.cwd || tab.cwd || "";
  const cwd = await pickCwd(tab, currentCwd);
  if (!cwd || cwd === currentCwd) return;
  if (!window.confirm(`Restart ${tab.title} in:\n${cwd}\n\nCurrent in-flight work in this tab will be stopped.`)) return;

  saveActiveDraft();
  try {
    const response = await api(`/api/tabs/${encodeURIComponent(tab.id)}`, { method: "PATCH", body: { cwd }, scoped: false });
    tabs = response.data?.tabs || tabs;
    syncTabMetadata(tabs);
    activeTabId = response.data?.tab?.id || activeTabId;
    resetActiveTabUi();
    renderTabs();
    restoreActiveDraft();
    connectEvents();
    await refreshAll();
    const changedCwd = response.data?.tab?.cwd || cwd;
    addEvent(response.data?.changed === false ? `cwd unchanged: ${changedCwd}` : `changed ${tab.title} cwd to ${changedCwd}`, "info");
  } catch (error) {
    addEvent(error.message, "error");
  }
}

function renderFooter() {
  const stats = latestStats;
  const tokens = stats?.tokens || {};
  const contextUsage = stats?.contextUsage || currentState?.contextUsage;
  const piTokens = estimatePiTokens();
  const speed = currentRunStartedAt
    ? (Math.max(1, Math.round(currentRunStreamChars / 4)) / Math.max(0.5, (performance.now() - currentRunStartedAt) / 1000))
    : latestTokPerSecond;
  const speedLabel = Number.isFinite(speed) ? `${speed.toFixed(1)} tok/s` : "-- tok/s";
  const contextLabel = contextUsage?.contextWindow
    ? `${contextUsage.percent !== null && contextUsage.percent !== undefined ? `${Number(contextUsage.percent).toFixed(1)}% / ` : ""}${formatTokenCount(contextUsage.contextWindow)}`
    : "?";

  const tab = activeTab();
  const git = latestWorkspace?.git;
  const branchLabel = git?.isRepo ? git.branch || "detached" : "no repo";
  const changeLabel = git?.isRepo ? `✎ ${git.changed ?? 0}  ◌ ${git.untracked ?? 0}` : "no git";
  const workspaceLabel = latestWorkspace?.displayCwd || (tab?.cwd ? normalizeDisplayPath(tab.cwd) : "loading…");
  const runtime = latestWorkspace?.uptimeMs ? formatDuration(latestWorkspace.uptimeMs) : "--";
  const modelLine = `${shortModelLabel(currentState?.model)} · ${currentState?.thinkingLevel || "?"}`;

  elements.statusBar.replaceChildren();
  document.body.classList.toggle("footer-model-picker-open", footerModelPickerOpen);
  const row1 = make("div", "footer-line footer-line-main");
  row1.append(
    footerMetric("🪙", "tokens", `↑ ${formatTokenCount(tokens.input ?? 0)}  ↓ ${formatTokenCount(tokens.output ?? 0)}`, "tone-pink"),
    footerMetric("💾", "cache", `R ${formatTokenCount(tokens.cacheRead ?? 0)}${tokens.cacheWrite ? `  W ${formatTokenCount(tokens.cacheWrite)}` : ""}`, "tone-blue"),
    footerMetric("π", "pi", piTokens === null ? "-- tok" : `~${formatTokenCount(piTokens)} tok`, "tone-mauve"),
    footerMetric("⚡", "speed", speedLabel, "tone-yellow"),
    footerMetric("💸", subscriptionSuffix(), formatCost(stats?.cost ?? 0), "tone-green"),
    applyFooterContextUsage(footerMetric("🧠", "context", contextLabel, "tone-teal"), contextUsage),
  );
  const footerToggle = make("button", "footer-details-toggle", mobileFooterExpanded ? "Less" : "Details");
  footerToggle.type = "button";
  footerToggle.setAttribute("aria-expanded", mobileFooterExpanded ? "true" : "false");
  footerToggle.addEventListener("click", () => setMobileFooterExpanded(!mobileFooterExpanded));

  const row2 = make("div", "footer-line footer-line-meta");
  row2.append(
    footerMeta("cwd", workspaceLabel, "footer-workspace", tab ? {
      onClick: changeActiveTabCwd,
      title: `Change cwd for ${tab.title}: ${workspaceLabel}`,
    } : {}),
    footerMeta("git", branchLabel, "footer-branch"),
    footerMeta("changes", changeLabel, "footer-changes"),
    footerMeta("runtime", `⏱ ${runtime} · Agent`, "footer-runtime"),
    applyFooterContextUsage(footerMeta("context", contextLabel, "footer-context"), contextUsage),
    footerMeta("model", modelLine, "footer-model", {
      onClick: () => setFooterModelPickerOpen(!footerModelPickerOpen),
      title: `Change scoped model: ${modelLine}`,
    }),
    footerToggle,
  );
  elements.statusBar.append(row1, row2);
  if (footerModelPickerOpen) elements.statusBar.append(renderFooterModelPicker());
  setMobileFooterExpanded(mobileFooterExpanded);
  updateFooterModelPickerPosition();
}

function scheduleRefreshMessages(delay = 120) {
  clearTimeout(refreshMessagesTimer);
  refreshMessagesTimer = setTimeout(() => refreshMessages().catch((error) => addEvent(error.message, "error")), delay);
}

function scheduleRefreshState(delay = 120) {
  clearTimeout(refreshStateTimer);
  refreshStateTimer = setTimeout(() => refreshState().catch((error) => addEvent(error.message, "error")), delay);
}

function scheduleRefreshFooter(delay = 300) {
  clearTimeout(refreshFooterTimer);
  refreshFooterTimer = setTimeout(() => refreshFooterData().catch((error) => addEvent(error.message, "error")), delay);
}

function renderStatus() {
  const state = currentState;
  updateComposerModeButtons();
  const running = state?.isStreaming ? "running" : "idle";
  const compacting = state?.isCompacting ? " · compacting" : "";
  const queue = state?.pendingMessageCount ? ` · queued ${state.pendingMessageCount}` : "";
  const extra = [...statusEntries.entries()].map(([key, value]) => formatStatusEntry(key, value)).filter(Boolean).join(" · ");
  const statusText = state?.isStreaming ? "Running" : "Idle";
  const compactingText = state?.isCompacting ? " · Compacting" : "";
  const queueText = state?.pendingMessageCount ? ` · Queue: ${state.pendingMessageCount}` : "";

  elements.sessionLine.textContent = `Status: ${statusText}${compactingText}${queueText}${extra ? ` · ${extra}` : ""} · Model: ${modelLabel(state?.model)} · Session: ${shortSessionLabel(state)}`;

  elements.stateDetails.replaceChildren();
  const details = {
    Status: `${running}${compacting}`,
    Model: modelLabel(state?.model),
    Thinking: state?.thinkingLevel || "unknown",
    Session: state?.sessionName || state?.sessionId || "unknown",
    File: state?.sessionFile || "in-memory",
    Messages: String(state?.messageCount ?? "?"),
    Queue: String(state?.pendingMessageCount ?? 0),
    "Auto compact": state?.autoCompactionEnabled ? "on" : "off",
  };
  for (const [key, value] of Object.entries(details)) {
    elements.stateDetails.append(make("dt", undefined, key), make("dd", undefined, value));
  }

  if (state?.thinkingLevel) elements.thinkingSelect.value = state.thinkingLevel;
  elements.compactButton.disabled = !!state?.isCompacting;
  elements.compactButton.textContent = state?.isCompacting ? "Compacting…" : "Compact";
  syncModelSelectToState();
  renderFooter();
  renderFeedbackTray();
}

function normalizeDialogText(text, { preserveAnsi = false } = {}) {
  const normalized = String(text ?? "").replace(/\r\n?/g, "\n");
  return preserveAnsi ? normalized : stripAnsi(normalized);
}

function normalizeDialogPrompt(request) {
  const rawTitle = normalizeDialogText(request.title || "Pi request", { preserveAnsi: true });
  const rawMessage = normalizeDialogText(request.message || request.placeholder || "", { preserveAnsi: true });

  if (rawTitle.includes("\n")) {
    const lines = rawTitle.split("\n");
    const titleIndex = lines.findIndex((line) => stripAnsi(line).trim());
    if (titleIndex !== -1) {
      const titleBody = lines.slice(titleIndex + 1).join("\n").replace(/^\n+/, "").trimEnd();
      const message = [titleBody, rawMessage.trimEnd()].filter((part) => stripAnsi(part).trim()).join("\n\n");
      return {
        title: stripAnsi(lines[titleIndex]).trim(),
        message,
        plainMessage: stripAnsi(message),
      };
    }
  }

  const message = rawMessage.trimEnd();
  return {
    title: stripAnsi(rawTitle).trim() || "Pi request",
    message,
    plainMessage: stripAnsi(message),
  };
}

function isGuardrailDialogPrompt(prompt) {
  const plainTitle = stripAnsi(prompt.title || "");
  const plainMessage = prompt.plainMessage ?? stripAnsi(prompt.message || "");
  return /(?:dangerous|high-risk|protected).*(?:command|file)|safety rule|execute anyway\?/i.test(`${plainTitle}\n${plainMessage}`);
}

function stripTodoProgressLines(text, { streaming = false } = {}) {
  let inFence = false;
  const kept = [];
  const raw = String(text || "");
  const hasTrailingNewline = /\r?\n$/.test(raw);
  const lines = raw.split(/\r?\n/);

  lines.forEach((line, index) => {
    const isUnfinishedTail = streaming && !hasTrailingNewline && index === lines.length - 1;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      kept.push(line);
      return;
    }
    if (!inFence && TODO_PROGRESS_LINE_REGEX.test(line)) return;
    if (!inFence && isUnfinishedTail && TODO_PROGRESS_PARTIAL_LINE_REGEX.test(line)) return;
    kept.push(line);
  });

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseTodoProgressWidget(lines) {
  const cleanLines = lines.map(stripAnsi).map((line) => line.trim()).filter(Boolean);
  const headerIndex = cleanLines.findIndex((line) => /^Todo\s+\d+\/\d+\s+done/i.test(line));
  if (headerIndex === -1) return null;

  const header = cleanLines[headerIndex];
  const match = header.match(/^Todo\s+(\d+)\/(\d+)\s+done(?:,\s+(\d+)\s+partial)?/i);
  if (!match) return null;

  const items = [];
  let footer = "";
  for (const line of cleanLines.slice(headerIndex + 1)) {
    const item = line.match(/^\[( |x|X|-)\]\s+(.+)$/);
    if (item) {
      const mark = item[1].toLowerCase();
      items.push({ status: mark === "x" ? "done" : mark === "-" ? "partial" : "todo", text: item[2].trim() });
    } else if (/^Scroll\s+/i.test(line)) {
      footer = line;
    }
  }

  return {
    done: Number.parseInt(match[1], 10) || 0,
    total: Number.parseInt(match[2], 10) || items.length,
    partial: Number.parseInt(match[3] || "0", 10) || 0,
    items,
    footer,
  };
}

function renderTodoProgressWidget(_key, lines) {
  const todo = parseTodoProgressWidget(lines);
  if (!todo) return null;

  const node = make("section", "widget todo-widget");
  node.setAttribute("aria-label", "Todo progress");

  const percent = todo.total > 0 ? Math.max(0, Math.min(100, (todo.done / todo.total) * 100)) : 0;
  const header = make("div", "todo-widget-header");
  header.append(
    make("span", "todo-widget-title", "Todo progress"),
    make("span", "todo-widget-count", `${todo.done}/${todo.total}`),
    make("span", "todo-widget-meta", todo.partial ? `${todo.partial} partial` : "active"),
  );

  const progress = make("div", "todo-widget-progress");
  const fill = make("span", "todo-widget-progress-fill");
  fill.style.width = `${percent}%`;
  progress.append(fill);

  const list = make("ol", "todo-widget-list");
  for (const item of todo.items) {
    const row = make("li", `todo-widget-item ${item.status}`);
    row.append(
      make("span", "todo-widget-marker", item.status === "done" ? "✓" : item.status === "partial" ? "–" : ""),
      make("span", "todo-widget-text", item.text),
    );
    list.append(row);
  }

  node.append(header, progress, list);
  if (todo.footer) node.append(make("div", "todo-widget-footer", todo.footer));
  return node;
}

function renderWidgets() {
  elements.widgetArea.replaceChildren();
  for (const [key, value] of widgets) {
    const lines = Array.isArray(value.widgetLines) ? value.widgetLines : [];
    const specialized = key === "todo-progress" ? renderTodoProgressWidget(key, lines) : null;
    if (specialized) {
      elements.widgetArea.append(specialized);
      continue;
    }

    const node = make("div", "widget");
    const cleanLines = lines.map(stripAnsi);
    node.textContent = `${key}\n${cleanLines.join("\n")}`;
    elements.widgetArea.append(node);
  }
}

function setGitWorkflow(patch) {
  Object.assign(gitWorkflow, patch);
  renderGitWorkflow();
}

function isCurrentGitWorkflowRun(runId) {
  return gitWorkflow.active && gitWorkflow.runId === runId;
}

function appendGitWorkflowOutput(text) {
  const next = `${gitWorkflow.output || ""}${gitWorkflow.output ? "\n" : ""}${text}`;
  setGitWorkflow({ output: next.slice(-60000) });
}

function formatGitCommandResult(result) {
  if (!result) return "";
  const lines = [`$ ${result.command || "git"}`];
  if (result.stdout?.trim()) lines.push("", result.stdout.trimEnd());
  if (result.stderr?.trim()) lines.push("", result.stderr.trimEnd());
  if (result.exitCode !== 0 || result.signal || result.timedOut || result.cancelled) {
    lines.push("", `[exit: ${result.exitCode ?? result.signal ?? "unknown"}${result.timedOut ? ", timed out" : ""}${result.cancelled ? ", cancelled" : ""}]`);
  }
  return lines.join("\n");
}

function formatCommitMessagePreview(message) {
  if (!message) return "No commit message loaded yet.";
  return [`=== SHORT ===`, message.short || "(empty)", "", "=== LONG ===", message.long || "(empty)"].join("\n");
}

function addGitWorkflowAction(label, handler, className = "", disabled = gitWorkflow.busy) {
  const button = make("button", className, label);
  button.type = "button";
  button.disabled = disabled;
  button.addEventListener("click", handler);
  elements.gitWorkflowActions.append(button);
  return button;
}

function gitWorkflowTitle() {
  switch (gitWorkflow.step) {
    case "add": return "Stage all changes";
    case "generate": return "Generate staged commit message";
    case "generating": return "Waiting for /git-staged-msg";
    case "message": return "Choose commit message";
    case "committing": return "Committing";
    case "push": return "Push commit";
    case "pushing": return "Pushing";
    case "done": return "Git workflow complete";
    case "cancelled": return "Git workflow cancelled";
    case "error": return "Git workflow needs attention";
    default: return "Git workflow";
  }
}

function gitWorkflowHint() {
  switch (gitWorkflow.step) {
    case "add": return "Step 1: run git add . in the current Pi working directory.";
    case "generate": return "Step 2: run /git-staged-msg, then preview the generated files.";
    case "generating": return "Pi is generating dev/COMMIT/staged-commit-short.txt and staged-commit-long.txt.";
    case "message": return "Step 3/4: preview the native g-msg output and choose short or long commit.";
    case "committing": return "Running native git commit from the generated message file.";
    case "push": return "Step 5: push the new commit to the configured remote.";
    case "pushing": return "Running git push. Cancel will request process termination.";
    case "done": return "Push finished. Review the output below.";
    case "cancelled": return "No further workflow steps will run.";
    case "error": return gitWorkflow.error || "Fix the issue, then retry or restart.";
    default: return "Stage changes, generate a commit message, commit, and push.";
  }
}

function renderGitWorkflow() {
  elements.gitWorkflowPanel.hidden = !gitWorkflow.active;
  if (!gitWorkflow.active) return;

  elements.gitWorkflowTitle.textContent = gitWorkflowTitle();
  elements.gitWorkflowHint.textContent = gitWorkflowHint();
  elements.gitWorkflowOutput.textContent = gitWorkflow.output || "Ready.";
  elements.gitWorkflowSteps.replaceChildren();
  elements.gitWorkflowActions.replaceChildren();

  const activeIndex = GIT_WORKFLOW_ACTIVE_INDEX[gitWorkflow.step] ?? 0;
  for (const [index, label] of GIT_WORKFLOW_STEPS.entries()) {
    const item = make("span", "git-workflow-step", label);
    if (gitWorkflow.step === "done" || index < activeIndex) item.classList.add("done");
    if (index === activeIndex && !["done", "cancelled", "error"].includes(gitWorkflow.step)) item.classList.add("active");
    elements.gitWorkflowSteps.append(item);
  }

  elements.gitWorkflowCancelButton.hidden = ["done", "cancelled"].includes(gitWorkflow.step);
  elements.gitWorkflowCancelButton.disabled = false;

  if (gitWorkflow.step === "add") {
    addGitWorkflowAction("Run git add .", runGitAdd, "primary", false);
  } else if (gitWorkflow.step === "generate") {
    addGitWorkflowAction("Run /git-staged-msg", runGitMessagePrompt, "primary", false);
    addGitWorkflowAction("Preview current message files", () => loadGitWorkflowMessage({ requireFresh: false }), "", false);
  } else if (gitWorkflow.step === "generating") {
    addGitWorkflowAction("Refresh message preview", () => loadGitWorkflowMessage({ requireFresh: true }), "", false);
  } else if (gitWorkflow.step === "message") {
    addGitWorkflowAction("Commit short", () => commitGitWorkflow("short"), "primary", false);
    addGitWorkflowAction("Commit long", () => commitGitWorkflow("long"), "primary", false);
    addGitWorkflowAction("Regenerate", runGitMessagePrompt, "", false);
  } else if (gitWorkflow.step === "push") {
    addGitWorkflowAction("Run git push", pushGitWorkflow, "primary", false);
  } else if (gitWorkflow.step === "done") {
    addGitWorkflowAction("Close", () => setGitWorkflow({ active: false }), "primary", false);
    addGitWorkflowAction("Start another", startGitWorkflow, "", false);
  } else if (["cancelled", "error"].includes(gitWorkflow.step)) {
    addGitWorkflowAction("Close", () => setGitWorkflow({ active: false }), "primary", false);
    addGitWorkflowAction("Restart", startGitWorkflow, "", false);
  }
}

async function gitWorkflowRequest(path, { method = "POST", body = {}, runId = gitWorkflow.runId } = {}) {
  const response = await api(path, method === "GET" ? { method } : { method, body });
  if (!isCurrentGitWorkflowRun(runId)) return null;
  if (!response.ok) {
    const detail = response.data ? `\n\n${formatGitCommandResult(response.data)}` : "";
    throw new Error(`${response.error || "Git workflow request failed"}${detail}`);
  }
  return response.data;
}

function failGitWorkflow(error, step = gitWorkflow.step) {
  const message = error?.message || String(error);
  setGitWorkflow({
    step,
    busy: false,
    error: message,
    output: `${gitWorkflow.output || ""}${gitWorkflow.output ? "\n\n" : ""}ERROR: ${message}`.slice(-60000),
  });
}

function startGitWorkflow() {
  if (gitWorkflow.active && !["done", "cancelled", "error"].includes(gitWorkflow.step) && !confirm("Restart the active git workflow?")) return;
  gitWorkflow.runId += 1;
  setGitWorkflow({
    active: true,
    step: "add",
    busy: false,
    output: "Ready to stage all changes with git add .\n\nNative mode is used for g-msg/g-short/g-long: dev/COMMIT message files are read directly and git commit is run without fish.",
    error: "",
    message: null,
    messageRequestedAt: 0,
  });
}

async function cancelGitWorkflow() {
  const shouldAbortPi = gitWorkflow.step === "generating";
  gitWorkflow.runId += 1;
  setGitWorkflow({ step: "cancelled", busy: false, error: "", output: `${gitWorkflow.output || ""}${gitWorkflow.output ? "\n\n" : ""}Cancelled by user.` });
  if (shouldAbortPi) setRunIndicatorActivity("Abort requested; checking whether Pi stopped…");
  await Promise.allSettled([
    api("/api/git-workflow/cancel", { method: "POST", body: {} }),
    shouldAbortPi ? api("/api/abort", { method: "POST", body: {} }) : Promise.resolve(),
  ]);
  if (shouldAbortPi) scheduleAbortStateChecks();
}

async function runGitAdd() {
  const runId = gitWorkflow.runId;
  setGitWorkflow({ step: "add", busy: true, error: "", output: "Running git add ." });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/add", { runId });
    if (!result) return;
    setGitWorkflow({ step: "generate", busy: false, output: `${formatGitCommandResult(result)}\n\nStaged. Next: run /git-staged-msg.` });
    scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId)) failGitWorkflow(error, "add");
  }
}

async function runGitMessagePrompt() {
  if (currentState?.isStreaming) {
    failGitWorkflow(new Error("Pi is currently running. Wait for it to finish or abort before generating a staged commit message."), "generate");
    return;
  }
  const runId = gitWorkflow.runId;
  const requestedAt = Date.now();
  setGitWorkflow({
    step: "generating",
    busy: true,
    error: "",
    messageRequestedAt: requestedAt,
    output: "Sending /git-staged-msg to Pi.\n\nCancel will request Pi abort.",
  });
  setRunIndicatorActivity("Sending /git-staged-msg to Pi…");
  try {
    await api("/api/prompt", { method: "POST", body: { message: "/git-staged-msg" } });
    if (!isCurrentGitWorkflowRun(runId)) return;
    appendGitWorkflowOutput("/git-staged-msg accepted. Waiting for agent_end, then the message files will be loaded.");
    scheduleRefreshState();
    setTimeout(() => {
      if (isCurrentGitWorkflowRun(runId) && gitWorkflow.step === "generating" && !currentState?.isStreaming) {
        loadGitWorkflowMessage({ requireFresh: true, retries: 1, runId });
      }
    }, 2500);
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId)) {
      clearRunIndicatorActivity();
      failGitWorkflow(error, "generate");
    }
  }
}

async function loadGitWorkflowMessage({ requireFresh = false, retries = 0, runId = gitWorkflow.runId } = {}) {
  try {
    const message = await gitWorkflowRequest("/api/git-workflow/message", { method: "GET", runId });
    if (!message) return;
    const newestMtime = Math.max(message.shortMtimeMs || 0, message.longMtimeMs || 0);
    if (requireFresh && gitWorkflow.messageRequestedAt && newestMtime + 10000 < gitWorkflow.messageRequestedAt) {
      throw new Error("Generated message files have not refreshed yet.");
    }
    setGitWorkflow({
      step: "message",
      busy: false,
      error: "",
      message,
      output: formatCommitMessagePreview(message),
    });
  } catch (error) {
    if (!isCurrentGitWorkflowRun(runId)) return;
    if (retries > 0) {
      setTimeout(() => loadGitWorkflowMessage({ requireFresh, retries: retries - 1, runId }), 1400);
      return;
    }
    failGitWorkflow(error, gitWorkflow.step === "generating" ? "generate" : gitWorkflow.step);
  }
}

async function commitGitWorkflow(variant) {
  const runId = gitWorkflow.runId;
  setGitWorkflow({ step: "committing", busy: true, error: "", output: `${formatCommitMessagePreview(gitWorkflow.message)}\n\nRunning native ${variant} commit…` });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/commit", { body: { variant }, runId });
    if (!result) return;
    setGitWorkflow({ step: "push", busy: false, output: `${formatGitCommandResult(result)}\n\nCommit created. Next: git push.` });
    scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId)) failGitWorkflow(error, "message");
  }
}

async function pushGitWorkflow() {
  const runId = gitWorkflow.runId;
  setGitWorkflow({ step: "pushing", busy: true, error: "", output: "Running git push…" });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/push", { runId });
    if (!result) return;
    setGitWorkflow({ step: "done", busy: false, output: formatGitCommandResult(result) || "git push finished." });
    scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId)) failGitWorkflow(error, "push");
  }
}

function renderQueue(event) {
  const steering = event?.steering || [];
  const followUp = event?.followUp || [];
  if (steering.length === 0 && followUp.length === 0) {
    elements.queueBox.textContent = "No queued messages.";
    elements.queueBox.classList.add("muted");
    return;
  }
  elements.queueBox.classList.remove("muted");
  const lines = [];
  if (steering.length) lines.push(`Steering (${steering.length}):`, ...steering.map((item) => `• ${item}`));
  if (followUp.length) lines.push(`Follow-up (${followUp.length}):`, ...followUp.map((item) => `• ${item}`));
  elements.queueBox.textContent = lines.join("\n");
}

function appendText(parent, text, className = "text-block") {
  const block = make("pre", className);
  block.textContent = text || "";
  parent.append(block);
  return block;
}

function appendImage(parent, part) {
  const wrapper = make("div", "image-block");
  const img = document.createElement("img");
  img.alt = "attached image";
  img.loading = "lazy";
  img.style.maxWidth = "100%";
  img.style.borderRadius = "0.6rem";
  img.src = `data:${part.mimeType || "image/png"};base64,${part.data || part.content || ""}`;
  wrapper.append(img);
  parent.append(wrapper);
}

function isActionFeedbackMessage(message) {
  return message?.role === "assistant" || message?.role === "toolResult" || message?.role === "bashExecution";
}

function truncateActionFeedbackText(text, limit = ACTION_FEEDBACK_SNIPPET_LIMIT) {
  const value = String(text || "").trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}…`;
}

function actionFeedbackKey(message, messageIndex) {
  return [
    activeTabId || "tab",
    messageIndex,
    message?.role || "message",
    message?.toolName || "",
    message?.command || "",
    message?.timestamp || "",
  ].join("|");
}

function actionFeedbackSummary(message) {
  if (message?.role === "assistant") {
    return { kind: "final output", title: message.title || "final output", snippet: truncateActionFeedbackText(textFromContent(message?.content)) };
  }
  const title = messageTitle(message);
  if (message?.role === "bashExecution") {
    return {
      kind: "action",
      title,
      snippet: truncateActionFeedbackText(`$ ${message.command || ""}\n\n${message.output || ""}`),
    };
  }
  return { kind: "action", title, snippet: truncateActionFeedbackText(textFromContent(message?.content)) };
}

function feedbackMapForTab(tabId = activeTabId) {
  if (!tabId) return new Map();
  let map = actionFeedbackByTab.get(tabId);
  if (!map) {
    map = new Map();
    actionFeedbackByTab.set(tabId, map);
  }
  return map;
}

function queuedActionFeedback(tabId = activeTabId) {
  const map = actionFeedbackByTab.get(tabId);
  return map ? [...map.values()].sort((a, b) => a.messageIndex - b.messageIndex) : [];
}

function actionFeedbackSteerMessage(item) {
  const comment = item.comment ? `\nUser comment: ${item.comment}` : "";
  const snippet = item.snippet ? `\nAction excerpt:\n${item.snippet}` : "";
  const target = item.kind || "action";
  if (item.reaction === "up") return `Direct feedback: 👍 Good job! Keep this kind of ${target}.\nTarget (${target}): ${item.title}${snippet}`;
  if (item.reaction === "down") return `Direct feedback: 👎 Avoid or reconsider this ${target} and similar future patterns.\nTarget (${target}): ${item.title}${comment}${snippet}`;
  return `Direct feedback: ? Please explain this ${target} in detail in your final output.\nTarget (${target}): ${item.title}${snippet}`;
}

async function sendLiveActionFeedback(item) {
  if (!isRunActive()) return;
  await api("/api/steer", { method: "POST", body: { message: actionFeedbackSteerMessage(item) }, tabId: item.tabId });
  addEvent(`sent ${ACTION_FEEDBACK_REACTIONS[item.reaction]?.icon || "feedback"} action feedback as live steering`);
}

function setActionFeedback(message, messageIndex, reaction) {
  const tabId = activeTabId;
  if (!tabId || !ACTION_FEEDBACK_REACTIONS[reaction]) return;
  const key = actionFeedbackKey(message, messageIndex);
  const map = feedbackMapForTab(tabId);
  const existing = map.get(key);
  let comment = existing?.comment || "";
  if (reaction === "down") {
    const nextComment = window.prompt("Optional comment for Pi about what to avoid:", comment);
    if (nextComment === null) return;
    comment = nextComment.trim();
  }
  const summary = actionFeedbackSummary(message);
  const item = {
    key,
    tabId,
    messageIndex,
    reaction,
    comment,
    kind: summary.kind,
    title: summary.title,
    snippet: summary.snippet,
    createdAt: new Date().toISOString(),
  };
  map.set(key, item);
  renderAllMessages({ preserveScroll: true });
  renderFeedbackTray();
  if (isRunActive()) sendLiveActionFeedback(item).catch((error) => addEvent(error.message, "error"));
  else addEvent("feedback queued; send it after the agent has finished to create a LEARNING");
}

function serializeActionFeedback(item) {
  return {
    reaction: item.reaction,
    comment: item.comment,
    kind: item.kind,
    title: item.title,
    snippet: item.snippet,
    messageIndex: item.messageIndex,
    createdAt: item.createdAt,
  };
}

function feedbackReactionLabel(reaction) {
  if (reaction === "up") return "👍 thumbs up — Good job; repeat this pattern when appropriate.";
  if (reaction === "down") return "👎 thumbs down — avoid or reconsider this target/pattern; prioritize the user comment.";
  return "? question mark — explain this target in detail in the final output.";
}

function formatActionFeedbackLearningPrompt(items) {
  const lines = [
    "The user submitted direct feedback on specific Web UI action or final-output cards from your last run.",
    "Use it to steer future behavior and create or update a concise LEARNING note from this feedback.",
    "Reaction semantics:",
    "- 👍 thumbs up: treat as 'Good job!' and reinforce the action/pattern.",
    "- 👎 thumbs down: avoid or reconsider this target/pattern; include any user comment.",
    "- ? question mark: explain the target in detail in your final output.",
    "",
    "Feedback items:",
  ];
  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${feedbackReactionLabel(item.reaction)}`,
      `   Target (${item.kind || "action"}): ${item.title}`,
      item.comment ? `   User comment: ${item.comment}` : undefined,
      item.snippet ? `   Target excerpt:\n${item.snippet.split(/\r?\n/).map((line) => `     ${line}`).join("\n")}` : undefined,
    );
  });
  lines.push(
    "",
    "After processing this feedback, report which LEARNING was created or updated. If any item used '?', include the requested detailed explanation in the final response.",
  );
  return lines.filter((line) => line !== undefined).join("\n");
}

function isMissingActionFeedbackEndpoint(error) {
  return error?.statusCode === 404 || /not found/i.test(error?.message || "");
}

async function postQueuedFeedback(tabId, items) {
  const feedback = items.map(serializeActionFeedback);
  try {
    await api("/api/action-feedback", { method: "POST", body: { feedback }, tabId });
  } catch (error) {
    if (!isMissingActionFeedbackEndpoint(error)) throw error;
    addEvent("/api/action-feedback not found; falling back to a normal prompt. Restart Web UI to use the dedicated endpoint.", "warn");
    await api("/api/prompt", { method: "POST", body: { message: formatActionFeedbackLearningPrompt(feedback) }, tabId });
  }
}

function renderActionFeedbackControls(bubble, message, messageIndex) {
  if (!isActionFeedbackMessage(message) || messageIndex < 0) return;
  const key = actionFeedbackKey(message, messageIndex);
  const selected = actionFeedbackByTab.get(activeTabId)?.get(key)?.reaction;
  const controls = make("div", "action-feedback-controls");
  controls.setAttribute("aria-label", message?.role === "assistant" ? "Final output feedback" : "Action feedback");
  for (const [reaction, meta] of Object.entries(ACTION_FEEDBACK_REACTIONS)) {
    const button = make("button", `action-feedback-button feedback-${reaction}${selected === reaction ? " active" : ""}`, meta.icon);
    button.type = "button";
    button.title = meta.title;
    button.setAttribute("aria-label", meta.title);
    button.setAttribute("aria-pressed", selected === reaction ? "true" : "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActionFeedback(message, messageIndex, reaction);
    });
    controls.append(button);
  }
  bubble.classList.add("has-action-feedback");
  bubble.append(controls);
}

function renderFeedbackTray() {
  const items = queuedActionFeedback();
  const hasItems = items.length > 0;
  elements.feedbackTray.hidden = !hasItems;
  if (!hasItems) return;
  const questions = items.filter((item) => item.reaction === "question").length;
  const downs = items.filter((item) => item.reaction === "down").length;
  const ups = items.filter((item) => item.reaction === "up").length;
  const parts = [ups ? `${ups} 👍` : "", downs ? `${downs} 👎` : "", questions ? `${questions} ?` : ""].filter(Boolean).join(" · ");
  elements.feedbackTraySummary.textContent = `${items.length} action reaction${items.length === 1 ? "" : "s"} queued${parts ? ` (${parts})` : ""}.`;
  const runActive = isRunActive();
  elements.sendFeedbackButton.disabled = actionFeedbackSendBusy || runActive;
  elements.sendFeedbackButton.textContent = actionFeedbackSendBusy ? "Sending…" : runActive ? "Send after finish" : "Send & create LEARNING";
}

async function submitQueuedActionFeedback() {
  const tabId = activeTabId;
  const items = queuedActionFeedback(tabId);
  if (!tabId || items.length === 0 || actionFeedbackSendBusy) return;
  if (isRunActive()) {
    addEvent("wait for the agent to finish before sending queued action feedback", "warn");
    renderFeedbackTray();
    return;
  }

  actionFeedbackSendBusy = true;
  markTabWorkingLocally(tabId);
  setRunIndicatorActivity("Sending action feedback to Pi…");
  renderFeedbackTray();
  try {
    await postQueuedFeedback(tabId, items);
    actionFeedbackByTab.get(tabId)?.clear();
    renderAllMessages({ preserveScroll: true });
    addEvent("feedback sent; Pi will create a LEARNING");
    scheduleRefreshState();
    scheduleRefreshMessages();
    scheduleRefreshFooter();
  } catch (error) {
    markTabIdleLocally(tabId);
    clearRunIndicatorActivity();
    addEvent(error.message, "error");
    addTransientMessage({ role: "error", title: "feedback", content: error.message, level: "error" });
  } finally {
    actionFeedbackSendBusy = false;
    renderFeedbackTray();
  }
}

function renderContent(parent, content) {
  if (content === undefined || content === null) return;
  if (typeof content === "string") {
    appendText(parent, content);
    return;
  }
  if (!Array.isArray(content)) {
    appendText(parent, JSON.stringify(content, null, 2), "code-block");
    return;
  }

  for (const part of content) {
    if (!part || typeof part !== "object") {
      appendText(parent, String(part));
      continue;
    }
    if (part.type === "text") {
      appendText(parent, part.text || "");
    } else if (part.type === "thinking") {
      const details = make("details", "thinking-block");
      details.open = true;
      details.append(make("summary", undefined, "thinking"));
      appendText(details, part.thinking || "No thinking content was exposed by the provider.", "thinking-text");
      parent.append(details);
    } else if (part.type === "toolCall") {
      const details = make("details");
      details.open = true;
      details.append(make("summary", undefined, `tool call: ${part.name || "unknown"}`));
      appendText(details, JSON.stringify(part.arguments || {}, null, 2), "code-block");
      parent.append(details);
    } else if (part.type === "image") {
      appendImage(parent, part);
    } else {
      appendText(parent, JSON.stringify(part, null, 2), "code-block");
    }
  }
}

function messageTitle(message) {
  if (message.role === "assistant") return "Assistant";
  if (message.title) return message.title;
  if (message.role === "thinking") return "thinking";
  if (message.role === "toolCall") return `tool call: ${message.toolName || "unknown"}`;
  if (message.role === "assistantEvent") return "assistant event";
  if (message.role === "toolResult") return `tool result: ${message.toolName || "unknown"}`;
  if (message.role === "bashExecution") return `bash: ${message.command || ""}`;
  if (message.role === "compactionSummary") return "compaction summary";
  return message.role || "message";
}

function assistantThinkingText(part) {
  if (!part || typeof part !== "object") return "";
  if (part.type !== "thinking" && typeof part.thinking !== "string") return "";
  if (typeof part.thinking === "string") return part.thinking;
  return typeof part.content === "string" ? part.content : "";
}

function assistantToolCallName(part) {
  return String(part?.name || part?.toolName || part?.toolCall?.name || "unknown");
}

function assistantToolCallArguments(part) {
  return part?.arguments || part?.args || part?.input || part?.toolCall?.arguments || {};
}

function assistantFinalOutputPart(part) {
  if (part === undefined || part === null) return null;
  if (typeof part !== "object") {
    const text = String(part);
    return text.trim() ? { type: "text", text } : null;
  }
  if (part.type === "text") return typeof part.text === "string" && part.text.trim() ? part : null;
  if (typeof part.text === "string") return part.text.trim() ? { ...part, type: "text", text: part.text } : null;
  if (part.type === "image") return part;
  if (typeof part.content === "string" && part.type !== "thinking" && part.type !== "toolCall" && typeof part.thinking !== "string") {
    return part.content.trim() ? { type: "text", text: part.content } : null;
  }
  return null;
}

function assistantDisplayMessages(message) {
  if (message?.role !== "assistant") return [message];
  const base = { timestamp: message.timestamp };
  const content = message.content;
  if (typeof content === "string") {
    return content.trim() ? [{ ...message, title: "Assistant" }] : [];
  }
  if (!Array.isArray(content)) {
    return content === undefined || content === null ? [] : [{ ...message, title: "Assistant" }];
  }

  const displayMessages = [];
  const finalParts = [];
  for (const part of content) {
    const isThinkingPart = part && typeof part === "object" && (part.type === "thinking" || typeof part.thinking === "string");
    if (isThinkingPart) {
      const thinking = assistantThinkingText(part) || "No thinking content was exposed by the provider.";
      displayMessages.push({ ...base, role: "thinking", title: "thinking", content: thinking, thinking });
      continue;
    }
    if (part?.type === "toolCall") {
      const toolName = assistantToolCallName(part);
      const args = assistantToolCallArguments(part);
      displayMessages.push({ ...base, role: "toolCall", title: `tool call: ${toolName}`, toolName, arguments: args, content: args });
      continue;
    }
    const finalPart = assistantFinalOutputPart(part);
    if (finalPart) {
      finalParts.push(finalPart);
      continue;
    }
    if (part !== undefined && part !== null) {
      displayMessages.push({ ...base, role: "assistantEvent", title: part?.type ? `assistant ${part.type}` : "assistant event", content: part });
    }
  }

  if (finalParts.length > 0) {
    displayMessages.push({ ...message, title: "Assistant", content: finalParts });
  }
  return displayMessages;
}

function stickyUserPromptPreviewText(text) {
  const value = cleanStatusText(text);
  if (!value) return "(empty prompt)";
  if (value.length <= STICKY_USER_PROMPT_PREVIEW_LIMIT) return value;
  return `${value.slice(0, STICKY_USER_PROMPT_PREVIEW_LIMIT - 1)}…`;
}

function messageUserPromptText(message) {
  return cleanStatusText(textFromContent(message?.content));
}

function stickyUserPromptPreview(message) {
  return stickyUserPromptPreviewText(messageUserPromptText(message));
}

function loadLastUserPromptCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_USER_PROMPT_STORAGE_KEY) || "{}");
    lastUserPromptByTab = new Map(Object.entries(raw).filter(([, entry]) => entry && typeof entry.text === "string"));
  } catch {
    lastUserPromptByTab = new Map();
  }
}

function persistLastUserPromptCache() {
  try {
    localStorage.setItem(LAST_USER_PROMPT_STORAGE_KEY, JSON.stringify(Object.fromEntries([...lastUserPromptByTab.entries()].slice(-24))));
  } catch {
    // Ignore storage failures; the in-memory prompt cache still works for this page load.
  }
}

function rememberLastUserPrompt(text, { tabId = activeTabId, messageIndex = null } = {}) {
  if (!tabId) return null;
  const cleanText = cleanStatusText(text);
  if (!cleanText) return null;
  const entry = {
    text: cleanText,
    preview: stickyUserPromptPreviewText(cleanText),
    messageIndex: Number.isInteger(messageIndex) ? messageIndex : null,
    updatedAt: Date.now(),
  };
  lastUserPromptByTab.set(tabId, entry);
  persistLastUserPromptCache();
  return entry;
}

function forgetLastUserPrompt(tabId = activeTabId) {
  if (!tabId || !lastUserPromptByTab.delete(tabId)) return;
  persistLastUserPromptCache();
}

function syncLastUserPromptFromMessages(messages = latestMessages) {
  const lastUserIndex = (messages || []).findLastIndex((message) => message?.role === "user");
  if (lastUserIndex >= 0) {
    rememberLastUserPrompt(messageUserPromptText(messages[lastUserIndex]), { messageIndex: lastUserIndex });
    return;
  }
  if (!(messages || []).some((message) => message?.role === "compactionSummary")) forgetLastUserPrompt();
}

function cachedLastUserPromptTarget() {
  const entry = activeTabId ? lastUserPromptByTab.get(activeTabId) : null;
  if (!entry?.text) return null;
  const summaryNode = elements.chat.querySelector('.message.compactionSummary[data-message-index]');
  return {
    index: Number.isInteger(entry.messageIndex) ? entry.messageIndex : -1,
    message: null,
    node: summaryNode,
    top: summaryNode ? chatScrollTopForNode(summaryNode) : 0,
    preview: entry.preview || stickyUserPromptPreviewText(entry.text),
    compacted: true,
  };
}

function chatScrollTopForNode(node) {
  if (!node) return 0;
  const chatRect = elements.chat.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return elements.chat.scrollTop + nodeRect.top - chatRect.top;
}

function stickyUserPromptViewportGap() {
  const button = elements.stickyUserPromptButton;
  if (!button || button.hidden) return STICKY_USER_PROMPT_TOP_GAP_PX;
  return Math.ceil(button.getBoundingClientRect().height) + STICKY_USER_PROMPT_TOP_GAP_PX;
}

function resetChatOutput() {
  elements.chat.replaceChildren();
  if (elements.stickyUserPromptButton) elements.chat.append(elements.stickyUserPromptButton);
}

function userPromptTargets() {
  return [...elements.chat.querySelectorAll('.message[data-user-prompt="true"][data-message-index]')]
    .map((node) => {
      const index = Number(node.dataset.messageIndex);
      if (!Number.isInteger(index)) return null;
      const message = latestMessages[index];
      if (!message) return null;
      return { index, message, node, top: chatScrollTopForNode(node), preview: stickyUserPromptPreview(message) };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function findStickyUserPromptTarget(targets = userPromptTargets()) {
  if (targets.length === 0) return cachedLastUserPromptTarget();
  const viewportTop = elements.chat.scrollTop + stickyUserPromptViewportGap();
  const previousPrompt = targets.filter((target) => target.top < viewportTop - STICKY_USER_PROMPT_TOP_GAP_PX).at(-1);
  if (previousPrompt) return previousPrompt;

  const latestPrompt = targets.at(-1);
  const latestTopInView = latestPrompt.top - elements.chat.scrollTop;
  const latestVisibleNearTop = latestTopInView >= 0 && latestTopInView <= Math.min(elements.chat.clientHeight * 0.55, 180);
  if (targets.length === 1 && latestVisibleNearTop) return null;
  return latestPrompt;
}

function updateStickyUserPromptButton() {
  const button = elements.stickyUserPromptButton;
  if (!button) return;
  const targets = userPromptTargets();
  const target = findStickyUserPromptTarget(targets);
  if (!target) {
    button.hidden = true;
    button.removeAttribute("data-message-index");
    button.removeAttribute("data-compacted");
    button.replaceChildren();
    return;
  }

  const ordinal = target.compacted ? 1 : targets.findIndex((item) => item.index === target.index) + 1;
  const isLatest = target.compacted || ordinal === targets.length;
  const label = target.compacted ? "Last user prompt (compacted)" : isLatest ? "Last user prompt" : "Previous user prompt";
  const meta = target.compacted ? "summary ↑" : `${ordinal}/${targets.length} ↑`;
  button.hidden = false;
  button.dataset.compacted = target.compacted ? "true" : "false";
  if (Number.isInteger(target.index) && target.index >= 0) button.dataset.messageIndex = String(target.index);
  else button.removeAttribute("data-message-index");
  button.title = target.compacted ? `Prompt was compacted; jump to compaction summary: ${target.preview}` : `Jump to ${label.toLowerCase()}: ${target.preview}`;
  button.setAttribute("aria-label", target.compacted ? `Prompt was compacted; jump to compaction summary: ${target.preview}` : `Jump to ${label.toLowerCase()} (${ordinal} of ${targets.length}): ${target.preview}`);
  button.replaceChildren(
    make("span", "sticky-user-prompt-label", label),
    make("span", "sticky-user-prompt-text", target.preview),
    make("span", "sticky-user-prompt-meta", meta),
  );
}

function jumpToStickyUserPrompt() {
  const button = elements.stickyUserPromptButton;
  const index = Number(button?.dataset.messageIndex);
  let target = Number.isInteger(index) ? elements.chat.querySelector(`.message[data-user-prompt="true"][data-message-index="${index}"]`) : null;
  if (!target && button?.dataset.compacted === "true") target = elements.chat.querySelector('.message.compactionSummary[data-message-index]');
  if (!target) return;
  autoFollowChat = false;
  lastChatProgrammaticScrollAt = performance.now();
  setChatScrollTopInstant(Math.max(0, chatScrollTopForNode(target) - stickyUserPromptViewportGap()));
  updateJumpToLatestButton();
  updateStickyUserPromptButton();
  requestAnimationFrame(updateStickyUserPromptButton);
}

function appendMessage(message, { streaming = false, messageIndex = -1, transient = false } = {}) {
  const role = String(message.role || "message");
  const safeRole = role.replace(/[^a-z0-9_-]/gi, "");
  const bubble = make("article", `message ${safeRole}${message.level ? ` ${message.level}` : ""}${streaming ? " streaming" : ""}`);
  if (!transient && messageIndex >= 0) {
    bubble.dataset.messageIndex = String(messageIndex);
    if (role === "user") bubble.dataset.userPrompt = "true";
  }
  const isCollapsibleOutput = !streaming && (message.role === "toolResult" || message.role === "bashExecution" || message.role === "compactionSummary");

  const header = make(isCollapsibleOutput ? "summary" : "div", "message-header");
  header.append(make("span", "message-role", messageTitle(message)));
  header.append(make("span", "muted", formatDate(message.timestamp)));
  const body = make("div", "message-body");

  if (message.role === "bashExecution") {
    appendText(body, `$ ${message.command || ""}\n\n${message.output || ""}`, "code-block");
  } else if (message.role === "compactionSummary") {
    appendText(body, message.summary || "Context was compacted.");
  } else if (message.role === "toolResult") {
    renderContent(body, message.content);
    if (message.isError) bubble.classList.add("error");
  } else if (message.role === "thinking") {
    appendText(body, message.thinking || textFromContent(message.content) || "No thinking content was exposed by the provider.", "thinking-text");
  } else if (message.role === "toolCall") {
    appendText(body, JSON.stringify(message.arguments ?? message.content ?? {}, null, 2), "code-block");
  } else if (message.role === "assistantEvent") {
    appendText(body, typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? {}, null, 2), "code-block");
  } else {
    renderContent(body, message.content);
  }

  if (isCollapsibleOutput) {
    const details = make("details", "message-collapse");
    if (message.isError) details.open = true;
    details.append(header, body);
    bubble.append(details);
  } else {
    bubble.append(header, body);
  }
  if (!streaming && !transient) renderActionFeedbackControls(bubble, message, messageIndex);
  elements.chat.append(bubble);
  return { bubble, body };
}

function appendTranscriptMessage(message, { streaming = false, messageIndex = -1, transient = false } = {}) {
  if (streaming || transient || message?.role !== "assistant") {
    return appendMessage(message, { streaming, messageIndex, transient });
  }

  let finalOutput = null;
  const displayMessages = assistantDisplayMessages(message);
  displayMessages.forEach((displayMessage) => {
    const created = appendMessage(displayMessage, {
      streaming: false,
      messageIndex: displayMessage.role === "assistant" ? messageIndex : -1,
      transient: false,
    });
    if (displayMessage.role === "assistant") finalOutput = created;
  });
  return finalOutput;
}

function stateHasRunIndicatorActivity(state = currentState) {
  return !!state?.isStreaming || !!state?.isCompacting;
}

function runIndicatorIsActive() {
  return runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState);
}

function clearRunIndicatorGraceCheck() {
  clearTimeout(runIndicatorGraceCheckTimer);
  runIndicatorGraceCheckTimer = null;
}

function scheduleRunIndicatorGraceCheck() {
  if (!runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState) || !runIndicatorStartedAt) return;
  const elapsedMs = performance.now() - runIndicatorStartedAt;
  const delayMs = Math.max(120, RUN_INDICATOR_START_GRACE_MS - elapsedMs + 120);
  clearRunIndicatorGraceCheck();
  runIndicatorGraceCheckTimer = setTimeout(() => {
    runIndicatorGraceCheckTimer = null;
    if (!runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState)) return;
    runIndicatorLastStateCheckAt = performance.now();
    refreshState().catch((error) => addEvent(error.message, "error"));
  }, delayMs);
}

function maybeRefreshRunIndicatorState() {
  if (!runIndicatorIsActive()) return;
  const now = performance.now();
  if (now - runIndicatorLastStateCheckAt < RUN_INDICATOR_STATE_RECHECK_MS) return;
  runIndicatorLastStateCheckAt = now;
  refreshState().catch((error) => addEvent(error.message, "error"));
}

function formatRunIndicatorElapsed() {
  if (!runIndicatorStartedAt) return "live";
  const elapsedSeconds = Math.max(0, Math.floor((performance.now() - runIndicatorStartedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function runIndicatorHeadline() {
  if (currentState?.isCompacting && !currentState?.isStreaming) return "Pi is compacting context:";
  return "Agent is still runing: ";
}

function runIndicatorShowsElapsed() {
  return !/^Abort requested/i.test(runIndicatorActivity || "");
}

function runIndicatorDetail() {
  if (runIndicatorActivity) return runIndicatorActivity;
  if (currentState?.isCompacting && !currentState?.isStreaming) return "Compacting context…";
  return "Waiting for output or action…";
}

function startRunIndicatorTicker() {
  if (runIndicatorTimer) return;
  runIndicatorTimer = setInterval(() => {
    if (!runIndicatorIsActive()) {
      removeRunIndicatorBubble();
      return;
    }
    updateRunIndicatorBubble();
    maybeRefreshRunIndicatorState();
  }, RUN_INDICATOR_TICK_MS);
}

function stopRunIndicatorTicker() {
  clearInterval(runIndicatorTimer);
  runIndicatorTimer = null;
}

function ensureRunIndicatorBubble() {
  if (runIndicatorBubble?.parentElement !== elements.chat) {
    runIndicatorBubble = make("article", "message runIndicator run-indicator-message streaming");
    runIndicatorBubble.setAttribute("aria-live", "polite");
    runIndicatorBubble.setAttribute("aria-label", "Agent is still runing:");

    const body = make("div", "message-body");
    const row = make("div", "run-indicator-row");
    const pulse = make("span", "run-indicator-pulse");
    pulse.setAttribute("aria-hidden", "true");
    runIndicatorText = make("span", "run-indicator-text");
    runIndicatorMeta = make("span", "run-indicator-meta");
    row.append(pulse, runIndicatorText, runIndicatorMeta);
    body.append(row);
    runIndicatorBubble.append(body);
  }
  if (elements.chat.lastElementChild !== runIndicatorBubble) elements.chat.append(runIndicatorBubble);
}

function updateRunIndicatorBubble() {
  if (!runIndicatorIsActive()) return;
  if (!runIndicatorStartedAt) runIndicatorStartedAt = performance.now();
  ensureRunIndicatorBubble();
  runIndicatorText.textContent = runIndicatorHeadline();
  const detail = runIndicatorDetail();
  runIndicatorMeta.textContent = runIndicatorShowsElapsed() ? `${detail} · run time ${formatRunIndicatorElapsed()}` : detail;
}

function removeRunIndicatorBubble() {
  stopRunIndicatorTicker();
  runIndicatorBubble?.remove();
  runIndicatorBubble = null;
  runIndicatorText = null;
  runIndicatorMeta = null;
}

function renderRunIndicator({ scroll = false } = {}) {
  if (!runIndicatorIsActive()) {
    removeRunIndicatorBubble();
    return;
  }
  const shouldFollow = scroll && (autoFollowChat || isChatNearBottom());
  updateRunIndicatorBubble();
  startRunIndicatorTicker();
  if (shouldFollow) scrollChatToBottom();
}

function setRunIndicatorActivity(activity, { active = true, scroll = true } = {}) {
  if (active) {
    runIndicatorLocallyActive = true;
    if (!runIndicatorStartedAt) runIndicatorStartedAt = performance.now();
  }
  runIndicatorActivity = activity || runIndicatorActivity || "Waiting for output or action…";
  renderRunIndicator({ scroll });
  if (active) scheduleRunIndicatorGraceCheck();
}

function clearRunIndicatorActivity({ render = true } = {}) {
  clearRunIndicatorGraceCheck();
  runIndicatorLastStateCheckAt = 0;
  runIndicatorLocallyActive = false;
  runIndicatorStartedAt = null;
  runIndicatorActivity = "Waiting for output or action…";
  if (render) renderRunIndicator();
}

function syncRunIndicatorFromState(state = currentState) {
  if (stateHasRunIndicatorActivity(state)) {
    clearRunIndicatorGraceCheck();
    runIndicatorLocallyActive = true;
    if (!runIndicatorStartedAt) runIndicatorStartedAt = performance.now();
    if (state.isCompacting && !state.isStreaming && runIndicatorActivity === "Waiting for output or action…") {
      runIndicatorActivity = "Compacting context…";
    }
    renderRunIndicator({ scroll: true });
  } else if (runIndicatorLocallyActive && runIndicatorStartedAt && performance.now() - runIndicatorStartedAt < RUN_INDICATOR_START_GRACE_MS) {
    renderRunIndicator({ scroll: true });
    scheduleRunIndicatorGraceCheck();
  } else if (runIndicatorLocallyActive) {
    clearRunIndicatorActivity();
  } else {
    renderRunIndicator();
  }
}

function runIndicatorToolName(name) {
  return cleanStatusText(name || "tool") || "tool";
}

function scheduleAbortStateChecks() {
  for (const delay of [250, 900, 1800, 3600]) {
    setTimeout(() => refreshState().catch((error) => addEvent(error.message, "error")), delay);
  }
}

function renderAllMessages({ preserveScroll = false } = {}) {
  const shouldFollow = !preserveScroll && (autoFollowChat || isChatNearBottom());
  const previousScrollTop = elements.chat.scrollTop;
  resetChatOutput();
  latestMessages.forEach((message, index) => appendTranscriptMessage(message, { messageIndex: index }));
  transientMessages.forEach((message, index) => appendTranscriptMessage(message, { messageIndex: index, transient: true }));
  renderRunIndicator({ scroll: false });
  updateStickyUserPromptButton();
  if (shouldFollow) scrollChatToBottom({ force: true });
  else {
    elements.chat.scrollTop = Math.min(previousScrollTop, elements.chat.scrollHeight);
    autoFollowChat = isChatNearBottom();
    updateJumpToLatestButton();
  }
  updateStickyUserPromptButton();
}

function addTransientMessage({ role = "notice", title, content, level = "info" }) {
  transientMessages.push({
    role,
    title,
    level,
    content,
    timestamp: Date.now(),
  });
  if (transientMessages.length > 80) transientMessages.splice(0, transientMessages.length - 80);
  renderAllMessages();
}

function isChatNearBottom() {
  const remaining = elements.chat.scrollHeight - elements.chat.scrollTop - elements.chat.clientHeight;
  return remaining <= CHAT_BOTTOM_THRESHOLD_PX;
}

function updateJumpToLatestButton() {
  elements.jumpToLatestButton.hidden = autoFollowChat || isChatNearBottom();
}

function noteChatUserScrollIntent(event) {
  if (event?.type === "wheel" && event.deltaY >= 0 && autoFollowChat) return;
  chatUserScrollIntentUntil = performance.now() + CHAT_USER_SCROLL_INTENT_MS;
}

function isChatUserScrollIntentActive() {
  return performance.now() <= chatUserScrollIntentUntil;
}

function setChatScrollTopInstant(top) {
  const previousBehavior = elements.chat.style.scrollBehavior;
  elements.chat.style.scrollBehavior = "auto";
  elements.chat.scrollTop = top;
  if (previousBehavior) elements.chat.style.scrollBehavior = previousBehavior;
  else elements.chat.style.removeProperty("scroll-behavior");
}

function applyChatFollowScroll() {
  chatFollowFrame = null;
  if (!autoFollowChat) {
    updateJumpToLatestButton();
    updateStickyUserPromptButton();
    return;
  }
  lastChatProgrammaticScrollAt = performance.now();
  setChatScrollTopInstant(elements.chat.scrollHeight);
  updateJumpToLatestButton();
  updateStickyUserPromptButton();
}

function scheduleChatFollowScroll() {
  if (chatFollowFrame === null) chatFollowFrame = requestAnimationFrame(applyChatFollowScroll);
  clearTimeout(chatFollowSettleTimer);
  chatFollowSettleTimer = setTimeout(() => {
    chatFollowSettleTimer = null;
    applyChatFollowScroll();
  }, CHAT_FOLLOW_SETTLE_DELAY_MS);
}

function scrollChatToBottom({ force = false } = {}) {
  if (force) autoFollowChat = true;
  if (!autoFollowChat) {
    updateJumpToLatestButton();
    updateStickyUserPromptButton();
    return;
  }
  lastChatProgrammaticScrollAt = performance.now();
  setChatScrollTopInstant(elements.chat.scrollHeight);
  scheduleChatFollowScroll();
  updateJumpToLatestButton();
  updateStickyUserPromptButton();
}

function syncAutoFollowFromChatScroll() {
  const nearBottom = isChatNearBottom();
  const recentProgrammaticScroll = performance.now() - lastChatProgrammaticScrollAt <= CHAT_PROGRAMMATIC_SCROLL_GRACE_MS;
  if (nearBottom || isChatUserScrollIntentActive() || !autoFollowChat || !recentProgrammaticScroll) {
    autoFollowChat = nearBottom;
  } else {
    scheduleChatFollowScroll();
  }
  updateJumpToLatestButton();
  updateStickyUserPromptButton();
}

function jumpToLatest() {
  scrollChatToBottom({ force: true });
  markTabOutputSeen(activeTabId, { force: true });
}

function syncMobileChatToBottomForInput() {
  if (!isMobileView()) return;
  autoFollowChat = true;
  scrollChatToBottom({ force: true });
  requestAnimationFrame(() => scrollChatToBottom({ force: true }));
  setTimeout(() => scrollChatToBottom({ force: true }), 140);
  setTimeout(() => scrollChatToBottom({ force: true }), 360);
}

function showComposerButtonTooltip(button) {
  if (!button) return;
  button.classList.add("tooltip-open");
  button.focus({ preventScroll: true });
  clearTimeout(button._tooltipTimer);
  button._tooltipTimer = setTimeout(() => button.classList.remove("tooltip-open"), 3200);
}

function sendPromptFromModeButton(kind, button) {
  if (!elements.promptInput.value.trim()) {
    showComposerButtonTooltip(button);
    return;
  }
  sendPrompt(kind);
}

function shouldSendPromptFromEnter(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey) return true;
  return !isMobileView();
}

function renderMessages(messages) {
  latestMessages = messages || [];
  syncLastUserPromptFromMessages(latestMessages);
  renderAllMessages();
  renderFooter();
  renderFeedbackTray();
}

function ensureStreamBubble() {
  if (streamBubble) return;
  const created = appendMessage({ role: "assistant", title: "Assistant", timestamp: Date.now(), content: "" }, { streaming: true });
  streamBubble = created.bubble;
  streamText = appendText(created.body, "");
  renderRunIndicator({ scroll: false });
  scrollChatToBottom();
}

function ensureStreamingThinkingBubble() {
  if (streamThinkingBubble) return;
  const created = appendMessage({ role: "thinking", title: "thinking", timestamp: Date.now(), content: "" }, { streaming: true });
  streamThinkingBubble = created.bubble;
  streamThinking = appendText(created.body, "", "thinking-text");
  renderRunIndicator({ scroll: false });
  scrollChatToBottom();
}

function showStreamingThinking(placeholder = "Thinking…") {
  ensureStreamingThinkingBubble();
  if (!streamThinking.textContent) streamThinking.textContent = placeholder;
}

function resetStreamBubble() {
  streamBubble = null;
  streamText = null;
  streamRawText = "";
  streamThinkingBubble = null;
  streamThinking = null;
}

function thinkingDeltaText(update) {
  return update.delta || update.thinking || update.content || "";
}

function assistantStreamingMessage(event) {
  if (event?.message?.role === "assistant") return event.message;
  const partial = event?.assistantMessageEvent?.partial;
  return partial?.role === "assistant" ? partial : null;
}

function assistantTextFromMessage(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .filter((part) => part && typeof part === "object" && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text);
  return parts.length ? parts.join("\n\n") : "";
}

function assistantThinkingTextFromMessage(message) {
  const content = message?.content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .filter((part) => part && typeof part === "object" && (part.type === "thinking" || typeof part.thinking === "string"))
    .map((part) => assistantThinkingText(part))
    .filter((text) => text.trim());
  return parts.length ? parts.join("\n\n") : "";
}

function setStreamingThinkingText(text) {
  showStreamingThinking("");
  streamThinking.textContent = text;
}

function syncStreamingThinkingFromMessage(event, { placeholder = "" } = {}) {
  const text = assistantThinkingTextFromMessage(assistantStreamingMessage(event));
  if (text === null) return false;
  if (text || placeholder || streamThinkingBubble) setStreamingThinkingText(text || placeholder);
  return true;
}

function handleMessageUpdate(event) {
  const update = event.assistantMessageEvent || {};
  if (update.type === "thinking_start") {
    setRunIndicatorActivity("Thinking…", { scroll: false });
    syncStreamingThinkingFromMessage(event, { placeholder: "Thinking…" });
    scrollChatToBottom();
  } else if (update.type === "thinking_delta") {
    const delta = thinkingDeltaText(update);
    currentRunStreamChars += delta.length;
    setRunIndicatorActivity("Thinking…", { scroll: false });
    const synced = syncStreamingThinkingFromMessage(event);
    if (!synced || (!streamThinking?.textContent && delta)) {
      showStreamingThinking("");
      if (streamThinking.textContent === "Thinking…") streamThinking.textContent = "";
      streamThinking.textContent += delta;
    }
    renderFooter();
    scrollChatToBottom();
  } else if (update.type === "thinking_end") {
    const finalThinking = assistantThinkingTextFromMessage(assistantStreamingMessage(event)) || thinkingDeltaText(update);
    if (finalThinking) setStreamingThinkingText(finalThinking);
    streamThinkingBubble?.classList.add("complete");
    setRunIndicatorActivity("Finished thinking; waiting for the next output or action…", { scroll: false });
  } else if (update.type === "text_delta" || update.type === "text_end") {
    const delta = update.type === "text_delta" ? update.delta || "" : "";
    currentRunStreamChars += delta.length;
    const partialText = assistantTextFromMessage(assistantStreamingMessage(event));
    if (typeof partialText === "string") streamRawText = partialText;
    else if (update.type === "text_end" && typeof update.content === "string") streamRawText = update.content;
    else streamRawText += delta;
    const assistantText = stripTodoProgressLines(streamRawText, { streaming: true });
    setRunIndicatorActivity("Writing response…", { scroll: false });
    if (assistantText) {
      ensureStreamBubble();
      streamText.textContent = assistantText;
    } else if (streamBubble) {
      streamBubble.remove();
      streamBubble = null;
      streamText = null;
      renderRunIndicator({ scroll: false });
    }
    renderFooter();
    scrollChatToBottom();
  } else if (update.type === "toolcall_start") {
    const name = runIndicatorToolName(update.name || update.toolName || update.toolCall?.name);
    setRunIndicatorActivity(`Preparing tool call: ${name}…`);
    addEvent(`tool call started in assistant message`, "info");
  } else if (update.type === "error") {
    setRunIndicatorActivity("Assistant stream reported an error…");
    appendMessage({ role: "error", title: "assistant error", timestamp: Date.now(), content: update.reason || update.errorMessage || "assistant error", level: "error" }, { streaming: true });
    renderRunIndicator({ scroll: false });
    scrollChatToBottom();
  }
}

async function refreshState() {
  const response = await api("/api/state");
  currentState = response.data || null;
  syncActiveTabActivityFromState(currentState);
  syncRunIndicatorFromState(currentState);
  renderStatus();
}

async function refreshStats() {
  const response = await api("/api/stats");
  latestStats = response.data || null;
  renderFooter();
}

async function refreshWorkspace() {
  try {
    const response = await api("/api/workspace");
    latestWorkspace = response.data || null;
  } catch (error) {
    // Older webui server processes do not have /api/workspace. Fall back to /api/health,
    // which has exposed cwd from the beginning, so the footer still shows the real path.
    const health = await api("/api/health");
    latestWorkspace = health.cwd
      ? {
          cwd: health.cwd,
          displayCwd: normalizeDisplayPath(health.cwd),
          uptimeMs: latestWorkspace?.uptimeMs || 0,
          git: { isRepo: false },
        }
      : null;
  }
  renderFooter();
}

function renderNetworkStatus() {
  const network = latestNetwork;
  const open = !!network?.open;
  const opening = !!network?.opening;
  const closing = !!network?.closing;
  const rebinding = opening || closing;
  const localUrl = network?.localUrl || `${window.location.origin}/`;
  const networkUrls = Array.isArray(network?.networkUrls) ? network.networkUrls : [];
  elements.networkStatus.className = `network-status ${opening ? "opening" : closing ? "closing" : open ? "open" : "closed"}`;
  elements.networkStatus.title = closing
    ? "Closing network access and returning to local-only"
    : open
      ? `Reachable on local network${networkUrls.length ? `:\n${networkUrls.join("\n")}` : " (no LAN address detected)"}`
      : "Only reachable from this machine";

  const heading = make(
    "div",
    "network-status-heading",
    opening ? "Opening to local network…" : closing ? "Closing network access…" : open ? "Open to local network" : "Closed · local only",
  );
  const detail = make(
    "div",
    "network-status-detail",
    closing
      ? "Rebinding to local-only access. Network clients will disconnect."
      : open
        ? "Use one of these URLs from a trusted device:"
        : "Only this machine can connect until you open the network listener.",
  );
  const list = make("div", "network-url-list");

  const addUrl = (label, url) => {
    if (!url) return;
    const row = make("div", "network-status-url-row");
    const labelNode = make("span", "network-status-url-label", label);
    const link = make("a", "network-status-url", url);
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    row.append(labelNode, link);
    list.append(row);
  };

  addUrl("Local", localUrl);
  if (open) {
    for (const url of networkUrls) addUrl("LAN", url);
    if (networkUrls.length === 0) list.append(make("div", "network-status-empty", "No LAN address detected."));
  }

  elements.networkStatus.replaceChildren(heading, detail, list);
  elements.openNetworkButton.disabled = rebinding;
  elements.openNetworkButton.textContent = opening ? "Opening…" : closing ? "Closing…" : open ? "Close for network" : "Open to network";
}

async function refreshNetworkStatus() {
  try {
    const response = await api("/api/network", { scoped: false });
    latestNetwork = response.data || null;
  } catch {
    const health = await api("/api/health", { scoped: false });
    latestNetwork = health.network || { open: false, opening: false, localUrl: window.location.origin };
  }
  renderNetworkStatus();
}

async function refreshFooterData() {
  await Promise.allSettled([refreshStats(), refreshWorkspace()]);
}

async function refreshMessages() {
  const response = await api("/api/messages");
  latestMessages = response.data?.messages || [];
  resetStreamBubble();
  renderMessages(latestMessages);
  markTabOutputSeen();
  renderFooter();
}

async function refreshModels() {
  const response = await api("/api/models");
  const models = response.data?.models || [];
  availableModels = models;
  try {
    const scopedResponse = await api("/api/scoped-models");
    footerScopedModels = scopedResponse.data?.models || [];
    footerScopedModelPatterns = scopedResponse.data?.patterns || [];
    footerScopedModelSource = scopedResponse.data?.source || "none";
  } catch (error) {
    footerScopedModels = [];
    footerScopedModelPatterns = [];
    footerScopedModelSource = "none";
    addEvent(`failed to load scoped models: ${error.message}`, "warn");
  }
  elements.modelSelect.replaceChildren();
  for (const model of models) {
    const option = document.createElement("option");
    option.value = JSON.stringify({ provider: model.provider, modelId: model.id });
    option.textContent = `${model.provider}/${model.id}${model.name ? ` · ${model.name}` : ""}`;
    elements.modelSelect.append(option);
  }
  syncModelSelectToState();
  renderFooter();
  renderFeedbackTray();
}

function syncModelSelectToState() {
  if (!currentState?.model || !elements.modelSelect.options.length) return;
  const value = JSON.stringify({ provider: currentState.model.provider, modelId: currentState.model.id });
  for (const option of elements.modelSelect.options) {
    if (option.value === value) {
      elements.modelSelect.value = value;
      break;
    }
  }
}

function normalizeCommands(commands) {
  const seen = new Set();
  return (commands || [])
    .map((command) => ({
      name: String(command.name || "").trim(),
      description: String(command.description || "").trim(),
      source: String(command.source || "command").trim(),
      location: String(command.location || "").trim(),
    }))
    .filter((command) => {
      if (!command.name || seen.has(command.name)) return false;
      seen.add(command.name);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function commandSourceLabel(command) {
  return [command.source, command.location].filter(Boolean).join(" · ") || "command";
}

function normalizePathSuggestions(suggestions) {
  const seen = new Set();
  return (suggestions || [])
    .map((suggestion) => {
      const path = String(suggestion.path || "").trim();
      return {
        path,
        label: String(suggestion.label || path).trim(),
        description: String(suggestion.description || path).trim(),
        type: suggestion.type === "directory" || path.endsWith("/") ? "directory" : "file",
      };
    })
    .filter((suggestion) => {
      if (!suggestion.path || seen.has(suggestion.path)) return false;
      seen.add(suggestion.path);
      return true;
    });
}

function getCommandTrigger() {
  const input = elements.promptInput;
  const cursor = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? cursor;
  if (cursor !== selectionEnd) return null;

  const beforeCursor = input.value.slice(0, cursor);
  const match = beforeCursor.match(/(^|[\s(])\/([^\s]*)$/);
  if (!match) return null;

  const query = match[2] || "";
  return {
    start: cursor - query.length - 1,
    end: cursor,
    query,
  };
}

function getPathTrigger() {
  const input = elements.promptInput;
  const cursor = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? cursor;
  if (cursor !== selectionEnd) return null;

  const beforeCursor = input.value.slice(0, cursor);
  const quotedMatch = beforeCursor.match(/(^|[\s(])@"([^"]*)$/);
  if (quotedMatch) {
    const query = quotedMatch[2] || "";
    return { start: cursor - query.length - 2, end: cursor, query, quoted: true };
  }

  const match = beforeCursor.match(/(^|[\s(])@([^\s"']*)$/);
  if (!match) return null;
  const query = match[2] || "";
  return { start: cursor - query.length - 1, end: cursor, query, quoted: false };
}

function scoreCommandSuggestion(command, query) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const name = command.name.toLowerCase();
  const description = command.description.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (description.includes(q)) return 3;
  return Number.POSITIVE_INFINITY;
}

function getCommandMatches(query) {
  return availableCommands
    .map((command) => ({ command, score: scoreCommandSuggestion(command, query) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score || a.command.name.localeCompare(b.command.name))
    .slice(0, 12)
    .map((item) => item.command);
}

function activeSuggestionCount() {
  return suggestionMode === "path" ? pathSuggestions.length : commandSuggestions.length;
}

function abortPathSuggestionRequest() {
  pathSuggestAbortController?.abort();
  pathSuggestAbortController = null;
}

function cancelPathSuggestionRequest() {
  pathSuggestRequestSerial++;
  abortPathSuggestionRequest();
}

function hideCommandSuggestions() {
  cancelPathSuggestionRequest();
  elements.commandSuggest.hidden = true;
  elements.commandSuggest.replaceChildren();
  commandSuggestions = [];
  pathSuggestions = [];
  suggestionMode = "none";
  commandSuggestIndex = 0;
}

function setActiveCommandSuggestion(index) {
  const count = activeSuggestionCount();
  if (!count) return;
  commandSuggestIndex = (index + count) % count;
  const items = [...elements.commandSuggest.querySelectorAll(".command-suggest-item")];
  for (const [itemIndex, item] of items.entries()) {
    const active = itemIndex === commandSuggestIndex;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
    if (active) item.scrollIntoView({ block: "nearest" });
  }
}

function renderCommandSuggestionItems(trigger, { keepIndex = false } = {}) {
  suggestionMode = "command";
  pathSuggestions = [];
  commandSuggestions = getCommandMatches(trigger.query);
  elements.commandSuggest.replaceChildren();

  if (commandSuggestions.length === 0) {
    elements.commandSuggest.append(make("div", "command-suggest-empty", `No command matches /${trigger.query}`));
    elements.commandSuggest.hidden = false;
    return;
  }

  for (const [index, command] of commandSuggestions.entries()) {
    const item = make("button", "command-suggest-item");
    item.type = "button";
    item.setAttribute("role", "option");
    item.addEventListener("mousedown", (event) => event.preventDefault());
    item.addEventListener("mouseenter", () => setActiveCommandSuggestion(index));
    item.addEventListener("click", () => insertCommandSuggestion(index));

    item.append(
      make("span", "command-suggest-name", `/${command.name}`),
      make("span", "command-suggest-desc", command.description || "No description"),
      make("span", "command-suggest-source", commandSourceLabel(command)),
    );
    elements.commandSuggest.append(item);
  }

  elements.commandSuggest.hidden = false;
  setActiveCommandSuggestion(keepIndex ? commandSuggestIndex : 0);
}

function pathSuggestionIsDirectory(suggestion) {
  return suggestion.type === "directory" || suggestion.path.endsWith("/");
}

function formatPathReference(pathText, forceQuoted = false) {
  const normalized = String(pathText || "").replace(/\\/g, "/");
  if (!forceQuoted && !/[\s"']/.test(normalized)) return `@${normalized}`;
  return `@"${normalized.replace(/(["\\])/g, "\\$1")}"`;
}

function renderPathSuggestionItems(trigger, { keepIndex = false } = {}) {
  suggestionMode = "path";
  commandSuggestions = [];
  elements.commandSuggest.replaceChildren();

  if (pathSuggestions.length === 0) {
    elements.commandSuggest.append(make("div", "command-suggest-empty", `No path matches @${trigger.query}`));
    elements.commandSuggest.hidden = false;
    return;
  }

  for (const [index, suggestion] of pathSuggestions.entries()) {
    const isDirectory = pathSuggestionIsDirectory(suggestion);
    const item = make("button", `command-suggest-item path-suggest-item ${isDirectory ? "directory" : "file"}`);
    item.type = "button";
    item.setAttribute("role", "option");
    item.addEventListener("mousedown", (event) => event.preventDefault());
    item.addEventListener("mouseenter", () => setActiveCommandSuggestion(index));
    item.addEventListener("click", () => insertPathSuggestion(index));

    item.append(
      make("span", "command-suggest-name path-suggest-name", `@${suggestion.path}`),
      make("span", "command-suggest-desc", suggestion.description || suggestion.path),
      make("span", "command-suggest-source", isDirectory ? "directory" : "file"),
    );
    elements.commandSuggest.append(item);
  }

  elements.commandSuggest.hidden = false;
  setActiveCommandSuggestion(keepIndex ? commandSuggestIndex : 0);
}

async function renderPathSuggestions(trigger, { keepIndex = false } = {}) {
  abortPathSuggestionRequest();
  const requestSerial = ++pathSuggestRequestSerial;
  const controller = new AbortController();
  pathSuggestAbortController = controller;
  suggestionMode = "path";
  commandSuggestions = [];
  pathSuggestions = [];
  elements.commandSuggest.replaceChildren(make("div", "command-suggest-empty", "Finding paths…"));
  elements.commandSuggest.hidden = false;

  try {
    const response = await api(`/api/path-suggestions?query=${encodeURIComponent(trigger.query)}`, { signal: controller.signal });
    if (requestSerial !== pathSuggestRequestSerial || document.activeElement !== elements.promptInput) return;
    pathSuggestions = normalizePathSuggestions(response.data?.suggestions || []);
    renderPathSuggestionItems(trigger, { keepIndex });
  } catch (error) {
    if (error?.name === "AbortError" || requestSerial !== pathSuggestRequestSerial) return;
    pathSuggestions = [];
    elements.commandSuggest.replaceChildren(make("div", "command-suggest-empty", `Path suggestions unavailable: ${error.message}`));
    elements.commandSuggest.hidden = false;
  } finally {
    if (requestSerial === pathSuggestRequestSerial) pathSuggestAbortController = null;
  }
}

function renderCommandSuggestions({ keepIndex = false } = {}) {
  if (document.activeElement !== elements.promptInput) {
    hideCommandSuggestions();
    return;
  }

  const pathTrigger = getPathTrigger();
  if (pathTrigger) {
    renderPathSuggestions(pathTrigger, { keepIndex });
    return;
  }

  cancelPathSuggestionRequest();
  const trigger = getCommandTrigger();
  if (!trigger || availableCommands.length === 0) {
    hideCommandSuggestions();
    return;
  }

  renderCommandSuggestionItems(trigger, { keepIndex });
}

function insertCommandSuggestion(index = commandSuggestIndex) {
  if (suggestionMode === "path") return insertPathSuggestion(index);
  const command = commandSuggestions[index];
  const trigger = getCommandTrigger();
  if (!command || !trigger) return false;

  const input = elements.promptInput;
  const value = input.value;
  let tokenEnd = trigger.end;
  while (tokenEnd < value.length && !/\s/.test(value[tokenEnd])) tokenEnd++;

  const commandText = `/${command.name}`;
  const suffix = value.slice(tokenEnd);
  const separator = suffix && /^\s/.test(suffix) ? "" : " ";
  input.value = `${value.slice(0, trigger.start)}${commandText}${separator}${suffix}`;

  const whitespaceOffset = separator ? 1 : suffix && /^\s/.test(suffix) ? 1 : 0;
  const cursor = trigger.start + commandText.length + whitespaceOffset;
  input.setSelectionRange(cursor, cursor);
  input.focus();
  hideCommandSuggestions();
  return true;
}

function insertPathSuggestion(index = commandSuggestIndex) {
  const suggestion = pathSuggestions[index];
  const trigger = getPathTrigger();
  if (!suggestion || !trigger) return false;

  const input = elements.promptInput;
  const value = input.value;
  let tokenEnd = trigger.end;
  if (trigger.quoted) {
    while (tokenEnd < value.length && value[tokenEnd] !== '"') tokenEnd++;
    if (value[tokenEnd] === '"') tokenEnd++;
  } else {
    while (tokenEnd < value.length && !/\s/.test(value[tokenEnd])) tokenEnd++;
  }

  const isDirectory = pathSuggestionIsDirectory(suggestion);
  const reference = formatPathReference(suggestion.path, trigger.quoted);
  const suffix = value.slice(tokenEnd);
  const separator = isDirectory || (suffix && /^\s/.test(suffix)) ? "" : " ";
  input.value = `${value.slice(0, trigger.start)}${reference}${separator}${suffix}`;

  const cursorOffset = isDirectory && reference.endsWith('"') ? reference.length - 1 : reference.length + separator.length;
  const cursor = trigger.start + cursorOffset;
  input.setSelectionRange(cursor, cursor);
  input.focus();
  resizePromptInput();
  if (isDirectory) renderCommandSuggestions();
  else hideCommandSuggestions();
  return true;
}

async function refreshCommands() {
  const response = await api("/api/commands");
  availableCommands = normalizeCommands(response.data?.commands || []);
  elements.commandsBox.replaceChildren();
  if (!availableCommands.length) {
    elements.commandsBox.textContent = "No RPC-visible commands.";
    elements.commandsBox.classList.add("muted");
    hideCommandSuggestions();
    return;
  }
  elements.commandsBox.classList.remove("muted");
  for (const command of availableCommands.slice(0, 80)) {
    const item = make("button", "command-item");
    item.type = "button";
    item.title = `Send /${command.name}`;
    item.setAttribute("aria-label", `Send /${command.name}${command.description ? `: ${command.description}` : ""}`);
    item.addEventListener("click", () => sendPrompt("prompt", `/${command.name}`));

    const code = make("code", undefined, `/${command.name}`);
    item.append(code);
    if (command.description) item.append(document.createTextNode(` — ${command.description}`));
    elements.commandsBox.append(item);
  }
  renderCommandSuggestions();
}

async function refreshAll() {
  const results = await Promise.allSettled([refreshState(), refreshMessages(), refreshModels(), refreshCommands(), refreshStats(), refreshWorkspace(), refreshNetworkStatus()]);
  for (const result of results) {
    if (result.status === "rejected") addEvent(result.reason.message || String(result.reason), "error");
  }
}

async function openToNetwork() {
  if (latestNetwork?.open) {
    await closeNetworkAccess();
    return;
  }
  if (!confirm("Open Pi Web UI to your local network?\n\nThe Web UI has no authentication and can control Pi/tools. Only do this on a trusted LAN.")) return;

  elements.openNetworkButton.disabled = true;
  elements.openNetworkButton.textContent = "Opening…";
  try {
    await api("/api/network/open", { method: "POST", scoped: false });
    latestNetwork = { ...(latestNetwork || {}), opening: true, closing: false };
    renderNetworkStatus();
    addEvent("opening webui to local network", "warn");
    for (let attempt = 0; attempt < 20; attempt++) {
      await delay(350);
      try {
        await refreshNetworkStatus();
        if (latestNetwork?.open && !latestNetwork?.opening) {
          const url = latestNetwork.networkUrls?.[0];
          addEvent(`webui open to local network${url ? `: ${url}` : ""}`, "warn");
          return;
        }
      } catch {
        // The listener briefly drops while rebinding; retry.
      }
    }
    await refreshNetworkStatus();
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    renderNetworkStatus();
  }
}

async function closeNetworkAccess() {
  if (!latestNetwork?.open) return;
  if (!confirm("Close Pi Web UI network access?\n\nThe local browser can keep using the UI, but LAN clients will disconnect.")) return;

  elements.openNetworkButton.disabled = true;
  elements.openNetworkButton.textContent = "Closing…";
  try {
    await api("/api/network/close", { method: "POST", scoped: false });
    latestNetwork = { ...(latestNetwork || {}), opening: false, closing: true };
    renderNetworkStatus();
    addEvent("closing webui network access", "warn");
    let refreshFailed = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await delay(350);
      try {
        await refreshNetworkStatus();
        if (!latestNetwork?.open && !latestNetwork?.closing) {
          addEvent("webui closed to local-only access", "warn");
          return;
        }
      } catch {
        refreshFailed = true;
        // Remote tabs will lose access after the listener returns to localhost.
      }
    }
    if (refreshFailed) {
      latestNetwork = { ...(latestNetwork || {}), open: false, opening: false, closing: false, networkUrls: [] };
      renderNetworkStatus();
      addEvent("webui network access closed; reconnect from this machine if this tab loses access", "warn");
      return;
    }
    addEvent("network close requested, but the server still reports network access open", "warn");
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    renderNetworkStatus();
  }
}

async function sendPrompt(kind = "prompt", explicitMessage) {
  const usesPromptInput = explicitMessage === undefined;
  const rawMessage = usesPromptInput ? elements.promptInput.value : explicitMessage;
  const message = String(rawMessage || "").trim();
  if (!message) return;

  const targetTabId = activeTabId;
  const startsRun = kind === "prompt" && !currentState?.isStreaming;
  if (kind === "prompt" && !message.startsWith("/")) rememberLastUserPrompt(message, { tabId: targetTabId });
  autoFollowChat = true;
  updateJumpToLatestButton();
  setComposerActionsOpen(false);
  if (startsRun) {
    markTabWorkingLocally(targetTabId);
    setRunIndicatorActivity("Sending prompt to Pi…");
  }

  try {
    let response;
    if (kind === "steer") {
      response = await api("/api/steer", { method: "POST", body: { message }, tabId: targetTabId });
    } else if (kind === "follow-up") {
      response = await api("/api/follow-up", { method: "POST", body: { message }, tabId: targetTabId });
    } else {
      const body = { message };
      if (currentState?.isStreaming) body.streamingBehavior = elements.busyBehavior.value || "followUp";
      response = await api("/api/prompt", { method: "POST", body, tabId: targetTabId });
    }
    applyResponseTab(response);
    if (response?.command === "native_slash_command" && /^\/new(?:\s|$)/.test(message)) forgetLastUserPrompt(targetTabId);
    if (startsRun && response?.command === "native_slash_command") {
      markTabIdleLocally(targetTabId);
      clearRunIndicatorActivity();
    } else if (kind === "steer" && currentState?.isStreaming) {
      setRunIndicatorActivity("Steering sent; waiting for the next output or action…");
    } else if (kind === "follow-up" && currentState?.isStreaming) {
      setRunIndicatorActivity("Follow-up queued; current agent run is still active…");
    }
    if (response?.command === "native_slash_command" && response.data?.copyText) {
      try {
        await navigator.clipboard.writeText(response.data.copyText);
      } catch (error) {
        response.data.message = `${response.data.message || "Copy requested, but clipboard access failed."}\n\nClipboard access failed: ${error.message}\n\n${response.data.copyText}`;
        response.data.level = "warn";
      }
    }
    if (response?.command === "native_slash_command" && response.data?.message) {
      addTransientMessage({ role: "native", title: message.split(/\s+/, 1)[0], content: response.data.message, level: response.data.level || "info" });
    }
    if (usesPromptInput) {
      elements.promptInput.value = "";
      resizePromptInput();
    }
    hideCommandSuggestions();
    scheduleRefreshState();
  } catch (error) {
    if (startsRun) {
      markTabIdleLocally(targetTabId);
      clearRunIndicatorActivity();
    }
    addEvent(error.message, "error");
    addTransientMessage({ role: "error", title: message.startsWith("/") ? message.split(/\s+/, 1)[0] : "error", content: error.message, level: "error" });
  }
}

function hasQueuedDialogRequest(id) {
  if (!id) return false;
  const key = String(id);
  return String(activeDialog?.id || "") === key || dialogQueue.some((request) => String(request?.id || "") === key);
}

function removeQueuedDialogRequests(ids = []) {
  const idSet = new Set(ids.map((id) => String(id)).filter(Boolean));
  if (idSet.size === 0) return;
  for (let i = dialogQueue.length - 1; i >= 0; i -= 1) {
    if (idSet.has(String(dialogQueue[i]?.id || ""))) dialogQueue.splice(i, 1);
  }
  if (activeDialog && idSet.has(String(activeDialog.id || ""))) {
    if (elements.dialog.open) elements.dialog.close();
    activeDialog = null;
    showNextDialog();
  }
}

function handleExtensionUiRequest(request) {
  request.tabId ||= activeTabId;
  switch (request.method) {
    case "notify": {
      const level = request.notifyType === "error" ? "error" : request.notifyType === "warning" ? "warn" : "info";
      const message = request.message || "notification";
      addEvent(message, level);
      addTransientMessage({ role: "extension", title: "extension output", content: message, level });
      return;
    }
    case "setStatus":
      if (request.statusText) statusEntries.set(request.statusKey || "extension", request.statusText);
      else statusEntries.delete(request.statusKey || "extension");
      renderStatus();
      return;
    case "setWidget":
      if (Array.isArray(request.widgetLines)) widgets.set(request.widgetKey || request.id, request);
      else widgets.delete(request.widgetKey || request.id);
      renderWidgets();
      return;
    case "setTitle":
      if (request.title) document.title = request.title;
      return;
    case "set_editor_text":
      elements.promptInput.value = request.text || "";
      resizePromptInput();
      elements.promptInput.focus();
      renderCommandSuggestions();
      return;
    case "select":
    case "confirm":
    case "input":
    case "editor":
      if (hasQueuedDialogRequest(request.id)) return;
      if (request.pendingExtensionUiRequestCount === undefined) {
        const tab = tabs.find((item) => item.id === request.tabId);
        if (setTabPendingBlockerCount(request.tabId, Math.max(1, tabPendingBlockerCount(tab) + 1))) renderTabs();
      }
      if (!request.replayed) notifyBlockedTab(request.tabId, { request, count: request.pendingExtensionUiRequestCount });
      if (request.replayed) addEvent(`recovered pending ${request.method} request`, "warn");
      setRunIndicatorActivity(`Waiting for your ${request.method} response…`);
      dialogQueue.push(request);
      showNextDialog();
      return;
    default:
      addEvent(`Unsupported extension UI request: ${request.method}`, "warn");
  }
}

async function sendDialogResponse(payload) {
  const { tabId = activeTabId, ...body } = payload;
  try {
    const response = await api("/api/extension-ui-response", { method: "POST", body, tabId });
    if (!applyResponseTab(response) && decrementTabPendingBlockerCount(tabId)) renderTabs();
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    if (elements.dialog.open) elements.dialog.close();
    activeDialog = null;
    if (runIndicatorIsActive()) setRunIndicatorActivity("Continuing after your response…");
    showNextDialog();
  }
}

function addDialogButton(label, handler, className) {
  const button = make("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  elements.dialogActions.append(button);
  return button;
}

function showNextDialog() {
  if (activeDialog || dialogQueue.length === 0) return;
  activeDialog = dialogQueue.shift();
  const request = activeDialog;

  const prompt = normalizeDialogPrompt(request);
  const isGuardrailDialog = isGuardrailDialogPrompt(prompt);
  elements.dialog.classList.toggle("guardrail-dialog", isGuardrailDialog);
  elements.dialogTitle.textContent = prompt.title;
  renderAnsiText(elements.dialogMessage, prompt.message);
  elements.dialogMessage.hidden = !prompt.plainMessage;
  elements.dialogBody.replaceChildren();
  elements.dialogActions.replaceChildren();

  const cancel = () => sendDialogResponse({ type: "extension_ui_response", id: request.id, cancelled: true, tabId: request.tabId });

  if (request.method === "select") {
    const options = make("div", "dialog-options");
    for (const option of request.options || []) {
      const optionLabel = String(option);
      const button = make("button", undefined, optionLabel);
      button.type = "button";
      if (isGuardrailDialog && /^Block$/i.test(optionLabel)) button.classList.add("guardrail-safe-action");
      if (isGuardrailDialog && /^Allow/i.test(optionLabel)) button.classList.add("guardrail-allow-action");
      button.addEventListener("click", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, value: optionLabel, tabId: request.tabId }));
      options.append(button);
    }
    elements.dialogBody.append(options);
    addDialogButton("Cancel", cancel);
  } else if (request.method === "confirm") {
    addDialogButton("Cancel", cancel);
    addDialogButton("No", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, confirmed: false, tabId: request.tabId }));
    addDialogButton("Yes", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, confirmed: true, tabId: request.tabId }), "primary");
  } else if (request.method === "input") {
    const input = make("input", "dialog-input");
    input.value = request.prefill || "";
    input.placeholder = request.placeholder || "";
    elements.dialogBody.append(input);
    addDialogButton("Cancel", cancel);
    addDialogButton("Submit", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, value: input.value, tabId: request.tabId }), "primary");
    setTimeout(() => input.focus(), 0);
  } else if (request.method === "editor") {
    const textarea = make("textarea", "dialog-editor");
    textarea.value = request.prefill || "";
    elements.dialogBody.append(textarea);
    addDialogButton("Cancel", cancel);
    addDialogButton("Submit", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, value: textarea.value, tabId: request.tabId }), "primary");
    setTimeout(() => textarea.focus(), 0);
  }

  elements.dialog.showModal();
}

function handleEvent(event) {
  ingestEventTabActivity(event);
  switch (event.type) {
    case "webui_connected":
      addEvent(`connected to ${event.tabTitle || "terminal"} for ${event.cwd}`);
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "webui_tab_renamed":
      applyTabMetadata(event.tab || { id: event.tabId, title: event.tabTitle, activity: event.tabActivity });
      addEvent(`${event.previousTabTitle || "terminal"} renamed to ${event.tabTitle || "terminal"}`);
      break;
    case "pi_process_start":
      addEvent(`started pi rpc pid ${event.pid}`);
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "webui_tab_restarting":
      addEvent(`restarting ${event.tabTitle || "terminal"} in ${event.cwd}`);
      break;
    case "webui_tab_reloading":
      addEvent(`reloading ${event.tabTitle || "terminal"} native Pi resources`);
      addTransientMessage({ role: "native", title: "/reload", content: `Reloading ${event.tabTitle || "terminal"} native Pi resources…`, level: "info" });
      break;
    case "webui_tab_reloaded":
      addEvent(`${event.tabTitle || "terminal"} reloaded`);
      addTransientMessage({ role: "native", title: "/reload", content: `${event.tabTitle || "terminal"} reloaded. Keybindings, extensions, skills, prompts, and themes were refreshed by restarting the RPC tab${event.sessionFile ? ` and resuming ${event.sessionFile}` : ""}.`, level: "info" });
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      setTimeout(() => refreshAll().catch((error) => addEvent(error.message, "error")), 500);
      break;
    case "webui_extension_ui_cancelled":
      removeQueuedDialogRequests(event.ids || []);
      addEvent(`cancelled ${event.ids?.length || 0} pending extension UI request(s)`, "warn");
      break;
    case "webui_cwd_changed":
      addEvent(`${event.tabTitle || "terminal"} cwd changed to ${event.cwd}`);
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      scheduleRefreshFooter();
      break;
    case "webui_network_rebinding": {
      const closing = !!event.closing;
      const opening = event.opening === undefined ? !closing : !!event.opening;
      addEvent(
        closing
          ? `webui network listener closing to ${event.host}:${event.port}; event stream will reconnect or disconnect`
          : `webui network listener rebinding on ${event.host}:${event.port}; event stream will reconnect`,
        "warn",
      );
      latestNetwork = { ...(latestNetwork || {}), opening, closing };
      renderNetworkStatus();
      break;
    }
    case "pi_process_exit":
      addEvent(`pi rpc exited (${event.code ?? event.signal ?? "unknown"})`, "error");
      currentRunStartedAt = null;
      clearRunIndicatorActivity();
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "pi_process_error":
      addEvent(event.error || "pi rpc process error", "error");
      currentRunStartedAt = null;
      clearRunIndicatorActivity();
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "pi_stderr":
      addEvent(event.text.trim(), "warn");
      break;
    case "queue_update":
      renderQueue(event);
      scheduleRefreshState();
      break;
    case "agent_start":
      currentRunStartedAt = performance.now();
      currentRunStreamChars = 0;
      latestTokPerSecond = null;
      if (currentState) currentState = { ...currentState, isStreaming: true };
      setRunIndicatorActivity("Agent run started; waiting for first output or action…");
      addEvent("agent started");
      scheduleRefreshState();
      renderFooter();
      renderFeedbackTray();
      break;
    case "agent_end":
      addEvent("agent finished");
      currentRunStartedAt = null;
      if (currentState) currentState = { ...currentState, isStreaming: false };
      clearRunIndicatorActivity();
      markTabOutputSeen();
      scheduleRefreshState();
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      renderFeedbackTray();
      if (gitWorkflow.active && gitWorkflow.step === "generating") {
        loadGitWorkflowMessage({ requireFresh: true, retries: 3 });
      }
      break;
    case "message_start":
      if (event.message?.role === "assistant") {
        resetStreamBubble();
        setRunIndicatorActivity("Starting assistant message…", { scroll: false });
      }
      break;
    case "message_update":
      handleMessageUpdate(event);
      break;
    case "message_end":
      if (event.message?.role === "assistant" && currentRunStartedAt) {
        const elapsedSeconds = Math.max(0.5, (performance.now() - currentRunStartedAt) / 1000);
        const outputTokens = Number(event.message?.usage?.output ?? 0) || Math.max(1, Math.round(currentRunStreamChars / 4));
        latestTokPerSecond = outputTokens / elapsedSeconds;
      }
      if (runIndicatorIsActive()) setRunIndicatorActivity("Assistant message finished; waiting for the next step…", { scroll: false });
      scheduleRefreshMessages();
      scheduleRefreshState();
      scheduleRefreshFooter();
      break;
    case "tool_execution_start":
      setRunIndicatorActivity(`Running tool: ${runIndicatorToolName(event.toolName)}…`);
      addEvent(`tool ${event.toolName} started`);
      break;
    case "tool_execution_end":
      setRunIndicatorActivity(`Tool ${runIndicatorToolName(event.toolName)} ${event.isError ? "failed" : "finished"}; waiting for the agent's next step…`);
      addEvent(`tool ${event.toolName} ${event.isError ? "failed" : "finished"}`, event.isError ? "error" : "info");
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      break;
    case "compaction_start":
      if (currentState) currentState = { ...currentState, isCompacting: true };
      setRunIndicatorActivity(`Compacting context${event.reason ? ` (${event.reason})` : ""}…`);
      addEvent(`compaction started (${event.reason})`);
      break;
    case "compaction_end":
      if (currentState) currentState = { ...currentState, isCompacting: false };
      addEvent(`compaction ${event.aborted ? "aborted" : "finished"}`);
      if (!currentState?.isStreaming) clearRunIndicatorActivity();
      markTabOutputSeen();
      scheduleRefreshMessages();
      break;
    case "extension_ui_request":
      handleExtensionUiRequest(event);
      break;
    case "response":
      if (event.success === false) addEvent(`${event.command} failed: ${event.error || "unknown error"}`, "error");
      else if (event.command === "get_state" && event.tabId === activeTabId) {
        currentState = event.data || currentState;
        syncActiveTabActivityFromState(currentState);
        syncRunIndicatorFromState(currentState);
        renderStatus();
      } else if (["set_model", "set_thinking_level", "new_session", "compact"].includes(event.command)) {
        if (event.command === "new_session") forgetLastUserPrompt(event.tabId || activeTabId);
        scheduleRefreshState();
        scheduleRefreshMessages();
        scheduleRefreshFooter();
      }
      break;
    default:
      break;
  }
}

function connectEvents() {
  eventSource?.close();
  if (!activeTabId) return;
  eventSource = new EventSource(`/api/events?tab=${encodeURIComponent(activeTabId)}`);
  eventSource.onmessage = (message) => {
    try {
      handleEvent(JSON.parse(message.data));
    } catch (error) {
      addEvent(error.message, "error");
    }
  };
  eventSource.onerror = () => addEvent("event stream disconnected; browser will retry", "warn");
}

elements.sendFeedbackButton.addEventListener("click", () => submitQueuedActionFeedback());
elements.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendPrompt("prompt");
});
elements.composerActionsButton.addEventListener("click", () => {
  setComposerActionsOpen(!document.body.classList.contains("composer-actions-open"));
});
elements.steerButton.addEventListener("click", () => sendPromptFromModeButton("steer", elements.steerButton));
elements.followUpButton.addEventListener("click", () => sendPromptFromModeButton("follow-up", elements.followUpButton));
elements.terminalTabsToggleButton.addEventListener("click", () => {
  setMobileTabsExpanded(!document.body.classList.contains("mobile-tabs-expanded"));
});
elements.newTabButton.addEventListener("click", () => createTerminalTab());
elements.gitWorkflowButton.addEventListener("click", () => {
  setComposerActionsOpen(false);
  startGitWorkflow();
});
elements.gitWorkflowCancelButton.addEventListener("click", cancelGitWorkflow);
elements.abortButton.addEventListener("click", async () => {
  try {
    if (runIndicatorIsActive()) setRunIndicatorActivity("Abort requested; checking whether Pi stopped…");
    await api("/api/abort", { method: "POST", body: {} });
    scheduleAbortStateChecks();
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.newSessionButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  if (!confirm("Start a new Pi session?")) return;
  try {
    const response = await api("/api/new-session", { method: "POST", body: {} });
    applyResponseTab(response);
    forgetLastUserPrompt(activeTabId);
    await refreshAll();
    focusPromptInput({ defer: true });
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.compactButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  try {
    elements.compactButton.disabled = true;
    elements.compactButton.textContent = "Compacting…";
    setRunIndicatorActivity("Requesting context compaction…");
    scrollChatToBottom({ force: true });
    addEvent("manual compaction requested");
    await api("/api/compact", { method: "POST", body: {} });
    scheduleRefreshState();
    scheduleRefreshMessages(600);
    scheduleRefreshFooter(600);
  } catch (error) {
    clearRunIndicatorActivity();
    addEvent(error.message, "error");
  } finally {
    elements.compactButton.disabled = !!currentState?.isCompacting;
    elements.compactButton.textContent = currentState?.isCompacting ? "Compacting…" : "Compact";
  }
});
elements.setModelButton.addEventListener("click", async () => {
  if (!elements.modelSelect.value) return;
  try {
    const selected = JSON.parse(elements.modelSelect.value);
    await api("/api/model", { method: "POST", body: selected });
    await refreshState();
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.setThinkingButton.addEventListener("click", async () => {
  try {
    await api("/api/thinking", { method: "POST", body: { level: elements.thinkingSelect.value } });
    await refreshState();
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.themeSelect.addEventListener("change", () => setThemeByName(elements.themeSelect.value, { persist: true, announce: true }));
elements.openNetworkButton.addEventListener("click", openToNetwork);
elements.toggleSidePanelButton.addEventListener("click", () => {
  setSidePanelCollapsed(true);
});
elements.sidePanelExpandButton.addEventListener("click", () => {
  setSidePanelCollapsed(false, { focusPanel: true });
});
elements.sidePanelBackdrop.addEventListener("click", () => {
  setSidePanelCollapsed(true);
});
elements.stickyUserPromptButton?.addEventListener("click", jumpToStickyUserPrompt);
elements.jumpToLatestButton.addEventListener("click", jumpToLatest);
elements.chat.addEventListener("wheel", noteChatUserScrollIntent, { passive: true });
elements.chat.addEventListener("touchmove", noteChatUserScrollIntent, { passive: true });
elements.chat.addEventListener("keydown", (event) => {
  if (CHAT_SCROLL_KEYS.has(event.key)) noteChatUserScrollIntent(event);
}, { passive: true });
elements.chat.addEventListener("scroll", () => {
  syncAutoFollowFromChatScroll();
  markTabOutputSeen();
  updateStickyUserPromptButton();
}, { passive: true });
document.addEventListener("pointerdown", (event) => {
  if (openTerminalTabGroupKey && !event.target?.closest?.(".terminal-tab-group")) {
    clearOpenTerminalTabGroup(openTerminalTabGroupKey);
  }
  if (document.body.classList.contains("composer-actions-open") && !elements.composer.contains(event.target)) {
    setComposerActionsOpen(false);
  }
  if (document.body.classList.contains("mobile-tabs-expanded") && !elements.tabBar.contains(event.target) && !elements.terminalTabsToggleButton.contains(event.target)) {
    setMobileTabsExpanded(false);
  }
  if (footerModelPickerOpen && !elements.statusBar.contains(event.target)) {
    setFooterModelPickerOpen(false);
  }
}, { passive: true });
document.addEventListener("pointermove", (event) => {
  if (openTerminalTabGroupKey && !event.target?.closest?.(".terminal-tab-group")) {
    clearOpenTerminalTabGroup(openTerminalTabGroupKey);
  }
}, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (document.body.classList.contains("composer-actions-open")) {
    setComposerActionsOpen(false);
    return;
  }
  if (document.body.classList.contains("mobile-tabs-expanded")) {
    setMobileTabsExpanded(false);
    return;
  }
  if (footerModelPickerOpen) {
    setFooterModelPickerOpen(false);
    return;
  }
  if (isMobileView() && !document.body.classList.contains("side-panel-collapsed")) {
    setSidePanelCollapsed(true);
  }
});

elements.pathPickerAddFastPickButton.addEventListener("click", () => addCurrentFastPick().catch((error) => addEvent(error.message, "error")));
elements.pathPickerCancelButton.addEventListener("click", () => closePathPicker(null));
elements.pathPickerChooseButton.addEventListener("click", () => closePathPicker(pathPickerState?.cwd || null));
elements.pathPickerDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePathPicker(null);
});
elements.pathPickerDialog.addEventListener("close", () => {
  if (pathPickerState) closePathPicker(null);
});

elements.promptInput.addEventListener("keydown", (event) => {
  if (shouldSendPromptFromEnter(event)) {
    event.preventDefault();
    hideCommandSuggestions();
    sendPrompt("prompt");
    return;
  }

  if (!elements.commandSuggest.hidden) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCommandSuggestion(commandSuggestIndex + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCommandSuggestion(commandSuggestIndex - 1);
      return;
    }
    if (event.key === "Tab" && activeSuggestionCount() > 0) {
      event.preventDefault();
      insertCommandSuggestion();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      hideCommandSuggestions();
    }
  }
});

elements.promptInput.addEventListener("input", () => {
  resizePromptInput();
  renderCommandSuggestions();
});
elements.promptInput.addEventListener("focus", () => {
  syncMobileChatToBottomForInput();
  setTimeout(updateVisualViewportVars, 0);
});
elements.promptInput.addEventListener("click", () => {
  updateVisualViewportVars();
  syncMobileChatToBottomForInput();
  renderCommandSuggestions();
});
elements.promptInput.addEventListener("keyup", (event) => {
  if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
  renderCommandSuggestions({ keepIndex: true });
});
elements.promptInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement !== elements.promptInput) hideCommandSuggestions();
    updateVisualViewportVars();
  }, 120);
});

resizePromptInput();
focusPromptInput({ defer: true });
updateComposerModeButtons();
loadLastUserPromptCache();
installViewportHandlers();
initializeThemes().catch((error) => addEvent(`failed to load themes: ${error.message}`, "warn"));
initializeFastPicks().catch((error) => addEvent(`failed to initialize path fast picks: ${error.message}`, "error"));
restoreSidePanelState();
bindMobileViewChanges();
registerPwaServiceWorker();
initializeTabs().catch((error) => addEvent(error.message, "error"));
