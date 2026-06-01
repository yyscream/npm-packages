const $ = (selector) => document.querySelector(selector);

const elements = {
  sessionLine: $("#sessionLine"),
  tabBar: $("#tabBar"),
  terminalTabsToggleButton: $("#terminalTabsToggleButton"),
  newTabButton: $("#newTabButton"),
  statusBar: $("#statusBar"),
  widgetArea: $("#widgetArea"),
  chat: $("#chat"),
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
let streamBubble = null;
let streamText = null;
let streamThinking = null;
let streamThinkingDetails = null;
let refreshMessagesTimer = null;
let refreshStateTimer = null;
let refreshFooterTimer = null;
let eventSource = null;
let activeDialog = null;
let pathPickerState = null;
let pathFastPicks = [];
let pathFastPicksReady = false;
let pathFastPicksLoadPromise = null;
let mobileTabsExpanded = false;
let availableCommands = [];
let commandSuggestions = [];
let commandSuggestIndex = 0;
let latestStats = null;
let latestWorkspace = null;
let latestNetwork = null;
let latestMessages = [];
let transientMessages = [];
let availableModels = [];
let footerScopedModels = [];
let footerScopedModelPatterns = [];
let footerScopedModelSource = "none";
let autoFollowChat = true;
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
const MOBILE_VIEW_QUERY = "(max-width: 720px), (max-device-width: 720px), (pointer: coarse) and (hover: none)";
const CHAT_BOTTOM_THRESHOLD_PX = 96;
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

async function api(path, { method = "GET", body, tabId = activeTabId, scoped = true } = {}) {
  const response = await fetch(scoped ? scopedApiPath(path, tabId) : path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || JSON.stringify(data));
  }
  return data;
}

function activeTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
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
    if (!request?.id || !["select", "confirm", "input", "editor"].includes(request.method)) continue;
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
  statusEntries.clear();
  widgets.clear();
  transientMessages = [];
  availableCommands = [];
  commandSuggestions = [];
  commandSuggestIndex = 0;
  resetStreamBubble();
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
  elements.chat.replaceChildren();
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
}

function renderTabs() {
  const active = activeTab();
  elements.terminalTabsToggleButton.textContent = active ? `${active.title}${tabs.length > 1 ? ` · ${tabs.length}` : ""}` : "Tabs";
  elements.terminalTabsToggleButton.title = active ? `Show terminal tabs · active: ${active.title}` : "Show terminal tabs";
  elements.tabBar.replaceChildren();
  for (const tab of tabs) {
    const isActive = tab.id === activeTabId;
    const wrapper = make("div", `terminal-tab${isActive ? " active" : ""}${tab.running ? "" : " stopped"}`);
    const button = make("button", "terminal-tab-button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.title = `${tab.title}${tab.running ? ` · pid ${tab.pid || "starting"}` : " · stopped"}`;
    button.append(
      make("span", "terminal-tab-title", tab.title),
      make("span", "terminal-tab-meta", tab.running ? `pid ${tab.pid || "…"}` : "stopped"),
    );
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

    elements.tabBar.append(wrapper);
  }
  elements.tabBar.append(elements.newTabButton);
  setMobileTabsExpanded(mobileTabsExpanded);
  updateDocumentTitle();
}

async function refreshTabs({ selectStored = false } = {}) {
  const response = await api("/api/tabs", { scoped: false });
  tabs = response.data?.tabs || [];
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
  setMobileTabsExpanded(false);
  footerModelPickerOpen = false;
  saveActiveDraft();
  activeTabId = tabId;
  rememberActiveTab();
  resetActiveTabUi();
  renderTabs();
  restoreActiveDraft();
  connectEvents();
  await refreshAll();
}

async function createTerminalTab() {
  setMobileTabsExpanded(false);
  elements.newTabButton.disabled = true;
  try {
    const response = await api("/api/tabs", { method: "POST", body: { cwd: activeTab()?.cwd }, scoped: false });
    tabs = response.data?.tabs || tabs;
    const tab = response.data?.tab;
    renderTabs();
    if (tab?.id) {
      await switchTab(tab.id);
      addEvent(`created isolated terminal ${tab.title}`, "info");
    }
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    elements.newTabButton.disabled = false;
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
    tabDrafts.delete(tabId);
    if (wasActive) {
      activeTabId = (fallbackTabId && tabs.some((item) => item.id === fallbackTabId) ? fallbackTabId : tabs[0]?.id) || null;
      rememberActiveTab();
      resetActiveTabUi();
      renderTabs();
      restoreActiveDraft();
      connectEvents();
      if (activeTabId) await refreshAll();
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
  connectEvents();
  if (activeTabId) await refreshAll();
}

function addEvent(message, level = "info") {
  const line = make("div", `event ${level}`.trim());
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${message}`;
  elements.eventLog.prepend(line);
  while (elements.eventLog.children.length > 120) elements.eventLog.lastElementChild?.remove();
}

function formatDate(value) {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function stripAnsi(text) {
  return String(text ?? "").replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
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
    footerMetric("🧠", "context", contextLabel, "tone-teal"),
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
    footerMeta("context", contextLabel, "footer-context"),
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
  await Promise.allSettled([
    api("/api/git-workflow/cancel", { method: "POST", body: {} }),
    shouldAbortPi ? api("/api/abort", { method: "POST", body: {} }) : Promise.resolve(),
  ]);
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
    if (isCurrentGitWorkflowRun(runId)) failGitWorkflow(error, "generate");
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
  if (message.title) return message.title;
  if (message.role === "toolResult") return `tool result: ${message.toolName || "unknown"}`;
  if (message.role === "bashExecution") return `bash: ${message.command || ""}`;
  return message.role || "message";
}

function appendMessage(message, { streaming = false } = {}) {
  const role = String(message.role || "message");
  const safeRole = role.replace(/[^a-z0-9_-]/gi, "");
  const bubble = make("article", `message ${safeRole}${message.level ? ` ${message.level}` : ""}${streaming ? " streaming" : ""}`);
  const isCollapsibleOutput = !streaming && (message.role === "toolResult" || message.role === "bashExecution");

  const header = make(isCollapsibleOutput ? "summary" : "div", "message-header");
  header.append(make("span", "message-role", messageTitle(message)));
  header.append(make("span", "muted", formatDate(message.timestamp)));
  const body = make("div", "message-body");

  if (message.role === "bashExecution") {
    appendText(body, `$ ${message.command || ""}\n\n${message.output || ""}`, "code-block");
  } else if (message.role === "toolResult") {
    renderContent(body, message.content);
    if (message.isError) bubble.classList.add("error");
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
  elements.chat.append(bubble);
  return { bubble, body };
}

function renderAllMessages({ preserveScroll = false } = {}) {
  const shouldFollow = !preserveScroll && (autoFollowChat || isChatNearBottom());
  const previousScrollTop = elements.chat.scrollTop;
  elements.chat.replaceChildren();
  for (const message of latestMessages) appendMessage(message);
  for (const message of transientMessages) appendMessage(message);
  if (shouldFollow) scrollChatToBottom({ force: true });
  else {
    elements.chat.scrollTop = Math.min(previousScrollTop, elements.chat.scrollHeight);
    autoFollowChat = isChatNearBottom();
    updateJumpToLatestButton();
  }
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

function scrollChatToBottom({ force = false } = {}) {
  if (!force && !autoFollowChat) {
    updateJumpToLatestButton();
    return;
  }
  elements.chat.scrollTop = elements.chat.scrollHeight;
  autoFollowChat = true;
  updateJumpToLatestButton();
}

function jumpToLatest() {
  scrollChatToBottom({ force: true });
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
  renderAllMessages();
  renderFooter();
}

function ensureStreamBubble() {
  if (streamBubble) return;
  const created = appendMessage({ role: "assistant", timestamp: Date.now(), content: "" }, { streaming: true });
  streamBubble = created.bubble;
  streamText = appendText(created.body, "");
  streamThinkingDetails = make("details", "thinking-block streaming-thinking");
  streamThinkingDetails.hidden = true;
  streamThinkingDetails.open = true;
  streamThinkingDetails.append(make("summary", undefined, "thinking"));
  streamThinking = appendText(streamThinkingDetails, "", "thinking-text");
  created.body.prepend(streamThinkingDetails);
  scrollChatToBottom();
}

function showStreamingThinking(placeholder = "Thinking…") {
  ensureStreamBubble();
  streamThinkingDetails.hidden = false;
  streamThinkingDetails.open = true;
  if (!streamThinking.textContent) streamThinking.textContent = placeholder;
}

function resetStreamBubble() {
  streamBubble = null;
  streamText = null;
  streamThinking = null;
  streamThinkingDetails = null;
}

function thinkingDeltaText(update) {
  return update.delta || update.thinking || update.content || "";
}

function handleMessageUpdate(event) {
  const update = event.assistantMessageEvent || {};
  ensureStreamBubble();
  if (update.type === "thinking_start") {
    showStreamingThinking();
    scrollChatToBottom();
  } else if (update.type === "thinking_delta") {
    const delta = thinkingDeltaText(update);
    currentRunStreamChars += delta.length;
    showStreamingThinking("");
    if (streamThinking.textContent === "Thinking…") streamThinking.textContent = "";
    streamThinking.textContent += delta;
    renderFooter();
    scrollChatToBottom();
  } else if (update.type === "thinking_end") {
    const finalThinking = thinkingDeltaText(update);
    if (finalThinking && (!streamThinking.textContent || streamThinking.textContent === "Thinking…")) {
      showStreamingThinking("");
      streamThinking.textContent = finalThinking;
    }
    streamThinkingDetails?.classList.add("complete");
  } else if (update.type === "text_delta") {
    const delta = update.delta || "";
    currentRunStreamChars += delta.length;
    streamText.textContent += delta;
    renderFooter();
    scrollChatToBottom();
  } else if (update.type === "toolcall_start") {
    addEvent(`tool call started in assistant message`, "info");
  } else if (update.type === "error") {
    streamBubble.classList.add("error");
    appendText(streamBubble.querySelector(".message-body"), update.reason || update.errorMessage || "assistant error", "code-block");
  }
}

async function refreshState() {
  const response = await api("/api/state");
  currentState = response.data || null;
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
  const localUrl = network?.localUrl || `${window.location.origin}/`;
  const networkUrls = Array.isArray(network?.networkUrls) ? network.networkUrls : [];
  elements.networkStatus.className = `network-status ${opening ? "opening" : open ? "open" : "closed"}`;
  elements.networkStatus.title = open
    ? `Reachable on local network${networkUrls.length ? `:\n${networkUrls.join("\n")}` : " (no LAN address detected)"}`
    : "Only reachable from this machine";

  const heading = make("div", "network-status-heading", opening ? "Opening to local network…" : open ? "Open to local network" : "Closed · local only");
  const detail = make("div", "network-status-detail", open ? "Use one of these URLs from a trusted device:" : "Only this machine can connect until you open the network listener.");
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
  elements.openNetworkButton.disabled = opening || open;
  elements.openNetworkButton.textContent = opening ? "Opening…" : open ? "Network open" : "Open to network";
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

function hideCommandSuggestions() {
  elements.commandSuggest.hidden = true;
  elements.commandSuggest.replaceChildren();
  commandSuggestions = [];
  commandSuggestIndex = 0;
}

function setActiveCommandSuggestion(index) {
  if (!commandSuggestions.length) return;
  commandSuggestIndex = (index + commandSuggestions.length) % commandSuggestions.length;
  const items = [...elements.commandSuggest.querySelectorAll(".command-suggest-item")];
  for (const [itemIndex, item] of items.entries()) {
    const active = itemIndex === commandSuggestIndex;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
    if (active) item.scrollIntoView({ block: "nearest" });
  }
}

function renderCommandSuggestions({ keepIndex = false } = {}) {
  const trigger = getCommandTrigger();
  if (!trigger || document.activeElement !== elements.promptInput || availableCommands.length === 0) {
    hideCommandSuggestions();
    return;
  }

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

function insertCommandSuggestion(index = commandSuggestIndex) {
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
    const item = make("div", "command-item");
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
  if (latestNetwork?.open) return;
  if (!confirm("Open Pi Web UI to your local network?\n\nThe Web UI has no authentication and can control Pi/tools. Only do this on a trusted LAN.")) return;

  elements.openNetworkButton.disabled = true;
  elements.openNetworkButton.textContent = "Opening…";
  try {
    await api("/api/network/open", { method: "POST", body: {}, scoped: false });
    addEvent("opening webui to local network", "warn");
    for (let attempt = 0; attempt < 20; attempt++) {
      await delay(350);
      try {
        await refreshNetworkStatus();
        if (latestNetwork?.open) {
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

async function sendPrompt(kind = "prompt") {
  const message = elements.promptInput.value.trim();
  if (!message) return;

  autoFollowChat = true;
  updateJumpToLatestButton();
  setComposerActionsOpen(false);

  try {
    let response;
    if (kind === "steer") {
      response = await api("/api/steer", { method: "POST", body: { message } });
    } else if (kind === "follow-up") {
      response = await api("/api/follow-up", { method: "POST", body: { message } });
    } else {
      const body = { message };
      if (currentState?.isStreaming) body.streamingBehavior = elements.busyBehavior.value || "followUp";
      response = await api("/api/prompt", { method: "POST", body });
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
    elements.promptInput.value = "";
    resizePromptInput();
    hideCommandSuggestions();
    scheduleRefreshState();
  } catch (error) {
    addEvent(error.message, "error");
    addTransientMessage({ role: "error", title: message.startsWith("/") ? message.split(/\s+/, 1)[0] : "error", content: error.message, level: "error" });
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
    await api("/api/extension-ui-response", { method: "POST", body, tabId });
  } catch (error) {
    addEvent(error.message, "error");
  } finally {
    elements.dialog.close();
    activeDialog = null;
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

  elements.dialogTitle.textContent = request.title || "Pi request";
  elements.dialogMessage.textContent = request.message || request.placeholder || "";
  elements.dialogBody.replaceChildren();
  elements.dialogActions.replaceChildren();

  const cancel = () => sendDialogResponse({ type: "extension_ui_response", id: request.id, cancelled: true, tabId: request.tabId });

  if (request.method === "select") {
    const options = make("div", "dialog-options");
    for (const option of request.options || []) {
      const button = make("button", undefined, String(option));
      button.type = "button";
      button.addEventListener("click", () => sendDialogResponse({ type: "extension_ui_response", id: request.id, value: String(option), tabId: request.tabId }));
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
  switch (event.type) {
    case "webui_connected":
      addEvent(`connected to ${event.tabTitle || "terminal"} for ${event.cwd}`);
      refreshTabs().catch((error) => addEvent(error.message, "error"));
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
    case "webui_cwd_changed":
      addEvent(`${event.tabTitle || "terminal"} cwd changed to ${event.cwd}`);
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      scheduleRefreshFooter();
      break;
    case "webui_network_rebinding":
      addEvent(`webui network listener rebinding on ${event.host}:${event.port}; event stream will reconnect`, "warn");
      latestNetwork = { ...(latestNetwork || {}), opening: true };
      renderNetworkStatus();
      break;
    case "pi_process_exit":
      addEvent(`pi rpc exited (${event.code ?? event.signal ?? "unknown"})`, "error");
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "pi_process_error":
      addEvent(event.error || "pi rpc process error", "error");
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
      addEvent("agent started");
      scheduleRefreshState();
      renderFooter();
      break;
    case "agent_end":
      addEvent("agent finished");
      currentRunStartedAt = null;
      scheduleRefreshState();
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      if (gitWorkflow.active && gitWorkflow.step === "generating") {
        loadGitWorkflowMessage({ requireFresh: true, retries: 3 });
      }
      break;
    case "message_start":
      if (event.message?.role === "assistant") resetStreamBubble();
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
      scheduleRefreshMessages();
      scheduleRefreshState();
      scheduleRefreshFooter();
      break;
    case "tool_execution_start":
      addEvent(`tool ${event.toolName} started`);
      break;
    case "tool_execution_end":
      addEvent(`tool ${event.toolName} ${event.isError ? "failed" : "finished"}`, event.isError ? "error" : "info");
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      break;
    case "compaction_start":
      addEvent(`compaction started (${event.reason})`);
      break;
    case "compaction_end":
      addEvent(`compaction ${event.aborted ? "aborted" : "finished"}`);
      scheduleRefreshMessages();
      break;
    case "extension_ui_request":
      handleExtensionUiRequest(event);
      break;
    case "response":
      if (event.success === false) addEvent(`${event.command} failed: ${event.error || "unknown error"}`, "error");
      else if (["set_model", "set_thinking_level", "new_session", "compact"].includes(event.command)) {
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
elements.newTabButton.addEventListener("click", createTerminalTab);
elements.gitWorkflowButton.addEventListener("click", () => {
  setComposerActionsOpen(false);
  startGitWorkflow();
});
elements.gitWorkflowCancelButton.addEventListener("click", cancelGitWorkflow);
elements.abortButton.addEventListener("click", async () => {
  try {
    await api("/api/abort", { method: "POST", body: {} });
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.newSessionButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  if (!confirm("Start a new Pi session?")) return;
  try {
    await api("/api/new-session", { method: "POST", body: {} });
    await refreshAll();
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.compactButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  try {
    elements.compactButton.disabled = true;
    elements.compactButton.textContent = "Compacting…";
    addEvent("manual compaction requested");
    await api("/api/compact", { method: "POST", body: {} });
    scheduleRefreshState();
    scheduleRefreshMessages(600);
    scheduleRefreshFooter(600);
  } catch (error) {
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
elements.jumpToLatestButton.addEventListener("click", jumpToLatest);
elements.chat.addEventListener("scroll", () => {
  autoFollowChat = isChatNearBottom();
  updateJumpToLatestButton();
}, { passive: true });
document.addEventListener("pointerdown", (event) => {
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
    if (event.key === "Tab" && commandSuggestions.length > 0) {
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
updateComposerModeButtons();
installViewportHandlers();
initializeFastPicks().catch((error) => addEvent(`failed to initialize path fast picks: ${error.message}`, "error"));
restoreSidePanelState();
bindMobileViewChanges();
registerPwaServiceWorker();
initializeTabs().catch((error) => addEvent(error.message, "error"));
