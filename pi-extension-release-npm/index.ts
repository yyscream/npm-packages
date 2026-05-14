import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RELEASE_STATUS_KEY = "release-npm";
const COLLAPSED_LINES = 40;

type RunResult = { ok: boolean; output: string; aborted: boolean };
type AbortableChild = ChildProcessWithoutNullStreams & { abortReleaseStep?: () => void };

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function releaseScriptCommand(cwd: string, scriptName: string, args: string[] = []): string {
  const localScript = join(cwd, scriptName);
  const scriptPath = existsSync(localScript) ? localScript : join(EXTENSION_DIR, scriptName);
  const quotedArgs = args.map(shellQuote).join(" ");
  return `PI_NPM_PACKAGES_ROOT=${shellQuote(cwd)} ${shellQuote(scriptPath)}${quotedArgs ? ` ${quotedArgs}` : ""}`;
}

async function runScriptLive(
  cwd: string,
  script: string,
  onChunk: (chunk: string) => void,
  onChild?: (child: AbortableChild) => void,
): Promise<RunResult> {
  return await new Promise((resolve) => {
    const child = spawn("bash", ["-lc", script], { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true }) as AbortableChild;
    let output = "";
    let aborted = false;

    child.abortReleaseStep = () => {
      aborted = true;
      try {
        if (child.pid) process.kill(-child.pid, "SIGINT");
      } catch {
        child.kill("SIGINT");
      }
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try {
            if (child.pid) process.kill(-child.pid, "SIGTERM");
          } catch {
            child.kill("SIGTERM");
          }
        }
      }, 1500).unref();
    };

    onChild?.(child);

    child.stdout.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      onChunk(chunk);
    });
    child.stderr.on("data", (d) => {
      const chunk = String(d);
      output += chunk;
      onChunk(chunk);
    });
    child.on("close", (code) => resolve({ ok: code === 0 && !aborted, output, aborted }));
  });
}

function evaluateFailureWithLLM(pi: ExtensionAPI, step: string, output: string): void {
  const trimmed = output.slice(-12000);
  pi.sendUserMessage(
    `Release step failed: ${step}. Analyze the failure and provide: (1) root cause, (2) exact fix steps, (3) safe rerun command order.\n\nFailure output:\n${trimmed}`,
    { deliverAs: "followUp" },
  );
}

function isCtrlO(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x0f" || key === "ctrl+o" || data === "\x1b[111;5u" || data === "\x1b[27;5;111~";
}

function isCtrlC(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x03" || key === "ctrl+c" || data === "\x1b[99;5u" || data === "\x1b[27;5;99~";
}

function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function extractSection(output: string, heading: string): string[] {
  const lines = stripAnsi(output).split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return [];

  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") {
      if (result.length > 0) break;
      continue;
    }
    result.push(line.trimEnd());
  }
  return result;
}

function extractVersionChanges(output: string): string[] {
  const lines = stripAnsi(output).split(/\r?\n/);
  const changes: string[] = [];
  let currentPackage = "";
  let currentVersion = "";

  for (const line of lines) {
    const pkgMatch = line.match(/^\s*- package: (.+)$/);
    if (pkgMatch) {
      currentPackage = pkgMatch[1];
      currentVersion = "";
      continue;
    }

    const versionMatch = line.match(/^\s*- local version: (.+)$/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }

    const actionMatch = line.match(/^\s*- action: (would bump up -> .+|would reduce down -> .+|no bump \(first release\)|unchanged \(.+\))$/);
    if (actionMatch && currentPackage) {
      const from = currentVersion ? ` from ${currentVersion}` : "";
      changes.push(`${currentPackage}${from}: ${actionMatch[1]}`);
    }
  }

  return changes;
}

function splitPublishPlan(output: string): { publish: string[]; skip: string[]; blocked: string[]; other: string[] } {
  const plan = extractSection(output, "Plan summary:");
  const publish: string[] = [];
  const skip: string[] = [];
  const blocked: string[] = [];
  const other: string[] = [];

  for (const raw of plan) {
    const line = raw.trim();
    const match = line.match(/^-\s+(.+?)\s+->\s+(.+)$/);
    if (!match) {
      other.push(line);
      continue;
    }

    const item = `${match[1]} -> ${match[2]}`;
    if (match[2] === "publish-first" || match[2] === "publish-update") {
      publish.push(item);
    } else if (match[2] === "skip") {
      skip.push(item);
    } else if (match[2] === "error") {
      blocked.push(item);
    } else {
      other.push(item);
    }
  }

  return { publish, skip, blocked, other };
}

function formatPreflightSummary(output: string): string {
  const versionChanges = extractVersionChanges(output);
  const bumpSummaries = stripAnsi(output)
    .split(/\r?\n/)
    .filter((line) => /^\s*- (would bump up|would reduce down|bumped up|reduced down|unchanged|first release \(no npm version\)|errors): /.test(line))
    .slice(0, 5);
  const publishPlan = splitPublishPlan(output);

  return [
    "Release preflight summary:",
    "Version changes:",
    ...(versionChanges.length ? versionChanges.map((line) => `  ${line}`) : ["  none detected"]),
    "Bump summary:",
    ...(bumpSummaries.length ? bumpSummaries.map((line) => `  ${line.trim()}`) : ["  unavailable"]),
    "Will publish:",
    ...(publishPlan.publish.length ? publishPlan.publish.map((line) => `  ${line}`) : ["  none"]),
    "Will skip:",
    ...(publishPlan.skip.length ? publishPlan.skip.map((line) => `  ${line}`) : ["  none"]),
    "Blocked:",
    ...(publishPlan.blocked.length ? publishPlan.blocked.map((line) => `  ${line}`) : ["  none"]),
    ...(publishPlan.other.length ? ["Other:", ...publishPlan.other.map((line) => `  ${line}`)] : []),
  ].join("\n");
}

const RELEASE_OUTPUT_KEY = `${RELEASE_STATUS_KEY}:output`;
const RELEASE_FOOTER_KEY = `${RELEASE_STATUS_KEY}:footer`;
const EXPANDED_LINES = 160;

let activeReleaseRun: { abort: () => void; toggleOutput: () => void } | undefined;

function truncateLine(line: string, width: number): string {
  return line.length > width ? `${line.slice(0, Math.max(0, width - 1))}…` : line;
}

export default function releaseNpmExtension(pi: ExtensionAPI) {
  pi.registerCommand("release-toggle", {
    description: "Toggle active /release-npm output between compact and expanded modes",
    handler: async (_args, ctx) => {
      if (!activeReleaseRun) {
        ctx.ui.notify("No active release output to toggle.", "warning");
        return;
      }
      activeReleaseRun.toggleOutput();
    },
  });

  pi.registerCommand("release-abort", {
    description: "Abort the active /release-npm subprocess",
    handler: async (_args, ctx) => {
      if (!activeReleaseRun) {
        ctx.ui.notify("No active release process to abort.", "warning");
        return;
      }
      activeReleaseRun.abort();
      ctx.ui.notify("Aborting release workflow...", "warning");
    },
  });

  pi.registerCommand("release-npm", {
    description: "Run npm release checks/workflow and confirm publish",
    handler: async (_args, ctx) => {
      if (activeReleaseRun) {
        ctx.ui.notify("A release workflow is already running. Use /release-toggle or /release-abort.", "warning");
        return;
      }

      void (async () => {
      let liveBuffer = "";
      let expanded = false;
      let phase = "Release preflight checks";
      let currentChild: AbortableChild | undefined;
      let unsubscribeKeys: (() => void) | undefined;

      const outputLines = () => liveBuffer.split(/\r?\n/).filter(Boolean);
      const modeText = () => {
        const total = outputLines().length;
        const shown = expanded ? Math.min(EXPANDED_LINES, total) : Math.min(COLLAPSED_LINES, total);
        return expanded ? `expanded ${shown}/${total}` : `compact ${shown}/${total}`;
      };
      const renderReleaseUi = () => {
        if (!ctx.hasUI) return;
        ctx.ui.setWidget(RELEASE_OUTPUT_KEY, (_tui, _theme) => ({
          render: (width: number) => {
            const lines = outputLines();
            const limit = expanded ? EXPANDED_LINES : COLLAPSED_LINES;
            const visibleLines = lines.slice(-limit);
            return visibleLines.length
              ? visibleLines.map((line) => truncateLine(line, width))
              : [truncateLine("Waiting for release output...", width)];
          },
          invalidate: () => {},
        }), { placement: "aboveEditor" });
        ctx.ui.setWidget(RELEASE_FOOTER_KEY, (_tui, theme) => ({
          render: (width: number) => [
            truncateLine(theme.fg("accent", phase) + theme.fg("dim", ` · ${modeText()}`), width),
            truncateLine(theme.fg("dim", "Controls: /release-toggle expands/collapses · /release-abort stops the running subprocess"), width),
          ],
          invalidate: () => {},
        }), { placement: "belowEditor" });
      };
      const setPhase = (nextPhase: string) => {
        phase = nextPhase;
        renderReleaseUi();
      };
      const abortCurrentStep = () => currentChild?.abortReleaseStep?.();
      const closeReleaseUi = () => {
        unsubscribeKeys?.();
        unsubscribeKeys = undefined;
        activeReleaseRun = undefined;
        if (ctx.hasUI) {
          ctx.ui.setWidget(RELEASE_OUTPUT_KEY, undefined);
          ctx.ui.setWidget(RELEASE_FOOTER_KEY, undefined);
          ctx.ui.setWidget(RELEASE_STATUS_KEY, undefined);
        }
      };
      const toggleOutput = () => {
        expanded = !expanded;
        renderReleaseUi();
      };
      const appendOutput = (chunk: string) => {
        liveBuffer += chunk;
        renderReleaseUi();
      };
      activeReleaseRun = { abort: abortCurrentStep, toggleOutput };

      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("accent", "Release:Checking"));
        ctx.ui.notify("Running release preflight checks. Output stays above input; controls are below input.", "info");
        renderReleaseUi();
        unsubscribeKeys = ctx.ui.onTerminalInput((data) => {
          if (isCtrlO(data)) {
            toggleOutput();
            return { consume: true };
          }
          if (isCtrlC(data)) {
            ctx.ui.notify("Aborting release workflow...", "warning");
            abortCurrentStep();
            return { consume: true };
          }
        });
      }

      const planCommand = releaseScriptCommand(ctx.cwd, "release-workflow.sh", ["--plan", "--all"]);
      ctx.ui.notify("Running release-workflow.sh --plan --all...", "info");
      const plan = await runScriptLive(ctx.cwd, planCommand, appendOutput, (child) => { currentChild = child; });
      currentChild = undefined;

      if (plan.aborted) {
        closeReleaseUi();
        ctx.ui.notify("Release workflow aborted.", "warning");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("warning", "Release:Aborted"));
        return;
      }

      if (!plan.ok) {
        ctx.ui.notify("release-workflow preflight failed; publish was not offered.", "error");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("error", "Release:Failed"));
        closeReleaseUi();
        evaluateFailureWithLLM(pi, "release-workflow.sh --plan --all", plan.output);
        return;
      }

      closeReleaseUi();
      const preflightSummary = formatPreflightSummary(plan.output);
      const choice = await ctx.ui.select(`${preflightSummary}\n\nPublish eligible packages now?`, ["Yes", "No"]);
      if (choice !== "Yes") {
        closeReleaseUi();
        if (ctx.hasUI) {
          ctx.ui.setWidget(RELEASE_STATUS_KEY, undefined);
          ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("warning", "Release:Cancelled"));
        }
        ctx.ui.notify("Publish cancelled after successful preflight checks.", "info");
        return;
      }

      liveBuffer = "";
      expanded = false;
      activeReleaseRun = { abort: abortCurrentStep, toggleOutput };
      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("accent", "Release:Publishing"));
        ctx.ui.notify("Starting publish workflow. Output stays above input; controls are below input.", "info");
        setPhase("Release publishing");
      }

      const publishCommand = releaseScriptCommand(ctx.cwd, "release-workflow.sh", ["--publish", "--all"]);
      ctx.ui.notify("Running release-workflow.sh --publish --all...", "info");
      const updated: string[] = [];
      const skipped: string[] = [];
      const firstRelease: string[] = [];
      const failed: Array<{ pkg: string; reason: string }> = [];
      const publishActions = new Map<string, "publish-first" | "publish-update">();

      const rememberUnique = (items: string[], item: string) => {
        if (!items.includes(item)) items.push(item);
      };

      const parsePublishOutput = (output: string) => {
        const linesNow = stripAnsi(output).split(/\r?\n/).filter(Boolean);
        for (const line of linesNow) {
          const mEvent = line.match(/^RELEASE_NPM_EVENT\s+(\{.*\})$/);
          if (mEvent) {
            try {
              const event = JSON.parse(mEvent[1]) as { status?: string; name?: string; version?: string; action?: string; detail?: string };
              if (event.name && event.version) {
                const pkg = `${event.name}@${event.version}`;
                if (event.status === "published" && event.action === "publish-first") {
                  rememberUnique(firstRelease, pkg);
                } else if (event.status === "published") {
                  rememberUnique(updated, pkg);
                } else if (event.status === "skipped") {
                  rememberUnique(skipped, pkg);
                } else if (event.status === "failed") {
                  const reason = event.detail || event.action || "unknown";
                  if (!failed.some((f) => f.pkg === pkg && f.reason === reason)) failed.push({ pkg, reason });
                }
              }
            } catch {
              // Keep regex fallback below for older script output.
            }
            continue;
          }

          const mPublishing = line.match(/Publishing\s+((?:@[^\s/]+\/)?[^\s@]+)@([^\s]+)\s+\((publish-first|publish-update)\)/);
          if (mPublishing) {
            publishActions.set(`${mPublishing[1]}@${mPublishing[2]}`, mPublishing[3] as "publish-first" | "publish-update");
            continue;
          }

          const mPublished = line.match(/PASS\s+Published\s+((?:@[^\s/]+\/)?[^\s@]+)@([^\s]+)/);
          if (mPublished) {
            const name = `${mPublished[1]}@${mPublished[2]}`;
            const action = publishActions.get(name);
            if (action === "publish-first") {
              rememberUnique(firstRelease, name);
            } else {
              rememberUnique(updated, name);
            }
            continue;
          }

          const mSkipped = line.match(/INFO\s+Skipping\s+((?:@[^\s/]+\/)?[^\s@]+)@([^\s]+)\s+\(already published\)/);
          if (mSkipped) {
            rememberUnique(skipped, `${mSkipped[1]}@${mSkipped[2]}`);
            continue;
          }

          const mCheckFailed = line.match(/FAIL\s+Skipping\s+((?:@[^\s/]+\/)?[^\s@]+)@([^\s]+)\s+\(([^)]+)\)/);
          if (mCheckFailed) {
            const pkg = `${mCheckFailed[1]}@${mCheckFailed[2]}`;
            const reason = mCheckFailed[3].trim();
            if (!failed.some((f) => f.pkg === pkg && f.reason === reason)) failed.push({ pkg, reason });
            continue;
          }

          const mFailedPublish = line.match(/FAIL\s+Failed to publish\s+((?:@[^\s/]+\/)?[^\s@]+)@([^\s]+)\s+(.+)/);
          if (mFailedPublish) {
            const pkg = `${mFailedPublish[1]}@${mFailedPublish[2]}`;
            const reason = mFailedPublish[3].trim();
            if (!failed.some((f) => f.pkg === pkg && f.reason === reason)) failed.push({ pkg, reason });
          }
        }
      };

      const formatReleaseSummary = () => [
        "Release summary:",
        "Published:",
        `  - First publish: ${firstRelease.length ? firstRelease.join(", ") : "none"}`,
        `  - Updated: ${updated.length ? updated.join(", ") : "none"}`,
        "Skipped:",
        `  - Already published: ${skipped.length ? skipped.join(", ") : "none"}`,
        "Failed:",
        `  - ${failed.length ? failed.map((f) => `${f.pkg}: ${f.reason}`).join(" | ") : "none"}`,
      ].join("\n");

      const publish = await runScriptLive(ctx.cwd, publishCommand, (chunk) => {
        appendOutput(chunk);
        parsePublishOutput(liveBuffer);
      }, (child) => { currentChild = child; });
      currentChild = undefined;

      if (publish.aborted) {
        closeReleaseUi();
        ctx.ui.notify("Release workflow aborted.", "warning");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("warning", "Release:Aborted"));
        return;
      }

      if (!publish.ok) {
        ctx.ui.notify("release-workflow publish step failed.", "error");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("error", "Release:Failed"));
        closeReleaseUi();
        evaluateFailureWithLLM(pi, "release-workflow.sh --publish --all", publish.output);
        return;
      }

      parsePublishOutput(publish.output);

      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("success", "Release:OK"));
        ctx.ui.setWidget(RELEASE_STATUS_KEY, undefined);
      }
      closeReleaseUi();
      ctx.ui.notify(`${formatReleaseSummary()}\nRelease flow completed successfully.`, "success");
      })().catch((error: unknown) => {
        activeReleaseRun = undefined;
        if (ctx.hasUI) {
          ctx.ui.setWidget(RELEASE_OUTPUT_KEY, undefined);
          ctx.ui.setWidget(RELEASE_FOOTER_KEY, undefined);
          ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("error", "Release:Failed"));
        }
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Release workflow crashed: ${message}`, "error");
      });
    },
  });
}
