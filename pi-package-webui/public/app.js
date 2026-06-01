const $ = (selector) => document.querySelector(selector);

const elements = {
  sessionLine: $("#sessionLine"),
  tabBar: $("#tabBar"),
  newTabButton: $("#newTabButton"),
  statusBar: $("#statusBar"),
  widgetArea: $("#widgetArea"),
  chat: $("#chat"),
  composer: $("#composer"),
  promptInput: $("#promptInput"),
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
let availableCommands = [];
let commandSuggestions = [];
let commandSuggestIndex = 0;
let latestStats = null;
let latestWorkspace = null;
let latestNetwork = null;
let latestMessages = [];
let currentRunStartedAt = null;
let currentRunStreamChars = 0;
let latestTokPerSecond = null;
const dialogQueue = [];
const SIDE_PANEL_STORAGE_KEY = "pi-webui-side-panel-collapsed";
const TAB_STORAGE_KEY = "pi-webui-active-tab";
const PATH_FAST_PICKS_STORAGE_KEY = "pi-webui-path-fast-picks";
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

function setSidePanelCollapsed(collapsed) {
  document.body.classList.toggle("side-panel-collapsed", collapsed);
  elements.toggleSidePanelButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
  elements.toggleSidePanelButton.setAttribute("title", collapsed ? "Expand side panel" : "Collapse side panel");
  elements.toggleSidePanelButton.setAttribute("aria-label", collapsed ? "Expand side panel" : "Collapse side panel");
  elements.sidePanelExpandButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
  try {
    localStorage.setItem(SIDE_PANEL_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures; the toggle should still work for this page load.
  }
}

function restoreSidePanelState() {
  try {
    setSidePanelCollapsed(localStorage.getItem(SIDE_PANEL_STORAGE_KEY) === "1");
  } catch {
    setSidePanelCollapsed(false);
  }
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

function modelLabel(model) {
  if (!model) return "none";
  return `${model.provider}/${model.id}`;
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

function loadFastPicks() {
  try {
    return normalizeFastPicks(JSON.parse(localStorage.getItem(PATH_FAST_PICKS_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveFastPicks(picks) {
  try {
    localStorage.setItem(PATH_FAST_PICKS_STORAGE_KEY, JSON.stringify(normalizeFastPicks(picks)));
  } catch (error) {
    addEvent(`failed to save path fast picks: ${error.message}`, "error");
  }
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
  const pick = currentFastPick();
  const exists = !!pick && loadFastPicks().some((item) => item.cwd === pick.cwd);
  elements.pathPickerAddFastPickButton.disabled = !pick || exists;
  elements.pathPickerAddFastPickButton.textContent = exists ? "Fast pick added" : "Add fast pick";
}

function renderFastPicks() {
  const picks = loadFastPicks();
  elements.pathPickerFastPicks.replaceChildren();
  if (picks.length === 0) {
    elements.pathPickerFastPicks.append(make("div", "path-picker-fast-picks-empty muted", "No fast picks yet."));
    updateAddFastPickButton();
    return;
  }

  for (const pick of picks) {
    const item = make("span", "path-picker-fast-pick");
    const jump = pathPickerButton(fastPickLabel(pick), pick.cwd, () => loadPathPickerDirectory(pick.cwd), "path-picker-fast-pick-button");
    const remove = pathPickerButton("×", `Remove fast pick ${pick.cwd}`, () => {
      saveFastPicks(loadFastPicks().filter((item) => item.cwd !== pick.cwd));
      renderFastPicks();
    }, "path-picker-fast-pick-remove");
    item.append(jump, remove);
    elements.pathPickerFastPicks.append(item);
  }
  updateAddFastPickButton();
}

function addCurrentFastPick() {
  const pick = currentFastPick();
  if (!pick) return;
  const picks = loadFastPicks().filter((item) => item.cwd !== pick.cwd);
  picks.unshift(pick);
  saveFastPicks(picks);
  renderFastPicks();
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
  const row1 = make("div", "footer-line footer-line-main");
  row1.append(
    footerMetric("🪙", "tokens", `↑ ${formatTokenCount(tokens.input ?? 0)}  ↓ ${formatTokenCount(tokens.output ?? 0)}`, "tone-pink"),
    footerMetric("💾", "cache", `R ${formatTokenCount(tokens.cacheRead ?? 0)}${tokens.cacheWrite ? `  W ${formatTokenCount(tokens.cacheWrite)}` : ""}`, "tone-blue"),
    footerMetric("π", "pi", piTokens === null ? "-- tok" : `~${formatTokenCount(piTokens)} tok`, "tone-mauve"),
    footerMetric("⚡", "speed", speedLabel, "tone-yellow"),
    footerMetric("💸", subscriptionSuffix(), formatCost(stats?.cost ?? 0), "tone-green"),
    footerMetric("🧠", "context", contextLabel, "tone-teal"),
  );

  const row2 = make("div", "footer-line footer-line-meta");
  row2.append(
    footerMeta("cwd", workspaceLabel, "footer-workspace", tab ? {
      onClick: changeActiveTabCwd,
      title: `Change cwd for ${tab.title}: ${workspaceLabel}`,
    } : {}),
    footerMeta("git", branchLabel, "footer-branch"),
    footerMeta("changes", changeLabel, "footer-changes"),
    footerMeta("runtime", `⏱ ${runtime} · Agent`, "footer-runtime"),
    footerMeta("model", modelLine, "footer-model"),
  );
  elements.statusBar.append(row1, row2);
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
  const running = state?.isStreaming ? "running" : "idle";
  const compacting = state?.isCompacting ? " · compacting" : "";
  const queue = state?.pendingMessageCount ? ` · queued ${state.pendingMessageCount}` : "";
  const extra = [...statusEntries.entries()].map(([key, value]) => `${key}: ${value}`).join(" · ");

  elements.sessionLine.textContent = `${running}${compacting}${queue}${extra ? ` · ${extra}` : ""} · ${modelLabel(state?.model)} · ${state?.sessionName || state?.sessionId || "session"}`;

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

function renderWidgets() {
  elements.widgetArea.replaceChildren();
  for (const [key, value] of widgets) {
    const node = make("div", "widget");
    const lines = Array.isArray(value.widgetLines) ? value.widgetLines : [];
    node.textContent = `${key}\n${lines.join("\n")}`;
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
  if (message.role === "toolResult") return `tool result: ${message.toolName || "unknown"}`;
  if (message.role === "bashExecution") return `bash: ${message.command || ""}`;
  return message.role || "message";
}

function appendMessage(message, { streaming = false } = {}) {
  const role = String(message.role || "message");
  const safeRole = role.replace(/[^a-z0-9_-]/gi, "");
  const bubble = make("article", `message ${safeRole}${streaming ? " streaming" : ""}`);
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

function scrollChatToBottom() {
  elements.chat.scrollTop = elements.chat.scrollHeight;
}

function renderMessages(messages) {
  latestMessages = messages || [];
  elements.chat.replaceChildren();
  for (const message of latestMessages) appendMessage(message);
  scrollChatToBottom();
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
  const url = network?.networkUrls?.[0] || (open ? network?.localUrl : "");
  elements.networkStatus.className = `network-status ${opening ? "opening" : open ? "open" : "closed"}`;
  elements.networkStatus.textContent = opening ? "Opening to local network…" : open ? `Open to LAN${url ? ` · ${url}` : ""}` : "Closed · local only";
  elements.networkStatus.title = open
    ? `Reachable on local network${(network?.networkUrls || []).length ? `:\n${network.networkUrls.join("\n")}` : " (no LAN address detected)"}`
    : "Only reachable from this machine";
  elements.openNetworkButton.disabled = opening || open;
  elements.openNetworkButton.textContent = opening ? "Opening…" : open ? "Open to network" : "Open to network";
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
  elements.modelSelect.replaceChildren();
  for (const model of models) {
    const option = document.createElement("option");
    option.value = JSON.stringify({ provider: model.provider, modelId: model.id });
    option.textContent = `${model.provider}/${model.id}${model.name ? ` · ${model.name}` : ""}`;
    elements.modelSelect.append(option);
  }
  syncModelSelectToState();
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

  try {
    if (kind === "steer") {
      await api("/api/steer", { method: "POST", body: { message } });
    } else if (kind === "follow-up") {
      await api("/api/follow-up", { method: "POST", body: { message } });
    } else {
      const body = { message };
      if (currentState?.isStreaming) body.streamingBehavior = elements.busyBehavior.value || "followUp";
      await api("/api/prompt", { method: "POST", body });
    }
    elements.promptInput.value = "";
    hideCommandSuggestions();
    scheduleRefreshState();
  } catch (error) {
    addEvent(error.message, "error");
  }
}

function handleExtensionUiRequest(request) {
  request.tabId ||= activeTabId;
  switch (request.method) {
    case "notify":
      addEvent(request.message || "notification", request.notifyType === "error" ? "error" : request.notifyType === "warning" ? "warn" : "info");
      return;
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
elements.steerButton.addEventListener("click", () => sendPrompt("steer"));
elements.followUpButton.addEventListener("click", () => sendPrompt("follow-up"));
elements.newTabButton.addEventListener("click", createTerminalTab);
elements.gitWorkflowButton.addEventListener("click", startGitWorkflow);
elements.gitWorkflowCancelButton.addEventListener("click", cancelGitWorkflow);
elements.abortButton.addEventListener("click", async () => {
  try {
    await api("/api/abort", { method: "POST", body: {} });
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.newSessionButton.addEventListener("click", async () => {
  if (!confirm("Start a new Pi session?")) return;
  try {
    await api("/api/new-session", { method: "POST", body: {} });
    await refreshAll();
  } catch (error) {
    addEvent(error.message, "error");
  }
});
elements.compactButton.addEventListener("click", async () => {
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
  setSidePanelCollapsed(false);
});

elements.pathPickerAddFastPickButton.addEventListener("click", addCurrentFastPick);
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
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
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

elements.promptInput.addEventListener("input", () => renderCommandSuggestions());
elements.promptInput.addEventListener("click", () => renderCommandSuggestions());
elements.promptInput.addEventListener("keyup", (event) => {
  if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
  renderCommandSuggestions({ keepIndex: true });
});
elements.promptInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement !== elements.promptInput) hideCommandSuggestions();
  }, 120);
});

restoreSidePanelState();
initializeTabs().catch((error) => addEvent(error.message, "error"));
