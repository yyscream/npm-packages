import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, resolve, sep } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type GitSnapshot = {
  branch: string;
  isDetached: boolean;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  operation?: string;
  stashCount: number;
  submoduleDirty: number;
  lastCommitAge?: string;
  worktreeCount: number;
  headTag?: string;
  signingMismatch: boolean;
};

type SigningDiagnostics = {
  commitSignRequired: boolean;
  signState: string;
  gpgFormat: string;
  signingKey: string;
};

const LIVE_TOKEN_SPEED_ROLLING_WINDOW_MS = 2000;

// Toggle footer items on/off here.
const FOOTER_FLAGS = {
  branch: false,
  detachedIndicator: true,
  operationState: true,

  ahead: true,
  behind: true,

  staged: true,
  unstaged: true,
  untracked: true,
  conflicted: true,
  clean: true,

  stash: true,
  submodules: true,
  worktrees: true,
  tag: true,
  lastCommitAge: true,
  signingMismatch: true,
} as const;

function formatCwd(cwd: string): string {
  const home = homedir();
  if (cwd === home) return "~";
  if (cwd.startsWith(`${home}${sep}`)) return `~/${cwd.slice(home.length + 1).split(sep).join("/")}`;
  return cwd;
}

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

function normalizeTimestampMs(timestamp: number): number {
  // Handle mixed timestamp units from different session formats.
  // seconds   -> ms  (e.g. 1715000000)
  // ms        -> ms  (e.g. 1715000000000)
  // microsec  -> ms  (e.g. 1715000000000000)
  if (timestamp < 1e11) return timestamp * 1000;
  if (timestamp > 1e14) return Math.floor(timestamp / 1000);
  return timestamp;
}

function getEntryTimestampMs(entry: { type: string; timestamp: string; message?: { timestamp?: number } }): number | null {
  if (entry.type === "message" && typeof entry.message?.timestamp === "number") {
    return normalizeTimestampMs(entry.message.timestamp);
  }
  const parsed = Date.parse(entry.timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function isReasonableTokenSpeed(tokensPerSecond: number): boolean {
  return Number.isFinite(tokensPerSecond) && tokensPerSecond > 0 && tokensPerSecond <= 1000;
}

type LiveTokenSample = {
  timestampMs: number;
  tokens: number;
};

function estimateTokensFromCharCount(charCount: number): number {
  // Provider tokenizers differ and streaming usage is normally only available at message end.
  // chars/4 is the common rough estimate for live display; final usage uses provider counts.
  return Math.max(0, Math.round(charCount / 4));
}

function estimatePromptInjectionTokens(systemPrompt: string): number {
  return estimateTokensFromCharCount(systemPrompt.length);
}

function formatTokenSpeed(tokensPerSecond: number): string {
  if (tokensPerSecond < 100) {
    if (tokensPerSecond >= 10) return tokensPerSecond.toFixed(1);
    return tokensPerSecond.toFixed(2);
  }
  if (tokensPerSecond < 1000) return Math.round(tokensPerSecond).toString();
  if (tokensPerSecond < 10000) return `${(tokensPerSecond / 1000).toFixed(1)}k`;
  if (tokensPerSecond < 1000000) return `${Math.round(tokensPerSecond / 1000)}k`;
  if (tokensPerSecond < 10000000) return `${(tokensPerSecond / 1000000).toFixed(1)}M`;
  return `${Math.round(tokensPerSecond / 1000000)}M`;
}

async function runGit(pi: ExtensionAPI, cwd: string, args: string[], timeout = 2000): Promise<string | undefined> {
  const result = await pi.exec("git", args, { cwd, timeout }).catch(() => undefined);
  if (!result || result.code !== 0) return undefined;
  return result.stdout.trim();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toAgeLabel(epochSeconds: number): string | undefined {
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return undefined;

  const deltaSeconds = Math.max(0, Math.floor(Date.now() / 1000) - epochSeconds);
  if (deltaSeconds < 60) return "now";

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

async function detectGitOperation(pi: ExtensionAPI, cwd: string): Promise<string | undefined> {
  const gitDirRaw = await runGit(pi, cwd, ["rev-parse", "--git-dir"]);
  if (!gitDirRaw) return undefined;

  const gitDir = isAbsolute(gitDirRaw) ? gitDirRaw : resolve(cwd, gitDirRaw);

  if ((await pathExists(resolve(gitDir, "rebase-merge"))) || (await pathExists(resolve(gitDir, "rebase-apply")))) {
    return "REBASING";
  }
  if (await pathExists(resolve(gitDir, "MERGE_HEAD"))) return "MERGING";
  if (await pathExists(resolve(gitDir, "CHERRY_PICK_HEAD"))) return "CHERRY-PICK";
  if (await pathExists(resolve(gitDir, "REVERT_HEAD"))) return "REVERTING";
  if (await pathExists(resolve(gitDir, "BISECT_LOG"))) return "BISECT";

  return undefined;
}

async function readGitSnapshot(pi: ExtensionAPI, cwd: string): Promise<GitSnapshot | null> {
  const result = await pi
    .exec("git", ["status", "--porcelain=2", "--branch"], { cwd, timeout: 3000 })
    .catch(() => undefined);

  if (!result || result.code !== 0) {
    return null;
  }

  let branch = "";
  let detachedOid: string | undefined;
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let conflicted = 0;

  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line) continue;

    if (line.startsWith("# branch.head ")) {
      branch = line.slice("# branch.head ".length).trim();
      continue;
    }

    if (line.startsWith("# branch.oid ")) {
      const oid = line.slice("# branch.oid ".length).trim();
      if (oid && oid !== "(initial)") detachedOid = oid;
      continue;
    }

    if (line.startsWith("# branch.ab ")) {
      const match = line.match(/\+(\d+)\s+-(\d+)/);
      if (match) {
        ahead = Number.parseInt(match[1] ?? "0", 10) || 0;
        behind = Number.parseInt(match[2] ?? "0", 10) || 0;
      }
      continue;
    }

    if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const xy = line.split(" ")[1] ?? "..";
      const x = xy[0] ?? ".";
      const y = xy[1] ?? ".";
      if (x !== ".") staged++;
      if (y !== ".") unstaged++;
      continue;
    }

    if (line.startsWith("u ")) {
      conflicted++;
      continue;
    }

    if (line.startsWith("? ")) {
      untracked++;
      continue;
    }
  }

  const isDetached = !branch || branch === "(detached)";
  const resolvedBranch =
    !isDetached
      ? branch
      : detachedOid
        ? `detached@${detachedOid.slice(0, 7)}`
        : "detached";

  const [operation, stashList, submoduleStatus, lastCommitTs, worktreeList, headTags, commitSignRequiredRaw, headSignState] =
    await Promise.all([
      detectGitOperation(pi, cwd),
      runGit(pi, cwd, ["stash", "list", "--format=%gd"]),
      runGit(pi, cwd, ["submodule", "status", "--recursive"]),
      runGit(pi, cwd, ["log", "-1", "--format=%ct"]),
      runGit(pi, cwd, ["worktree", "list", "--porcelain"]),
      runGit(pi, cwd, ["tag", "--points-at", "HEAD", "--sort=-creatordate"]),
      runGit(pi, cwd, ["config", "--bool", "--get", "commit.gpgsign"]),
      runGit(pi, cwd, ["log", "-1", "--format=%G?"]),
    ]);

  const stashCount = stashList ? stashList.split(/\r?\n/).filter(Boolean).length : 0;

  const submoduleDirty = submoduleStatus
    ? submoduleStatus
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith(" "))
        .length
    : 0;

  const worktreeCount = worktreeList
    ? Math.max(
        1,
        worktreeList
          .split(/\r?\n/)
          .filter((line) => line.startsWith("worktree ")).length,
      )
    : 1;

  const headTag = headTags?.split(/\r?\n/).find(Boolean);

  const lastCommitAge = lastCommitTs ? toAgeLabel(Number.parseInt(lastCommitTs, 10)) : undefined;

  const commitSignRequired = commitSignRequiredRaw?.toLowerCase() === "true";
  const signState = headSignState?.trim().toUpperCase();
  const signingMismatch =
    commitSignRequired &&
    (!signState || signState === "N" || signState === "E");

  return {
    branch: resolvedBranch,
    isDetached,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
    conflicted,
    operation,
    stashCount,
    submoduleDirty,
    lastCommitAge,
    worktreeCount,
    headTag,
    signingMismatch,
  };
}

async function getSigningDiagnostics(pi: ExtensionAPI, cwd: string): Promise<SigningDiagnostics> {
  const [commitSignRequiredRaw, headSignState, gpgFormatRaw, signingKeyRaw] = await Promise.all([
    runGit(pi, cwd, ["config", "--bool", "--get", "commit.gpgsign"]),
    runGit(pi, cwd, ["log", "-1", "--format=%G?"]),
    runGit(pi, cwd, ["config", "--get", "gpg.format"]),
    runGit(pi, cwd, ["config", "--get", "user.signingkey"]),
  ]);

  return {
    commitSignRequired: commitSignRequiredRaw?.toLowerCase() === "true",
    signState: headSignState?.trim().toUpperCase() || "N",
    gpgFormat: gpgFormatRaw?.trim() || "(default:gpg)",
    signingKey: signingKeyRaw?.trim() || "(not set)",
  };
}

function buildStatusText(ctx: ExtensionContext, snapshot: GitSnapshot): string {
  const t = ctx.ui.theme;
  const f = FOOTER_FLAGS;

  const sectionSep = t.fg("dim", "│");
  const itemSep = t.fg("dim", "·");

  const branchSection: string[] = [];
  if (f.branch) {
    branchSection.push(t.fg("accent", ""), t.fg("accent", snapshot.branch));
  }
  if (f.detachedIndicator && snapshot.isDetached) branchSection.push(t.fg("warning", "⎇"));
  if (f.operationState && snapshot.operation) branchSection.push(t.fg("warning", snapshot.operation));

  const syncSection: string[] = [];
  if (f.ahead && snapshot.ahead > 0) syncSection.push(t.fg("muted", `⇡${snapshot.ahead}`));
  if (f.behind && snapshot.behind > 0) syncSection.push(t.fg("muted", `⇣${snapshot.behind}`));

  const changesSection: string[] = [];
  if (f.staged && snapshot.staged > 0) changesSection.push(t.fg("success", `+${snapshot.staged}`));
  if (f.unstaged && snapshot.unstaged > 0) changesSection.push(t.fg("warning", `✎${snapshot.unstaged}`));
  if (f.untracked && snapshot.untracked > 0) changesSection.push(t.fg("muted", `◌${snapshot.untracked}`));
  if (f.conflicted && snapshot.conflicted > 0) changesSection.push(t.fg("error", `!${snapshot.conflicted}`));

  const extraSection: string[] = [];
  if (f.stash && snapshot.stashCount > 0) extraSection.push(t.fg("muted", `⚑${snapshot.stashCount}`));
  if (f.submodules && snapshot.submoduleDirty > 0) extraSection.push(t.fg("warning", `✖${snapshot.submoduleDirty}`));
  if (f.worktrees && snapshot.worktreeCount > 1) extraSection.push(t.fg("muted", `📦${snapshot.worktreeCount}`));
  if (f.tag && snapshot.headTag) extraSection.push(t.fg("accent", `🏷${snapshot.headTag}`));
  if (f.lastCommitAge && snapshot.lastCommitAge) extraSection.push(t.fg("dim", `⏱${snapshot.lastCommitAge}`));
  if (f.signingMismatch && snapshot.signingMismatch) extraSection.push(t.fg("warning", "⚠️!"));

  const isWorkingTreeClean =
    snapshot.ahead === 0 &&
    snapshot.behind === 0 &&
    snapshot.staged === 0 &&
    snapshot.unstaged === 0 &&
    snapshot.untracked === 0 &&
    snapshot.conflicted === 0;

  if (f.clean && isWorkingTreeClean) {
    changesSection.push(t.fg("dim", "clean"));
  }

  const sections = [branchSection, syncSection, changesSection, extraSection].filter(
    (section) => section.length > 0,
  );

  return sections.length > 0
    ? sections.map((section) => section.join(` ${itemSep} `)).join(` ${sectionSep} `)
    : t.fg("dim", "git");
}

export default function gitFooterStatus(pi: ExtensionAPI) {
  let refreshing = false;
  let currentAssistantStartMs: number | null = null;
  let currentAssistantOutputChars = 0;
  let currentAssistantEstimatedOutputTokens = 0;
  let currentAssistantLiveTokenSpeed: number | null = null;
  let currentAssistantTokenSamples: LiveTokenSample[] = [];
  let latestMeasuredTokenSpeed: number | null = null;

  const recordAssistantSpeed = (message: AssistantMessage, endMs = Date.now()): boolean => {
    const outputTokens = message.usage?.output ?? 0;
    if (!outputTokens || currentAssistantStartMs === null || endMs <= currentAssistantStartMs) return false;

    const elapsedSeconds = (endMs - currentAssistantStartMs) / 1000;
    // Filter out impossible values caused by duplicate/misordered lifecycle events.
    if (elapsedSeconds < 0.05 || elapsedSeconds > 60 * 60) return false;

    const speed = outputTokens / elapsedSeconds;
    if (!isReasonableTokenSpeed(speed)) return false;

    latestMeasuredTokenSpeed = speed;
    return true;
  };

  const getRollingLiveTokenSpeed = (nowMs = Date.now()): number | null => {
    const cutoffMs = nowMs - LIVE_TOKEN_SPEED_ROLLING_WINDOW_MS;
    currentAssistantTokenSamples = currentAssistantTokenSamples.filter((sample) => sample.timestampMs >= cutoffMs);

    if (currentAssistantTokenSamples.length === 0) return null;

    const firstSampleMs = currentAssistantTokenSamples[0]?.timestampMs ?? nowMs;
    const windowStartMs = Math.max(currentAssistantStartMs ?? firstSampleMs, cutoffMs);
    const elapsedSeconds = (nowMs - windowStartMs) / 1000;
    if (elapsedSeconds <= 0) return null;

    const tokens = currentAssistantTokenSamples.reduce((sum, sample) => sum + sample.tokens, 0);
    const speed = tokens / elapsedSeconds;
    return isReasonableTokenSpeed(speed) ? speed : null;
  };

  const resetLiveAssistantState = () => {
    currentAssistantStartMs = null;
    currentAssistantOutputChars = 0;
    currentAssistantEstimatedOutputTokens = 0;
    currentAssistantLiveTokenSpeed = null;
    currentAssistantTokenSamples = [];
  };

  const refresh = async (ctx: ExtensionContext) => {
    if (refreshing) return;
    refreshing = true;

    try {
      const snapshot = await readGitSnapshot(pi, ctx.cwd);
      if (!snapshot) {
        ctx.ui.setStatus("git-footer", undefined);
        return;
      }

      ctx.ui.setStatus("git-footer", buildStatusText(ctx, snapshot));
    } finally {
      refreshing = false;
    }
  };

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          let totalInput = 0;
          let totalOutput = 0;
          let totalCacheRead = 0;
          let totalCacheWrite = 0;
          let totalCost = 0;
          const liveOutputTokens = currentAssistantStartMs !== null ? currentAssistantEstimatedOutputTokens : 0;
          let latestTokenSpeed: number | null = currentAssistantStartMs !== null ? currentAssistantLiveTokenSpeed : latestMeasuredTokenSpeed;
          let historicalTokenSpeed: number | null = null;

          const entries = ctx.sessionManager.getEntries();
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.type === "message" && entry.message.role === "assistant") {
              const message = entry.message as AssistantMessage;
              totalInput += message.usage?.input ?? 0;
              totalOutput += message.usage?.output ?? 0;
              totalCacheRead += message.usage?.cacheRead ?? 0;
              totalCacheWrite += message.usage?.cacheWrite ?? 0;
              totalCost += message.usage?.cost?.total ?? 0;

              if (latestMeasuredTokenSpeed === null && (message.usage?.output ?? 0) > 0) {
                const endMs = getEntryTimestampMs(entry);
                if (endMs !== null) {
                  let fallbackSpeed: number | null = null;

                  for (let j = i - 1; j >= 0; j--) {
                    const previous = entries[j];
                    if (previous.type !== "message") continue;

                    // Skip assistant-to-assistant deltas (too noisy for speed).
                    if (previous.message.role === "assistant") continue;

                    const startMs = getEntryTimestampMs(previous);
                    if (startMs === null || endMs <= startMs) continue;

                    const elapsedSeconds = (endMs - startMs) / 1000;
                    if (elapsedSeconds <= 0) continue;

                    const speed = (message.usage?.output ?? 0) / elapsedSeconds;
                    if (!isReasonableTokenSpeed(speed)) continue;

                    // Prefer user-anchored speed (best approximation of full turn latency).
                    if (previous.message.role === "user") {
                      historicalTokenSpeed = speed;
                      break;
                    }

                    // Keep first non-assistant speed as fallback if no user message is found.
                    if (fallbackSpeed === null) fallbackSpeed = speed;
                  }

                  if (fallbackSpeed !== null && historicalTokenSpeed === null) {
                    historicalTokenSpeed = fallbackSpeed;
                  }
                }
              }
            }
          }

          if (latestTokenSpeed === null && historicalTokenSpeed !== null) {
            latestTokenSpeed = historicalTokenSpeed;
          }

          const promptInjectionTokens = estimatePromptInjectionTokens(ctx.getSystemPrompt());

          const contextUsage = ctx.getContextUsage();
          const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextPercent = contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";
          const contextPercentDisplay =
            contextPercent === "?" ? `?/${formatTokens(contextWindow)}` : `${contextPercent}%/${formatTokens(contextWindow)}`;

          let contextPercentStr: string;
          if (contextPercent === "?") {
            contextPercentStr = theme.fg("dim", contextPercentDisplay);
          } else if (contextPercentValue < 50) {
            contextPercentStr = theme.fg("success", contextPercentDisplay);
          } else if (contextPercentValue < 65) {
            contextPercentStr = theme.fg("accent", contextPercentDisplay);
          } else if (contextPercentValue < 75) {
            contextPercentStr = theme.fg("muted", contextPercentDisplay);
          } else if (contextPercentValue < 85) {
            contextPercentStr = theme.fg("warning", contextPercentDisplay);
          } else {
            contextPercentStr = theme.fg("error", contextPercentDisplay);
          }

          const sectionSep = theme.fg("dim", "│");
          const itemSep = theme.fg("dim", "·");

          const ioItems: string[] = [];
          if (totalInput) ioItems.push(`↑${formatTokens(totalInput)}`);
          if (totalOutput) ioItems.push(`↓${formatTokens(totalOutput)}`);

          const cacheItems: string[] = [];
          if (totalCacheRead) cacheItems.push(`R${formatTokens(totalCacheRead)}`);
          if (totalCacheWrite) cacheItems.push(`W${formatTokens(totalCacheWrite)}`);

          const segments: string[] = [];
          if (ioItems.length > 0) segments.push(`${theme.fg("muted", "🪙")} ${ioItems.join(` ${itemSep} `)}`);
          if (cacheItems.length > 0) segments.push(`${theme.fg("muted", "💾")} ${cacheItems.join(` ${itemSep} `)}`);
          segments.push(`PI: ${formatTokens(promptInjectionTokens)} tok`);
          if (latestTokenSpeed !== null) {
            const livePrefix = liveOutputTokens > 0 ? `${formatTokens(liveOutputTokens)} tok @ ` : "";
            segments.push(`⚡ ${livePrefix}${formatTokenSpeed(latestTokenSpeed)} tok/s`);
          }

          const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
          if (totalCost || usingSubscription) {
            segments.push(`${theme.fg("muted", "💸")} $${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);
          }

          segments.push(`${theme.fg("muted", "🧠")} ${contextPercentStr}`);

          let statsLeft = segments.join(` ${sectionSep} `);
          let statsLeftWidth = visibleWidth(statsLeft);
          if (statsLeftWidth > width) {
            statsLeft = truncateToWidth(statsLeft, width, "...");
            statsLeftWidth = visibleWidth(statsLeft);
          }

          const modelName = ctx.model?.id || "no-model";
          const thinkingLevel = pi.getThinkingLevel();
          const rightSideWithoutProvider =
            ctx.model?.reasoning
              ? thinkingLevel === "off"
                ? `${modelName} • thinking off`
                : `${modelName} • ${thinkingLevel}`
              : modelName;

          let rightSide = rightSideWithoutProvider;
          if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
            const withProvider = `(${ctx.model.provider}) ${rightSideWithoutProvider}`;
            if (statsLeftWidth + 2 + visibleWidth(withProvider) <= width) {
              rightSide = withProvider;
            }
          }

          const rightSideWidth = visibleWidth(rightSide);
          const totalNeeded = statsLeftWidth + 2 + rightSideWidth;
          let tokenLine: string;

          if (totalNeeded <= width) {
            const padding = " ".repeat(width - statsLeftWidth - rightSideWidth);
            tokenLine = statsLeft + padding + rightSide;
          } else {
            const availableForRight = width - statsLeftWidth - 2;
            if (availableForRight > 0) {
              const truncatedRight = truncateToWidth(rightSide, availableForRight, "");
              const truncatedRightWidth = visibleWidth(truncatedRight);
              const padding = " ".repeat(Math.max(0, width - statsLeftWidth - truncatedRightWidth));
              tokenLine = statsLeft + padding + truncatedRight;
            } else {
              tokenLine = statsLeft;
            }
          }

          const branch = footerData.getGitBranch();
          const cwdWithBranch = `${formatCwd(ctx.cwd)}${branch ? ` (${branch})` : ""}`;
          const cwdText = theme.fg("muted", cwdWithBranch);

          const statuses = footerData.getExtensionStatuses();
          const gitStatus = statuses.get("git-footer");
          const otherStatuses = Array.from(statuses.entries())
            .filter(([key, value]) => key !== "git-footer" && Boolean(value))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, value]) => value as string);

          const combinedStatusParts = [gitStatus, ...otherStatuses].filter(Boolean) as string[];
          const combinedStatus = combinedStatusParts.join(` ${theme.fg("dim", "·")} `);
          const pathGitLine = combinedStatus ? `${cwdText}${theme.fg("dim", " │ ")}${combinedStatus}` : cwdText;

          // Keep default subtle-grey look even when parts contain their own ANSI colors.
          // Wrapping the whole line once is not enough because inner color resets cancel outer dim.
          const dimStatsLeft = theme.fg("dim", statsLeft);
          const remainder = tokenLine.slice(statsLeft.length);
          const dimRemainder = theme.fg("dim", remainder);

          return [truncateToWidth(dimStatsLeft + dimRemainder, width), truncateToWidth(pathGitLine, width)];
        },
      };
    });

    await refresh(ctx);
  });

  pi.on("message_start", (event) => {
    if (event.message.role === "assistant") {
      currentAssistantStartMs = Date.now();
      currentAssistantOutputChars = 0;
      currentAssistantEstimatedOutputTokens = 0;
      currentAssistantLiveTokenSpeed = null;
      currentAssistantTokenSamples = [];
    }
  });

  pi.on("message_update", (event) => {
    if (event.message.role !== "assistant" || currentAssistantStartMs === null) return;

    const streamEvent = event.assistantMessageEvent;
    if (
      streamEvent.type !== "text_delta" &&
      streamEvent.type !== "thinking_delta" &&
      streamEvent.type !== "toolcall_delta"
    ) {
      return;
    }

    const nowMs = Date.now();
    currentAssistantOutputChars += streamEvent.delta.length;

    const estimatedOutputTokens = estimateTokensFromCharCount(currentAssistantOutputChars);
    const newTokens = Math.max(0, estimatedOutputTokens - currentAssistantEstimatedOutputTokens);
    currentAssistantEstimatedOutputTokens = estimatedOutputTokens;

    if (newTokens > 0) {
      currentAssistantTokenSamples.push({ timestampMs: nowMs, tokens: newTokens });
    }

    currentAssistantLiveTokenSpeed = getRollingLiveTokenSpeed(nowMs);
  });

  pi.on("message_end", (event) => {
    if (event.message.role === "assistant") {
      if (recordAssistantSpeed(event.message as AssistantMessage)) {
        resetLiveAssistantState();
      }
    }
  });

  pi.on("turn_end", async (event, ctx) => {
    // Safety net for runtimes where message_end fires before usage is populated.
    if (event.message.role === "assistant") {
      recordAssistantSpeed(event.message as AssistantMessage);
      resetLiveAssistantState();
    }
    await refresh(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("git-footer", undefined);
    ctx.ui.setFooter(undefined);
  });

  pi.registerCommand("git-footer-refresh", {
    description: "Refresh git footer information",
    handler: async (_args, ctx) => {
      await refresh(ctx);
      ctx.ui.notify("Git footer refreshed", "info");
    },
  });

  pi.registerShortcut("ctrl+shift+g", {
    description: "Show git signing mismatch diagnostics",
    handler: async (ctx) => {
      const diagnostics = await getSigningDiagnostics(pi, ctx.cwd);
      if (!diagnostics.commitSignRequired) {
        ctx.ui.notify("Signing mismatch: commit.gpgsign is OFF", "info");
        return;
      }

      if (!["N", "E"].includes(diagnostics.signState)) {
        ctx.ui.notify("Signing mismatch: not currently triggered", "info");
        return;
      }

      ctx.ui.notify(
        `Signing mismatch details: commit.gpgsign=ON, last-sign-state=${diagnostics.signState}, gpg.format=${diagnostics.gpgFormat}, user.signingkey=${diagnostics.signingKey}`,
        "warning",
      );
    },
  });
}
