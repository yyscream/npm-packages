import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { WorkflowLoadError, errorMessage } from "./src/errors.ts";
import { findWorkflowSource, formatWorkflowList, loadWorkflowRegistry } from "./src/loader.ts";
import { runWorkflow } from "./src/runner.ts";
import { createWorkflowStateStore } from "./src/state.ts";
import { createSubprocessTaskRunner } from "./src/task-runner.ts";
import type { WorkflowInput, WorkflowRun, WorkflowSource } from "./src/types.ts";
import { clearWorkflowUI, notifyWorkflow, renderWorkflowRun, type WorkflowUIContext } from "./src/ui.ts";
import { parseJsonObject, splitFirstToken } from "./src/utils.ts";

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));

function projectTrusted(ctx: unknown): boolean {
  const maybe = ctx as { isProjectTrusted?: () => boolean };
  try {
    return Boolean(maybe.isProjectTrusted?.());
  } catch {
    return false;
  }
}

async function loadSources(ctx: { cwd: string } & WorkflowUIContext): Promise<WorkflowSource[]> {
  return await loadWorkflowRegistry({
    cwd: ctx.cwd,
    extensionDir: EXTENSION_DIR,
    includeProject: true,
    projectTrusted: projectTrusted(ctx),
  });
}

function formatRunStatus(run: WorkflowRun | undefined): string {
  if (!run) return "No workflow run has been recorded in this session.";
  const taskCount = run.phases.reduce((total, phase) => total + phase.tasks.length, 0);
  const done = run.phases.reduce((total, phase) => total + phase.tasks.filter((task) => task.status === "completed").length, 0);
  const failed = run.phases.reduce((total, phase) => total + phase.tasks.filter((task) => task.status === "failed").length, 0);
  return [
    `Workflow: ${run.workflowKey}`,
    `Run: ${run.runId}`,
    `Status: ${run.status}`,
    `Tasks: ${done}/${taskCount} completed${failed ? `, ${failed} failed` : ""}`,
    run.sourcePath ? `Source: ${run.sourcePath}` : undefined,
    run.error ? `Error: ${run.error}` : undefined,
  ].filter(Boolean).join("\n");
}

function helpText(): string {
  return [
    "Usage:",
    "  /workflow list",
    "  /workflow status",
    "  /workflow run <workflow-key> [json-input]",
    "  /workflow <workflow-key> [json-input]",
    "  /workflow abort",
    "",
    "Example:",
    '  /workflow run deep-research-minimal {"topic":"Pi workflow extensions"}',
  ].join("\n");
}

function normalizeInput(value: unknown): WorkflowInput {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("workflow input must be a JSON object.");
  }
  return value as WorkflowInput;
}

export default function workflowExtension(pi: ExtensionAPI) {
  const state = createWorkflowStateStore(pi);
  const taskRunner = createSubprocessTaskRunner();
  let activeAbortController: AbortController | undefined;

  const startRun = async (
    key: string,
    input: WorkflowInput,
    ctx: { cwd: string } & WorkflowUIContext,
  ): Promise<WorkflowRun> => {
    if (state.getActiveRun()) throw new Error("A workflow run is already active. Use /workflow abort first.");

    const sources = await loadSources(ctx);
    const source = findWorkflowSource(sources, key);
    if (!source) {
      const available = sources.map((candidate) => candidate.definition.key).join(", ") || "none";
      throw new Error(`Unknown workflow '${key}'. Available workflows: ${available}.`);
    }

    notifyWorkflow(ctx, `Starting workflow ${source.definition.key} from ${source.path}`, "info");
    activeAbortController = new AbortController();
    try {
      const run = await runWorkflow(source, input, ctx, {
        cwd: ctx.cwd,
        taskRunner,
        state,
        signal: activeAbortController.signal,
      });
      if (run.status === "completed") notifyWorkflow(ctx, `Workflow completed: ${run.workflowKey}`, "success");
      else if (run.status === "cancelled") notifyWorkflow(ctx, `Workflow cancelled: ${run.workflowKey}`, "warning");
      else notifyWorkflow(ctx, `Workflow failed: ${run.workflowKey}`, "error");
      return run;
    } finally {
      activeAbortController = undefined;
    }
  };

  pi.registerCommand("workflow", {
    description: "Run minimal modular Pi workflows",
    handler: async (args, ctx) => {
      const { token: actionOrKey, rest } = splitFirstToken(args);
      const action = actionOrKey || "help";

      try {
        if (action === "help" || action === "--help" || action === "-h") {
          ctx.ui.notify(helpText(), "info");
          return;
        }

        if (action === "list") {
          const sources = await loadSources(ctx);
          ctx.ui.notify(formatWorkflowList(sources), "info");
          return;
        }

        if (action === "status") {
          const run = state.getActiveRun() ?? state.getLastRun();
          renderWorkflowRun(ctx, run);
          ctx.ui.notify(formatRunStatus(run), "info");
          return;
        }

        if (action === "abort") {
          const run = state.getActiveRun();
          if (!run || !activeAbortController) {
            ctx.ui.notify("No active workflow run to abort.", "info");
            return;
          }
          activeAbortController.abort();
          ctx.ui.notify(`Abort requested for workflow ${run.workflowKey}.`, "warning");
          return;
        }

        const runRequest = action === "run" ? splitFirstToken(rest) : { token: action, rest };
        if (!runRequest.token) {
          ctx.ui.notify(helpText(), "warning");
          return;
        }

        const input = parseJsonObject(runRequest.rest);
        await startRun(runRequest.token, input, ctx);
      } catch (error) {
        const message = error instanceof WorkflowLoadError ? error.issues.join("\n") : errorMessage(error);
        ctx.ui.notify(message, "error");
      }
    },
  });

  pi.registerTool({
    name: "workflow_run",
    label: "Run Workflow",
    description: "Run a configured Pi workflow by key with explicit confirmation.",
    parameters: Type.Object({
      key: Type.String({ description: "Workflow key, for example deep-research-minimal." }),
      input: Type.Optional(Type.Any({ description: "Workflow input JSON object." })),
      confirmRun: Type.Boolean({ description: "Must be true only when the user explicitly requested workflow execution." }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!params.confirmRun) {
        throw new Error("Blocked: confirmRun must be true with explicit user intent.");
      }
      const input = normalizeInput(params.input);
      const run = await startRun(params.key, input, ctx);
      return {
        content: [{ type: "text", text: formatRunStatus(run) }],
        details: run,
      };
    },
  });

  pi.registerTool({
    name: "workflow_status",
    label: "Workflow Status",
    description: "Inspect the active or latest Pi workflow run in this session.",
    parameters: Type.Object({}),
    async execute() {
      const run = state.getActiveRun() ?? state.getLastRun();
      return {
        content: [{ type: "text", text: formatRunStatus(run) }],
        details: run ?? null,
      };
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager?.getEntries?.() ?? [];
    const restored = state.restoreFromEntries(entries as never);
    if (restored && (restored.status === "running" || restored.status === "queued")) {
      notifyWorkflow(ctx, `Previous workflow run ${restored.runId} was still marked ${restored.status}; v0 does not resume runs.`, "warning");
    }
    renderWorkflowRun(ctx, restored);
  });

  pi.on("session_shutdown", async () => {
    activeAbortController?.abort();
    activeAbortController = undefined;
  });

  pi.registerCommand("workflow-clear", {
    description: "Clear workflow status UI",
    handler: async (_args, ctx) => {
      clearWorkflowUI(ctx);
      ctx.ui.notify("Workflow UI cleared.", "info");
    },
  });
}
