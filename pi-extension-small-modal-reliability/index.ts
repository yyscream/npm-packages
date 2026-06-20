import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  CUSTOM_STATE_TYPE,
  DEFAULT_CONFIG,
  MAX_ERRORS,
  MAX_FACTS,
  MAX_HISTORY,
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
  loadLatestTaskState,
  loadTaskState,
  markTaskCompleteIfVerified,
  mergeVerificationEvidence,
  normalizeConfig,
  normalizeContextMode,
  normalizeProfile,
  nowIso,
  persistExtensionState,
  persistedPointerFromSession,
  pushBounded,
  readProjectConfig,
  recordToolCall,
  replacePlan,
  resolveTaskQuery,
  runOfflineReliabilityEvaluation,
  saveTaskState,
  scratchpadPathFor,
  selectNextStep,
  setScratchpadWritesEnabled,
  setStepStatus,
  shouldBlockRepeat,
  stableStringify,
  summarizeToolResult,
  suggestVerificationCommands,
  toolHistoryForHash,
  truncate,
  updateToolResult,
  updateUi,
  writeEvaluationReport,
  writeScratchpad,
  hashToolCall,
} from "./src/core.ts";
import { buildDryRunOrchestration, formatOrchestrationResult, runSeparateModelOrchestration } from "./src/orchestration.ts";
import { applyWorkerResult, buildSupervisorDecision, buildWorkerContractPrompt } from "./src/supervisor.ts";
import type { SupervisorDecision, WorkerResultInput } from "./src/supervisor.ts";
import type {
  ContextSnapshot,
  ReliabilityConfig,
  StepStatus,
  TaskStatus,
  TaskState,
  ToolHistoryItem,
  VerificationStatus,
} from "./src/core.ts";

export default function reliabilityHarnessExtension(pi: ExtensionAPI): void {
  let config: ReliabilityConfig = { ...DEFAULT_CONFIG };
  let enabled = false;
  let activeTask: TaskState | undefined;
  const completionGatePromptedTaskIds = new Set<string>();
  const contextSnapshots = new Map<string, ContextSnapshot>();
  const supervisorDecisions = new Map<string, SupervisorDecision>();

  const ensureTask = (ctx: ExtensionContext, prompt: string): TaskState => {
    if (!activeTask || activeTask.status === "complete" || activeTask.status === "failed") {
      activeTask = createTaskState(ctx.cwd, prompt, ctx.sessionManager.getSessionFile(), config);
      saveTaskState(activeTask, "task_created");
      persistExtensionState(pi, enabled, activeTask);
      updateUi(ctx, enabled, activeTask, config);
      return activeTask;
    }

    addUniqueBounded(activeTask.known_facts, `User update: ${truncate(prompt, 240)}`, MAX_FACTS);
    saveTaskState(activeTask, "user_update_recorded");
    return activeTask;
  };

  pi.registerFlag("reliability", {
    description: "Enable the small-LLM reliability harness for this session",
    type: "boolean",
    default: false,
  });

  pi.registerCommand("reliability", {
    description: "Reliability harness control: on [goal] | off | status | reset | scratchpad | verify | suggest | eval | tasks | resume <id> | archive <id> | profile <strict|balanced|relaxed> | context <full|compact|delta> | orchestrate [--run]",
    getArgumentCompletions: (prefix) => ["on", "off", "status", "reset", "scratchpad", "verify", "suggest", "eval", "tasks", "resume", "archive", "profile", "context", "orchestrate"]
      .filter((item) => item.startsWith(prefix))
      .map((item) => ({ value: item, label: item })),
    handler: async (args, ctx) => {
      const [commandRaw, ...rest] = args.trim().split(/\s+/).filter(Boolean);
      const command = (commandRaw ?? "status").toLowerCase();
      const restText = rest.join(" ").trim();

      if (command === "on") {
        enabled = true;
        if (restText) {
          activeTask = createTaskState(ctx.cwd, restText, ctx.sessionManager.getSessionFile(), config);
          saveTaskState(activeTask, "task_created_from_command");
        }
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, config);
        ctx.ui.notify(activeTask ? `Reliability harness enabled for task ${activeTask.task_id}` : "Reliability harness enabled for the next task.", "success");
        return;
      }

      if (command === "off") {
        enabled = false;
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, config);
        ctx.ui.notify("Reliability harness disabled.", "info");
        return;
      }

      if (command === "reset") {
        activeTask = undefined;
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, config);
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
        updateUi(ctx, enabled, activeTask, config);
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
        persistExtensionState(pi, enabled, activeTask);
        updateUi(ctx, enabled, activeTask, config);
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
        updateUi(ctx, enabled, activeTask, config);
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
        config = normalizeConfig({ ...config, profile, maxRepeatedAction: undefined, contextMode: undefined });
        setScratchpadWritesEnabled(config.scratchpadEnabled);
        if (activeTask) activeTask.counters.repeated_action_limit = config.maxRepeatedAction;
        contextSnapshots.clear();
        updateUi(ctx, enabled, activeTask, config);
        ctx.ui.notify(`Reliability profile set to ${config.profile} (repeat limit ${config.maxRepeatedAction}, context ${config.contextMode}).`, "success");
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
        updateUi(ctx, enabled, activeTask, config);
        ctx.ui.notify(`Reliability context mode set to ${config.contextMode}.`, "success");
        return;
      }

      if (command === "orchestrate") {
        if (!activeTask) {
          ctx.ui.notify("No active reliability task.", "warning");
          return;
        }
        const shouldRun = rest.includes("--run");
        if (!shouldRun || config.orchestrationMode !== "separate-model") {
          const dryRun = buildDryRunOrchestration(activeTask, config);
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
        const expectedStepId = supervisorDecisions.get(activeTask.task_id)?.step_id ?? activeTask.current_step_id;
        if (result.workerResult && result.workerResult.step_id === expectedStepId) {
          applyWorkerResult(activeTask, result.workerResult);
        } else if (result.workerResult) {
          pushBounded(activeTask.errors, `Orchestrated worker returned unexpected step_id ${result.workerResult.step_id}; expected ${expectedStepId}.`, MAX_ERRORS);
        }
        mergeVerificationEvidence(activeTask, result.verificationEvidence);
        saveTaskState(activeTask, "separate_model_orchestration");
        updateUi(ctx, enabled, activeTask, config);
        ctx.ui.notify(formatOrchestrationResult(result), result.errors.length ? "warning" : "success");
        return;
      }

      if (command === "status" || !commandRaw) {
        ctx.ui.notify(formatStatus(activeTask, enabled, config), "info");
        updateUi(ctx, enabled, activeTask, config);
        return;
      }

      ctx.ui.notify("Usage: /reliability on [goal] | off | status | reset | scratchpad | verify | suggest | eval [--write] | tasks [--all] | resume <task_id> | archive <task_id> | profile strict|balanced|relaxed | context full|compact|delta | orchestrate [--run]", "warning");
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
        content: [{ type: "text", text: formatStatus(activeTask, enabled, config) }],
        details: { enabled, task: activeTask },
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
      "Use reliability_set_plan when the default reliability plan is too vague or when failures require a revised strategy.",
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
      updateUi(ctx, enabled, activeTask, config);
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
      "Use reliability_record_progress after meaningful progress, a decision, an error, a blocker, or a step-status change.",
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
      saveTaskState(activeTask, "progress_recorded_by_tool");
      updateUi(ctx, enabled, activeTask, config);
      return {
        content: [{ type: "text", text: `Recorded reliability progress. ${formatStatus(activeTask, enabled, config)}` }],
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
      "Use reliability_supervisor_decision when you need the current supervisor-selected worker step or contract.",
    ],
    parameters: Type.Object({}),
    async execute() {
      if (!activeTask) throw new Error("No active reliability task. Enable /reliability on or start a task first.");
      const decision = buildSupervisorDecision(activeTask, config);
      supervisorDecisions.set(activeTask.task_id, decision);
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
      "Use reliability_submit_worker_result when the current worker step is complete, blocked, or failed.",
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
      const result = params as WorkerResultInput;
      const expected = supervisorDecisions.get(activeTask.task_id)?.step_id ?? activeTask.current_step_id;
      if (result.step_id !== expected) {
        throw new Error(`Worker result step_id ${result.step_id} does not match supervisor-selected step ${expected}.`);
      }
      applyWorkerResult(activeTask, result);
      const nextDecision = buildSupervisorDecision(activeTask, config);
      supervisorDecisions.set(activeTask.task_id, nextDecision);
      saveTaskState(activeTask, "worker_result_submitted");
      updateUi(ctx, enabled, activeTask, config);
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
      mergeVerificationEvidence(activeTask, params.evidence as Array<{ criterion?: string; status?: VerificationStatus; evidence?: string; remainingWork?: string }> | undefined);
      const report = computeVerification(activeTask);
      if (params.markComplete) {
        for (const item of report) addOrUpdateVerification(activeTask, item);
        markTaskCompleteIfVerified(activeTask);
      } else {
        for (const item of report) addOrUpdateVerification(activeTask, item);
      }
      saveTaskState(activeTask, "verification_recorded_by_tool");
      updateUi(ctx, enabled, activeTask, config);
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
    enabled = Boolean(pi.getFlag("reliability") || saved?.enabled || config.enabled);
    activeTask = loadTaskState(ctx.cwd, saved?.taskId) ?? (enabled ? loadLatestTaskState(ctx.cwd) : undefined);
    if (activeTask && (activeTask.status === "complete" || activeTask.status === "failed" || isTaskArchived(ctx.cwd, activeTask.task_id))) {
      activeTask = undefined;
    }
    updateUi(ctx, enabled, activeTask, config);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (!enabled) return;
    const state = ensureTask(ctx, event.prompt);
    selectNextStep(state);
    const supervisorDecision = buildSupervisorDecision(state, config);
    supervisorDecisions.set(state.task_id, supervisorDecision);
    saveTaskState(state, "before_agent_start");
    updateUi(ctx, enabled, state, config);

    return {
      systemPrompt: `${event.systemPrompt}\n\n[RELIABILITY HARNESS INSTRUCTIONS]\nA deterministic reliability harness is active. Treat its task state, plan, loop warnings, and verification records as the source of truth. Keep each action tied to the current step. Use reliability_set_plan to revise plans, reliability_record_progress to persist facts/decisions/errors, reliability_submit_worker_result to complete the current worker step, and reliability_verify_completion before final completion claims. If evidence is missing, say Unknown rather than inventing success.\n[/RELIABILITY HARNESS INSTRUCTIONS]\n\n${buildWorkerContractPrompt(supervisorDecision)}`,
    };
  });

  pi.on("context", async (event) => {
    if (!enabled || !activeTask) return;
    activeTask.counters.context_injections += 1;
    const previousSnapshot = contextSnapshots.get(activeTask.task_id);
    const { header, snapshot } = buildContextHeader(activeTask, config, previousSnapshot);
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
      saveTaskState(activeTask, "loop_detected_blocked_tool_call");
      updateUi(ctx, enabled, activeTask, config);
      ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    recordToolCall(activeTask, event.toolCallId, event.toolName, event.input);
    saveTaskState(activeTask, "tool_call_recorded");
    updateUi(ctx, enabled, activeTask, config);
  });

  pi.on("tool_result", async (event, ctx) => {
    if (!enabled || !activeTask) return;
    const summary = summarizeToolResult(event);
    updateToolResult(activeTask, event.toolCallId, event.toolName, event.input, event.isError === true, summary, contentToText(event.content), config);
    if (activeTask.status === "blocked" && event.isError !== true) activeTask.status = "executing";
    selectNextStep(activeTask);
    saveTaskState(activeTask, "tool_result_recorded");
    updateUi(ctx, enabled, activeTask, config);
  });

  pi.on("message_end", async (event, ctx) => {
    if (!enabled || !activeTask) return;
    const message = event.message as { role?: string };
    if (message.role !== "assistant") return;
    activeTask.counters.model_responses += 1;
    const text = assistantText(event.message);
    if (text) addUniqueBounded(activeTask.known_facts, `Assistant response: ${truncate(text, 260)}`, MAX_FACTS);
    const completionGate = evaluateCompletionGate(activeTask, text, assistantHasToolCall(event.message), config);
    if (completionGate.triggered) {
      addUniqueBounded(activeTask.open_questions, completionGate.message, MAX_FACTS);
      if (ctx.hasUI) ctx.ui.notify(completionGate.message, completionGate.strict ? "error" : "warning");
      if (completionGate.strict && !completionGatePromptedTaskIds.has(activeTask.task_id)) {
        completionGatePromptedTaskIds.add(activeTask.task_id);
        pi.sendUserMessage(buildCompletionGatePrompt(activeTask, completionGate), { deliverAs: "followUp" });
      }
    }
    saveTaskState(activeTask, "assistant_message_recorded");
    updateUi(ctx, enabled, activeTask, config);
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
    updateUi(ctx, enabled, activeTask, config);
  });

  pi.on("session_shutdown", async () => {
    if (activeTask) saveTaskState(activeTask, "session_shutdown");
  });
}
