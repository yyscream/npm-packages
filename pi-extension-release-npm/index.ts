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

      const publish = await runScriptLive(ctx.cwd, "./release-workflow.sh --publish --all", (chunk) => {
        liveBuffer += chunk;

        const linesNow = liveBuffer.split(/\r?\n/).filter(Boolean);
        for (const line of linesNow.slice(-120)) {
          const mUpdated = line.match(/PASS\s+Published\s+(@[^\s]+)@([^\s]+)/);
          if (mUpdated) {
            const name = `${mUpdated[1]}@${mUpdated[2]}`;
            if (!updated.includes(name)) updated.push(name);
          }

          const mSkipped = line.match(/INFO\s+Skipping\s+(@[^\s]+)@([^\s]+)\s+\(already published\)/);
          if (mSkipped) {
            const name = `${mSkipped[1]}@${mSkipped[2]}`;
            if (!skipped.includes(name)) skipped.push(name);
          }

          const mFirst = line.match(/Publishing\s+(@[^\s]+)@([^\s]+)\s+\(publish-new\)/);
          if (mFirst) {
            const name = `${mFirst[1]}@${mFirst[2]}`;
            if (!firstRelease.includes(name)) firstRelease.push(name);
          }

          const mFailed = line.match(/FAIL\s+([^\n]+)/);
          if (mFailed) {
            const reason = mFailed[1].trim();
            if (!failed.some((f) => f.reason === reason)) failed.push({ pkg: "unknown", reason });
          }
        }

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

      const summaryLines: string[] = [
        "Release summary:",
        `- Updated: ${updated.length ? updated.join(", ") : "none"}`,
        `- Skipped: ${skipped.length ? skipped.join(", ") : "none"}`,
        `- First release: ${firstRelease.length ? firstRelease.join(", ") : "none"}`,
        `- Failed: ${failed.length ? failed.map((f) => `${f.pkg}: ${f.reason}`).join(" | ") : "none"}`,
      ];
      for (const line of summaryLines) ctx.ui.notify(line, "info");

      if (ctx.hasUI) {
        ctx.ui.setStatus(RELEASE_STATUS_KEY, ctx.ui.theme.fg("success", "Release:OK"));
        ctx.ui.setWidget(RELEASE_STATUS_KEY, undefined);
      }
      cleanupKeys();
      ctx.ui.notify("Release flow completed successfully.", "success");
    },
  });
}
