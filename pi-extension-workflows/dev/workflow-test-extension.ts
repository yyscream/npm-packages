import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { errorMessage } from "../src/errors.ts";
import { createWorkflowStateStore } from "../src/state.ts";
import { createSubprocessTaskRunner } from "../src/task-runner.ts";
import { formatWorkflowSelfTestReport, runWorkflowSelfTest } from "./workflow-test.ts";

const DEV_DIR = dirname(fileURLToPath(import.meta.url));
const EXTENSION_DIR = join(DEV_DIR, "..");

function parseWorkflowTestArgs(args: string): { mode: "deterministic" | "real"; keepTarget: boolean; confirmReal: boolean } {
  const tokens = args.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  return {
    mode: tokens.includes("--real") || tokens.includes("real") ? "real" : "deterministic",
    keepTarget: tokens.includes("--keep") || tokens.includes("keep"),
    confirmReal: tokens.includes("--confirm-real") || tokens.includes("--yes") || tokens.includes("yes"),
  };
}

export default function workflowTestDevExtension(pi: ExtensionAPI) {
  const state = createWorkflowStateStore(pi);
  const taskRunner = createSubprocessTaskRunner();
  let activeAbortController: AbortController | undefined;

  pi.registerCommand("workflow-test", {
    description: "Local-only: run an isolated workflow runtime self-test and verify the output",
    handler: async (args, ctx) => {
      if (state.getActiveRun()) {
        ctx.ui.notify("A workflow self-test run is already active.", "warning");
        return;
      }

      const options = parseWorkflowTestArgs(args);
      if (options.mode === "real" && !options.confirmReal) {
        const ui = ctx.ui as typeof ctx.ui & { confirm?: (title: string, message?: string) => Promise<boolean> };
        if (ctx.hasUI && typeof ui.confirm === "function") {
          const ok = await ui.confirm(
            "Run real workflow self-test?",
            "This creates an isolated temp target and runs the workflow through real Pi subprocess agents. It may use model/tool budget.",
          );
          if (!ok) {
            ctx.ui.notify("Real workflow self-test cancelled. Run /workflow-test for deterministic no-cost mode.", "info");
            return;
          }
        } else {
          ctx.ui.notify("Real workflow self-test requires --confirm-real in non-interactive mode.", "warning");
          return;
        }
      }

      activeAbortController = new AbortController();
      ctx.ui.notify(
        options.mode === "real"
          ? "Starting real workflow self-test in an isolated temp target..."
          : "Starting deterministic workflow self-test in an isolated temp target...",
        "info",
      );

      try {
        const result = await runWorkflowSelfTest({
          extensionDir: EXTENSION_DIR,
          parentCwd: ctx.cwd,
          ctx,
          state,
          realTaskRunner: taskRunner,
          signal: activeAbortController.signal,
          mode: options.mode,
          keepTarget: options.keepTarget,
        });
        const report = formatWorkflowSelfTestReport(result);
        ctx.ui.notify(report, result.verdict === "PASS" ? "success" : "error");
      } catch (error) {
        ctx.ui.notify(`Workflow self-test failed: ${errorMessage(error)}`, "error");
      } finally {
        activeAbortController = undefined;
      }
    },
  });

  pi.on("session_shutdown", async () => {
    activeAbortController?.abort();
    activeAbortController = undefined;
  });
}
