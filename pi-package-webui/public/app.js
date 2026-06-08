const $ = (selector) => document.querySelector(selector);

const elements = {
  webuiVersionBadge: $("#webuiVersionBadge"),
  webuiDevBadge: $("#webuiDevBadge"),
  tabBar: $("#tabBar"),
  terminalTabsToggleButton: $("#terminalTabsToggleButton"),
  newTabMenu: $("#newTabMenu"),
  newTabButton: $("#newTabButton"),
  newTabMenuPanel: $("#newTabMenuPanel"),
  newTabCurrentDirectoryButton: $("#newTabCurrentDirectoryButton"),
  newTabChooseDirectoryButton: $("#newTabChooseDirectoryButton"),
  closeAllTabsButton: $("#closeAllTabsButton"),
  statusBar: $("#statusBar"),
  serverOfflinePanel: $("#serverOfflinePanel"),
  serverRestartPanel: $("#serverRestartPanel"),
  serverRestartMessage: $("#serverRestartMessage"),
  serverOfflineCommand: $("#serverOfflineCommand"),
  serverOfflineSlashCommand: $("#serverOfflineSlashCommand"),
  copyServerCommandButton: $("#copyServerCommandButton"),
  retryServerConnectionButton: $("#retryServerConnectionButton"),
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
  busyPromptBehaviorTag: $("#busyPromptBehaviorTag"),
  busyPromptBehaviorMenu: $("#busyPromptBehaviorMenu"),
  sessionSkillTags: $("#sessionSkillTags"),
  skillEditorDialog: $("#skillEditorDialog"),
  skillEditorTitle: $("#skillEditorTitle"),
  skillEditorMeta: $("#skillEditorMeta"),
  skillEditorText: $("#skillEditorText"),
  skillEditorStatus: $("#skillEditorStatus"),
  skillEditorCancelButton: $("#skillEditorCancelButton"),
  skillEditorSaveButton: $("#skillEditorSaveButton"),
  sendButton: $("#sendButton"),
  commandSuggest: $("#commandSuggest"),
  attachmentTray: $("#attachmentTray"),
  attachButton: $("#attachButton"),
  attachmentInput: $("#attachmentInput"),
  steerButton: $("#steerButton"),
  followUpButton: $("#followUpButton"),
  abortButton: $("#abortButton"),
  newSessionButton: $("#newSessionButton"),
  compactButton: $("#compactButton"),
  gitWorkflowButton: $("#gitWorkflowButton"),
  publishButton: $("#publishButton"),
  publishMenu: $("#publishMenu"),
  releaseNpmButton: $("#releaseNpmButton"),
  releaseAurButton: $("#releaseAurButton"),
  nativeCommandMenuButton: $("#nativeCommandMenuButton"),
  nativeCommandMenu: $("#nativeCommandMenu"),
  nativeSkillsButton: $("#nativeSkillsButton"),
  nativeToolsButton: $("#nativeToolsButton"),
  appRunnerMenu: $("#appRunnerMenu"),
  appRunnerInfoButton: $("#appRunnerInfoButton"),
  appRunnerMenuButton: $("#appRunnerMenuButton"),
  appRunnerMenuPanel: $("#appRunnerMenuPanel"),
  optionsMenuButton: $("#optionsMenuButton"),
  optionsMenu: $("#optionsMenu"),
  optionsResumeButton: $("#optionsResumeButton"),
  optionsReloadButton: $("#optionsReloadButton"),
  optionsNameButton: $("#optionsNameButton"),
  optionsCloneButton: $("#optionsCloneButton"),
  optionsSettingsButton: $("#optionsSettingsButton"),
  optionsExportButton: $("#optionsExportButton"),
  optionsForkButton: $("#optionsForkButton"),
  optionsTreeButton: $("#optionsTreeButton"),
  gitWorkflowPanel: $("#gitWorkflowPanel"),
  gitWorkflowTitle: $("#gitWorkflowTitle"),
  gitWorkflowHint: $("#gitWorkflowHint"),
  gitWorkflowSteps: $("#gitWorkflowSteps"),
  gitWorkflowOutput: $("#gitWorkflowOutput"),
  gitWorkflowActions: $("#gitWorkflowActions"),
  gitWorkflowCancelButton: $("#gitWorkflowCancelButton"),
  gitPrDialog: $("#gitPrDialog"),
  gitPrTitleInput: $("#gitPrTitleInput"),
  gitPrBodyEditor: $("#gitPrBodyEditor"),
  gitPrStatus: $("#gitPrStatus"),
  gitPrCancelButton: $("#gitPrCancelButton"),
  gitPrCreateButton: $("#gitPrCreateButton"),
  modelSelect: $("#modelSelect"),
  setModelButton: $("#setModelButton"),
  thinkingSelect: $("#thinkingSelect"),
  setThinkingButton: $("#setThinkingButton"),
  thinkingVisibilityToggle: $("#thinkingVisibilityToggle"),
  thinkingVisibilityStatus: $("#thinkingVisibilityStatus"),
  terminalTabsLayoutSelect: $("#terminalTabsLayoutSelect"),
  terminalTabsLayoutStatus: $("#terminalTabsLayoutStatus"),
  themeSelect: $("#themeSelect"),
  backgroundInput: $("#backgroundInput"),
  backgroundChooseButton: $("#backgroundChooseButton"),
  backgroundClearButton: $("#backgroundClearButton"),
  backgroundStatus: $("#backgroundStatus"),
  networkStatus: $("#networkStatus"),
  openNetworkButton: $("#openNetworkButton"),
  serverActionSelect: $("#serverActionSelect"),
  runServerActionButton: $("#runServerActionButton"),
  serverActionStatus: $("#serverActionStatus"),
  agentDoneNotificationsToggle: $("#agentDoneNotificationsToggle"),
  agentDoneNotificationsStatus: $("#agentDoneNotificationsStatus"),
  optionalFeaturesBox: $("#optionalFeaturesBox"),
  codexUsageBox: $("#codexUsageBox"),
  refreshCodexUsageButton: $("#refreshCodexUsageButton"),
  toggleSidePanelButton: $("#toggleSidePanelButton"),
  sidePanelExpandButton: $("#sidePanelExpandButton"),
  sidePanelBackdrop: $("#sidePanelBackdrop"),
  sidePanel: $("#sidePanel"),
  stateDetails: $("#stateDetails"),
  queueBox: $("#queueBox"),
  queueCountBadge: $("#queueCountBadge"),
  createPromptListButton: $("#createPromptListButton"),
  loadPromptListButton: $("#loadPromptListButton"),
  runLoadedPromptListButton: $("#runLoadedPromptListButton"),
  loadedPromptListBox: $("#loadedPromptListBox"),
  promptListDialog: $("#promptListDialog"),
  promptListDialogTitle: $("#promptListDialogTitle"),
  promptListNameInput: $("#promptListNameInput"),
  promptListEditorRows: $("#promptListEditorRows"),
  promptListAddPromptButton: $("#promptListAddPromptButton"),
  promptListLoadPanel: $("#promptListLoadPanel"),
  promptListSelect: $("#promptListSelect"),
  promptListLoadSelectedButton: $("#promptListLoadSelectedButton"),
  promptListDeleteSelectedButton: $("#promptListDeleteSelectedButton"),
  promptListStatus: $("#promptListStatus"),
  promptListCloseButton: $("#promptListCloseButton"),
  promptListDialogLoadButton: $("#promptListDialogLoadButton"),
  promptListSaveButton: $("#promptListSaveButton"),
  promptListRunListButton: $("#promptListRunListButton"),
  attachmentTextDialog: $("#attachmentTextDialog"),
  attachmentTextTitle: $("#attachmentTextTitle"),
  attachmentTextMeta: $("#attachmentTextMeta"),
  attachmentTextEditor: $("#attachmentTextEditor"),
  attachmentTextStatus: $("#attachmentTextStatus"),
  attachmentTextCancelButton: $("#attachmentTextCancelButton"),
  attachmentTextSaveButton: $("#attachmentTextSaveButton"),
  commandSearchInput: $("#commandSearchInput"),
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
  pathPickerCreateNameInput: $("#pathPickerCreateNameInput"),
  pathPickerCreateButton: $("#pathPickerCreateButton"),
  pathPickerSearchInput: $("#pathPickerSearchInput"),
  pathPickerClearSearchButton: $("#pathPickerClearSearchButton"),
  pathPickerSearchStatus: $("#pathPickerSearchStatus"),
  pathPickerFastPicks: $("#pathPickerFastPicks"),
  pathPickerRoots: $("#pathPickerRoots"),
  pathPickerList: $("#pathPickerList"),
  pathPickerError: $("#pathPickerError"),
  pathPickerCancelButton: $("#pathPickerCancelButton"),
  pathPickerChooseButton: $("#pathPickerChooseButton"),
  nativeCommandDialog: $("#nativeCommandDialog"),
  nativeCommandTitle: $("#nativeCommandTitle"),
  nativeCommandMessage: $("#nativeCommandMessage"),
  nativeCommandSearch: $("#nativeCommandSearch"),
  nativeCommandBody: $("#nativeCommandBody"),
  nativeCommandError: $("#nativeCommandError"),
  nativeCommandActions: $("#nativeCommandActions"),
  appRunnerInfoDialog: $("#appRunnerInfoDialog"),
  appRunnerInfoBody: $("#appRunnerInfoBody"),
  appRunnerInfoCloseButton: $("#appRunnerInfoCloseButton"),
};

let currentState = null;
let tabs = [];
let activeTabId = null;
let activeTabGeneration = 0;
let tabDrafts = new Map();
let tabAttachments = new Map();
let activeTextAttachmentEditor = null;
let activeSkillEditor = null;
let tabActivities = new Map();
let tabSeenCompletionSerials = new Map();
let streamBubble = null;
let streamText = null;
let streamRawText = "";
let streamBubbleVisibleSince = 0;
let streamBubbleHideTimer = null;
let streamTextRenderTimer = null;
let streamToolCallSeen = false;
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
let foregroundReconcileTimer = null;
let eventSource = null;
let activeDialog = null;
let activeGitPrDialogResolve = null;
let nativeCommandTabId = null;
let pathPickerState = null;
let firstTerminalCwdPromptShown = false;
let pathFastPicks = [];
let pathFastPicksReady = false;
let pathFastPicksLoadPromise = null;
let mobileTabsExpanded = false;
let openTerminalTabGroupKey = null;
let newTabMenuOpen = false;
let nativeCommandMenuOpen = false;
let appRunnerMenuOpen = false;
let busyPromptBehaviorMenuOpen = false;
const skillUsageByTab = new Map();
let appRunnerCustomDraft = { id: "", label: "", command: "./", path: "", args: "" };
let appRunnerFileBrowserState = { open: false, loading: false, path: "", data: null, error: "" };
let optionsMenuOpen = false;
let availableCommands = [];
let rawAvailableCommands = [];
let commandSuggestions = [];
let pathSuggestions = [];
let suggestionMode = "none";
let commandSuggestIndex = 0;
let lastPointerPosition = null;
let pathSuggestActiveQuery = null;
let pathSuggestRequestSerial = 0;
let pathSuggestAbortController = null;
let latestStats = null;
let latestWorkspace = null;
let latestNetwork = null;
let webuiVersion = "";
let webuiDevServer = false;
let latestCodexUsage = null;
let codexUsageError = null;
let codexUsageLoading = false;
let refreshCodexUsageTimer = null;
let codexUsageRenderTimer = null;
let backendOffline = false;
let serverRestartInProgress = false;
let backendOfflineNoticeShown = false;
let latestMessages = [];
let promptHistoryByTab = new Map();
let promptHistoryNavigation = null;
let transientMessages = [];
let actionEntrySeenKeysByTab = new Map();
let actionEntryAnimationPrimedTabs = new Set();
let lastUserPromptByTab = new Map();
let actionFeedbackByTab = new Map();
let actionFeedbackSendBusy = false;
let blockedTabNotificationKeys = new Set();
let blockedTabNotificationPermissionRequested = false;
let blockedTabNotificationFallbackNoted = false;
let agentDoneNotificationsEnabled = false;
let thinkingOutputVisible = true;
let terminalTabsLayout = "top";
let webuiSettings = {};
let busyPromptBehavior = "followUp";
let autocompleteMaxVisible = 12;
let doubleEscapeAction = "none";
let treeFilterMode = "default";
let lastEmptyPromptEscapeTime = 0;
let toolOutputGloballyExpanded = false;
let agentDoneNotificationPermissionRequested = false;
let agentDoneNotificationFallbackNoted = false;
let agentDoneNotificationKeys = new Set();
let availableModels = [];
let availableThemes = [];
let currentThemeName = "catppuccin-mocha";
let customBackground = null;
let customBackgroundObjectUrl = null;
let customBackgroundLoading = false;
let footerScopedModels = [];
let footerScopedModelPatterns = [];
let footerScopedModelSource = "none";
const contextUsageUnknownAfterCompactionByTab = new Map();
let autoFollowChat = true;
let chatFollowFrame = null;
let chatFollowSettleTimer = null;
let lastChatProgrammaticScrollAt = 0;
let chatUserScrollIntentUntil = 0;
let mobileFooterExpanded = false;
let footerModelPickerOpen = false;
let footerThinkingPickerOpen = false;
let publishMenuOpen = false;
let maxVisualViewportHeight = 0;
let abortRequestInFlight = false;
let userBashByTab = new Map();
let userBashQueuesByTab = new Map();
let latestQueuedMessagesByTab = new Map();
let loadedPromptList = null;
let promptListRunning = false;
let abortLongPressTimer = null;
let abortLongPressHandled = false;
const dialogQueue = [];
const SIDE_PANEL_STORAGE_KEY = "pi-webui-side-panel-collapsed";
const SIDE_PANEL_SECTION_STORAGE_KEY = "pi-webui-side-panel-sections-collapsed";
const TAB_STORAGE_KEY = "pi-webui-active-tab";
const PATH_FAST_PICKS_STORAGE_KEY = "pi-webui-path-fast-picks";
const AGENT_DONE_NOTIFICATIONS_STORAGE_KEY = "pi-webui-agent-done-notifications";
const THINKING_VISIBILITY_STORAGE_KEY = "pi-webui-thinking-visible";
const BUSY_PROMPT_BEHAVIOR_STORAGE_KEY = "pi-webui-busy-prompt-behavior";
const SKILL_USAGE_STORAGE_KEY = "pi-webui-skill-usage-v1";
const TERMINAL_TABS_LAYOUT_STORAGE_KEY = "pi-webui-terminal-tabs-layout";
const TOOL_OUTPUT_EXPANDED_STORAGE_KEY = "pi-webui-tool-output-expanded";
const THEME_STORAGE_KEY = "pi-webui-theme";
const CUSTOM_BACKGROUND_STORAGE_KEY = "pi-webui-custom-background";
const CUSTOM_BACKGROUNDS_STORAGE_KEY = "pi-webui-custom-backgrounds";
const CUSTOM_BACKGROUND_IDB_NAME = "pi-webui-custom-background";
const CUSTOM_BACKGROUND_IDB_STORE = "backgrounds";
const CUSTOM_BACKGROUND_LEGACY_ID = "active";
const SERVER_START_CWD_STORAGE_KEY = "pi-webui-last-server-cwd";
const DEFAULT_WEBUI_PORT = "31415";
const CUSTOM_BACKGROUND_MAX_FILE_BYTES = 24 * 1024 * 1024;
const OPTIONAL_FEATURES_STORAGE_KEY = "pi-webui-optional-features-disabled";
const GIT_FOOTER_WEBUI_STATUS_KEY = "git-footer-webui";
const GIT_FOOTER_WEBUI_PAYLOAD_TYPE = "firstpick.git-footer-status.footer";
const GIT_FOOTER_WEBUI_PAYLOAD_VERSION = 1;
const GIT_FOOTER_WEBUI_PAYLOAD_CACHE_KEY = "pi-webui-git-footer-webui-payload-cache";
const LAST_USER_PROMPT_STORAGE_KEY = "pi-webui-last-user-prompts";
const PROMPT_HISTORY_STORAGE_KEY = "pi-webui-prompt-history";
const PROMPT_LIST_STORAGE_KEY = "pi-webui-prompt-lists";
const PROMPT_HISTORY_LIMIT_PER_TAB = 50;
const ATTACHMENT_MAX_FILES = 12;
const ATTACHMENT_MAX_FILE_BYTES = 64 * 1024 * 1024;
const ATTACHMENT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const ATTACHMENT_INLINE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ATTACHMENT_INLINE_IMAGE_TOTAL_MAX_BYTES = 16 * 1024 * 1024;
const LONG_INPUT_ATTACHMENT_LINE_THRESHOLD = 20;
const LONG_INPUT_ATTACHMENT_MIME_TYPE = "text/plain";
const INLINE_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const BACKGROUND_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const DEFAULT_THEME_NAME = "catppuccin-mocha";
const TERMINAL_TABS_LAYOUTS = new Set(["top", "left"]);
const TERMINAL_TABS_LAYOUT_LABELS = { top: "Top bar", left: "Left sidebar" };
const BUSY_PROMPT_BEHAVIOR_VALUES = new Set(["followUp", "steer"]);
const BUSY_PROMPT_BEHAVIOR_LABELS = { followUp: "Follow-up", steer: "Steer" };
const SKILL_TAG_MAX_VISIBLE = 6;
const SKILL_USAGE_LIMIT_PER_TAB = 32;
const MOBILE_VIEW_QUERY = "(max-width: 720px), (max-device-width: 720px), (pointer: coarse) and (hover: none)";
const SIDE_PANEL_OVERLAY_QUERY = "(max-width: 1050px), (max-device-width: 720px), (pointer: coarse) and (hover: none)";
const CHAT_BOTTOM_THRESHOLD_PX = 96;
const STICKY_USER_PROMPT_PREVIEW_LIMIT = 220;
const STICKY_USER_PROMPT_TOP_GAP_PX = 12;
const CHAT_FOLLOW_SETTLE_DELAY_MS = 80;
const CHAT_PROGRAMMATIC_SCROLL_GRACE_MS = 500;
const CHAT_USER_SCROLL_INTENT_MS = 700;
const CODEX_USAGE_REFRESH_MS = 5 * 60 * 1000;
const CODEX_USAGE_RENDER_TICK_MS = 30 * 1000;
const RUN_INDICATOR_TICK_MS = 1000;
const RUN_INDICATOR_START_GRACE_MS = 2500;
const RUN_INDICATOR_STATE_RECHECK_MS = 5000;
const ABORT_LONG_PRESS_MS = 700;
const STREAM_OUTPUT_HIDE_DELAY_MS = 300;
const STREAM_OUTPUT_TOOLCALL_GUARD_MS = 220;
const STREAM_OUTPUT_MIN_VISIBLE_MS = 900;
const TOOL_LIVE_UPDATE_THROTTLE_MS = 80;
const UNEXPOSED_THINKING_TEXT = "No thinking content was exposed by the provider.";
const TODO_PROGRESS_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[(?: |x|X|-)\]\s+.+$/;
const TODO_PROGRESS_PARTIAL_LINE_REGEX = /^\s*(?:(?:[-*]|\d+[.)])\s*)?\[(?: |x|X|-)?\]?\s*.*$/;
const CHAT_SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);
const TAB_ACTIVITY_IDLE_RECONCILE_GRACE_MS = 1200;
const FOREGROUND_RECONCILE_DELAY_MS = 120;
const TAB_GROUP_STATUS_PRIORITY = ["blocked", "done", "working", "idle"];
const EXTENSION_UI_BLOCKING_METHODS = new Set(["select", "confirm", "input", "editor"]);
const BLOCKED_TAB_NOTIFICATION_TAG_PREFIX = "pi-webui-blocked-tab";
const AGENT_DONE_NOTIFICATION_TAG_PREFIX = "pi-webui-agent-done";
const BLOCKED_TAB_NOTIFICATION_ICON = "/icon-192.png";
const mobileViewMedia = window.matchMedia?.(MOBILE_VIEW_QUERY) || null;
const sidePanelOverlayMedia = window.matchMedia?.(SIDE_PANEL_OVERLAY_QUERY) || mobileViewMedia;
const statusEntries = new Map();
const widgets = new Map();
const todoProgressWidgetExpandedByTab = new Map();
const releaseNpmOutputExpandedByTab = new Map();
const appRunnerDataByTab = new Map();
const liveToolRuns = new Map();
const liveToolCards = new Map();
const liveToolRenderQueue = new Map();
let liveToolRenderTimer = null;
// Optional feature detection intentionally checks loaded Pi capabilities (RPC-visible
// commands and live widget events), not npm package folders. This keeps local dev
// symlinks and independently installed packages working.
const optionalFeatureAvailability = {
  gitWorkflow: false,
  releaseNpm: false,
  releaseAur: false,
  statsCommand: false,
  gitFooterStatus: false,
  tuiSkillsCommand: false,
  todoProgressWidget: false,
  tuiToolsCommand: false,
  themeBundle: false,
};
const OPTIONAL_FEATURES = [
  {
    id: "gitWorkflow",
    label: "Guided Git workflow",
    packageName: "@firstpick/pi-prompts-git-pr",
    capabilityLabel: "/git-staged-msg",
    description: "Generate staged commit messages for the guided Git workflow.",
  },
  {
    id: "releaseNpm",
    label: "NPM Release",
    packageName: "@firstpick/pi-extension-release-npm",
    capabilityLabel: "/release-npm",
    description: "Publish menu action and live npm release widgets.",
  },
  {
    id: "releaseAur",
    label: "AUR Release",
    packageName: "@firstpick/pi-extension-release-aur",
    capabilityLabel: "/release-aur",
    description: "Publish menu action, setup helpers, skills, and AUR release widgets.",
  },
  {
    id: "tuiSkillsCommand",
    label: "TUI Skills command",
    packageName: "@firstpick/pi-extension-setup-skills",
    capabilityLabel: "RPC /skills from setup-skills extension",
    description: "Terminal-native skill setup command alongside WebUI-native /skills toggles.",
  },
  {
    id: "todoProgressWidget",
    label: "Todo progress widget",
    packageName: "@firstpick/pi-extension-todo-progress",
    capabilityLabel: "/todo-progress-status or todo-progress widget event",
    description: "Styled live checklist rendering for assistant todo updates.",
  },
  {
    id: "tuiToolsCommand",
    label: "TUI Tools command",
    packageName: "@firstpick/pi-extension-tools",
    capabilityLabel: "RPC /tools from tools extension",
    description: "Terminal-native active-tool manager alongside WebUI-native /tools toggles.",
  },
  {
    id: "gitFooterStatus",
    label: "Git footer status",
    packageName: "@firstpick/pi-extension-git-footer-status",
    capabilityLabel: "/git-footer-refresh or git-footer-webui status event",
    description: "Extension-owned enhanced footer/status telemetry when loaded by Pi.",
  },
  {
    id: "statsCommand",
    label: "Stats command",
    packageName: "@firstpick/pi-extension-stats",
    capabilityLabel: "/stats",
    description: "Token and cost usage analytics commands.",
  },
  {
    id: "themeBundle",
    label: "Theme bundle",
    packageName: "@firstpick/pi-themes-bundle",
    capabilityLabel: "/api/themes returned themes",
    description: "Additional browser theme-picker and Pi theme resources.",
  },
];
const OPTIONAL_FEATURE_BY_ID = new Map(OPTIONAL_FEATURES.map((feature) => [feature.id, feature]));
const OPTIONAL_COMMAND_FEATURES = new Map([
  ["git-staged-msg", "gitWorkflow"],
  ["git-branch-name", "gitWorkflow"],
  ["pr", "gitWorkflow"],
  ["release-npm", "releaseNpm"],
  ["release-aur", "releaseAur"],
  ["skills", "tuiSkillsCommand"],
  ["tools", "tuiToolsCommand"],
  ["stats", "statsCommand"],
  ["git-footer-refresh", "gitFooterStatus"],
  ["todo-progress-status", "todoProgressWidget"],
]);
const HIDDEN_COMMAND_NAMES = new Set(["webui-tree-navigate", "webui-helper"]);
const NATIVE_SELECTOR_COMMANDS = new Set(["model", "settings", "theme", "fork", "clone", "name", "resume", "tree", "login", "logout", "scoped-models", "tools", "skills"]);
const SETTINGS_THINKING_OPTIONS = ["off", "minimal", "low", "medium", "high", "xhigh"];
const SETTINGS_TRANSPORT_OPTIONS = ["sse", "websocket", "websocket-cached", "auto"];
const SETTINGS_HTTP_IDLE_TIMEOUT_OPTIONS = [
  { value: "30000", label: "30 sec" },
  { value: "60000", label: "1 min" },
  { value: "120000", label: "2 min" },
  { value: "300000", label: "5 min" },
  { value: "0", label: "disabled" },
];
const SETTINGS_DOUBLE_ESCAPE_OPTIONS = [
  { value: "tree", label: "open /tree" },
  { value: "fork", label: "open /fork" },
  { value: "none", label: "do nothing" },
];
const SETTINGS_TREE_FILTER_OPTIONS = ["default", "no-tools", "user-only", "labeled-only", "all"];
const SETTINGS_IMAGE_WIDTH_OPTIONS = ["60", "80", "120"];
const SETTINGS_EDITOR_PADDING_OPTIONS = ["0", "1", "2", "3"];
const SETTINGS_AUTOCOMPLETE_OPTIONS = ["3", "5", "7", "10", "15", "20"];
const optionalFeatureInstallInProgress = new Set();
const gitFooterPayloadRefreshInFlightByTab = new Set();

function createGitWorkflowActionsDone(patch = {}) {
  return {
    stage: false,
    message: false,
    commit: false,
    push: false,
    ...patch,
  };
}

function gitWorkflowActionDone(workflow, process) {
  return !!createGitWorkflowActionsDone(workflow?.actionsDone)[process];
}

function gitWorkflowActionDonePatch(workflow, process) {
  return { actionsDone: createGitWorkflowActionsDone({ ...workflow?.actionsDone, [process]: true }) };
}

function createGitWorkflowState() {
  return {
    active: false,
    step: "idle",
    process: "stage",
    busy: false,
    runId: 0,
    output: "",
    error: "",
    message: null,
    messageRequestedAt: 0,
    branchName: "",
    branchNameRequestedAt: 0,
    actionsDone: createGitWorkflowActionsDone(),
    prMode: false,
    prBranch: "",
    pr: null,
    prRequestedAt: 0,
  };
}

const gitWorkflowsByTab = new Map();
let gitWorkflow = createGitWorkflowState();

function gitWorkflowForTab(tabId = activeTabId, { create = true } = {}) {
  if (!tabId) return null;
  let workflow = gitWorkflowsByTab.get(tabId);
  if (!workflow && create) {
    workflow = createGitWorkflowState();
    gitWorkflowsByTab.set(tabId, workflow);
  }
  return workflow || null;
}

function bindGitWorkflowToActiveTab() {
  gitWorkflow = gitWorkflowForTab(activeTabId) || createGitWorkflowState();
  return gitWorkflow;
}

function gitWorkflowActionTabId() {
  return activeTabId;
}

function resetGitWorkflowForTab(tabId = activeTabId) {
  if (!tabId) return;
  gitWorkflowsByTab.set(tabId, createGitWorkflowState());
  if (tabId === activeTabId) {
    bindGitWorkflowToActiveTab();
    renderGitWorkflow();
  }
}

function clearGitWorkflowForTab(tabId) {
  if (!tabId) return;
  gitWorkflowsByTab.delete(tabId);
  if (tabId === activeTabId) {
    bindGitWorkflowToActiveTab();
    renderGitWorkflow();
  }
}

const GIT_WORKFLOW_PROCESSES = [
  { value: "stage", label: "Stage" },
  { value: "message", label: "Message" },
  { value: "commit", label: "Commit" },
  { value: "push", label: "Push" },
];
const GIT_WORKFLOW_PROCESS_VALUES = new Set(GIT_WORKFLOW_PROCESSES.map((process) => process.value));
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
  branchNaming: 2,
  branching: 2,
  committing: 2,
  push: 3,
  pushing: 3,
  prGenerating: 3,
  prReview: 3,
  prCreating: 3,
  done: 4,
};
const GIT_WORKFLOW_CREATE_PR_TOOLTIP = [
  "Create PR:",
  "1. Ask Pi to generate a type/feature-name branch from staged changes.",
  "2. Read dev/COMMIT/staged-branch-name.txt.",
  "3. Let you confirm or edit the generated branch name.",
  "4. Run git switch -c <branch>.",
  "5. Return here so you can choose Commit short or Commit long on that branch.",
].join("\n");
const GIT_WORKFLOW_MANUAL_BRANCH_TOOLTIP = [
  "Manual branch:",
  "1. Skip agent branch-name generation.",
  "2. Prefill a branch from the commit message if possible.",
  "3. Let you type or edit the type/feature-name branch name.",
  "4. Run git switch -c <branch>.",
  "5. Return here so you can choose Commit short or Commit long on that branch.",
].join("\n");

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

function isSidePanelOverlayView() {
  return sidePanelOverlayMedia?.matches || false;
}

function readStoredSidePanelCollapsed() {
  try {
    const stored = localStorage.getItem(SIDE_PANEL_STORAGE_KEY);
    return stored === null ? null : stored === "1";
  } catch {
    return null;
  }
}

function sidePanelSectionRecords() {
  return Array.from(elements.sidePanel.querySelectorAll("[data-side-panel-section]"))
    .map((section) => {
      const id = section.dataset.sidePanelSection || "";
      const button = section.querySelector("[data-side-panel-section-toggle]");
      const contentId = button?.getAttribute("aria-controls") || "";
      const content = contentId ? document.getElementById(contentId) : null;
      return { id, section, button, content };
    })
    .filter((record) => record.id && record.button && record.content);
}

function readStoredSidePanelSectionCollapsedIds() {
  try {
    const stored = localStorage.getItem(SIDE_PANEL_SECTION_STORAGE_KEY);
    if (stored === null) return null;
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
  } catch {
    return null;
  }
}

function persistSidePanelSectionState() {
  try {
    const collapsed = sidePanelSectionRecords()
      .filter(({ section }) => section.classList.contains("collapsed"))
      .map(({ id }) => id);
    localStorage.setItem(SIDE_PANEL_SECTION_STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    // Ignore storage failures; section toggles should still work for this page load.
  }
}

function setSidePanelSectionCollapsed(record, collapsed, { persist = true } = {}) {
  const label = record.button.querySelector(".side-panel-section-label")?.textContent?.trim() || "side panel";
  record.section.classList.toggle("collapsed", collapsed);
  record.content.hidden = collapsed;
  record.button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  record.button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${label} section`);
  record.button.setAttribute("title", `${collapsed ? "Expand" : "Collapse"} ${label} section`);
  if (persist) persistSidePanelSectionState();
}

function setOnlySidePanelSectionExpanded(targetRecord, { persist = true } = {}) {
  const targetId = targetRecord?.id || null;
  for (const record of sidePanelSectionRecords()) {
    setSidePanelSectionCollapsed(record, record.id !== targetId, { persist: false });
  }
  if (persist) persistSidePanelSectionState();
}

function restoreSidePanelSectionState() {
  const records = sidePanelSectionRecords();
  const collapsedIds = readStoredSidePanelSectionCollapsedIds();
  const expandedRecords = collapsedIds ? records.filter(({ id }) => !collapsedIds.has(id)) : [];
  const expandedId = expandedRecords.length === 1 ? expandedRecords[0].id : null;
  for (const record of records) {
    setSidePanelSectionCollapsed(record, record.id !== expandedId, { persist: false });
  }
}

function bindSidePanelSectionToggles() {
  for (const record of sidePanelSectionRecords()) {
    record.button.addEventListener("click", () => {
      if (record.section.classList.contains("collapsed")) {
        setOnlySidePanelSectionExpanded(record);
      } else {
        setSidePanelSectionCollapsed(record, true);
      }
    });
  }
}

function readStoredAgentDoneNotificationsEnabled() {
  try {
    return localStorage.getItem(AGENT_DONE_NOTIFICATIONS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistAgentDoneNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(AGENT_DONE_NOTIFICATIONS_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage failures; the toggle should still work for this page load.
  }
}

function agentDoneNotificationsStatusText() {
  if (!browserNotificationSupported()) return "Unavailable here";
  const permission = browserNotificationPermission();
  if (permission === "denied") return "Permission denied";
  if (agentDoneNotificationsEnabled) return permission === "granted" ? "On" : "Permission needed";
  return permission === "granted" ? "Off · permission granted" : "Off";
}

function renderAgentDoneNotificationsToggle() {
  if (!elements.agentDoneNotificationsToggle) return;
  const supported = browserNotificationSupported();
  const permission = browserNotificationPermission();
  elements.agentDoneNotificationsToggle.checked = agentDoneNotificationsEnabled;
  elements.agentDoneNotificationsToggle.disabled = !supported || permission === "denied";
  elements.agentDoneNotificationsToggle.setAttribute("aria-describedby", "agentDoneNotificationsStatus");
  if (elements.agentDoneNotificationsStatus) elements.agentDoneNotificationsStatus.textContent = agentDoneNotificationsStatusText();
}

async function setAgentDoneNotificationsEnabled(enabled, { requestPermission = false, announce = false } = {}) {
  let next = !!enabled;
  if (next) {
    if (!browserNotificationSupported()) {
      addEvent("agent-done notifications require HTTPS or localhost", "warn");
      next = false;
    } else if (browserNotificationPermission() === "denied") {
      addEvent("agent-done notifications are blocked by browser permission", "warn");
      next = false;
    } else if (requestPermission && browserNotificationPermission() !== "granted") {
      next = await ensureAgentDoneNotificationPermission();
      if (!next) addEvent("agent-done notifications not enabled; browser permission was not granted", "warn");
    } else if (browserNotificationPermission() !== "granted") {
      next = false;
    }
  }
  agentDoneNotificationsEnabled = next;
  persistAgentDoneNotificationsEnabled(next);
  renderAgentDoneNotificationsToggle();
  if (announce) addEvent(next ? "agent-done notifications enabled" : "agent-done notifications disabled", next ? "info" : "warn");
  return next;
}

function restoreAgentDoneNotificationsSetting() {
  agentDoneNotificationsEnabled = readStoredAgentDoneNotificationsEnabled();
  if (agentDoneNotificationsEnabled && (!browserNotificationSupported() || browserNotificationPermission() !== "granted")) {
    agentDoneNotificationsEnabled = false;
    persistAgentDoneNotificationsEnabled(false);
  }
  renderAgentDoneNotificationsToggle();
}

function readStoredThinkingOutputVisible() {
  try {
    const stored = localStorage.getItem(THINKING_VISIBILITY_STORAGE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

function persistThinkingOutputVisible(visible) {
  try {
    localStorage.setItem(THINKING_VISIBILITY_STORAGE_KEY, visible ? "1" : "0");
  } catch {
    // Ignore storage failures; the toggle should still work for this page load.
  }
}

function normalizeTerminalTabsLayout(value) {
  return TERMINAL_TABS_LAYOUTS.has(value) ? value : "top";
}

function readStoredTerminalTabsLayout() {
  try {
    return normalizeTerminalTabsLayout(localStorage.getItem(TERMINAL_TABS_LAYOUT_STORAGE_KEY));
  } catch {
    return "top";
  }
}

function persistTerminalTabsLayout(layout) {
  try {
    localStorage.setItem(TERMINAL_TABS_LAYOUT_STORAGE_KEY, normalizeTerminalTabsLayout(layout));
  } catch {
    // Ignore storage failures; the layout control should still work for this page load.
  }
}

function readStoredToolOutputExpanded() {
  try {
    return localStorage.getItem(TOOL_OUTPUT_EXPANDED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistToolOutputExpanded(expanded) {
  try {
    localStorage.setItem(TOOL_OUTPUT_EXPANDED_STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    // Ignore storage failures; this can remain a page-local preference.
  }
}

function thinkingVisibilityStatusText() {
  return thinkingOutputVisible ? "Visible" : "Hidden from transcript";
}

function renderThinkingVisibilityToggle() {
  if (!elements.thinkingVisibilityToggle) return;
  elements.thinkingVisibilityToggle.checked = thinkingOutputVisible;
  elements.thinkingVisibilityToggle.setAttribute("aria-describedby", "thinkingVisibilityStatus");
  if (elements.thinkingVisibilityStatus) elements.thinkingVisibilityStatus.textContent = thinkingVisibilityStatusText();
}

function terminalTabsLayoutStatusText(layout = terminalTabsLayout) {
  return TERMINAL_TABS_LAYOUT_LABELS[normalizeTerminalTabsLayout(layout)] || TERMINAL_TABS_LAYOUT_LABELS.top;
}

function renderTerminalTabsLayoutControl() {
  const layout = normalizeTerminalTabsLayout(terminalTabsLayout);
  if (elements.terminalTabsLayoutSelect) elements.terminalTabsLayoutSelect.value = layout;
  if (elements.terminalTabsLayoutStatus) elements.terminalTabsLayoutStatus.textContent = terminalTabsLayoutStatusText(layout);
}

function setTerminalTabsLayout(layout, { persist = true, announce = false } = {}) {
  const next = normalizeTerminalTabsLayout(layout);
  terminalTabsLayout = next;
  document.body.classList.toggle("terminal-tabs-left", next === "left");
  if (next === "left" && mobileTabsExpanded) setMobileTabsExpanded(false);
  if (persist) persistTerminalTabsLayout(next);
  renderTerminalTabsLayoutControl();
  if (announce) addEvent(`terminal tabs layout changed to ${terminalTabsLayoutStatusText(next).toLowerCase()}`);
}

function restoreTerminalTabsLayoutSetting() {
  setTerminalTabsLayout(readStoredTerminalTabsLayout(), { persist: false });
}

function removeStreamingThinkingBubble() {
  streamThinkingBubble?.remove();
  streamThinkingBubble = null;
  streamThinking = null;
  renderRunIndicator({ scroll: false });
}

function setThinkingOutputVisible(visible, { announce = false } = {}) {
  thinkingOutputVisible = !!visible;
  persistThinkingOutputVisible(thinkingOutputVisible);
  renderThinkingVisibilityToggle();
  if (!thinkingOutputVisible) removeStreamingThinkingBubble();
  renderAllMessages({ preserveScroll: true });
  if (announce) addEvent(thinkingOutputVisible ? "thinking output shown" : "thinking output hidden", thinkingOutputVisible ? "info" : "warn");
}

function applyToolOutputExpansionToDom(expanded = toolOutputGloballyExpanded) {
  for (const details of elements.chat.querySelectorAll(".tool-output-details, .tool-raw-details, .message.toolResult .message-collapse, .message.toolExecution details, .message.bashExecution .message-collapse")) {
    details.open = !!expanded;
  }
}

function setToolOutputGloballyExpanded(expanded, { announce = false, rerender = false } = {}) {
  toolOutputGloballyExpanded = !!expanded;
  persistToolOutputExpanded(toolOutputGloballyExpanded);
  if (rerender) renderAllMessages({ preserveScroll: true });
  else applyToolOutputExpansionToDom();
  if (announce) addEvent(toolOutputGloballyExpanded ? "tool and bash output expanded" : "tool and bash output collapsed", "info");
}

function restoreToolOutputExpansionSetting() {
  toolOutputGloballyExpanded = readStoredToolOutputExpanded();
}

function restoreThinkingVisibilitySetting() {
  thinkingOutputVisible = readStoredThinkingOutputVisible();
  renderThinkingVisibilityToggle();
}

function normalizeBusyPromptBehavior(value) {
  const normalized = String(value || "").trim();
  if (normalized === "follow-up" || normalized.toLowerCase() === "followup") return "followUp";
  return BUSY_PROMPT_BEHAVIOR_VALUES.has(normalized) ? normalized : "followUp";
}

function readStoredBusyPromptBehavior() {
  try {
    return normalizeBusyPromptBehavior(localStorage.getItem(BUSY_PROMPT_BEHAVIOR_STORAGE_KEY));
  } catch {
    return "followUp";
  }
}

function persistBusyPromptBehavior(behavior) {
  try {
    localStorage.setItem(BUSY_PROMPT_BEHAVIOR_STORAGE_KEY, normalizeBusyPromptBehavior(behavior));
  } catch {
    // Ignore storage failures; the setting should still work for this page load.
  }
}

function busyPromptBehaviorMenuItems() {
  return Array.from(elements.busyPromptBehaviorMenu?.querySelectorAll("[data-busy-prompt-behavior]") || []);
}

function renderBusyPromptBehaviorMenu() {
  const behavior = normalizeBusyPromptBehavior(busyPromptBehavior);
  for (const item of busyPromptBehaviorMenuItems()) {
    const checked = normalizeBusyPromptBehavior(item.dataset.busyPromptBehavior) === behavior;
    item.setAttribute("aria-checked", checked ? "true" : "false");
    item.classList.toggle("active", checked);
  }
}

function normalizeSkillName(value) {
  const raw = String(value || "").trim().replace(/^\/?skill:/i, "");
  if (!raw) return "";
  const match = raw.match(/^[a-z0-9][a-z0-9._-]{0,63}$/i);
  return match ? match[0].toLowerCase() : "";
}

function skillUsageMapForTab(tabId = activeTabId, { create = true } = {}) {
  if (!tabId) return null;
  let map = skillUsageByTab.get(tabId);
  if (!map && create) {
    map = new Map();
    skillUsageByTab.set(tabId, map);
  }
  return map || null;
}

function clearSkillUsageForTab(tabId = activeTabId) {
  if (!tabId) return;
  skillUsageByTab.delete(tabId);
  persistSkillUsage();
  if (tabId === activeTabId) renderSessionSkillTags(tabId);
}

function sortedSkillUsageEntries(tabId = activeTabId) {
  const map = skillUsageMapForTab(tabId, { create: false });
  if (!map) return [];
  return [...map.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt || a.name.localeCompare(b.name));
}

function serializeSkillUsageEntry(entry) {
  const name = normalizeSkillName(entry?.name || "");
  if (!name) return null;
  const kinds = entry?.kinds instanceof Set ? [...entry.kinds] : Array.isArray(entry?.kinds) ? entry.kinds : [];
  const paths = entry?.paths instanceof Set ? [...entry.paths] : Array.isArray(entry?.paths) ? entry.paths : [];
  const sources = entry?.sources instanceof Set ? [...entry.sources] : Array.isArray(entry?.sources) ? entry.sources : [];
  const path = entry?.path || paths[paths.length - 1] || "";
  return {
    name,
    firstSeenAt: Number.isFinite(entry?.firstSeenAt) ? entry.firstSeenAt : Date.now(),
    lastSeenAt: Number.isFinite(entry?.lastSeenAt) ? entry.lastSeenAt : Date.now(),
    kinds: kinds.includes("read") ? kinds : [...kinds, "read"],
    sources: sources.slice(-12),
    path,
    paths: [...new Set([path, ...paths].filter(Boolean))].slice(-8),
  };
}

function persistSkillUsage() {
  try {
    const storedTabs = {};
    for (const [tabId, map] of skillUsageByTab.entries()) {
      const entries = [...map.values()]
        .filter((entry) => entry?.kinds?.has("read"))
        .map(serializeSkillUsageEntry)
        .filter(Boolean)
        .slice(0, SKILL_USAGE_LIMIT_PER_TAB);
      if (entries.length) storedTabs[tabId] = entries;
    }
    localStorage.setItem(SKILL_USAGE_STORAGE_KEY, JSON.stringify({ version: 1, tabs: storedTabs }));
  } catch {
    // Ignore storage failures; tags still work for the current page lifetime.
  }
}

function restoreStoredSkillUsage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SKILL_USAGE_STORAGE_KEY) || "{}");
    const storedTabs = parsed?.tabs && typeof parsed.tabs === "object" ? parsed.tabs : {};
    for (const [tabId, entries] of Object.entries(storedTabs)) {
      if (!tabId || !Array.isArray(entries)) continue;
      const map = skillUsageMapForTab(tabId);
      if (!map) continue;
      for (const stored of entries.slice(0, SKILL_USAGE_LIMIT_PER_TAB)) {
        const name = normalizeSkillName(stored?.name || "");
        if (!name) continue;
        const kinds = new Set(Array.isArray(stored?.kinds) ? stored.kinds : ["read"]);
        if (!kinds.has("read")) continue;
        const paths = new Set(Array.isArray(stored?.paths) ? stored.paths.filter(Boolean) : []);
        if (stored?.path) paths.add(stored.path);
        map.set(name, {
          name,
          firstSeenAt: Number.isFinite(stored?.firstSeenAt) ? stored.firstSeenAt : Date.now(),
          lastSeenAt: Number.isFinite(stored?.lastSeenAt) ? stored.lastSeenAt : Date.now(),
          kinds,
          sources: new Set(Array.isArray(stored?.sources) ? stored.sources : ["stored"]),
          path: stored?.path || [...paths].at(-1) || "",
          paths,
        });
      }
    }
  } catch {
    // Ignore corrupt stored tag data.
  }
}

function pruneSkillUsageForKnownTabs(tabIds) {
  let changed = false;
  for (const tabId of skillUsageByTab.keys()) {
    if (tabIds.has(tabId)) continue;
    skillUsageByTab.delete(tabId);
    changed = true;
  }
  if (changed) persistSkillUsage();
}

function skillInfoFromPath(pathText) {
  const normalized = String(pathText || "").trim().replace(/\\/g, "/");
  const match = normalized.match(/\/skills\/([^/]+)\/SKILL\.md$/i);
  const name = normalizeSkillName(match?.[1] || "");
  return name ? { name, path: normalized } : null;
}

function skillNameFromPath(pathText) {
  return skillInfoFromPath(pathText)?.name || "";
}

function skillNamesFromSlashCommands(text) {
  const names = new Set();
  for (const match of String(text || "").matchAll(/\/skill:([a-z0-9][a-z0-9._-]{0,63})/gi)) {
    const normalized = normalizeSkillName(match[1]);
    if (normalized) names.add(normalized);
  }
  return [...names];
}

function skillKindsLabel(entry) {
  return entry?.kinds?.has("read") ? "context read" : "tracked";
}

function renderSessionSkillTags(tabId = activeTabId) {
  const container = elements.sessionSkillTags;
  if (!container) return;
  const entries = sortedSkillUsageEntries(tabId).filter((entry) => entry.kinds.has("read"));
  container.replaceChildren();
  if (!entries.length) {
    container.hidden = true;
    return;
  }
  const visible = entries.slice(0, SKILL_TAG_MAX_VISIBLE);
  for (const entry of visible) {
    const classes = ["composer-skill-tag", "read"];
    const tag = make("button", classes.join(" "), entry.name);
    tag.type = "button";
    tag.dataset.skillName = entry.name;
    tag.dataset.skillPath = skillPathForEntry(entry);
    tag.title = `Open and edit skill ${entry.name} (${skillKindsLabel(entry)}) tracked in this tab/session.`;
    tag.setAttribute("aria-label", `Open skill ${entry.name}`);
    tag.addEventListener("click", () => openSkillEditor(entry));
    container.append(tag);
  }
  if (entries.length > visible.length) {
    const overflow = make("span", "composer-skill-tag overflow", `+${entries.length - visible.length}`);
    overflow.title = `${entries.length - visible.length} more tracked skill${entries.length - visible.length === 1 ? "" : "s"}.`;
    container.append(overflow);
  }
  container.hidden = false;
}

function trackSkillUsage(tabId, skillName, kind = "used", source = "", details = {}) {
  const name = normalizeSkillName(skillName);
  if (!tabId || !name) return;
  const map = skillUsageMapForTab(tabId);
  if (!map) return;
  const now = Date.now();
  const entry = map.get(name) || { name, firstSeenAt: now, lastSeenAt: now, kinds: new Set(), sources: new Set(), paths: new Set() };
  entry.lastSeenAt = now;
  if (["used", "loaded", "read"].includes(kind)) entry.kinds.add(kind);
  else entry.kinds.add("used");
  if (source) entry.sources.add(source);
  if (details?.path) {
    entry.path = details.path;
    entry.paths ||= new Set();
    entry.paths.add(details.path);
  }
  map.set(name, entry);
  if (map.size > SKILL_USAGE_LIMIT_PER_TAB) {
    const keep = [...map.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, SKILL_USAGE_LIMIT_PER_TAB);
    map.clear();
    for (const item of keep) map.set(item.name, item);
  }
  persistSkillUsage();
  if (tabId === activeTabId) renderSessionSkillTags(tabId);
}

function trackSkillsFromText(tabId, text, { kind = "used", source = "" } = {}) {
  // Intentionally do not tag /skill:name mentions. A skill tag means the
  // agent read that skill's full SKILL.md context, not only its command/name.
}

function trackSkillsFromValue(tabId, value, { keyHint = "", kind = "used", source = "", depth = 0 } = {}) {
  if (!tabId || value === undefined || value === null || depth > 5) return;
  if (Array.isArray(value)) {
    for (const item of value) trackSkillsFromValue(tabId, item, { keyHint, kind, source, depth: depth + 1 });
    return;
  }
  if (typeof value === "string") {
    const skillInfo = skillInfoFromPath(value);
    if (skillInfo) trackSkillUsage(tabId, skillInfo.name, "read", source, { path: skillInfo.path });
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    const hint = String(key || "").toLowerCase();
    trackSkillsFromValue(tabId, nested, { keyHint: hint, kind, source, depth: depth + 1 });
  }
}

function trackSkillsFromToolInvocation(tabId, toolName, args, { sourcePrefix = "tool" } = {}) {
  if (!tabId) return;
  const name = String(toolName || "").trim();
  if (name.toLowerCase() !== "read") return;
  const source = `${sourcePrefix}:${name}`;
  trackSkillsFromValue(tabId, args, { kind: "read", source });
}

function trackSkillsFromMessage(tabId, message) {
  if (!tabId || !message) return;
  const role = String(message.role || "");
  if (role === "toolExecution" || role === "toolCall") {
    trackSkillsFromToolInvocation(tabId, message.toolName || message.name, message.arguments ?? message.args ?? {}, { sourcePrefix: `message:${role}` });
    return;
  }
  if (role === "user" || role === "assistant" || role === "assistantEvent" || role === "native") {
    trackSkillsFromText(tabId, textFromContent(message.content), { kind: "used", source: `message:${role}` });
    return;
  }
  if (role === "bashExecution") {
    trackSkillsFromText(tabId, `${message.command || ""}\n${message.output || ""}`, { kind: "used", source: "message:bash" });
  }
}

function trackSkillsFromMessages(messages = latestMessages, tabId = activeTabId) {
  for (const message of messages || []) trackSkillsFromMessage(tabId, message);
}

function trackSkillsFromEvent(event) {
  const tabId = event?.tabId || activeTabId;
  if (!tabId || !event) return;
  if (["tool_execution_start", "tool_execution_update", "tool_execution_end"].includes(event.type)) {
    trackSkillsFromToolInvocation(tabId, event.toolName, event.args, { sourcePrefix: `event:${event.type}` });
    return;
  }
  if (event.type === "message_update") {
    const update = event.assistantMessageEvent || {};
    if (update.type === "toolcall_start") {
      trackSkillsFromToolInvocation(tabId, update.name || update.toolName || update.toolCall?.name, update.arguments || update.args || update.toolCall?.arguments || {}, { sourcePrefix: "event:message_update" });
    }
    return;
  }
  if (event.type === "response" && event.command === "new_session") {
    clearSkillUsageForTab(tabId);
  }
}

function skillPathForEntry(entry) {
  if (entry?.path) return entry.path;
  if (entry?.paths instanceof Set && entry.paths.size) {
    const paths = [...entry.paths];
    return paths[paths.length - 1] || "";
  }
  return "";
}

function skillEditorApiPath({ name = "", path = "" } = {}) {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (path) params.set("path", path);
  const query = params.toString();
  return query ? `/api/skill-file?${query}` : "/api/skill-file";
}

function setSkillEditorStatus(message = "", level = "muted") {
  const status = elements.skillEditorStatus;
  if (!status) return;
  status.textContent = message;
  status.className = `skill-editor-status ${level || "muted"}`;
  status.hidden = !message;
}

function closeSkillEditor() {
  if (elements.skillEditorDialog?.open) elements.skillEditorDialog.close();
  else activeSkillEditor = null;
}

function updateSkillEditorMeta(data = activeSkillEditor || {}) {
  if (!elements.skillEditorMeta) return;
  const parts = [data.name ? `Skill: ${data.name}` : "Skill", data.path || "path unavailable"].filter(Boolean);
  elements.skillEditorMeta.textContent = parts.join(" · ");
}

async function openSkillEditor(entry) {
  const name = normalizeSkillName(entry?.name || "");
  const path = skillPathForEntry(entry);
  if (!name || !elements.skillEditorDialog || !elements.skillEditorText) return;
  const tabId = activeTabId;
  activeSkillEditor = { name, path, tabId, mtimeMs: null };
  if (elements.skillEditorTitle) elements.skillEditorTitle.textContent = `Edit skill: ${name}`;
  if (elements.skillEditorText) elements.skillEditorText.value = "";
  if (elements.skillEditorSaveButton) elements.skillEditorSaveButton.disabled = true;
  updateSkillEditorMeta(activeSkillEditor);
  setSkillEditorStatus("Loading skill context…", "muted");
  if (!elements.skillEditorDialog.open) elements.skillEditorDialog.showModal();

  try {
    const response = await api(skillEditorApiPath({ name, path }), { tabId });
    if (activeSkillEditor?.tabId !== tabId || activeSkillEditor?.name !== name) return;
    const data = response.data || {};
    activeSkillEditor = { name: normalizeSkillName(data.name || name), path: data.path || path, tabId, mtimeMs: data.mtimeMs };
    if (elements.skillEditorTitle) elements.skillEditorTitle.textContent = `Edit skill: ${activeSkillEditor.name}`;
    if (elements.skillEditorText) elements.skillEditorText.value = data.content || "";
    if (elements.skillEditorSaveButton) elements.skillEditorSaveButton.disabled = false;
    updateSkillEditorMeta(activeSkillEditor);
    setSkillEditorStatus("Edit this SKILL.md, then save. Reload the tab if title/description metadata should refresh immediately.", "muted");
    queueMicrotask(() => elements.skillEditorText?.focus());
  } catch (error) {
    if (elements.skillEditorSaveButton) elements.skillEditorSaveButton.disabled = true;
    setSkillEditorStatus(`Failed to open skill: ${error.message || String(error)}`, "error");
  }
}

async function saveSkillEditor() {
  if (!activeSkillEditor || !elements.skillEditorText || !elements.skillEditorSaveButton) return;
  const editor = activeSkillEditor;
  const previousLabel = elements.skillEditorSaveButton.textContent;
  elements.skillEditorSaveButton.disabled = true;
  elements.skillEditorSaveButton.textContent = "Saving…";
  setSkillEditorStatus("Saving skill…", "muted");
  try {
    const response = await api("/api/skill-file", {
      method: "POST",
      tabId: editor.tabId,
      body: {
        name: editor.name,
        path: editor.path,
        mtimeMs: editor.mtimeMs,
        content: elements.skillEditorText.value,
      },
    });
    const data = response.data || {};
    const savedName = normalizeSkillName(data.name || editor.name);
    activeSkillEditor = { name: savedName, path: data.path || editor.path, tabId: editor.tabId, mtimeMs: data.mtimeMs };
    const map = skillUsageMapForTab(editor.tabId, { create: false });
    if (map && savedName !== editor.name) map.delete(editor.name);
    trackSkillUsage(editor.tabId, savedName, "read", "skill-editor", { path: activeSkillEditor.path });
    if (elements.skillEditorTitle) elements.skillEditorTitle.textContent = `Edit skill: ${savedName}`;
    updateSkillEditorMeta(activeSkillEditor);
    setSkillEditorStatus("Saved SKILL.md. Reload/restart affected tabs before relying on updated skill metadata or newly loaded instructions.", "ok");
  } catch (error) {
    setSkillEditorStatus(`Failed to save skill: ${error.message || String(error)}`, "error");
  } finally {
    elements.skillEditorSaveButton.textContent = previousLabel || "Save skill";
    elements.skillEditorSaveButton.disabled = false;
  }
}

function renderBusyPromptBehaviorTag() {
  const tag = elements.busyPromptBehaviorTag;
  if (!tag) return;
  const behavior = normalizeBusyPromptBehavior(busyPromptBehavior);
  const label = BUSY_PROMPT_BEHAVIOR_LABELS[behavior] || BUSY_PROMPT_BEHAVIOR_LABELS.followUp;
  tag.textContent = label;
  tag.classList.toggle("follow-up", behavior === "followUp");
  tag.classList.toggle("steer", behavior === "steer");
  tag.title = behavior === "steer"
    ? "While Pi is running, normal prompt submit steers the active run. Click to change."
    : "While Pi is running, normal prompt submit queues a follow-up. Click to change.";
  tag.setAttribute("aria-label", tag.title);
  renderBusyPromptBehaviorMenu();
  renderSessionSkillTags(activeTabId);
}

function setBusyPromptBehaviorMenuOpen(open, { focusCurrent = false } = {}) {
  busyPromptBehaviorMenuOpen = !!open;
  elements.busyPromptBehaviorTag?.setAttribute("aria-expanded", busyPromptBehaviorMenuOpen ? "true" : "false");
  elements.busyPromptBehaviorTag?.classList.toggle("menu-open", busyPromptBehaviorMenuOpen);
  if (elements.busyPromptBehaviorMenu) elements.busyPromptBehaviorMenu.hidden = !busyPromptBehaviorMenuOpen;
  if (!busyPromptBehaviorMenuOpen) return;
  renderBusyPromptBehaviorMenu();
  if (focusCurrent) {
    requestAnimationFrame(() => {
      const current = busyPromptBehaviorMenuItems().find((item) => item.getAttribute("aria-checked") === "true") || busyPromptBehaviorMenuItems()[0];
      current?.focus({ preventScroll: true });
    });
  }
}

function focusBusyPromptBehaviorMenuItem(direction = 1) {
  const items = busyPromptBehaviorMenuItems();
  if (!items.length) return;
  const currentIndex = Math.max(0, items.indexOf(document.activeElement));
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items[nextIndex].focus({ preventScroll: true });
}

function chooseBusyPromptBehaviorFromMenu(value) {
  setBusyPromptBehavior(value);
  setBusyPromptBehaviorMenuOpen(false);
  focusPromptInput({ defer: true });
}

function setBusyPromptBehavior(value, { persist = true } = {}) {
  const next = normalizeBusyPromptBehavior(value);
  busyPromptBehavior = next;
  webuiSettings = { ...webuiSettings, busyPromptBehavior: next };
  if (persist) persistBusyPromptBehavior(next);
  renderBusyPromptBehaviorTag();
}

function restoreBusyPromptBehaviorSetting() {
  setBusyPromptBehavior(readStoredBusyPromptBehavior(), { persist: false });
}

function clampAutocompleteMaxVisible(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 12;
  return Math.max(3, Math.min(20, Math.floor(number)));
}

function applyNativeSettingsForBrowser(settings = {}, { syncThinkingVisibility = false } = {}) {
  if (!settings || typeof settings !== "object") return;
  webuiSettings = { ...webuiSettings, ...settings, warnings: { ...(webuiSettings.warnings || {}), ...(settings.warnings || {}) } };
  if (settings.autocompleteMaxVisible !== undefined) autocompleteMaxVisible = clampAutocompleteMaxVisible(settings.autocompleteMaxVisible);
  if (SETTINGS_DOUBLE_ESCAPE_OPTIONS.some((option) => option.value === settings.doubleEscapeAction)) doubleEscapeAction = settings.doubleEscapeAction;
  if (SETTINGS_TREE_FILTER_OPTIONS.includes(settings.treeFilterMode)) treeFilterMode = settings.treeFilterMode;
  if (BUSY_PROMPT_BEHAVIOR_VALUES.has(settings.busyPromptBehavior)) setBusyPromptBehavior(settings.busyPromptBehavior);
  if (syncThinkingVisibility && typeof settings.hideThinkingBlock === "boolean") setThinkingOutputVisible(!settings.hideThinkingBlock);
}

async function refreshNativeSettings(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/settings", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  applyNativeSettingsForBrowser(response.data?.settings || {});
}

function setComposerActionsOpen(open) {
  const shouldOpen = open && isMobileView();
  document.body.classList.toggle("composer-actions-open", shouldOpen);
  elements.composerActionsButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (!shouldOpen) {
    setPublishMenuOpen(false);
    setNativeCommandMenuOpen(false);
    setAppRunnerMenuOpen(false);
    setOptionsMenuOpen(false);
    setBusyPromptBehaviorMenuOpen(false);
  }
}

function isUserBashActive(tabId = activeTabId) {
  return !!tabId && userBashByTab.has(tabId);
}

function userBashQueueForTab(tabId) {
  if (!tabId) return [];
  let queue = userBashQueuesByTab.get(tabId);
  if (!queue) {
    queue = [];
    userBashQueuesByTab.set(tabId, queue);
  }
  return queue;
}

function queuedUserBashCount(tabId = activeTabId) {
  return tabId ? userBashQueueForTab(tabId).length : 0;
}

function isUserBashRunningOrQueued(tabId = activeTabId) {
  return isUserBashActive(tabId) || queuedUserBashCount(tabId) > 0;
}

function isRunActive() {
  return !!currentState?.isStreaming || isUserBashRunningOrQueued() || (runIndicatorLocallyActive && !currentState?.isCompacting);
}

function isAbortAvailable() {
  return runIndicatorIsActive() || isUserBashActive();
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
  const abortAvailable = isAbortAvailable();
  const target = runActive ? elements.composerRow : elements.composerActionsPanel;
  const before = runActive ? elements.abortButton : null;
  for (const button of [elements.steerButton, elements.followUpButton]) {
    if (button.parentElement !== target) target.insertBefore(button, before);
    button.hidden = !runActive;
    button.disabled = !runActive;
  }
  elements.abortButton.hidden = !abortAvailable;
  elements.abortButton.disabled = !abortAvailable || abortRequestInFlight;
  elements.abortButton.textContent = abortRequestInFlight ? "Aborting…" : "Abort";
  elements.abortButton.title = abortAvailable ? "Abort the active Pi run (Esc or hold)" : "Abort is available while Pi is running";
  elements.abortButton.setAttribute("aria-label", elements.abortButton.title);
  renderBusyPromptBehaviorTag();
  document.body.classList.toggle("pi-run-active", runActive || abortAvailable);
}

function isFooterPickerOpen() {
  return footerModelPickerOpen || footerThinkingPickerOpen;
}

function footerActivePickerTarget() {
  if (footerThinkingPickerOpen) return elements.statusBar.querySelector(".footer-thinking.footer-meta-action");
  if (footerModelPickerOpen) return elements.statusBar.querySelector(".footer-model.footer-meta-action, .footer-tui-model");
  return null;
}

function clearFooterPickerPosition() {
  document.documentElement.style.removeProperty("--footer-model-picker-bottom");
  document.documentElement.style.removeProperty("--footer-model-picker-left");
  document.documentElement.style.removeProperty("--footer-model-picker-right");
}

function updateFooterModelPickerPosition() {
  if (!isFooterPickerOpen()) {
    clearFooterPickerPosition();
    return;
  }
  if (isMobileView()) {
    document.documentElement.style.removeProperty("--footer-model-picker-left");
    document.documentElement.style.removeProperty("--footer-model-picker-right");
    const viewportHeight = window.innerHeight || window.visualViewport?.height || document.documentElement.clientHeight;
    const statusTop = elements.statusBar.getBoundingClientRect().top;
    const bottom = Math.max(8, Math.round(viewportHeight - statusTop + 6));
    document.documentElement.style.setProperty("--footer-model-picker-bottom", `${bottom}px`);
    return;
  }
  document.documentElement.style.removeProperty("--footer-model-picker-bottom");
  const picker = elements.statusBar.querySelector(".footer-model-picker");
  const target = footerActivePickerTarget();
  if (!picker || !target) {
    document.documentElement.style.removeProperty("--footer-model-picker-left");
    document.documentElement.style.removeProperty("--footer-model-picker-right");
    return;
  }
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const statusRect = elements.statusBar.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const pickerWidth = picker.offsetWidth || Math.min(544, viewportWidth - 16);
  const minLeft = 8 - statusRect.left;
  const maxLeft = Math.max(minLeft, viewportWidth - pickerWidth - 8 - statusRect.left);
  const targetCenterLeft = targetRect.left - statusRect.left + (targetRect.width / 2) - (pickerWidth / 2);
  const left = Math.min(maxLeft, Math.max(minLeft, targetCenterLeft));
  document.documentElement.style.setProperty("--footer-model-picker-left", `${Math.round(left)}px`);
  document.documentElement.style.setProperty("--footer-model-picker-right", "auto");
}

function setMobileFooterExpanded(expanded) {
  mobileFooterExpanded = expanded && isMobileView();
  if (mobileFooterExpanded && isFooterPickerOpen()) {
    footerModelPickerOpen = false;
    footerThinkingPickerOpen = false;
    document.body.classList.remove("footer-model-picker-open");
    elements.statusBar.querySelectorAll(".footer-model-picker").forEach((node) => node.remove());
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
  const showBackdrop = !collapsed && isSidePanelOverlayView();
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

  if (!collapsed && focusPanel && isSidePanelOverlayView()) {
    requestAnimationFrame(() => elements.toggleSidePanelButton.focus());
  }

  if (!persist || isSidePanelOverlayView()) return;
  try {
    localStorage.setItem(SIDE_PANEL_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures; the toggle should still work for this page load.
  }
}

function restoreSidePanelState() {
  if (isSidePanelOverlayView()) {
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
    if (event.matches || isSidePanelOverlayView()) {
      setSidePanelCollapsed(true, { persist: false });
      return;
    }
    const stored = readStoredSidePanelCollapsed();
    setSidePanelCollapsed(stored ?? false, { persist: false });
  };
  if (typeof mobileViewMedia.addEventListener === "function") mobileViewMedia.addEventListener("change", syncForViewport);
  else mobileViewMedia.addListener?.(syncForViewport);
}

function bindSidePanelOverlayViewChanges() {
  if (!sidePanelOverlayMedia || sidePanelOverlayMedia === mobileViewMedia) return;
  const syncForViewport = (event) => {
    if (event.matches) {
      setSidePanelCollapsed(true, { persist: false });
      return;
    }
    const stored = readStoredSidePanelCollapsed();
    setSidePanelCollapsed(stored ?? false, { persist: false });
  };
  if (typeof sidePanelOverlayMedia.addEventListener === "function") sidePanelOverlayMedia.addEventListener("change", syncForViewport);
  else sidePanelOverlayMedia.addListener?.(syncForViewport);
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

function readStoredServerStartCwd() {
  try {
    return localStorage.getItem(SERVER_START_CWD_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function rememberServerStartCwd(cwd) {
  const value = typeof cwd === "string" ? cwd.trim() : "";
  if (!value) return;
  try {
    localStorage.setItem(SERVER_START_CWD_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures; the offline start helper can still show a generic command.
  }
  if (backendOffline) renderServerOfflinePanel();
}

function quoteCommandArg(value) {
  const text = String(value || ".");
  if (!/[\s"'`$]/.test(text)) return text;
  if (!text.includes("'")) return `'${text}'`;
  return `"${text.replace(/(["`$])/g, "\\$1")}"`;
}

function currentPortArg() {
  const port = window.location.port || "";
  return port && port !== DEFAULT_WEBUI_PORT ? ` --port ${port}` : "";
}

function serverStartCommandText() {
  return `pi-webui${currentPortArg()}`;
}

function serverStartSlashCommandText() {
  return `/webui-start${currentPortArg()}`;
}

function renderServerOfflinePanel() {
  if (elements.serverOfflineCommand) elements.serverOfflineCommand.textContent = serverStartCommandText();
  if (elements.serverOfflineSlashCommand) elements.serverOfflineSlashCommand.textContent = serverStartSlashCommandText();
}

function setServerRestartOverlay(active, message = "Waiting for the server to come back…") {
  serverRestartInProgress = !!active;
  document.body.classList.toggle("server-restarting", serverRestartInProgress);
  if (elements.serverRestartPanel) elements.serverRestartPanel.hidden = !serverRestartInProgress;
  if (elements.serverRestartMessage) elements.serverRestartMessage.textContent = message;
  if (serverRestartInProgress && elements.serverOfflinePanel) elements.serverOfflinePanel.hidden = true;
}

function setBackendOffline(offline, error) {
  backendOffline = !!offline;
  const showOfflinePanel = backendOffline && !serverRestartInProgress;
  document.body.classList.toggle("server-offline", showOfflinePanel);
  if (elements.serverOfflinePanel) elements.serverOfflinePanel.hidden = !showOfflinePanel;
  renderServerOfflinePanel();
  if (backendOffline) {
    if (!serverRestartInProgress && !backendOfflineNoticeShown) {
      backendOfflineNoticeShown = true;
      addEvent(`Pi Web UI server is offline${error?.message ? `: ${error.message}` : ""}`, "warn");
    }
    return;
  }
  if (backendOfflineNoticeShown) addEvent("Pi Web UI server is back online", "info");
  backendOfflineNoticeShown = false;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

function messageCopyFallbackText(body) {
  return String(body?.innerText || body?.textContent || "").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function messageCopyText(message, body = null) {
  if (!message) return messageCopyFallbackText(body);
  if (message.role === "assistant") {
    const content = message.content === undefined || message.content === null ? "" : textFromContent(message.content);
    const text = stripTodoProgressLines(content).trimEnd();
    return text || messageCopyFallbackText(body);
  }
  if (message.role === "bashExecution") return stripAnsi([`$ ${message.command || ""}`, message.output || ""].filter(Boolean).join("\n\n")).trimEnd();
  if (message.role === "compactionSummary") return String(message.summary || "Context was compacted.").trimEnd();
  if (message.role === "toolResult") {
    const content = message.content === undefined || message.content === null ? "" : textFromContent(message.content);
    return stripAnsi(content).trimEnd() || messageCopyFallbackText(body);
  }
  if (message.role === "toolExecution") {
    const tool = normalizeToolExecution(message);
    const hasArgs = tool.args && Object.keys(tool.args).length > 0;
    const sections = [`tool: ${tool.name}`];
    if (hasArgs) sections.push(`arguments:\n${JSON.stringify(tool.args, null, 2)}`);
    if (tool.text) sections.push(`${tool.isPartial ? "live output" : "output"}:\n${tool.text}`);
    if (tool.details?.fullOutputPath) sections.push(`full output: ${tool.details.fullOutputPath}`);
    return sections.join("\n\n").trimEnd() || messageCopyFallbackText(body);
  }
  if (message.role === "thinking") return visibleThinkingText(message.thinking || textFromContent(message.content)).trimEnd() || messageCopyFallbackText(body);
  if (message.role === "toolCall") return JSON.stringify(message.arguments ?? message.content ?? {}, null, 2);
  if (message.role === "assistantEvent") {
    return (typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? {}, null, 2)).trimEnd();
  }
  const content = message.content === undefined || message.content === null ? "" : textFromContent(message.content);
  return stripAnsi(content).trimEnd() || messageCopyFallbackText(body);
}

function setMessageCopyButtonState(button, copied) {
  clearTimeout(button._messageCopyResetTimer);
  button.classList.toggle("copied", copied);
  const icon = button.querySelector(".message-copy-icon");
  if (icon) icon.textContent = copied ? "✓" : "⧉";
  button.title = copied ? "Copied" : "Copy message";
  button.setAttribute("aria-label", button.title);
  if (copied) {
    button._messageCopyResetTimer = setTimeout(() => setMessageCopyButtonState(button, false), 1400);
  }
}

async function copyMessageBubble(button) {
  const bubble = button.closest(".message");
  const body = bubble?._copyBody || bubble?.querySelector(":scope > .message-body, :scope > .message-collapse > .message-body");
  const text = messageCopyText(bubble?._copyMessage, body);
  if (!text.trim()) {
    addEvent("message has no text to copy", "warn");
    return;
  }
  button.disabled = true;
  try {
    await copyText(text);
    setMessageCopyButtonState(button, true);
  } catch (error) {
    addEvent(`message copy failed: ${error.message || String(error)}`, "warn");
  } finally {
    button.disabled = false;
  }
}

function attachMessageCopyButton(bubble, message, body) {
  if (!bubble || !body) return null;
  bubble._copyMessage = message;
  bubble._copyBody = body;
  const existing = bubble.querySelector(":scope > .message-copy-button");
  if (existing) return existing;
  const button = make("button", "message-copy-button");
  button.type = "button";
  button.append(make("span", "message-copy-icon", "⧉"));
  setMessageCopyButtonState(button, false);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyMessageBubble(button);
  });
  bubble.classList.add("has-copy-action");
  bubble.append(button);
  return button;
}

function triggerNativeDownload(download) {
  const url = String(download?.url || "").trim();
  if (!url) return false;
  const anchor = document.createElement("a");
  anchor.href = new URL(url, window.location.href).href;
  anchor.download = String(download.fileName || "");
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

async function copyServerStartCommand() {
  const command = serverStartCommandText();
  try {
    await copyText(command);
    addEvent("copied Pi Web UI start command", "info");
  } catch (error) {
    addEvent(`copy failed; manually run: ${command}`, "warn");
  }
}

async function retryServerConnection() {
  const button = elements.retryServerConnectionButton;
  if (button) {
    button.disabled = true;
    button.textContent = "Retrying…";
  }
  try {
    await api("/api/health", { scoped: false });
  } catch (error) {
    setBackendOffline(true, error);
    addEvent("Pi Web UI server is still offline", "warn");
    return;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Retry connection";
    }
  }

  try {
    await initializeTabs();
  } catch (error) {
    addEvent(error.message || String(error), "error");
  }
}

function scopedApiPath(path, tabId = activeTabId) {
  if (!tabId || !path.startsWith("/api/") || path === "/api/tabs" || path.startsWith("/api/tabs?") || path.startsWith("/api/tabs/")) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("tab", tabId);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function api(path, { method = "GET", body, tabId = activeTabId, scoped = true, signal } = {}) {
  let response;
  try {
    response = await fetch(scoped ? scopedApiPath(path, tabId) : path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    const offlineError = error instanceof Error ? error : new Error(String(error));
    offlineError.backendOffline = true;
    setBackendOffline(true, offlineError);
    throw offlineError;
  }
  setBackendOffline(false);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || JSON.stringify(data));
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function formatWebuiVersion(version) {
  const text = String(version || "").trim();
  if (!text) return "";
  return text.startsWith("v") ? text : `v${text}`;
}

function isWebuiDevMetadata(data) {
  return data?.webuiDev === true || String(data?.webuiMode || "").toLowerCase() === "dev";
}

function renderWebuiVersion() {
  const badge = elements.webuiVersionBadge;
  if (!badge) return;
  const label = formatWebuiVersion(webuiVersion);
  badge.hidden = !label;
  badge.textContent = label;
  if (label) badge.title = `Pi Web UI ${label}`;
}

function renderWebuiDevBadge() {
  const badge = elements.webuiDevBadge;
  if (!badge) return;
  badge.hidden = !webuiDevServer;
  badge.title = "Pi Web UI dev server";
}

function setWebuiVersion(version) {
  const text = String(version || "").trim();
  if (text === webuiVersion) return;
  webuiVersion = text;
  renderWebuiVersion();
}

function setWebuiDevServer(dev) {
  const next = !!dev;
  if (next === webuiDevServer) return;
  webuiDevServer = next;
  renderWebuiDevBadge();
}

async function refreshWebuiVersion() {
  const health = await api("/api/health", { scoped: false });
  setWebuiVersion(health.webuiVersion);
  setWebuiDevServer(isWebuiDevMetadata(health));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let scaled = value / 1024;
  for (const unit of units) {
    if (scaled < 1024 || unit === units[units.length - 1]) return `${scaled.toFixed(scaled >= 10 ? 1 : 2)} ${unit}`;
    scaled /= 1024;
  }
  return `${value} B`;
}

function inferMimeTypeFromName(name = "") {
  const ext = String(name).split(".").pop()?.toLowerCase() || "";
  const map = {
    md: "text/markdown",
    markdown: "text/markdown",
    txt: "text/plain",
    log: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
    toml: "application/toml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
  };
  return map[ext] || "application/octet-stream";
}

function attachmentKind(mimeType = "", name = "") {
  const type = String(mimeType || inferMimeTypeFromName(name));
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("text/") || /(?:json|xml|pdf|word|excel|powerpoint|document|spreadsheet|presentation|markdown|csv)/i.test(type)) return "doc";
  return "file";
}

function attachmentIcon(kind) {
  return kind === "image" ? "🖼️" : kind === "video" ? "🎞️" : kind === "audio" ? "🎵" : kind === "doc" ? "📄" : "📎";
}

function normalizeTextAttachmentContent(text) {
  return String(text || "").replace(/\r\n?/g, "\n");
}

function textLineCount(text) {
  const normalized = normalizeTextAttachmentContent(text);
  return normalized ? normalized.split("\n").length : 0;
}

function shouldAttachTextInsteadOfComposerInput(text) {
  const normalized = normalizeTextAttachmentContent(text);
  return normalized.trim().length > 0 && textLineCount(normalized) > LONG_INPUT_ATTACHMENT_LINE_THRESHOLD;
}

function longInputAttachmentFileName() {
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
  return `webui-input-${stamp}.txt`;
}

function makeTextAttachmentFile(text, name = longInputAttachmentFileName(), mimeType = LONG_INPUT_ATTACHMENT_MIME_TYPE) {
  const normalized = normalizeTextAttachmentContent(text);
  const fileName = String(name || longInputAttachmentFileName());
  const type = String(mimeType || LONG_INPUT_ATTACHMENT_MIME_TYPE);
  if (typeof File === "function") return new File([normalized], fileName, { type });
  const blob = new Blob([normalized], { type });
  try {
    blob.name = fileName;
    blob.lastModified = Date.now();
  } catch {
    // Older browsers may expose non-extensible Blob instances; the attachment record still carries the name.
  }
  return blob;
}

function isEditableTextAttachment(attachment) {
  const name = String(attachment?.name || "");
  const mimeType = String(attachment?.mimeType || attachment?.file?.type || inferMimeTypeFromName(name)).split(";", 1)[0].trim().toLowerCase();
  return mimeType.startsWith("text/") || /(?:json|xml|yaml|toml|markdown|csv)/i.test(mimeType) || /\.(?:txt|md|markdown|csv|json|xml|ya?ml|toml|ini|log)$/i.test(name);
}

function attachmentsForTab(tabId = activeTabId) {
  return tabId ? tabAttachments.get(tabId) || [] : [];
}

function ensureAttachmentsForTab(tabId = activeTabId) {
  if (!tabId) return [];
  if (!tabAttachments.has(tabId)) tabAttachments.set(tabId, []);
  return tabAttachments.get(tabId);
}

function hasComposerPayload() {
  return !!elements.promptInput.value.trim() || attachmentsForTab().length > 0;
}

function renderAttachmentTray() {
  const tray = elements.attachmentTray;
  if (!tray) return;
  const attachments = attachmentsForTab();
  tray.innerHTML = "";
  tray.hidden = attachments.length === 0;
  if (attachments.length === 0) return;

  for (const attachment of attachments) {
    const pill = make("span", "attachment-pill");
    pill.title = `${attachment.name}\n${attachment.mimeType}\n${formatBytes(attachment.size)}`;
    const icon = make("span", "attachment-pill-icon", attachmentIcon(attachment.kind));
    const name = make("span", "attachment-pill-name", attachment.name);
    const meta = make("span", "attachment-pill-meta", `${attachment.kind} · ${formatBytes(attachment.size)}`);
    const edit = isEditableTextAttachment(attachment) ? make("button", "attachment-edit-button", "Edit") : null;
    if (edit) {
      edit.type = "button";
      edit.setAttribute("aria-label", `Open and edit ${attachment.name}`);
      edit.addEventListener("click", () => openTextAttachmentEditor(attachment.id));
    }
    const remove = make("button", "attachment-remove-button", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${attachment.name}`);
    remove.addEventListener("click", () => removeAttachment(attachment.id));
    pill.append(icon, name, meta);
    if (edit) pill.append(edit);
    pill.append(remove);
    tray.append(pill);
  }
}

function removeAttachment(id, tabId = activeTabId) {
  const attachments = attachmentsForTab(tabId);
  const index = attachments.findIndex((attachment) => attachment.id === id);
  if (index === -1) return;
  const [removed] = attachments.splice(index, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
  if (activeTextAttachmentEditor?.tabId === tabId && activeTextAttachmentEditor?.attachmentId === id) closeTextAttachmentEditor();
  if (attachments.length === 0) tabAttachments.delete(tabId);
  if (tabId === activeTabId) renderAttachmentTray();
}

function clearAttachments(tabId = activeTabId) {
  const attachments = attachmentsForTab(tabId);
  for (const attachment of attachments) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  }
  if (activeTextAttachmentEditor?.tabId === tabId) closeTextAttachmentEditor();
  if (tabId) tabAttachments.delete(tabId);
  if (tabId === activeTabId) renderAttachmentTray();
}

function addAttachmentFiles(fileList, source = "picker") {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return { added: 0, skipped: [] };
  const attachments = ensureAttachmentsForTab();
  if (!attachments.length && !activeTabId) return { added: 0, skipped: ["no active tab"] };
  let totalBytes = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
  let added = 0;
  const skipped = [];

  for (const file of files) {
    const name = file.name || `${source}-attachment`;
    if (attachments.length >= ATTACHMENT_MAX_FILES) {
      skipped.push(`${name}: attachment limit is ${ATTACHMENT_MAX_FILES}`);
      continue;
    }
    if (file.size > ATTACHMENT_MAX_FILE_BYTES) {
      skipped.push(`${name}: larger than ${formatBytes(ATTACHMENT_MAX_FILE_BYTES)}`);
      continue;
    }
    if (totalBytes + file.size > ATTACHMENT_MAX_TOTAL_BYTES) {
      skipped.push(`${name}: total attachment limit is ${formatBytes(ATTACHMENT_MAX_TOTAL_BYTES)}`);
      continue;
    }
    const mimeType = file.type || inferMimeTypeFromName(name);
    const kind = attachmentKind(mimeType, name);
    attachments.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name,
      mimeType,
      size: file.size || 0,
      source,
      kind,
      previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
    });
    totalBytes += file.size || 0;
    added++;
  }

  renderAttachmentTray();
  if (added) addEvent(`attached ${added} ${added === 1 ? "file" : "files"} from ${source}`, "info");
  if (skipped.length) addEvent(`skipped attachments: ${skipped.join("; ")}`, "warn");
  return { added, skipped };
}

function attachLongTextAsFile(text, source = "input text") {
  if (!shouldAttachTextInsteadOfComposerInput(text)) return false;
  const normalized = normalizeTextAttachmentContent(text);
  const lineCount = textLineCount(normalized);
  const result = addAttachmentFiles([makeTextAttachmentFile(normalized)], `${lineCount}-line ${source}`);
  return result.added > 0;
}

function moveLongPromptInputToAttachment() {
  const text = elements.promptInput.value || "";
  if (!attachLongTextAsFile(text, "input text")) return false;
  elements.promptInput.value = "";
  resizePromptInput();
  hideCommandSuggestions();
  return true;
}

function attachmentById(tabId, id) {
  return attachmentsForTab(tabId).find((attachment) => attachment.id === id) || null;
}

function closeTextAttachmentEditor() {
  if (elements.attachmentTextDialog?.open) elements.attachmentTextDialog.close();
  else activeTextAttachmentEditor = null;
}

function setAttachmentTextStatus(message = "", level = "muted") {
  if (!elements.attachmentTextStatus) return;
  elements.attachmentTextStatus.textContent = message;
  elements.attachmentTextStatus.className = `attachment-text-status ${level || "muted"}`;
}

function renderTextAttachmentEditorMeta() {
  if (!activeTextAttachmentEditor || !elements.attachmentTextMeta) return;
  const attachment = attachmentById(activeTextAttachmentEditor.tabId, activeTextAttachmentEditor.attachmentId);
  if (!attachment) {
    elements.attachmentTextMeta.textContent = "Attachment no longer exists.";
    return;
  }
  const text = elements.attachmentTextEditor?.value || "";
  const lineCount = textLineCount(text);
  elements.attachmentTextMeta.textContent = `${attachment.name} · ${attachment.mimeType} · ${formatBytes(attachment.size)} · ${lineCount} ${lineCount === 1 ? "line" : "lines"}`;
}

function readFileAsText(file) {
  if (typeof file?.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read text attachment"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

async function openTextAttachmentEditor(attachmentId, tabId = activeTabId) {
  const attachment = attachmentById(tabId, attachmentId);
  if (!attachment) return;
  if (!isEditableTextAttachment(attachment)) {
    addEvent(`${attachment.name || "attachment"} is not editable text`, "warn");
    return;
  }

  activeTextAttachmentEditor = { tabId, attachmentId };
  if (elements.attachmentTextTitle) elements.attachmentTextTitle.textContent = `Edit ${attachment.name || "text attachment"}`;
  if (elements.attachmentTextEditor) elements.attachmentTextEditor.value = "";
  if (elements.attachmentTextSaveButton) elements.attachmentTextSaveButton.disabled = true;
  renderTextAttachmentEditorMeta();
  setAttachmentTextStatus("Loading text attachment…", "muted");
  if (elements.attachmentTextDialog && !elements.attachmentTextDialog.open) elements.attachmentTextDialog.showModal();

  try {
    const text = await readFileAsText(attachment.file);
    if (activeTextAttachmentEditor?.tabId !== tabId || activeTextAttachmentEditor?.attachmentId !== attachmentId) return;
    if (elements.attachmentTextEditor) elements.attachmentTextEditor.value = normalizeTextAttachmentContent(text);
    if (elements.attachmentTextSaveButton) elements.attachmentTextSaveButton.disabled = false;
    renderTextAttachmentEditorMeta();
    setAttachmentTextStatus("Edit the text, then save it back to the attachment.", "muted");
    queueMicrotask(() => elements.attachmentTextEditor?.focus());
  } catch (error) {
    if (elements.attachmentTextSaveButton) elements.attachmentTextSaveButton.disabled = true;
    setAttachmentTextStatus(`Failed to open text attachment: ${error.message || String(error)}`, "error");
  }
}

function totalAttachmentBytesWithReplacement(tabId, attachmentId, nextSize) {
  return attachmentsForTab(tabId).reduce((sum, attachment) => sum + (attachment.id === attachmentId ? nextSize : attachment.size || 0), 0);
}

function saveTextAttachmentEdit() {
  if (!activeTextAttachmentEditor) return;
  const { tabId, attachmentId } = activeTextAttachmentEditor;
  const attachment = attachmentById(tabId, attachmentId);
  if (!attachment) {
    setAttachmentTextStatus("Attachment no longer exists.", "error");
    return;
  }

  const text = elements.attachmentTextEditor?.value || "";
  const name = attachment.name || longInputAttachmentFileName();
  const mimeType = attachment.mimeType || inferMimeTypeFromName(name) || LONG_INPUT_ATTACHMENT_MIME_TYPE;
  const nextFile = makeTextAttachmentFile(text, name, mimeType);
  if (nextFile.size > ATTACHMENT_MAX_FILE_BYTES) {
    setAttachmentTextStatus(`Edited file is larger than ${formatBytes(ATTACHMENT_MAX_FILE_BYTES)}.`, "error");
    return;
  }
  if (totalAttachmentBytesWithReplacement(tabId, attachmentId, nextFile.size) > ATTACHMENT_MAX_TOTAL_BYTES) {
    setAttachmentTextStatus(`Edited attachments exceed ${formatBytes(ATTACHMENT_MAX_TOTAL_BYTES)} total.`, "error");
    return;
  }

  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  attachment.file = nextFile;
  attachment.name = name;
  attachment.mimeType = nextFile.type || mimeType;
  attachment.size = nextFile.size || 0;
  attachment.kind = attachmentKind(attachment.mimeType, attachment.name);
  attachment.previewUrl = undefined;
  if (tabId === activeTabId) renderAttachmentTray();
  addEvent(`updated text attachment ${attachment.name} (${formatBytes(attachment.size)})`, "info");
  closeTextAttachmentEditor();
}

function clipboardFiles(dataTransfer) {
  const files = [];
  const seen = new Set();
  for (const file of Array.from(dataTransfer?.files || [])) {
    const key = `${file.name}:${file.size}:${file.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      files.push(file);
    }
  }
  for (const item of Array.from(dataTransfer?.items || [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile?.();
    if (!file) continue;
    const key = `${file.name}:${file.size}:${file.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      files.push(file);
    }
  }
  return files;
}

function handleAttachmentPaste(event) {
  const files = clipboardFiles(event.clipboardData);
  if (files.length) {
    event.preventDefault();
    addAttachmentFiles(files, "clipboard");
    return;
  }

  const text = event.clipboardData?.getData("text/plain") || "";
  if (!attachLongTextAsFile(text, "clipboard text")) return;
  event.preventDefault();
}

function isFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function handleComposerDragOver(event) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  elements.composer.classList.add("drag-over");
}

function handleComposerDragLeave(event) {
  if (!elements.composer.contains(event.relatedTarget)) elements.composer.classList.remove("drag-over");
}

function handleComposerDrop(event) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  elements.composer.classList.remove("drag-over");
  addAttachmentFiles(event.dataTransfer?.files, "drop");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read attachment"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read background image"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function sanitizeBackgroundName(name) {
  const safe = String(name || "custom background").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return safe || "custom background";
}

function backgroundMimeType(file) {
  const declared = String(file?.type || "").split(";", 1)[0].trim().toLowerCase();
  if (BACKGROUND_IMAGE_MIME_TYPES.has(declared)) return declared;
  const ext = String(file?.name || "").split(".").pop()?.toLowerCase() || "";
  const byExt = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
  return byExt[ext] || declared || "application/octet-stream";
}

function normalizeCustomBackgroundRecord(value) {
  if (!value || typeof value !== "object") return null;
  const dataUrl = String(value.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,[A-Za-z0-9+/]+={0,2}$/i);
  if (!match) return null;
  return {
    name: sanitizeBackgroundName(value.name),
    mimeType: match[1].toLowerCase(),
    size: Math.max(0, Number(value.size) || 0),
    dataUrl,
    updatedAt: Number(value.updatedAt) || Date.now(),
  };
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) throw new Error("Invalid background data URL");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1].toLowerCase() });
}

function revokeCustomBackgroundObjectUrl() {
  if (!customBackgroundObjectUrl) return;
  URL.revokeObjectURL(customBackgroundObjectUrl);
  customBackgroundObjectUrl = null;
}

function setCustomBackgroundRecord(background, { objectUrl = null } = {}) {
  const record = normalizeCustomBackgroundRecord(background);
  revokeCustomBackgroundObjectUrl();
  customBackground = record;
  if (!record) return null;
  if (objectUrl) customBackgroundObjectUrl = objectUrl;
  else {
    try {
      customBackgroundObjectUrl = URL.createObjectURL(dataUrlToBlob(record.dataUrl));
    } catch {
      customBackgroundObjectUrl = null;
    }
  }
  return record;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function idbTransactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

function openCustomBackgroundDb() {
  return new Promise((resolve, reject) => {
    const indexedDb = window.indexedDB;
    if (!indexedDb) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDb.open(CUSTOM_BACKGROUND_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CUSTOM_BACKGROUND_IDB_STORE)) db.createObjectStore(CUSTOM_BACKGROUND_IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open background storage"));
  });
}

function customBackgroundThemeKey(themeName = currentThemeName) {
  return String(themeName || DEFAULT_THEME_NAME).trim() || DEFAULT_THEME_NAME;
}

async function readCustomBackgroundFromIndexedDb(themeName = currentThemeName) {
  const db = await openCustomBackgroundDb();
  try {
    return await idbRequest(db.transaction(CUSTOM_BACKGROUND_IDB_STORE, "readonly").objectStore(CUSTOM_BACKGROUND_IDB_STORE).get(customBackgroundThemeKey(themeName)));
  } finally {
    db.close();
  }
}

async function readLegacyCustomBackgroundFromIndexedDb() {
  const db = await openCustomBackgroundDb();
  try {
    return await idbRequest(db.transaction(CUSTOM_BACKGROUND_IDB_STORE, "readonly").objectStore(CUSTOM_BACKGROUND_IDB_STORE).get(CUSTOM_BACKGROUND_LEGACY_ID));
  } finally {
    db.close();
  }
}

async function writeCustomBackgroundToIndexedDb(background, themeName = currentThemeName) {
  const db = await openCustomBackgroundDb();
  try {
    const transaction = db.transaction(CUSTOM_BACKGROUND_IDB_STORE, "readwrite");
    transaction.objectStore(CUSTOM_BACKGROUND_IDB_STORE).put(background, customBackgroundThemeKey(themeName));
    await idbTransactionDone(transaction);
  } finally {
    db.close();
  }
}

async function deleteCustomBackgroundFromIndexedDb(themeName = currentThemeName) {
  const db = await openCustomBackgroundDb();
  try {
    const transaction = db.transaction(CUSTOM_BACKGROUND_IDB_STORE, "readwrite");
    transaction.objectStore(CUSTOM_BACKGROUND_IDB_STORE).delete(customBackgroundThemeKey(themeName));
    await idbTransactionDone(transaction);
  } finally {
    db.close();
  }
}

async function deleteLegacyCustomBackgroundFromIndexedDb() {
  const db = await openCustomBackgroundDb();
  try {
    const transaction = db.transaction(CUSTOM_BACKGROUND_IDB_STORE, "readwrite");
    transaction.objectStore(CUSTOM_BACKGROUND_IDB_STORE).delete(CUSTOM_BACKGROUND_LEGACY_ID);
    await idbTransactionDone(transaction);
  } finally {
    db.close();
  }
}

function readCustomBackgroundFromLocalStorage(themeName = currentThemeName, { includeLegacy = false } = {}) {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_BACKGROUNDS_STORAGE_KEY) || "{}");
    const record = parsed && typeof parsed === "object" ? normalizeCustomBackgroundRecord(parsed[customBackgroundThemeKey(themeName)]) : null;
    if (record) return record;
  } catch {
    // Fall through to legacy storage below.
  }
  if (!includeLegacy) return null;
  try {
    return normalizeCustomBackgroundRecord(JSON.parse(localStorage.getItem(CUSTOM_BACKGROUND_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

function writeCustomBackgroundToLocalStorage(background, themeName = currentThemeName) {
  const record = normalizeCustomBackgroundRecord(background);
  if (!record) throw new Error("Invalid background image data");
  const key = customBackgroundThemeKey(themeName);
  const parsed = JSON.parse(localStorage.getItem(CUSTOM_BACKGROUNDS_STORAGE_KEY) || "{}");
  const backgrounds = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  backgrounds[key] = record;
  localStorage.setItem(CUSTOM_BACKGROUNDS_STORAGE_KEY, JSON.stringify(backgrounds));
}

function removeCustomBackgroundFromLocalStorage(themeName = currentThemeName, { includeLegacy = false } = {}) {
  const key = customBackgroundThemeKey(themeName);
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_BACKGROUNDS_STORAGE_KEY) || "{}");
    const backgrounds = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    delete backgrounds[key];
    localStorage.setItem(CUSTOM_BACKGROUNDS_STORAGE_KEY, JSON.stringify(backgrounds));
  } catch {
    // Ignore fallback cleanup failures.
  }
  if (includeLegacy) {
    try {
      localStorage.removeItem(CUSTOM_BACKGROUND_STORAGE_KEY);
    } catch {
      // Ignore legacy cleanup failures.
    }
  }
}

async function readStoredCustomBackground(themeName = currentThemeName, { includeLegacy = false } = {}) {
  try {
    const stored = normalizeCustomBackgroundRecord(await readCustomBackgroundFromIndexedDb(themeName));
    if (stored) return stored;
    if (includeLegacy) {
      const legacy = normalizeCustomBackgroundRecord(await readLegacyCustomBackgroundFromIndexedDb());
      if (legacy) return legacy;
    }
  } catch {
    // Fall back to localStorage for older browsers or private browsing modes.
  }
  return readCustomBackgroundFromLocalStorage(themeName, { includeLegacy });
}

async function persistCustomBackground(background, themeName = currentThemeName) {
  const record = normalizeCustomBackgroundRecord(background);
  if (!record) throw new Error("Invalid background image data");
  try {
    await writeCustomBackgroundToIndexedDb(record, themeName);
    removeCustomBackgroundFromLocalStorage(themeName);
    return;
  } catch {
    // Fall back to localStorage when IndexedDB is unavailable.
  }
  writeCustomBackgroundToLocalStorage(record, themeName);
}

async function clearStoredCustomBackground(themeName = currentThemeName, { includeLegacy = false } = {}) {
  await Promise.allSettled([
    deleteCustomBackgroundFromIndexedDb(themeName),
    includeLegacy ? deleteLegacyCustomBackgroundFromIndexedDb() : Promise.resolve(),
    Promise.resolve().then(() => removeCustomBackgroundFromLocalStorage(themeName, { includeLegacy })),
  ]);
}

function customBackgroundCssImage(background = customBackground) {
  if (!background?.dataUrl) return null;
  return `url("${customBackgroundObjectUrl || background.dataUrl}")`;
}

function renderBackgroundControl() {
  if (!elements.backgroundStatus) return;
  const active = !!customBackground?.dataUrl;
  const themeLabel = displayThemeName(currentThemeName) || currentThemeName || "theme";
  elements.backgroundStatus.textContent = customBackgroundLoading
    ? `Loading ${themeLabel} background…`
    : active
      ? `${themeLabel}: ${customBackground.name || "background"}`
      : `${themeLabel}: theme default`;
  if (elements.backgroundChooseButton) {
    elements.backgroundChooseButton.disabled = customBackgroundLoading;
    elements.backgroundChooseButton.textContent = active ? "Change background" : "Add background";
  }
  if (elements.backgroundInput) elements.backgroundInput.disabled = customBackgroundLoading;
  if (elements.backgroundClearButton) {
    elements.backgroundClearButton.hidden = !active;
    elements.backgroundClearButton.disabled = customBackgroundLoading;
  }
}

function applyCustomBackgroundOverride({ render = true } = {}) {
  const activeImage = customBackgroundCssImage();
  document.body.classList.toggle("custom-background-active", !!activeImage);
  if (activeImage) document.documentElement.style.setProperty("--theme-background-image", activeImage);
  if (render) renderBackgroundControl();
}

function reapplyCurrentThemeBackground() {
  const theme = availableThemes.find((item) => item.name === currentThemeName);
  if (theme && isOptionalFeatureEnabled("themeBundle")) applyTheme(theme, { persist: false });
  else {
    document.documentElement.style.setProperty("--theme-background-image", "none");
    applyCustomBackgroundOverride();
  }
}

async function loadCustomBackgroundForTheme(themeName = currentThemeName, { includeLegacy = false } = {}) {
  const themeKey = customBackgroundThemeKey(themeName);
  customBackgroundLoading = true;
  renderBackgroundControl();
  try {
    const background = await readStoredCustomBackground(themeKey, { includeLegacy });
    if (customBackgroundThemeKey(currentThemeName) !== themeKey) return;
    setCustomBackgroundRecord(background);
    if (background && includeLegacy) {
      persistCustomBackground(background, themeKey).catch(() => {});
    }
  } catch (error) {
    if (customBackgroundThemeKey(currentThemeName) === themeKey) {
      addEvent(`failed to load ${displayThemeName(themeKey) || themeKey} background: ${error.message || String(error)}`, "warn");
      setCustomBackgroundRecord(null);
    }
  } finally {
    if (customBackgroundThemeKey(currentThemeName) === themeKey) {
      customBackgroundLoading = false;
      applyCustomBackgroundOverride();
    }
  }
}

async function setCustomBackgroundFromFile(file) {
  if (!file) return;
  const mimeType = backgroundMimeType(file);
  if (!BACKGROUND_IMAGE_MIME_TYPES.has(mimeType)) {
    addEvent("background must be a PNG, JPEG, WebP, or GIF image", "error");
    return;
  }
  if ((file.size || 0) > CUSTOM_BACKGROUND_MAX_FILE_BYTES) {
    addEvent(`background image is larger than ${formatBytes(CUSTOM_BACKGROUND_MAX_FILE_BYTES)}`, "error");
    return;
  }

  const themeName = customBackgroundThemeKey(currentThemeName);
  customBackgroundLoading = true;
  renderBackgroundControl();
  try {
    const rawDataUrl = await readFileAsDataUrl(file);
    const dataUrl = rawDataUrl.replace(/^data:;base64,/i, `data:${mimeType};base64,`);
    const background = normalizeCustomBackgroundRecord({
      name: file.name,
      mimeType,
      size: file.size || 0,
      dataUrl,
      updatedAt: Date.now(),
    });
    if (!background) throw new Error("Unsupported or invalid background image data");
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      objectUrl = null;
    }
    const targetStillActive = customBackgroundThemeKey(currentThemeName) === themeName;
    if (targetStillActive) {
      setCustomBackgroundRecord(background, { objectUrl });
      applyCustomBackgroundOverride({ render: false });
    } else if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    try {
      await persistCustomBackground(background, themeName);
      addEvent(`custom background saved for ${displayThemeName(themeName) || themeName}: ${background.name}`);
    } catch (error) {
      addEvent(`background changed for this page, but persistent save failed: ${error.message || String(error)}`, "warn");
    }
  } catch (error) {
    addEvent(`failed to set background: ${error.message || String(error)}`, "error");
  } finally {
    if (customBackgroundThemeKey(currentThemeName) === themeName) {
      customBackgroundLoading = false;
      renderBackgroundControl();
    }
  }
}

async function clearCustomBackground() {
  const themeName = customBackgroundThemeKey(currentThemeName);
  const hadBackground = !!customBackground?.dataUrl;
  setCustomBackgroundRecord(null);
  customBackgroundLoading = true;
  renderBackgroundControl();
  await clearStoredCustomBackground(themeName, { includeLegacy: true });
  customBackgroundLoading = false;
  reapplyCurrentThemeBackground();
  renderBackgroundControl();
  if (hadBackground) addEvent(`custom background removed for ${displayThemeName(themeName) || themeName}`);
}

async function initializeCustomBackground() {
  await loadCustomBackgroundForTheme(currentThemeName, { includeLegacy: true });
}

async function prepareAttachmentsForPrompt(attachments, tabId) {
  if (!attachments.length) return { images: [], uploadedFiles: [], inlineImageIds: new Set() };
  const files = [];
  const images = [];
  const inlineImageIds = new Set();
  let inlineImageBytes = 0;

  for (const attachment of attachments) {
    const data = await readFileAsBase64(attachment.file);
    files.push({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      data,
    });
    if (
      INLINE_IMAGE_MIME_TYPES.has(attachment.mimeType) &&
      attachment.size <= ATTACHMENT_INLINE_IMAGE_MAX_BYTES &&
      inlineImageBytes + attachment.size <= ATTACHMENT_INLINE_IMAGE_TOTAL_MAX_BYTES
    ) {
      images.push({ type: "image", data, mimeType: attachment.mimeType });
      inlineImageIds.add(attachment.id);
      inlineImageBytes += attachment.size;
    }
  }

  const response = await api("/api/attachments", { method: "POST", body: { files }, tabId });
  return { images, uploadedFiles: response.data?.files || [], inlineImageIds };
}

function composeMessageWithAttachments(message, uploadedFiles, inlineImageIds) {
  if (!uploadedFiles.length) return message;
  const baseMessage = message || "Please inspect the attached file(s).";
  const lines = uploadedFiles.map((file, index) => {
    const inlineNote = inlineImageIds.has(file.id) ? "sent inline and saved at" : "saved at";
    return `- ${index + 1}. ${file.name || "attachment"} (${file.mimeType || "application/octet-stream"}, ${formatBytes(file.size)}): ${inlineNote} ${file.path}`;
  });
  return `${baseMessage}\n\nAttached files:\n${lines.join("\n")}`;
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

function loadDisabledOptionalFeatures() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPTIONAL_FEATURES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => OPTIONAL_FEATURE_BY_ID.has(id)) : [];
  } catch {
    return [];
  }
}

let disabledOptionalFeatures = new Set(loadDisabledOptionalFeatures());

function storeDisabledOptionalFeatures() {
  try {
    localStorage.setItem(OPTIONAL_FEATURES_STORAGE_KEY, JSON.stringify([...disabledOptionalFeatures].sort()));
  } catch {
    // Optional feature toggles should still work for this page load.
  }
}

function isOptionalFeatureDetected(featureId) {
  return optionalFeatureAvailability[featureId] === true;
}

function isOptionalFeatureDisabled(featureId) {
  return disabledOptionalFeatures.has(featureId);
}

function isOptionalFeatureEnabled(featureId) {
  return isOptionalFeatureDetected(featureId) && !isOptionalFeatureDisabled(featureId);
}

function renderOptionalFeatureDependentDisplays() {
  renderOptionalFeatureControls();
  renderThemeSelect();
  renderWidgets();
  renderStatus();
  renderCommands();
  cancelStreamingAssistantTextRender();
  cancelStreamBubbleHide();
  streamBubble?.remove();
  streamBubble = null;
  streamText = null;
  streamBubbleVisibleSince = 0;
  renderAllMessages({ preserveScroll: true });
  if (streamRawText) renderStreamingAssistantText();
}

function setOptionalFeatureDisabled(featureId, disabled) {
  if (!OPTIONAL_FEATURE_BY_ID.has(featureId)) return;
  if (disabled) disabledOptionalFeatures.add(featureId);
  else disabledOptionalFeatures.delete(featureId);
  if (featureId === "gitFooterStatus") {
    statusEntries.delete(GIT_FOOTER_WEBUI_STATUS_KEY);
    clearGitFooterWebuiPayloadCache();
  }
  storeDisabledOptionalFeatures();
  renderOptionalFeatureDependentDisplays();
  const tabContext = activeTabContext();
  refreshCommands(tabContext).catch((error) => {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  });
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

const LOCAL_BACKGROUND_IMAGE_PATTERN = /^(?:none|url\(["']?\/(?!\/)[A-Za-z0-9._~!$&'()*+,=:@%\/-]+["']?\))$/i;
const BACKGROUND_OVERLAY_PATTERN = /^(?:none|linear-gradient\([^;\r\n{}<>]+\))$/i;
const SAFE_BACKGROUND_TOKEN_PATTERN = /^[A-Za-z0-9%._ -]+$/;

function themeExportCssValue(theme, key, fallback, pattern = /^[^;\r\n{}<>]+$/) {
  const raw = String(theme?.export?.[key] ?? "").trim();
  if (!raw) return fallback;
  return pattern.test(raw) ? raw : fallback;
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
    "--theme-background-image": themeExportCssValue(theme, "backgroundImage", "none", LOCAL_BACKGROUND_IMAGE_PATTERN),
    "--theme-background-overlay": themeExportCssValue(theme, "backgroundOverlay", "linear-gradient(180deg, rgba(17, 17, 27, 0), rgba(17, 17, 27, 0))", BACKGROUND_OVERLAY_PATTERN),
    "--theme-background-size": themeExportCssValue(theme, "backgroundSize", "cover", SAFE_BACKGROUND_TOKEN_PATTERN),
    "--theme-background-position": themeExportCssValue(theme, "backgroundPosition", "center", SAFE_BACKGROUND_TOKEN_PATTERN),
    "--theme-background-repeat": themeExportCssValue(theme, "backgroundRepeat", "no-repeat", SAFE_BACKGROUND_TOKEN_PATTERN),
  };

  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  applyCustomBackgroundOverride({ render: false });
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
  if (isOptionalFeatureDisabled("themeBundle")) {
    const option = make("option", undefined, "Theme feature disabled");
    option.value = "";
    elements.themeSelect.append(option);
    elements.themeSelect.disabled = true;
    return;
  }
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

async function setThemeByName(name, options = {}) {
  if (!isOptionalFeatureEnabled("themeBundle")) return;
  const theme = availableThemes.find((item) => item.name === name);
  if (!theme) return;
  currentThemeName = theme.name;
  if (elements.themeSelect && elements.themeSelect.value !== theme.name) elements.themeSelect.value = theme.name;
  setCustomBackgroundRecord(null);
  customBackgroundLoading = true;
  applyTheme(theme, options);
  renderBackgroundControl();
  await loadCustomBackgroundForTheme(theme.name, { includeLegacy: !!options.includeLegacy });
}

async function initializeThemes() {
  let response;
  try {
    response = await api("/api/themes", { scoped: false });
  } catch (error) {
    availableThemes = [];
    optionalFeatureAvailability.themeBundle = false;
    renderOptionalFeatureControls();
    const label = error.statusCode === 404 ? "Restart Web UI to load themes" : "Theme bundle unavailable";
    renderThemeSelect({ unavailableLabel: label });
    throw error;
  }
  availableThemes = Array.isArray(response.data?.themes) ? response.data.themes : [];
  optionalFeatureAvailability.themeBundle = availableThemes.length > 0;
  renderOptionalFeatureControls();
  const stored = storedThemeName();
  currentThemeName = availableThemes.some((theme) => theme.name === stored) ? stored : DEFAULT_THEME_NAME;
  renderThemeSelect();
  await setThemeByName(currentThemeName, { persist: false, includeLegacy: true });
  if (isOptionalFeatureEnabled("themeBundle") && !availableThemes.some((theme) => theme.name === currentThemeName) && availableThemes[0]) await setThemeByName(availableThemes[0].name, { persist: false });
  if (!availableThemes.length) addEvent("theme bundle unavailable; using built-in default theme", "warn");
}

function activeTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
}

function activeTabContext(tabId = activeTabId) {
  return { tabId: tabId || null, generation: activeTabGeneration };
}

function setActiveTabId(tabId, { remember = false } = {}) {
  const nextTabId = tabId || null;
  if (nextTabId !== activeTabId) activeTabGeneration += 1;
  activeTabId = nextTabId;
  bindGitWorkflowToActiveTab();
  if (remember) rememberActiveTab();
  return activeTabContext(nextTabId);
}

function isCurrentTabContext(context) {
  return !!context && context.tabId === activeTabId && context.generation === activeTabGeneration;
}

function eventTargetsActiveTab(event) {
  return !event?.tabId || event.tabId === activeTabId;
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
      skillUsageByTab.delete(tabId);
      clearGitWorkflowForTab(tabId);
    }
  }
  pruneSkillUsageForKnownTabs(liveIds);
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

function requestedTabIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || params.get("tabId") || null;
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
  resetPromptHistoryNavigation();
  elements.promptInput.value = activeTabId ? tabDrafts.get(activeTabId) || "" : "";
  resizePromptInput();
  renderCommandSuggestions();
  renderAttachmentTray();
}

function focusPromptInput({ defer = false } = {}) {
  const focus = () => {
    if (!elements.promptInput || elements.dialog.open || elements.pathPickerDialog.open || elements.nativeCommandDialog.open || elements.appRunnerInfoDialog?.open || elements.promptListDialog?.open || elements.attachmentTextDialog?.open || elements.skillEditorDialog?.open || document.visibilityState === "hidden") return;
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
  clearLiveToolRenderQueue();
  eventSource?.close();
  eventSource = null;
  currentState = null;
  latestStats = null;
  latestWorkspace = null;
  latestMessages = [];
  clearRunIndicatorActivity({ render: false });
  statusEntries.clear();
  widgets.clear();
  transientMessages = [];
  liveToolRuns.clear();
  liveToolCards.clear();
  availableCommands = [];
  rawAvailableCommands = [];
  resetOptionalFeatureAvailability();
  commandSuggestions = [];
  pathSuggestions = [];
  suggestionMode = "none";
  commandSuggestIndex = 0;
  resetStreamBubble();
  removeRunIndicatorBubble();
  hideCommandSuggestions();
  cancelPendingDialogs();
  if (elements.nativeCommandDialog.open) closeNativeCommandDialog();
  if (pathPickerState) closePathPicker(null);
  bindGitWorkflowToActiveTab();
  resetChatOutput();
  elements.stateDetails.replaceChildren();
  elements.eventLog.replaceChildren();
  const queuedSnapshot = activeTabId ? latestQueuedMessagesByTab.get(activeTabId) : null;
  if (queuedSnapshot) renderQueue({ tabId: activeTabId, ...queuedSnapshot });
  else renderQueue({ tabId: activeTabId, steering: [], followUp: [] });
  elements.commandsBox.textContent = "Loading…";
  elements.commandsBox.classList.add("muted");
  renderAppRunnerControls();
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

function renderTerminalTabGroup(group, groupCount = 1) {
  const groupTabs = group.tabs;
  const activeGroupTab = groupTabs.find((tab) => tab.id === activeTabId) || groupTabs[0];
  const isActive = groupTabs.some((tab) => tab.id === activeTabId);
  const isStopped = groupTabs.every((tab) => !tab.running);
  const indicator = tabGroupIndicator(groupTabs);
  const cwdTitle = tabGroupTitle(group.cwd, activeGroupTab?.title || "cwd");
  const activeTitle = activeGroupTab?.title || cwdTitle;
  const displayCwd = normalizeDisplayPath(group.cwd || cwdTitle);
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
  button.setAttribute("aria-label", `${cwdTitle} group: ${groupTabs.length} tabs, ${indicator.label}. Active ${activeTitle}`);
  button.title = `${activeTitle} · ${displayCwd} · ${groupTabs.length} tabs · ${indicator.label}`;
  appendTerminalTabContent(button, { title: activeTitle, indicator, meta: `${cwdTitle} · ${indicator.meta}`, count: groupTabs.length });
  button.addEventListener("click", () => switchTab(activeGroupTab.id));
  wrapper.append(button);

  if (groupCount > 1) {
    const close = make("button", "terminal-tab-close terminal-tab-group-close", "×");
    close.type = "button";
    close.title = `Close ${displayCwd} group`;
    close.setAttribute("aria-label", `Close ${displayCwd} group`);
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTerminalTabGroup(group);
    });
    wrapper.append(close);
  }

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

function setNewTabMenuOpen(open) {
  newTabMenuOpen = !!open;
  elements.newTabButton?.setAttribute("aria-expanded", newTabMenuOpen ? "true" : "false");
  elements.newTabButton?.classList.toggle("menu-open", newTabMenuOpen);
  elements.newTabMenu?.classList.toggle("open", newTabMenuOpen);
}

function openNewTabMenu() {
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setNewTabMenuOpen(true);
}

function focusNewTabMenuItem(direction = "first") {
  const items = [elements.newTabCurrentDirectoryButton, elements.newTabChooseDirectoryButton].filter(Boolean);
  const item = direction === "last" ? items.at(-1) : items[0];
  item?.focus({ preventScroll: true });
}

function moveNewTabMenuFocus(delta) {
  const items = [elements.newTabCurrentDirectoryButton, elements.newTabChooseDirectoryButton].filter(Boolean);
  if (!items.length) return;
  const currentIndex = Math.max(0, items.indexOf(document.activeElement));
  const nextIndex = (currentIndex + delta + items.length) % items.length;
  items[nextIndex].focus({ preventScroll: true });
}

function renderTabs() {
  const active = activeTab();
  const activeIndicator = active ? tabIndicator(active) : null;
  elements.terminalTabsToggleButton.textContent = active ? `${activeIndicator.glyph} ${active.title}${tabs.length > 1 ? ` · ${tabs.length}` : ""}` : "Tabs";
  elements.terminalTabsToggleButton.title = active ? `Show terminal tabs · active: ${active.title} · ${activeIndicator.label}` : "Show terminal tabs";
  elements.tabBar.replaceChildren();
  elements.tabBar.dataset.tabCount = String(tabs.length);
  elements.tabBar.classList.toggle("terminal-tabs-dense", tabs.length >= 10);
  const groups = tabCwdGroups();
  const renderedGroupKeys = new Set(groups.filter((group) => shouldRenderTerminalTabGroup(group, groups.length)).map((group) => group.key));
  if (openTerminalTabGroupKey && !renderedGroupKeys.has(openTerminalTabGroupKey)) openTerminalTabGroupKey = null;
  for (const group of groups) {
    if (shouldRenderTerminalTabGroup(group, groups.length)) {
      elements.tabBar.append(renderTerminalTabGroup(group, groups.length));
    } else {
      for (const tab of group.tabs) elements.tabBar.append(renderTerminalTab(tab));
    }
  }
  elements.tabBar.append(elements.newTabMenu);
  elements.closeAllTabsButton.disabled = tabs.length === 0;
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
  syncAgentDoneNotificationsFromTabs(tabs, previousTabs);
  const requested = selectStored ? requestedTabIdFromUrl() : null;
  const stored = selectStored ? restoreStoredTabId() : null;
  if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
    setActiveTabId((requested && tabs.some((tab) => tab.id === requested) ? requested : stored && tabs.some((tab) => tab.id === stored) ? stored : tabs[0]?.id) || null, { remember: true });
  }
  rememberServerStartCwd(tabs.find((tab) => tab.id === activeTabId)?.cwd || tabs[0]?.cwd);
  renderSessionSkillTags(activeTabId);
  renderTabs();
  return tabs;
}

async function switchTab(tabId) {
  if (!tabId || tabId === activeTabId || !tabs.some((tab) => tab.id === tabId)) return;
  clearOpenTerminalTabGroup(null, { force: true });
  setMobileTabsExpanded(false);
  footerModelPickerOpen = false;
  footerThinkingPickerOpen = false;
  saveActiveDraft();
  const tabContext = setActiveTabId(tabId, { remember: true });
  resetActiveTabUi();
  renderTabs();
  restoreActiveDraft();
  focusPromptInput({ defer: true });
  connectEvents(tabContext);
  await refreshAll(tabContext);
  if (isCurrentTabContext(tabContext)) markTabOutputSeen();
}

function currentDirectoryForNewTab() {
  return latestWorkspace?.cwd || activeTab()?.cwd || "";
}

async function createTerminalTab(cwd = currentDirectoryForNewTab(), { triggerButton = elements.newTabButton } = {}) {
  setMobileTabsExpanded(false);
  setNewTabMenuOpen(false);
  const resolvedCwd = cwd || currentDirectoryForNewTab();
  if (!resolvedCwd && tabs.length === 0) {
    await createTerminalTabFromChosenDirectory({ triggerButton });
    return;
  }
  const disabledButtons = new Set([elements.newTabButton, triggerButton].filter(Boolean));
  for (const button of disabledButtons) button.disabled = true;
  try {
    const response = await api("/api/tabs", { method: "POST", body: { cwd: resolvedCwd }, scoped: false });
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

async function createTerminalTabFromChosenDirectory({ triggerButton = elements.newTabChooseDirectoryButton } = {}) {
  const sourceTab = activeTab();
  const initialCwd = currentDirectoryForNewTab();
  setMobileTabsExpanded(false);
  setNewTabMenuOpen(false);
  const cwd = await pickCwd(sourceTab || { id: "new-tab", title: "new tab" }, initialCwd, { title: "Choose CWD for new tab" });
  if (!cwd) return;
  await createTerminalTab(cwd, { triggerButton });
}

async function createFirstTerminalTabFromChosenDirectory() {
  if (firstTerminalCwdPromptShown || tabs.length > 0) return;
  firstTerminalCwdPromptShown = true;
  const cwd = await pickCwd({ id: "first-terminal", title: "first terminal" }, "", { title: "Choose CWD for first terminal" });
  if (!cwd) {
    addEvent("choose a CWD to start the first terminal", "warn");
    return;
  }
  await createTerminalTab(cwd, { triggerButton: null });
}

function tabHasActiveAgent(tab) {
  const activity = activityForTab(tab);
  const indicator = tabIndicator(tab);
  return !!activity.isWorking || indicator.state === "working" || indicator.state === "blocked";
}

function confirmCloseTerminalTabs(targetTabs, label) {
  const count = targetTabs.length;
  const noun = count === 1 ? "tab" : "tabs";
  const activeAgentTabs = targetTabs.filter(tabHasActiveAgent);
  const tabList = targetTabs.map((tab) => `- ${tab.title}`).join("\n");
  const activeList = activeAgentTabs.map((tab) => `- ${tab.title} (${tabIndicator(tab).label})`).join("\n");
  const base = [
    `Close ${label || `${count} terminal ${noun}`}?`,
    "",
    `This terminates ${count === 1 ? "its isolated Pi process" : "their isolated Pi processes"}.`,
    count > 1 ? `\nTabs to close:\n${tabList}` : "",
  ].filter(Boolean).join("\n");
  const warning = activeAgentTabs.length
    ? [
        `WARNING: ${activeAgentTabs.length} ${activeAgentTabs.length === 1 ? "tab has an agent" : "tabs have agents"} still running or waiting for input:`,
        activeList,
        "",
        base,
        "",
        "Close anyway?",
      ].join("\n")
    : base;
  return confirm(warning);
}

async function closeTerminalTabs(tabIds, { label = "selected terminal tabs" } = {}) {
  const targetIds = [...new Set(tabIds.filter(Boolean))];
  const targetTabs = targetIds.map((id) => tabs.find((item) => item.id === id)).filter(Boolean);
  if (!targetTabs.length) return;
  if (!confirmCloseTerminalTabs(targetTabs, label)) return;

  const closedActiveTab = targetTabs.some((tab) => tab.id === activeTabId);
  const fallbackTabId = tabs.find((item) => !targetIds.includes(item.id))?.id || null;
  try {
    if (closedActiveTab) eventSource?.close();
    const response = await api("/api/tabs/close", { method: "POST", body: { ids: targetIds }, scoped: false });
    const closedIds = response.data?.closedIds || targetIds;
    tabs = response.data?.tabs || tabs.filter((item) => !closedIds.includes(item.id));
    syncTabMetadata(tabs);
    for (const id of closedIds) {
      tabDrafts.delete(id);
      clearAttachments(id);
      clearGitWorkflowForTab(id);
      appRunnerDataByTab.delete(id);
    }
    clearOpenTerminalTabGroup(null, { force: true });

    const activeTabNeedsFallback = closedIds.includes(activeTabId) || !tabs.some((item) => item.id === activeTabId);
    if (activeTabNeedsFallback) {
      const tabContext = setActiveTabId((response.data?.activeTabId && tabs.some((item) => item.id === response.data.activeTabId)
        ? response.data.activeTabId
        : (fallbackTabId && tabs.some((item) => item.id === fallbackTabId) ? fallbackTabId : tabs[0]?.id)) || null, { remember: true });
      resetActiveTabUi();
      renderTabs();
      restoreActiveDraft();
      focusPromptInput({ defer: true });
      connectEvents(tabContext);
      if (activeTabId) {
        await refreshAll(tabContext);
        if (isCurrentTabContext(tabContext)) markTabOutputSeen();
      }
    } else {
      renderTabs();
    }
    addEvent(`closed ${closedIds.length || targetTabs.length} terminal ${closedIds.length === 1 ? "tab" : "tabs"}`, "warn");
  } catch (error) {
    addEvent(error.message, "error");
  }
}

async function closeTerminalTab(tabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return;
  await closeTerminalTabs([tabId], { label: tab.title });
}

async function closeTerminalTabGroup(group) {
  const title = tabGroupTitle(group.cwd, group.tabs[0]?.title || "cwd");
  await closeTerminalTabs(group.tabs.map((tab) => tab.id), { label: `${title} group` });
}

async function closeAllTerminalTabs() {
  await closeTerminalTabs(tabs.map((tab) => tab.id), { label: "all terminal tabs" });
}

async function initializeTabs() {
  const loadedTabs = await refreshTabs({ selectStored: true });
  resetActiveTabUi();
  renderTabs();
  restoreActiveDraft();
  if (!loadedTabs.length) {
    await createFirstTerminalTabFromChosenDirectory();
    return;
  }
  focusPromptInput({ defer: true });
  const tabContext = activeTabContext();
  connectEvents(tabContext);
  if (activeTabId) {
    await refreshAll(tabContext);
    if (isCurrentTabContext(tabContext)) markTabOutputSeen();
  }
}

function addEvent(message, level = "info") {
  const line = make("div", `event ${level}`.trim());
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${message}`;
  elements.eventLog.prepend(line);
  while (elements.eventLog.children.length > 120) elements.eventLog.lastElementChild?.remove();
}

function browserNotificationSupported() {
  return "Notification" in window && window.isSecureContext;
}

function browserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission || "default";
}

function blockedTabNotificationSupported() {
  return browserNotificationSupported();
}

function blockedTabNotificationPermission() {
  return browserNotificationPermission();
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

async function ensureAgentDoneNotificationPermission() {
  if (!browserNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied" || agentDoneNotificationPermissionRequested || typeof Notification.requestPermission !== "function") return false;

  agentDoneNotificationPermissionRequested = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      addEvent("browser notifications enabled for completed agent work", "info");
      return true;
    }
  } catch (error) {
    addEvent(`agent-done notification permission request failed: ${error.message}`, "warn");
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

function noteAgentDoneNotificationFallback(reason) {
  if (agentDoneNotificationFallbackNoted) return;
  agentDoneNotificationFallbackNoted = true;
  addEvent(`browser notifications unavailable for completed agent work: ${reason}`, "warn");
}

async function showAgentDoneBrowserNotification({ tabId, title, body }) {
  if (!agentDoneNotificationsEnabled) return false;
  if (!browserNotificationSupported()) {
    noteAgentDoneNotificationFallback("requires HTTPS or localhost");
    renderAgentDoneNotificationsToggle();
    return false;
  }
  if (!(await ensureAgentDoneNotificationPermission())) {
    const permission = browserNotificationPermission();
    noteAgentDoneNotificationFallback(permission === "denied" ? "permission denied" : "permission not granted");
    if (permission !== "granted") {
      agentDoneNotificationsEnabled = false;
      persistAgentDoneNotificationsEnabled(false);
    }
    renderAgentDoneNotificationsToggle();
    return false;
  }

  const options = {
    body,
    tag: `${AGENT_DONE_NOTIFICATION_TAG_PREFIX}:${tabId}`,
    renotify: true,
    requireInteraction: false,
    icon: BLOCKED_TAB_NOTIFICATION_ICON,
    badge: BLOCKED_TAB_NOTIFICATION_ICON,
    data: { tabId, url: location.href },
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
    noteAgentDoneNotificationFallback(error.message || "notification failed");
    return false;
  }
}

function agentDoneNotificationKey(tabId, activity = {}) {
  const serial = Number(activity?.completionSerial);
  return `${tabId}:${Number.isFinite(serial) && serial > 0 ? serial : "done"}`;
}

function notifyAgentDone(tabOrId, { activity = null, tabTitle = "" } = {}) {
  if (!agentDoneNotificationsEnabled) return;
  const tabId = typeof tabOrId === "string" ? tabOrId : tabOrId?.id || activeTabId;
  if (!tabId) return;
  const tab = typeof tabOrId === "object" && tabOrId !== null ? tabOrId : tabs.find((item) => item.id === tabId);
  const normalizedActivity = normalizeTabActivity(activity || tab?.activity || activityForTab(tab));
  if (!normalizedActivity.completionSerial) return;
  const key = agentDoneNotificationKey(tabId, normalizedActivity);
  if (agentDoneNotificationKeys.has(key)) return;
  agentDoneNotificationKeys.add(key);

  const displayTitle = tabTitle || tab?.title || "terminal";
  showAgentDoneBrowserNotification({
    tabId,
    title: "Pi finished work",
    body: `${displayTitle} finished its agent run.`,
  });
}

function syncAgentDoneNotificationsFromTabs(nextTabs = [], previousTabs = []) {
  if (!agentDoneNotificationsEnabled || previousTabs.length === 0) return;
  const previousSerials = new Map(previousTabs.filter((tab) => tab?.id).map((tab) => [tab.id, normalizeTabActivity(tab.activity).completionSerial]));
  for (const tab of nextTabs) {
    if (!tab?.id || !previousSerials.has(tab.id)) continue;
    const activity = normalizeTabActivity(tab.activity);
    if (!activity.isWorking && activity.completionSerial > previousSerials.get(tab.id)) notifyAgentDone(tab, { activity });
  }
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
  if ((cleanKey === "git-footer" || cleanKey === GIT_FOOTER_WEBUI_STATUS_KEY) && !isOptionalFeatureEnabled("gitFooterStatus")) return "";
  if (cleanKey === GIT_FOOTER_WEBUI_STATUS_KEY) return "";
  if (cleanKey === "plan-mode") return `Plan: ${cleanValue}`;
  if (cleanKey === "extension") return cleanValue;
  return `${cleanKey}: ${cleanValue}`;
}

function shortModelLabel(model) {
  if (!model) return "unknown";
  return `(${model.provider}) ${model.id}`;
}

function footerThinkingLevelLabel(level) {
  return String(level || "unknown").trim() || "unknown";
}

function footerThinkingDisplay(state = currentState) {
  const current = footerThinkingLevelLabel(state?.thinkingLevel);
  const pending = state?.pendingThinkingLevel ? footerThinkingLevelLabel(state.pendingThinkingLevel) : "";
  return pending && pending !== current ? `${current} → ${pending} next` : current;
}

function footerModelLine(model = currentState?.model, thinkingLevel = currentState?.thinkingLevel) {
  const label = shortModelLabel(model);
  if (!model?.reasoning) return label;
  const thinking = thinkingLevel === "off" ? "thinking off" : thinkingLevel || "?";
  return `${label} • ${thinking}`;
}

function normalizeSelectedModel(model) {
  const provider = String(model?.provider || "").trim();
  const id = String(model?.id || model?.modelId || "").trim();
  if (!provider || !id) return null;
  const known = [...availableModels, ...footerScopedModels].find((item) => item?.provider === provider && item?.id === id);
  return { ...(known || {}), ...model, provider, id };
}

function applyOptimisticModelSelection(model, tabContext = activeTabContext()) {
  const nextModel = normalizeSelectedModel(model);
  if (!nextModel || !currentState || !isCurrentTabContext(tabContext)) return nextModel;
  const changed = modelStateKey(currentState.model) !== modelStateKey(nextModel);
  currentState = { ...currentState, model: nextModel };
  renderStatus();
  if (changed) requestGitFooterWebuiPayload(tabContext, { force: true });
  return nextModel;
}

function applyOptimisticThinkingSelection(data, tabContext = activeTabContext()) {
  const level = String(data?.level || data?.requestedLevel || "").trim();
  if (!level || !currentState || !isCurrentTabContext(tabContext)) return level;
  if (data?.pending) currentState = { ...currentState, pendingThinkingLevel: level };
  else currentState = { ...currentState, thinkingLevel: level, pendingThinkingLevel: undefined };
  renderStatus();
  if (!data?.pending) requestGitFooterWebuiPayload(tabContext, { force: true });
  return level;
}

function footerThinkingLevels() {
  const levels = Array.from(elements.thinkingSelect?.options || []).map((option) => option.value).filter(Boolean);
  return levels.length ? levels : ["off", "minimal", "low", "medium", "high", "xhigh"];
}

function formatFooterTokenCount(value) {
  const n = Math.max(0, Number(value) || 0);
  if (n < 1000) return `${Math.round(n)}`;
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  if (n < 10000000) return `${(n / 1000000).toFixed(1)}M`;
  return `${Math.round(n / 1000000)}M`;
}

function footerCostAuthLabel() {
  const provider = currentState?.model?.provider || "";
  return /codex|copilot|chatgpt/i.test(provider) ? "sub" : "api";
}

function contextWindowFromSources(...sources) {
  for (const source of sources) {
    const value = typeof source === "object" && source !== null ? source.contextWindow : source;
    const contextWindow = Number(value);
    if (Number.isFinite(contextWindow) && contextWindow > 0) return contextWindow;
  }
  return 0;
}

function contextUsageUnknownAfterCompaction(tabId = activeTabId) {
  return !!tabId && contextUsageUnknownAfterCompactionByTab.has(tabId);
}

function unknownFooterContextText(contextUsage = null) {
  const contextWindow = contextWindowFromSources(
    contextUsage,
    latestStats?.contextUsage,
    currentState?.contextUsage,
    currentState?.model?.contextWindow,
  );
  return contextWindow ? `?/${formatFooterTokenCount(contextWindow)}` : "?";
}

function contextUsageWithUnknownPercent(contextUsage = null) {
  return {
    ...(contextUsage || {}),
    percent: null,
    contextWindow: contextWindowFromSources(contextUsage, latestStats?.contextUsage, currentState?.contextUsage, currentState?.model?.contextWindow),
  };
}

function markContextUsageUnknownAfterCompaction(tabId = activeTabId) {
  if (!tabId) return;
  contextUsageUnknownAfterCompactionByTab.set(tabId, Date.now());
  if (tabId !== activeTabId) return;
  if (currentState) currentState = { ...currentState, contextUsage: contextUsageWithUnknownPercent(currentState.contextUsage) };
  if (latestStats) latestStats = { ...latestStats, contextUsage: contextUsageWithUnknownPercent(latestStats.contextUsage) };
}

function clearContextUsageUnknownAfterCompaction(tabId = activeTabId) {
  if (!tabId) return;
  contextUsageUnknownAfterCompactionByTab.delete(tabId);
}

function footerStatsTokensDisplay(stats = latestStats) {
  const tokens = stats?.tokens;
  if (!tokens) return "";
  return `↑${formatFooterTokenCount(tokens.input)} ↓${formatFooterTokenCount(tokens.output)}`;
}

function footerStatsCostDisplay(stats = latestStats) {
  if (!stats) return "";
  return `$${Number(stats.cost || 0).toFixed(3)} (${footerCostAuthLabel()})`;
}

function footerContextDisplayWithAuto(value, state = currentState) {
  const text = cleanStatusText(value);
  if (!text) return "";
  const withoutAuto = text.replace(/\s*\(auto\)\s*$/i, "");
  return state?.autoCompactionEnabled !== false ? `${withoutAuto} (auto)` : withoutAuto;
}

function footerStatsContextDisplay(stats = latestStats) {
  const usage = stats?.contextUsage || currentState?.contextUsage;
  const contextWindow = contextWindowFromSources(usage, currentState?.model?.contextWindow);
  if (contextUsageUnknownAfterCompaction()) return footerContextDisplayWithAuto(unknownFooterContextText(usage));
  if (!contextWindow) return "";
  const rawPercent = Number(usage?.percent);
  const percent = Number.isFinite(rawPercent) ? `${rawPercent.toFixed(1)}%` : "?";
  return footerContextDisplayWithAuto(`${percent}/${formatFooterTokenCount(contextWindow)}`);
}

function fallbackFooterStats() {
  return [footerStatsTokensDisplay(), footerStatsCostDisplay(), footerStatsContextDisplay()].filter(Boolean);
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

function cleanTooltipText(value) {
  return stripAnsi(value).replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

let footerTooltipNode = null;
let footerTooltipTarget = null;
let footerTooltipEventsBound = false;

function ensureFooterTooltipNode() {
  if (!footerTooltipNode) {
    footerTooltipNode = make("div", "footer-floating-tooltip");
    footerTooltipNode.hidden = true;
    document.body.append(footerTooltipNode);
  }
  if (!footerTooltipEventsBound) {
    footerTooltipEventsBound = true;
    const update = () => positionFooterTooltip(footerTooltipTarget);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });
  }
  return footerTooltipNode;
}

function positionFooterTooltip(target) {
  if (!target || !footerTooltipNode || footerTooltipNode.hidden) return;
  const gap = 8;
  const margin = 8;
  const rect = target.getBoundingClientRect();
  const maxWidth = Math.max(96, Math.min(384, window.innerWidth - margin * 2));
  footerTooltipNode.style.maxWidth = `${maxWidth}px`;

  const width = footerTooltipNode.offsetWidth;
  const height = footerTooltipNode.offsetHeight;
  const align = target.getAttribute("data-tooltip-align") || "center";
  let left = rect.left + rect.width / 2 - width / 2;
  if (align === "start") left = rect.left;
  if (align === "end") left = rect.right - width;
  left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - margin - width));

  let top = rect.top - gap - height;
  if (top < margin) top = rect.bottom + gap;
  top = Math.min(Math.max(margin, top), window.innerHeight - margin - height);

  footerTooltipNode.style.left = `${Math.round(left)}px`;
  footerTooltipNode.style.top = `${Math.round(top)}px`;
}

function showFooterTooltip(target) {
  const text = target?.getAttribute("data-tooltip");
  if (!text) return;
  footerTooltipTarget = target;
  const tooltip = ensureFooterTooltipNode();
  tooltip.textContent = text;
  tooltip.hidden = false;
  tooltip.classList.add("visible");
  positionFooterTooltip(target);
}

function hideFooterTooltip(target) {
  if (target && target !== footerTooltipTarget) return;
  footerTooltipTarget = null;
  if (!footerTooltipNode) return;
  footerTooltipNode.hidden = true;
  footerTooltipNode.classList.remove("visible");
}

function applyFooterTooltip(node, tooltip, options = {}) {
  const text = cleanTooltipText(tooltip);
  if (!text) return node;
  node.setAttribute("data-tooltip", text);
  node.setAttribute("aria-label", text.replace(/\s+/g, " "));
  if (options.align) node.setAttribute("data-tooltip-align", options.align);
  node.addEventListener("mouseenter", () => showFooterTooltip(node));
  node.addEventListener("mouseleave", () => hideFooterTooltip(node));
  node.addEventListener("focus", () => showFooterTooltip(node));
  node.addEventListener("blur", () => hideFooterTooltip(node));
  return node;
}

function footerMetric(icon, label, value, tone = "", options = {}) {
  const node = make("span", `footer-metric ${tone}`.trim());
  node.append(make("span", "footer-metric-icon", icon), make("span", "footer-metric-label", label), make("span", "footer-metric-value", value));
  return applyFooterTooltip(node, options.title || `${label}: ${value}`, { align: options.tooltipAlign });
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
  const percent = typeof contextUsage?.percent === "number" ? contextUsage.percent : Number.NaN;
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
  return applyFooterTooltip(node, options.title || `${label}: ${value}`, { align: options.tooltipAlign });
}

const FOOTER_PAYLOAD_TONES = new Set(["pink", "blue", "mauve", "yellow", "green", "teal"]);
const FOOTER_META_CLASS_BY_KEY = new Map([
  ["cwd", "footer-workspace"],
  ["git", "footer-branch"],
  ["git-state", "footer-git-state"],
  ["sync", "footer-sync"],
  ["changes", "footer-changes"],
  ["git-extra", "footer-git-extra"],
  ["context", "footer-context"],
  ["model", "footer-model"],
  ["thinking", "footer-thinking"],
]);

const GIT_FOOTER_TOOLTIP_COPY = {
  tokens: "Session token totals. ↑ is input/prompt tokens; ↓ is assistant output tokens.",
  cache: "Provider prompt-cache usage. R is cache-read tokens; W is cache-write tokens.",
  pi: "Estimated initial Pi prompt size before your message. … means the estimate is still pending.",
  speed: "Assistant streaming speed. Shows live output tokens for the current reply and current or last tokens per second.",
  cost: "Estimated session cost. sub means subscription-backed provider; api means metered API usage.",
  context: "Context window pressure. Shows percent used over the model limit; auto means auto-compaction is enabled.",
  cwd: "Active working directory for this Web UI tab.",
  git: "Current Git branch. detached means HEAD is not on a branch; no repo means the cwd is outside a Git work tree.",
  "git-state": "Active Git operation or detached state. Finish or abort rebase/merge/cherry-pick/revert/bisect before normal commits.",
  sync: "Remote tracking divergence. ↑ means local commits ahead; ↓ means remote commits to pull.",
  changes: "Working tree summary. 🟢 staged, ✏️ modified unstaged, ➕ untracked, ⚠️ conflicted; ✅ means no changes.",
  "git-extra": "Extra Git signals. 📦 stash, 🧩 dirty submodules, 🌳 worktrees, 🏷️ tag at HEAD, 🕒 last commit age, 🔓 signing mismatch.",
  model: "Scoped model for this tab.",
  thinking: "Reasoning/thinking effort for this tab.",
};

function cleanFooterPayloadText(value, fallback = "", maxLength = 240) {
  const text = cleanStatusText(value).slice(0, maxLength);
  return text || fallback;
}

function normalizeFooterPayloadChip(value, index) {
  if (!value || typeof value !== "object") return null;
  const key = cleanFooterPayloadText(value.key, `item-${index}`).replace(/[^a-z0-9_.:-]/gi, "-").slice(0, 64) || `item-${index}`;
  const label = cleanFooterPayloadText(value.label, key).slice(0, 32);
  const chip = {
    key,
    label,
    value: cleanFooterPayloadText(value.value, "—"),
    icon: cleanFooterPayloadText(value.icon, "•").slice(0, 8),
    tone: FOOTER_PAYLOAD_TONES.has(value.tone) ? value.tone : "",
    title: cleanFooterPayloadText(value.title, "", 4000),
  };
  if (value.contextUsage && typeof value.contextUsage === "object") {
    const percent = typeof value.contextUsage.percent === "number" ? value.contextUsage.percent : Number.NaN;
    const contextWindow = Number(value.contextUsage.contextWindow);
    chip.contextUsage = {
      percent: Number.isFinite(percent) ? percent : null,
      contextWindow: Number.isFinite(contextWindow) ? contextWindow : 0,
    };
  }
  return chip;
}

function currentGitFooterCacheCwd(tabId = activeTabId) {
  const tab = tabs.find((item) => item.id === tabId) || activeTab();
  return latestWorkspace?.cwd || tab?.cwd || "";
}

function parseGitFooterWebuiPayloadRaw(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== GIT_FOOTER_WEBUI_PAYLOAD_TYPE || parsed.version !== GIT_FOOTER_WEBUI_PAYLOAD_VERSION) return null;
    const main = Array.isArray(parsed.main) ? parsed.main.map(normalizeFooterPayloadChip).filter(Boolean).slice(0, 8) : [];
    const meta = Array.isArray(parsed.meta) ? parsed.meta.map(normalizeFooterPayloadChip).filter(Boolean).slice(0, 10) : [];
    if (!main.length && !meta.length) return null;
    return { main, meta };
  } catch {
    return null;
  }
}

function readCachedGitFooterWebuiPayloadRaw() {
  try {
    const cached = JSON.parse(localStorage.getItem(GIT_FOOTER_WEBUI_PAYLOAD_CACHE_KEY) || "null");
    if (!cached || typeof cached.raw !== "string") return null;
    const cachedCwd = typeof cached.cwd === "string" ? cached.cwd : "";
    const currentCwd = currentGitFooterCacheCwd();
    if (cachedCwd && currentCwd && cachedCwd !== currentCwd) return null;
    return cached.raw;
  } catch {
    return null;
  }
}

function cacheGitFooterWebuiPayload(raw, tabId = activeTabId) {
  if (!parseGitFooterWebuiPayloadRaw(raw)) return;
  try {
    localStorage.setItem(GIT_FOOTER_WEBUI_PAYLOAD_CACHE_KEY, JSON.stringify({
      raw,
      cwd: currentGitFooterCacheCwd(tabId),
      savedAt: Date.now(),
    }));
  } catch {
    // Cached footer payloads are best-effort; live extension payloads still work.
  }
}

function clearGitFooterWebuiPayloadCache() {
  try {
    localStorage.removeItem(GIT_FOOTER_WEBUI_PAYLOAD_CACHE_KEY);
  } catch {
    // Ignore storage failures; toggles should still work for this page load.
  }
}

function parseGitFooterWebuiPayload() {
  if (isOptionalFeatureDisabled("gitFooterStatus")) return null;

  const livePayload = parseGitFooterWebuiPayloadRaw(statusEntries.get(GIT_FOOTER_WEBUI_STATUS_KEY));
  if (livePayload) return livePayload;

  const commandsStillLoading = availableCommands.length === 0 && rawAvailableCommands.length === 0;
  const extensionDetected = hasAvailableCommand("git-footer-refresh") || optionalFeatureAvailability.gitFooterStatus;
  if (!commandsStillLoading && !extensionDetected) return null;
  return parseGitFooterWebuiPayloadRaw(readCachedGitFooterWebuiPayloadRaw());
}

function footerPayloadWithLiveModel(payload) {
  if (!payload) return payload;
  const model = currentState?.model ? shortModelLabel(currentState.model) : "";
  const effort = footerThinkingDisplay();
  const hasThinkingChip = [...payload.main, ...payload.meta].some((chip) => chip?.key === "thinking");
  const contextChip = (chip) => {
    const usageUnknown = contextUsageUnknownAfterCompaction();
    const value = usageUnknown ? footerContextDisplayWithAuto(unknownFooterContextText(chip?.contextUsage)) : footerContextDisplayWithAuto(chip?.value);
    const contextUsage = usageUnknown ? contextUsageWithUnknownPercent(chip?.contextUsage) : chip?.contextUsage;
    return { ...chip, value, title: `context: ${value}`, ...(contextUsage ? { contextUsage } : {}) };
  };
  const effortChip = (chip) => ({ ...chip, key: "thinking", label: "effort", value: effort, title: `effort: ${effort}`, tone: "mauve" });
  const splitChip = (chip) => {
    if (chip?.key === "context") return [contextChip(chip)];
    if (chip?.key === "thinking") return [effortChip(chip)];
    if (chip?.key !== "model" || !model) return [chip];
    const modelChip = { ...chip, value: model, title: `model: ${model}` };
    return hasThinkingChip ? [modelChip] : [modelChip, effortChip(chip)];
  };
  return {
    main: payload.main.flatMap(splitChip),
    meta: payload.meta.flatMap(splitChip),
  };
}

function footerMetaClassForPayload(chip) {
  const base = FOOTER_META_CLASS_BY_KEY.get(chip.key) || "footer-extension-meta";
  const toneClass = chip.tone ? ` tone-${chip.tone}` : "";
  return `${base}${toneClass}`.trim();
}

function isRedundantFooterTooltipTitle(sourceTitle, chip, value) {
  const normalized = cleanStatusText(sourceTitle).toLowerCase();
  if (!normalized) return true;
  const labels = [chip?.label, chip?.key].map((item) => cleanFooterPayloadText(item, "").toLowerCase()).filter(Boolean);
  return [`current: ${value}`, ...labels.map((label) => `${label}: ${value}`)].some((item) => normalized === cleanStatusText(item).toLowerCase());
}

function gitFooterPayloadTooltip(chip, options = {}) {
  const key = cleanFooterPayloadText(chip?.key, "");
  const value = cleanFooterPayloadText(chip?.value, "—");
  const sourceTitle = cleanFooterPayloadText(chip?.title, "", 4000);
  const action = cleanFooterPayloadText(options.action, "", 1000);
  const parts = [GIT_FOOTER_TOOLTIP_COPY[key] || "Extension-provided git-footer-status item.", `Current: ${value}`];
  if (sourceTitle && !isRedundantFooterTooltipTitle(sourceTitle, chip, value)) parts.push(sourceTitle);
  if (action) parts.push(action);
  return parts.join("\n");
}

function gitFooterTooltipAlign(chip) {
  if (["tokens", "cwd"].includes(chip?.key)) return "start";
  if (["model", "thinking"].includes(chip?.key)) return "end";
  return "center";
}

function footerTuiItem(value, className = "", options = {}) {
  const text = cleanStatusText(value);
  const isAction = typeof options.onClick === "function";
  const node = make(isAction ? "button" : "span", `footer-tui-item ${className}${isAction ? " footer-tui-action" : ""}`.trim(), text);
  if (isAction) {
    node.type = "button";
    node.addEventListener("click", options.onClick);
  }
  if (options.title) node.title = options.title;
  return node;
}

function renderTuiFooterLine({ cwd, cwdTitle, message = "", stats = [], model = "" } = {}) {
  const tab = activeTab();
  const line = make("div", "footer-line footer-line-tui");
  line.append(footerTuiItem(cwd || "loading…", "footer-tui-cwd", tab ? {
    onClick: changeActiveTabCwd,
    title: cwdTitle || `Change cwd for ${tab.title}: ${cwd}`,
  } : { title: cwdTitle }));
  if (message) line.append(footerTuiItem(message, "footer-tui-status"));
  for (const stat of stats.filter(Boolean)) line.append(footerTuiItem(stat, "footer-tui-stat"));
  if (model) {
    line.append(make("span", "footer-tui-spacer"));
    line.append(footerTuiItem(model, "footer-tui-model", {
      onClick: () => setFooterModelPickerOpen(!footerModelPickerOpen),
      title: `Change scoped model: ${model}`,
    }));
  }
  return line;
}

function renderGitFooterPayloadMetric(chip) {
  const node = footerMetric(chip.icon || "•", chip.label, chip.value, chip.tone ? `tone-${chip.tone}` : "", {
    title: gitFooterPayloadTooltip(chip),
    tooltipAlign: gitFooterTooltipAlign(chip),
  });
  return chip.contextUsage ? applyFooterContextUsage(node, chip.contextUsage) : node;
}

function renderGitFooterPayloadMeta(chip, tab) {
  const options = {};
  let action = "";
  if (chip.key === "cwd" && tab) {
    options.onClick = changeActiveTabCwd;
    action = `Click to change the working directory for ${tab.title}.`;
  } else if (chip.key === "model") {
    options.onClick = () => setFooterModelPickerOpen(!footerModelPickerOpen);
    action = "Click to choose another model.";
  } else if (chip.key === "thinking") {
    options.onClick = () => setFooterThinkingPickerOpen(!footerThinkingPickerOpen);
    action = "Click to change thinking effort.";
  }
  options.title = gitFooterPayloadTooltip(chip, { action });
  options.tooltipAlign = gitFooterTooltipAlign(chip);
  const node = footerMeta(chip.label, chip.value, footerMetaClassForPayload(chip), options);
  return chip.contextUsage ? applyFooterContextUsage(node, chip.contextUsage) : node;
}

function renderGitFooterPayload(payload) {
  const tab = activeTab();
  hideFooterTooltip();
  elements.statusBar.replaceChildren();
  elements.statusBar.classList.remove("statusbar-tui-footer");
  elements.statusBar.classList.add("statusbar-git-footer");
  document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());

  const row1 = make("div", "footer-line footer-line-main");
  row1.append(...payload.main.map(renderGitFooterPayloadMetric));

  const footerToggle = make("button", "footer-details-toggle", mobileFooterExpanded ? "Less" : "Details");
  footerToggle.type = "button";
  footerToggle.setAttribute("aria-expanded", mobileFooterExpanded ? "true" : "false");
  footerToggle.addEventListener("click", () => setMobileFooterExpanded(!mobileFooterExpanded));

  const row2 = make("div", "footer-line footer-line-meta");
  row2.append(...payload.meta.map((chip) => renderGitFooterPayloadMeta(chip, tab)), footerToggle);

  elements.statusBar.append(row1, row2);
  if (footerModelPickerOpen) elements.statusBar.append(renderFooterModelPicker());
  if (footerThinkingPickerOpen) elements.statusBar.append(renderFooterThinkingPicker());
  setMobileFooterExpanded(mobileFooterExpanded);
  updateFooterModelPickerPosition();
}

function gitFooterFallbackMessage() {
  if (isOptionalFeatureDisabled("gitFooterStatus")) return "";
  const tabContext = activeTabContext();
  const commandsStillLoading = availableCommands.length === 0 && rawAvailableCommands.length === 0;
  const footerRefreshPending = tabContext.tabId ? gitFooterPayloadRefreshInFlightByTab.has(tabContext.tabId) : false;
  const extensionDetected = hasAvailableCommand("git-footer-refresh") || optionalFeatureAvailability.gitFooterStatus;
  return commandsStillLoading || footerRefreshPending || extensionDetected
    ? "Loading git footer status…"
    : "Git footer status extension unavailable";
}

function renderMinimalFooter() {
  hideFooterTooltip();
  const tab = activeTab();
  const workspaceLabel = latestWorkspace?.displayCwd || (tab?.cwd ? normalizeDisplayPath(tab.cwd) : "loading…");
  const modelLine = footerModelLine();
  const footerMessage = gitFooterFallbackMessage();

  elements.statusBar.replaceChildren();
  elements.statusBar.classList.remove("statusbar-git-footer");
  elements.statusBar.classList.add("statusbar-tui-footer");
  document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());
  elements.statusBar.append(renderTuiFooterLine({
    cwd: workspaceLabel,
    cwdTitle: tab ? `Change cwd for ${tab.title}: ${workspaceLabel}` : undefined,
    message: footerMessage,
    stats: fallbackFooterStats(),
    model: modelLine,
  }));
  if (footerModelPickerOpen) elements.statusBar.append(renderFooterModelPicker());
  if (footerThinkingPickerOpen) elements.statusBar.append(renderFooterThinkingPicker());
  setMobileFooterExpanded(false);
  updateFooterModelPickerPosition();
}

function setFooterModelPickerOpen(open) {
  footerModelPickerOpen = !!open;
  if (footerModelPickerOpen) footerThinkingPickerOpen = false;
  if (footerModelPickerOpen && isMobileView()) {
    mobileFooterExpanded = false;
    document.body.classList.remove("footer-details-expanded");
    setComposerActionsOpen(false);
    setMobileTabsExpanded(false);
  }
  document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());
  renderFooter();
  updateFooterModelPickerPosition();
}

function setFooterThinkingPickerOpen(open) {
  footerThinkingPickerOpen = !!open;
  if (footerThinkingPickerOpen) footerModelPickerOpen = false;
  if (footerThinkingPickerOpen && isMobileView()) {
    mobileFooterExpanded = false;
    document.body.classList.remove("footer-details-expanded");
    setComposerActionsOpen(false);
    setMobileTabsExpanded(false);
  }
  document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());
  renderFooter();
  updateFooterModelPickerPosition();
}

async function applyFooterModel(model) {
  if (!model?.provider || !model?.id) return;
  const tabContext = activeTabContext();
  try {
    footerModelPickerOpen = false;
    const response = await api("/api/model", { method: "POST", body: { provider: model.provider, modelId: model.id }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    applyOptimisticModelSelection(response.data || model, tabContext);
    await refreshState(tabContext);
    await refreshModels(tabContext);
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  } finally {
    if (isCurrentTabContext(tabContext)) {
      document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());
      renderFooter();
    }
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

async function applyFooterThinking(level) {
  const nextLevel = String(level || "").trim();
  if (!nextLevel) return;
  const tabContext = activeTabContext();
  try {
    footerThinkingPickerOpen = false;
    const response = await api("/api/thinking", { method: "POST", body: { level: nextLevel }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    applyOptimisticThinkingSelection(response.data || { level: nextLevel }, tabContext);
    if (response.data?.pending) {
      addEvent(response.data.message || `Thinking effort ${response.data.level || nextLevel} will apply to the next prompt.`, "info");
    } else if (response.data?.level) {
      const requested = response.data.requestedLevel;
      const effective = response.data.level;
      addEvent(requested && requested !== effective ? `Thinking effort set to ${effective} (requested ${requested}).` : `Thinking effort set to ${effective}.`, "info");
    }
    await refreshState(tabContext);
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  } finally {
    if (isCurrentTabContext(tabContext)) {
      document.body.classList.toggle("footer-model-picker-open", isFooterPickerOpen());
      renderFooter();
    }
  }
}

function renderFooterThinkingPicker() {
  const picker = make("div", "footer-model-picker footer-thinking-picker");
  picker.setAttribute("role", "listbox");
  picker.setAttribute("aria-label", "Thinking effort");
  picker.append(make("div", "footer-model-picker-title", "Thinking effort"));
  picker.append(make("div", "footer-model-picker-source", "Applies to this Pi tab."));
  const current = currentState?.pendingThinkingLevel || currentState?.thinkingLevel || "off";
  for (const level of footerThinkingLevels()) {
    const selected = current === level;
    const button = make("button", `footer-model-option${selected ? " active" : ""}`);
    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.title = `Set thinking effort to ${level}`;
    button.append(make("span", "footer-model-option-main", footerThinkingLevelLabel(level)));
    button.addEventListener("click", () => applyFooterThinking(level));
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

function pathPickerCreateName() {
  return elements.pathPickerCreateNameInput.value.trim();
}

function pathPickerCreateValidationError(name = pathPickerCreateName()) {
  if (!name) return "Enter a directory name.";
  if (name === "." || name === "..") return "Use a real directory name, not . or ..";
  if (name.includes("\u0000")) return "Directory names cannot contain null bytes.";
  if (/[\\/]/.test(name)) return "Create one directory at a time; do not include path separators.";
  return "";
}

function updateCreateDirectoryControls() {
  const busy = !!pathPickerState?.creatingDirectory;
  const loading = !!pathPickerState?.loading;
  const canCreate = !!pathPickerState?.cwd && !loading && !busy && !!pathPickerCreateName();
  elements.pathPickerCreateNameInput.disabled = !pathPickerState || loading || busy;
  elements.pathPickerCreateButton.disabled = !canCreate;
  elements.pathPickerCreateButton.textContent = busy ? "Creating…" : "Create directory";
}

function pathPickerSearchQuery() {
  return elements.pathPickerSearchInput.value.trim().toLowerCase();
}

function updatePathPickerSearchControls() {
  const loading = !!pathPickerState?.loading;
  const hasDirectory = !!pathPickerState?.cwd;
  const hasQuery = !!pathPickerSearchQuery();
  elements.pathPickerSearchInput.disabled = !pathPickerState || loading || !hasDirectory;
  elements.pathPickerClearSearchButton.hidden = !hasQuery;
  elements.pathPickerClearSearchButton.disabled = loading || !hasQuery;
}

function pathPickerDirectoryMatchesSearch(directory, query) {
  if (!query) return true;
  const haystack = String(directory?.name || "").toLowerCase();
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function renderPathPickerDirectoryList() {
  if (!pathPickerState) return;
  const directories = Array.isArray(pathPickerState.directories) ? pathPickerState.directories : [];
  const query = pathPickerSearchQuery();
  const matches = directories.filter((directory) => pathPickerDirectoryMatchesSearch(directory, query));
  pathPickerState.filteredDirectories = matches;
  updatePathPickerSearchControls();
  elements.pathPickerList.replaceChildren();

  if (query) {
    elements.pathPickerSearchStatus.textContent = matches.length === directories.length
      ? `Showing all ${matches.length} director${matches.length === 1 ? "y" : "ies"}.`
      : `Showing ${matches.length} of ${directories.length} directories.`;
  } else {
    elements.pathPickerSearchStatus.textContent = "";
  }

  if (!matches.length) {
    elements.pathPickerList.append(make("div", "path-picker-empty muted", query ? `No directories match “${elements.pathPickerSearchInput.value.trim()}”.` : "No subdirectories."));
    return;
  }

  for (const directory of matches) {
    const button = pathPickerButton(`${directory.name}/`, directory.cwd, () => loadPathPickerDirectory(directory.cwd), `path-picker-directory${directory.hidden ? " hidden-directory" : ""}`);
    button.setAttribute("role", "option");
    elements.pathPickerList.append(button);
  }
}

function clearPathPickerSearch({ focus = false } = {}) {
  elements.pathPickerSearchInput.value = "";
  renderPathPickerDirectoryList();
  if (focus) elements.pathPickerSearchInput.focus();
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
  pathPickerState.loading = false;
  pathPickerState.directories = Array.isArray(data.directories) ? data.directories : [];
  pathPickerState.filteredDirectories = pathPickerState.directories;
  elements.pathPickerCurrent.textContent = data.displayCwd || data.cwd;
  elements.pathPickerCurrent.title = data.cwd;
  elements.pathPickerChooseButton.disabled = false;
  elements.pathPickerChooseButton.textContent = "Use this directory";
  elements.pathPickerCreateNameInput.value = "";
  elements.pathPickerSearchInput.value = "";
  setPathPickerError(data.truncated ? "Showing the first 500 directories." : "");
  updateCreateDirectoryControls();
  renderFastPicks();

  elements.pathPickerRoots.replaceChildren();
  if (data.parent) {
    elements.pathPickerRoots.append(pathPickerButton("↑ Parent", data.parent, () => loadPathPickerDirectory(data.parent), "path-picker-root-button"));
  }
  for (const root of data.roots || []) {
    elements.pathPickerRoots.append(pathPickerButton(root.label, root.cwd, () => loadPathPickerDirectory(root.cwd), "path-picker-root-button"));
  }

  renderPathPickerDirectoryList();
}

async function loadPathPickerDirectory(cwd) {
  if (!pathPickerState) return;
  const requestId = ++pathPickerState.requestId;
  pathPickerState.loading = true;
  elements.pathPickerAddFastPickButton.disabled = true;
  elements.pathPickerChooseButton.disabled = true;
  elements.pathPickerCurrent.textContent = "Loading…";
  elements.pathPickerSearchStatus.textContent = "";
  updateCreateDirectoryControls();
  updatePathPickerSearchControls();
  setPathPickerError("");

  try {
    const query = cwd ? `?path=${encodeURIComponent(cwd)}` : "";
    const response = await api(`/api/directories${query}`);
    if (!pathPickerState || pathPickerState.requestId !== requestId) return;
    renderPathPicker(response.data || {});
  } catch (error) {
    if (!pathPickerState || pathPickerState.requestId !== requestId) return;
    pathPickerState.loading = false;
    elements.pathPickerChooseButton.disabled = false;
    elements.pathPickerCurrent.textContent = pathPickerState.cwd || "Unable to load directory";
    setPathPickerError(error.message);
    updateCreateDirectoryControls();
    updatePathPickerSearchControls();
    updateAddFastPickButton();
  }
}

async function createPathPickerDirectory() {
  const state = pathPickerState;
  if (!state?.cwd || state.loading || state.creatingDirectory) return;
  const name = pathPickerCreateName();
  const validationError = pathPickerCreateValidationError(name);
  if (validationError) {
    setPathPickerError(validationError);
    elements.pathPickerCreateNameInput.focus();
    return;
  }

  const requestId = ++state.requestId;
  state.creatingDirectory = true;
  updateCreateDirectoryControls();
  setPathPickerError("");
  try {
    const response = await api("/api/directories", { method: "POST", body: { parent: state.cwd, name } });
    if (!pathPickerState || pathPickerState !== state || state.requestId !== requestId) return;
    renderPathPicker(response.data || {});
    elements.pathPickerChooseButton.focus({ preventScroll: true });
  } catch (error) {
    if (!pathPickerState || pathPickerState !== state || state.requestId !== requestId) return;
    setPathPickerError(error.message);
    elements.pathPickerCreateNameInput.focus();
  } finally {
    if (pathPickerState === state) {
      state.creatingDirectory = false;
      updateCreateDirectoryControls();
    }
  }
}

function closePathPicker(cwd) {
  const state = pathPickerState;
  if (!state) return;
  pathPickerState = null;
  if (elements.pathPickerDialog.open) elements.pathPickerDialog.close();
  state.resolve(cwd || null);
}

function pickCwd(tab, initialCwd, { title } = {}) {
  if (pathPickerState) return Promise.resolve(null);

  return new Promise((resolve) => {
    const pickerTab = tab || { id: "path-picker", title: "tab" };
    pathPickerState = { tabId: pickerTab.id, cwd: initialCwd, requestId: 0, loading: false, creatingDirectory: false, directories: [], filteredDirectories: [], resolve };
    elements.pathPickerTitle.textContent = title || `Choose CWD for ${pickerTab.title}`;
    elements.pathPickerCurrent.textContent = "Loading…";
    elements.pathPickerCreateNameInput.value = "";
    elements.pathPickerSearchInput.value = "";
    elements.pathPickerSearchStatus.textContent = "";
    elements.pathPickerFastPicks.replaceChildren();
    elements.pathPickerRoots.replaceChildren();
    elements.pathPickerList.replaceChildren();
    setPathPickerError("");
    elements.pathPickerAddFastPickButton.disabled = true;
    elements.pathPickerChooseButton.disabled = true;
    updateCreateDirectoryControls();
    updatePathPickerSearchControls();
    initializeFastPicks().catch((error) => addEvent(`failed to initialize path fast picks: ${error.message}`, "error"));
    elements.pathPickerDialog.showModal();
    loadPathPickerDirectory(initialCwd);
  });
}

async function changeActiveTabCwd() {
  const tab = activeTab();
  if (!tab) return;
  const tabContext = activeTabContext(tab.id);

  const currentCwd = latestWorkspace?.cwd || tab.cwd || "";
  const cwd = await pickCwd(tab, currentCwd);
  if (!isCurrentTabContext(tabContext) || !cwd || cwd === currentCwd) return;
  if (!window.confirm(`Restart ${tab.title} in:\n${cwd}\n\nCurrent in-flight work in this tab will be stopped.`)) return;

  saveActiveDraft();
  try {
    const response = await api(`/api/tabs/${encodeURIComponent(tab.id)}`, { method: "PATCH", body: { cwd }, scoped: false });
    tabs = response.data?.tabs || tabs;
    syncTabMetadata(tabs);
    if (!isCurrentTabContext(tabContext)) {
      renderTabs();
      return;
    }
    const nextContext = setActiveTabId(response.data?.tab?.id || activeTabId);
    resetGitWorkflowForTab(nextContext.tabId);
    resetActiveTabUi();
    renderTabs();
    restoreActiveDraft();
    connectEvents(nextContext);
    await refreshAll(nextContext);
    if (!isCurrentTabContext(nextContext)) return;
    const changedCwd = response.data?.tab?.cwd || cwd;
    addEvent(response.data?.changed === false ? `cwd unchanged: ${changedCwd}` : `changed ${tab.title} cwd to ${changedCwd}`, "info");
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  }
}

function renderFooter() {
  const gitFooterPayload = parseGitFooterWebuiPayload();
  if (gitFooterPayload) {
    renderGitFooterPayload(footerPayloadWithLiveModel(gitFooterPayload));
    return;
  }
  renderMinimalFooter();
}

function scheduleRefreshMessages(delay = 120, tabContext = activeTabContext()) {
  clearTimeout(refreshMessagesTimer);
  refreshMessagesTimer = setTimeout(() => {
    if (!isCurrentTabContext(tabContext)) return;
    refreshMessages(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
    });
  }, delay);
}

function scheduleRefreshState(delay = 120, tabContext = activeTabContext()) {
  clearTimeout(refreshStateTimer);
  refreshStateTimer = setTimeout(() => {
    if (!isCurrentTabContext(tabContext)) return;
    refreshState(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
    });
  }, delay);
}

function scheduleRefreshFooter(delay = 300, tabContext = activeTabContext()) {
  clearTimeout(refreshFooterTimer);
  refreshFooterTimer = setTimeout(() => {
    if (!isCurrentTabContext(tabContext)) return;
    refreshFooterData(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
    });
  }, delay);
}

function formatCodexPlanType(value) {
  const text = String(value || "").trim();
  if (!text) return "unknown plan";
  return text.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCodexPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.max(0, Math.min(100, Math.round(number)))}%` : "—";
}

function codexWindowDurationMinutes(window) {
  const minutes = Number(window?.windowDurationMins);
  if (Number.isFinite(minutes) && minutes > 0) return minutes;
  const seconds = Number(window?.windowDurationSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds / 60 : null;
}

function formatCodexWindowDuration(window) {
  const minutes = codexWindowDurationMinutes(window);
  if (!minutes) return "window";
  if (minutes >= 280 && minutes <= 320) return "5h window";
  if (minutes >= 9500 && minutes <= 10550) return "weekly window";
  if (minutes >= 60 * 24) {
    const days = minutes / (60 * 24);
    return `${days >= 10 ? Math.round(days) : Number(days.toFixed(1))}d window`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(1))}h window`;
  }
  return `${Math.round(minutes)}m window`;
}

function formatDurationParts(milliseconds) {
  if (!Number.isFinite(Number(milliseconds))) return "now";
  const totalMinutes = Math.max(0, Math.ceil(Number(milliseconds) / 60000));
  if (totalMinutes <= 1) return "<1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

function codexWindowResetDate(window) {
  const resetAt = window?.resetsAt ? new Date(window.resetsAt) : null;
  if (resetAt && Number.isFinite(resetAt.getTime())) return resetAt;
  const resetAfterSeconds = Number(window?.resetAfterSeconds);
  if (Number.isFinite(resetAfterSeconds) && resetAfterSeconds >= 0) return new Date(Date.now() + resetAfterSeconds * 1000);
  return null;
}

function formatCodexReset(window) {
  const resetDate = codexWindowResetDate(window);
  if (!resetDate) return "reset unknown";
  const diff = resetDate.getTime() - Date.now();
  if (diff <= 0) return "resetting now";
  return `resets in ${formatDurationParts(diff)}`;
}

function codexSnapshotName(snapshot) {
  return snapshot?.limitName || snapshot?.limitId || "codex";
}

function codexUsageBuckets(data) {
  const buckets = [];
  const selected = data?.selected || data?.rateLimits || null;
  const snapshots = Array.isArray(data?.snapshots) ? data.snapshots : selected ? [selected] : [];
  const selectedKey = selected?.limitId || selected?.limitName || "codex";
  const pushWindow = (snapshot, kind, window, { prefix } = {}) => {
    if (!window) return;
    const durationLabel = formatCodexWindowDuration(window);
    const baseLabel = kind === "secondary" && durationLabel === "window" ? "secondary window" : durationLabel;
    buckets.push({
      key: `${snapshot?.limitId || snapshot?.limitName || buckets.length}-${kind}`,
      label: prefix ? `${prefix} · ${baseLabel}` : baseLabel,
      window,
    });
  };

  if (selected) {
    pushWindow(selected, "primary", selected.primary);
    pushWindow(selected, "secondary", selected.secondary);
  }
  for (const snapshot of snapshots) {
    const key = snapshot?.limitId || snapshot?.limitName;
    if (!snapshot || snapshot === selected || key === selectedKey) continue;
    const name = codexSnapshotName(snapshot);
    pushWindow(snapshot, "primary", snapshot.primary, { prefix: name });
    pushWindow(snapshot, "secondary", snapshot.secondary, { prefix: name });
  }
  return buckets.slice(0, 6);
}

function renderCodexUsage() {
  const box = elements.codexUsageBox;
  if (!box) return;
  if (elements.refreshCodexUsageButton) {
    elements.refreshCodexUsageButton.disabled = codexUsageLoading;
    elements.refreshCodexUsageButton.textContent = codexUsageLoading ? "Refreshing…" : "Refresh usage";
  }

  box.replaceChildren();
  box.classList.toggle("muted", !latestCodexUsage);

  if (!latestCodexUsage && codexUsageLoading) {
    box.textContent = "Checking Codex usage…";
    return;
  }
  if (!latestCodexUsage && codexUsageError) {
    const title = make("div", "codex-usage-unavailable", "Usage unavailable");
    const detail = make("div", "codex-usage-detail", codexUsageError.message || String(codexUsageError));
    box.append(title, detail);
    return;
  }
  if (!latestCodexUsage) {
    box.textContent = "Codex usage has not loaded yet.";
    return;
  }

  const header = make("div", "codex-usage-summary");
  header.append(
    make("span", "codex-usage-plan", formatCodexPlanType(latestCodexUsage.planType)),
    make("span", "codex-usage-fetched", latestCodexUsage.fetchedAt ? `updated ${formatDurationParts(Date.now() - new Date(latestCodexUsage.fetchedAt).getTime())} ago` : "updated now"),
  );
  box.append(header);

  const buckets = codexUsageBuckets(latestCodexUsage);
  if (buckets.length === 0) {
    box.append(make("div", "codex-usage-detail", "No Codex rate-limit windows were returned."));
  } else {
    for (const bucket of buckets) {
      const usedPercent = Number(bucket.window?.usedPercent);
      const fillPercent = Number.isFinite(usedPercent) ? Math.max(0, Math.min(100, usedPercent)) : 0;
      const item = make("div", "codex-usage-bucket");
      const row = make("div", "codex-usage-row");
      row.append(
        make("span", "codex-usage-label", bucket.label),
        make("strong", "codex-usage-percent", formatCodexPercent(bucket.window?.usedPercent)),
      );
      const meter = make("div", "codex-usage-meter");
      const fill = make("span", "codex-usage-meter-fill");
      fill.style.width = `${fillPercent}%`;
      meter.append(fill);
      item.append(row, meter, make("div", "codex-usage-reset", formatCodexReset(bucket.window)));
      box.append(item);
    }
  }

  if (latestCodexUsage.rateLimitReachedType) {
    box.append(make("div", "codex-usage-warning", `Limit status: ${latestCodexUsage.rateLimitReachedType}`));
  }
  if (codexUsageError) {
    box.append(make("div", "codex-usage-detail", `Latest refresh failed: ${codexUsageError.message || codexUsageError}`));
  }
}

async function refreshCodexUsage({ forceAuthRefresh = false } = {}) {
  if (codexUsageLoading) return;
  codexUsageLoading = true;
  renderCodexUsage();
  try {
    const suffix = forceAuthRefresh ? "?refresh=1" : "";
    const response = await api(`/api/codex-usage${suffix}`, { scoped: false });
    latestCodexUsage = response.data || null;
    codexUsageError = null;
  } catch (error) {
    codexUsageError = error;
  } finally {
    codexUsageLoading = false;
    renderCodexUsage();
  }
}

function scheduleRefreshCodexUsage(delay = CODEX_USAGE_REFRESH_MS) {
  clearTimeout(refreshCodexUsageTimer);
  refreshCodexUsageTimer = setTimeout(() => {
    refreshCodexUsage().finally(() => scheduleRefreshCodexUsage());
  }, delay);
}

function initializeCodexUsage() {
  renderCodexUsage();
  refreshCodexUsage().finally(() => scheduleRefreshCodexUsage());
  clearInterval(codexUsageRenderTimer);
  codexUsageRenderTimer = setInterval(renderCodexUsage, CODEX_USAGE_RENDER_TICK_MS);
}

function renderStatus() {
  const state = currentState;
  updateComposerModeButtons();
  const running = state?.isStreaming ? "running" : "idle";
  const compacting = state?.isCompacting ? " · compacting" : "";

  elements.stateDetails.replaceChildren();
  const pendingThinkingLevel = state?.pendingThinkingLevel || null;
  const shownThinkingLevel = pendingThinkingLevel || state?.thinkingLevel;
  const thinkingDetail = pendingThinkingLevel && pendingThinkingLevel !== state?.thinkingLevel
    ? `${state?.thinkingLevel || "unknown"} → ${pendingThinkingLevel} next prompt`
    : state?.thinkingLevel || "unknown";
  const details = {
    Status: `${running}${compacting}`,
    Model: modelLabel(state?.model),
    Thinking: thinkingDetail,
    Session: state?.sessionName || state?.sessionId || "unknown",
    File: state?.sessionFile || "in-memory",
    Messages: String(state?.messageCount ?? "?"),
    Queue: String(state?.pendingMessageCount ?? 0),
    "Auto compact": state?.autoCompactionEnabled ? "on" : "off",
  };
  for (const [key, value] of Object.entries(details)) {
    elements.stateDetails.append(make("dt", undefined, key), make("dd", undefined, value));
  }

  if (shownThinkingLevel) elements.thinkingSelect.value = shownThinkingLevel;
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

function releaseDialogPromptParts(prompt) {
  const combined = [prompt.title, prompt.message].filter((part) => stripAnsi(part).trim()).join("\n").trimEnd();
  const lines = combined.split("\n");
  const questionIndex = lines.findIndex((line) => /^(Publish eligible packages now\?|Publish to AUR\?|Publish newly created\/converged AUR package\?)$/i.test(stripAnsi(line).trim()));
  const question = questionIndex === -1 ? "Publish eligible packages now?" : stripAnsi(lines[questionIndex]).trim();
  const isNpmReleasePrompt = /Release preflight summary:/i.test(combined) && /Publish eligible packages now\?/i.test(combined);
  const isAurReleasePrompt = /AUR release summary:/i.test(combined) && questionIndex !== -1;
  if (!isNpmReleasePrompt && !isAurReleasePrompt) return null;

  const summaryLines = questionIndex === -1 ? lines : [...lines.slice(0, questionIndex), ...lines.slice(questionIndex + 1)];
  const message = summaryLines.join("\n").replace(/\n+$/, "");
  return {
    title: question,
    message,
    plainMessage: stripAnsi(message),
    featureId: isAurReleasePrompt ? "releaseAur" : "releaseNpm",
  };
}

function releaseDialogLineClass(plainLine, section) {
  const text = plainLine.trim();
  if (!text) return "release-dialog-spacer";
  if (/^(Release preflight summary|AUR release summary|Version changes|Bump summary|Will publish|Will skip|Blocked|Other|Publish targets after confirmation|Missing local package dirs):$/i.test(text)) {
    return "release-dialog-heading";
  }
  if (/^none$/i.test(text)) return "release-dialog-muted";
  if (/->\s*error\b|\bfailed\b|\bmissing\b|\berrors?:\s*[1-9]/i.test(text) || /^blocked$/i.test(section)) return "release-dialog-danger";
  if (/publish-(?:first|update)|would bump up|first release/i.test(text) || /^(will publish|publish targets after confirmation)$/i.test(section)) return "release-dialog-success";
  if (/\bskip(?:ped)?\b|\bunchanged\b|would reduce down|already published/i.test(text) || /^will skip$/i.test(section)) return "release-dialog-warning";
  return "";
}

function renderReleaseDialogMessage(parent, text) {
  parent.replaceChildren();
  let section = "";
  for (const line of String(text || "").split("\n")) {
    const plainLine = stripAnsi(line);
    const heading = plainLine.trim().match(/^(Release preflight summary|Version changes|Bump summary|Will publish|Will skip|Blocked|Other|Publish targets after confirmation|Missing local package dirs):$/i);
    const rowClass = ["release-dialog-line", releaseDialogLineClass(plainLine, section)].filter(Boolean).join(" ");
    const row = make("span", rowClass);
    renderAnsiText(row, line || " ");
    parent.append(row);
    if (heading) section = heading[1].toLowerCase();
  }
}

function stripTodoProgressLines(text, { streaming = false } = {}) {
  if (!isOptionalFeatureEnabled("todoProgressWidget")) return String(text || "");
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

  const tabId = activeTabId || "default";
  const node = make("details", "widget todo-widget");
  node.open = todoProgressWidgetExpandedByTab.get(tabId) === true;
  node.setAttribute("aria-label", "Todo progress");
  node.addEventListener("toggle", () => {
    todoProgressWidgetExpandedByTab.set(tabId, node.open);
  });

  const percent = todo.total > 0 ? Math.max(0, Math.min(100, (todo.done / todo.total) * 100)) : 0;
  const summary = make("summary", "todo-widget-summary");
  const header = make("div", "todo-widget-header");
  header.append(
    make("span", "todo-widget-toggle", "›"),
    make("span", "todo-widget-title", "Todo progress"),
    make("span", "todo-widget-count", `${todo.done}/${todo.total}`),
    make("span", "todo-widget-meta", todo.partial ? `${todo.partial} partial` : "active"),
  );

  const progress = make("div", "todo-widget-progress");
  const fill = make("span", "todo-widget-progress-fill");
  fill.style.width = `${percent}%`;
  progress.append(fill);
  summary.append(header, progress);

  const body = make("div", "todo-widget-body");
  const list = make("ol", "todo-widget-list");
  for (const item of todo.items) {
    const row = make("li", `todo-widget-item ${item.status}`);
    row.append(
      make("span", "todo-widget-marker", item.status === "done" ? "✓" : item.status === "partial" ? "–" : ""),
      make("span", "todo-widget-text", item.text),
    );
    list.append(row);
  }
  if (todo.items.length) body.append(list);
  if (todo.footer) body.append(make("div", "todo-widget-footer", todo.footer));

  node.append(summary);
  if (body.children.length) node.append(body);
  return node;
}

function getWidgetLines(key) {
  const value = widgets.get(key);
  return Array.isArray(value?.widgetLines) ? value.widgetLines : [];
}

function releaseNpmFooterDetails(lines) {
  const primary = cleanStatusText(lines[0] || "").replace(/^release-(?:npm|aur):\s*/i, "");
  const parts = primary.split(/\s+·\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    phase: parts[0] || "release workflow",
    mode: parts[1] || "",
    elapsed: parts[2] || "",
    controls: lines.slice(1).map(cleanStatusText).filter(Boolean).join(" · "),
  };
}

function releaseNpmLineTone(line) {
  const clean = stripAnsi(line).trim();
  if (/^\$\s+/.test(clean)) return "command";
  if (/^==>/.test(clean)) return "target";
  if (/^(PASS|✓|Published)\b/i.test(clean)) return "pass";
  if (/^(FAIL|ERROR|ERR|✗)\b/i.test(clean)) return "fail";
  if (/^(WARN|warning)\b/i.test(clean)) return "warn";
  if (/^(INFO|npm notice|notice)\b/i.test(clean)) return "info";
  if (/^RELEASE_NPM_EVENT\b/.test(clean)) return "event";
  return "";
}

function appendReleaseNpmTerminalLine(parent, line) {
  const tone = releaseNpmLineTone(line);
  const row = make("div", `release-npm-line${tone ? ` ${tone}` : ""}`);
  if (String(line ?? "") === "") row.textContent = "\u00a0";
  else renderAnsiText(row, line);
  parent.append(row);
}

async function sendReleaseNpmCommand(command) {
  const tabContext = activeTabContext();
  try {
    await api("/api/prompt", { method: "POST", body: { message: command }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    addEvent(`${command} sent`, "info");
    scheduleRefreshState(120, tabContext);
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: command, content: error.message, level: "error" });
    }
  }
}

function releaseNpmActionButton(label, command, className = "") {
  const button = make("button", `release-npm-action ${className}`.trim(), label);
  button.type = "button";
  button.addEventListener("click", () => sendReleaseNpmCommand(command));
  return button;
}

function releaseNpmStreamHeader(label, lineCount, { live = false } = {}) {
  const header = make("div", "release-npm-stream-header");
  const safeLineCount = Math.max(0, Number(lineCount) || 0);
  header.append(
    make("span", `release-npm-stream-dot${live ? " live" : ""}`),
    make("span", "release-npm-stream-title", label),
    make("span", "release-npm-stream-count", `${safeLineCount} line${safeLineCount === 1 ? "" : "s"}`),
  );
  return header;
}

function renderReleaseNpmOutputDetails(key, streamHeader, terminal, controls = null) {
  const tabId = activeTabId || "default";
  const stateKey = `${tabId}:${key}`;
  const node = make("details", "release-npm-output-details");
  node.open = releaseNpmOutputExpandedByTab.get(stateKey) !== false;
  node.addEventListener("toggle", () => {
    releaseNpmOutputExpandedByTab.set(stateKey, node.open);
    if (node.open) requestAnimationFrame(() => { terminal.scrollTop = terminal.scrollHeight; });
  });

  const summary = make("summary", "release-npm-output-summary");
  summary.title = "Expand or collapse command output in the Web UI";
  const toggle = make("span", "release-npm-output-toggle", "›");
  toggle.setAttribute("aria-hidden", "true");
  summary.append(toggle, streamHeader);
  node.append(summary, terminal);
  if (controls) node.append(controls);
  return node;
}

function renderReleaseNpmOutputWidget() {
  if (!isOptionalFeatureEnabled("releaseNpm")) return null;
  const outputLines = getWidgetLines("release-npm:output");
  const footerLines = getWidgetLines("release-npm:footer");
  if (outputLines.length === 0 && footerLines.length === 0) return null;

  const details = releaseNpmFooterDetails(footerLines);
  const node = make("section", "widget release-npm-widget release-npm-live-widget");
  node.setAttribute("aria-label", "npm release output");

  const header = make("div", "release-npm-header");
  const titleWrap = make("div", "release-npm-title-wrap");
  titleWrap.append(make("span", "release-npm-kicker", "npm release"), make("strong", "release-npm-title", details.phase));

  const meta = make("div", "release-npm-meta");
  if (details.mode) meta.append(make("span", "release-npm-pill", details.mode));
  if (details.elapsed) meta.append(make("span", "release-npm-pill elapsed", details.elapsed));

  const actions = make("div", "release-npm-actions");
  actions.append(
    releaseNpmActionButton("Toggle output", "/release-toggle"),
    releaseNpmActionButton("Abort", "/release-abort", "danger"),
  );
  header.append(titleWrap, meta, actions);

  const streamLines = outputLines.length ? outputLines : ["Waiting for release output..."];
  const streamHeader = releaseNpmStreamHeader("Live output stream", outputLines.length, { live: true });
  const terminal = make("div", "release-npm-terminal");
  terminal.setAttribute("role", "log");
  terminal.setAttribute("aria-live", "polite");
  for (const line of streamLines) {
    appendReleaseNpmTerminalLine(terminal, line);
  }

  const controls = make("div", "release-npm-controls", details.controls || "Controls: /release-toggle expands/collapses · /release-abort stops subprocess");
  const outputDetails = renderReleaseNpmOutputDetails("release-npm:output", streamHeader, terminal, controls);
  node.append(header, outputDetails);
  requestAnimationFrame(() => { if (outputDetails.open) terminal.scrollTop = terminal.scrollHeight; });
  return node;
}

function renderReleaseNpmLogWidget() {
  if (!isOptionalFeatureEnabled("releaseNpm")) return null;
  const lines = getWidgetLines("release-npm:logs");
  if (lines.length === 0) return null;

  const node = make("section", "widget release-npm-widget release-npm-log-widget");
  node.setAttribute("aria-label", "npm release log");
  const header = make("div", "release-npm-header");
  const titleWrap = make("div", "release-npm-title-wrap");
  titleWrap.append(
    make("span", "release-npm-kicker", "saved log"),
    make("strong", "release-npm-title", stripAnsi(lines[0] || "release-npm log")),
  );
  const meta = make("div", "release-npm-meta");
  if (lines[1]) meta.append(make("span", "release-npm-pill", stripAnsi(lines[1])));
  const actions = make("div", "release-npm-actions");
  actions.append(releaseNpmActionButton("Close log", "/release-npm-logs close"));
  header.append(titleWrap, meta, actions);

  const logLines = lines.slice(2).filter((line, index) => index > 0 || stripAnsi(line).trim());
  const streamHeader = releaseNpmStreamHeader("Saved output stream", logLines.length);
  const terminal = make("div", "release-npm-terminal");
  for (const line of logLines) {
    appendReleaseNpmTerminalLine(terminal, line);
  }
  const outputDetails = renderReleaseNpmOutputDetails("release-npm:logs", streamHeader, terminal);
  node.append(header, outputDetails);
  requestAnimationFrame(() => { if (outputDetails.open) terminal.scrollTop = terminal.scrollHeight; });
  return node;
}

function renderReleaseAurOutputWidget() {
  if (!isOptionalFeatureEnabled("releaseAur")) return null;
  const outputLines = getWidgetLines("release-aur:output");
  const footerLines = getWidgetLines("release-aur:footer");
  if (outputLines.length === 0 && footerLines.length === 0) return null;

  const details = releaseNpmFooterDetails(footerLines);
  const node = make("section", "widget release-npm-widget release-aur-widget release-aur-live-widget");
  node.setAttribute("aria-label", "AUR release output");

  const header = make("div", "release-npm-header");
  const titleWrap = make("div", "release-npm-title-wrap");
  titleWrap.append(make("span", "release-npm-kicker", "AUR release"), make("strong", "release-npm-title", details.phase));

  const meta = make("div", "release-npm-meta");
  if (details.mode) meta.append(make("span", "release-npm-pill", details.mode));
  if (details.elapsed) meta.append(make("span", "release-npm-pill elapsed", details.elapsed));

  const actions = make("div", "release-npm-actions");
  actions.append(
    releaseNpmActionButton("Toggle output", "/release-aur toggle"),
    releaseNpmActionButton("Abort", "/release-aur abort", "danger"),
  );
  header.append(titleWrap, meta, actions);

  const streamLines = outputLines.length ? outputLines : ["Waiting for release-aur output..."];
  const streamHeader = releaseNpmStreamHeader("Live AUR output stream", outputLines.length, { live: true });
  const terminal = make("div", "release-npm-terminal");
  terminal.setAttribute("role", "log");
  terminal.setAttribute("aria-live", "polite");
  for (const line of streamLines) {
    appendReleaseNpmTerminalLine(terminal, line);
  }

  const controls = make("div", "release-npm-controls", details.controls || "Controls: /release-aur toggle expands/collapses · /release-aur abort stops subprocess");
  const outputDetails = renderReleaseNpmOutputDetails("release-aur:output", streamHeader, terminal, controls);
  node.append(header, outputDetails);
  requestAnimationFrame(() => { if (outputDetails.open) terminal.scrollTop = terminal.scrollHeight; });
  return node;
}

function renderReleaseAurLogWidget() {
  if (!isOptionalFeatureEnabled("releaseAur")) return null;
  const lines = getWidgetLines("release-aur:logs");
  if (lines.length === 0) return null;

  const node = make("section", "widget release-npm-widget release-aur-widget release-aur-log-widget");
  node.setAttribute("aria-label", "AUR release log");
  const header = make("div", "release-npm-header");
  const titleWrap = make("div", "release-npm-title-wrap");
  titleWrap.append(
    make("span", "release-npm-kicker", "saved AUR log"),
    make("strong", "release-npm-title", stripAnsi(lines[0] || "release-aur log")),
  );
  const meta = make("div", "release-npm-meta");
  if (lines[1]) meta.append(make("span", "release-npm-pill", stripAnsi(lines[1])));
  const actions = make("div", "release-npm-actions");
  actions.append(releaseNpmActionButton("Close log", "/release-aur logs close"));
  header.append(titleWrap, meta, actions);

  const logLines = lines.slice(2).filter((line, index) => index > 0 || stripAnsi(line).trim());
  const streamHeader = releaseNpmStreamHeader("Saved AUR output stream", logLines.length);
  const terminal = make("div", "release-npm-terminal");
  for (const line of logLines) {
    appendReleaseNpmTerminalLine(terminal, line);
  }
  const outputDetails = renderReleaseNpmOutputDetails("release-aur:logs", streamHeader, terminal);
  node.append(header, outputDetails);
  requestAnimationFrame(() => { if (outputDetails.open) terminal.scrollTop = terminal.scrollHeight; });
  return node;
}

function activeAppRunnerData() {
  return activeTabId ? appRunnerDataByTab.get(activeTabId) || { runners: [], activeRun: null } : { runners: [], activeRun: null };
}

function setAppRunnerData(tabId, data = {}) {
  if (!tabId) return;
  const previous = appRunnerDataByTab.get(tabId) || { runners: [], activeRun: null, customRunnerConfig: null };
  appRunnerDataByTab.set(tabId, {
    cwd: data.cwd || previous.cwd || "",
    runners: Array.isArray(data.runners) ? data.runners : previous.runners || [],
    customRunnerConfig: data.customRunnerConfig || previous.customRunnerConfig || null,
    activeRun: Object.prototype.hasOwnProperty.call(data, "activeRun") ? data.activeRun : previous.activeRun || null,
  });
}

function appRunnerIsRunning(run) {
  return run?.status === "running" || run?.stopping === true;
}

function appRunnerStatusLabel(run) {
  if (run?.stopping && run.status === "running") return "stopping";
  if (run?.status === "done") return "exit 0";
  if (run?.status === "failed") return run.signal ? `signal ${run.signal}` : `exit ${run.exitCode ?? "?"}`;
  if (run?.status === "error") return "error";
  return run?.status || "running";
}

function appRunnerElapsedLabel(run) {
  const startedAt = Date.parse(run?.startedAt || "");
  if (!Number.isFinite(startedAt)) return "";
  const endedAt = Date.parse(run?.endedAt || "");
  const end = Number.isFinite(endedAt) ? endedAt : Date.now();
  return formatDuration(end - startedAt);
}

function appRunnerActionButton(label, handler, className = "") {
  const button = make("button", `release-npm-action ${className}`.trim(), label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

async function refreshAppRunners(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/app-runners", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  setAppRunnerData(tabContext.tabId, response.data || {});
  renderAppRunnerControls();
  renderWidgets();
}

async function runAppRunner(runnerId) {
  const tabContext = activeTabContext();
  if (!tabContext.tabId || !runnerId) return;
  setComposerActionsOpen(false);
  setAppRunnerMenuOpen(false);
  try {
    const response = await api("/api/app-runner", { method: "POST", body: { runnerId }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    setAppRunnerData(tabContext.tabId, response.data || {});
    renderAppRunnerControls();
    renderWidgets();
    const command = response.data?.activeRun?.displayCommand || "app runner";
    addEvent(`started ${command}`, "info");
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
}

async function stopAppRunner() {
  const tabContext = activeTabContext();
  if (!tabContext.tabId) return;
  try {
    const response = await api("/api/app-runner/stop", { method: "POST", body: {}, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    setAppRunnerData(tabContext.tabId, response.data || {});
    renderAppRunnerControls();
    renderWidgets();
    addEvent("app runner stop requested", "warn");
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
}

async function clearAppRunner() {
  const tabContext = activeTabContext();
  if (!tabContext.tabId) return;
  try {
    const response = await api("/api/app-runner/clear", { method: "POST", body: {}, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    setAppRunnerData(tabContext.tabId, response.data || {});
    renderAppRunnerControls();
    renderWidgets();
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
}

function appRunnerOutputText(run) {
  const lines = Array.isArray(run?.lines) ? run.lines : [];
  return lines.join("\n").trimEnd();
}

async function copyAppRunnerOutput(run) {
  const text = appRunnerOutputText(run);
  if (!text.trim()) {
    addEvent("app runner output is empty", "warn");
    return;
  }
  try {
    await copyText(text);
    addEvent("copied app runner output", "info");
  } catch (error) {
    addEvent(`app runner output copy failed: ${error.message || String(error)}`, "warn");
  }
}

const APP_RUNNER_SUPPORTED_ITEMS = [
  "Project-local custom runners from .pi-webui-runners.json",
  "package.json scripts: bun/npm/pnpm/yarn dev, start, serve",
  "npx frameworks: Vite, Next, Astro, Storybook",
  "Rust: cargo run",
  "Python: uv run or python entry files such as Main.py, main.py, src/main.py",
  "Go/Golang: go run",
  "Zig: zig build run or zig run",
  "C/C++: CMake, cc/c++ main files",
  "Docker Compose: docker compose up",
  "Shell scripts: bash/zsh/fish in root, dev/, scripts/, dev/scripts/",
  "Deno, make, just, and plain Node entry files",
];
const APP_RUNNER_SUPPORTED_TOOLTIP = [
  "No app runner detected for this tab cwd.",
  "",
  "Currently supported:",
  ...APP_RUNNER_SUPPORTED_ITEMS.map((item) => `• ${item}`),
].join("\n");

function appRunnerMenuCanOpen() {
  const data = activeAppRunnerData();
  return Array.isArray(data.runners) && data.runners.length > 0 && !appRunnerIsRunning(data.activeRun);
}

function activeAppRunnerCustomConfig() {
  return activeAppRunnerData().customRunnerConfig || { runners: [], projectRoot: "", displayProjectRoot: "", displayConfigFile: "" };
}

function resetAppRunnerCustomDraft() {
  appRunnerCustomDraft = { id: "", label: "", command: "./", path: "", args: "" };
  appRunnerFileBrowserState = { open: false, loading: false, path: "", data: null, error: "" };
}

function appRunnerRelativeDir(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function appRunnerCustomArgsText(args) {
  return Array.isArray(args) ? args.join(" ") : String(args || "");
}

function appRunnerCustomDraftPayload() {
  return {
    id: appRunnerCustomDraft.id || undefined,
    label: appRunnerCustomDraft.label.trim(),
    command: appRunnerCustomDraft.command.trim() || "./",
    path: appRunnerCustomDraft.path.trim(),
    args: appRunnerCustomDraft.args.trim(),
  };
}

function updateAppRunnerCustomDraftFrom(container) {
  if (!container) return;
  appRunnerCustomDraft = {
    id: appRunnerCustomDraft.id || "",
    label: container.querySelector("#appRunnerCustomLabelInput")?.value || "",
    command: container.querySelector("#appRunnerCustomCommandInput")?.value || "./",
    path: container.querySelector("#appRunnerCustomPathInput")?.value || "",
    args: container.querySelector("#appRunnerCustomArgsInput")?.value || "",
  };
}

function appRunnerInputField({ id, label, value, placeholder = "", hint = "" }) {
  const field = make("label", "app-runner-custom-field");
  field.setAttribute("for", id);
  field.append(make("span", "", label));
  const input = make("input", "dialog-input");
  input.id = id;
  input.type = "text";
  input.value = value || "";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  field.append(input);
  if (hint) field.append(make("small", "muted", hint));
  input.addEventListener("input", () => updateAppRunnerCustomDraftFrom(field.closest(".app-runner-custom-form")));
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveAppRunnerCustomRunner(field.closest(".app-runner-custom-form"));
  });
  return { field, input };
}

async function saveAppRunnerCustomRunner(form) {
  updateAppRunnerCustomDraftFrom(form);
  const payload = appRunnerCustomDraftPayload();
  if (!payload.path) {
    addEvent("custom app runner path is required", "warn");
    form?.querySelector("#appRunnerCustomPathInput")?.focus();
    return;
  }
  const tabContext = activeTabContext();
  try {
    const response = await api("/api/app-runner-config", { method: "POST", body: { runner: payload }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    setAppRunnerData(tabContext.tabId, response.data || {});
    resetAppRunnerCustomDraft();
    renderAppRunnerControls();
    renderWidgets();
    renderAppRunnerInfoDialog();
    addEvent("saved custom app runner", "info");
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
}

async function deleteAppRunnerCustomRunner(id) {
  const tabContext = activeTabContext();
  try {
    const response = await api("/api/app-runner-config", { method: "DELETE", body: { id }, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    setAppRunnerData(tabContext.tabId, response.data || {});
    if (appRunnerCustomDraft.id === id) resetAppRunnerCustomDraft();
    renderAppRunnerControls();
    renderWidgets();
    renderAppRunnerInfoDialog();
    addEvent("deleted custom app runner", "warn");
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
}

async function loadAppRunnerFileBrowser(relativePath = "") {
  const tabContext = activeTabContext();
  const path = String(relativePath || "").replace(/^\.\/+/, "").replace(/\/+$/g, "");
  appRunnerFileBrowserState = { open: true, loading: true, path, data: null, error: "" };
  renderAppRunnerInfoDialog();
  try {
    const response = await api(`/api/app-runner-files?path=${encodeURIComponent(path)}`, { tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    appRunnerFileBrowserState = { open: true, loading: false, path, data: response.data || {}, error: "" };
    renderAppRunnerInfoDialog();
  } catch (error) {
    if (!isCurrentTabContext(tabContext)) return;
    appRunnerFileBrowserState = { open: true, loading: false, path, data: null, error: error.message || String(error) };
    renderAppRunnerInfoDialog();
  }
}

function renderAppRunnerFileBrowser() {
  if (!appRunnerFileBrowserState.open) return null;
  const browser = make("div", "app-runner-file-browser");
  if (appRunnerFileBrowserState.loading) {
    browser.append(make("div", "muted", "Loading project files…"));
    return browser;
  }
  if (appRunnerFileBrowserState.error) {
    browser.append(make("div", "path-picker-error", appRunnerFileBrowserState.error));
    return browser;
  }
  const data = appRunnerFileBrowserState.data || {};
  const header = make("div", "app-runner-file-browser-header");
  header.append(make("strong", "", data.displayRelativeDir || "."));
  const close = make("button", "app-runner-file-browser-close", "Hide browser");
  close.type = "button";
  close.addEventListener("click", () => {
    appRunnerFileBrowserState = { open: false, loading: false, path: "", data: null, error: "" };
    renderAppRunnerInfoDialog();
  });
  header.append(close);
  browser.append(header);

  const roots = make("div", "path-picker-roots app-runner-file-browser-roots");
  if (data.parent !== null && data.parent !== undefined) roots.append(pathPickerButton("↑ Parent", data.parent || ".", () => loadAppRunnerFileBrowser(data.parent || ""), "path-picker-root-button"));
  roots.append(pathPickerButton("Project root", data.displayProjectRoot || "Project root", () => loadAppRunnerFileBrowser(""), "path-picker-root-button"));
  browser.append(roots);

  const list = make("div", "path-picker-list app-runner-file-browser-list");
  const directories = Array.isArray(data.directories) ? data.directories : [];
  const files = Array.isArray(data.files) ? data.files : [];
  for (const directory of directories) {
    const button = pathPickerButton(`${directory.name}/`, directory.path, () => loadAppRunnerFileBrowser(directory.path), `path-picker-directory${directory.hidden ? " hidden-directory" : ""}`);
    list.append(button);
  }
  for (const file of files) {
    const button = pathPickerButton(file.name, file.path, () => {
      appRunnerCustomDraft.path = file.path;
      appRunnerFileBrowserState = { open: false, loading: false, path: "", data: null, error: "" };
      renderAppRunnerInfoDialog();
    }, `path-picker-directory app-runner-file-choice${file.hidden ? " hidden-directory" : ""}`);
    list.append(button);
  }
  if (!directories.length && !files.length) list.append(make("div", "path-picker-empty muted", "No files in this directory."));
  browser.append(list);
  if (data.truncated) browser.append(make("div", "path-picker-error", "Showing the first project entries only."));
  return browser;
}

function renderAppRunnerCustomSection() {
  const config = activeAppRunnerCustomConfig();
  const section = make("section", "app-runner-info-section app-runner-custom-section");
  const titleRow = make("div", "app-runner-section-title-row");
  titleRow.append(make("h3", "", "Custom project runners"));
  if (config.displayConfigFile) titleRow.append(make("code", "", config.displayConfigFile));
  section.append(titleRow);
  section.append(make("p", "muted", "Add project-local runners saved in .pi-webui-runners.json. Command defaults to ./, so a selected file runs as ./path/to/file."));

  const existing = make("div", "app-runner-custom-list");
  const customRunners = Array.isArray(config.runners) ? config.runners : [];
  if (!customRunners.length) {
    existing.append(make("div", "app-runner-custom-empty muted", "No custom runners saved for this project yet."));
  } else {
    for (const runner of customRunners) {
      const row = make("div", "app-runner-custom-item");
      const details = make("div", "app-runner-custom-item-details");
      details.append(make("strong", "", runner.label || runner.path || "custom runner"), make("code", "", runner.displayCommand || runner.path || ""));
      const actions = make("div", "app-runner-custom-item-actions");
      const edit = make("button", "", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        appRunnerCustomDraft = { id: runner.id || "", label: runner.label || "", command: runner.command || "./", path: runner.path || "", args: appRunnerCustomArgsText(runner.args) };
        appRunnerFileBrowserState = { open: false, loading: false, path: "", data: null, error: "" };
        renderAppRunnerInfoDialog();
      });
      const remove = make("button", "danger", "Delete");
      remove.type = "button";
      remove.addEventListener("click", () => {
        if (!confirm(`Delete custom app runner “${runner.label || runner.path || runner.id}”?`)) return;
        deleteAppRunnerCustomRunner(runner.id);
      });
      actions.append(edit, remove);
      row.append(details, actions);
      existing.append(row);
    }
  }
  section.append(existing);

  const form = make("div", "app-runner-custom-form");
  const labelField = appRunnerInputField({ id: "appRunnerCustomLabelInput", label: "Label", value: appRunnerCustomDraft.label, placeholder: "My app" });
  const commandField = appRunnerInputField({ id: "appRunnerCustomCommandInput", label: "Command", value: appRunnerCustomDraft.command || "./", placeholder: "./", hint: "Use ./ to execute the selected file directly, or use bash, python3, node, bun, uv run, etc." });
  const pathField = appRunnerInputField({ id: "appRunnerCustomPathInput", label: "Path to file", value: appRunnerCustomDraft.path, placeholder: "dev/scripts/start.sh" });
  const pathRow = make("div", "app-runner-custom-path-row");
  pathRow.append(pathField.field);
  const browse = make("button", "app-runner-custom-browse", "Browse…");
  browse.type = "button";
  browse.addEventListener("click", () => {
    updateAppRunnerCustomDraftFrom(form);
    loadAppRunnerFileBrowser(appRunnerRelativeDir(appRunnerCustomDraft.path));
  });
  pathRow.append(browse);
  const argsField = appRunnerInputField({ id: "appRunnerCustomArgsInput", label: "Args", value: appRunnerCustomDraft.args, placeholder: "--port 3000", hint: "Optional extra args, space-separated." });
  form.append(labelField.field, commandField.field, pathRow, argsField.field);
  const formActions = make("div", "app-runner-custom-form-actions");
  const save = make("button", "primary", appRunnerCustomDraft.id ? "Save changes" : "Add runner");
  save.type = "button";
  save.addEventListener("click", () => saveAppRunnerCustomRunner(form));
  const reset = make("button", "", "Reset");
  reset.type = "button";
  reset.addEventListener("click", () => { resetAppRunnerCustomDraft(); renderAppRunnerInfoDialog(); });
  formActions.append(save, reset);
  form.append(formActions);
  const browser = renderAppRunnerFileBrowser();
  if (browser) form.append(browser);
  section.append(form);
  return section;
}

function renderAppRunnerControls() {
  const menu = elements.appRunnerMenu;
  const button = elements.appRunnerMenuButton;
  const panel = elements.appRunnerMenuPanel;
  if (!menu || !button || !panel) return;
  const data = activeAppRunnerData();
  const runners = Array.isArray(data.runners) ? data.runners : [];
  const activeRun = data.activeRun;
  const running = appRunnerIsRunning(activeRun);
  menu.hidden = false;
  menu.classList.toggle("has-runners", runners.length > 0);
  if (elements.appRunnerInfoButton) {
    elements.appRunnerInfoButton.hidden = runners.length === 0;
    elements.appRunnerInfoButton.disabled = runners.length === 0;
  }
  button.disabled = running;
  button.title = running
    ? `App runner already running: ${activeRun.displayCommand || activeRun.label || "runner"}`
    : runners.length
      ? "Run a detected app runner"
      : "No app runners detected in this tab working directory";
  button.dataset.tooltip = runners.length ? "App runners: run detected project commands in this tab's working directory." : APP_RUNNER_SUPPORTED_TOOLTIP;
  button.setAttribute("aria-label", button.title);
  if (!runners.length || running) setAppRunnerMenuOpen(false);

  panel.replaceChildren();
  for (const runner of runners) {
    const item = make("button", "composer-publish-menu-item composer-app-runner-menu-item");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    const runnerDisplayCommand = runner.shortDisplayCommand || runner.displayCommand;
    item.title = runner.description ? `${runnerDisplayCommand}\n${runner.description}` : runnerDisplayCommand;
    item.addEventListener("click", () => runAppRunner(runner.id));
    const label = make("span", "app-runner-menu-item-label", runner.label || runnerDisplayCommand);
    const command = make("span", "app-runner-menu-item-command", runnerDisplayCommand);
    item.append(label, command);
    panel.append(item);
  }
}

function renderAppRunnerInfoDialog() {
  const body = elements.appRunnerInfoBody;
  if (!body) return;
  const data = activeAppRunnerData();
  const runners = Array.isArray(data.runners) ? data.runners : [];
  body.replaceChildren();

  const current = make("section", "app-runner-info-section");
  current.append(make("h3", "", "Detected in this tab"));
  if (runners.length) {
    const list = make("ul", "app-runner-info-list app-runner-info-detected-list");
    for (const runner of runners) {
      const command = runner.shortDisplayCommand || runner.displayCommand || runner.command || runner.id;
      const item = make("li");
      item.append(
        make("strong", "", runner.label || command || "runner"),
        make("code", "", command || "detected command"),
      );
      if (runner.description) item.append(make("span", "", runner.description));
      list.append(item);
    }
    current.append(list);
  } else {
    current.append(make("p", "muted", "No runners are currently detected for this tab working directory."));
  }

  const how = make("section", "app-runner-info-section");
  how.append(make("h3", "", "How it works"));
  const howList = make("ul", "app-runner-info-list");
  for (const line of [
    "Detection is scoped to the active terminal tab's current working directory.",
    "Only commands/files that exist and runner binaries available on this system are shown.",
    "Starting a runner keeps live output pinned above the chat/terminal area.",
    "Only one app runner can be active per tab; Close/Stop terminates the process/server.",
  ]) howList.append(make("li", "", line));
  how.append(howList);

  const supported = make("section", "app-runner-info-section");
  supported.append(make("h3", "", "Supported runner types"));
  const supportedList = make("ul", "app-runner-info-list app-runner-info-supported-list");
  for (const itemText of APP_RUNNER_SUPPORTED_ITEMS) supportedList.append(make("li", "", itemText));
  supported.append(supportedList);

  body.append(current, renderAppRunnerCustomSection(), how, supported);
}

function openAppRunnerInfoDialog() {
  if (!elements.appRunnerInfoDialog) return;
  renderAppRunnerInfoDialog();
  setAppRunnerMenuOpen(false);
  if (!elements.appRunnerInfoDialog.open) elements.appRunnerInfoDialog.showModal();
}

function closeAppRunnerInfoDialog() {
  if (elements.appRunnerInfoDialog?.open) elements.appRunnerInfoDialog.close();
}

function renderAppRunnerWidget() {
  const data = activeAppRunnerData();
  const run = data.activeRun;
  if (!run) return null;
  const running = appRunnerIsRunning(run);
  const status = appRunnerStatusLabel(run);
  const node = make("section", `widget release-npm-widget app-runner-widget${running ? " app-runner-live-widget" : " app-runner-log-widget"}`);
  node.setAttribute("aria-label", "app runner output");

  const header = make("div", "release-npm-header");
  const titleWrap = make("div", "release-npm-title-wrap");
  titleWrap.append(make("span", "release-npm-kicker", "app runner"), make("strong", "release-npm-title", run.label || run.displayCommand || "app runner"));

  const elapsed = appRunnerElapsedLabel(run);
  header.append(titleWrap);

  const lines = Array.isArray(run.lines) && run.lines.length ? run.lines : [run.displayCommand ? `$ ${run.displayCommand}` : "Waiting for app runner output..."];
  const streamHeader = releaseNpmStreamHeader(running ? "Live app output" : "App output", run.lineCount || lines.length, { live: running });
  const terminal = make("div", "release-npm-terminal");
  terminal.setAttribute("role", "log");
  terminal.setAttribute("aria-live", running ? "polite" : "off");
  for (const line of lines) appendReleaseNpmTerminalLine(terminal, line);

  const controlParts = [run.displayCommand, run.cwd, run.truncated ? "output truncated" : ""].map(cleanStatusText).filter(Boolean);
  const controls = make("div", "release-npm-controls app-runner-output-controls");
  const actions = make("div", "app-runner-output-actions");
  const closeButton = appRunnerActionButton("Close", running ? stopAppRunner : clearAppRunner, running ? "danger app-runner-close-action" : "app-runner-close-action");
  closeButton.title = running ? "Stop this app runner/process/server" : "Close app runner output";
  const copyButton = appRunnerActionButton("Copy output", () => copyAppRunnerOutput(run), "app-runner-copy-action");
  copyButton.title = "Copy app runner output";
  actions.append(closeButton, copyButton);
  if (running) {
    actions.append(appRunnerActionButton("Stop", stopAppRunner, "danger"));
  } else {
    const canRunAgain = (data.runners || []).some((runner) => runner.id === run.runnerId);
    if (canRunAgain) actions.append(appRunnerActionButton("Run again", () => runAppRunner(run.runnerId)));
    actions.append(appRunnerActionButton("Clear", clearAppRunner));
  }
  const pills = make("div", "app-runner-output-pills");
  if (run.kind) pills.append(make("span", "release-npm-pill", run.kind));
  pills.append(make("span", `release-npm-pill app-runner-status ${run.status || "running"}`.trim(), status));
  if (elapsed) pills.append(make("span", "release-npm-pill elapsed", elapsed));
  controls.append(actions, pills, make("span", "app-runner-output-meta", controlParts.join(" · ")));
  const outputDetails = renderReleaseNpmOutputDetails(`app-runner:${run.id || run.runnerId || "active"}`, streamHeader, terminal, controls);
  node.append(header, outputDetails);
  requestAnimationFrame(() => { if (outputDetails.open) terminal.scrollTop = terminal.scrollHeight; });
  return node;
}

function renderWidgets() {
  elements.widgetArea.replaceChildren();
  const releaseOutput = renderReleaseNpmOutputWidget();
  if (releaseOutput) elements.widgetArea.append(releaseOutput);
  const releaseLog = renderReleaseNpmLogWidget();
  if (releaseLog) elements.widgetArea.append(releaseLog);
  const releaseAurOutput = renderReleaseAurOutputWidget();
  if (releaseAurOutput) elements.widgetArea.append(releaseAurOutput);
  const releaseAurLog = renderReleaseAurLogWidget();
  if (releaseAurLog) elements.widgetArea.append(releaseAurLog);
  const appRunnerWidget = renderAppRunnerWidget();
  if (appRunnerWidget) elements.widgetArea.append(appRunnerWidget);

  for (const [key, value] of widgets) {
    const widgetFeatureId = optionalFeatureWidgetFeatureId(key);
    if (widgetFeatureId && !isOptionalFeatureEnabled(widgetFeatureId)) continue;
    if (widgetFeatureId && key !== "todo-progress") continue;
    const lines = Array.isArray(value.widgetLines) ? value.widgetLines : [];
    const specialized = key === "todo-progress" && isOptionalFeatureEnabled("todoProgressWidget") ? renderTodoProgressWidget(key, lines) : null;
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

function setGitWorkflow(patch, { tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId);
  if (!workflow) return null;
  Object.assign(workflow, patch);
  workflow.actionsDone = createGitWorkflowActionsDone(workflow.actionsDone);
  if (patch.step && !("process" in patch)) workflow.process = gitWorkflowProcessForStep(workflow.step, workflow.process);
  if (tabId === activeTabId) {
    gitWorkflow = workflow;
    renderGitWorkflow();
  }
  return workflow;
}

function isCurrentGitWorkflowRun(runId, tabId = activeTabId) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  return !!workflow?.active && workflow.runId === runId;
}

function appendGitWorkflowOutput(text, { tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId);
  if (!workflow) return;
  const next = `${workflow.output || ""}${workflow.output ? "\n" : ""}${text}`;
  setGitWorkflow({ output: next.slice(-60000) }, { tabId });
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

function gitWorkflowMessageTitle(message) {
  return String(message?.short || message?.long || "").split("\n").find((line) => line.trim())?.trim() || "Pull request";
}

function slugifyGitBranchPart(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function defaultGitPrBranchName(message = gitWorkflow.message) {
  const title = gitWorkflowMessageTitle(message);
  const match = title.match(/^([a-z][a-z0-9-]*)(?:\([^)]*\))?:\s*(.+)$/i);
  const type = slugifyGitBranchPart(match?.[1] || "feat") || "feat";
  const summary = slugifyGitBranchPart(match?.[2] || title) || "feature";
  return `${type}/${summary}`;
}

function formatGitPrPreview(pr) {
  if (!pr) return "No PR description loaded yet.";
  const header = [`=== PR DESCRIPTION ===`, `Branch: ${pr.branch || gitWorkflow.prBranch || "current branch"}`];
  if (pr.path) header.push(`File: ${pr.path}`);
  return [...header, "", pr.body || "(empty)"].join("\n");
}

function addGitWorkflowAction(label, handler, className = "", disabled = gitWorkflow.busy, tooltip = "") {
  const button = make("button", className, label);
  button.type = "button";
  button.disabled = disabled;
  if (tooltip) {
    button.title = tooltip;
    button.dataset.tooltip = tooltip;
    button.setAttribute("aria-label", `${label}. ${tooltip.replace(/\s+/g, " ")}`);
  }
  button.addEventListener("click", handler);
  elements.gitWorkflowActions.append(button);
  return button;
}

function setGitPrDialogStatus(message = "", level = "muted") {
  if (!elements.gitPrStatus) return;
  elements.gitPrStatus.textContent = message;
  elements.gitPrStatus.className = `git-pr-status ${level || "muted"}`;
}

function resolveGitPrDialog(value) {
  const resolve = activeGitPrDialogResolve;
  activeGitPrDialogResolve = null;
  if (elements.gitPrDialog?.open) elements.gitPrDialog.close();
  if (resolve) resolve(value);
}

function openGitPrReviewDialog(pr, { title = "" } = {}) {
  if (!elements.gitPrDialog || !elements.gitPrTitleInput || !elements.gitPrBodyEditor) return Promise.resolve(null);
  if (activeGitPrDialogResolve) resolveGitPrDialog(null);
  elements.gitPrTitleInput.value = title || gitWorkflowMessageTitle(gitWorkflow.message);
  elements.gitPrBodyEditor.value = pr?.body || "";
  setGitPrDialogStatus(`Review ${pr?.path || "the generated PR description"}. Edit if needed, then create the pull request.`);
  return new Promise((resolve) => {
    activeGitPrDialogResolve = resolve;
    elements.gitPrDialog.showModal();
    queueMicrotask(() => elements.gitPrBodyEditor.focus());
  });
}

function gitWorkflowProcessForStep(step = gitWorkflow.step, fallback = gitWorkflow.process || "stage") {
  switch (step) {
    case "generate":
    case "generating":
      return "message";
    case "message":
    case "branchNaming":
    case "branching":
    case "committing":
      return "commit";
    case "push":
    case "pushing":
    case "prGenerating":
    case "prReview":
    case "prCreating":
    case "done":
      return "push";
    case "add":
    case "idle":
      return "stage";
    case "cancelled":
    case "error":
      return GIT_WORKFLOW_PROCESS_VALUES.has(fallback) ? fallback : "stage";
    default:
      return "stage";
  }
}

function selectGitWorkflowProcess(processValue, tabId = gitWorkflowActionTabId()) {
  const workflow = gitWorkflowForTab(tabId);
  if (!workflow) return;
  const process = GIT_WORKFLOW_PROCESS_VALUES.has(processValue) ? processValue : "stage";
  workflow.runId += 1;
  const runId = workflow.runId;
  const base = { active: true, process, busy: false, error: "", messageRequestedAt: 0, branchName: "", branchNameRequestedAt: 0, prMode: false, prBranch: "", pr: null, prRequestedAt: 0 };

  if (process === "stage") {
    setGitWorkflow({ ...base, step: "add", message: null, output: "Ready to stage all changes with git add ." }, { tabId });
    return;
  }
  if (process === "message") {
    setGitWorkflow({ ...base, step: "generate", message: null, output: "Ready to generate a commit message from the currently staged changes." }, { tabId });
    return;
  }
  if (process === "commit") {
    setGitWorkflow({ ...base, step: "message", message: null, output: "Loading current generated commit message files…" }, { tabId });
    loadGitWorkflowMessage({ requireFresh: false, runId, tabId });
    return;
  }
  setGitWorkflow({ ...base, step: "push", output: "Ready to run git push for the current branch." }, { tabId });
}

function gitWorkflowTitle() {
  switch (gitWorkflow.step) {
    case "add": return "Stage all changes";
    case "generate": return "Generate staged commit message";
    case "generating": return "Waiting for /git-staged-msg";
    case "message": return gitWorkflow.prMode ? "Choose PR branch commit message" : "Choose commit message";
    case "branchNaming": return "Waiting for branch name";
    case "branching": return "Creating PR branch";
    case "committing": return "Committing";
    case "push": return gitWorkflow.prMode ? "Push branch and create PR" : "Push commit";
    case "pushing": return "Pushing";
    case "prGenerating": return "Waiting for /pr";
    case "prReview": return "Review PR description";
    case "prCreating": return "Creating pull request";
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
    case "message": return gitWorkflow.prMode ? `Branch ${gitWorkflow.prBranch || "created"}: choose short or long commit before opening a PR.` : "Step 3/4: preview the native g-msg output, commit here, or create a PR branch first.";
    case "branchNaming": return "Pi is generating dev/COMMIT/staged-branch-name.txt. Cancel will request Pi abort.";
    case "branching": return "Creating a new branch with git switch -c before committing.";
    case "committing": return "Running native git commit from the generated message file.";
    case "push": return gitWorkflow.prMode ? "Push the PR branch, generate /pr, review the description, then create the pull request." : "Step 5: push the new commit to the configured remote.";
    case "pushing": return "Running git push. Cancel will request process termination.";
    case "prGenerating": return "Pi is generating dev/PR/<current-branch>.md with /pr.";
    case "prReview": return "Review or edit the generated PR description before creating the pull request.";
    case "prCreating": return "Running gh pr create with the confirmed description.";
    case "done": return gitWorkflow.prMode ? "PR workflow finished. Review the output below." : "Push finished. Review the output below.";
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
  const activeProcess = gitWorkflowProcessForStep(gitWorkflow.step, gitWorkflow.process);
  for (const [index, process] of GIT_WORKFLOW_PROCESSES.entries()) {
    const item = make("button", "git-workflow-step", process.label);
    item.type = "button";
    item.dataset.gitWorkflowProcess = process.value;
    item.disabled = !!gitWorkflow.busy;
    item.setAttribute("aria-pressed", String(process.value === activeProcess));
    if (gitWorkflowActionDone(gitWorkflow, process.value)) item.classList.add("done");
    if (index === activeIndex && !["done", "cancelled", "error"].includes(gitWorkflow.step)) item.classList.add("active");
    elements.gitWorkflowSteps.append(item);
  }

  elements.gitWorkflowCancelButton.hidden = ["done", "cancelled"].includes(gitWorkflow.step);
  elements.gitWorkflowCancelButton.disabled = false;

  if (gitWorkflow.step === "add") {
    addGitWorkflowAction("Run git add .", () => runGitAdd(), "primary", false);
  } else if (gitWorkflow.step === "generate") {
    addGitWorkflowAction("Run /git-staged-msg", () => runGitMessagePrompt(), "primary", false);
    addGitWorkflowAction("Preview current message files", () => loadGitWorkflowMessage({ requireFresh: false }), "", false);
  } else if (gitWorkflow.step === "generating") {
    addGitWorkflowAction("Refresh message preview", () => loadGitWorkflowMessage({ requireFresh: true }), "", false);
  } else if (gitWorkflow.step === "message") {
    if (!gitWorkflow.prMode) {
      addGitWorkflowAction("Create PR", () => createGitPrBranch(), "primary", false, GIT_WORKFLOW_CREATE_PR_TOOLTIP);
      addGitWorkflowAction("Manual branch", () => createGitPrBranchManually(), "", false, GIT_WORKFLOW_MANUAL_BRANCH_TOOLTIP);
    }
    addGitWorkflowAction("Commit short", () => commitGitWorkflow("short"), gitWorkflow.prMode ? "primary" : "", false);
    addGitWorkflowAction("Commit long", () => commitGitWorkflow("long"), gitWorkflow.prMode ? "primary" : "", false);
    addGitWorkflowAction("Regenerate", () => runGitMessagePrompt(), "", false);
  } else if (gitWorkflow.step === "branchNaming") {
    addGitWorkflowAction("Refresh branch name", () => loadGitWorkflowBranchName({ requireFresh: true }), "", false);
    addGitWorkflowAction("Manual branch", () => createGitPrBranchManually(), "", !!gitWorkflow.busy, GIT_WORKFLOW_MANUAL_BRANCH_TOOLTIP);
  } else if (gitWorkflow.step === "branching") {
    addGitWorkflowAction("Creating branch…", () => {}, "primary", true);
  } else if (gitWorkflow.step === "push") {
    if (gitWorkflow.prMode) addGitWorkflowAction("Push and Create PR", () => pushAndCreatePrGitWorkflow(), "primary", false);
    else addGitWorkflowAction("Run git push", () => pushGitWorkflow(), "primary", false);
  } else if (gitWorkflow.step === "prGenerating") {
    addGitWorkflowAction("Refresh PR description", () => loadGitWorkflowPr({ requireFresh: true }), "", false);
  } else if (gitWorkflow.step === "prReview") {
    addGitWorkflowAction("Create PR", () => createGitPrFromReview(), "primary", false);
    addGitWorkflowAction("Regenerate /pr", () => runGitPrPrompt(), "", false);
  } else if (gitWorkflow.step === "prCreating") {
    addGitWorkflowAction("Creating PR…", () => {}, "primary", true);
  } else if (gitWorkflow.step === "done") {
    addGitWorkflowAction("Close", () => setGitWorkflow({ active: false }), "primary", false);
    addGitWorkflowAction("Start another", () => startGitWorkflow(), "", false);
  } else if (["cancelled", "error"].includes(gitWorkflow.step)) {
    addGitWorkflowAction("Close", () => setGitWorkflow({ active: false }), "primary", false);
    addGitWorkflowAction("Restart", () => startGitWorkflow(), "", false);
  }
}

async function gitWorkflowRequest(path, { method = "POST", body = {}, runId, tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  const expectedRunId = runId ?? workflow?.runId;
  const response = await api(path, method === "GET" ? { method, tabId } : { method, body, tabId });
  if (expectedRunId !== undefined && !isCurrentGitWorkflowRun(expectedRunId, tabId)) return null;
  if (!response.ok) {
    const detail = response.data ? `\n\n${formatGitCommandResult(response.data)}` : "";
    throw new Error(`${response.error || "Git workflow request failed"}${detail}`);
  }
  return response.data;
}

function failGitWorkflow(error, step, { tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId);
  if (!workflow) return;
  const message = error?.message || String(error);
  setGitWorkflow({
    step: step || workflow.step || "error",
    busy: false,
    error: message,
    output: `${workflow.output || ""}${workflow.output ? "\n\n" : ""}ERROR: ${message}`.slice(-60000),
  }, { tabId });
}

function startGitWorkflow(tabId = activeTabId) {
  if (!tabId) return;
  if (!isOptionalFeatureEnabled("gitWorkflow")) {
    const tabContext = activeTabContext(tabId);
    addEvent(commandUnavailableMessage("git-staged-msg"), "warn");
    refreshCommands(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
    });
    return;
  }
  const workflow = gitWorkflowForTab(tabId);
  if (workflow.active && !["done", "cancelled", "error"].includes(workflow.step) && !confirm("Restart the active git workflow?")) return;
  workflow.runId += 1;
  setGitWorkflow({
    active: true,
    step: "add",
    process: "stage",
    busy: false,
    output: "Ready to stage all changes with git add .\n\nNative mode is used for g-msg/g-short/g-long: dev/COMMIT message files are read directly and git commit is run without fish. After the message is generated, use Create PR to switch to a new branch before committing.",
    error: "",
    message: null,
    messageRequestedAt: 0,
    branchName: "",
    branchNameRequestedAt: 0,
    actionsDone: createGitWorkflowActionsDone(),
    prMode: false,
    prBranch: "",
    pr: null,
    prRequestedAt: 0,
  }, { tabId });
}

async function cancelGitWorkflow(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow?.active) return;
  const shouldAbortPi = workflow.step === "generating" || workflow.step === "branchNaming" || workflow.step === "prGenerating";
  if (activeGitPrDialogResolve) resolveGitPrDialog(null);
  workflow.runId += 1;
  setGitWorkflow({ step: "cancelled", busy: false, error: "", output: `${workflow.output || ""}${workflow.output ? "\n\n" : ""}Cancelled by user.` }, { tabId });
  if (shouldAbortPi && isCurrentTabContext(tabContext)) setRunIndicatorActivity("Abort requested; checking whether Pi stopped…");
  await Promise.allSettled([
    api("/api/git-workflow/cancel", { method: "POST", body: {}, tabId }),
    shouldAbortPi ? api("/api/abort", { method: "POST", body: {}, tabId }) : Promise.resolve(),
  ]);
  if (shouldAbortPi && isCurrentTabContext(tabContext)) scheduleAbortStateChecks();
}

async function runGitAdd(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  setGitWorkflow({ step: "add", busy: true, error: "", output: "Running git add ." }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/add", { runId, tabId });
    if (!result) return;
    setGitWorkflow({ step: "generate", busy: false, ...gitWorkflowActionDonePatch(workflow, "stage"), output: `${formatGitCommandResult(result)}\n\nStaged. Next: run /git-staged-msg.` }, { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) failGitWorkflow(error, "add", { tabId });
  }
}

async function runGitMessagePrompt(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const targetTab = tabs.find((tab) => tab.id === tabId);
  const targetBusy = tabId === activeTabId ? !!currentState?.isStreaming : activityForTab(targetTab).isWorking;
  if (targetBusy) {
    failGitWorkflow(new Error("Pi is currently running. Wait for it to finish or abort before generating a staged commit message."), "generate", { tabId });
    return;
  }
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  const requestedAt = Date.now();
  setGitWorkflow({
    step: "generating",
    busy: true,
    error: "",
    messageRequestedAt: requestedAt,
    output: "Sending /git-staged-msg to Pi.\n\nCancel will request Pi abort.",
  }, { tabId });
  if (isCurrentTabContext(tabContext)) setRunIndicatorActivity("Sending /git-staged-msg to Pi…");
  try {
    await api("/api/prompt", { method: "POST", body: { message: "/git-staged-msg" }, tabId });
    if (!isCurrentGitWorkflowRun(runId, tabId)) return;
    appendGitWorkflowOutput("/git-staged-msg accepted. Waiting for agent_end, then the message files will be loaded.", { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshState(120, tabContext);
    setTimeout(() => {
      const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
      const targetStillBusy = tabId === activeTabId && currentState?.isStreaming;
      if (isCurrentGitWorkflowRun(runId, tabId) && currentWorkflow?.step === "generating" && !targetStillBusy) {
        loadGitWorkflowMessage({ requireFresh: true, retries: 1, runId, tabId });
      }
    }, 2500);
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) {
      if (isCurrentTabContext(tabContext)) clearRunIndicatorActivity();
      failGitWorkflow(error, "generate", { tabId });
    }
  }
}

async function loadGitWorkflowMessage({ requireFresh = false, retries = 0, runId, tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  const expectedRunId = runId ?? workflow?.runId;
  try {
    const message = await gitWorkflowRequest("/api/git-workflow/message", { method: "GET", runId: expectedRunId, tabId });
    if (!message) return;
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    if (!currentWorkflow) return;
    const newestMtime = Math.max(message.shortMtimeMs || 0, message.longMtimeMs || 0);
    if (requireFresh && currentWorkflow.messageRequestedAt && newestMtime + 10000 < currentWorkflow.messageRequestedAt) {
      throw new Error("Generated message files have not refreshed yet.");
    }
    setGitWorkflow({
      step: "message",
      busy: false,
      error: "",
      message,
      ...(requireFresh && currentWorkflow.messageRequestedAt ? gitWorkflowActionDonePatch(currentWorkflow, "message") : {}),
      output: formatCommitMessagePreview(message),
    }, { tabId });
  } catch (error) {
    if (!isCurrentGitWorkflowRun(expectedRunId, tabId)) return;
    if (retries > 0) {
      setTimeout(() => loadGitWorkflowMessage({ requireFresh, retries: retries - 1, runId: expectedRunId, tabId }), 1400);
      return;
    }
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    failGitWorkflow(error, currentWorkflow?.step === "generating" ? "generate" : currentWorkflow?.step, { tabId });
  }
}

function gitBranchNamePromptMessage() {
  if (hasAvailableCommand("git-branch-name")) return "/git-branch-name";
  return [
    "Generate one PR branch name for the current staged work.",
    "Inspect only staged changes (`git diff --cached`) and the generated commit message files if present:",
    "- dev/COMMIT/staged-commit-short.txt",
    "- dev/COMMIT/staged-commit-long.txt",
    "",
    "Write exactly one line to dev/COMMIT/staged-branch-name.txt in this format:",
    "<type>/<short-feature-name>",
    "",
    "Rules: use lowercase kebab-case, no spaces/underscores/uppercase/trailing punctuation, 2-5 words after the slash, and no extra lines or prose in the file.",
  ].join("\n");
}

async function createGitPrBranch(tabId = gitWorkflowActionTabId()) {
  await runGitBranchNamePrompt(tabId);
}

async function createGitPrBranchManually(tabId = gitWorkflowActionTabId()) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  await createGitPrBranchWithSuggestion(workflow.branchName || defaultGitPrBranchName(workflow.message), tabId);
}

async function runGitBranchNamePrompt(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const targetTab = tabs.find((tab) => tab.id === tabId);
  const targetBusy = tabId === activeTabId ? !!currentState?.isStreaming : activityForTab(targetTab).isWorking;
  if (targetBusy) {
    failGitWorkflow(new Error("Pi is currently running. Wait for it to finish or abort before generating a branch name."), "message", { tabId });
    return;
  }
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  const requestedAt = Date.now();
  setGitWorkflow({
    step: "branchNaming",
    busy: true,
    error: "",
    branchNameRequestedAt: requestedAt,
    output: "Sending branch-name request to Pi.\n\nCancel will request Pi abort.",
  }, { tabId });
  if (isCurrentTabContext(tabContext)) setRunIndicatorActivity("Sending branch-name request to Pi…");
  try {
    await api("/api/prompt", { method: "POST", body: { message: gitBranchNamePromptMessage() }, tabId });
    if (!isCurrentGitWorkflowRun(runId, tabId)) return;
    appendGitWorkflowOutput("Branch-name request accepted. Waiting for agent_end, then the branch name will be loaded.", { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshState(120, tabContext);
    setTimeout(() => {
      const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
      const targetStillBusy = tabId === activeTabId && currentState?.isStreaming;
      if (isCurrentGitWorkflowRun(runId, tabId) && currentWorkflow?.step === "branchNaming" && !targetStillBusy) {
        loadGitWorkflowBranchName({ requireFresh: true, retries: 1, runId, tabId });
      }
    }, 2500);
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) {
      if (isCurrentTabContext(tabContext)) clearRunIndicatorActivity();
      failGitWorkflow(error, "message", { tabId });
    }
  }
}

async function loadGitWorkflowBranchName({ requireFresh = false, retries = 0, runId, tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  const expectedRunId = runId ?? workflow?.runId;
  try {
    const branchName = await gitWorkflowRequest("/api/git-workflow/branch-name", { method: "GET", runId: expectedRunId, tabId });
    if (!branchName) return;
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    if (!currentWorkflow) return;
    if (requireFresh && currentWorkflow.branchNameRequestedAt && (branchName.mtimeMs || 0) + 10000 < currentWorkflow.branchNameRequestedAt) {
      throw new Error("Generated branch name has not refreshed yet.");
    }
    const branch = branchName.branch || defaultGitPrBranchName(currentWorkflow.message);
    setGitWorkflow({
      step: "message",
      busy: false,
      error: "",
      branchName: branch,
      output: `${formatCommitMessagePreview(currentWorkflow.message)}\n\nGenerated branch name: ${branch}`,
    }, { tabId });
    await createGitPrBranchWithSuggestion(branch, tabId, expectedRunId);
  } catch (error) {
    if (!isCurrentGitWorkflowRun(expectedRunId, tabId)) return;
    if (retries > 0) {
      setTimeout(() => loadGitWorkflowBranchName({ requireFresh, retries: retries - 1, runId: expectedRunId, tabId }), 1400);
      return;
    }
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    failGitWorkflow(error, currentWorkflow?.step === "branchNaming" ? "message" : currentWorkflow?.step, { tabId });
  }
}

async function createGitPrBranchWithSuggestion(suggestion, tabId = gitWorkflowActionTabId(), expectedRunId) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const proposedBranch = prompt("New PR branch name (example: type/feature-name)", suggestion || defaultGitPrBranchName(workflow.message));
  if (expectedRunId !== undefined && !isCurrentGitWorkflowRun(expectedRunId, tabId)) return;
  if (proposedBranch === null) {
    setGitWorkflow({ step: "message", busy: false, output: `${formatCommitMessagePreview(workflow.message)}\n\nPR branch creation cancelled. Use Create PR to generate a branch name again or Manual branch to type one.` }, { tabId });
    return;
  }
  const branch = proposedBranch.trim();
  if (!branch) {
    failGitWorkflow(new Error("Branch name is required to create a PR branch."), "message", { tabId });
    return;
  }
  const runId = workflow.runId;
  setGitWorkflow({ step: "branching", prMode: true, prBranch: branch, branchName: branch, busy: true, error: "", output: `${formatCommitMessagePreview(workflow.message)}\n\nRunning git switch -c ${branch}…` }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/branch", { body: { branch }, runId, tabId });
    if (!result) return;
    setGitWorkflow({ step: "message", prMode: true, prBranch: result.branch || branch, branchName: result.branch || branch, busy: false, output: `${formatGitCommandResult(result)}\n\nCreated PR branch ${result.branch || branch}. Choose Commit short or Commit long to commit on this branch.` }, { tabId });
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) {
      setGitWorkflow({ prMode: false, prBranch: "" }, { tabId });
      failGitWorkflow(error, "message", { tabId });
    }
  }
}

async function commitGitWorkflow(variant, tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  setGitWorkflow({ step: "committing", busy: true, error: "", output: `${formatCommitMessagePreview(workflow.message)}\n\nRunning native ${variant} commit…` }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/commit", { body: { variant }, runId, tabId });
    if (!result) return;
    const nextAction = workflow.prMode ? "Push and Create PR." : "git push.";
    setGitWorkflow({ step: "push", busy: false, ...gitWorkflowActionDonePatch(workflow, "commit"), output: `${formatGitCommandResult(result)}\n\nCommit created. Next: ${nextAction}` }, { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) failGitWorkflow(error, "message", { tabId });
  }
}

async function pushGitWorkflow(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  setGitWorkflow({ step: "pushing", busy: true, error: "", output: "Running git push…" }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/push", { runId, tabId });
    if (!result) return;
    setGitWorkflow({ step: "done", busy: false, ...gitWorkflowActionDonePatch(workflow, "push"), output: formatGitCommandResult(result) || "git push finished." }, { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) failGitWorkflow(error, "push", { tabId });
  }
}

async function runGitPrPrompt(tabId = gitWorkflowActionTabId(), { prefixOutput = "" } = {}) {
  const tabContext = activeTabContext(tabId);
  const targetTab = tabs.find((tab) => tab.id === tabId);
  const targetBusy = tabId === activeTabId ? !!currentState?.isStreaming : activityForTab(targetTab).isWorking;
  if (targetBusy) {
    failGitWorkflow(new Error("Pi is currently running. Wait for it to finish or abort before generating a PR description."), "push", { tabId });
    return;
  }
  if (!hasAvailableCommand("pr")) {
    failGitWorkflow(new Error(commandUnavailableMessage("pr")), "push", { tabId });
    return;
  }
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  const requestedAt = Date.now();
  setGitWorkflow({
    step: "prGenerating",
    busy: true,
    error: "",
    prRequestedAt: requestedAt,
    output: `${prefixOutput ? `${prefixOutput}\n\n` : ""}Sending /pr to Pi.\n\nCancel will request Pi abort.`,
  }, { tabId });
  if (isCurrentTabContext(tabContext)) setRunIndicatorActivity("Sending /pr to Pi…");
  try {
    await api("/api/prompt", { method: "POST", body: { message: "/pr" }, tabId });
    if (!isCurrentGitWorkflowRun(runId, tabId)) return;
    appendGitWorkflowOutput("/pr accepted. Waiting for agent_end, then the PR description will be loaded.", { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshState(120, tabContext);
    setTimeout(() => {
      const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
      const targetStillBusy = tabId === activeTabId && currentState?.isStreaming;
      if (isCurrentGitWorkflowRun(runId, tabId) && currentWorkflow?.step === "prGenerating" && !targetStillBusy) {
        loadGitWorkflowPr({ requireFresh: true, retries: 1, runId, tabId });
      }
    }, 2500);
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) {
      if (isCurrentTabContext(tabContext)) clearRunIndicatorActivity();
      failGitWorkflow(error, "push", { tabId });
    }
  }
}

async function loadGitWorkflowPr({ requireFresh = false, retries = 0, runId, tabId = activeTabId } = {}) {
  const workflow = gitWorkflowForTab(tabId, { create: false });
  const expectedRunId = runId ?? workflow?.runId;
  try {
    const pr = await gitWorkflowRequest("/api/git-workflow/pr-description", { method: "GET", runId: expectedRunId, tabId });
    if (!pr) return;
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    if (!currentWorkflow) return;
    if (requireFresh && currentWorkflow.prRequestedAt && (pr.mtimeMs || 0) + 10000 < currentWorkflow.prRequestedAt) {
      throw new Error("Generated PR description has not refreshed yet.");
    }
    setGitWorkflow({
      step: "prReview",
      busy: false,
      error: "",
      pr,
      prBranch: pr.branch || currentWorkflow.prBranch,
      output: formatGitPrPreview(pr),
    }, { tabId });
  } catch (error) {
    if (!isCurrentGitWorkflowRun(expectedRunId, tabId)) return;
    if (retries > 0) {
      setTimeout(() => loadGitWorkflowPr({ requireFresh, retries: retries - 1, runId: expectedRunId, tabId }), 1400);
      return;
    }
    const currentWorkflow = gitWorkflowForTab(tabId, { create: false });
    failGitWorkflow(error, currentWorkflow?.step === "prGenerating" ? "push" : currentWorkflow?.step, { tabId });
  }
}

async function pushAndCreatePrGitWorkflow(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow) return;
  const runId = workflow.runId;
  const branch = workflow.prBranch || "current branch";
  setGitWorkflow({ step: "pushing", busy: true, error: "", output: `Pushing PR branch ${branch}…` }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/push", { body: { setUpstream: true, branch: workflow.prBranch }, runId, tabId });
    if (!result) return;
    setGitWorkflow({ ...gitWorkflowActionDonePatch(workflow, "push") }, { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshFooter();
    await runGitPrPrompt(tabId, { prefixOutput: `${formatGitCommandResult(result)}\n\nPushed PR branch ${result.branch || branch}.` });
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) failGitWorkflow(error, "push", { tabId });
  }
}

async function createGitPrFromReview(tabId = gitWorkflowActionTabId()) {
  const tabContext = activeTabContext(tabId);
  const workflow = gitWorkflowForTab(tabId, { create: false });
  if (!workflow?.pr) return;
  const runId = workflow.runId;
  const review = await openGitPrReviewDialog(workflow.pr, { title: gitWorkflowMessageTitle(workflow.message) });
  if (!isCurrentGitWorkflowRun(runId, tabId)) return;
  if (!review) {
    setGitWorkflow({ step: "prReview", busy: false, output: `${formatGitPrPreview(workflow.pr)}\n\nPR creation cancelled. Edit the description, regenerate /pr, or press Create PR again.` }, { tabId });
    return;
  }
  const title = review.title.trim();
  const body = review.body.trimEnd();
  setGitWorkflow({ step: "prCreating", busy: true, error: "", output: `${formatGitPrPreview({ ...workflow.pr, body })}\n\nCreating pull request with gh pr create…` }, { tabId });
  try {
    const result = await gitWorkflowRequest("/api/git-workflow/create-pr", { body: { title, body }, runId, tabId });
    if (!result) return;
    setGitWorkflow({ step: "done", busy: false, ...gitWorkflowActionDonePatch(workflow, "push"), output: `${formatGitCommandResult(result)}\n\nPull request created.` }, { tabId });
    if (isCurrentTabContext(tabContext)) scheduleRefreshFooter();
  } catch (error) {
    if (isCurrentGitWorkflowRun(runId, tabId)) failGitWorkflow(error, "prReview", { tabId });
  }
}

function resumeGitWorkflowForActiveTab(tabContext = activeTabContext()) {
  if (!isCurrentTabContext(tabContext)) return;
  bindGitWorkflowToActiveTab();
  renderGitWorkflow();
  const workflowTabId = gitWorkflowActionTabId();
  if (workflowTabId === tabContext.tabId && gitWorkflow.active && gitWorkflow.step === "generating" && !currentState?.isStreaming) {
    const retryDelayMs = Math.max(0, 2500 - (Date.now() - (gitWorkflow.messageRequestedAt || 0)));
    if (retryDelayMs > 0) {
      setTimeout(() => resumeGitWorkflowForActiveTab(tabContext), retryDelayMs);
      return;
    }
    loadGitWorkflowMessage({ requireFresh: true, retries: 3, runId: gitWorkflow.runId, tabId: workflowTabId });
  }
  if (workflowTabId === tabContext.tabId && gitWorkflow.active && gitWorkflow.step === "branchNaming" && !currentState?.isStreaming) {
    const retryDelayMs = Math.max(0, 2500 - (Date.now() - (gitWorkflow.branchNameRequestedAt || 0)));
    if (retryDelayMs > 0) {
      setTimeout(() => resumeGitWorkflowForActiveTab(tabContext), retryDelayMs);
      return;
    }
    loadGitWorkflowBranchName({ requireFresh: true, retries: 3, runId: gitWorkflow.runId, tabId: workflowTabId });
  }
  if (workflowTabId === tabContext.tabId && gitWorkflow.active && gitWorkflow.step === "prGenerating" && !currentState?.isStreaming) {
    const retryDelayMs = Math.max(0, 2500 - (Date.now() - (gitWorkflow.prRequestedAt || 0)));
    if (retryDelayMs > 0) {
      setTimeout(() => resumeGitWorkflowForActiveTab(tabContext), retryDelayMs);
      return;
    }
    loadGitWorkflowPr({ requireFresh: true, retries: 3, runId: gitWorkflow.runId, tabId: workflowTabId });
  }
}

function normalizeQueuedMessages(event) {
  const normalize = (items) => (Array.isArray(items) ? items.map((item) => String(item || "")).filter((item) => item.trim()) : []);
  return {
    steering: normalize(event?.steering),
    followUp: normalize(event?.followUp),
  };
}

function queueMessageCount(snapshot) {
  return (snapshot?.steering?.length || 0) + (snapshot?.followUp?.length || 0);
}

function updateQueueHeaderBadge(total) {
  if (!elements.queueCountBadge) return;
  elements.queueCountBadge.hidden = total === 0;
  elements.queueCountBadge.textContent = String(total);
  elements.queueCountBadge.setAttribute("aria-label", `${total} queued message${total === 1 ? "" : "s"}`);
}

function queueSummaryPill(label, count, tone) {
  const pill = make("span", `queue-summary-pill ${tone}`.trim());
  pill.append(make("strong", undefined, String(count)), make("span", undefined, label));
  return pill;
}

function renderQueueGroup(label, items, tone) {
  const group = make("section", `queue-group ${tone}`.trim());
  const heading = make("h3", "queue-group-title");
  heading.append(make("span", undefined, label), make("span", "queue-group-count", String(items.length)));
  const list = make("ol", "queue-list");
  items.forEach((item, index) => {
    const row = make("li", "queue-item");
    row.append(make("span", "queue-item-number", `#${index + 1}`), make("div", "queue-item-text", item));
    list.append(row);
  });
  group.append(heading, list);
  return group;
}

function renderQueue(event) {
  const snapshot = normalizeQueuedMessages(event);
  const tabId = event?.tabId || activeTabId;
  if (tabId) latestQueuedMessagesByTab.set(tabId, snapshot);
  const steering = snapshot.steering;
  const followUp = snapshot.followUp;
  const total = queueMessageCount(snapshot);
  updateQueueHeaderBadge(total);
  elements.queueBox.replaceChildren();
  elements.queueBox.classList.toggle("muted", total === 0);
  elements.queueBox.classList.toggle("has-items", total > 0);
  if (total === 0) {
    elements.queueBox.append(make("div", "queue-empty", "No queued messages."));
    updateStickyUserPromptButton();
    return;
  }

  const summary = make("div", "queue-summary");
  summary.append(make("strong", undefined, `${total} queued message${total === 1 ? "" : "s"}`));
  const counts = make("div", "queue-summary-counts");
  if (steering.length) counts.append(queueSummaryPill("steering", steering.length, "steering"));
  if (followUp.length) counts.append(queueSummaryPill("follow-up", followUp.length, "follow-up"));
  summary.append(counts);

  elements.queueBox.append(summary);
  if (steering.length) elements.queueBox.append(renderQueueGroup("Steering", steering, "steering"));
  if (followUp.length) elements.queueBox.append(renderQueueGroup("Follow-up", followUp, "follow-up"));
  elements.queueBox.append(make("div", "queue-hint", "Alt+Up restores this queue snapshot to the composer. RPC queue clearing is pending upstream support."));
  updateStickyUserPromptButton();
}

function nextQueuedFollowUpPrompt(tabId = activeTabId) {
  const snapshot = tabId ? latestQueuedMessagesByTab.get(tabId) : null;
  const next = Array.isArray(snapshot?.followUp) ? snapshot.followUp.find((item) => String(item || "").trim()) : null;
  return next ? stickyUserPromptPreviewText(next) : "";
}

function queuedMessagesForComposer(tabId = activeTabId) {
  const snapshot = latestQueuedMessagesByTab.get(tabId) || { steering: [], followUp: [] };
  return [...(snapshot.steering || []), ...(snapshot.followUp || [])].map((item) => String(item || "").trim()).filter(Boolean);
}

function restoreQueuedMessagesToComposerFromShortcut() {
  const queued = queuedMessagesForComposer();
  if (queued.length === 0) {
    addEvent("no queued messages to restore", "warn");
    return false;
  }
  const queuedText = queued.join("\n\n");
  const currentText = elements.promptInput.value || "";
  elements.promptInput.value = [queuedText, currentText].filter((item) => item.trim()).join("\n\n");
  resizePromptInput();
  renderCommandSuggestions();
  saveActiveDraft();
  focusPromptInput({ defer: true });
  addEvent(`restored ${queued.length} queued message${queued.length === 1 ? "" : "s"} to composer; Pi's RPC queue is still pending upstream clear support`, "warn");
  return true;
}

function normalizePromptListPrompts(prompts) {
  return (Array.isArray(prompts) ? prompts : [])
    .map((prompt) => String(prompt || "").trim())
    .filter(Boolean);
}

function promptListStorageId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `prompt-list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function promptListFallbackName(prompts) {
  const first = String(prompts?.[0] || "").replace(/\s+/g, " ").trim();
  if (!first) return "Untitled prompt list";
  return first.length > 58 ? `${first.slice(0, 57)}…` : first;
}

function normalizePromptListRecord(record) {
  const prompts = normalizePromptListPrompts(record?.prompts);
  if (prompts.length === 0) return null;
  const id = String(record?.id || "").trim() || promptListStorageId();
  const now = new Date().toISOString();
  const name = String(record?.name || "").trim() || promptListFallbackName(prompts);
  return {
    id,
    name,
    prompts,
    createdAt: String(record?.createdAt || record?.updatedAt || now),
    updatedAt: String(record?.updatedAt || now),
  };
}

function readStoredPromptLists() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROMPT_LIST_STORAGE_KEY) || "[]");
    const records = Array.isArray(raw) ? raw : Object.values(raw || {});
    return records
      .map(normalizePromptListRecord)
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  } catch {
    return [];
  }
}

function writeStoredPromptLists(lists) {
  localStorage.setItem(PROMPT_LIST_STORAGE_KEY, JSON.stringify(lists.map(normalizePromptListRecord).filter(Boolean)));
}

function savedPromptListById(id) {
  const key = String(id || "");
  return readStoredPromptLists().find((list) => list.id === key) || null;
}

function deleteStoredPromptList(id) {
  const key = String(id || "");
  if (!key) return null;
  const lists = readStoredPromptLists();
  const deleted = lists.find((list) => list.id === key) || null;
  if (!deleted) return null;
  writeStoredPromptLists(lists.filter((list) => list.id !== key));
  return deleted;
}

function upsertStoredPromptList(record) {
  const normalized = normalizePromptListRecord(record);
  if (!normalized) throw new Error("Prompt list needs at least one prompt.");
  const existing = readStoredPromptLists().filter((list) => list.id !== normalized.id);
  writeStoredPromptLists([normalized, ...existing]);
  return normalized;
}

function promptListEditorValues() {
  return Array.from(elements.promptListEditorRows?.querySelectorAll("textarea") || [])
    .map((textarea) => textarea.value || "");
}

function currentPromptListPrompts() {
  return normalizePromptListPrompts(promptListEditorValues());
}

function setPromptListStatus(message = "", level = "muted") {
  if (!elements.promptListStatus) return;
  elements.promptListStatus.textContent = message;
  elements.promptListStatus.className = `prompt-list-status ${level || "muted"}`.trim();
}

function renderPromptListDialogControls() {
  const hasPrompts = currentPromptListPrompts().length > 0;
  if (elements.promptListRunListButton) elements.promptListRunListButton.disabled = promptListRunning || !hasPrompts;
  if (elements.promptListSaveButton) elements.promptListSaveButton.disabled = promptListRunning || !hasPrompts;
  if (elements.promptListAddPromptButton) elements.promptListAddPromptButton.disabled = promptListRunning;
  if (elements.promptListDialogLoadButton) elements.promptListDialogLoadButton.disabled = promptListRunning;
  if (elements.promptListLoadSelectedButton) elements.promptListLoadSelectedButton.disabled = promptListRunning || !elements.promptListSelect?.value;
  if (elements.promptListDeleteSelectedButton) elements.promptListDeleteSelectedButton.disabled = promptListRunning || !elements.promptListSelect?.value;
}

function renderPromptListEditor(prompts = [""]) {
  const values = (Array.isArray(prompts) && prompts.length ? prompts : [""]).map((prompt) => String(prompt || ""));
  elements.promptListEditorRows?.replaceChildren();
  values.forEach((value, index) => {
    const row = make("div", "prompt-list-editor-row");
    const label = make("label", "prompt-list-editor-label");
    label.setAttribute("for", `promptListPrompt${index}`);
    label.textContent = index === 0 ? "Start prompt" : `Follow-up #${index}`;
    const textarea = make("textarea", "dialog-editor prompt-list-textarea");
    textarea.id = `promptListPrompt${index}`;
    textarea.rows = index === 0 ? 4 : 3;
    textarea.placeholder = index === 0 ? "Prompt that starts the run…" : "Follow-up prompt to queue after the start prompt…";
    textarea.value = value;
    textarea.addEventListener("input", () => {
      setPromptListStatus("");
      renderPromptListDialogControls();
    });
    const header = make("div", "prompt-list-editor-row-header");
    header.append(label);
    if (index > 0) {
      const remove = make("button", "prompt-list-remove-button", "×");
      remove.type = "button";
      remove.title = `Remove follow-up #${index}`;
      remove.setAttribute("aria-label", `Remove follow-up prompt ${index}`);
      remove.addEventListener("click", () => {
        const next = promptListEditorValues();
        next.splice(index, 1);
        renderPromptListEditor(next.length ? next : [""]);
        setPromptListStatus("Follow-up removed.", "muted");
      });
      header.append(remove);
    }
    row.append(header, textarea);
    elements.promptListEditorRows?.append(row);
  });
  renderPromptListDialogControls();
}

function populatePromptListSelect(selectedId = "") {
  if (!elements.promptListSelect) return;
  const lists = readStoredPromptLists();
  elements.promptListSelect.replaceChildren();
  if (lists.length === 0) {
    const option = make("option", undefined, "No saved prompt lists");
    option.value = "";
    elements.promptListSelect.append(option);
    elements.promptListSelect.disabled = true;
  } else {
    elements.promptListSelect.disabled = false;
    for (const list of lists) {
      const option = make("option", undefined, `${list.name} (${list.prompts.length})`);
      option.value = list.id;
      elements.promptListSelect.append(option);
    }
    elements.promptListSelect.value = selectedId && lists.some((list) => list.id === selectedId) ? selectedId : lists[0].id;
  }
  renderPromptListDialogControls();
}

function setPromptListLoadPanelVisible(visible) {
  if (!elements.promptListLoadPanel) return;
  elements.promptListLoadPanel.hidden = !visible;
  if (visible) populatePromptListSelect(elements.promptListSelect?.value || elements.promptListDialog?.dataset.promptListId || "");
}

function loadPromptListIntoEditor(record, { updateLoaded = true } = {}) {
  const list = normalizePromptListRecord(record);
  if (!list) return false;
  if (elements.promptListDialog) elements.promptListDialog.dataset.promptListId = list.id;
  if (elements.promptListNameInput) elements.promptListNameInput.value = list.name;
  renderPromptListEditor(list.prompts);
  setPromptListStatus(`Loaded “${list.name}”.`, "success");
  if (updateLoaded) setLoadedPromptList(list);
  return true;
}

function loadSelectedPromptListIntoEditor() {
  const list = savedPromptListById(elements.promptListSelect?.value);
  if (!list) {
    setPromptListStatus("No saved prompt list selected.", "warn");
    return;
  }
  if (loadPromptListIntoEditor(list, { updateLoaded: true })) elements.promptListDialog?.close();
}

function deleteSelectedPromptList() {
  const list = savedPromptListById(elements.promptListSelect?.value);
  if (!list) {
    setPromptListStatus("No saved prompt list selected to delete.", "warn");
    return;
  }
  if (!window.confirm(`Delete prompt list “${list.name}”? This cannot be undone.`)) return;
  const deleted = deleteStoredPromptList(list.id);
  if (!deleted) {
    setPromptListStatus("Prompt list was already deleted.", "warn");
    populatePromptListSelect();
    return;
  }
  if (loadedPromptList?.id === deleted.id) setLoadedPromptList(null);
  if (elements.promptListDialog?.dataset.promptListId === deleted.id) {
    elements.promptListDialog.dataset.promptListId = "";
    if (elements.promptListNameInput) elements.promptListNameInput.value = "";
    renderPromptListEditor([""]);
  }
  populatePromptListSelect();
  setPromptListStatus(`Deleted “${deleted.name}”.`, "success");
  addEvent(`deleted prompt list “${deleted.name}”`);
}

function openPromptListDialog({ mode = "create", list = null } = {}) {
  const normalized = normalizePromptListRecord(list);
  if (elements.promptListDialog) elements.promptListDialog.dataset.promptListId = normalized?.id || "";
  if (elements.promptListDialogTitle) elements.promptListDialogTitle.textContent = mode === "load" ? "Load prompt list" : "Create prompt list";
  if (elements.promptListNameInput) elements.promptListNameInput.value = normalized?.name || "";
  renderPromptListEditor(normalized?.prompts || [""]);
  setPromptListStatus(mode === "load" ? "Choose a saved list, then load or run it." : "");
  setPromptListLoadPanelVisible(mode === "load");
  if (!elements.promptListDialog?.open) elements.promptListDialog?.showModal();
  queueMicrotask(() => {
    const target = mode === "load" && !normalized ? elements.promptListSelect : elements.promptListEditorRows?.querySelector("textarea");
    target?.focus();
  });
}

function displayedPromptListRecord() {
  const prompts = currentPromptListPrompts();
  if (prompts.length === 0) return null;
  const id = String(elements.promptListDialog?.dataset.promptListId || "").trim() || promptListStorageId();
  const existing = savedPromptListById(id);
  const now = new Date().toISOString();
  return {
    id,
    name: String(elements.promptListNameInput?.value || "").trim() || promptListFallbackName(prompts),
    prompts,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function saveDisplayedPromptList() {
  const record = displayedPromptListRecord();
  if (!record) {
    setPromptListStatus("Add at least one prompt before saving.", "warn");
    return null;
  }
  try {
    const saved = upsertStoredPromptList(record);
    if (elements.promptListDialog) elements.promptListDialog.dataset.promptListId = saved.id;
    if (elements.promptListNameInput) elements.promptListNameInput.value = saved.name;
    populatePromptListSelect(saved.id);
    setLoadedPromptList(saved);
    setPromptListStatus(`Saved “${saved.name}”.`, "success");
    addEvent(`saved prompt list “${saved.name}” with ${saved.prompts.length} prompt${saved.prompts.length === 1 ? "" : "s"}`);
    return saved;
  } catch (error) {
    setPromptListStatus(error.message || "Failed to save prompt list.", "error");
    addEvent(error.message || "failed to save prompt list", "error");
    return null;
  }
}

function setLoadedPromptList(record) {
  loadedPromptList = normalizePromptListRecord(record);
  renderLoadedPromptListPreview();
}

function renderLoadedPromptListPreview() {
  if (elements.runLoadedPromptListButton) elements.runLoadedPromptListButton.disabled = promptListRunning || !loadedPromptList;
  if (!elements.loadedPromptListBox) return;
  elements.loadedPromptListBox.replaceChildren();
  elements.loadedPromptListBox.classList.toggle("muted", !loadedPromptList);
  if (!loadedPromptList) {
    elements.loadedPromptListBox.textContent = "No prompt list loaded.";
    return;
  }
  const total = loadedPromptList.prompts.length;
  const followUps = Math.max(0, total - 1);
  const summary = make("div", "loaded-prompt-list-summary");
  summary.append(make("strong", undefined, loadedPromptList.name), make("span", undefined, `${total} prompt${total === 1 ? "" : "s"} · ${followUps} follow-up${followUps === 1 ? "" : "s"}`));
  const preview = make("ol", "prompt-list-preview");
  loadedPromptList.prompts.slice(0, 4).forEach((prompt, index) => {
    const item = make("li", "prompt-list-preview-item");
    item.append(make("span", "prompt-list-preview-index", index === 0 ? "Start" : `#${index}`), make("span", "prompt-list-preview-text", prompt));
    preview.append(item);
  });
  if (loadedPromptList.prompts.length > 4) {
    const more = make("li", "prompt-list-preview-more", `+${loadedPromptList.prompts.length - 4} more follow-up prompt${loadedPromptList.prompts.length - 4 === 1 ? "" : "s"}`);
    preview.append(more);
  }
  elements.loadedPromptListBox.append(summary, preview);
}

function setPromptListRunning(running) {
  promptListRunning = !!running;
  renderLoadedPromptListPreview();
  renderPromptListDialogControls();
}

async function runPromptList(prompts, { name = "Prompt list" } = {}) {
  const listPrompts = normalizePromptListPrompts(prompts);
  if (listPrompts.length === 0) {
    setPromptListStatus("Add or load at least one prompt before running.", "warn");
    return;
  }
  const targetTabId = activeTabId;
  if (!targetTabId) {
    addEvent("cannot run prompt list without an active tab", "error");
    setPromptListStatus("No active tab available.", "error");
    return;
  }
  if (promptListRunning) return;
  const tabContext = activeTabContext(targetTabId);
  setPromptListRunning(true);
  setPromptListStatus(`Running “${name}”…`, "muted");
  addEvent(`running prompt list “${name}” (${listPrompts.length} prompt${listPrompts.length === 1 ? "" : "s"})`);
  try {
    await sendPrompt("prompt", listPrompts[0], { targetTabId, throwOnError: true });
    for (const prompt of listPrompts.slice(1)) {
      await sendPrompt("follow-up", prompt, { targetTabId, throwOnError: true });
    }
    setPromptListStatus(`Queued “${name}”.`, "success");
    if (isCurrentTabContext(tabContext)) {
      addEvent(`queued prompt list “${name}”: 1 start prompt and ${Math.max(0, listPrompts.length - 1)} follow-up${listPrompts.length === 2 ? "" : "s"}`);
      scheduleRefreshState(120, tabContext);
    }
  } catch (error) {
    setPromptListStatus(error.message || "Failed to run prompt list.", "error");
    addEvent(error.message || "failed to run prompt list", "error");
  } finally {
    setPromptListRunning(false);
  }
}

async function runDisplayedPromptList() {
  const saved = saveDisplayedPromptList();
  if (!saved) {
    setPromptListStatus("Save the list before running so it stays available afterward.", "warn");
    return;
  }
  await runPromptList(saved.prompts, { name: saved.name });
}

async function runLoadedPromptList() {
  if (!loadedPromptList) {
    openPromptListDialog({ mode: "load" });
    return;
  }
  await runPromptList(loadedPromptList.prompts, { name: loadedPromptList.name });
}

function appendText(parent, text, className = "text-block") {
  const block = make("pre", className);
  block.textContent = text || "";
  parent.append(block);
  return block;
}

function safeMarkdownLinkHref(url) {
  const href = String(url || "").trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return "";
  if (/^(?:https?:|mailto:)/i.test(href)) return href;
  if (/^(?:#|\/(?!\/)|\.\/|\.\.\/)/.test(href)) return href;
  return "";
}

function appendInlineMarkdown(parent, text, depth = 0) {
  const value = String(text || "");
  if (!value) return;
  if (depth > 6) {
    parent.append(document.createTextNode(value));
    return;
  }
  let index = 0;
  const appendPlain = (end) => {
    if (end > index) parent.append(document.createTextNode(value.slice(index, end)));
    index = end;
  };
  while (index < value.length) {
    if (value[index] === "`") {
      const end = value.indexOf("`", index + 1);
      if (end > index + 1) {
        const code = make("code", "markdown-inline-code", value.slice(index + 1, end));
        parent.append(code);
        index = end + 1;
        continue;
      }
    }
    if (value[index] === "[") {
      const labelEnd = value.indexOf("](", index + 1);
      const linkEnd = labelEnd === -1 ? -1 : value.indexOf(")", labelEnd + 2);
      if (labelEnd !== -1 && linkEnd !== -1) {
        const label = value.slice(index + 1, labelEnd);
        const href = safeMarkdownLinkHref(value.slice(labelEnd + 2, linkEnd));
        if (href) {
          const link = make("a");
          link.href = href;
          if (/^https?:/i.test(href)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
          appendInlineMarkdown(link, label, depth + 1);
          parent.append(link);
        } else {
          parent.append(document.createTextNode(value.slice(index, linkEnd + 1)));
        }
        index = linkEnd + 1;
        continue;
      }
    }
    const strongMarker = value.startsWith("**", index) ? "**" : value.startsWith("__", index) ? "__" : "";
    if (strongMarker) {
      const end = value.indexOf(strongMarker, index + 2);
      if (end > index + 2) {
        const strong = make("strong");
        appendInlineMarkdown(strong, value.slice(index + 2, end), depth + 1);
        parent.append(strong);
        index = end + 2;
        continue;
      }
    }
    if (value.startsWith("~~", index)) {
      const end = value.indexOf("~~", index + 2);
      if (end > index + 2) {
        const del = make("del");
        appendInlineMarkdown(del, value.slice(index + 2, end), depth + 1);
        parent.append(del);
        index = end + 2;
        continue;
      }
    }
    const emphasisMarker = value[index] === "*" || value[index] === "_" ? value[index] : "";
    if (emphasisMarker && value[index + 1] !== emphasisMarker) {
      const end = value.indexOf(emphasisMarker, index + 1);
      if (end > index + 1) {
        const em = make("em");
        appendInlineMarkdown(em, value.slice(index + 1, end), depth + 1);
        parent.append(em);
        index = end + 1;
        continue;
      }
    }
    const nextSpecials = ["`", "[", "**", "__", "~~", "*", "_"]
      .map((marker) => value.indexOf(marker, index + 1))
      .filter((pos) => pos !== -1);
    appendPlain(nextSpecials.length ? Math.min(...nextSpecials) : value.length);
  }
}

function appendMarkdownParagraph(parent, lines) {
  const paragraph = make("p");
  lines.forEach((line, index) => {
    if (index > 0) paragraph.append(make("br"));
    appendInlineMarkdown(paragraph, line);
  });
  parent.append(paragraph);
}

function appendMarkdownCodeBlock(parent, code, language = "") {
  const wrapper = make("div", "markdown-code-block");
  if (language) wrapper.append(make("div", "markdown-code-language", language));
  const pre = make("pre", "code-block markdown-code");
  const codeNode = make("code", language ? `language-${language.replace(/[^a-z0-9_-]/gi, "")}` : "");
  codeNode.textContent = code.replace(/\n+$/g, "");
  pre.append(codeNode);
  wrapper.append(pre);
  parent.append(wrapper);
}

function markdownTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || "");
}

function splitMarkdownTableRow(line) {
  let row = String(line || "").trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function appendMarkdownTable(parent, rows) {
  const wrapper = make("div", "markdown-table-wrapper");
  const table = make("table", "markdown-table");
  const thead = make("thead");
  const tbody = make("tbody");
  const headerRow = make("tr");
  for (const cell of rows[0] || []) {
    const th = make("th");
    appendInlineMarkdown(th, cell);
    headerRow.append(th);
  }
  thead.append(headerRow);
  for (const row of rows.slice(1)) {
    const tr = make("tr");
    for (const cell of row) {
      const td = make("td");
      appendInlineMarkdown(td, cell);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrapper.append(table);
  parent.append(wrapper);
}

function markdownListMatch(line) {
  const unordered = line.match(/^\s{0,3}[-*+]\s+(.+)$/);
  if (unordered) return { ordered: false, text: unordered[1] };
  const ordered = line.match(/^\s{0,3}(\d+)[.)]\s+(.+)$/);
  if (ordered) return { ordered: true, start: Number(ordered[1]), text: ordered[2] };
  return null;
}

function appendMarkdownList(parent, items, ordered = false, start = null) {
  const list = make(ordered ? "ol" : "ul", "markdown-list");
  if (ordered && Number.isFinite(start) && start > 1) list.start = start;
  for (const itemText of items) {
    const li = make("li");
    const task = String(itemText).match(/^\[( |x|X|-)\]\s+(.+)$/);
    if (task) {
      li.classList.add("markdown-task-item");
      const checkbox = make("input", "markdown-task-checkbox");
      checkbox.type = "checkbox";
      checkbox.disabled = true;
      checkbox.checked = task[1].toLowerCase() === "x";
      li.append(checkbox);
      appendInlineMarkdown(li, task[2]);
    } else {
      appendInlineMarkdown(li, itemText);
    }
    list.append(li);
  }
  parent.append(list);
}

function renderMarkdownInto(parent, text) {
  const raw = String(text || "").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");
  let index = 0;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) appendMarkdownParagraph(parent, paragraph);
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }
    const fence = line.match(/^\s*```\s*([\w.+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const language = fence[1] || "";
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      appendMarkdownCodeBlock(parent, codeLines.join("\n"), language);
      continue;
    }
    if (markdownTableSeparator(lines[index + 1]) && line.includes("|")) {
      flushParagraph();
      const rows = [splitMarkdownTableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitMarkdownTableRow(lines[index]));
        index += 1;
      }
      appendMarkdownTable(parent, rows);
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      const level = Math.min(6, heading[1].length);
      const node = make(`h${level}`, `markdown-heading markdown-heading-${level}`);
      appendInlineMarkdown(node, heading[2]);
      parent.append(node);
      index += 1;
      continue;
    }
    if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      parent.append(make("hr", "markdown-rule"));
      index += 1;
      continue;
    }
    if (/^\s{0,3}>\s?/.test(line)) {
      flushParagraph();
      const quoteLines = [];
      while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
        index += 1;
      }
      const quote = make("blockquote", "markdown-blockquote");
      renderMarkdownInto(quote, quoteLines.join("\n"));
      parent.append(quote);
      continue;
    }
    const listMatch = markdownListMatch(line);
    if (listMatch) {
      flushParagraph();
      const ordered = listMatch.ordered;
      const start = listMatch.start || null;
      const items = [];
      while (index < lines.length) {
        const item = markdownListMatch(lines[index]);
        if (!item || item.ordered !== ordered) break;
        items.push(item.text);
        index += 1;
      }
      appendMarkdownList(parent, items, ordered, start);
      continue;
    }
    paragraph.push(line);
    index += 1;
  }
  flushParagraph();
}

function appendMarkdown(parent, text) {
  const block = make("div", "markdown-body");
  renderMarkdownInto(block, text);
  parent.append(block);
  return block;
}

function renderMarkdown(block, text) {
  block.replaceChildren();
  renderMarkdownInto(block, text);
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
  return message?.role === "assistant" || message?.role === "toolExecution" || message?.role === "toolResult" || message?.role === "bashExecution";
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
    message?.toolCallId || "",
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
  if (message?.role === "toolExecution") {
    const result = toolExecutionResult(message);
    const args = message.arguments === undefined ? "" : JSON.stringify(message.arguments, null, 2);
    const output = toolResultText(result);
    return { kind: "action", title, snippet: truncateActionFeedbackText([args, output].filter(Boolean).join("\n\n")) };
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
  const tabContext = activeTabContext(item.tabId);
  if (!isRunActive()) return;
  await api("/api/steer", { method: "POST", body: { message: actionFeedbackSteerMessage(item) }, tabId: item.tabId });
  if (isCurrentTabContext(tabContext)) addEvent(`sent ${ACTION_FEEDBACK_REACTIONS[item.reaction]?.icon || "feedback"} action feedback as live steering`);
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

async function postQueuedFeedback(tabId, items, tabContext = activeTabContext(tabId)) {
  const feedback = items.map(serializeActionFeedback);
  try {
    await api("/api/action-feedback", { method: "POST", body: { feedback }, tabId });
  } catch (error) {
    if (!isMissingActionFeedbackEndpoint(error)) throw error;
    if (isCurrentTabContext(tabContext)) addEvent("/api/action-feedback not found; falling back to a normal prompt. Restart Web UI to use the dedicated endpoint.", "warn");
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
  const tabContext = activeTabContext(tabId);
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
    await postQueuedFeedback(tabId, items, tabContext);
    actionFeedbackByTab.get(tabId)?.clear();
    if (!isCurrentTabContext(tabContext)) return;
    renderAllMessages({ preserveScroll: true });
    addEvent("feedback sent; Pi will create a LEARNING");
    scheduleRefreshState(120, tabContext);
    scheduleRefreshMessages(120, tabContext);
    scheduleRefreshFooter(300, tabContext);
  } catch (error) {
    markTabIdleLocally(tabId);
    if (isCurrentTabContext(tabContext)) {
      clearRunIndicatorActivity();
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: "feedback", content: error.message, level: "error" });
    }
  } finally {
    actionFeedbackSendBusy = false;
    renderFeedbackTray();
  }
}

function renderContent(parent, content, { markdown = false } = {}) {
  if (content === undefined || content === null) return;
  if (typeof content === "string") {
    if (markdown) appendMarkdown(parent, stripTodoProgressLines(content));
    else appendText(parent, content);
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
      const text = assistantTextPartText(part);
      if (markdown) appendMarkdown(parent, stripTodoProgressLines(text));
      else appendText(parent, text);
    } else if (part.type === "thinking") {
      const thinking = visibleThinkingText(assistantThinkingText(part));
      if (!thinkingOutputVisible || !thinking) continue;
      const details = make("details", "thinking-block");
      details.open = true;
      details.append(make("summary", undefined, "thinking"));
      appendText(details, thinking, "thinking-text");
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
  if (message.role === "assistant") return message.title || "final output";
  if (message.title) return message.title;
  if (message.role === "thinking") return "thinking";
  if (message.role === "toolCall") return `tool call: ${message.toolName || "unknown"}`;
  if (message.role === "toolExecution") return toolExecutionTitle(message);
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

function visibleThinkingText(text) {
  const value = String(text || "");
  const trimmed = value.trim();
  if (!trimmed || trimmed === UNEXPOSED_THINKING_TEXT) return "";
  return value;
}

function isAssistantToolCallPart(part) {
  return !!(part && typeof part === "object" && (part.type === "toolCall" || part.toolCall));
}

function assistantHasToolCallAfter(content, index) {
  return Array.isArray(content) && content.slice(index + 1).some(isAssistantToolCallPart);
}

function assistantToolCallName(part) {
  return String(part?.name || part?.toolName || part?.toolCall?.name || "unknown");
}

function assistantToolCallArguments(part) {
  return part?.arguments || part?.args || part?.input || part?.toolCall?.arguments || {};
}

function assistantTextPartText(part) {
  if (!part || typeof part !== "object" || part.type !== "text") return "";
  if (typeof part.text === "string") return part.text;
  return typeof part.content === "string" ? part.content : "";
}

function isEmptyAssistantTextPart(part) {
  return !!(part && typeof part === "object" && part.type === "text" && !assistantTextPartText(part).trim());
}

function assistantFinalOutputPart(part) {
  if (part === undefined || part === null) return null;
  if (typeof part !== "object") {
    const text = String(part);
    return text.trim() ? { type: "text", text } : null;
  }
  if (part.type === "text") {
    const text = assistantTextPartText(part);
    return text.trim() ? { ...part, type: "text", text } : null;
  }
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
    return content.trim() ? [{ ...message, title: "final output" }] : [];
  }
  if (!Array.isArray(content)) {
    return content === undefined || content === null ? [] : [{ ...message, title: "final output" }];
  }

  const displayMessages = [];
  const finalParts = [];
  for (let index = 0; index < content.length; index += 1) {
    const part = content[index];
    const isThinkingPart = part && typeof part === "object" && (part.type === "thinking" || typeof part.thinking === "string");
    if (isThinkingPart) {
      const thinking = visibleThinkingText(assistantThinkingText(part));
      if (thinking) displayMessages.push({ ...base, role: "thinking", title: "thinking", content: thinking, thinking });
      continue;
    }
    if (isAssistantToolCallPart(part)) {
      const toolName = assistantToolCallName(part);
      const args = assistantToolCallArguments(part);
      const toolCallId = assistantToolCallId(part);
      displayMessages.push({ ...base, role: "toolCall", title: `tool call: ${toolName}`, toolName, toolCallId, arguments: args, content: args });
      continue;
    }
    const finalPart = assistantFinalOutputPart(part);
    if (finalPart) {
      if (!assistantHasToolCallAfter(content, index)) finalParts.push(finalPart);
      continue;
    }
    if (isEmptyAssistantTextPart(part)) continue;
    if (part !== undefined && part !== null) {
      displayMessages.push({ ...base, role: "assistantEvent", title: part?.type ? `assistant ${part.type}` : "assistant event", content: part });
    }
  }

  if (finalParts.length > 0) {
    displayMessages.push({ ...message, title: "final output", content: finalParts });
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

function promptHistoryText(value) {
  return stripAnsi(String(value ?? "")).replace(/\r\n?/g, "\n").trim();
}

function promptHistoryMessageText(message) {
  if (message?.role !== "user") return "";
  const text = promptHistoryText(textFromContent(message.content));
  return text.startsWith("/") ? "" : text;
}

function promptHistoryForTab(tabId = activeTabId) {
  if (!tabId) return [];
  return promptHistoryByTab.get(tabId) || [];
}

function promptHistoryWithEntry(history, text) {
  const prompt = promptHistoryText(text);
  if (!prompt) return history || [];
  return [...(history || []).filter((entry) => entry !== prompt), prompt].slice(-PROMPT_HISTORY_LIMIT_PER_TAB);
}

function promptHistoryEqual(left = [], right = []) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function setPromptHistoryForTab(tabId, history, { persist = true } = {}) {
  if (!tabId) return;
  const entries = (history || []).map(promptHistoryText).filter(Boolean).slice(-PROMPT_HISTORY_LIMIT_PER_TAB);
  if (entries.length) promptHistoryByTab.set(tabId, entries);
  else promptHistoryByTab.delete(tabId);
  if (persist) persistPromptHistoryCache();
}

function loadPromptHistoryCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROMPT_HISTORY_STORAGE_KEY) || "{}");
    promptHistoryByTab = new Map(Object.entries(raw)
      .map(([tabId, entries]) => [tabId, Array.isArray(entries) ? entries.map(promptHistoryText).filter(Boolean).slice(-PROMPT_HISTORY_LIMIT_PER_TAB) : []])
      .filter(([, entries]) => entries.length));
  } catch {
    promptHistoryByTab = new Map();
  }
}

function persistPromptHistoryCache() {
  try {
    const entries = [...promptHistoryByTab.entries()]
      .filter(([tabId, history]) => tabId && Array.isArray(history) && history.length)
      .slice(-24)
      .map(([tabId, history]) => [tabId, history.slice(-PROMPT_HISTORY_LIMIT_PER_TAB)]);
    localStorage.setItem(PROMPT_HISTORY_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage failures; in-memory prompt history still works for this page load.
  }
}

function rememberPromptHistory(text, { tabId = activeTabId } = {}) {
  if (!tabId) return;
  setPromptHistoryForTab(tabId, promptHistoryWithEntry(promptHistoryForTab(tabId), text));
}

function syncPromptHistoryFromMessages(messages = latestMessages) {
  if (!activeTabId) return;
  const prompts = (messages || []).map(promptHistoryMessageText).filter(Boolean);
  if (!prompts.length) return;
  const currentHistory = promptHistoryForTab(activeTabId);
  let nextHistory = currentHistory;
  for (const prompt of prompts) nextHistory = promptHistoryWithEntry(nextHistory, prompt);
  if (!promptHistoryEqual(currentHistory, nextHistory)) setPromptHistoryForTab(activeTabId, nextHistory);
}

function resetPromptHistoryNavigation() {
  promptHistoryNavigation = null;
}

function activePromptHistoryNavigation(history = promptHistoryForTab()) {
  if (!promptHistoryNavigation || promptHistoryNavigation.tabId !== activeTabId) return null;
  const index = promptHistoryNavigation.index;
  if (!Number.isInteger(index) || index < 0 || index >= history.length || elements.promptInput.value !== history[index]) {
    resetPromptHistoryNavigation();
    return null;
  }
  return promptHistoryNavigation;
}

function applyPromptHistoryValue(value) {
  const input = elements.promptInput;
  input.value = value || "";
  resizePromptInput();
  try {
    input.setSelectionRange(input.value.length, input.value.length);
  } catch {
    // Some input implementations can reject selection updates; history recall still worked.
  }
  hideCommandSuggestions();
}

function recallPreviousPromptFromHistory() {
  if (!activeTabId) return false;
  const history = promptHistoryForTab(activeTabId);
  if (!history.length) return false;
  const navigation = activePromptHistoryNavigation(history);
  if (!navigation && elements.promptInput.value.trim()) return false;
  const index = navigation ? Math.max(0, navigation.index - 1) : history.length - 1;
  promptHistoryNavigation = {
    tabId: activeTabId,
    index,
    draft: navigation ? navigation.draft : elements.promptInput.value || "",
  };
  applyPromptHistoryValue(history[index]);
  return true;
}

function recallNextPromptFromHistory() {
  if (!activeTabId) return false;
  const history = promptHistoryForTab(activeTabId);
  const navigation = activePromptHistoryNavigation(history);
  if (!navigation) return false;
  if (navigation.index >= history.length - 1) {
    const draft = navigation.draft || "";
    resetPromptHistoryNavigation();
    applyPromptHistoryValue(draft);
    return true;
  }
  const index = navigation.index + 1;
  promptHistoryNavigation = { ...navigation, index };
  applyPromptHistoryValue(history[index]);
  return true;
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
  liveToolCards.clear();
  const preservedNodes = [];
  if (elements.stickyUserPromptButton) preservedNodes.push(elements.stickyUserPromptButton);
  if (runIndicatorBubble?.parentElement === elements.chat) preservedNodes.push(runIndicatorBubble);
  elements.chat.replaceChildren(...preservedNodes);
}

function appendChatMessageBubble(bubble) {
  if (runIndicatorBubble?.parentElement === elements.chat && bubble !== runIndicatorBubble) {
    elements.chat.insertBefore(bubble, runIndicatorBubble);
  } else {
    elements.chat.append(bubble);
  }
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
  const nextFollowUp = nextQueuedFollowUpPrompt();
  const baseTitle = target.compacted ? `Prompt was compacted; jump to compaction summary: ${target.preview}` : `Jump to ${label.toLowerCase()}: ${target.preview}`;
  const baseAriaLabel = target.compacted ? `Prompt was compacted; jump to compaction summary: ${target.preview}` : `Jump to ${label.toLowerCase()} (${ordinal} of ${targets.length}): ${target.preview}`;
  button.title = nextFollowUp ? `${baseTitle}\nNext follow-up prompt: ${nextFollowUp}` : baseTitle;
  button.setAttribute("aria-label", nextFollowUp ? `${baseAriaLabel}. Next follow-up prompt: ${nextFollowUp}` : baseAriaLabel);
  const children = [
    make("span", "sticky-user-prompt-label", label),
    make("span", "sticky-user-prompt-text", target.preview),
    make("span", "sticky-user-prompt-meta", meta),
  ];
  if (nextFollowUp) {
    const followUp = make("span", "sticky-user-follow-up-prompt");
    followUp.append(make("span", "sticky-user-follow-up-label", "Next follow-up"), make("span", "sticky-user-follow-up-text", nextFollowUp));
    children.push(followUp);
  }
  button.replaceChildren(...children);
}

function assistantToolCallId(part) {
  const id = part?.id || part?.toolCallId || part?.tool_call_id || part?.toolCall?.id || part?.toolCall?.toolCallId || part?.toolCall?.tool_call_id;
  return id === undefined || id === null ? "" : String(id);
}

function toolResultCallId(message) {
  const id = message?.toolCallId || message?.tool_call_id;
  return id === undefined || id === null ? "" : String(id);
}

function buildToolResultMap(messages = latestMessages) {
  const results = new Map();
  for (const message of messages || []) {
    if (message?.role !== "toolResult") continue;
    const id = toolResultCallId(message);
    if (id && !results.has(id)) results.set(id, message);
  }
  return results;
}

function buildAssistantToolCallIdSet(messages = latestMessages) {
  const ids = new Set();
  for (const message of messages || []) {
    if (message?.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (!isAssistantToolCallPart(part)) continue;
      const id = assistantToolCallId(part);
      if (id) ids.add(id);
    }
  }
  return ids;
}

function toolResultForCallId(toolCallId, messages = latestMessages) {
  const id = String(toolCallId || "");
  if (!id) return null;
  for (const message of messages || []) {
    if (message?.role === "toolResult" && toolResultCallId(message) === id) return message;
  }
  return null;
}

function cleanupLiveToolRunsForMessages(messages = latestMessages) {
  const results = buildToolResultMap(messages);
  for (const id of liveToolRuns.keys()) {
    if (results.has(id)) {
      liveToolRuns.delete(id);
      cancelQueuedLiveToolRunRender(id);
    }
  }
}

function shortenToolPath(value, fallback = ".") {
  const path = normalizeDisplayPath(value || fallback);
  if (path.length <= 96) return path;
  return `…${path.slice(-95)}`;
}

function toolArgValue(args, keys) {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    if (args && Object.prototype.hasOwnProperty.call(args, key)) return args[key];
  }
  return undefined;
}

function toolArgText(args, keys, fallback = "") {
  const value = toolArgValue(args, keys);
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value;
  return String(value);
}

function toolExecutionResult(message) {
  if (message?.result) return message.result;
  if (message?.partialResult) return { ...message.partialResult, isError: false };
  if (message?.role === "toolResult") return message;
  return null;
}

function toolResultText(result) {
  if (!result) return "";
  return stripAnsi(textFromContent(result.content)).replace(/\s+$/g, "");
}

function toolExecutionStatus(message) {
  const result = toolExecutionResult(message);
  if (message?.isPartial) return "running";
  if (!result) return "pending";
  return message?.isError || result?.isError ? "error" : "success";
}

function toolExecutionTitle(message) {
  const name = runIndicatorToolName(message?.toolName || message?.name || "tool");
  const status = toolExecutionStatus(message);
  if (status === "running") return `tool: ${name} (running)`;
  if (status === "pending") return `tool: ${name} (pending)`;
  if (status === "error") return `tool: ${name} (failed)`;
  return `tool: ${name}`;
}

function toolLineRange(args) {
  const offset = toolArgValue(args, "offset");
  const limit = toolArgValue(args, "limit");
  const start = Number.isFinite(Number(offset)) ? Number(offset) : null;
  const count = Number.isFinite(Number(limit)) ? Number(limit) : null;
  if (start === null && count === null) return "";
  const first = start ?? 1;
  const last = count === null ? "" : first + count - 1;
  return `:${first}${last ? `-${last}` : ""}`;
}

function appendToolTitle(parent, name, subject = "", meta = []) {
  const line = make("div", "tool-title-line");
  line.append(make("span", "tool-name", name));
  if (subject) line.append(make("span", "tool-subject", subject));
  parent.append(line);
  const items = meta.filter(Boolean);
  if (items.length > 0) {
    const metaLine = make("div", "tool-meta-line");
    for (const item of items) metaLine.append(make("span", "tool-meta-pill", item));
    parent.append(metaLine);
  }
}

function appendToolCommand(parent, command, meta = []) {
  const line = make("pre", "tool-command-line");
  line.textContent = `$ ${command || "..."}`;
  parent.append(line);
  const items = meta.filter(Boolean);
  if (items.length > 0) {
    const metaLine = make("div", "tool-meta-line");
    for (const item of items) metaLine.append(make("span", "tool-meta-pill", item));
    parent.append(metaLine);
  }
}

function appendToolImages(parent, result) {
  if (!Array.isArray(result?.content)) return;
  for (const part of result.content) {
    if (part?.type === "image") appendImage(parent, part);
  }
}

function appendToolOutput(parent, text, { label = "output", previewLines = 10, previewFromEnd = false, open = false, emptyText = "" } = {}) {
  const clean = stripAnsi(text).replace(/\s+$/g, "");
  if (!clean) {
    if (emptyText) appendText(parent, emptyText, "code-block tool-output-code muted-output");
    return;
  }
  const lines = clean.split(/\r?\n/);
  if (lines.length > previewLines) {
    const details = make("details", "tool-output-details");
    details.open = open || toolOutputGloballyExpanded;
    details.append(make("summary", "tool-output-summary", `${label} (${lines.length} lines; expand)`));
    appendText(details, clean, "code-block tool-output-code");
    parent.append(details);

    const preview = make("div", "tool-output-preview");
    const visibleLines = previewFromEnd ? lines.slice(-previewLines) : lines.slice(0, previewLines);
    const omitted = lines.length - visibleLines.length;
    const hint = previewFromEnd
      ? `… ${omitted} earlier line${omitted === 1 ? "" : "s"}; expand for full output`
      : `… ${omitted} more line${omitted === 1 ? "" : "s"}; expand for full output`;
    appendText(preview, `${visibleLines.join("\n")}\n${hint}`, "code-block tool-output-code tool-output-preview-text");
    parent.append(preview);
    return;
  }
  appendText(parent, clean, "code-block tool-output-code");
}

function appendToolWarnings(parent, details = {}) {
  const warnings = [];
  if (details.fullOutputPath) warnings.push(`Full output: ${details.fullOutputPath}`);
  const truncation = details.truncation;
  if (truncation?.truncated) {
    if (truncation.truncatedBy === "lines") warnings.push(`Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`);
    else if (truncation.outputLines) warnings.push(`Truncated: ${truncation.outputLines} lines shown`);
    else warnings.push("Output truncated");
  }
  if (details.matchLimitReached) warnings.push(`Match limit reached: ${details.matchLimitReached}`);
  if (details.resultLimitReached) warnings.push(`Result limit reached: ${details.resultLimitReached}`);
  if (details.entryLimitReached) warnings.push(`Entry limit reached: ${details.entryLimitReached}`);
  if (warnings.length === 0) return;
  const box = make("div", "tool-warnings");
  for (const warning of warnings) box.append(make("div", "tool-warning", warning));
  parent.append(box);
}

function appendToolDiff(parent, diff) {
  const value = String(diff || "").replace(/\s+$/g, "");
  if (!value) return false;
  const block = make("div", "tool-diff");
  for (const line of value.split(/\r?\n/)) {
    const cls = /^@@/.test(line)
      ? "diff-hunk"
      : /^\+/.test(line) && !/^\+\+\+/.test(line)
        ? "diff-added"
        : /^-/.test(line) && !/^---/.test(line)
          ? "diff-removed"
          : /^(?:\+\+\+|---)/.test(line)
            ? "diff-file"
            : "diff-context";
    block.append(make("div", cls, line || " "));
  }
  parent.append(block);
  return true;
}

function normalizeToolExecution(message) {
  const result = toolExecutionResult(message);
  const args = message?.arguments ?? message?.args ?? {};
  const name = runIndicatorToolName(message?.toolName || message?.name || "tool");
  return {
    name,
    args,
    result,
    text: toolResultText(result),
    details: result?.details || message?.details || {},
    isPartial: !!message?.isPartial,
    isError: !!(message?.isError || result?.isError),
    startedAt: message?.startedAt || null,
    endedAt: message?.endedAt || null,
  };
}

function toolElapsedLabel(tool) {
  if (!tool.startedAt) return "";
  const end = tool.endedAt || Date.now();
  return `${tool.isPartial ? "elapsed" : "took"} ${formatDuration(end - tool.startedAt)}`;
}

function toolStatusLabel(tool) {
  if (tool.isPartial) return "live";
  if (tool.isError) return "failed";
  if (tool.result) return "done";
  return "pending";
}

function toolStateMeta(tool) {
  return [toolElapsedLabel(tool), toolStatusLabel(tool)];
}

function toolLineCountLabel(text, label = "line") {
  const value = String(text || "").replace(/\s+$/g, "");
  if (!value) return "";
  const count = value.split(/\r?\n/).length;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function toolRawDetailsReplacer(key, value) {
  if (typeof value === "string" && value.length > 4000) return `${value.slice(0, 4000)}… (${value.length - 4000} chars omitted)`;
  return value;
}

function appendToolRawDetails(parent, tool) {
  const raw = JSON.stringify({ arguments: tool.args ?? {}, result: tool.result ?? null, details: tool.details ?? {} }, toolRawDetailsReplacer, 2);
  const details = make("details", "tool-raw-details");
  details.append(make("summary", "tool-raw-summary", "raw tool data"));
  appendText(details, raw, "code-block tool-raw-code");
  parent.append(details);
}

function toolRenderSignatureReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "string" && value.length > 8000) return `${value.slice(0, 4000)}…${value.slice(-4000)} (${value.length} chars)`;
    if (value && typeof value === "object") {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return toolRawDetailsReplacer(key, value);
  };
}

function toolExecutionRenderSignature(message) {
  const tool = normalizeToolExecution(message);
  try {
    return JSON.stringify({
      name: tool.name,
      args: tool.args,
      result: tool.result,
      details: tool.details,
      isPartial: tool.isPartial,
      isError: tool.isError,
      startedAt: tool.startedAt,
      endedAt: tool.endedAt,
    }, toolRenderSignatureReplacer());
  } catch {
    return `${message?.toolName || message?.name || "tool"}|${message?.toolCallId || ""}|${message?.isPartial ? "partial" : "final"}|${message?.isError ? "error" : "ok"}`;
  }
}

function renderBashToolExecution(parent, tool) {
  const command = toolArgText(tool.args, "command", "");
  const timeout = toolArgValue(tool.args, "timeout");
  const meta = [timeout ? `timeout ${timeout}s` : "", ...toolStateMeta(tool)];
  appendToolCommand(parent, command, meta);
  appendToolOutput(parent, tool.text, { label: tool.isPartial ? "live output" : "output", previewLines: 5, previewFromEnd: true, open: tool.isError, emptyText: tool.isPartial ? "(no output yet)" : "" });
  appendToolWarnings(parent, tool.details);
}

function renderReadToolExecution(parent, tool) {
  const path = toolArgText(tool.args, ["file_path", "path"], "");
  appendToolTitle(parent, "read", `${shortenToolPath(path)}${toolLineRange(tool.args)}`, [toolLineCountLabel(tool.text), ...toolStateMeta(tool)]);
  appendToolImages(parent, tool.result);
  appendToolOutput(parent, tool.text, { label: "file output", previewLines: 10, open: tool.isError });
  appendToolWarnings(parent, tool.details);
}

function renderWriteToolExecution(parent, tool) {
  const path = toolArgText(tool.args, ["file_path", "path"], "");
  const content = toolArgText(tool.args, "content", "");
  const lineCount = content ? content.split(/\r?\n/).length : 0;
  appendToolTitle(parent, "write", shortenToolPath(path), [lineCount > 0 ? `${lineCount} line${lineCount === 1 ? "" : "s"}` : "", ...toolStateMeta(tool)]);
  appendToolOutput(parent, content, { label: "content", previewLines: 10 });
  appendToolOutput(parent, tool.text, { label: "result", previewLines: 6, open: tool.isError });
}

function renderEditToolExecution(parent, tool) {
  const path = toolArgText(tool.args, ["file_path", "path"], "");
  const edits = Array.isArray(tool.args?.edits) ? tool.args.edits.length : 0;
  appendToolTitle(parent, "edit", shortenToolPath(path), [edits ? `${edits} replacement${edits === 1 ? "" : "s"}` : "", ...toolStateMeta(tool)]);
  const hasDiff = appendToolDiff(parent, tool.details?.diff || tool.details?.patch);
  appendToolOutput(parent, tool.text, { label: "result", previewLines: hasDiff ? 4 : 10, open: tool.isError });
}

function renderGrepToolExecution(parent, tool) {
  const pattern = toolArgText(tool.args, "pattern", "");
  const path = toolArgText(tool.args, "path", ".");
  appendToolTitle(parent, "grep", `/${pattern || "…"}/ in ${shortenToolPath(path)}`, [tool.args?.glob ? `glob ${tool.args.glob}` : "", tool.args?.ignoreCase ? "ignore-case" : "", tool.args?.literal ? "literal" : "", toolLineCountLabel(tool.text, "match line"), ...toolStateMeta(tool)]);
  appendToolOutput(parent, tool.text, { label: "matches", previewLines: 10, open: tool.isError });
  appendToolWarnings(parent, tool.details);
}

function renderFindToolExecution(parent, tool) {
  const pattern = toolArgText(tool.args, "pattern", "");
  const path = toolArgText(tool.args, "path", ".");
  appendToolTitle(parent, "find", `${pattern || "…"} in ${shortenToolPath(path)}`, [tool.args?.limit ? `limit ${tool.args.limit}` : "", toolLineCountLabel(tool.text, "result"), ...toolStateMeta(tool)]);
  appendToolOutput(parent, tool.text, { label: "results", previewLines: 10, open: tool.isError });
  appendToolWarnings(parent, tool.details);
}

function renderLsToolExecution(parent, tool) {
  const path = toolArgText(tool.args, "path", ".");
  appendToolTitle(parent, "ls", shortenToolPath(path), [tool.args?.limit ? `limit ${tool.args.limit}` : "", toolLineCountLabel(tool.text, "entry"), ...toolStateMeta(tool)]);
  appendToolOutput(parent, tool.text, { label: "entries", previewLines: 20, open: tool.isError });
  appendToolWarnings(parent, tool.details);
}

function renderGenericToolExecution(parent, tool) {
  appendToolTitle(parent, tool.name, "", toolStateMeta(tool));
  appendToolOutput(parent, JSON.stringify(tool.args ?? {}, null, 2), { label: "arguments", previewLines: 12 });
  appendToolImages(parent, tool.result);
  appendToolOutput(parent, tool.text, { label: "result", previewLines: 10, open: tool.isError });
  appendToolWarnings(parent, tool.details);
}

const WEBUI_TOOL_RENDERERS = {
  bash: renderBashToolExecution,
  read: renderReadToolExecution,
  write: renderWriteToolExecution,
  edit: renderEditToolExecution,
  grep: renderGrepToolExecution,
  find: renderFindToolExecution,
  ls: renderLsToolExecution,
};

function renderToolExecution(parent, message) {
  const tool = normalizeToolExecution(message);
  const renderer = WEBUI_TOOL_RENDERERS[tool.name] || renderGenericToolExecution;
  renderer(parent, tool);
  appendToolRawDetails(parent, tool);
}

function liveToolRunMessage(run) {
  return {
    role: "toolExecution",
    title: toolExecutionTitle(run),
    toolName: run.toolName,
    toolCallId: run.toolCallId,
    arguments: run.arguments,
    result: run.result,
    isPartial: run.isPartial,
    isError: run.isError,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    timestamp: run.timestamp,
    live: true,
  };
}

function applyToolExecutionBubbleState(bubble, message) {
  const status = toolExecutionStatus(message);
  const nextClass = `tool-${status}`;
  if (bubble.dataset.toolStatus !== status || !bubble.classList.contains(nextClass)) {
    for (const className of ["tool-pending", "tool-running", "tool-success", "tool-error"]) {
      if (className !== nextClass) bubble.classList.remove(className);
    }
    bubble.classList.add(nextClass);
    bubble.dataset.toolStatus = status;
  }
  bubble.classList.toggle("error", !!(message.isError || status === "error"));
  if (message.toolCallId) {
    const id = String(message.toolCallId);
    bubble.dataset.toolCallId = id;
    if (message.live) liveToolCards.set(id, bubble);
  }
}

function toolDetailsStateKey(details, counts) {
  const classKey = Array.from(details.classList || []).sort().join(".") || "details";
  const summaryText = details.querySelector("summary")?.textContent || "";
  const summaryKey = summaryText.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  const base = `${classKey}|${summaryKey}`;
  const index = counts.get(base) || 0;
  counts.set(base, index + 1);
  return `${base}|${index}`;
}

function captureToolDetailsOpenState(root) {
  const state = new Set();
  const counts = new Map();
  for (const details of root.querySelectorAll("details")) {
    const key = toolDetailsStateKey(details, counts);
    if (details.open) state.add(key);
  }
  return state;
}

function restoreToolDetailsOpenState(root, state) {
  if (!state?.size) return;
  const counts = new Map();
  for (const details of root.querySelectorAll("details")) {
    if (state.has(toolDetailsStateKey(details, counts))) details.open = true;
  }
}

function captureReusableToolCards() {
  const cards = new Map();
  for (const bubble of elements.chat.querySelectorAll(".message.toolExecution[data-tool-call-id]")) {
    const id = bubble.dataset.toolCallId;
    if (id) cards.set(id, bubble);
  }
  return cards;
}

function reuseToolExecutionBubble(reusableToolCards, message, { streaming = false, messageIndex = -1, transient = false } = {}) {
  if (streaming || message?.role !== "toolExecution" || !message.toolCallId || !reusableToolCards) return null;
  const id = String(message.toolCallId);
  const bubble = reusableToolCards.get(id);
  if (!bubble) return null;
  reusableToolCards.delete(id);
  const body = bubble.querySelector(":scope > .message-body");
  if (!body || !updateLiveToolCard(bubble, message)) return null;
  bubble.classList.remove("action-enter", "streaming", "has-action-feedback");
  bubble.querySelector(":scope > .action-feedback-controls")?.remove();
  if (!transient && messageIndex >= 0) {
    bubble.dataset.messageIndex = String(messageIndex);
    bubble.removeAttribute("data-user-prompt");
  } else {
    bubble.removeAttribute("data-message-index");
    bubble.removeAttribute("data-user-prompt");
  }
  if (!streaming && !transient) renderActionFeedbackControls(bubble, message, messageIndex);
  appendChatMessageBubble(bubble);
  return { bubble, body };
}

function updateLiveToolCard(bubble, message) {
  if (!bubble) return false;
  const header = bubble.querySelector(":scope > .message-header");
  const body = bubble.querySelector(":scope > .message-body");
  if (!body) return false;
  attachMessageCopyButton(bubble, message, body);
  applyToolExecutionBubbleState(bubble, message);
  const role = header?.querySelector(".message-role");
  if (role) role.textContent = messageTitle(message);
  const timestamp = header?.querySelector(".muted");
  if (timestamp) timestamp.textContent = formatDate(message.timestamp);
  const nextRenderSignature = toolExecutionRenderSignature(message);
  if (bubble._toolRenderSignature === nextRenderSignature && body.childElementCount > 0) return true;
  const detailsOpenState = captureToolDetailsOpenState(body);
  body.replaceChildren();
  renderToolExecution(body, message);
  restoreToolDetailsOpenState(body, detailsOpenState);
  bubble._toolRenderSignature = nextRenderSignature;
  return true;
}

function cancelQueuedLiveToolRunRender(toolCallId = "") {
  if (toolCallId) liveToolRenderQueue.delete(String(toolCallId));
  else liveToolRenderQueue.clear();
  if (liveToolRenderQueue.size === 0) {
    clearTimeout(liveToolRenderTimer);
    liveToolRenderTimer = null;
  }
}

function clearLiveToolRenderQueue() {
  cancelQueuedLiveToolRunRender();
}

function flushLiveToolRunRenderQueue() {
  const entries = Array.from(liveToolRenderQueue.values());
  clearLiveToolRenderQueue();
  for (const entry of entries) renderLiveToolRun(entry.run, { scroll: entry.scroll });
}

function scheduleLiveToolRunRender(run, { scroll = false } = {}) {
  if (!run?.toolCallId) return;
  const id = String(run.toolCallId);
  const existing = liveToolRenderQueue.get(id);
  liveToolRenderQueue.set(id, { run, scroll: !!(existing?.scroll || scroll) });
  if (liveToolRenderTimer) return;
  liveToolRenderTimer = setTimeout(() => {
    liveToolRenderTimer = null;
    const flush = () => flushLiveToolRunRenderQueue();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
    else flush();
  }, TOOL_LIVE_UPDATE_THROTTLE_MS);
}

function renderLiveToolRun(run, { scroll = true } = {}) {
  if (!run?.toolCallId) return;
  const id = String(run.toolCallId);
  cancelQueuedLiveToolRunRender(id);
  const existing = liveToolCards.get(id);
  const existingConnected = !!(existing?.isConnected && existing.parentElement === elements.chat);
  const shouldFollow = scroll && (autoFollowChat || isChatNearBottom());
  const message = liveToolRunMessage(run);
  rememberActionEntries([{ message, messageIndex: -1, transient: true }]);
  if (existingConnected && updateLiveToolCard(existing, message)) {
    renderRunIndicator({ scroll: false });
    if (shouldFollow) scrollChatToBottom();
    return;
  }
  const created = appendMessage(message, { transient: true, animateEntry: !existingConnected });
  if (existingConnected && existing !== created.bubble) existing.replaceWith(created.bubble);
  renderRunIndicator({ scroll: false });
  if (shouldFollow) scrollChatToBottom();
}

function upsertLiveToolRun(event, patch = {}) {
  const id = String(event.toolCallId || "");
  if (!id) return null;
  const existing = liveToolRuns.get(id) || {};
  const now = Date.now();
  const run = {
    ...existing,
    role: "toolExecution",
    live: true,
    toolCallId: id,
    toolName: event.toolName || existing.toolName || "tool",
    arguments: event.args ?? existing.arguments ?? {},
    timestamp: existing.timestamp || now,
    startedAt: existing.startedAt || now,
    updatedAt: now,
    ...patch,
  };
  liveToolRuns.set(id, run);
  return run;
}

function handleToolExecutionStart(event) {
  const run = upsertLiveToolRun(event, { isPartial: true, isError: false });
  if (run) renderLiveToolRun(run);
}

function handleToolExecutionUpdate(event) {
  const result = { ...(event.partialResult || {}), isError: false };
  const run = upsertLiveToolRun(event, { result, isPartial: true, isError: false });
  if (run) scheduleLiveToolRunRender(run, { scroll: false });
}

function handleToolExecutionEnd(event) {
  const result = { ...(event.result || {}), isError: !!event.isError };
  const run = upsertLiveToolRun(event, { result, isPartial: false, isError: !!event.isError, endedAt: Date.now() });
  if (run) renderLiveToolRun(run);
}

function toolResultPreviewText(message, lineLimit = 10) {
  const text = textFromContent(message?.content).replace(/\s+$/g, "");
  if (!text) return "(empty tool result)";
  const lines = text.split(/\r?\n/);
  const preview = lines.slice(0, lineLimit).join("\n");
  const remaining = Math.max(0, lines.length - lineLimit);
  return remaining > 0 ? `${preview}\n… ${remaining} more line${remaining === 1 ? "" : "s"}; expand for full output` : preview;
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

function appendMessage(message, { streaming = false, messageIndex = -1, transient = false, animateEntry = false, reusableToolCards = null } = {}) {
  const reused = reuseToolExecutionBubble(reusableToolCards, message, { streaming, messageIndex, transient });
  if (reused) return reused;
  const role = String(message.role || "message");
  const safeRole = role.replace(/[^a-z0-9_-]/gi, "");
  const bubble = make("article", `message ${safeRole}${message.level ? ` ${message.level}` : ""}${streaming ? " streaming" : ""}${animateEntry ? " action-enter" : ""}`);
  if (message.role === "toolExecution") applyToolExecutionBubbleState(bubble, message);
  if (!transient && messageIndex >= 0) {
    bubble.dataset.messageIndex = String(messageIndex);
    if (role === "user") bubble.dataset.userPrompt = "true";
  }
  const isCollapsibleOutput = !streaming && (message.role === "toolResult" || message.role === "bashExecution" || message.role === "compactionSummary");

  const hideMessageHeader = message.role === "assistant" && !isCollapsibleOutput;
  if (hideMessageHeader) bubble.setAttribute("aria-label", messageTitle(message));
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
  } else if (message.role === "toolExecution") {
    renderToolExecution(body, message);
    bubble._toolRenderSignature = toolExecutionRenderSignature(message);
  } else if (message.role === "thinking") {
    const thinkingText = visibleThinkingText(message.thinking || textFromContent(message.content));
    if (thinkingOutputVisible && thinkingText) appendText(body, thinkingText, "thinking-text");
  } else if (message.role === "toolCall") {
    appendText(body, JSON.stringify(message.arguments ?? message.content ?? {}, null, 2), "code-block");
  } else if (message.role === "assistantEvent") {
    appendText(body, typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? {}, null, 2), "code-block");
  } else {
    renderContent(body, message.content, { markdown: message.role === "assistant" });
  }

  if (isCollapsibleOutput) {
    const details = make("details", "message-collapse");
    if (message.isError || toolOutputGloballyExpanded) details.open = true;
    details.append(header, body);
    bubble.append(details);
    if (message.role === "toolResult" && !message.isError) {
      const preview = make("div", "tool-result-preview");
      appendText(preview, toolResultPreviewText(message, 10), "code-block tool-result-preview-text");
      bubble.append(preview);
    }
  } else if (hideMessageHeader) {
    bubble.append(body);
  } else {
    bubble.append(header, body);
  }
  attachMessageCopyButton(bubble, message, body);
  if (!streaming && !transient) renderActionFeedbackControls(bubble, message, messageIndex);
  appendChatMessageBubble(bubble);
  return { bubble, body };
}

function appendTranscriptMessage(message, { streaming = false, messageIndex = -1, transient = false, animateEntry = false, reusableToolCards = null } = {}) {
  if (streaming || transient || message?.role !== "assistant") {
    return appendMessage(message, { streaming, messageIndex, transient, animateEntry, reusableToolCards });
  }

  let finalOutput = null;
  const displayMessages = assistantDisplayMessages(message);
  displayMessages.forEach((displayMessage) => {
    let transcriptMessage = displayMessage;
    if (displayMessage.role === "toolCall" && displayMessage.toolCallId) {
      const result = toolResultForCallId(displayMessage.toolCallId);
      const liveRun = liveToolRuns.get(displayMessage.toolCallId);
      transcriptMessage = {
        ...displayMessage,
        role: "toolExecution",
        title: `tool: ${displayMessage.toolName || "unknown"}`,
        arguments: liveRun?.arguments ?? displayMessage.arguments,
        result: result || liveRun?.result || null,
        isPartial: !result && !!liveRun?.isPartial,
        isError: !!(result?.isError || liveRun?.isError),
        startedAt: liveRun?.startedAt || null,
        endedAt: liveRun?.endedAt || null,
        live: !!liveRun && !result,
      };
    }
    if (transcriptMessage.role === "thinking" && !thinkingOutputVisible) return;
    const created = appendMessage(transcriptMessage, {
      streaming: false,
      messageIndex: ["assistant", "toolExecution"].includes(transcriptMessage.role) ? messageIndex : -1,
      transient: false,
      animateEntry: animateEntry && isActionTranscriptMessage(transcriptMessage),
      reusableToolCards,
    });
    if (transcriptMessage.role === "assistant") finalOutput = created;
  });
  return finalOutput;
}

function stateHasRunIndicatorActivity(state = currentState) {
  return !!state?.isStreaming || !!state?.isCompacting || isUserBashActive();
}

function runIndicatorIsActive() {
  return runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState) || isUserBashActive();
}

function clearRunIndicatorGraceCheck() {
  clearTimeout(runIndicatorGraceCheckTimer);
  runIndicatorGraceCheckTimer = null;
}

function scheduleRunIndicatorGraceCheck(tabContext = activeTabContext()) {
  if (!runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState) || !runIndicatorStartedAt) return;
  const elapsedMs = performance.now() - runIndicatorStartedAt;
  const delayMs = Math.max(120, RUN_INDICATOR_START_GRACE_MS - elapsedMs + 120);
  clearRunIndicatorGraceCheck();
  runIndicatorGraceCheckTimer = setTimeout(() => {
    runIndicatorGraceCheckTimer = null;
    if (!isCurrentTabContext(tabContext) || !runIndicatorLocallyActive || stateHasRunIndicatorActivity(currentState)) return;
    runIndicatorLastStateCheckAt = performance.now();
    refreshState(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
    });
  }, delayMs);
}

function maybeRefreshRunIndicatorState(tabContext = activeTabContext()) {
  if (!runIndicatorIsActive()) return;
  const now = performance.now();
  if (now - runIndicatorLastStateCheckAt < RUN_INDICATOR_STATE_RECHECK_MS) return;
  runIndicatorLastStateCheckAt = now;
  refreshState(tabContext).catch((error) => {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  });
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
  return "Agent is running: ";
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

function createRunIndicatorBubble() {
  runIndicatorBubble = make("article", "message runIndicator run-indicator-message streaming");
  runIndicatorBubble.setAttribute("aria-live", "polite");
  runIndicatorBubble.setAttribute("aria-label", "Agent is running:");

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

function ensureRunIndicatorBubble() {
  if (!runIndicatorBubble || !runIndicatorText || !runIndicatorMeta) createRunIndicatorBubble();
  if (elements.chat.lastElementChild !== runIndicatorBubble) elements.chat.append(runIndicatorBubble);
}

function updateRunIndicatorBubble() {
  if (!runIndicatorIsActive()) return;
  if (!runIndicatorStartedAt) runIndicatorStartedAt = performance.now();
  ensureRunIndicatorBubble();
  const headline = runIndicatorHeadline();
  if (runIndicatorText.textContent !== headline) runIndicatorText.textContent = headline;
  const detail = runIndicatorDetail();
  const meta = runIndicatorShowsElapsed() ? `${detail} · run time ${formatRunIndicatorElapsed()}` : detail;
  if (runIndicatorMeta.textContent !== meta) runIndicatorMeta.textContent = meta;
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
  updateComposerModeButtons();
  if (active) scheduleRunIndicatorGraceCheck();
}

function clearRunIndicatorActivity({ render = true } = {}) {
  clearRunIndicatorGraceCheck();
  runIndicatorLastStateCheckAt = 0;
  runIndicatorLocallyActive = false;
  runIndicatorStartedAt = null;
  runIndicatorActivity = "Waiting for output or action…";
  if (render) renderRunIndicator();
  updateComposerModeButtons();
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
  updateComposerModeButtons();
}

function runIndicatorToolName(name) {
  return cleanStatusText(name || "tool") || "tool";
}

function scheduleAbortStateChecks(tabContext = activeTabContext()) {
  for (const delay of [250, 900, 1800, 3600]) {
    setTimeout(() => {
      if (!isCurrentTabContext(tabContext)) return;
      refreshState(tabContext).catch((error) => {
        if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
      });
    }, delay);
  }
}

function messageTimestampMs(message) {
  const timestamp = message?.timestamp;
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(String(timestamp || ""));
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function isActionTranscriptMessage(message) {
  return ["assistantEvent", "bashExecution", "toolCall", "toolExecution", "toolResult"].includes(message?.role);
}

function assistantMessageHasActionContent(message) {
  return message?.role === "assistant" && Array.isArray(message.content) && message.content.some(isAssistantToolCallPart);
}

function isActionEntryItem(item) {
  return isActionTranscriptMessage(item?.message) || assistantMessageHasActionContent(item?.message);
}

function actionEntrySeenKeys(tabId = activeTabId) {
  if (!tabId) return new Set();
  let keys = actionEntrySeenKeysByTab.get(tabId);
  if (!keys) {
    keys = new Set();
    actionEntrySeenKeysByTab.set(tabId, keys);
  }
  return keys;
}

function actionEntryKey(item) {
  const message = item?.message || {};
  const keyedToolExecution = message.role === "toolExecution" && message.toolCallId;
  return [
    keyedToolExecution ? "toolExecution" : item?.transient ? "transient" : "message",
    keyedToolExecution ? "" : (item?.messageIndex ?? -1),
    message.role || "message",
    message.toolName || "",
    message.toolCallId || "",
    keyedToolExecution ? "" : message.command || "",
    keyedToolExecution ? "" : message.title || "",
    keyedToolExecution ? "" : message.timestamp || "",
    keyedToolExecution ? "" : textFromContent(message.content).slice(0, 240),
  ].join("|");
}

function shouldAnimateActionEntry(item) {
  if (!activeTabId || !actionEntryAnimationPrimedTabs.has(activeTabId) || !isActionEntryItem(item)) return false;
  return !actionEntrySeenKeys(activeTabId).has(actionEntryKey(item));
}

function rememberActionEntries(items) {
  if (!activeTabId) return;
  const keys = actionEntrySeenKeys(activeTabId);
  for (const item of items) {
    if (isActionEntryItem(item)) keys.add(actionEntryKey(item));
  }
  actionEntryAnimationPrimedTabs.add(activeTabId);
}

function orderedTranscriptItems() {
  const items = [];
  const assistantToolCallIds = buildAssistantToolCallIdSet(latestMessages);
  const toolResults = buildToolResultMap(latestMessages);
  latestMessages.forEach((message, index) => {
    const resultId = message?.role === "toolResult" ? toolResultCallId(message) : "";
    if (resultId && assistantToolCallIds.has(resultId)) return;
    items.push({ message, messageIndex: index, transient: false, timestampMs: messageTimestampMs(message), order: index });
  });
  transientMessages.forEach((message, index) => {
    items.push({ message, messageIndex: index, transient: true, timestampMs: messageTimestampMs(message), order: latestMessages.length + index });
  });
  let liveOrder = latestMessages.length + transientMessages.length;
  for (const [toolCallId, run] of liveToolRuns.entries()) {
    if (assistantToolCallIds.has(toolCallId) || toolResults.has(toolCallId)) continue;
    const message = liveToolRunMessage(run);
    items.push({ message, messageIndex: -1, transient: true, timestampMs: messageTimestampMs(message), order: liveOrder++ });
  }
  return items.sort((a, b) => a.timestampMs - b.timestampMs || a.order - b.order);
}

function renderAllMessages({ preserveScroll = false } = {}) {
  const shouldFollow = !preserveScroll && (autoFollowChat || isChatNearBottom());
  const previousScrollTop = elements.chat.scrollTop;
  const reusableToolCards = captureReusableToolCards();
  resetChatOutput();
  const transcriptItems = orderedTranscriptItems();
  for (const item of transcriptItems) {
    appendTranscriptMessage(item.message, {
      messageIndex: item.messageIndex,
      transient: item.transient,
      animateEntry: shouldAnimateActionEntry(item),
      reusableToolCards,
    });
  }
  rememberActionEntries(transcriptItems);
  applyToolOutputExpansionToDom();
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

function addTransientMessage({ role = "notice", title, content, level = "info", ...details }) {
  transientMessages.push({
    role,
    title,
    level,
    content,
    ...details,
    timestamp: Date.now(),
  });
  if (transientMessages.length > 80) transientMessages.splice(0, transientMessages.length - 80);
  renderAllMessages();
}

function addAbortTranscriptNotice({ activeRun = false, errorMessage = "" } = {}) {
  if (errorMessage) {
    addTransientMessage({ role: "error", title: "Abort failed", content: `Abort request failed: ${errorMessage}`, level: "error" });
    return;
  }
  addTransientMessage({
    role: "native",
    title: activeRun ? "Agent aborted" : "Abort requested",
    content: activeRun
      ? "⛔ Agent run aborted by user from the Web UI. Pi was told to stop; this transcript marks the run as aborted."
      : "⛔ Abort requested from the Web UI, but no active agent run was visible in this tab.",
    level: activeRun ? "warn" : "info",
  });
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
  if (!hasComposerPayload()) {
    showComposerButtonTooltip(button);
    return;
  }
  sendPrompt(kind);
}

function setPublishMenuOpen(open) {
  publishMenuOpen = !!open;
  elements.publishButton.setAttribute("aria-expanded", publishMenuOpen ? "true" : "false");
  elements.publishButton.classList.toggle("menu-open", publishMenuOpen);
  elements.publishButton.parentElement?.classList.toggle("open", publishMenuOpen);
}

function setNativeCommandMenuOpen(open) {
  nativeCommandMenuOpen = !!open;
  elements.nativeCommandMenuButton.setAttribute("aria-expanded", nativeCommandMenuOpen ? "true" : "false");
  elements.nativeCommandMenuButton.classList.toggle("menu-open", nativeCommandMenuOpen);
  elements.nativeCommandMenuButton.parentElement?.classList.toggle("open", nativeCommandMenuOpen);
}

function setAppRunnerMenuOpen(open) {
  appRunnerMenuOpen = !!open;
  elements.appRunnerMenuButton?.setAttribute("aria-expanded", appRunnerMenuOpen ? "true" : "false");
  elements.appRunnerMenuButton?.classList.toggle("menu-open", appRunnerMenuOpen);
  elements.appRunnerMenuButton?.parentElement?.classList.toggle("open", appRunnerMenuOpen);
}

function setOptionsMenuOpen(open) {
  optionsMenuOpen = !!open;
  elements.optionsMenuButton.setAttribute("aria-expanded", optionsMenuOpen ? "true" : "false");
  elements.optionsMenuButton.classList.toggle("menu-open", optionsMenuOpen);
  elements.optionsMenuButton.parentElement?.classList.toggle("open", optionsMenuOpen);
}

function optionalFeatureIdForCommand(name) {
  if (OPTIONAL_COMMAND_FEATURES.has(name)) return OPTIONAL_COMMAND_FEATURES.get(name);
  if (name === "release-toggle" || name === "release-abort" || name === "release-npm-logs") return "releaseNpm";
  if (name === "release-aur" || name.startsWith("release-aur-")) return "releaseAur";
  if (name === "stats" || name.startsWith("stats-") || name === "calibrate") return "statsCommand";
  return null;
}

function isCommandVisible(command) {
  if (HIDDEN_COMMAND_NAMES.has(command.name)) return false;
  if (command.enabled === false) return false;
  const featureId = optionalFeatureIdForCommand(command.name);
  return !featureId || isOptionalFeatureEnabled(featureId);
}

function visibleCommands() {
  return availableCommands.filter(isCommandVisible);
}

function hasAvailableCommand(name) {
  return availableCommands.some((command) => command.name === name);
}

function hasLoadedRpcCommand(name) {
  return rawAvailableCommands.some((command) => command.name === name && command.source !== "native");
}

function optionalFeatureUnavailableMessage(featureId) {
  const feature = OPTIONAL_FEATURE_BY_ID.get(featureId);
  if (!feature) return "Optional feature unavailable.";
  if (isOptionalFeatureDisabled(featureId)) return `${feature.label} is disabled in the Web UI optional-features panel.`;
  return `${feature.label} unavailable: ${feature.capabilityLabel} is not loaded. Install or enable ${feature.packageName}.`;
}

function rememberOptionalControlDefault(button, key, value) {
  if (!(key in button.dataset)) button.dataset[key] = value || "";
}

function setOptionalControlState(button, available, unavailableTitle) {
  if (!button) return;
  rememberOptionalControlDefault(button, "defaultTitle", button.getAttribute("title"));
  rememberOptionalControlDefault(button, "defaultAriaLabel", button.getAttribute("aria-label"));
  if (button.hasAttribute("data-tooltip")) rememberOptionalControlDefault(button, "defaultTooltip", button.getAttribute("data-tooltip"));

  const nextTitle = available ? button.dataset.defaultTitle : unavailableTitle;
  const nextAriaLabel = available ? button.dataset.defaultAriaLabel : unavailableTitle;
  const nextTooltip = available ? button.dataset.defaultTooltip : unavailableTitle;

  button.disabled = !available;
  button.setAttribute("aria-disabled", available ? "false" : "true");
  button.classList.toggle("feature-unavailable", !available);
  if (nextTitle) button.setAttribute("title", nextTitle);
  else button.removeAttribute("title");
  if (nextAriaLabel) button.setAttribute("aria-label", nextAriaLabel);
  else button.removeAttribute("aria-label");
  if (button.dataset.defaultTooltip !== undefined) {
    if (nextTooltip) button.setAttribute("data-tooltip", nextTooltip);
    else button.removeAttribute("data-tooltip");
  }
}

function resetOptionalFeatureAvailability() {
  for (const key of Object.keys(optionalFeatureAvailability)) optionalFeatureAvailability[key] = false;
  optionalFeatureAvailability.themeBundle = availableThemes.length > 0;
  renderOptionalFeatureControls();
}

function requestGitFooterWebuiPayload(tabContext = activeTabContext(), { force = false } = {}) {
  if (!tabContext.tabId || isOptionalFeatureDisabled("gitFooterStatus")) return;
  if (currentState?.isStreaming || currentState?.isCompacting) return;
  if (!hasAvailableCommand("git-footer-refresh") || (!force && statusEntries.has(GIT_FOOTER_WEBUI_STATUS_KEY))) return;
  if (gitFooterPayloadRefreshInFlightByTab.has(tabContext.tabId)) return;

  gitFooterPayloadRefreshInFlightByTab.add(tabContext.tabId);
  if (isCurrentTabContext(tabContext)) renderFooter();
  api("/api/prompt", {
    method: "POST",
    body: { message: "/git-footer-refresh --webui-silent", streamingBehavior: "steer" },
    tabId: tabContext.tabId,
  }).catch((error) => {
    if (isCurrentTabContext(tabContext)) addEvent(`git footer payload refresh failed: ${error.message || String(error)}`, "warn");
  }).finally(() => {
    gitFooterPayloadRefreshInFlightByTab.delete(tabContext.tabId);
    if (isCurrentTabContext(tabContext)) renderFooter();
  });
}

function updateOptionalFeatureAvailability() {
  optionalFeatureAvailability.gitWorkflow = hasAvailableCommand("git-staged-msg");
  optionalFeatureAvailability.releaseNpm = hasAvailableCommand("release-npm");
  optionalFeatureAvailability.releaseAur = hasAvailableCommand("release-aur");
  optionalFeatureAvailability.statsCommand = hasAvailableCommand("stats");
  optionalFeatureAvailability.gitFooterStatus = hasAvailableCommand("git-footer-refresh") || optionalFeatureAvailability.gitFooterStatus || statusEntries.has("git-footer") || statusEntries.has(GIT_FOOTER_WEBUI_STATUS_KEY);
  optionalFeatureAvailability.tuiSkillsCommand = hasLoadedRpcCommand("skills");
  optionalFeatureAvailability.todoProgressWidget = hasAvailableCommand("todo-progress-status") || optionalFeatureAvailability.todoProgressWidget || widgets.has("todo-progress");
  optionalFeatureAvailability.tuiToolsCommand = hasLoadedRpcCommand("tools");
  optionalFeatureAvailability.themeBundle = availableThemes.length > 0;
  requestGitFooterWebuiPayload();
  renderOptionalFeatureControls();
}

function optionalFeatureStatus(featureId) {
  const detected = isOptionalFeatureDetected(featureId);
  const disabled = isOptionalFeatureDisabled(featureId);
  if (detected && !disabled) return { label: "Enabled", className: "enabled", detail: "Detected and enabled in Web UI" };
  if (detected && disabled) return { label: "Disabled", className: "disabled", detail: "Detected, but disabled in Web UI" };
  return { label: "Install needed", className: "missing", detail: "Not detected in the active Pi tab" };
}

function optionalFeatureWidgetFeatureId(key) {
  if (key.startsWith("release-npm:")) return "releaseNpm";
  if (key.startsWith("release-aur:")) return "releaseAur";
  if (key === "todo-progress") return "todoProgressWidget";
  return null;
}

function renderOptionalFeaturePanel() {
  if (!elements.optionalFeaturesBox) return;
  elements.optionalFeaturesBox.replaceChildren();
  elements.optionalFeaturesBox.classList.remove("muted");

  for (const feature of OPTIONAL_FEATURES) {
    const detected = isOptionalFeatureDetected(feature.id);
    const enabled = isOptionalFeatureEnabled(feature.id);
    const installing = optionalFeatureInstallInProgress.has(feature.id);
    const status = optionalFeatureStatus(feature.id);
    const row = make("div", `optional-feature-row ${status.className}`);

    const main = make("div", "optional-feature-main");
    const title = make("div", "optional-feature-title");
    title.append(make("strong", undefined, feature.label), make("span", `optional-feature-pill ${status.className}`, status.label));
    const detail = make("div", "optional-feature-detail", `${status.detail} · checks ${feature.capabilityLabel}`);
    const description = make("div", "optional-feature-description", feature.description);
    const packageLine = make("code", "optional-feature-package", feature.packageName);
    main.append(title, detail, description, packageLine);

    const action = make("button", "optional-feature-action");
    action.type = "button";
    action.disabled = installing;
    if (installing) {
      action.textContent = "Installing…";
    } else if (detected) {
      action.textContent = enabled ? "Disable" : "Enable";
      action.addEventListener("click", () => setOptionalFeatureDisabled(feature.id, enabled));
    } else {
      action.textContent = "Install…";
      action.classList.add("install");
      action.addEventListener("click", () => installOptionalFeature(feature.id));
    }

    row.append(main, action);
    elements.optionalFeaturesBox.append(row);
  }
}

function renderOptionalFeatureControls() {
  const hasGitWorkflow = isOptionalFeatureEnabled("gitWorkflow");
  elements.gitWorkflowButton.hidden = !hasGitWorkflow;
  setOptionalControlState(
    elements.gitWorkflowButton,
    hasGitWorkflow,
    optionalFeatureUnavailableMessage("gitWorkflow"),
  );

  elements.releaseNpmButton.hidden = !isOptionalFeatureEnabled("releaseNpm");
  elements.releaseAurButton.hidden = !isOptionalFeatureEnabled("releaseAur");
  const hasPublishWorkflow = isOptionalFeatureEnabled("releaseNpm") || isOptionalFeatureEnabled("releaseAur");
  const publishContainer = elements.publishButton.parentElement;
  if (publishContainer) publishContainer.hidden = !hasPublishWorkflow;
  elements.publishButton.hidden = !hasPublishWorkflow;
  setOptionalControlState(
    elements.publishButton,
    hasPublishWorkflow,
    "Publish workflows unavailable: enable/install NPM Release and/or AUR Release in Optional features.",
  );
  if (!hasPublishWorkflow && publishMenuOpen) setPublishMenuOpen(false);

  const hasNativeCommandMenu = isOptionalFeatureEnabled("tuiSkillsCommand") || isOptionalFeatureEnabled("tuiToolsCommand");
  elements.nativeSkillsButton.hidden = !isOptionalFeatureEnabled("tuiSkillsCommand");
  elements.nativeToolsButton.hidden = !isOptionalFeatureEnabled("tuiToolsCommand");
  const nativeCommandMenuContainer = elements.nativeCommandMenuButton.parentElement;
  if (nativeCommandMenuContainer) nativeCommandMenuContainer.hidden = !hasNativeCommandMenu;
  elements.nativeCommandMenuButton.hidden = !hasNativeCommandMenu;
  setOptionalControlState(
    elements.nativeCommandMenuButton,
    hasNativeCommandMenu,
    "Slash command menu unavailable: enable/install TUI Skills command and/or TUI Tools command in Optional features.",
  );
  if (!hasNativeCommandMenu && nativeCommandMenuOpen) setNativeCommandMenuOpen(false);

  renderOptionalFeaturePanel();
}

function commandUnavailableMessage(commandName) {
  const featureId = optionalFeatureIdForCommand(commandName);
  if (featureId) return optionalFeatureUnavailableMessage(featureId);
  return `Command unavailable: /${commandName} is not loaded in the active Pi tab.`;
}

async function installOptionalFeature(featureId) {
  const feature = OPTIONAL_FEATURE_BY_ID.get(featureId);
  if (!feature || optionalFeatureInstallInProgress.has(featureId)) return;

  const warning = [
    `Install optional feature: ${feature.label}?`,
    "",
    `This will run npm install for ${feature.packageName} in the Web UI package install root.`,
    "It can download code from npm and modify the local Pi/Web UI npm installation.",
    "If this feature is already installed but disabled in Pi settings, cancel and enable it there instead.",
    "",
    "Continue?",
  ].join("\n");
  if (!confirm(warning)) return;

  optionalFeatureInstallInProgress.add(featureId);
  renderOptionalFeatureControls();
  addEvent(`installing optional feature ${feature.label} (${feature.packageName})…`, "warn");
  try {
    const response = await api("/api/optional-feature-install", { method: "POST", body: { featureId }, scoped: false });
    disabledOptionalFeatures.delete(featureId);
    storeDisabledOptionalFeatures();
    addEvent(response.data?.message || `installed ${feature.packageName}`, "info");
    if (confirm(`${feature.label} install finished. Reload the active Pi tab now to enable newly loaded resources?`)) {
      sendPrompt("prompt", "/reload");
    } else {
      const tabContext = activeTabContext();
      await Promise.allSettled([refreshCommands(tabContext), initializeThemes()]);
      if (isCurrentTabContext(tabContext)) renderOptionalFeatureControls();
    }
  } catch (error) {
    addEvent(error.message || String(error), "error");
  } finally {
    optionalFeatureInstallInProgress.delete(featureId);
    renderOptionalFeatureControls();
  }
}

function runPublishWorkflow(command) {
  setComposerActionsOpen(false);
  setPublishMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  const commandName = String(command || "").replace(/^\//, "").split(/\s+/)[0];
  const featureId = OPTIONAL_COMMAND_FEATURES.get(commandName);
  if ((featureId && !isOptionalFeatureEnabled(featureId)) || !hasAvailableCommand(commandName)) {
    const tabContext = activeTabContext();
    addEvent(commandUnavailableMessage(commandName), "warn");
    refreshCommands(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
    });
    return;
  }
  sendPrompt("prompt", command);
}

async function runNativeCommandMenu(command) {
  setComposerActionsOpen(false);
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  const commandName = String(command || "").replace(/^\//, "").split(/\s+/)[0].toLowerCase();
  const featureId = optionalFeatureIdForCommand(commandName);
  if ((featureId && !isOptionalFeatureEnabled(featureId)) || !hasAvailableCommand(commandName)) {
    const tabContext = activeTabContext();
    addEvent(commandUnavailableMessage(commandName), "warn");
    refreshCommands(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
    });
    return;
  }
  if (await handleNativeSlashSelectorCommand(command)) return;
  await sendPrompt("prompt", command);
}

function slashCommandName(message) {
  const match = String(message || "").trim().match(/^\/([^\s]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function openNativeCommandDialog({ title, message = "", searchPlaceholder = "" } = {}) {
  nativeCommandTabId ||= activeTabId;
  elements.nativeCommandTitle.textContent = title || "Pi command";
  elements.nativeCommandMessage.textContent = message;
  elements.nativeCommandMessage.hidden = !message;
  elements.nativeCommandSearch.value = "";
  elements.nativeCommandSearch.placeholder = searchPlaceholder || "Filter choices…";
  elements.nativeCommandSearch.hidden = !searchPlaceholder;
  elements.nativeCommandSearch.oninput = null;
  elements.nativeCommandBody.replaceChildren();
  elements.nativeCommandError.hidden = true;
  elements.nativeCommandError.textContent = "";
  elements.nativeCommandActions.replaceChildren();
  addNativeCommandAction("Cancel", closeNativeCommandDialog);
  if (!elements.nativeCommandDialog.open) elements.nativeCommandDialog.showModal();
  if (searchPlaceholder) queueMicrotask(() => elements.nativeCommandSearch.focus());
}

function closeNativeCommandDialog() {
  if (elements.nativeCommandDialog.open) elements.nativeCommandDialog.close();
  elements.nativeCommandSearch.oninput = null;
  nativeCommandTabId = null;
}

function nativeCommandApi(path, options = {}) {
  return api(path, { ...options, tabId: options.tabId || nativeCommandTabId || activeTabId });
}

function setNativeCommandError(message) {
  elements.nativeCommandError.textContent = message || "";
  elements.nativeCommandError.hidden = !message;
}

function addNativeCommandAction(label, handler, className) {
  const button = make("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  elements.nativeCommandActions.append(button);
  return button;
}

function renderNativeLoading(label = "Loading…") {
  elements.nativeCommandBody.replaceChildren(make("div", "native-command-empty muted", label));
}

function nativeSelectorMatches(item, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  const tags = Array.isArray(item.tags) ? item.tags.map((tag) => tag?.label) : [];
  return [item.label, item.description, item.meta, item.badge, ...tags]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function renderNativeSelectorItems(items, { emptyText = "No choices.", onSelect, activeId } = {}) {
  const query = elements.nativeCommandSearch.value.trim();
  const filtered = items.filter((item) => nativeSelectorMatches(item, query));
  elements.nativeCommandBody.replaceChildren();
  if (!filtered.length) {
    elements.nativeCommandBody.append(make("div", "native-command-empty muted", emptyText));
    return;
  }
  const list = make("div", "native-selector-list");
  for (const item of filtered) {
    const button = make("button", `native-selector-item${item.id === activeId ? " active" : ""}`);
    button.type = "button";
    if (item.depth !== undefined) button.style.setProperty("--tree-depth", String(item.depth));
    button.disabled = item.disabled === true;
    button.addEventListener("click", () => onSelect?.(item));
    const title = make("span", "native-selector-title");
    title.append(make("strong", undefined, item.label || item.id || "choice"));
    if (item.badge) {
      const badgeState = String(item.badge).toLowerCase();
      const badge = make("span", `native-selector-badge${item.badgeClass ? ` ${item.badgeClass}` : ""}`, item.badge);
      badge.dataset.badgeState = badgeState;
      if (badgeState === "disabled" || String(item.badgeClass || "").includes("disabled")) {
        badge.style.borderColor = "rgba(255, 159, 67, 0.62)";
        badge.style.color = "#ff9f43";
        badge.style.background = "rgba(255, 159, 67, 0.10)";
      }
      title.append(badge);
    }
    for (const tag of Array.isArray(item.tags) ? item.tags : []) {
      if (!tag?.label) continue;
      title.append(make("span", `native-selector-badge${tag.className ? ` ${tag.className}` : ""}`, tag.label));
    }
    const detail = make("span", "native-selector-detail", item.description || "");
    const meta = make("span", "native-selector-meta", item.meta || "");
    button.append(title);
    if (item.description) button.append(detail);
    if (item.meta) button.append(meta);
    list.append(button);
  }
  elements.nativeCommandBody.append(list);
}

function setNativeActionBusy(button, busy, label = "Working…") {
  if (!button) return;
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent || "";
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.defaultLabel;
}

function modelOptionLabel(model) {
  return `${model.provider}/${model.id}`;
}

async function openNativeModelSelector() {
  openNativeCommandDialog({ title: "/model", message: "Select the active model for this Pi tab.", searchPlaceholder: "Filter models…" });
  renderNativeLoading("Loading models…");
  try {
    const response = await nativeCommandApi("/api/models");
    const models = Array.isArray(response.data?.models) ? response.data.models : [];
    const activeId = currentState?.model ? `${currentState.model.provider}/${currentState.model.id}` : "";
    const items = models.map((model) => ({
      id: modelOptionLabel(model),
      label: modelOptionLabel(model),
      description: model.name || model.description || "",
      meta: model.contextWindow ? `context ${model.contextWindow}` : model.provider,
      model,
      badge: modelOptionLabel(model) === activeId ? "current" : "",
    }));
    const render = () => renderNativeSelectorItems(items, {
      emptyText: "No models match this filter.",
      activeId,
      onSelect: async (item) => {
        setNativeCommandError("");
        const tabContext = activeTabContext(nativeCommandTabId || activeTabId);
        try {
          const response = await nativeCommandApi("/api/model", { method: "POST", body: { provider: item.model.provider, modelId: item.model.id } });
          applyOptimisticModelSelection(response.data || item.model, tabContext);
          addTransientMessage({ role: "native", title: "/model", content: `Model set to ${item.label}.`, level: "info" });
          closeNativeCommandDialog();
          await refreshState(tabContext);
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        }
      },
    });
    elements.nativeCommandSearch.oninput = render;
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

function openNativeThemeSelector() {
  openNativeCommandDialog({ title: "/theme", message: "Select the browser Web UI theme. Pi terminal theme changes remain native-TUI only.", searchPlaceholder: "Filter themes…" });
  const load = async () => {
    if (!availableThemes.length) await initializeThemes();
    const items = availableThemes.map((theme) => ({
      id: theme.name,
      label: theme.label || displayThemeName(theme.name) || theme.name,
      description: theme.name,
      meta: theme.author ? `by ${theme.author}` : "browser theme",
      theme,
      badge: theme.name === currentThemeName ? "current" : "",
    }));
    const render = () => renderNativeSelectorItems(items, {
      emptyText: "No themes match this filter.",
      activeId: currentThemeName,
      onSelect: async (item) => {
        try {
          await setThemeByName(item.theme.name, { persist: true, announce: true });
          addTransientMessage({ role: "native", title: "/theme", content: `Theme set to ${item.label}.`, level: "info" });
          closeNativeCommandDialog();
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        }
      },
    });
    elements.nativeCommandSearch.oninput = render;
    render();
  };
  renderNativeLoading("Loading themes…");
  load().catch((error) => {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  });
}

function nativeSettingsBadge(label, tone = "") {
  return make("span", `native-settings-badge${tone ? ` native-settings-badge-${tone}` : ""}`, label);
}

function normalizedSettingsBadge(badge) {
  if (!badge) return null;
  if (typeof badge === "string") return { label: badge, tone: "" };
  return badge;
}

function nativeSettingsLabelRow(label, badge) {
  const row = make("span", "native-settings-label-row");
  row.append(make("span", "native-settings-label", label));
  const normalized = normalizedSettingsBadge(badge);
  if (normalized?.label) row.append(nativeSettingsBadge(normalized.label, normalized.tone));
  return row;
}

function normalizedSettingOptions(options) {
  return options.map((option) => {
    if (typeof option === "string" || typeof option === "number") return { value: String(option), label: String(option) };
    return { value: String(option.value), label: option.label || String(option.value) };
  });
}

function nativeSettingSelect(label, value, options, hint, badge) {
  const field = make("label", "native-settings-field");
  field.append(nativeSettingsLabelRow(label, badge));
  const select = make("select");
  for (const option of normalizedSettingOptions(options)) {
    const element = make("option", undefined, option.label);
    element.value = option.value;
    select.append(element);
  }
  select.value = String(value);
  field.append(select);
  if (hint) field.append(make("span", "native-settings-hint", hint));
  return { field, select };
}

function nativeSettingToggle(label, checked, hint, badge) {
  const field = make("label", "native-settings-toggle");
  const input = make("input");
  input.type = "checkbox";
  input.checked = !!checked;
  const text = make("span");
  text.append(nativeSettingsLabelRow(label, badge));
  if (hint) text.append(make("span", "native-settings-hint", hint));
  field.append(input, text);
  return { field, input };
}

function nativeSettingsSection(title, description, controls, { open = true, badge } = {}) {
  const section = make("details", "native-settings-section");
  section.open = !!open;
  const summary = make("summary", "native-settings-section-summary");
  const titleRow = make("span", "native-settings-section-title");
  titleRow.append(make("strong", undefined, title));
  const normalized = normalizedSettingsBadge(badge);
  if (normalized?.label) titleRow.append(nativeSettingsBadge(normalized.label, normalized.tone));
  summary.append(titleRow);
  if (description) summary.append(make("span", "native-settings-section-description", description));
  const grid = make("div", "native-settings-grid");
  grid.append(...controls.map((control) => control.field || control));
  section.append(summary, grid);
  return section;
}

function nativeSettingsNote(title, text) {
  const note = make("div", "native-settings-note");
  note.append(make("strong", undefined, title));
  note.append(make("span", undefined, text));
  return note;
}

function currentHttpIdleTimeoutValue(settings) {
  return String(settings.httpIdleTimeoutMs ?? "300000");
}

function httpIdleTimeoutOptions(settings) {
  const current = currentHttpIdleTimeoutValue(settings);
  if (SETTINGS_HTTP_IDLE_TIMEOUT_OPTIONS.some((option) => option.value === current)) return SETTINGS_HTTP_IDLE_TIMEOUT_OPTIONS;
  const label = Number(current) === 0 ? "disabled (current)" : `${Number(current) / 1000} sec (current)`;
  return [{ value: current, label }, ...SETTINGS_HTTP_IDLE_TIMEOUT_OPTIONS];
}

function collectNativeSettingsPayload(controls) {
  return {
    transport: controls.transport.select.value,
    httpIdleTimeoutMs: Number(controls.httpIdleTimeout.select.value),
    autoResizeImages: controls.autoResizeImages.input.checked,
    blockImages: controls.blockImages.input.checked,
    enableSkillCommands: controls.skillCommands.input.checked,
    hideThinkingBlock: !controls.thinkingOutput.input.checked,
    showImages: controls.showImages.input.checked,
    imageWidthCells: Number(controls.imageWidth.select.value),
    collapseChangelog: controls.collapseChangelog.input.checked,
    quietStartup: controls.quietStartup.input.checked,
    enableInstallTelemetry: controls.installTelemetry.input.checked,
    doubleEscapeAction: controls.doubleEscape.select.value,
    treeFilterMode: controls.treeFilter.select.value,
    showHardwareCursor: controls.hardwareCursor.input.checked,
    editorPaddingX: Number(controls.editorPadding.select.value),
    autocompleteMaxVisible: Number(controls.autocompleteMax.select.value),
    clearOnShrink: controls.clearOnShrink.input.checked,
    showTerminalProgress: controls.terminalProgress.input.checked,
    warnings: { anthropicExtraUsage: controls.anthropicWarning.input.checked },
  };
}

function nativeSettingsChangedMessage(response, reloadRequested) {
  const changed = response.data?.changed || [];
  const reloadRecommended = response.data?.reloadRecommended || [];
  if (response.data?.reloaded) return `Settings updated and tab reloaded (${changed.length || 0} changed).`;
  if (reloadRecommended.length) return `Settings updated. Reload tab to apply: ${reloadRecommended.join(", ")}.`;
  if (reloadRequested) return `Settings updated. No reload-needed changes were detected.`;
  return `Settings updated${changed.length ? ` (${changed.length} changed)` : ""}.`;
}

async function openNativeSettingsDialog() {
  openNativeCommandDialog({ title: "/settings", message: "Pi settings for this Web UI tab. Badges show whether changes apply now, in the browser, or after reloading the tab." });
  renderNativeLoading("Loading settings…");
  let settingsData;
  try {
    const response = await nativeCommandApi("/api/settings");
    settingsData = response.data || {};
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
    return;
  }

  const state = currentState || {};
  const settings = settingsData.settings || {};
  applyNativeSettingsForBrowser(settings);

  const controls = {
    thinking: nativeSettingSelect("Thinking level", state.thinkingLevel || "off", SETTINGS_THINKING_OPTIONS, "Reasoning depth for thinking-capable models.", { label: "now", tone: "now" }),
    autoCompact: nativeSettingToggle("Auto-compact", state.autoCompactionEnabled !== false, "Let Pi compact when context is nearly full.", { label: "now", tone: "now" }),
    steering: nativeSettingSelect("Steering mode", state.steeringMode || "one-at-a-time", [
      { value: "one-at-a-time", label: "one at a time" },
      { value: "all", label: "all queued" },
    ], "How Enter messages are delivered while the agent is streaming.", { label: "now", tone: "now" }),
    followUp: nativeSettingSelect("Follow-up mode", state.followUpMode || "one-at-a-time", [
      { value: "one-at-a-time", label: "one at a time" },
      { value: "all", label: "all queued" },
    ], "How queued follow-ups are delivered after the current response.", { label: "now", tone: "now" }),
    transport: nativeSettingSelect("Transport", settings.transport || "auto", SETTINGS_TRANSPORT_OPTIONS, "Preferred provider transport when multiple transports are supported.", { label: "reload", tone: "reload" }),
    httpIdleTimeout: nativeSettingSelect("HTTP idle timeout", currentHttpIdleTimeoutValue(settings), httpIdleTimeoutOptions(settings), "Maximum idle gap while waiting for provider HTTP data.", { label: "reload", tone: "reload" }),
    busyBehavior: nativeSettingSelect("Busy prompt behavior", busyPromptBehavior, [
      { value: "followUp", label: "follow-up" },
      { value: "steer", label: "steer" },
    ], "When you submit a normal prompt while a tab is already busy.", { label: "browser", tone: "browser" }),
    thinkingOutput: nativeSettingToggle("Show thinking output", settings.hideThinkingBlock !== true, "Browser transcript visibility; also writes Pi's hide-thinking setting.", { label: "browser", tone: "browser" }),
    doneNotifications: nativeSettingToggle("Agent done notifications", agentDoneNotificationsEnabled, "Browser notification after background tab work completes.", { label: "browser", tone: "browser" }),
    autocompleteMax: nativeSettingSelect("Autocomplete max items", settings.autocompleteMaxVisible ?? autocompleteMaxVisible, SETTINGS_AUTOCOMPLETE_OPTIONS, "Maximum visible slash/path suggestions.", { label: "browser", tone: "browser" }),
    doubleEscape: nativeSettingSelect("Double-escape action", settings.doubleEscapeAction || doubleEscapeAction, SETTINGS_DOUBLE_ESCAPE_OPTIONS, "Action when pressing Escape twice with an empty composer.", { label: "browser", tone: "browser" }),
    treeFilter: nativeSettingSelect("Tree filter mode", settings.treeFilterMode || treeFilterMode, SETTINGS_TREE_FILTER_OPTIONS, "Default filter when opening /tree.", { label: "browser", tone: "browser" }),
    autoResizeImages: nativeSettingToggle("Auto-resize images", settings.autoResizeImages !== false, "Resize large images to 2000x2000 max for better model compatibility.", { label: "reload", tone: "reload" }),
    blockImages: nativeSettingToggle("Block images", settings.blockImages === true, "Prevent images from being sent to LLM providers.", { label: "reload", tone: "reload" }),
    showImages: nativeSettingToggle("Show terminal images", settings.showImages !== false, "Native TUI inline image rendering preference.", { label: "TUI", tone: "tui" }),
    imageWidth: nativeSettingSelect("Terminal image width", settings.imageWidthCells || 60, SETTINGS_IMAGE_WIDTH_OPTIONS, "Native TUI inline image width in terminal cells.", { label: "TUI", tone: "tui" }),
    skillCommands: nativeSettingToggle("Skill commands", settings.enableSkillCommands !== false, "Register skills as /skill:name commands.", { label: "reload", tone: "reload" }),
    anthropicWarning: nativeSettingToggle("Anthropic extra usage warning", settings.warnings?.anthropicExtraUsage !== false, "Warn when Anthropic subscription auth may use paid extra usage.", { label: "safety", tone: "safety" }),
    collapseChangelog: nativeSettingToggle("Collapse changelog", settings.collapseChangelog === true, "Show condensed changelog after updates.", { label: "startup", tone: "startup" }),
    quietStartup: nativeSettingToggle("Quiet startup", settings.quietStartup === true, "Disable verbose printing at startup.", { label: "startup", tone: "startup" }),
    installTelemetry: nativeSettingToggle("Install telemetry", settings.enableInstallTelemetry !== false, "Send anonymous version/update ping after changelog-detected updates.", { label: "startup", tone: "startup" }),
    hardwareCursor: nativeSettingToggle("Show hardware cursor", settings.showHardwareCursor === true, "Native TUI cursor display for IME support.", { label: "TUI", tone: "tui" }),
    editorPadding: nativeSettingSelect("Editor padding", settings.editorPaddingX ?? 0, SETTINGS_EDITOR_PADDING_OPTIONS, "Native TUI horizontal input padding.", { label: "TUI", tone: "tui" }),
    clearOnShrink: nativeSettingToggle("Clear on shrink", settings.clearOnShrink === true, "Native TUI row clearing when content shrinks; may flicker.", { label: "TUI", tone: "tui" }),
    terminalProgress: nativeSettingToggle("Terminal progress", settings.showTerminalProgress === true, "Native TUI OSC 9;4 terminal progress indicators.", { label: "TUI", tone: "tui" }),
  };

  const body = make("div", "native-settings-panel");
  body.append(
    nativeSettingsNote("Scopes", "Runtime settings apply to the active tab. Reload-badged settings are saved globally and need a tab reload for the running Pi process."),
    nativeSettingsSection("Runtime", "Model behavior and request transport.", [controls.thinking, controls.autoCompact, controls.steering, controls.followUp, controls.transport, controls.httpIdleTimeout], { open: true }),
    nativeSettingsSection("Browser workflow", "Local Web UI behavior plus shared composer defaults.", [controls.busyBehavior, controls.thinkingOutput, controls.doneNotifications, controls.autocompleteMax, controls.doubleEscape, controls.treeFilter], { open: true }),
    nativeSettingsSection("Images", "Provider image policy and native terminal image display.", [controls.autoResizeImages, controls.blockImages, controls.showImages, controls.imageWidth], { open: true }),
    nativeSettingsSection("Startup & safety", "Command registration, warnings, update/startup behavior.", [controls.skillCommands, controls.anthropicWarning, controls.collapseChangelog, controls.quietStartup, controls.installTelemetry], { open: false }),
    nativeSettingsSection("Native TUI advanced", "Saved for the terminal UI; mostly informational in the browser.", [controls.hardwareCursor, controls.editorPadding, controls.clearOnShrink, controls.terminalProgress], { open: false })
  );
  elements.nativeCommandBody.replaceChildren(body);
  elements.nativeCommandActions.replaceChildren();
  addNativeCommandAction("Model…", () => openNativeModelSelector());
  addNativeCommandAction("Theme…", () => openNativeThemeSelector());
  addNativeCommandAction("Cancel", closeNativeCommandDialog);

  const applySettings = async (reload, button) => {
    setNativeActionBusy(button, true, reload ? "Applying & reloading…" : "Applying…");
    setNativeCommandError("");
    try {
      const requests = [];
      const thinkingLevelChanged = controls.thinking.select.value !== (state.thinkingLevel || "off");
      if (thinkingLevelChanged) requests.push(nativeCommandApi("/api/thinking", { method: "POST", body: { level: controls.thinking.select.value } }));
      if (controls.steering.select.value !== (state.steeringMode || "one-at-a-time")) requests.push(nativeCommandApi("/api/steering-mode", { method: "POST", body: { mode: controls.steering.select.value } }));
      if (controls.followUp.select.value !== (state.followUpMode || "one-at-a-time")) requests.push(nativeCommandApi("/api/follow-up-mode", { method: "POST", body: { mode: controls.followUp.select.value } }));
      if (controls.autoCompact.input.checked !== (state.autoCompactionEnabled !== false)) requests.push(nativeCommandApi("/api/auto-compaction", { method: "POST", body: { enabled: controls.autoCompact.input.checked } }));
      setBusyPromptBehavior(controls.busyBehavior.select.value);
      if (controls.thinkingOutput.input.checked !== thinkingOutputVisible) setThinkingOutputVisible(controls.thinkingOutput.input.checked);
      if (controls.doneNotifications.input.checked !== agentDoneNotificationsEnabled) await setAgentDoneNotificationsEnabled(controls.doneNotifications.input.checked);
      await Promise.all(requests);
      const response = await nativeCommandApi("/api/settings", { method: "POST", body: { settings: collectNativeSettingsPayload(controls), reload } });
      applyResponseTab(response);
      applyNativeSettingsForBrowser(response.data?.settings || collectNativeSettingsPayload(controls));
      if (thinkingLevelChanged) requestGitFooterWebuiPayload(activeTabContext(), { force: true });
      addTransientMessage({ role: "native", title: "/settings", content: nativeSettingsChangedMessage(response, reload), level: response.data?.reloadRecommended?.length && !response.data?.reloaded ? "warn" : "info" });
      closeNativeCommandDialog();
      await refreshAll();
    } catch (error) {
      setNativeCommandError(error.message || String(error));
    } finally {
      setNativeActionBusy(button, false);
    }
  };

  const reloadButton = addNativeCommandAction("Apply & reload tab", () => applySettings(true, reloadButton));
  const save = addNativeCommandAction("Apply", () => applySettings(false, save), "primary");
}

async function openNativeForkSelector() {
  openNativeCommandDialog({ title: "/fork", message: "Choose a previous user message to fork before.", searchPlaceholder: "Filter fork points…" });
  renderNativeLoading("Loading fork points…");
  try {
    const response = await nativeCommandApi("/api/fork-messages");
    const items = (response.data?.messages || []).map((message, index) => ({
      id: message.entryId,
      label: `#${index + 1} user message`,
      description: message.text || "",
      meta: message.entryId,
      message,
    })).reverse();
    const render = () => renderNativeSelectorItems(items, {
      emptyText: "No user messages are available to fork from.",
      onSelect: async (item) => {
        setNativeCommandError("");
        try {
          const result = await nativeCommandApi("/api/fork", { method: "POST", body: { entryId: item.message.entryId } });
          applyResponseTab(result);
          const restoredText = result.data?.text || result.data?.result?.text || "";
          if (restoredText) {
            elements.promptInput.value = restoredText;
            resizePromptInput();
            focusPromptInput({ defer: true });
          }
          addTransientMessage({ role: "native", title: "/fork", content: result.data?.message || "Forked the current session.", level: "info" });
          closeNativeCommandDialog();
          await refreshAll();
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        }
      },
    });
    elements.nativeCommandSearch.oninput = render;
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

function openNativeCloneDialog() {
  openNativeCommandDialog({ title: "/clone", message: "Duplicate the current session at the current position." });
  elements.nativeCommandBody.append(make("p", "native-command-note", "This creates a new forked session and switches this Web UI tab to it."));
  elements.nativeCommandActions.replaceChildren();
  addNativeCommandAction("Cancel", closeNativeCommandDialog);
  const clone = addNativeCommandAction("Clone session", async () => {
    setNativeActionBusy(clone, true, "Cloning…");
    try {
      const result = await nativeCommandApi("/api/clone", { method: "POST", body: {} });
      applyResponseTab(result);
      addTransientMessage({ role: "native", title: "/clone", content: result.data?.message || "Cloned the current session.", level: "info" });
      closeNativeCommandDialog();
      await refreshAll();
    } catch (error) {
      setNativeCommandError(error.message || String(error));
    } finally {
      setNativeActionBusy(clone, false);
    }
  }, "primary");
}

function openNativeNameDialog() {
  openNativeCommandDialog({ title: "/name", message: "Set the session and browser tab name." });
  const field = make("label", "native-settings-field");
  field.append(make("span", "native-settings-label", "Session name"));
  const input = make("input", "dialog-input");
  input.type = "text";
  input.autocomplete = "off";
  input.placeholder = "New session name";
  input.value = activeTab()?.title || "";
  field.append(input);
  elements.nativeCommandBody.append(field);
  elements.nativeCommandActions.replaceChildren();
  addNativeCommandAction("Cancel", closeNativeCommandDialog);
  const save = addNativeCommandAction("Name session", async () => {
    const name = input.value.trim();
    if (!name) {
      setNativeCommandError("Enter a session name.");
      input.focus();
      return;
    }
    setNativeActionBusy(save, true, "Saving…");
    closeNativeCommandDialog();
    await sendPrompt("prompt", `/name ${name}`);
  }, "primary");
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    save.click();
  });
  queueMicrotask(() => {
    input.focus();
    input.select();
  });
}

async function openNativeResumeSelector(scope = "current") {
  openNativeCommandDialog({ title: "/resume", message: "Resume another persisted Pi session.", searchPlaceholder: "Filter sessions…" });
  renderNativeLoading("Loading sessions…");
  const selectedScope = scope === "all" ? "all" : "current";
  try {
    const response = await nativeCommandApi(`/api/sessions?scope=${encodeURIComponent(selectedScope)}`);
    const items = (response.data?.sessions || []).map((session) => ({
      id: session.path,
      label: session.name || session.firstMessage || session.id || session.path,
      description: session.firstMessage || "(no messages)",
      meta: `${session.cwd || "unknown cwd"} · ${session.messageCount || 0} messages · ${session.modified || "unknown time"}`,
      badge: session.current ? "current" : "",
      disabled: session.current,
      session,
    }));
    const render = () => renderNativeSelectorItems(items, {
      emptyText: selectedScope === "all" ? "No sessions match this filter." : "No sessions for this working directory match this filter.",
      onSelect: async (item) => {
        setNativeCommandError("");
        try {
          const result = await nativeCommandApi("/api/switch-session", { method: "POST", body: { sessionPath: item.session.path } });
          applyResponseTab(result);
          addTransientMessage({ role: "native", title: "/resume", content: result.data?.message || "Resumed selected session.", level: "info" });
          closeNativeCommandDialog();
          await refreshAll();
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        }
      },
    });
    elements.nativeCommandSearch.oninput = render;
    elements.nativeCommandActions.replaceChildren();
    addNativeCommandAction(selectedScope === "all" ? "Current cwd" : "All sessions", () => openNativeResumeSelector(selectedScope === "all" ? "current" : "all"));
    addNativeCommandAction("Cancel", closeNativeCommandDialog);
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

function nativeTreeFilterMatches(node, filter) {
  const settingsTypes = new Set(["label", "custom", "custom_message", "model_change", "thinking_level_change", "session_info"]);
  switch (filter) {
    case "user-only":
      return node.type === "message" && node.role === "user";
    case "no-tools":
      return !settingsTypes.has(node.type) && !(node.type === "message" && node.role === "toolResult");
    case "labeled-only":
      return node.label !== undefined;
    case "all":
      return true;
    default:
      return !settingsTypes.has(node.type);
  }
}

async function openNativeTreeSelector() {
  openNativeCommandDialog({ title: "/tree", message: "Navigate the current session tree. Choosing a user message restores it into the editor.", searchPlaceholder: "Filter tree…" });
  renderNativeLoading("Loading session tree…");
  try {
    const response = await nativeCommandApi("/api/session-tree");
    const nodes = response.data?.nodes || [];
    let selectedFilter = treeFilterMode || "default";
    const filterField = nativeSettingSelect("Filter", selectedFilter, SETTINGS_TREE_FILTER_OPTIONS, "Temporary filter for this tree view.");
    const summarize = nativeSettingToggle("Summarize abandoned branch", false, "Optional; may call the active model before switching branches.");
    const labelField = make("label", "native-settings-field");
    labelField.append(nativeSettingsLabelRow("Optional label"));
    const labelInput = make("input", "dialog-input");
    labelInput.placeholder = "checkpoint label";
    labelField.append(labelInput);
    const options = make("div", "native-tree-options");
    options.append(filterField.field, summarize.field, labelField);
    const toItems = () => nodes.filter((node) => nativeTreeFilterMatches(node, selectedFilter)).map((node) => ({
      id: node.id,
      label: `${node.title}${node.label ? ` · ${node.label}` : ""}`,
      description: node.text || "",
      meta: `${node.timestamp || ""}${node.childCount ? ` · ${node.childCount} child${node.childCount === 1 ? "" : "ren"}` : ""}`,
      badge: node.currentLeaf ? "leaf" : "",
      depth: node.depth || 0,
      node,
    }));
    const navigate = async (item) => {
      setNativeCommandError("");
      try {
        const result = await nativeCommandApi("/api/tree-navigate", {
          method: "POST",
          body: {
            entryId: item.node.id,
            summarize: summarize.input.checked,
            label: labelInput.value.trim() || undefined,
          },
        });
        applyResponseTab(result);
        addTransientMessage({ role: "native", title: "/tree", content: result.data?.message || "Navigated the session tree.", level: "info" });
        closeNativeCommandDialog();
        await refreshAll();
      } catch (error) {
        setNativeCommandError(error.message || String(error));
      }
    };
    const render = () => {
      renderNativeSelectorItems(toItems(), { emptyText: "No session tree entries match this filter.", onSelect: navigate });
      elements.nativeCommandBody.prepend(options);
    };
    filterField.select.addEventListener("change", () => {
      selectedFilter = filterField.select.value;
      render();
    });
    elements.nativeCommandSearch.oninput = render;
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

function openNativeScopedModelsInfo() {
  openNativeCommandDialog({ title: "/scoped-models", message: "Scoped model selection is available in the footer model picker." });
  elements.nativeCommandBody.append(make("p", "native-command-note", "Use the footer model chip to choose among scoped models. The full native scoped-models editor is still TUI-only."));
}

function nativeResourceSourceLabel(resource) {
  const info = resource?.sourceInfo || {};
  return [info.source, info.scope, info.origin].filter(Boolean).join(" · ") || resource?.location || "loaded resource";
}

function nativeToolOriginTag(resource) {
  return resource?.sourceInfo?.source === "builtin"
    ? { label: "Pi Native", className: "native-selector-badge-pi-native" }
    : { label: "External", className: "native-selector-badge-external" };
}

function nativeResourceCounts(resources) {
  const disabled = resources.filter((resource) => resource.enabled === false).length;
  return { total: resources.length, disabled, enabled: resources.length - disabled };
}

function nativeResourceFilterMatches(resource, filter) {
  if (filter === "enabled") return resource.enabled !== false;
  if (filter === "disabled") return resource.enabled === false;
  return true;
}

function renderNativeResourceToggles(resources, { savingName, filter = "all", onToggle, getResourceTag } = {}) {
  const filteredResources = resources.filter((resource) => nativeResourceFilterMatches(resource, filter));
  const counts = nativeResourceCounts(resources);
  const items = filteredResources.map((resource) => {
    const resourceTag = getResourceTag?.(resource);
    return {
      id: resource.name,
      label: resource.name,
      description: resource.description || "No description provided.",
      meta: nativeResourceSourceLabel(resource),
      badge: resource.enabled === false ? "disabled" : "enabled",
      badgeClass: resource.enabled === false ? "disabled native-selector-badge-disabled" : "enabled native-selector-badge-enabled",
      tags: resourceTag ? [resourceTag] : [],
      disabled: Boolean(savingName),
      resource,
    };
  });
  const filterLabel = filter === "enabled" ? "enabled" : filter === "disabled" ? "disabled" : "all";
  renderNativeSelectorItems(items, {
    emptyText: `No ${filterLabel} entries match this filter.`,
    onSelect: (item) => onToggle?.(item.resource),
  });
  elements.nativeCommandBody.prepend(make("div", "native-resource-summary muted", `${counts.total} total · ${counts.enabled} enabled · ${counts.disabled} disabled · showing ${filterLabel}`));
}

function renderNativeResourceFilterActions(filter, setFilter, render) {
  elements.nativeCommandActions.replaceChildren();
  for (const option of [
    { value: "all", label: "All" },
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
  ]) {
    addNativeCommandAction(option.label, () => {
      setFilter(option.value);
      render();
    }, filter === option.value ? "primary" : undefined);
  }
  addNativeCommandAction("Cancel", closeNativeCommandDialog);
}

async function openNativeToolsSelector() {
  openNativeCommandDialog({ title: "Tools Setup", message: "Enable or disable tools for the active Pi tab. Changes apply to the next model turn and persist on this session branch.", searchPlaceholder: "Filter tools…" });
  renderNativeLoading("Loading tools…");
  let tools = [];
  let savingName = "";
  let filter = "all";
  const render = () => {
    renderNativeResourceToggles(tools, {
      savingName,
      filter,
      getResourceTag: nativeToolOriginTag,
      onToggle: async (tool) => {
        if (!tool || savingName) return;
        const enabledTools = new Set(tools.filter((item) => item.enabled !== false).map((item) => item.name));
        if (tool.enabled === false) enabledTools.add(tool.name);
        else enabledTools.delete(tool.name);
        savingName = tool.name;
        setNativeCommandError("");
        render();
        try {
          const response = await nativeCommandApi("/api/tools", { method: "POST", body: { enabledTools: [...enabledTools] } });
          tools = Array.isArray(response.data?.tools) ? response.data.tools : [];
          addTransientMessage({ role: "native", title: "/tools", content: `Tool ${tool.name} ${enabledTools.has(tool.name) ? "enabled" : "disabled"}.`, level: "info" });
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        } finally {
          savingName = "";
          render();
        }
      },
    });
    renderNativeResourceFilterActions(filter, (value) => { filter = value; }, render);
  };
  try {
    const response = await nativeCommandApi("/api/tools");
    tools = Array.isArray(response.data?.tools) ? response.data.tools : [];
    elements.nativeCommandSearch.oninput = render;
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

async function openNativeSkillsSelector() {
  openNativeCommandDialog({ title: "Skills Setup", message: "Enable or disable skills for automatic model invocation in the active Pi tab. Disabled skills are removed from the system prompt and their /skill:name commands are blocked by Web UI.", searchPlaceholder: "Filter skills…" });
  renderNativeLoading("Loading skills…");
  let skills = [];
  let savingName = "";
  let filter = "all";
  const render = () => {
    renderNativeResourceToggles(skills, {
      savingName,
      filter,
      onToggle: async (skill) => {
        if (!skill || savingName) return;
        const enabledSkills = new Set(skills.filter((item) => item.enabled !== false).map((item) => item.name));
        if (skill.enabled === false) enabledSkills.add(skill.name);
        else enabledSkills.delete(skill.name);
        savingName = skill.name;
        setNativeCommandError("");
        render();
        try {
          const response = await nativeCommandApi("/api/skills", { method: "POST", body: { enabledSkills: [...enabledSkills] } });
          skills = Array.isArray(response.data?.skills) ? response.data.skills : [];
          addTransientMessage({ role: "native", title: "/skills", content: `Skill ${skill.name} ${enabledSkills.has(skill.name) ? "enabled" : "disabled"}.`, level: "info" });
          refreshCommands(activeTabContext()).catch((error) => addEvent(error.message || String(error), "error"));
        } catch (error) {
          setNativeCommandError(error.message || String(error));
        } finally {
          savingName = "";
          render();
        }
      },
    });
    renderNativeResourceFilterActions(filter, (value) => { filter = value; }, render);
  };
  try {
    const response = await nativeCommandApi("/api/skills");
    skills = Array.isArray(response.data?.skills) ? response.data.skills : [];
    elements.nativeCommandSearch.oninput = render;
    render();
  } catch (error) {
    setNativeCommandError(error.message || String(error));
    elements.nativeCommandBody.replaceChildren();
  }
}

function openNativeAuthInfo(mode) {
  const command = mode === "logout" ? "/logout" : "/login";
  openNativeCommandDialog({ title: command, message: "Provider credential entry is intentionally not implemented in the browser yet." });
  const note = [
    "Use native Pi TUI authentication for now, or configure provider credentials through environment variables or models.json.",
    "This avoids accepting or storing API keys in the Web UI until the credential flow has a dedicated security design.",
  ].join("\n\n");
  elements.nativeCommandBody.append(make("p", "native-command-note", note));
}

async function handleNativeSlashSelectorCommand(message, { usesPromptInput = false } = {}) {
  const name = slashCommandName(message);
  if (!NATIVE_SELECTOR_COMMANDS.has(name)) return false;
  const featureId = optionalFeatureIdForCommand(name);
  if (featureId && !isOptionalFeatureEnabled(featureId)) {
    const tabContext = activeTabContext();
    addEvent(commandUnavailableMessage(name), "warn");
    refreshCommands(tabContext).catch((error) => {
      if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
    });
    return true;
  }
  setComposerActionsOpen(false);
  hideCommandSuggestions();
  if (usesPromptInput) {
    elements.promptInput.value = "";
    resizePromptInput();
  }
  switch (name) {
    case "model":
      await openNativeModelSelector();
      return true;
    case "settings":
      await openNativeSettingsDialog();
      return true;
    case "theme":
      openNativeThemeSelector();
      return true;
    case "fork":
      await openNativeForkSelector();
      return true;
    case "clone":
      openNativeCloneDialog();
      return true;
    case "name":
      openNativeNameDialog();
      return true;
    case "resume":
      await openNativeResumeSelector();
      return true;
    case "tree":
      await openNativeTreeSelector();
      return true;
    case "scoped-models":
      openNativeScopedModelsInfo();
      return true;
    case "tools":
      await openNativeToolsSelector();
      return true;
    case "skills":
      await openNativeSkillsSelector();
      return true;
    case "login":
    case "logout":
      openNativeAuthInfo(name);
      return true;
    default:
      return false;
  }
}

function shouldSendPromptFromEnter(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey) return true;
  return !isMobileView();
}

function renderMessages(messages) {
  latestMessages = messages || [];
  cleanupLiveToolRunsForMessages(latestMessages);
  syncLastUserPromptFromMessages(latestMessages);
  syncPromptHistoryFromMessages(latestMessages);
  trackSkillsFromMessages(latestMessages, activeTabId);
  renderAllMessages();
  renderFooter();
  renderFeedbackTray();
}

function cancelStreamBubbleHide() {
  clearTimeout(streamBubbleHideTimer);
  streamBubbleHideTimer = null;
}

function cancelStreamingAssistantTextRender() {
  clearTimeout(streamTextRenderTimer);
  streamTextRenderTimer = null;
}

function removeStreamBubble() {
  cancelStreamingAssistantTextRender();
  cancelStreamBubbleHide();
  streamBubble?.remove();
  streamBubble = null;
  streamText = null;
  streamBubbleVisibleSince = 0;
  renderRunIndicator({ scroll: false });
}

function scheduleStreamBubbleHide() {
  if (!streamBubble) return;
  const visibleForMs = streamBubbleVisibleSince ? performance.now() - streamBubbleVisibleSince : STREAM_OUTPUT_MIN_VISIBLE_MS;
  const delayMs = Math.max(STREAM_OUTPUT_HIDE_DELAY_MS, STREAM_OUTPUT_MIN_VISIBLE_MS - visibleForMs);
  clearTimeout(streamBubbleHideTimer);
  streamBubbleHideTimer = setTimeout(() => {
    streamBubbleHideTimer = null;
    if (stripTodoProgressLines(streamRawText, { streaming: true }) || !streamBubble) return;
    removeStreamBubble();
  }, delayMs);
}

function renderStreamingAssistantText() {
  const assistantText = stripTodoProgressLines(streamRawText, { streaming: true });
  if (assistantText) {
    ensureStreamBubble();
    renderMarkdown(streamText, assistantText);
  } else {
    scheduleStreamBubbleHide();
  }
}

function scheduleStreamingAssistantTextRender() {
  if (streamTextRenderTimer) return;
  streamTextRenderTimer = setTimeout(() => {
    streamTextRenderTimer = null;
    renderStreamingAssistantText();
  }, STREAM_OUTPUT_TOOLCALL_GUARD_MS);
}

function suppressStreamingAssistantTextBeforeToolCall() {
  streamRawText = "";
  removeStreamBubble();
}

function ensureStreamBubble() {
  cancelStreamBubbleHide();
  if (streamBubble?.parentElement === elements.chat) return;
  const created = appendMessage({ role: "assistant", title: "final output", timestamp: Date.now(), content: "" }, { streaming: true });
  streamBubble = created.bubble;
  streamText = make("div", "markdown-body streaming-markdown");
  created.body.append(streamText);
  streamBubbleVisibleSince = performance.now();
  renderRunIndicator({ scroll: false });
  scrollChatToBottom();
}

function ensureStreamingThinkingBubble() {
  if (!thinkingOutputVisible) return false;
  if (streamThinkingBubble?.parentElement === elements.chat) return true;
  const created = appendMessage({ role: "thinking", title: "thinking", timestamp: Date.now(), content: "" }, { streaming: true });
  streamThinkingBubble = created.bubble;
  streamThinking = appendText(created.body, "", "thinking-text");
  renderRunIndicator({ scroll: false });
  scrollChatToBottom();
  return true;
}

function showStreamingThinking(initialText = "") {
  if (!ensureStreamingThinkingBubble()) return;
  if (initialText && !streamThinking.textContent) streamThinking.textContent = initialText;
}

function resetStreamBubble() {
  cancelStreamingAssistantTextRender();
  cancelStreamBubbleHide();
  streamBubble = null;
  streamText = null;
  streamRawText = "";
  streamBubbleVisibleSince = 0;
  streamToolCallSeen = false;
  streamThinkingBubble = null;
  streamThinking = null;
}

function thinkingDeltaText(update) {
  return visibleThinkingText(update.delta || update.thinking || update.content || "");
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
  const parts = [];
  for (let index = 0; index < content.length; index += 1) {
    const part = content[index];
    const text = assistantTextPartText(part);
    if (text && !assistantHasToolCallAfter(content, index)) parts.push(text);
  }
  return parts.length ? parts.join("\n\n") : "";
}

function assistantThinkingTextFromMessage(message) {
  const content = message?.content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .filter((part) => part && typeof part === "object" && (part.type === "thinking" || typeof part.thinking === "string"))
    .map((part) => visibleThinkingText(assistantThinkingText(part)))
    .filter((text) => text.trim());
  return parts.length ? parts.join("\n\n") : "";
}

function setStreamingThinkingText(text) {
  const thinking = visibleThinkingText(text);
  if (!thinkingOutputVisible || !thinking) return false;
  showStreamingThinking("");
  if (streamThinking) streamThinking.textContent = thinking;
  return true;
}

function syncStreamingThinkingFromMessage(event, { placeholder = "" } = {}) {
  if (!thinkingOutputVisible) return true;
  const text = assistantThinkingTextFromMessage(assistantStreamingMessage(event));
  if (text === null) return false;
  return setStreamingThinkingText(text || placeholder);
}

function handleMessageUpdate(event) {
  const update = event.assistantMessageEvent || {};
  if (update.type === "thinking_start") {
    setRunIndicatorActivity("Thinking…", { scroll: false });
    syncStreamingThinkingFromMessage(event);
    scrollChatToBottom();
  } else if (update.type === "thinking_delta") {
    const delta = thinkingDeltaText(update);
    setRunIndicatorActivity("Thinking…", { scroll: false });
    const synced = syncStreamingThinkingFromMessage(event);
    if (thinkingOutputVisible && delta && (!synced || !streamThinking?.textContent)) {
      showStreamingThinking("");
      if (streamThinking?.textContent === "Thinking…") streamThinking.textContent = "";
      if (streamThinking) streamThinking.textContent += delta;
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
    const partialText = assistantTextFromMessage(assistantStreamingMessage(event));
    if (typeof partialText === "string") streamRawText = partialText;
    else if (update.type === "text_end" && typeof update.content === "string") streamRawText = update.content;
    else streamRawText += delta;
    setRunIndicatorActivity("Writing response…", { scroll: false });
    if (streamToolCallSeen || streamBubble) renderStreamingAssistantText();
    else scheduleStreamingAssistantTextRender();
    renderFooter();
    scrollChatToBottom();
  } else if (update.type === "toolcall_start") {
    streamToolCallSeen = true;
    suppressStreamingAssistantTextBeforeToolCall();
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

function modelStateKey(model) {
  return model ? `${model.provider || ""}/${model.id || ""}` : "";
}

function gitFooterRelevantStateChanged(previousState, nextState) {
  if (!previousState || !nextState) return false;
  return previousState.thinkingLevel !== nextState.thinkingLevel || modelStateKey(previousState.model) !== modelStateKey(nextState.model);
}

async function refreshState(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/state", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  const previousState = currentState;
  currentState = response.data || null;
  const shouldRefreshGitFooter = gitFooterRelevantStateChanged(previousState, currentState);
  syncActiveTabActivityFromState(currentState);
  syncRunIndicatorFromState(currentState);
  renderStatus();
  requestGitFooterWebuiPayload(tabContext, { force: shouldRefreshGitFooter });
}

async function refreshStats(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/stats", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  latestStats = response.data || null;
  renderFooter();
}

async function refreshWorkspace(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  let nextWorkspace = null;
  try {
    const response = await api("/api/workspace", { tabId: tabContext.tabId });
    nextWorkspace = response.data || null;
  } catch (error) {
    if (!isCurrentTabContext(tabContext)) return;
    // Older webui server processes do not have /api/workspace. Fall back to /api/health,
    // which has exposed cwd from the beginning, so the footer still shows the real path.
    const health = await api("/api/health", { tabId: tabContext.tabId });
    nextWorkspace = health.cwd
      ? {
          cwd: health.cwd,
          displayCwd: normalizeDisplayPath(health.cwd),
          uptimeMs: latestWorkspace?.uptimeMs || 0,
        }
      : null;
  }
  if (!isCurrentTabContext(tabContext)) return;
  latestWorkspace = nextWorkspace;
  rememberServerStartCwd(nextWorkspace?.cwd);
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

async function refreshFooterData(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  await Promise.allSettled([refreshStats(tabContext), refreshWorkspace(tabContext)]);
}

async function refreshMessages(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/messages", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  latestMessages = response.data?.messages || [];
  resetStreamBubble();
  renderMessages(latestMessages);
  markTabOutputSeen();
  renderFooter();
}

async function refreshModels(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/models", { tabId: tabContext.tabId });
  const models = response.data?.models || [];
  let scopedModels = [];
  let scopedModelPatterns = [];
  let scopedModelSource = "none";
  let scopedModelError = null;
  try {
    const scopedResponse = await api("/api/scoped-models", { tabId: tabContext.tabId });
    scopedModels = scopedResponse.data?.models || [];
    scopedModelPatterns = scopedResponse.data?.patterns || [];
    scopedModelSource = scopedResponse.data?.source || "none";
  } catch (error) {
    scopedModelError = error;
  }
  if (!isCurrentTabContext(tabContext)) return;
  availableModels = models;
  footerScopedModels = scopedModels;
  footerScopedModelPatterns = scopedModelPatterns;
  footerScopedModelSource = scopedModelSource;
  if (scopedModelError) addEvent(`failed to load scoped models: ${scopedModelError.message}`, "warn");
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

function normalizeCommands(commands, { dedupe = true } = {}) {
  const seen = new Set();
  return (commands || [])
    .map((command) => ({
      name: String(command.name || "").trim(),
      description: String(command.description || "").trim(),
      source: String(command.source || "command").trim(),
      location: String(command.location || "").trim(),
      enabled: command.enabled !== false,
    }))
    .filter((command) => {
      if (!command.name) return false;
      if (!dedupe) return true;
      if (seen.has(command.name)) return false;
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
  return visibleCommands()
    .map((command) => ({ command, score: scoreCommandSuggestion(command, query) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score || a.command.name.localeCompare(b.command.name))
    .slice(0, clampAutocompleteMaxVisible(autocompleteMaxVisible))
    .map((item) => item.command);
}

function commandSearchQuery() {
  return String(elements.commandSearchInput?.value || "").trim().replace(/^\/+/, "").toLowerCase();
}

function commandMatchesSearch(command, query) {
  if (!query) return true;
  return [command.name, command.description, command.source, command.location]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
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
  pathSuggestActiveQuery = null;
  abortPathSuggestionRequest();
}

function hideCommandSuggestions() {
  cancelPathSuggestionRequest();
  elements.commandSuggest.hidden = true;
  elements.commandSuggest.removeAttribute("aria-busy");
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

function pointerPositionFromEvent(event) {
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
  return { x: event.clientX, y: event.clientY };
}

function rememberPointerPosition(event) {
  lastPointerPosition = pointerPositionFromEvent(event);
}

function commandSuggestionPointerActuallyMoved(event) {
  const movementX = Number.isFinite(event.movementX) ? event.movementX : 0;
  const movementY = Number.isFinite(event.movementY) ? event.movementY : 0;
  if (movementX !== 0 || movementY !== 0) return true;

  const position = pointerPositionFromEvent(event);
  return Boolean(
    position &&
      lastPointerPosition &&
      (position.x !== lastPointerPosition.x || position.y !== lastPointerPosition.y),
  );
}

function setActiveCommandSuggestionFromPointerMove(index, event) {
  if (!commandSuggestionPointerActuallyMoved(event)) return;
  setActiveCommandSuggestion(index);
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
    item.addEventListener("pointermove", (event) => setActiveCommandSuggestionFromPointerMove(index, event));
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
    item.addEventListener("pointermove", (event) => setActiveCommandSuggestionFromPointerMove(index, event));
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
  if (suggestionMode === "path" && pathSuggestActiveQuery === trigger.query && !elements.commandSuggest.hidden) {
    if (keepIndex && activeSuggestionCount() > 0) setActiveCommandSuggestion(commandSuggestIndex);
    return;
  }

  const keepExistingPathMenu = suggestionMode === "path" && !elements.commandSuggest.hidden && elements.commandSuggest.childElementCount > 0;
  abortPathSuggestionRequest();
  const requestSerial = ++pathSuggestRequestSerial;
  const controller = new AbortController();
  pathSuggestActiveQuery = trigger.query;
  pathSuggestAbortController = controller;
  suggestionMode = "path";
  commandSuggestions = [];
  if (!keepExistingPathMenu) {
    pathSuggestions = [];
    elements.commandSuggest.replaceChildren(make("div", "command-suggest-empty", "Finding paths…"));
  }
  elements.commandSuggest.hidden = false;
  elements.commandSuggest.setAttribute("aria-busy", "true");

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
    if (requestSerial === pathSuggestRequestSerial) {
      pathSuggestAbortController = null;
      elements.commandSuggest.removeAttribute("aria-busy");
    }
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

function renderCommands() {
  elements.commandsBox.replaceChildren();
  if (!availableCommands.length) {
    elements.commandsBox.textContent = "No RPC-visible commands.";
    elements.commandsBox.classList.add("muted");
    hideCommandSuggestions();
    return;
  }
  const commandsToShow = visibleCommands();
  if (!commandsToShow.length) {
    elements.commandsBox.textContent = "No enabled commands visible. Re-enable optional features to show their commands.";
    elements.commandsBox.classList.add("muted");
    hideCommandSuggestions();
    return;
  }
  const searchQuery = commandSearchQuery();
  const filteredCommands = commandsToShow.filter((command) => commandMatchesSearch(command, searchQuery));
  if (!filteredCommands.length) {
    elements.commandsBox.textContent = `No commands match “${elements.commandSearchInput?.value.trim() || searchQuery}”.`;
    elements.commandsBox.classList.add("muted");
    renderCommandSuggestions();
    return;
  }
  elements.commandsBox.classList.remove("muted");
  for (const command of filteredCommands.slice(0, 80)) {
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

async function refreshCommands(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const response = await api("/api/commands", { tabId: tabContext.tabId });
  if (!isCurrentTabContext(tabContext)) return;
  rawAvailableCommands = normalizeCommands(response.data?.commands || [], { dedupe: false });
  availableCommands = normalizeCommands(response.data?.commands || []);
  updateOptionalFeatureAvailability();
  renderCommands();
}

async function refreshAll(tabContext = activeTabContext()) {
  if (!tabContext.tabId) return;
  const results = await Promise.allSettled([
    refreshState(tabContext),
    refreshMessages(tabContext),
    refreshModels(tabContext),
    refreshCommands(tabContext),
    refreshStats(tabContext),
    refreshWorkspace(tabContext),
    refreshAppRunners(tabContext),
    refreshNativeSettings(tabContext),
    refreshNetworkStatus(),
    refreshWebuiVersion(),
  ]);
  if (!isCurrentTabContext(tabContext)) return;
  for (const result of results) {
    if (result.status === "rejected") addEvent(result.reason.message || String(result.reason), "error");
  }
  resumeGitWorkflowForActiveTab(tabContext);
}

function ensureActiveEventStream(tabContext = activeTabContext()) {
  if (!tabContext.tabId || !isCurrentTabContext(tabContext)) return;
  if (!eventSource || eventSource.readyState === EventSource.CLOSED) connectEvents(tabContext);
}

async function reconcileForegroundState(reason = "resume") {
  if (document.visibilityState === "hidden") return;

  const tabResult = await Promise.allSettled([refreshTabs()]);
  const tabContext = activeTabContext();
  ensureActiveEventStream(tabContext);

  const results = [...tabResult];
  if (tabContext.tabId) results.push(...(await Promise.allSettled([refreshAll(tabContext)])));
  if (!isCurrentTabContext(tabContext)) return;

  for (const result of results) {
    if (result.status === "rejected") addEvent(`foreground refresh failed after ${reason}: ${result.reason?.message || String(result.reason)}`, "error");
  }
}

function scheduleForegroundReconcile(reason = "resume", delay = FOREGROUND_RECONCILE_DELAY_MS) {
  clearTimeout(foregroundReconcileTimer);
  foregroundReconcileTimer = setTimeout(() => {
    foregroundReconcileTimer = null;
    reconcileForegroundState(reason).catch((error) => addEvent(`foreground refresh failed after ${reason}: ${error.message || String(error)}`, "error"));
  }, delay);
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

function setServerActionStatus(message = "", level = "info") {
  const status = elements.serverActionStatus;
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.className = `server-action-status ${level} ${message ? "" : "muted"}`.trim();
}

function updateServerActionButton() {
  const action = elements.serverActionSelect?.value || "";
  const button = elements.runServerActionButton;
  if (!button) return;
  button.disabled = !action;
  button.textContent = action === "restart" ? "Restart" : action === "stop" ? "Stop" : "Run";
  button.classList.toggle("danger", action === "stop");
  if (action) setServerActionStatus(action === "restart" ? "Ready to restart the Web UI server." : "Ready to stop the Web UI server.", "info");
  else setServerActionStatus();
}

function setServerActionBusy(label) {
  if (elements.serverActionSelect) elements.serverActionSelect.disabled = true;
  if (elements.runServerActionButton) {
    elements.runServerActionButton.disabled = true;
    elements.runServerActionButton.textContent = label;
  }
}

function resetServerActionControls() {
  if (elements.serverActionSelect) {
    elements.serverActionSelect.disabled = false;
    elements.serverActionSelect.value = "";
  }
  updateServerActionButton();
}

async function waitForServerRestart() {
  for (let attempt = 0; attempt < 40; attempt++) {
    await delay(attempt === 0 ? 900 : 500);
    const message = `Restarting… reconnect attempt ${attempt + 1}/40`;
    setServerActionStatus(message, "warn");
    setServerRestartOverlay(true, message);
    try {
      await api("/api/health", { scoped: false });
      setBackendOffline(false);
      await initializeTabs();
      setServerRestartOverlay(false);
      setServerActionStatus("Server restarted and reconnected.", "success");
      addEvent("Pi Web UI server restarted", "warn");
      return true;
    } catch (error) {
      setBackendOffline(true, error);
    }
  }
  return false;
}

async function restartServer() {
  if (!confirm("Restart the Pi Web UI server?\n\nThis briefly disconnects browser clients and restarts the Pi tabs managed by this Web UI.")) return;

  setServerActionBusy("Restarting…");
  setServerActionStatus("Restart requested. Waiting for the server to come back…", "warn");
  setServerRestartOverlay(true, "Restart requested. Waiting for the server to come back…");
  try {
    await api("/api/restart", { method: "POST", scoped: false });
    addEvent("Pi Web UI server restart requested", "warn");
  } catch (error) {
    if (!error?.backendOffline) {
      const missingRestartEndpoint = error.statusCode === 404 || /not found/i.test(error.message || "");
      const message = missingRestartEndpoint
        ? "Restart is not available in the currently running server. Stop/start manually once to load the new backend."
        : error.message || String(error);
      addEvent(message, "error");
      setServerRestartOverlay(false);
      resetServerActionControls();
      setServerActionStatus(message, "error");
      return;
    }
    addEvent("Pi Web UI server connection dropped during restart request", "warn");
  }

  setBackendOffline(true, new Error("restart requested from side panel"));
  const restarted = await waitForServerRestart();
  if (elements.serverActionSelect) {
    elements.serverActionSelect.disabled = false;
    elements.serverActionSelect.value = "";
  }
  updateServerActionButton();
  if (restarted) {
    setServerActionStatus("Server restarted and reconnected.", "success");
  } else {
    setServerRestartOverlay(false);
    setBackendOffline(true, new Error("restart reconnect timed out"));
    setServerActionStatus("Restart requested, but the server did not reconnect automatically.", "error");
    addEvent("Pi Web UI server did not come back online after restart request", "error");
  }
}

async function stopServer() {
  if (!confirm("Stop the Pi Web UI server?\n\nThis disconnects all browser clients and stops the Pi tabs managed by this Web UI.")) return;

  setServerActionBusy("Stopping…");
  setServerActionStatus("Stop requested. The Web UI will disconnect.", "warn");
  try {
    await api("/api/shutdown", { method: "POST", scoped: false });
    addEvent("Pi Web UI server stop requested", "warn");
    setBackendOffline(true, new Error("stop requested from side panel"));
  } catch (error) {
    if (error?.backendOffline) {
      addEvent("Pi Web UI server appears to be offline after stop request", "warn");
      setBackendOffline(true, error);
      return;
    }
    addEvent(error.message || String(error), "error");
    resetServerActionControls();
    setServerActionStatus(error.message || String(error), "error");
  }
}

async function runSelectedServerAction() {
  const action = elements.serverActionSelect?.value || "";
  if (action === "restart") await restartServer();
  else if (action === "stop") await stopServer();
}

function appShortcutModelLabel(model) {
  return model ? `${model.provider}/${model.id}` : "unknown model";
}

async function cycleModelFromShortcut(direction = "forward") {
  const tabContext = activeTabContext();
  if (!tabContext.tabId) return;
  try {
    const response = await api("/api/model-cycle", { method: "POST", body: { direction }, tabId: tabContext.tabId });
    applyResponseTab(response);
    const model = response.data?.model;
    const scope = response.data?.scoped ? `scoped (${response.data.scopeSource})` : "all models";
    if (isCurrentTabContext(tabContext)) {
      applyOptimisticModelSelection(model, tabContext);
      addTransientMessage({ role: "native", title: "model cycle", content: `Model set to ${appShortcutModelLabel(model)} via ${direction} cycle over ${scope}.`, level: "info" });
      await Promise.allSettled([refreshState(tabContext), refreshModels(tabContext), refreshStats(tabContext)]);
    }
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: "model cycle", content: error.message, level: "error" });
    }
  }
}

async function cycleThinkingFromShortcut() {
  const tabContext = activeTabContext();
  if (!tabContext.tabId) return;
  try {
    const response = await api("/api/thinking-cycle", { method: "POST", body: {}, tabId: tabContext.tabId });
    if (isCurrentTabContext(tabContext)) {
      applyOptimisticThinkingSelection(response.data, tabContext);
      addTransientMessage({ role: "native", title: "thinking", content: response.data?.level ? `Thinking level: ${response.data.level}` : "Thinking level did not change.", level: "info" });
      if (response.data?.level) requestGitFooterWebuiPayload(tabContext, { force: true });
      await Promise.allSettled([refreshState(tabContext), refreshStats(tabContext)]);
    }
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: "thinking", content: error.message, level: "error" });
    }
  }
}

function clearPromptFromShortcut() {
  const input = elements.promptInput;
  if (document.activeElement !== input) return false;
  if (input.selectionStart !== input.selectionEnd) return false;
  if (!input.value) return false;
  input.value = "";
  resizePromptInput();
  renderCommandSuggestions();
  addEvent("prompt cleared", "info");
  return true;
}

function parseUserBashInput(message) {
  const text = String(message || "").trim();
  if (!text.startsWith("!") || text === "!" || text === "!!") return null;
  const excludeFromContext = text.startsWith("!!");
  const command = text.slice(excludeFromContext ? 2 : 1).trim();
  if (!command) return null;
  return { command, excludeFromContext };
}

function userBashOutputSummary(result = {}, excludeFromContext = false) {
  const output = String(result.output || "").trimEnd();
  const status = result.cancelled ? "cancelled" : result.exitCode === 0 ? "exit 0" : result.exitCode === undefined || result.exitCode === null ? "finished" : `exit ${result.exitCode}`;
  const context = excludeFromContext ? "excluded from LLM context" : "included in the next LLM context";
  const lines = [`# ${status}; ${context}`];
  if (output) lines.push("", output);
  if (result.truncated && result.fullOutputPath) lines.push("", `Full output: ${result.fullOutputPath}`);
  return lines.join("\n");
}

function clearComposerAfterUserBash({ usesPromptInput, targetTabId, tabContext }) {
  if (!usesPromptInput) return;
  clearAttachments(targetTabId);
  if (isCurrentTabContext(tabContext)) {
    elements.promptInput.value = "";
    resizePromptInput();
  } else {
    tabDrafts.set(targetTabId, "");
  }
}

function enqueueUserBashCommand(parsed, { usesPromptInput = false, targetTabId = activeTabId } = {}) {
  if (!targetTabId || !parsed?.command) return;
  const tabContext = activeTabContext(targetTabId);
  clearComposerAfterUserBash({ usesPromptInput, targetTabId, tabContext });
  const queue = userBashQueueForTab(targetTabId);
  queue.push({ command: parsed.command, excludeFromContext: parsed.excludeFromContext === true, enqueuedAt: Date.now() });
  const waiting = queue.length;
  if (isCurrentTabContext(tabContext)) {
    addTransientMessage({
      role: "bashExecution",
      title: parsed.excludeFromContext ? "bash (!! queued)" : "bash (! queued)",
      command: parsed.command,
      output: `Queued behind the active bash command. Position: ${waiting}.\n\nOutput will be ${parsed.excludeFromContext ? "excluded from" : "included in the next"} LLM context when it runs.`,
      excludeFromContext: parsed.excludeFromContext === true,
      level: "info",
    });
    addEvent(`bash queued (${waiting} waiting): ${parsed.command}`, "info");
    setRunIndicatorActivity(`Bash queued (${waiting} waiting)…`);
    updateComposerModeButtons();
  }
}

function dequeueNextUserBashCommand(targetTabId) {
  return userBashQueueForTab(targetTabId).shift() || null;
}

async function runUserBashCommand(parsed, { usesPromptInput = false, targetTabId = activeTabId, queued = false } = {}) {
  if (!targetTabId || !parsed?.command) return;
  const tabContext = activeTabContext(targetTabId);
  const { command, excludeFromContext } = parsed;
  autoFollowChat = true;
  setComposerActionsOpen(false);
  hideCommandSuggestions();
  userBashByTab.set(targetTabId, { command, excludeFromContext, startedAt: Date.now() });
  markTabWorkingLocally(targetTabId);
  if (isCurrentTabContext(tabContext)) {
    const waiting = queuedUserBashCount(targetTabId);
    setRunIndicatorActivity(`Running bash: ${command}${waiting ? ` (${waiting} queued)` : ""}`);
    addTransientMessage({
      role: "bashExecution",
      title: excludeFromContext ? "bash (!!)" : "bash (!)" ,
      command,
      output: `${queued ? "Dequeued and running.\n\n" : ""}${excludeFromContext ? "Output will be excluded from LLM context." : "Output will be included in the next LLM context."}\n\nRunning…`,
      excludeFromContext,
      level: "info",
    });
  }
  clearComposerAfterUserBash({ usesPromptInput, targetTabId, tabContext });

  try {
    const response = await api("/api/bash", { method: "POST", body: { command, excludeFromContext }, tabId: targetTabId });
    const result = response.data || {};
    applyResponseTab(response);
    if (isCurrentTabContext(tabContext)) {
      addTransientMessage({
        role: "bashExecution",
        title: excludeFromContext ? "bash (!! complete)" : "bash (! complete)",
        command,
        output: userBashOutputSummary(result, excludeFromContext),
        exitCode: result.exitCode,
        cancelled: result.cancelled === true,
        truncated: result.truncated === true,
        fullOutputPath: result.fullOutputPath,
        excludeFromContext,
        level: result.cancelled ? "warn" : result.exitCode ? "error" : "info",
      });
      addEvent(`bash ${result.cancelled ? "cancelled" : "finished"}: ${command}`, result.cancelled || result.exitCode ? "warn" : "info");
      scheduleRefreshMessages(250, tabContext);
      scheduleRefreshState(250, tabContext);
    } else {
      scheduleRefreshTabs(300);
    }
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: excludeFromContext ? "!! bash failed" : "! bash failed", content: error.message, level: "error" });
    }
  } finally {
    userBashByTab.delete(targetTabId);
    const nextQueued = dequeueNextUserBashCommand(targetTabId);
    if (isCurrentTabContext(tabContext)) {
      if (nextQueued) {
        setRunIndicatorActivity(`Starting queued bash (${queuedUserBashCount(targetTabId)} waiting)…`);
      } else if (!currentState?.isStreaming && !currentState?.isCompacting) {
        markTabIdleLocally(targetTabId);
        clearRunIndicatorActivity();
      } else {
        syncRunIndicatorFromState(currentState);
      }
      updateComposerModeButtons();
    }
    if (nextQueued) void runUserBashCommand(nextQueued, { usesPromptInput: false, targetTabId, queued: true });
  }
}

async function sendUserBashCommand(parsed, { usesPromptInput = false, targetTabId = activeTabId } = {}) {
  if (!targetTabId || !parsed?.command) return;
  if (isUserBashActive(targetTabId) || queuedUserBashCount(targetTabId) > 0) {
    enqueueUserBashCommand(parsed, { usesPromptInput, targetTabId });
    return;
  }
  await runUserBashCommand(parsed, { usesPromptInput, targetTabId });
}

async function sendPrompt(kind = "prompt", explicitMessage, { targetTabId = activeTabId, throwOnError = false } = {}) {
  const usesPromptInput = explicitMessage === undefined;
  const rawMessage = usesPromptInput ? elements.promptInput.value : explicitMessage;
  const originalMessage = String(rawMessage || "").trim();
  if (!targetTabId) return;
  const tabContext = activeTabContext(targetTabId);
  const attachments = usesPromptInput ? [...attachmentsForTab(targetTabId)] : [];
  if (!originalMessage && attachments.length === 0) return;
  if (kind === "prompt" && attachments.length === 0 && await handleNativeSlashSelectorCommand(originalMessage, { usesPromptInput })) return;
  const userBash = kind === "prompt" && attachments.length === 0 ? parseUserBashInput(originalMessage) : null;
  if (userBash) {
    await sendUserBashCommand(userBash, { usesPromptInput, targetTabId });
    return;
  }

  const targetWasStreaming = !!currentState?.isStreaming;
  const busyBehavior = normalizeBusyPromptBehavior(busyPromptBehavior);
  const startsRun = kind === "prompt" && !targetWasStreaming;
  autoFollowChat = true;
  updateJumpToLatestButton();
  setComposerActionsOpen(false);
  if (startsRun) {
    markTabWorkingLocally(targetTabId);
    setRunIndicatorActivity(attachments.length ? "Uploading attachments…" : "Sending prompt to Pi…");
  }

  let message = originalMessage;
  try {
    const prepared = attachments.length ? await prepareAttachmentsForPrompt(attachments, targetTabId) : { images: [], uploadedFiles: [], inlineImageIds: new Set() };
    message = composeMessageWithAttachments(originalMessage, prepared.uploadedFiles, prepared.inlineImageIds);
    const bodyBase = { message };
    if (prepared.images.length) bodyBase.images = prepared.images;
    if (!message.startsWith("/")) {
      rememberPromptHistory(message, { tabId: targetTabId });
      if (kind === "prompt") rememberLastUserPrompt(message, { tabId: targetTabId });
    }
    if (startsRun && isCurrentTabContext(tabContext)) setRunIndicatorActivity("Sending prompt to Pi…");

    let response;
    if (kind === "steer") {
      response = await api("/api/steer", { method: "POST", body: bodyBase, tabId: targetTabId });
    } else if (kind === "follow-up") {
      response = await api("/api/follow-up", { method: "POST", body: bodyBase, tabId: targetTabId });
    } else {
      const body = { ...bodyBase };
      if (targetWasStreaming) body.streamingBehavior = busyBehavior;
      response = await api("/api/prompt", { method: "POST", body, tabId: targetTabId });
    }
    applyResponseTab(response);
    if (response?.command === "native_slash_command" && /^\/new(?:\s|$)/.test(message)) forgetLastUserPrompt(targetTabId);
    const targetStillActive = isCurrentTabContext(tabContext);
    if (startsRun && response?.command === "native_slash_command") {
      markTabIdleLocally(targetTabId);
      if (targetStillActive) clearRunIndicatorActivity();
    } else if (targetStillActive && kind === "steer" && currentState?.isStreaming) {
      setRunIndicatorActivity("Steering sent; waiting for the next output or action…");
    } else if (targetStillActive && kind === "follow-up" && currentState?.isStreaming) {
      setRunIndicatorActivity("Follow-up queued; current agent run is still active…");
    }
    if (targetStillActive && response?.command === "native_slash_command" && response.data?.copyText) {
      try {
        await copyText(response.data.copyText);
      } catch (error) {
        response.data.message = `${response.data.message || "Copy requested, but clipboard access failed."}\n\nClipboard access failed: ${error.message}\n\n${response.data.copyText}`;
        response.data.level = "warn";
      }
    }
    if (targetStillActive && response?.command === "native_slash_command" && response.data?.download) {
      if (triggerNativeDownload(response.data.download)) addEvent(`download started: ${response.data.download.fileName || response.data.download.url}`, "info");
    }
    if (targetStillActive && response?.command === "native_slash_command" && response.data?.message) {
      addTransientMessage({ role: "native", title: message.split(/\s+/, 1)[0], content: response.data.message, level: response.data.level || "info" });
    }
    if (usesPromptInput) {
      clearAttachments(targetTabId);
      if (targetStillActive) {
        elements.promptInput.value = "";
        resizePromptInput();
      } else {
        tabDrafts.set(targetTabId, "");
      }
    }
    if (targetStillActive) {
      hideCommandSuggestions();
      scheduleRefreshState(120, tabContext);
    } else {
      scheduleRefreshTabs(300);
    }
  } catch (error) {
    if (startsRun) {
      markTabIdleLocally(targetTabId);
      if (isCurrentTabContext(tabContext)) clearRunIndicatorActivity();
    }
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addTransientMessage({ role: "error", title: message.startsWith("/") ? message.split(/\s+/, 1)[0] : "error", content: error.message, level: "error" });
    }
    if (throwOnError) throw error;
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
    case "setStatus": {
      const statusKey = request.statusKey || "extension";
      if (request.statusText) {
        statusEntries.set(statusKey, request.statusText);
        if (statusKey === GIT_FOOTER_WEBUI_STATUS_KEY) cacheGitFooterWebuiPayload(request.statusText, request.tabId);
      } else {
        statusEntries.delete(statusKey);
      }
      updateOptionalFeatureAvailability();
      renderStatus();
      return;
    }
    case "setWidget":
      if (Array.isArray(request.widgetLines)) widgets.set(request.widgetKey || request.id, request);
      else widgets.delete(request.widgetKey || request.id);
      updateOptionalFeatureAvailability();
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
  const tabContext = activeTabContext(tabId);
  try {
    const response = await api("/api/extension-ui-response", { method: "POST", body, tabId });
    if (!applyResponseTab(response) && decrementTabPendingBlockerCount(tabId)) renderTabs();
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  } finally {
    if (!isCurrentTabContext(tabContext)) return;
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
  const detectedReleasePrompt = request.method === "select" ? releaseDialogPromptParts(prompt) : null;
  const releasePrompt = detectedReleasePrompt && isOptionalFeatureEnabled(detectedReleasePrompt.featureId) ? detectedReleasePrompt : null;
  const displayPrompt = releasePrompt || prompt;
  const isGuardrailDialog = isGuardrailDialogPrompt(displayPrompt);
  const isReleaseDialog = !!releasePrompt;
  elements.dialog.classList.toggle("guardrail-dialog", isGuardrailDialog);
  elements.dialog.classList.toggle("release-dialog", isReleaseDialog);
  elements.dialogTitle.textContent = displayPrompt.title;
  if (isReleaseDialog) renderReleaseDialogMessage(elements.dialogMessage, displayPrompt.message);
  else renderAnsiText(elements.dialogMessage, displayPrompt.message);
  elements.dialogMessage.hidden = !displayPrompt.plainMessage;
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
      if (isReleaseDialog && /^(?:Yes|All eligible packages\b|Publish selected packages \([1-9]\d*\))/.test(optionLabel)) button.classList.add("primary", "release-publish-action");
      if (isReleaseDialog && /^Publish selected packages$/i.test(optionLabel)) button.classList.add("release-publish-disabled-action");
      if (isReleaseDialog && /^\[x\]/.test(optionLabel)) button.classList.add("release-target-option", "release-target-selected");
      if (isReleaseDialog && /^\[ \]/.test(optionLabel)) button.classList.add("release-target-option");
      if (isReleaseDialog && /^(?:No|Cancel)$/i.test(optionLabel)) button.classList.add("release-cancel-action");
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

function handleInactiveTabEvent(event) {
  if (event.type === "extension_ui_request" && EXTENSION_UI_BLOCKING_METHODS.has(event.method)) {
    if (!event.replayed) notifyBlockedTab(event.tabId, { request: event, count: event.pendingExtensionUiRequestCount });
    renderTabs();
  } else if (event.type === "agent_end") {
    notifyAgentDone(event.tabId, { activity: event.tabActivity, tabTitle: event.tabTitle });
  }
}

function handleEvent(event) {
  ingestEventTabActivity(event);
  trackSkillsFromEvent(event);
  if (!eventTargetsActiveTab(event)) {
    handleInactiveTabEvent(event);
    return;
  }
  const tabContext = activeTabContext(event.tabId || activeTabId);
  switch (event.type) {
    case "webui_connected":
      setWebuiVersion(event.version);
      setWebuiDevServer(isWebuiDevMetadata(event));
      if (Object.prototype.hasOwnProperty.call(event, "activeRun")) {
        setAppRunnerData(event.tabId || activeTabId, { cwd: event.cwd, activeRun: event.activeRun });
        renderAppRunnerControls();
        renderWidgets();
      }
      addEvent(`connected to ${event.tabTitle || "terminal"} for ${event.cwd}`);
      scheduleForegroundReconcile("event stream reconnect", 0);
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
      clearContextUsageUnknownAfterCompaction(event.tabId || activeTabId);
      statusEntries.clear();
      widgets.clear();
      resetOptionalFeatureAvailability();
      renderStatus();
      renderWidgets();
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      setTimeout(() => {
        if (!isCurrentTabContext(tabContext)) return;
        refreshAll(tabContext).catch((error) => {
          if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
        });
      }, 500);
      break;
    case "webui_extension_ui_cancelled":
      removeQueuedDialogRequests(event.ids || []);
      addEvent(`cancelled ${event.ids?.length || 0} pending extension UI request(s)`, "warn");
      break;
    case "webui_app_runner_update":
      setAppRunnerData(event.tabId || activeTabId, { cwd: event.cwd, activeRun: event.activeRun });
      renderAppRunnerControls();
      renderWidgets();
      break;
    case "webui_cwd_changed":
      addEvent(`${event.tabTitle || "terminal"} cwd changed to ${event.cwd}`);
      setAppRunnerData(event.tabId || activeTabId, { cwd: event.cwd, activeRun: null, runners: [] });
      renderAppRunnerControls();
      renderWidgets();
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      refreshAppRunners(tabContext).catch((error) => addEvent(error.message, "error"));
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
      clearRunIndicatorActivity();
      refreshTabs().catch((error) => addEvent(error.message, "error"));
      break;
    case "pi_process_error":
      addEvent(event.error || "pi rpc process error", "error");
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
      if (currentState) currentState = { ...currentState, isStreaming: true };
      setRunIndicatorActivity("Agent run started; waiting for first output or action…");
      addEvent("agent started");
      scheduleRefreshState();
      renderFooter();
      renderFeedbackTray();
      break;
    case "agent_end":
      addEvent("agent finished");
      notifyAgentDone(event.tabId || activeTabId, { activity: event.tabActivity, tabTitle: event.tabTitle });
      clearContextUsageUnknownAfterCompaction(event.tabId || activeTabId);
      if (currentState) currentState = { ...currentState, isStreaming: false };
      clearRunIndicatorActivity();
      markTabOutputSeen();
      scheduleRefreshState();
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      scheduleRefreshCodexUsage(2200);
      renderFeedbackTray();
      {
        const workflowTabId = event.tabId || activeTabId;
        const workflow = gitWorkflowForTab(workflowTabId, { create: false });
        if (workflow?.active && workflow.step === "generating") {
          loadGitWorkflowMessage({ requireFresh: true, retries: 3, runId: workflow.runId, tabId: workflowTabId });
        } else if (workflow?.active && workflow.step === "branchNaming") {
          loadGitWorkflowBranchName({ requireFresh: true, retries: 3, runId: workflow.runId, tabId: workflowTabId });
        } else if (workflow?.active && workflow.step === "prGenerating") {
          loadGitWorkflowPr({ requireFresh: true, retries: 3, runId: workflow.runId, tabId: workflowTabId });
        }
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
      if (runIndicatorIsActive()) setRunIndicatorActivity("Assistant message finished; waiting for the next step…", { scroll: false });
      scheduleRefreshMessages();
      scheduleRefreshState();
      scheduleRefreshFooter();
      break;
    case "tool_execution_start":
      streamToolCallSeen = true;
      suppressStreamingAssistantTextBeforeToolCall();
      handleToolExecutionStart(event);
      setRunIndicatorActivity(`Running tool: ${runIndicatorToolName(event.toolName)}…`);
      addEvent(`tool ${event.toolName} started`);
      break;
    case "tool_execution_update":
      handleToolExecutionUpdate(event);
      setRunIndicatorActivity(`Running tool: ${runIndicatorToolName(event.toolName)}…`, { scroll: false });
      break;
    case "tool_execution_end":
      handleToolExecutionEnd(event);
      setRunIndicatorActivity(`Tool ${runIndicatorToolName(event.toolName)} ${event.isError ? "failed" : "finished"}; waiting for the agent's next step…`);
      addEvent(`tool ${event.toolName} ${event.isError ? "failed" : "finished"}`, event.isError ? "error" : "info");
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      break;
    case "compaction_start":
      if (currentState) currentState = { ...currentState, isCompacting: true };
      markContextUsageUnknownAfterCompaction(event.tabId || activeTabId);
      setRunIndicatorActivity(`Compacting context${event.reason ? ` (${event.reason})` : ""}…`);
      addEvent(`compaction started (${event.reason})`);
      renderStatus();
      break;
    case "compaction_end":
      if (currentState) currentState = { ...currentState, isCompacting: false };
      if (event.aborted) clearContextUsageUnknownAfterCompaction(event.tabId || activeTabId);
      else markContextUsageUnknownAfterCompaction(event.tabId || activeTabId);
      addEvent(`compaction ${event.aborted ? "aborted" : "finished"}`);
      if (!currentState?.isStreaming) clearRunIndicatorActivity();
      markTabOutputSeen();
      renderStatus();
      scheduleRefreshState();
      scheduleRefreshMessages();
      scheduleRefreshFooter();
      break;
    case "auto_retry_start": {
      const seconds = Math.max(0, Math.ceil(Number(event.delayMs || 0) / 1000));
      const retryText = `Retrying (${event.attempt || "?"}/${event.maxAttempts || "?"}) in ${seconds}s after: ${event.errorMessage || "model/provider error"}`;
      setRunIndicatorActivity(retryText);
      addEvent(retryText, "warn");
      addTransientMessage({ role: "warn", title: "auto retry", content: retryText, level: "warn" });
      break;
    }
    case "auto_retry_end":
      if (event.success === false) {
        const retryError = `Retry failed after ${event.attempt || "?"} attempt(s): ${event.finalError || "Unknown error"}`;
        addEvent(retryError, "error");
        addTransientMessage({ role: "error", title: "auto retry failed", content: retryError, level: "error" });
      } else {
        addEvent(`retry recovered after ${event.attempt || "?"} attempt(s)`);
      }
      break;
    case "extension_error": {
      const message = `${event.extensionPath || "extension"}${event.event ? ` during ${event.event}` : ""}: ${event.error || "unknown extension error"}`;
      addEvent(message, "error");
      addTransientMessage({ role: "error", title: "extension error", content: message, level: "error" });
      break;
    }
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
      } else if (["set_model", "cycle_model", "set_thinking_level", "cycle_thinking_level", "new_session", "compact"].includes(event.command)) {
        if (event.command === "set_model") {
          applyOptimisticModelSelection(event.data, tabContext);
        } else if (event.command === "cycle_model") {
          applyOptimisticModelSelection(event.data?.model, tabContext);
        } else if (event.command === "set_thinking_level" || event.command === "cycle_thinking_level") {
          applyOptimisticThinkingSelection(event.data, tabContext);
        } else if (event.command === "new_session") {
          const tabId = event.tabId || activeTabId;
          clearContextUsageUnknownAfterCompaction(tabId);
          forgetLastUserPrompt(tabId);
          resetGitWorkflowForTab(tabId);
        }
        scheduleRefreshState();
        scheduleRefreshMessages();
        scheduleRefreshFooter();
      }
      break;
    default:
      break;
  }
}

function connectEvents(tabContext = activeTabContext()) {
  eventSource?.close();
  eventSource = null;
  if (!tabContext.tabId || !isCurrentTabContext(tabContext)) return;
  const source = new EventSource(`/api/events?tab=${encodeURIComponent(tabContext.tabId)}`);
  eventSource = source;
  source.onmessage = (message) => {
    if (eventSource !== source || !isCurrentTabContext(tabContext)) return;
    try {
      handleEvent(JSON.parse(message.data));
    } catch (error) {
      if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
    }
  };
  source.onerror = () => {
    if (eventSource !== source || !isCurrentTabContext(tabContext)) return;
    addEvent("event stream disconnected; browser will retry", "warn");
    fetch("/api/health", { cache: "no-store" }).catch((error) => setBackendOffline(true, error));
  };
}

elements.copyServerCommandButton?.addEventListener("click", copyServerStartCommand);
elements.retryServerConnectionButton?.addEventListener("click", retryServerConnection);
elements.commandSearchInput?.addEventListener("input", renderCommands);
elements.createPromptListButton?.addEventListener("click", () => openPromptListDialog({ mode: "create" }));
elements.loadPromptListButton?.addEventListener("click", () => openPromptListDialog({ mode: "load", list: loadedPromptList }));
elements.runLoadedPromptListButton?.addEventListener("click", () => runLoadedPromptList());
elements.promptListAddPromptButton?.addEventListener("click", () => {
  const next = promptListEditorValues();
  next.push("");
  renderPromptListEditor(next);
  setPromptListStatus("Added follow-up prompt.", "muted");
  queueMicrotask(() => elements.promptListEditorRows?.querySelector(".prompt-list-editor-row:last-child textarea")?.focus());
});
elements.promptListDialogLoadButton?.addEventListener("click", () => setPromptListLoadPanelVisible(elements.promptListLoadPanel?.hidden !== false));
elements.promptListLoadSelectedButton?.addEventListener("click", loadSelectedPromptListIntoEditor);
elements.promptListDeleteSelectedButton?.addEventListener("click", deleteSelectedPromptList);
elements.promptListSelect?.addEventListener("change", renderPromptListDialogControls);
elements.promptListNameInput?.addEventListener("input", () => setPromptListStatus(""));
elements.promptListSaveButton?.addEventListener("click", saveDisplayedPromptList);
elements.promptListRunListButton?.addEventListener("click", () => runDisplayedPromptList());
elements.promptListCloseButton?.addEventListener("click", () => elements.promptListDialog?.close());
elements.promptListDialog?.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
elements.attachmentTextCancelButton?.addEventListener("click", closeTextAttachmentEditor);
elements.attachmentTextSaveButton?.addEventListener("click", saveTextAttachmentEdit);
elements.attachmentTextEditor?.addEventListener("input", () => {
  renderTextAttachmentEditorMeta();
  setAttachmentTextStatus("Unsaved attachment edits.", "warn");
});
elements.attachmentTextDialog?.addEventListener("close", () => {
  activeTextAttachmentEditor = null;
  if (elements.attachmentTextEditor) elements.attachmentTextEditor.value = "";
  setAttachmentTextStatus("");
});
elements.attachmentTextDialog?.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "s") return;
  event.preventDefault();
  if (!elements.attachmentTextSaveButton?.disabled) saveTextAttachmentEdit();
});
elements.attachmentTextDialog?.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
elements.skillEditorCancelButton?.addEventListener("click", closeSkillEditor);
elements.skillEditorSaveButton?.addEventListener("click", saveSkillEditor);
elements.skillEditorText?.addEventListener("input", () => setSkillEditorStatus("Unsaved skill edits.", "warn"));
elements.skillEditorDialog?.addEventListener("close", () => {
  activeSkillEditor = null;
  if (elements.skillEditorText) elements.skillEditorText.value = "";
  setSkillEditorStatus("");
});
elements.skillEditorDialog?.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "s") return;
  event.preventDefault();
  if (!elements.skillEditorSaveButton?.disabled) saveSkillEditor();
});
elements.skillEditorDialog?.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
elements.sendFeedbackButton.addEventListener("click", () => submitQueuedActionFeedback());
elements.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendPrompt("prompt");
});
elements.composerActionsButton.addEventListener("click", () => {
  setComposerActionsOpen(!document.body.classList.contains("composer-actions-open"));
});
elements.busyPromptBehaviorTag?.addEventListener("click", (event) => {
  event.preventDefault();
  const nextOpen = !busyPromptBehaviorMenuOpen;
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setComposerActionsOpen(false);
  setBusyPromptBehaviorMenuOpen(nextOpen);
});
elements.busyPromptBehaviorTag?.addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
  event.preventDefault();
  const focusPrevious = event.key === "ArrowUp";
  setBusyPromptBehaviorMenuOpen(true);
  requestAnimationFrame(() => {
    const items = busyPromptBehaviorMenuItems();
    if (!items.length) return;
    const currentIndex = Math.max(0, items.findIndex((item) => item.getAttribute("aria-checked") === "true"));
    const targetIndex = focusPrevious ? (currentIndex - 1 + items.length) % items.length : currentIndex;
    items[targetIndex]?.focus({ preventScroll: true });
  });
});
elements.busyPromptBehaviorMenu?.addEventListener("click", (event) => {
  const item = event.target?.closest?.("[data-busy-prompt-behavior]");
  if (!item) return;
  chooseBusyPromptBehaviorFromMenu(item.dataset.busyPromptBehavior);
});
elements.busyPromptBehaviorMenu?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    setBusyPromptBehaviorMenuOpen(false);
    elements.busyPromptBehaviorTag?.focus({ preventScroll: true });
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    focusBusyPromptBehaviorMenuItem(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const items = busyPromptBehaviorMenuItems();
    items[event.key === "Home" ? 0 : items.length - 1]?.focus({ preventScroll: true });
    return;
  }
  if (event.key === "Tab") {
    setBusyPromptBehaviorMenuOpen(false);
  }
});
elements.steerButton.addEventListener("click", () => sendPromptFromModeButton("steer", elements.steerButton));
elements.followUpButton.addEventListener("click", () => sendPromptFromModeButton("follow-up", elements.followUpButton));
elements.terminalTabsToggleButton.addEventListener("click", () => {
  setMobileTabsExpanded(!document.body.classList.contains("mobile-tabs-expanded"));
});
elements.newTabButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openNewTabMenu();
});
elements.newTabButton.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openNewTabMenu();
  focusNewTabMenuItem(event.key === "ArrowUp" ? "last" : "first");
});
elements.newTabMenuPanel?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    setNewTabMenuOpen(false);
    elements.newTabButton.focus({ preventScroll: true });
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    moveNewTabMenuFocus(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveNewTabMenuFocus(-1);
  } else if (event.key === "Home") {
    event.preventDefault();
    focusNewTabMenuItem("first");
  } else if (event.key === "End") {
    event.preventDefault();
    focusNewTabMenuItem("last");
  }
});
elements.newTabMenu?.addEventListener("pointerenter", () => openNewTabMenu());
elements.newTabMenu?.addEventListener("pointerleave", () => {
  if (!elements.newTabMenu?.contains(document.activeElement)) setNewTabMenuOpen(false);
});
elements.newTabMenu?.addEventListener("focusin", () => openNewTabMenu());
elements.newTabMenu?.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!elements.newTabMenu?.contains(document.activeElement)) setNewTabMenuOpen(false);
  }, 0);
});
elements.newTabCurrentDirectoryButton?.addEventListener("click", () => createTerminalTab(currentDirectoryForNewTab(), { triggerButton: elements.newTabCurrentDirectoryButton }));
elements.newTabChooseDirectoryButton?.addEventListener("click", () => createTerminalTabFromChosenDirectory({ triggerButton: elements.newTabChooseDirectoryButton }));
elements.closeAllTabsButton.addEventListener("click", () => closeAllTerminalTabs());
elements.gitWorkflowButton.addEventListener("click", () => {
  setComposerActionsOpen(false);
  startGitWorkflow();
});
const publishMenuContainer = elements.publishButton.parentElement;
elements.publishButton.addEventListener("click", () => {
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setPublishMenuOpen(true);
});
publishMenuContainer?.addEventListener("pointerenter", () => {
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setPublishMenuOpen(true);
});
publishMenuContainer?.addEventListener("pointerleave", () => setPublishMenuOpen(false));
publishMenuContainer?.addEventListener("focusin", () => {
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setPublishMenuOpen(true);
});
publishMenuContainer?.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!publishMenuContainer?.contains(document.activeElement)) setPublishMenuOpen(false);
  }, 0);
});
const nativeCommandMenuContainer = elements.nativeCommandMenuButton.parentElement;
elements.nativeCommandMenuButton.addEventListener("click", () => {
  setPublishMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setNativeCommandMenuOpen(true);
});
nativeCommandMenuContainer?.addEventListener("pointerenter", () => {
  setPublishMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setNativeCommandMenuOpen(true);
});
nativeCommandMenuContainer?.addEventListener("pointerleave", () => setNativeCommandMenuOpen(false));
nativeCommandMenuContainer?.addEventListener("focusin", () => {
  setPublishMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(false);
  setNativeCommandMenuOpen(true);
});
nativeCommandMenuContainer?.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!nativeCommandMenuContainer?.contains(document.activeElement)) setNativeCommandMenuOpen(false);
  }, 0);
});
const appRunnerMenuContainer = elements.appRunnerMenuButton?.parentElement;
elements.appRunnerInfoButton?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openAppRunnerInfoDialog();
});
elements.appRunnerInfoCloseButton?.addEventListener("click", closeAppRunnerInfoDialog);
elements.appRunnerMenuButton?.addEventListener("click", async () => {
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setOptionsMenuOpen(false);
  setAppRunnerMenuOpen(false);
  const tabContext = activeTabContext();
  try {
    await refreshAppRunners(tabContext);
    if (!isCurrentTabContext(tabContext)) return;
    if (appRunnerMenuCanOpen()) setAppRunnerMenuOpen(true);
    else if (!appRunnerIsRunning(activeAppRunnerData().activeRun)) openAppRunnerInfoDialog();
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message || String(error), "error");
  }
});
appRunnerMenuContainer?.addEventListener("pointerenter", () => {
  if (elements.appRunnerMenuButton?.disabled || !appRunnerMenuCanOpen()) return;
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setOptionsMenuOpen(false);
  setAppRunnerMenuOpen(true);
});
appRunnerMenuContainer?.addEventListener("pointerleave", () => setAppRunnerMenuOpen(false));
appRunnerMenuContainer?.addEventListener("focusin", () => {
  if (elements.appRunnerMenuButton?.disabled || !appRunnerMenuCanOpen()) return;
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setOptionsMenuOpen(false);
  setAppRunnerMenuOpen(true);
});
appRunnerMenuContainer?.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!appRunnerMenuContainer?.contains(document.activeElement)) setAppRunnerMenuOpen(false);
  }, 0);
});
const optionsMenuContainer = elements.optionsMenuButton.parentElement;
elements.optionsMenuButton.addEventListener("click", () => {
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(true);
});
optionsMenuContainer?.addEventListener("pointerenter", () => {
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(true);
});
optionsMenuContainer?.addEventListener("pointerleave", () => setOptionsMenuOpen(false));
optionsMenuContainer?.addEventListener("focusin", () => {
  setPublishMenuOpen(false);
  setNativeCommandMenuOpen(false);
  setAppRunnerMenuOpen(false);
  setOptionsMenuOpen(true);
});
optionsMenuContainer?.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!optionsMenuContainer?.contains(document.activeElement)) setOptionsMenuOpen(false);
  }, 0);
});
elements.releaseNpmButton.addEventListener("click", () => runPublishWorkflow("/release-npm"));
elements.releaseAurButton.addEventListener("click", () => runPublishWorkflow("/release-aur"));
elements.nativeSkillsButton.addEventListener("click", () => runNativeCommandMenu("/skills"));
elements.nativeToolsButton.addEventListener("click", () => runNativeCommandMenu("/tools"));
elements.optionsResumeButton.addEventListener("click", () => runNativeCommandMenu("/resume"));
elements.optionsReloadButton.addEventListener("click", () => runNativeCommandMenu("/reload"));
elements.optionsNameButton.addEventListener("click", () => runNativeCommandMenu("/name"));
elements.optionsCloneButton.addEventListener("click", () => runNativeCommandMenu("/clone"));
elements.optionsSettingsButton.addEventListener("click", () => runNativeCommandMenu("/settings"));
elements.optionsExportButton.addEventListener("click", () => runNativeCommandMenu("/export"));
elements.optionsForkButton.addEventListener("click", () => runNativeCommandMenu("/fork"));
elements.optionsTreeButton.addEventListener("click", () => runNativeCommandMenu("/tree"));
elements.gitWorkflowSteps.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest("[data-git-workflow-process]");
  if (!button || !elements.gitWorkflowSteps.contains(button) || button.disabled) return;
  selectGitWorkflowProcess(button.dataset.gitWorkflowProcess);
});
elements.gitWorkflowCancelButton.addEventListener("click", () => cancelGitWorkflow());
elements.gitPrCancelButton?.addEventListener("click", () => resolveGitPrDialog(null));
elements.gitPrCreateButton?.addEventListener("click", () => {
  const title = elements.gitPrTitleInput?.value.trim() || "";
  const body = elements.gitPrBodyEditor?.value.trimEnd() || "";
  if (!title) {
    setGitPrDialogStatus("PR title is required.", "error");
    elements.gitPrTitleInput?.focus();
    return;
  }
  if (!body.trim()) {
    setGitPrDialogStatus("PR description is required.", "error");
    elements.gitPrBodyEditor?.focus();
    return;
  }
  resolveGitPrDialog({ title, body });
});
elements.gitPrDialog?.addEventListener("close", () => {
  if (activeGitPrDialogResolve) resolveGitPrDialog(null);
});
elements.nativeCommandDialog.addEventListener("close", () => {
  elements.nativeCommandSearch.oninput = null;
  nativeCommandTabId = null;
});

function resetAbortLongPressAffordance() {
  clearTimeout(abortLongPressTimer);
  abortLongPressTimer = null;
  elements.abortButton.classList.remove("long-pressing");
  if (!abortRequestInFlight) elements.abortButton.textContent = "Abort";
}

async function abortActiveRun({ source = "button" } = {}) {
  if (abortRequestInFlight || !isAbortAvailable()) return;
  const tabContext = activeTabContext();
  abortRequestInFlight = true;
  resetAbortLongPressAffordance();
  updateComposerModeButtons();
  const hadActiveBash = isUserBashActive(tabContext.tabId);
  const hadActiveRun = runIndicatorIsActive();
  try {
    if (hadActiveBash) {
      const command = userBashByTab.get(tabContext.tabId)?.command || "bash";
      setRunIndicatorActivity(`Abort requested${source === "escape" ? " from Esc" : source === "long-press" ? " from long-press" : ""}; stopping bash…`);
      await api("/api/abort-bash", { method: "POST", body: {}, tabId: tabContext.tabId });
      if (!isCurrentTabContext(tabContext)) return;
      addTransientMessage({ role: "native", title: "bash aborted", content: `⛔ Abort requested for bash command:\n${command}`, level: "warn" });
      return;
    }
    if (hadActiveRun) setRunIndicatorActivity(`Abort requested${source === "escape" ? " from Esc" : source === "long-press" ? " from long-press" : ""}; checking whether Pi stopped…`);
    await api("/api/abort", { method: "POST", body: {}, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    addAbortTranscriptNotice({ activeRun: hadActiveRun });
    scheduleAbortStateChecks(tabContext);
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      addEvent(error.message, "error");
      addAbortTranscriptNotice({ errorMessage: error.message });
    }
  } finally {
    abortRequestInFlight = false;
    updateComposerModeButtons();
  }
}

function startAbortLongPress(event) {
  if (!isAbortAvailable() || abortRequestInFlight) return;
  if (event.button !== undefined && event.button !== 0) return;
  resetAbortLongPressAffordance();
  abortLongPressHandled = false;
  elements.abortButton.classList.add("long-pressing");
  elements.abortButton.textContent = "Hold…";
  abortLongPressTimer = setTimeout(() => {
    abortLongPressTimer = null;
    abortLongPressHandled = true;
    abortActiveRun({ source: "long-press" });
  }, ABORT_LONG_PRESS_MS);
}

elements.abortButton.addEventListener("pointerdown", startAbortLongPress);
for (const eventName of ["pointerup", "pointerleave", "pointercancel", "blur"]) {
  elements.abortButton.addEventListener(eventName, resetAbortLongPressAffordance);
}
elements.abortButton.addEventListener("click", (event) => {
  if (abortLongPressHandled) {
    event.preventDefault();
    abortLongPressHandled = false;
    return;
  }
  abortActiveRun({ source: "button" });
});
elements.newSessionButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  const tabContext = activeTabContext();
  if (!confirm("Start a new Pi session?")) return;
  try {
    const response = await api("/api/new-session", { method: "POST", body: {}, tabId: tabContext.tabId });
    applyResponseTab(response);
    forgetLastUserPrompt(tabContext.tabId);
    resetGitWorkflowForTab(tabContext.tabId);
    if (!isCurrentTabContext(tabContext)) return;
    await refreshAll(tabContext);
    if (isCurrentTabContext(tabContext)) focusPromptInput({ defer: true });
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  }
});
elements.compactButton.addEventListener("click", async () => {
  setComposerActionsOpen(false);
  const tabContext = activeTabContext();
  try {
    elements.compactButton.disabled = true;
    elements.compactButton.textContent = "Compacting…";
    setRunIndicatorActivity("Requesting context compaction…");
    scrollChatToBottom({ force: true });
    markContextUsageUnknownAfterCompaction(tabContext.tabId);
    renderFooter();
    addEvent("manual compaction requested");
    await api("/api/compact", { method: "POST", body: {}, tabId: tabContext.tabId });
    if (!isCurrentTabContext(tabContext)) return;
    scheduleRefreshState(120, tabContext);
    scheduleRefreshMessages(600, tabContext);
    scheduleRefreshFooter(600, tabContext);
  } catch (error) {
    if (isCurrentTabContext(tabContext)) {
      clearContextUsageUnknownAfterCompaction(tabContext.tabId);
      clearRunIndicatorActivity();
      renderFooter();
      addEvent(error.message, "error");
    }
  } finally {
    if (isCurrentTabContext(tabContext)) {
      elements.compactButton.disabled = !!currentState?.isCompacting;
      elements.compactButton.textContent = currentState?.isCompacting ? "Compacting…" : "Compact";
    }
  }
});
elements.setModelButton.addEventListener("click", async () => {
  if (!elements.modelSelect.value) return;
  const tabContext = activeTabContext();
  try {
    const selected = JSON.parse(elements.modelSelect.value);
    const response = await api("/api/model", { method: "POST", body: selected, tabId: tabContext.tabId });
    if (isCurrentTabContext(tabContext)) {
      applyOptimisticModelSelection(response.data || selected, tabContext);
      await refreshState(tabContext);
    }
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  }
});
elements.setThinkingButton.addEventListener("click", async () => {
  const tabContext = activeTabContext();
  try {
    const response = await api("/api/thinking", { method: "POST", body: { level: elements.thinkingSelect.value }, tabId: tabContext.tabId });
    if (isCurrentTabContext(tabContext)) {
      applyOptimisticThinkingSelection(response.data, tabContext);
      if (response.data?.pending) {
        addEvent(response.data.message || `Thinking level ${response.data.level} will apply to the next prompt.`, "info");
      } else if (response.data?.level) {
        const requested = response.data.requestedLevel;
        const effective = response.data.level;
        addEvent(requested && requested !== effective ? `Thinking level set to ${effective} (requested ${requested}).` : `Thinking level set to ${effective}.`, "info");
      }
      await refreshState(tabContext);
    }
  } catch (error) {
    if (isCurrentTabContext(tabContext)) addEvent(error.message, "error");
  }
});
elements.themeSelect.addEventListener("change", () => {
  setThemeByName(elements.themeSelect.value, { persist: true, announce: true }).catch((error) => addEvent(error.message || String(error), "error"));
});
if (elements.backgroundChooseButton && elements.backgroundInput) {
  elements.backgroundChooseButton.addEventListener("click", () => elements.backgroundInput.click());
  elements.backgroundInput.addEventListener("change", () => {
    const [file] = Array.from(elements.backgroundInput.files || []);
    elements.backgroundInput.value = "";
    setCustomBackgroundFromFile(file).catch((error) => addEvent(error.message || String(error), "error"));
  });
}
if (elements.backgroundClearButton) {
  elements.backgroundClearButton.addEventListener("click", () => clearCustomBackground().catch((error) => addEvent(error.message || String(error), "error")));
}
elements.openNetworkButton.addEventListener("click", openToNetwork);
elements.serverActionSelect.addEventListener("change", updateServerActionButton);
elements.runServerActionButton.addEventListener("click", () => runSelectedServerAction().catch((error) => addEvent(error.message || String(error), "error")));
updateServerActionButton();
elements.agentDoneNotificationsToggle.addEventListener("change", () => {
  setAgentDoneNotificationsEnabled(elements.agentDoneNotificationsToggle.checked, {
    requestPermission: elements.agentDoneNotificationsToggle.checked,
    announce: true,
  }).catch((error) => {
    addEvent(error.message, "error");
    renderAgentDoneNotificationsToggle();
  });
});
if (elements.thinkingVisibilityToggle) {
  elements.thinkingVisibilityToggle.addEventListener("change", () => {
    setThinkingOutputVisible(elements.thinkingVisibilityToggle.checked, { announce: true });
  });
}
if (elements.terminalTabsLayoutSelect) {
  elements.terminalTabsLayoutSelect.addEventListener("change", () => {
    setTerminalTabsLayout(elements.terminalTabsLayoutSelect.value, { announce: true });
  });
}
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
  if (newTabMenuOpen && !event.target?.closest?.(".terminal-new-tab-menu")) {
    setNewTabMenuOpen(false);
  }
  if (document.body.classList.contains("composer-actions-open") && !elements.composer.contains(event.target)) {
    setComposerActionsOpen(false);
  }
  if (publishMenuOpen && !event.target?.closest?.(".composer-publish-menu")) {
    setPublishMenuOpen(false);
  }
  if (nativeCommandMenuOpen && !event.target?.closest?.(".composer-native-command-menu")) {
    setNativeCommandMenuOpen(false);
  }
  if (appRunnerMenuOpen && !event.target?.closest?.(".composer-app-runner-menu")) {
    setAppRunnerMenuOpen(false);
  }
  if (optionsMenuOpen && !event.target?.closest?.(".composer-options-menu")) {
    setOptionsMenuOpen(false);
  }
  if (busyPromptBehaviorMenuOpen && !event.target?.closest?.(".composer-context-tags, .composer-busy-mode-menu")) {
    setBusyPromptBehaviorMenuOpen(false);
  }
  if (document.body.classList.contains("mobile-tabs-expanded") && !elements.tabBar.contains(event.target) && !elements.terminalTabsToggleButton.contains(event.target)) {
    setNewTabMenuOpen(false);
    setMobileTabsExpanded(false);
  }
  if (isFooterPickerOpen() && !elements.statusBar.contains(event.target)) {
    setFooterModelPickerOpen(false);
    setFooterThinkingPickerOpen(false);
  }
}, { passive: true });
document.addEventListener("pointermove", (event) => {
  if (openTerminalTabGroupKey && !event.target?.closest?.(".terminal-tab-group")) {
    clearOpenTerminalTabGroup(openTerminalTabGroupKey);
  }
  rememberPointerPosition(event);
}, { passive: true });

function isTextEntryTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toLowerCase();
  return target.isContentEditable || tag === "textarea" || tag === "input" || tag === "select";
}

function shouldHandleNativeAppShortcut(event) {
  if (event.defaultPrevented) return false;
  if (elements.dialog?.open || elements.pathPickerDialog?.open || elements.nativeCommandDialog?.open || elements.appRunnerInfoDialog?.open) return false;
  return event.target === elements.promptInput || !isTextEntryTarget(event.target);
}

function handleNativeAppShortcut(event) {
  if (!shouldHandleNativeAppShortcut(event)) return;
  const key = event.key;
  const lowerKey = String(key || "").toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  if (ctrlOrMeta && !event.altKey && lowerKey === "l") {
    event.preventDefault();
    openNativeModelSelector();
    return;
  }
  if (ctrlOrMeta && !event.altKey && lowerKey === "p") {
    event.preventDefault();
    cycleModelFromShortcut(event.shiftKey ? "backward" : "forward");
    return;
  }
  if (ctrlOrMeta && !event.altKey && !event.shiftKey && lowerKey === "t") {
    event.preventDefault();
    setThinkingOutputVisible(!thinkingOutputVisible, { announce: true });
    return;
  }
  if (ctrlOrMeta && !event.altKey && !event.shiftKey && lowerKey === "o") {
    event.preventDefault();
    setToolOutputGloballyExpanded(!toolOutputGloballyExpanded, { announce: true });
    return;
  }
  if (ctrlOrMeta && !event.altKey && !event.shiftKey && lowerKey === "c") {
    if (clearPromptFromShortcut()) event.preventDefault();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && key === "Tab") {
    event.preventDefault();
    cycleThinkingFromShortcut();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && event.altKey && key === "Enter") {
    event.preventDefault();
    if (hasComposerPayload()) sendPrompt("follow-up");
    return;
  }
  if (!event.ctrlKey && !event.metaKey && event.altKey && key === "ArrowUp") {
    event.preventDefault();
    restoreQueuedMessagesToComposerFromShortcut();
  }
}

window.addEventListener("keydown", handleNativeAppShortcut, { capture: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") scheduleForegroundReconcile("visibility resume", 0);
});
window.addEventListener("pageshow", () => scheduleForegroundReconcile("page show", 0));
window.addEventListener("focus", () => scheduleForegroundReconcile("window focus"));
window.addEventListener("online", () => scheduleForegroundReconcile("network online", 0));
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.dialog?.open || elements.pathPickerDialog?.open) return;
  if (publishMenuOpen) {
    setPublishMenuOpen(false);
    return;
  }
  if (nativeCommandMenuOpen) {
    setNativeCommandMenuOpen(false);
    return;
  }
  if (appRunnerMenuOpen) {
    setAppRunnerMenuOpen(false);
    return;
  }
  if (optionsMenuOpen) {
    setOptionsMenuOpen(false);
    return;
  }
  if (busyPromptBehaviorMenuOpen) {
    setBusyPromptBehaviorMenuOpen(false);
    elements.busyPromptBehaviorTag?.focus({ preventScroll: true });
    return;
  }
  if (newTabMenuOpen) {
    setNewTabMenuOpen(false);
    return;
  }
  if (document.body.classList.contains("composer-actions-open")) {
    setComposerActionsOpen(false);
    return;
  }
  if (document.body.classList.contains("mobile-tabs-expanded")) {
    setNewTabMenuOpen(false);
    setMobileTabsExpanded(false);
    return;
  }
  if (isFooterPickerOpen()) {
    setFooterModelPickerOpen(false);
    setFooterThinkingPickerOpen(false);
    return;
  }
  if (!elements.commandSuggest.hidden) {
    hideCommandSuggestions();
    return;
  }
  if (document.activeElement === elements.promptInput && !elements.promptInput.value.trim() && doubleEscapeAction !== "none") {
    const now = Date.now();
    if (now - lastEmptyPromptEscapeTime < 500) {
      event.preventDefault();
      lastEmptyPromptEscapeTime = 0;
      runNativeCommandMenu(`/${doubleEscapeAction}`).catch((error) => addEvent(error.message || String(error), "error"));
      return;
    }
    lastEmptyPromptEscapeTime = now;
  }
  if (isSidePanelOverlayView() && !document.body.classList.contains("side-panel-collapsed")) {
    setSidePanelCollapsed(true);
    return;
  }
  if (isAbortAvailable()) {
    event.preventDefault();
    abortActiveRun({ source: "escape" });
  }
});

elements.refreshCodexUsageButton?.addEventListener("click", () => {
  refreshCodexUsage({ forceAuthRefresh: true }).finally(() => scheduleRefreshCodexUsage());
});
elements.pathPickerCreateNameInput.addEventListener("input", updateCreateDirectoryControls);
elements.pathPickerCreateNameInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  createPathPickerDirectory().catch((error) => addEvent(error.message, "error"));
});
elements.pathPickerCreateButton.addEventListener("click", () => createPathPickerDirectory().catch((error) => addEvent(error.message, "error")));
elements.pathPickerSearchInput.addEventListener("input", renderPathPickerDirectoryList);
elements.pathPickerSearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const onlyMatch = pathPickerState?.filteredDirectories?.length === 1 ? pathPickerState.filteredDirectories[0] : null;
  if (onlyMatch) loadPathPickerDirectory(onlyMatch.cwd);
});
elements.pathPickerClearSearchButton.addEventListener("click", () => clearPathPickerSearch({ focus: true }));
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

if (elements.attachButton && elements.attachmentInput) {
  elements.attachButton.addEventListener("click", () => elements.attachmentInput.click());
  elements.attachmentInput.addEventListener("change", () => {
    addAttachmentFiles(elements.attachmentInput.files, "picker");
    elements.attachmentInput.value = "";
  });
}
elements.promptInput.addEventListener("paste", handleAttachmentPaste);
elements.composer.addEventListener("dragover", handleComposerDragOver);
elements.composer.addEventListener("dragleave", handleComposerDragLeave);
elements.composer.addEventListener("drop", handleComposerDrop);

elements.promptInput.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) return;
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

  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key === "ArrowUp" && recallPreviousPromptFromHistory()) {
    event.preventDefault();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key === "ArrowDown" && recallNextPromptFromHistory()) {
    event.preventDefault();
  }
});

elements.promptInput.addEventListener("input", () => {
  resetPromptHistoryNavigation();
  if (moveLongPromptInputToAttachment()) return;
  resizePromptInput();
  renderCommandSuggestions();
});
elements.promptInput.addEventListener("focus", () => {
  syncMobileChatToBottomForInput();
  setTimeout(updateVisualViewportVars, 0);
});
elements.promptInput.addEventListener("click", () => {
  resetPromptHistoryNavigation();
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
restoreStoredSkillUsage();
restoreBusyPromptBehaviorSetting();
updateComposerModeButtons();
updateOptionalFeatureAvailability();
renderAppRunnerControls();
renderLoadedPromptListPreview();
loadLastUserPromptCache();
loadPromptHistoryCache();
installViewportHandlers();
currentThemeName = storedThemeName();
renderBackgroundControl();
initializeThemes().catch((error) => {
  addEvent(`failed to load themes: ${error.message}`, "warn");
  initializeCustomBackground().catch((backgroundError) => addEvent(`failed to initialize background: ${backgroundError.message}`, "warn"));
});
initializeFastPicks().catch((error) => addEvent(`failed to initialize path fast picks: ${error.message}`, "error"));
restoreAgentDoneNotificationsSetting();
restoreThinkingVisibilitySetting();
restoreTerminalTabsLayoutSetting();
restoreToolOutputExpansionSetting();
restoreSidePanelSectionState();
bindSidePanelSectionToggles();
restoreSidePanelState();
initializeCodexUsage();
bindMobileViewChanges();
bindSidePanelOverlayViewChanges();
registerPwaServiceWorker();
renderServerOfflinePanel();
initializeTabs().catch((error) => addEvent(error.message, "error"));
