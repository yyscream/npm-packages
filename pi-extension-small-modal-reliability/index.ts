import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  CUSTOM_STATE_TYPE,
  DEFAULT_CONFIG,
  MAX_ERRORS,
  MAX_FACTS,
  MAX_HISTORY,
  PLAN_MODE_CUSTOM_STATE_TYPE,
  StepStatusSchema,
  TaskStatusSchema,
  VerificationStatusSchema,
  addOrUpdateVerification,
  addUniqueBounded,
  archiveTask,
  assistantHasToolCall,
  assistantText,
  buildCompletionGatePrompt,
  buildContextHeader,
  computeVerification,
  contentToText,
  createTaskState,
  evaluateCompletionGate,
  explicitVerificationFor,
  formatEvaluationReport,
  formatStatus,
  formatTaskSummaries,
  formatVerification,
  getStep,
  isTaskArchived,
  listTaskStates,
  loadTaskState,
  markTaskCompleteIfVerified,
  mergeVerificationEvidence,
  normalizeConfig,
  normalizeContextMode,
  normalizeProfile,
  normalizeSupervisionMode,
  nowIso,
  persistExtensionState,
  persistedPlanModePointerFromSession,
  planModePointer,
  persistedPointerFromSession,
  pushBounded,
  readProjectConfig,
  recordToolCall,
  replacePlan,
  resolveTaskQuery,
  runOfflineReliabilityEvaluation,
  savePlanModeRun,
  saveTaskState,
  scratchpadPathFor,
  selectNextStep,
  setScratchpadWritesEnabled,
  setStepStatus,
  shouldBlockRepeat,
  stableStringify,
  summarizeToolResult,
  suggestVerificationCommands,
  taskDir,
  toolHistoryForHash,
  truncate,
  updatePlanModeUi,
  updateToolResult,
  updateUi,
  writeEvaluationReport,
  writeScratchpad,
  hashToolCall,
  buildPlanModePhasePrompt,
  createPlanModeRun,
  formatPlanModeStatus,
  loadPlanModeRun,
  nextPlanModePhaseAfterAgent,
  persistPlanModePointer,
} from "./src/core.ts";
import { buildDryRunOrchestration, formatOrchestrationResult, runSeparateModelOrchestration } from "./src/orchestration.ts";
import { applyWorkerResult, buildSupervisorDecision, buildWorkerContractPrompt } from "./src/supervisor.ts";
import type { SupervisorDecision, WorkerResultInput } from "./src/supervisor.ts";
import type {
  ContextSnapshot,
  ReliabilityConfig,
  ReliabilitySupervisionMode,
  StepStatus,
  TaskStatus,
  TaskState,
  PlanModeRun,
  ToolHistoryItem,
  VerificationStatus,
} from "./src/core.ts";

export default function reliabilityHarnessExtension(pi: ExtensionAPI): void {
  let config: ReliabilityConfig = { ...DEFAULT_CONFIG };
  let enabled = false;
  let activeTask: TaskState | undefined;
  let activeSupervisionMode: Extract<ReliabilitySupervisionMode, "lite" | "supervised"> = "lite";
  const completionGatePromptedTaskIds = new Set<string>();
  const contextSnapshots = new Map<string, ContextSnapshot>();
  const supervisorDecisions = new Map<string, SupervisorDecision>();
  let planModeArmed = false;
  let activePlanModeRun: PlanModeRun | undefined;
  let planModeContinuationQueued = false;

  const ensureTask = (ctx: ExtensionContext, prompt: string): TaskState => {
    if (!activeTask || activeTask.status === "complete" || activeTask.status === "failed") {
      activeTask = createTaskState(ctx.cwd, prompt, ctx.sessionManager.getSessionFile(), config);
      saveTaskState(activeTask, "task_created");
      persistExtensionState(pi, enabled, activeTask);
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      return activeTask;
    }

    addUniqueBounded(activeTask.known_facts, `User update: ${truncate(prompt, 240)}`, MAX_FACTS);
    saveTaskState(activeTask, "user_update_recorded");
    return activeTask;
  };

  const runtimeConfig = (): ReliabilityConfig => ({ ...config, supervisionMode: activeSupervisionMode });

  const taskLooksLongOrMultiStep = (prompt: string): boolean => {
    const words = prompt.trim().split(/\s+/).filter(Boolean).length;
    const lines = prompt.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const bulletLines = lines.filter((line) => /^\s*[-*\d.)]+\s+/.test(line)).length;
    return words >= 90
      || lines.length >= 5
      || bulletLines >= 2
      || /\b(refactor|migrate|architecture|multi[- ]step|long[- ]running|investigate|debug|fix failing|test suite|implement feature|several|multiple)\b/i.test(prompt);
  };

  const chooseSupervisionMode = (state: TaskState | undefined, prompt = ""): Extract<ReliabilitySupervisionMode, "lite" | "supervised"> => {
    if (config.supervisionMode === "lite") return "lite";
    if (config.supervisionMode === "supervised" || config.profile === "strict") return "supervised";
    if (state?.errors.length || state?.loop_warnings.length || state?.status === "blocked" || state?.status === "failed") return "supervised";
    if (prompt && taskLooksLongOrMultiStep(prompt)) return "supervised";
    return activeSupervisionMode === "supervised" ? "supervised" : "lite";
  };

  const setSupervisionModeForTask = (state: TaskState | undefined, prompt = ""): void => {
    activeSupervisionMode = chooseSupervisionMode(state, prompt);
  };

  const escalateSupervision = (ctx: ExtensionContext, state: TaskState, reason: string): void => {
    if (config.supervisionMode === "lite" || activeSupervisionMode === "supervised") return;
    activeSupervisionMode = "supervised";
    addUniqueBounded(state.decisions, `Escalated to supervised reliability mode: ${truncate(reason, 220)}`, MAX_FACTS);
    updateUi(ctx, enabled, state, runtimeConfig());
  };

  const refreshSupervisorDecision = (state: TaskState): SupervisorDecision => {
    const decision = buildSupervisorDecision(state, runtimeConfig());
    supervisorDecisions.set(state.task_id, decision);
    return decision;
  };

  const isVerificationOrReportStep = (state: TaskState, stepId: string): boolean => {
    const step = getStep(state, stepId);
    const title = step?.title.toLowerCase() ?? "";
    return title.includes("verify") || title.includes("verification") || title.includes("report") || stepId === "S3" || stepId === "S4";
  };

  const assertVerificationAllowsCompletion = (state: TaskState, stepId: string): void => {
    if (!config.requireVerification || !isVerificationOrReportStep(state, stepId)) return;
    const verification = computeVerification(state);
    const failed = verification.filter((item) => item.status === "failed").length;
    const unknown = verification.filter((item) => item.status === "unknown").length;
    if (failed === 0 && unknown === 0) return;
    const message = `Cannot mark ${stepId} complete while ${failed} failed and ${unknown} unknown verification criteria remain. Call reliability_verify_completion with explicit evidence first, or submit status "blocked".`;
    addUniqueBounded(state.open_questions, message, MAX_FACTS);
    pushBounded(state.errors, message, MAX_ERRORS);
    saveTaskState(state, "verification_gate_blocked_worker_completion");
    const criteria = verification.filter((item) => item.status !== "passed").map((item) => `- ${item.criterion}`).join("\n");
    throw new Error(criteria ? `${message}\nUnresolved criteria:\n${criteria}` : message);
  };

  const persistPlanModeState = (): void => {
    persistPlanModePointer(pi, activePlanModeRun, planModeArmed);
  };

  const refreshAllUi = (ctx: ExtensionContext): void => {
    updateUi(ctx, enabled, activeTask, runtimeConfig());
    updatePlanModeUi(ctx, activePlanModeRun, planModeArmed);
  };

  const stopPlanMode = (ctx: ExtensionContext, reason = "disabled"): void => {
    planModeArmed = false;
    planModeContinuationQueued = false;
    if (activePlanModeRun) {
      activePlanModeRun.enabled = false;
      activePlanModeRun.phase = reason === "complete" ? "complete" : "stopped";
      activePlanModeRun.last_issue = reason;
      savePlanModeRun(activePlanModeRun);
    }
    persistPlanModeState();
    updatePlanModeUi(ctx, activePlanModeRun, false);
    if (reason !== "complete") activePlanModeRun = undefined;
  };

  const appendPlanModeSessionState = (sessionManager: { appendCustomEntry: (customType: string, data?: unknown) => string }, run: PlanModeRun): void => {
    sessionManager.appendCustomEntry(CUSTOM_STATE_TYPE, {
      enabled: true,
      taskId: run.task_id,
      taskDir: taskDir(run.cwd, run.task_id),
      updatedAt: nowIso(),
    });
    sessionManager.appendCustomEntry(PLAN_MODE_CUSTOM_STATE_TYPE, planModePointer(run, false));
  };

  const launchPlanModePhase = async (ctx: ExtensionCommandContext, run: PlanModeRun): Promise<void> => {
    savePlanModeRun(run);
    persistExtensionState(pi, true, activeTask);
    persistPlanModeState();
    const prompt = buildPlanModePhasePrompt(run);
    const parentSession = ctx.sessionManager.getSessionFile();
    await ctx.waitForIdle();
    const result = await ctx.newSession({
      parentSession,
      setup: async (sessionManager) => {
        appendPlanModeSessionState(sessionManager, run);
      },
      withSession: async (nextCtx) => {
        await nextCtx.sendUserMessage(prompt);
      },
    });
    if (result.cancelled) {
      run.last_issue = "New session creation was cancelled.";
      savePlanModeRun(run);
      persistPlanModeState();
    }
  };

  const startPlanModeForGoal = async (ctx: ExtensionCommandContext, goal: string): Promise<void> => {
    enabled = true;
    activeTask = createTaskState(ctx.cwd, goal, ctx.sessionManager.getSessionFile(), config);
    activeSupervisionMode = "supervised";
    saveTaskState(activeTask, "plan_mode_task_created");
    activePlanModeRun = createPlanModeRun(activeTask);
    planModeArmed = false;
    planModeContinuationQueued = false;
    persistExtensionState(pi, enabled, activeTask);
    persistPlanModeState();
    refreshAllUi(ctx);
    ctx.ui.notify(`Reliability plan mode started for task ${activeTask.task_id}. Launching exploration in a fresh session.`, "success");
    await launchPlanModePhase(ctx, activePlanModeRun);
  };

  const continuePlanMode = async (ctx: ExtensionCommandContext, runId?: string): Promise<void> => {
    planModeContinuationQueued = false;
    if (!activePlanModeRun && activeTask) activePlanModeRun = loadPlanModeRun(ctx.cwd, activeTask.task_id);
    if (!activePlanModeRun || (runId && activePlanModeRun.run_id !== runId)) {
      ctx.ui.notify("No matching active reliability plan-mode run.", "warning");
      return;
    }
    if (!activePlanModeRun.enabled) {
      ctx.ui.notify(formatPlanModeStatus(activePlanModeRun, planModeArmed), "info");
      return;
    }
    activePlanModeRun.iteration += 1;
    if (activePlanModeRun.iteration > activePlanModeRun.max_iterations) {
      activePlanModeRun.enabled = false;
      activePlanModeRun.phase = "stopped";
      activePlanModeRun.last_issue = `Stopped after ${activePlanModeRun.max_iterations} plan-mode iterations to avoid an uncontrolled loop.`;
      savePlanModeRun(activePlanModeRun);
      persistPlanModeState();
      updatePlanModeUi(ctx, activePlanModeRun, false);
      ctx.ui.notify(activePlanModeRun.last_issue, "error");
      return;
    }

    const decision = nextPlanModePhaseAfterAgent(activePlanModeRun);
    activePlanModeRun.phase = decision.phase;
    activePlanModeRun.last_issue = decision.issue;
    savePlanModeRun(activePlanModeRun);
    persistPlanModeState();
    updatePlanModeUi(ctx, activePlanModeRun, false);

    if (decision.complete || activePlanModeRun.phase === "complete") {
      stopPlanMode(ctx, "complete");
      ctx.ui.notify(`Reliability plan mode complete.\n${formatPlanModeStatus(activePlanModeRun, false)}`, "success");
      return;
    }

    await launchPlanModePhase(ctx, activePlanModeRun);
  };

  const queuePlanModeContinuation = (): void => {
    if (!activePlanModeRun?.enabled || planModeContinuationQueued) return;
    if (activePlanModeRun.phase === "complete" || activePlanModeRun.phase === "stopped") return;
    planModeContinuationQueued = true;
    persistPlanModeState();
    pi.sendUserMessage(`/reliability --mode plan-continue ${activePlanModeRun.run_id}`, { deliverAs: "followUp" });
  };

  pi.registerFlag("reliability", {
    description: "Enable the small-LLM reliability harness for this session",
    type: "boolean",
    default: false,
  });

  pi.registerCommand("reliability", {
    description: "Reliability harness control: on [goal] | off | status | reset | scratchpad | verify | suggest | eval | tasks | resume <id> | archive <id> | profile <strict|balanced|relaxed> | mode <adaptive|lite|supervised> | --mode plan-on|plan-off|plan-status | context <full|compact|delta> | orchestrate [--run]",
    getArgumentCompletions: (prefix) => ["on", "off", "status", "reset", "scratchpad", "verify", "suggest", "eval", "tasks", "resume", "archive", "profile", "mode", "--mode", "context", "orchestrate"]
      .filter((item) => item.startsWith(prefix))
      .map((item) => ({ value: item, label: item })),
    handler: async (args, ctx) => {
      const [commandRaw, ...rest] = args.trim().split(/\s+/).filter(Boolean);
      let command = (commandRaw ?? "status").toLowerCase();
      if (command === "--mode") command = "mode";
      const restText = rest.join(" ").trim();
      const modeValue = command === "mode" ? rest[0]?.toLowerCase() : undefined;
      const modeRestText = command === "mode" ? rest.slice(1).join(" ").trim() : "";

      if (modeValue?.startsWith("plan-")) {
        if (modeValue === "plan-on") {
          if (modeRestText) {
            await startPlanModeForGoal(ctx, modeRestText);
            return;
          }
          enabled = true;
          planModeArmed = true;
          activePlanModeRun = undefined;
          planModeContinuationQueued = false;
          persistExtensionState(pi, enabled, activeTask);
          persistPlanModeState();
          refreshAllUi(ctx);
          ctx.ui.notify("Reliability plan mode armed. Send the task goal as your next prompt, or use `/reliability --mode plan-on <goal>` to start immediately in a fresh session.", "success");
          return;
        }
        if (modeValue === "plan-off") {
          stopPlanMode(ctx, "disabled");
          ctx.ui.notify("Reliability plan mode disabled.", "info");
          return;
        }
        if (modeValue === "plan-status") {
          ctx.ui.notify(formatPlanModeStatus(activePlanModeRun, planModeArmed), "info");
          updatePlanModeUi(ctx, activePlanModeRun, planModeArmed);
          return;
        }
        if (modeValue === "plan-continue") {
          await continuePlanMode(ctx, modeRestText || undefined);
          return;
        }
        ctx.ui.notify("Usage: /reliability --mode plan-on [goal] | plan-off | plan-status", "warning");
        return;
      }

      if (command === "on") {
        enabled = true;
        if (restText) {
          activeTask = createTaskState(ctx.cwd, restText, ctx.sessionManager.getSessionFile(), config);
          setSupervisionModeForTask(activeTask, restText);
          saveTaskState(activeTask, "task_created_from_command");
        } else {
          setSupervisionModeForTask(activeTask);
        }
        persistExtensionState(pi, enabled, activeTask);
        refreshAllUi(ctx);
        ctx.ui.notify(activeTask ? `Reliability harness enabled for task ${activeTask.task_id}` : "Reliability harness enabled for the next task.", "success");
        return;
      }

      if (command === "off") {
        enabled = false;
        stopPlanMode(ctx, "disabled");
        persistExtensionState(pi, enabled, activeTask);
        refreshAllUi(ctx);
        ctx.ui.notify("Reliability harness disabled.", "info");
        return;
      }

      if (command === "reset") {
        stopPlanMode(ctx, "reset");
        activeTask = undefined;
        setSupervisionModeForTask(undefined);
        persistExtensionState(pi, enabled, activeTask);
        refreshAllUi(ctx);
        ctx.ui.notify("Reliability harness task reset. Existing .pi/tasks files were left intact.", "warning");
        return;
      }

      if (command === "scratchpad") {
        if (!activeTask) {
          ctx.ui.notify("No active reliability task.", "warning");
          return;
        }
        ctx.ui.notify(`Scratchpad: ${scratchpadPathFor(activeTask.cwd, activeTask.task_id)}`, "info");
        return;
      }

      if (command === "verify") {
        if (!activeTask) {
          ctx.ui.notify("No active reliability task.", "warning");
          return;
        }
        const report = computeVerification(activeTask);
        activeTask.verification = [...activeTask.verification, ...report.filter((item) => !explicitVerificationFor(activeTask!, item.criterion))].slice(-50);
        saveTaskState(activeTask, "manual_verification_report");
        ctx.ui.notify(formatVerification(report), "info");
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        return;
      }

      if (command === "suggest") {
        const suggestions = suggestVerificationCommands(ctx.cwd);
        ctx.ui.notify(
          suggestions.length > 0
            ? suggestions.map((item) => `${item.command} — ${item.reason}`).join("\n")
            : "No project-specific verification commands detected.",
          "info",
        );
        return;
      }

      if (command === "eval") {
        const report = runOfflineReliabilityEvaluation(ctx.cwd);
        let message = formatEvaluationReport(report);
        if (rest.includes("--write")) {
          const paths = writeEvaluationReport(ctx.cwd, report);
          message += `\nSaved evaluation report:\n- ${paths.markdownPath}\n- ${paths.jsonPath}`;
        }
        ctx.ui.notify(message, report.metrics.failed ? "warning" : "success");
        return;
      }

      if (command === "tasks") {
        const includeArchived = restText === "--all" || restText === "all";
        ctx.ui.notify(formatTaskSummaries(listTaskStates(ctx.cwd, includeArchived)), "info");
        return;
      }

      if (command === "resume") {
        const resolution = resolveTaskQuery(ctx.cwd, restText, true);
        if (!resolution.state) {
          ctx.ui.notify(resolution.error ?? "Could not resolve reliability task.", "warning");
          return;
        }
        activeTask = resolution.state;
        enabled = true;
        setSupervisionModeForTask(activeTask);
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(`Resumed reliability task ${activeTask.task_id}: ${activeTask.normalized_goal}`, "success");
        return;
      }

      if (command === "archive") {
        const resolution = resolveTaskQuery(ctx.cwd, restText, true);
        if (!resolution.state) {
          ctx.ui.notify(resolution.error ?? "Could not resolve reliability task.", "warning");
          return;
        }
        archiveTask(ctx.cwd, resolution.state.task_id);
        if (activeTask?.task_id === resolution.state.task_id) activeTask = undefined;
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(`Archived reliability task ${resolution.state.task_id}.`, "info");
        return;
      }

      if (command === "profile") {
        if (!restText) {
          ctx.ui.notify(`Reliability profile: ${config.profile}. Use /reliability profile strict|balanced|relaxed`, "info");
          return;
        }
        const profile = normalizeProfile(restText);
        if (profile !== restText) {
          ctx.ui.notify("Usage: /reliability profile strict|balanced|relaxed", "warning");
          return;
        }
        config = normalizeConfig({ ...config, profile, maxRepeatedAction: undefined, contextMode: undefined, supervisionMode: undefined });
        setSupervisionModeForTask(activeTask);
        setScratchpadWritesEnabled(config.scratchpadEnabled);
        if (activeTask) activeTask.counters.repeated_action_limit = config.maxRepeatedAction;
        contextSnapshots.clear();
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(`Reliability profile set to ${config.profile} (mode ${config.supervisionMode}, active ${activeSupervisionMode}, repeat limit ${config.maxRepeatedAction}, context ${config.contextMode}).`, "success");
        return;
      }

      if (command === "mode") {
        if (!restText) {
          ctx.ui.notify(`Reliability supervision mode: ${config.supervisionMode} (active ${activeSupervisionMode}). Use /reliability mode adaptive|lite|supervised`, "info");
          return;
        }
        const supervisionMode = normalizeSupervisionMode(restText, config.supervisionMode);
        if (supervisionMode !== restText) {
          ctx.ui.notify("Usage: /reliability mode adaptive|lite|supervised", "warning");
          return;
        }
        config = normalizeConfig({ ...config, supervisionMode });
        setSupervisionModeForTask(activeTask);
        contextSnapshots.clear();
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(`Reliability supervision mode set to ${config.supervisionMode} (active ${activeSupervisionMode}).`, "success");
        return;
      }

      if (command === "context") {
        if (!restText) {
          ctx.ui.notify(`Reliability context mode: ${config.contextMode}. Use /reliability context full|compact|delta`, "info");
          return;
        }
        const contextMode = normalizeContextMode(restText, config.contextMode);
        if (contextMode !== restText) {
          ctx.ui.notify("Usage: /reliability context full|compact|delta", "warning");
          return;
        }
        config = normalizeConfig({ ...config, contextMode });
        contextSnapshots.clear();
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(`Reliability context mode set to ${config.contextMode}.`, "success");
        return;
      }

      if (command === "orchestrate") {
        if (!activeTask) {
          ctx.ui.notify("No active reliability task.", "warning");
          return;
        }
        escalateSupervision(ctx, activeTask, "orchestration requested");
        const shouldRun = rest.includes("--run");
        if (!shouldRun || config.orchestrationMode !== "separate-model") {
          const dryRun = buildDryRunOrchestration(activeTask, config);
          supervisorDecisions.set(activeTask.task_id, dryRun.decision);
          ctx.ui.notify(
            `${formatOrchestrationResult(dryRun)}\n\nCurrent orchestrationMode: ${config.orchestrationMode}. Set \"orchestrationMode\": \"separate-model\" in .pi/reliability.json and pass --run to execute subprocess roles.`,
            "info",
          );
          return;
        }
        const confirmed = typeof ctx.ui.confirm === "function"
          ? await ctx.ui.confirm("Run reliability orchestration?", "This starts separate pi subprocesses. The worker subprocess may use configured tools and can modify files if write/edit/bash are enabled.")
          : true;
        if (!confirmed) {
          ctx.ui.notify("Separate-model orchestration cancelled.", "info");
          return;
        }
        const result = await runSeparateModelOrchestration(activeTask, config);
        supervisorDecisions.set(activeTask.task_id, result.decision);
        const expectedStepId = result.decision.step_id;
        if (result.workerResult && result.workerResult.step_id === expectedStepId) {
          applyWorkerResult(activeTask, result.workerResult);
        } else if (result.workerResult) {
          pushBounded(activeTask.errors, `Orchestrated worker returned unexpected step_id ${result.workerResult.step_id}; expected ${expectedStepId}.`, MAX_ERRORS);
        }
        mergeVerificationEvidence(activeTask, result.verificationEvidence);
        saveTaskState(activeTask, "separate_model_orchestration");
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        ctx.ui.notify(formatOrchestrationResult(result), result.errors.length ? "warning" : "success");
        return;
      }

      if (command === "status" || !commandRaw) {
        ctx.ui.notify(`${formatStatus(activeTask, enabled, runtimeConfig())}\n\n${formatPlanModeStatus(activePlanModeRun, planModeArmed)}`, "info");
        refreshAllUi(ctx);
        return;
      }

      ctx.ui.notify("Usage: /reliability on [goal] | off | status | reset | scratchpad | verify | suggest | eval [--write] | tasks [--all] | resume <task_id> | archive <task_id> | profile strict|balanced|relaxed | mode adaptive|lite|supervised | --mode plan-on [goal]|plan-off|plan-status | context full|compact|delta | orchestrate [--run]", "warning");
    },
  });

  pi.registerTool({
    name: "reliability_status",
    label: "Reliability Status",
    description: "Inspect the current reliability harness task state and scratchpad path.",
    promptSnippet: "Inspect task state, current step, scratchpad path, and verification summary.",
    promptGuidelines: [
      "Use reliability_status when you need to check the current harness task state instead of guessing from memory.",
    ],
    parameters: Type.Object({}),
    async execute() {
      return {
        content: [{ type: "text", text: `${formatStatus(activeTask, enabled, runtimeConfig())}\n\n${formatPlanModeStatus(activePlanModeRun, planModeArmed)}` }],
        details: { enabled, task: activeTask, planMode: activePlanModeRun, planModeArmed },
      };
    },
  });

  pi.registerTool({
    name: "reliability_suggest_verification",
    label: "Reliability Suggest Verification",
    description: "Suggest project-specific verification commands such as npm test, cargo test, pytest, or go test.",
    promptSnippet: "Suggest verification commands detected from project manifests.",
    promptGuidelines: [
      "Use reliability_suggest_verification when verification evidence is missing and you need an appropriate command to run.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const suggestions = suggestVerificationCommands(ctx.cwd);
      return {
        content: [{
          type: "text",
          text: suggestions.length > 0
            ? suggestions.map((item) => `${item.command} — ${item.reason}`).join("\n")
            : "No project-specific verification commands detected.",
        }],
        details: { suggestions },
      };
    },
  });

  pi.registerTool({
    name: "reliability_set_plan",
    label: "Reliability Set Plan",
    description: "Create or revise the harness plan for the active task.",
    promptSnippet: "Revise the current task plan with explicit steps and verification fields.",
    promptGuidelines: [
      "Use reliability_set_plan only in supervised reliability mode when the default plan is too vague or failures require a revised strategy.",
    ],
    parameters: Type.Object({
      replace: Type.Optional(Type.Boolean({ description: "Replace the current plan. Defaults to true." })),
      steps: Type.Array(Type.Object({
        step_id: Type.Optional(Type.String({ description: "Stable step id such as S1." })),
        title: Type.String({ description: "Short step title." }),
        description: Type.Optional(Type.String()),
        status: Type.Optional(StepStatusSchema),
        depends_on: Type.Optional(Type.Array(Type.String())),
        expected_output: Type.Optional(Type.String()),
        verification: Type.Optional(Type.String()),
      }), { minItems: 1, maxItems: 16 }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      replacePlan(activeTask, params.steps as Array<Record<string, unknown>>, params.replace !== false);
      activeTask.status = "executing";
      selectNextStep(activeTask);
      saveTaskState(activeTask, "plan_updated_by_tool");
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      return {
        content: [{ type: "text", text: `Updated reliability plan with ${activeTask.plan.length} step(s). Current step: ${activeTask.current_step_id}` }],
        details: { plan: activeTask.plan },
      };
    },
  });

  pi.registerTool({
    name: "reliability_record_progress",
    label: "Reliability Record Progress",
    description: "Record meaningful facts, decisions, errors, next actions, touched files, or step status changes in task state.",
    promptSnippet: "Record task progress, facts, decisions, errors, and step status in the harness state.",
    promptGuidelines: [
      "Use reliability_record_progress after meaningful progress, a decision, an error, a blocker, or a step-status change; in lite mode, use it sparingly.",
    ],
    parameters: Type.Object({
      step_id: Type.Optional(Type.String()),
      step_status: Type.Optional(StepStatusSchema),
      task_status: Type.Optional(TaskStatusSchema),
      known_fact: Type.Optional(Type.String()),
      decision: Type.Optional(Type.String()),
      open_question: Type.Optional(Type.String()),
      error: Type.Optional(Type.String()),
      next_action: Type.Optional(Type.String()),
      files_touched: Type.Optional(Type.Array(Type.String())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      if (params.step_id && params.step_status) setStepStatus(activeTask, params.step_id, params.step_status as StepStatus);
      if (params.task_status) activeTask.status = params.task_status as TaskStatus;
      addUniqueBounded(activeTask.known_facts, params.known_fact, MAX_FACTS);
      addUniqueBounded(activeTask.decisions, params.decision, MAX_FACTS);
      addUniqueBounded(activeTask.open_questions, params.open_question, MAX_FACTS);
      pushBounded(activeTask.errors, params.error, MAX_ERRORS);
      if (params.next_action) activeTask.next_action = truncate(params.next_action, 300);
      for (const file of params.files_touched ?? []) addUniqueBounded(activeTask.files_touched, file, 120);
      selectNextStep(activeTask);
      refreshSupervisorDecision(activeTask);
      saveTaskState(activeTask, "progress_recorded_by_tool");
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      return {
        content: [{ type: "text", text: `Recorded reliability progress. ${formatStatus(activeTask, enabled, runtimeConfig())}` }],
        details: { task: activeTask },
      };
    },
  });

  pi.registerTool({
    name: "reliability_supervisor_decision",
    label: "Reliability Supervisor Decision",
    description: "Inspect the deterministic supervisor's current worker-step decision.",
    promptSnippet: "Inspect the current supervisor-selected worker step and contract.",
    promptGuidelines: [
      "Use reliability_supervisor_decision only in supervised reliability mode when you need the current supervisor-selected worker step or contract.",
    ],
    parameters: Type.Object({}),
    async execute() {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      const decision = refreshSupervisorDecision(activeTask);
      return {
        content: [{ type: "text", text: buildWorkerContractPrompt(decision) }],
        details: { decision },
      };
    },
  });

  pi.registerTool({
    name: "reliability_submit_worker_result",
    label: "Reliability Submit Worker Result",
    description: "Submit the focused worker result for the current supervisor-selected step.",
    promptSnippet: "Submit a structured worker result for the current supervisor-selected step.",
    promptGuidelines: [
      "Use reliability_submit_worker_result only in supervised reliability mode when the current worker step is complete, blocked, or failed; do not use it in lite mode.",
    ],
    parameters: Type.Object({
      step_id: Type.String({ description: "Supervisor-selected step id." }),
      action_taken: Type.String({ description: "Focused action performed by the worker." }),
      result: Type.String({ description: "Worker result summary." }),
      files_changed: Type.Optional(Type.Array(Type.String())),
      errors: Type.Optional(Type.Array(Type.String())),
      next_recommendation: Type.Optional(Type.String()),
      status: StringEnum(["complete", "blocked", "failed"] as const),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      if (activeSupervisionMode !== "supervised") {
        throw new Error("reliability_submit_worker_result is disabled in lite mode. Work normally, record major progress only if useful, and call reliability_verify_completion with evidence before final completion claims. Use /reliability mode supervised for supervisor/worker step contracts.");
      }
      const result = params as WorkerResultInput;
      const expected = refreshSupervisorDecision(activeTask).step_id;
      if (result.step_id !== expected) {
        throw new Error(`Worker result step_id ${result.step_id} does not match supervisor-selected step ${expected}.`);
      }
      if (result.status === "complete") assertVerificationAllowsCompletion(activeTask, result.step_id);
      applyWorkerResult(activeTask, result);
      const nextDecision = refreshSupervisorDecision(activeTask);
      saveTaskState(activeTask, "worker_result_submitted");
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      return {
        content: [{ type: "text", text: `Worker result accepted for ${result.step_id}. Next supervisor decision:\n${buildWorkerContractPrompt(nextDecision)}` }],
        details: { workerResult: result, supervisorDecision: nextDecision, taskStatus: activeTask.status },
      };
    },
  });

  pi.registerTool({
    name: "reliability_verify_completion",
    label: "Reliability Verify Completion",
    description: "Verify active task success criteria with explicit evidence before claiming completion.",
    promptSnippet: "Check success criteria and record Passed/Failed/Unknown evidence before final answer.",
    promptGuidelines: [
      "Use reliability_verify_completion before claiming the user's task is complete; pass explicit evidence and disclose unknowns.",
    ],
    parameters: Type.Object({
      evidence: Type.Optional(Type.Array(Type.Object({
        criterion: Type.String(),
        status: VerificationStatusSchema,
        evidence: Type.String(),
        remainingWork: Type.Optional(Type.String()),
      }), { maxItems: 20 })),
      markComplete: Type.Optional(Type.Boolean({ description: "Mark task complete only if all criteria are passed." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      const evidenceInput = params.evidence as Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string }> | undefined;
      const hasExplicitEvidence = Array.isArray(evidenceInput) && evidenceInput.length > 0;
      if (!hasExplicitEvidence) {
        const unresolved = computeVerification(activeTask);
        const failed = unresolved.filter((item) => item.status === "failed").length;
        const unknown = unresolved.filter((item) => item.status === "unknown").length;
        if (failed > 0 || unknown > 0) {
          const message = `Missing explicit verification evidence: ${failed} failed and ${unknown} unknown verification criteria remain. Call reliability_verify_completion with evidence[] entries for each criterion, using status passed, failed, or unknown.`;
          addUniqueBounded(activeTask.open_questions, message, MAX_FACTS);
          pushBounded(activeTask.errors, message, MAX_ERRORS);
          saveTaskState(activeTask, "verification_missing_evidence");
          updateUi(ctx, enabled, activeTask, runtimeConfig());
          const criteria = unresolved.filter((item) => item.status !== "passed").map((item) => `- ${item.criterion}`).join("\n");
          throw new Error(criteria ? `${message}\nUnresolved criteria:\n${criteria}` : message);
        }
      }
      mergeVerificationEvidence(activeTask, evidenceInput);
      const report = computeVerification(activeTask);
      const missingExplicitEvidence = report.filter((item) => item.source === "harness" && item.status === "unknown");
      if (missingExplicitEvidence.length > 0) {
        const criteria = missingExplicitEvidence.map((item) => `- ${item.criterion}`).join("\n");
        const message = `Verification evidence did not resolve ${missingExplicitEvidence.length} criteria. Use evidence[] entries whose criterion exactly matches each unresolved success criterion:\n${criteria}`;
        addUniqueBounded(activeTask.open_questions, message, MAX_FACTS);
        pushBounded(activeTask.errors, message, MAX_ERRORS);
        saveTaskState(activeTask, "verification_unresolved_after_evidence");
        updateUi(ctx, enabled, activeTask, runtimeConfig());
        throw new Error(message);
      }
      if (params.markComplete) {
        for (const item of report) addOrUpdateVerification(activeTask, item);
        markTaskCompleteIfVerified(activeTask);
      } else {
        for (const item of report) addOrUpdateVerification(activeTask, item);
      }
      saveTaskState(activeTask, "verification_recorded_by_tool");
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      return {
        content: [{ type: "text", text: formatVerification(computeVerification(activeTask)) }],
        details: { verification: activeTask.verification, status: activeTask.status },
      };
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    config = normalizeConfig({ ...readProjectConfig(ctx) });
    setScratchpadWritesEnabled(config.scratchpadEnabled);
    const saved = persistedPointerFromSession(ctx);
    const savedPlan = persistedPlanModePointerFromSession(ctx);
    planModeArmed = Boolean(savedPlan?.armed);
    planModeContinuationQueued = false;
    activePlanModeRun = loadPlanModeRun(ctx.cwd, savedPlan?.taskId);
    enabled = Boolean(pi.getFlag("reliability") || saved?.enabled || savedPlan?.enabled || config.enabled);
    activeTask = loadTaskState(ctx.cwd, saved?.taskId ?? savedPlan?.taskId);
    if (activeTask && (activeTask.status === "complete" || activeTask.status === "failed" || isTaskArchived(ctx.cwd, activeTask.task_id))) {
      activeTask = undefined;
    }
    setSupervisionModeForTask(activeTask);
    if (activePlanModeRun?.enabled) activeSupervisionMode = "supervised";
    refreshAllUi(ctx);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!enabled) return;
    if (planModeArmed && !activePlanModeRun) {
      activeTask = createTaskState(ctx.cwd, event.prompt, ctx.sessionManager.getSessionFile(), config);
      activeSupervisionMode = "supervised";
      saveTaskState(activeTask, "plan_mode_task_created_from_prompt");
      activePlanModeRun = createPlanModeRun(activeTask);
      planModeArmed = false;
      persistExtensionState(pi, enabled, activeTask);
      persistPlanModeState();
      refreshAllUi(ctx);
      return {
        systemPrompt: `${event.systemPrompt}\n\n${buildPlanModePhasePrompt(activePlanModeRun)}`,
      };
    }
    const state = ensureTask(ctx, event.prompt);
    setSupervisionModeForTask(state, event.prompt);
    let extraPrompt: string;
    if (activeSupervisionMode === "supervised") {
      selectNextStep(state);
      const supervisorDecision = refreshSupervisorDecision(state);
      extraPrompt = `[RELIABILITY HARNESS INSTRUCTIONS]\nA deterministic reliability harness is active in supervised mode. Treat its task state, plan, loop warnings, and verification records as the source of truth. Keep each action tied to the current step. Use reliability_set_plan to revise plans, reliability_record_progress to persist facts/decisions/errors, reliability_submit_worker_result to complete the current worker step, and reliability_verify_completion before final completion claims. If evidence is missing, say Unknown rather than inventing success.\n[/RELIABILITY HARNESS INSTRUCTIONS]\n\n${buildWorkerContractPrompt(supervisorDecision)}`;
    } else {
      extraPrompt = "[RELIABILITY LITE INSTRUCTIONS]\nA lightweight reliability harness is active. Work normally and avoid supervisor/worker ceremony. Do not call reliability_submit_worker_result unless a later prompt explicitly switches to supervised mode. Call reliability_verify_completion with concrete evidence before claiming completion. Use reliability_record_progress only for major milestones, errors, or decisions.\n[/RELIABILITY LITE INSTRUCTIONS]";
    }
    saveTaskState(state, "before_agent_start");
    refreshAllUi(ctx);

    return {
      systemPrompt: `${event.systemPrompt}\n\n${extraPrompt}`,
    };
  });

  pi.on("context", async (event) => {
    if (!enabled || !activeTask) return;
    activeTask.counters.context_injections += 1;
    const previousSnapshot = contextSnapshots.get(activeTask.task_id);
    const { header, snapshot } = buildContextHeader(activeTask, runtimeConfig(), previousSnapshot);
    contextSnapshots.set(activeTask.task_id, snapshot);
    saveTaskState(activeTask, "context_header_injected");
    return {
      messages: [
        ...event.messages,
        {
          role: "user",
          content: [{ type: "text", text: header }],
          timestamp: Date.now(),
        } as never,
      ],
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!enabled || !activeTask) return;
    const reason = shouldBlockRepeat(activeTask, event.toolName, event.input, config);
    if (reason) {
      const hash = hashToolCall(event.toolName, event.input);
      const item: ToolHistoryItem = {
        timestamp: nowIso(),
        tool_call_id: event.toolCallId,
        step_id: activeTask.current_step_id,
        tool: event.toolName,
        arguments_hash: hash,
        arguments_preview: truncate(stableStringify(event.input), 1000),
        status: "blocked",
        summary: reason,
      };
      pushBounded(activeTask.tool_history, item, MAX_HISTORY);
      pushBounded(activeTask.loop_warnings, reason, MAX_ERRORS);
      activeTask.status = "blocked";
      setStepStatus(activeTask, activeTask.current_step_id, "blocked");
      escalateSupervision(ctx, activeTask, "repeated tool action was blocked");
      saveTaskState(activeTask, "loop_detected_blocked_tool_call");
      updateUi(ctx, enabled, activeTask, runtimeConfig());
      ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    recordToolCall(activeTask, event.toolCallId, event.toolName, event.input);
    saveTaskState(activeTask, "tool_call_recorded");
    updateUi(ctx, enabled, activeTask, runtimeConfig());
  });

  pi.on("tool_result", async (event, ctx) => {
    if (!enabled || !activeTask) return;
    const summary = summarizeToolResult(event);
    updateToolResult(activeTask, event.toolCallId, event.toolName, event.input, event.isError === true, summary, contentToText(event.content), config);
    if (event.isError === true) escalateSupervision(ctx, activeTask, `${event.toolName} returned an error`);
    if (activeTask.status === "blocked" && event.isError !== true) activeTask.status = "executing";
    selectNextStep(activeTask);
    saveTaskState(activeTask, "tool_result_recorded");
    updateUi(ctx, enabled, activeTask, runtimeConfig());
  });

  pi.on("message_end", async (event, ctx) => {
    if (!enabled || !activeTask) return;
    const message = event.message as { role?: string };
    if (message.role !== "assistant") return;
    activeTask.counters.model_responses += 1;
    const text = assistantText(event.message);
    if (text) addUniqueBounded(activeTask.known_facts, `Assistant response: ${truncate(text, 260)}`, MAX_FACTS);
    if (!activePlanModeRun?.enabled) {
      const completionGate = evaluateCompletionGate(activeTask, text, assistantHasToolCall(event.message), config);
      if (completionGate.triggered) {
        addUniqueBounded(activeTask.open_questions, completionGate.message, MAX_FACTS);
        escalateSupervision(ctx, activeTask, "completion was claimed before verification passed");
        if (ctx.hasUI) ctx.ui.notify(completionGate.message, completionGate.strict ? "error" : "warning");
        if ((completionGate.strict || config.supervisionMode === "adaptive") && !completionGatePromptedTaskIds.has(activeTask.task_id)) {
          completionGatePromptedTaskIds.add(activeTask.task_id);
          pi.sendUserMessage(buildCompletionGatePrompt(activeTask, completionGate), { deliverAs: "followUp" });
        }
      }
    }
    saveTaskState(activeTask, "assistant_message_recorded");
    refreshAllUi(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!enabled || !activeTask) return;
    const verification = computeVerification(activeTask);
    const allPassed = verification.length > 0 && verification.every((item) => item.status === "passed");
    if (allPassed && activeTask.status !== "complete") {
      markTaskCompleteIfVerified(activeTask);
      ctx.ui.notify(`Reliability task verified complete: ${activeTask.task_id}`, "success");
    }
    saveTaskState(activeTask, "agent_end");
    refreshAllUi(ctx);
    queuePlanModeContinuation();
  });

  pi.on("session_shutdown", async () => {
    if (activeTask) saveTaskState(activeTask, "session_shutdown");
    if (activePlanModeRun) savePlanModeRun(activePlanModeRun);
  });
}
