import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const RELEASE_STATUS_KEY = "release-npm";
const COLLAPSED_LINES = 40;

type RunResult = { ok: boolean; output: string; aborted: boolean };
type AbortableChild = ChildProcessWithoutNullStreams & { abortReleaseStep?: () => void };

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

function isAlreadyPublishedInfo(output: string): boolean {
  const normalized = output.toLowerCase();
  return normalized.includes("version already published") && normalized.includes("failure reasons");
}

function isCtrlO(data: string): boolean {
  return data === "\x0f" || data.toLowerCase() === "ctrl+o";
}

function isCtrlC(data: string): boolean {
  return data === "\x03" || data.toLowerCase() === "ctrl+c";
}

function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

export default function releaseNpmExtension(pi: ExtensionAPI) {
  pi.registerCommand("release-npm", {
    description: "Run npm release checks/workflow and confirm publish",
    handler: async (_args, ctx) => {
      const steps = ["./check-publish-readiness.sh", "./release-workflow.sh --check --all"];
      let liveBuffer = "";
      let expanded = false;
      let currentChild: AbortableChild | undefined;
      let unsubscribeKeys: (() => void) | undefined;

      const renderReleaseWidget = () => {
        if (!ctx.hasUI) return;
        ctx.ui.setWidget(RELEASE_STATUS_KEY, (_tui, theme) => ({
          render: (width: number) => {
            const lines = liveBuffer.split(/\r?\n/).filter(Boolean);
            const visibleLines = expanded ? lines : lines.slice(-COLLAPSED_LINES);
            const hint = lines.length > COLLAPSED_LINES
              ? theme.fg("dim", expanded ? "Release output expanded (Ctrl+O collapse, Ctrl+C abort)" : `Release output truncated (${COLLAPSED_LINES}/${lines.length} lines, Ctrl+O expand, Ctrl+C abort)`)
              : theme.fg("dim", "Ctrl+C abort");
            return [...visibleLines, hint].map((line) => line.length > width ? `${line.slice(0, Math.max(0, width - 1))}…` : line);
          },
          invalidate: () => {},
        }));
      };

      const abortCurrentStep = () => currentChild?.abortReleaseStep?.();
      const cleanupKeys = () => {
        unsubscribeKeys?.();
        unsubscribeKeys = undefined;
      };

      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("accent", "Release:Running"));
        ctx.ui.notify("Starting release workflow (Ctrl+O expand, Ctrl+C abort)", "info");
        unsubscribeKeys = ctx.ui.onTerminalInput((data) => {
          if (isCtrlO(data)) {
            expanded = !expanded;
            renderReleaseWidget();
            return { consume: true };
          }
          if (isCtrlC(data)) {
            ctx.ui.notify("Aborting release workflow...", "warning");
            abortCurrentStep();
            return { consume: true };
          }
        });
      }

      for (const step of steps) {
        ctx.ui.notify(`Running ${step}...`, "info");
        const result = await runScriptLive(ctx.cwd, step, (chunk) => {
          liveBuffer += chunk;
          renderReleaseWidget();
        }, (child) => { currentChild = child; });
        currentChild = undefined;

        if (result.aborted) {
          cleanupKeys();
          ctx.ui.notify("Release workflow aborted.", "warning");
          if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("warning", "Release:Aborted"));
          return;
        }

        if (!result.ok) {
          if (isAlreadyPublishedInfo(result.output)) {
            ctx.ui.notify(`${step}: versions already published (info only), continuing.`, "info");
            continue;
          }

          ctx.ui.notify(`${step} failed. Stopping release flow.`, "error");
          if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("error", "Release:Failed"));
          cleanupKeys();
          evaluateFailureWithLLM(pi, step, result.output);
          return;
        }
      }

      const choice = await ctx.ui.select("Publish packages now?", ["Yes", "No"]);
      if (choice !== "Yes") {
        cleanupKeys();
        ctx.ui.notify("Publish cancelled.", "info");
        return;
      }

      ctx.ui.notify("Running ./release-workflow.sh --publish --all...", "info");
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
        `- First publish: ${firstRelease.length ? firstRelease.join(", ") : "none"}`,
        `- Updated: ${updated.length ? updated.join(", ") : "none"}`,
        `- Already published: ${skipped.length ? skipped.join(", ") : "none"}`,
        `- Failed: ${failed.length ? failed.map((f) => `${f.pkg}: ${f.reason}`).join(" | ") : "none"}`,
      ].join("\n");

      const publish = await runScriptLive(ctx.cwd, "./release-workflow.sh --publish --all", (chunk) => {
        liveBuffer += chunk;
        parsePublishOutput(liveBuffer);
        renderReleaseWidget();
      }, (child) => { currentChild = child; });
      currentChild = undefined;

      if (publish.aborted) {
        cleanupKeys();
        ctx.ui.notify("Release workflow aborted.", "warning");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("warning", "Release:Aborted"));
        return;
      }

      if (!publish.ok) {
        ctx.ui.notify("release-workflow publish step failed.", "error");
        if (ctx.hasUI) ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("error", "Release:Failed"));
        cleanupKeys();
        evaluateFailureWithLLM(pi, "./release-workflow.sh --publish --all", publish.output);
        return;
      }

      parsePublishOutput(publish.output);

      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("success", "Release:OK"));
        ctx.ui.setWidget(RELEASE_STATUS_KEY, undefined);
      }
      cleanupKeys();
      ctx.ui.notify(`${formatReleaseSummary()}\nRelease flow completed successfully.`, "success");
    },
  });
}
