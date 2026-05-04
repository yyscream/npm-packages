import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import type { Api, Model } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type PlanningAnswers = {
	goal: string;
	projectType: string;
	stack: string;
	architecture: string;
	designApproach: string;
	testStrategy: string;
	deployment: string;
	constraints: string;
};

type PlanModeState = {
	enabled: boolean;
	awaitingPrompt?: boolean;
	planModel?: { provider: string; id: string };
	previousModel?: { provider: string; id: string };
	answers?: PlanningAnswers;
};

const PLAN_STATUS_KEY = "plan-mode";

function hasWebEvidenceSection(markdown: string): boolean {
	const headingRegex = /^#{1,6}\s*Web Research Evidence\s*$/gim;
	const match = headingRegex.exec(markdown);
	if (!match) return false;

	const start = match.index + match[0].length;
	const rest = markdown.slice(start);
	const nextHeading = rest.search(/^#{1,6}\s+/m);
	const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;

	const urlRegex = /https?:\/\/[^\s)\]>]+/gi;
	return urlRegex.test(section);
}

function modelKey(model: Model<Api>): string {
	return `${model.provider}/${model.id}`;
}

function slugifyTopic(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80) || "plan";
}

function extractPlanTopic(content: string, goal?: string): string {
	const sectionHeadingPattern =
		/^(?:\d+\.?\s*)?(title\s*&\s*scope|objectives|current state|decision log|proposed architecture|design decisions|tooling\/stack decisions|web research evidence|implementation phases|testing & validation plan|risks, trade-offs, mitigations|open questions|quirks \/ extra relevant notes)$/i;

	const lines = content.split(/\r?\n/);
	for (const line of lines) {
		const m = line.match(/^#{1,6}\s+(.+)$/);
		if (!m) continue;
		const title = m[1].trim();
		if (!sectionHeadingPattern.test(title)) return title;
	}

	const titleScopeIndex = lines.findIndex((line) => /^#{1,6}\s*(?:\d+\.?\s*)?title\s*&\s*scope\s*$/i.test(line.trim()));
	if (titleScopeIndex >= 0) {
		for (let i = titleScopeIndex + 1; i < Math.min(lines.length, titleScopeIndex + 12); i++) {
			const candidate = lines[i]?.trim();
			if (!candidate) continue;
			if (/^#{1,6}\s+/.test(candidate)) continue;
			if (/^\d+\./.test(candidate)) continue;
			return candidate.replace(/^[-*\s]+/, "");
		}
	}

	return goal?.trim() || "plan";
}

function archivePlanCopy(cwd: string, content: string, goal?: string): { archived: boolean; path?: string; error?: string } {
	try {
		const source = resolve(cwd, "PLAN.md");
		if (!existsSync(source)) return { archived: false, error: "PLAN.md not found" };
		const topic = slugifyTopic(extractPlanTopic(content, goal));
		const targetDir = resolve(homedir(), ".pi/agent/docs", topic);
		mkdirSync(targetDir, { recursive: true });
		const target = resolve(targetDir, "PLAN.md");
		cpSync(source, target);
		return { archived: true, path: target };
	} catch (error) {
		return {
			archived: false,
			error: error instanceof Error ? error.message : "Unknown archive error",
		};
	}
}

function updateStatus(ctx: ExtensionContext, enabled: boolean, armed = false): void {
	if (!ctx.hasUI) return;
	if (enabled || armed) {
		ctx.ui.setStatus(PLAN_STATUS_KEY, ctx.ui.theme.fg("accent", "Plan"));
		return;
	}
	ctx.ui.setStatus(PLAN_STATUS_KEY, ctx.ui.theme.fg("warning", "Agent"));
}

function persistState(pi: ExtensionAPI, state: PlanModeState): void {
	pi.appendEntry("plan-mode-state", state);
}

function getUserScopedModels(): Set<string> {
	try {
		const settingsPath = resolve(homedir(), ".pi/agent/settings.json");
		if (!existsSync(settingsPath)) return new Set();
		const raw = readFileSync(settingsPath, "utf8");
		const parsed = JSON.parse(raw) as { enabledModels?: string[] };
		return new Set((parsed.enabledModels ?? []).filter((m): m is string => typeof m === "string"));
	} catch {
		return new Set();
	}
}

function getBraveSearchDiagnostic(pi: ExtensionAPI): string | undefined {
	const hasTool = pi.getAllTools().some((tool) => tool.name === "brave_search");
	if (!hasTool) return "Plan mode requires the brave_search tool, but it is not registered in Pi.";
	if (!process.env.BRAVE_SEARCH_API_KEY) return "Plan mode requires BRAVE_SEARCH_API_KEY in Pi's environment, but it is not set.";
	return undefined;
}

function buildPlanPrompt(userPrompt: string, answers: PlanningAnswers): string {
	return `You are in PLAN MODE. Create or update PLAN.md with a structured implementation plan.

Hard requirements:
- ALWAYS use the brave_search tool for up-to-date official docs for every important stack/tool choice.
- Prefer current official documentation over memory.
- Use local repo research tools (read/grep/find/ls/bash) to ground decisions in the actual codebase.
- Apply a scientific approach: list assumptions, evidence, alternatives, risks, and validation steps.
- Ask follow-up questions ONLY if absolutely blocking information is missing.
- Output must be written to PLAN.md.

PLAN.md structure (strict):
1. Title & Scope
2. Objectives
3. Current State (Repo Findings)
4. Decision Log (with chosen option + rejected options + rationale)
5. Proposed Architecture
6. Design Decisions
7. Tooling/Stack Decisions (with doc links)
8. Web Research Evidence
9. Implementation Phases
10. Testing & Validation Plan
11. Risks, Trade-offs, Mitigations
12. Open Questions
13. Quirks / Extra Relevant Notes

User request:
${userPrompt}

Mandatory decisions captured from user:
- Project Type: ${answers.projectType}
- Preferred Stack: ${answers.stack}
- Architecture Direction: ${answers.architecture}
- Design Approach: ${answers.designApproach}
- Testing Strategy: ${answers.testStrategy}
- Deployment Target: ${answers.deployment}
- Constraints/Priorities: ${answers.constraints}
- Planning Goal: ${answers.goal}
`;
}

async function askMandatoryQuestions(
	ctx: ExtensionContext,
	initialGoal?: string,
): Promise<PlanningAnswers | undefined> {
	const goal = initialGoal?.trim() || (await ctx.ui.input("Planning goal", "What exactly should this plan achieve?"))?.trim();
	if (!goal) return undefined;

	const projectType = await ctx.ui.select("Project type", [
		"New project",
		"Existing project refactor",
		"Feature addition",
		"Migration/modernization",
		"Research/spike",
	]);
	if (!projectType) return undefined;

	const stack = await ctx.ui.select("Preferred stack direction", [
		"Use existing stack in repo",
		"Rust + Tauri + React",
		"Django + React",
		"TypeScript/Node",
		"Python backend",
		"Decide after research",
	]);
	if (!stack) return undefined;

	const architecture = await ctx.ui.select("Architecture direction", [
		"Monolith",
		"Modular monolith",
		"Service-oriented",
		"Event-driven",
		"Layered/Clean architecture",
		"Decide after repo analysis",
	]);
	if (!architecture) return undefined;

	const designApproach = await ctx.ui.select("Design approach", [
		"Simple pragmatic",
		"Domain-driven",
		"API-first",
		"UI-first",
		"Performance-first",
	]);
	if (!designApproach) return undefined;

	const testStrategy = await ctx.ui.select("Testing strategy", [
		"Unit-heavy",
		"Balanced unit/integration",
		"Integration/E2E-heavy",
		"Minimal initially, expand later",
	]);
	if (!testStrategy) return undefined;

	const deployment = await ctx.ui.select("Deployment target", [
		"Local-first / desktop",
		"Single server",
		"Containerized (Docker/Compose)",
		"Cloud managed",
		"Not decided yet",
	]);
	if (!deployment) return undefined;

	const constraints =
		(await ctx.ui.select("Main constraints/priorities", [
			"Speed of delivery",
			"Reliability & maintainability",
			"Security & privacy",
			"Low cost",
			"Scalability",
			"Balanced trade-offs",
		])) ?? "Balanced trade-offs";

	return {
		goal,
		projectType,
		stack,
		architecture,
		designApproach,
		testStrategy,
		deployment,
		constraints,
	};
}

export default function planModeToggleExtension(pi: ExtensionAPI): void {
	let state: PlanModeState = { enabled: false };
	let planWrittenThisRun = false;
	let webEvidenceValidThisRun = false;
	let guardRecoveryQueued = false;

	async function setPlanModel(model: Model<Api>, ctx: ExtensionContext): Promise<void> {
		state.planModel = { provider: model.provider, id: model.id };
		persistState(pi, state);
		ctx.ui.notify(`Plan model set: ${model.provider}/${model.id}`, "info");
	}

	async function choosePlanModel(ctx: ExtensionContext): Promise<void> {
		const available = ctx.modelRegistry.getAvailable();
		if (available.length === 0) {
			ctx.ui.notify("No available models found (check API keys/login)", "warning");
			return;
		}

		const scoped = getUserScopedModels();
		const scopedAvailable = available.filter((m) => scoped.has(modelKey(m)));
		const options = [...new Set(scopedAvailable.map((m) => modelKey(m)))];

		if (options.length === 0) {
			if (ctx.model) {
				await setPlanModel(ctx.model, ctx);
				ctx.ui.notify(`No scoped available models found, using current model: ${ctx.model.provider}/${ctx.model.id}`, "info");
			}
			return;
		}

		const selected = await ctx.ui.select("Select plan model (scoped models only, Esc = current model)", options);
		if (!selected) {
			if (ctx.model) {
				await setPlanModel(ctx.model, ctx);
				ctx.ui.notify(`No model selected, using current model: ${ctx.model.provider}/${ctx.model.id}`, "info");
			}
			return;
		}

		const [provider, ...idParts] = selected.split("/");
		const id = idParts.join("/");
		const model = ctx.modelRegistry.find(provider, id);
		if (!model) {
			ctx.ui.notify(`Model not found: ${selected}`, "error");
			return;
		}
		await setPlanModel(model, ctx);
	}

	async function enablePlanMode(ctx: ExtensionContext, promptOverride?: string): Promise<boolean> {
		if (state.enabled) {
			ctx.ui.notify("Plan mode is already ON", "info");
			return true;
		}

		const braveDiagnostic = getBraveSearchDiagnostic(pi);
		if (braveDiagnostic) {
			ctx.ui.notify(braveDiagnostic, "error");
			return false;
		}

		const pendingPrompt = promptOverride ?? (ctx.hasUI ? ctx.ui.getEditorText().trim() : "");

		if (!state.planModel) {
			await choosePlanModel(ctx);
			if (!state.planModel) {
				ctx.ui.notify("Plan mode requires a plan model", "warning");
				return false;
			}
		}

		const model = ctx.modelRegistry.find(state.planModel.provider, state.planModel.id);
		if (!model) {
			ctx.ui.notify(`Configured plan model not found: ${state.planModel.provider}/${state.planModel.id}`, "error");
			return false;
		}

		if (ctx.model) {
			state.previousModel = { provider: ctx.model.provider, id: ctx.model.id };
		}

		const switched = await pi.setModel(model);
		if (!switched) {
			ctx.ui.notify(`Could not switch to plan model ${state.planModel.provider}/${state.planModel.id}`, "error");
			return false;
		}

		const answers = await askMandatoryQuestions(ctx, pendingPrompt);
		if (!answers) {
			state.awaitingPrompt = false;
			if (state.previousModel) {
				const previous = ctx.modelRegistry.find(state.previousModel.provider, state.previousModel.id);
				if (previous) {
					await pi.setModel(previous);
				}
			}
			if (pendingPrompt && ctx.hasUI) ctx.ui.setEditorText(pendingPrompt);
			ctx.ui.notify("Plan mode cancelled (questionnaire incomplete)", "warning");
			return false;
		}

		state.answers = answers;
		state.enabled = true;
		state.awaitingPrompt = false;
		updateStatus(ctx, true);
		persistState(pi, state);
		ctx.ui.notify("Plan mode enabled", "info");

		if (pendingPrompt) {
			if (ctx.hasUI) ctx.ui.setEditorText("");
			pi.sendUserMessage(pendingPrompt);
		}
		return true;
	}

	async function disablePlanMode(ctx: ExtensionContext): Promise<void> {
		if (!state.enabled) {
			ctx.ui.notify("Plan mode is already OFF", "info");
			return;
		}
		state.enabled = false;
		state.awaitingPrompt = false;
		state.answers = undefined;

		if (state.previousModel) {
			const previous = ctx.modelRegistry.find(state.previousModel.provider, state.previousModel.id);
			if (previous) {
				await pi.setModel(previous);
			}
		}

		updateStatus(ctx, false, false);
		persistState(pi, state);
		ctx.ui.notify("Plan mode disabled", "info");
	}

	pi.registerShortcut("ctrl+q", {
		description: "Toggle plan mode",
		handler: async (ctx) => {
			if (state.enabled) {
				await disablePlanMode(ctx);
				return;
			}

			if (state.awaitingPrompt) {
				state.awaitingPrompt = false;
				persistState(pi, state);
				updateStatus(ctx, false, false);
				ctx.ui.notify("Plan mode disarmed", "info");
				return;
			}

			const pendingPrompt = ctx.hasUI ? ctx.ui.getEditorText().trim() : "";
			if (pendingPrompt) {
				await enablePlanMode(ctx);
				return;
			}

			state.awaitingPrompt = true;
			persistState(pi, state);
			updateStatus(ctx, false, true);
			ctx.ui.notify("Plan mode armed. Type your prompt and submit to start the survey.", "info");
		},
	});

	pi.registerCommand("plan-mode", {
		description: "Plan mode control: on | off | status",
		handler: async (args, ctx) => {
			const cmd = args?.trim().toLowerCase();
			if (!cmd || cmd === "status") {
				ctx.ui.notify(`Plan mode: ${state.enabled ? "ON" : "OFF"}`, "info");
				updateStatus(ctx, state.enabled, state.awaitingPrompt === true);
				return;
			}
			if (cmd === "on") {
				await enablePlanMode(ctx);
				return;
			}
			if (cmd === "off") {
				await disablePlanMode(ctx);
				return;
			}
			ctx.ui.notify("Usage: /plan-mode on|off|status", "warning");
		},
	});

	pi.registerCommand("plan-model", {
		description: "Select or set the dedicated planning model",
		getArgumentCompletions: (prefix) => {
			return ["select"].filter((x) => x.startsWith(prefix)).map((x) => ({ value: x, label: x }));
		},
		handler: async (args, ctx) => {
			const value = args?.trim();
			if (!value || value === "select") {
				await choosePlanModel(ctx);
				return;
			}

			const [provider, ...idParts] = value.split("/");
			const id = idParts.join("/");
			if (!provider || !id) {
				ctx.ui.notify("Use /plan-model and pick from selector, or pass provider/model-id", "warning");
				return;
			}
			const model = ctx.modelRegistry.find(provider, id);
			if (!model) {
				ctx.ui.notify(`Unknown model: ${value}`, "error");
				return;
			}
			await setPlanModel(model, ctx);
		},
	});

	pi.on("agent_start", async () => {
		planWrittenThisRun = false;
		webEvidenceValidThisRun = false;
	});

	pi.on("tool_result", async (event, ctx) => {
		if (!state.enabled) return;
		if (event.isError) return;
		if (event.toolName !== "write" && event.toolName !== "edit") return;

		const input = event.input as { path?: string } | undefined;
		if (!input?.path) return;
		if (!/PLAN\.md$/i.test(input.path)) return;

		const absPath = resolve(ctx.cwd, input.path);
		if (!existsSync(absPath)) {
			if (ctx.hasUI) {
				ctx.ui.notify("Plan mode note: PLAN.md was not found after write/edit.", "warning");
			}
			return;
		}

		const content = readFileSync(absPath, "utf8");
		planWrittenThisRun = true;
		webEvidenceValidThisRun = hasWebEvidenceSection(content);
		if (webEvidenceValidThisRun) guardRecoveryQueued = false;

		const archiveResult = archivePlanCopy(ctx.cwd, content, state.answers?.goal);
		if (ctx.hasUI) {
			if (archiveResult.archived && archiveResult.path) {
				ctx.ui.notify(`Plan mode: archived PLAN.md to ${archiveResult.path}`, "success");
			} else if (archiveResult.error) {
				ctx.ui.notify(`Plan mode note: could not archive PLAN.md (${archiveResult.error})`, "warning");
			}
		}

		if (!webEvidenceValidThisRun && ctx.hasUI) {
			ctx.ui.notify("Plan mode note: add a 'Web Research Evidence' section with at least one URL.", "warning");
		}
	});

	pi.on("message_end", async (event, ctx) => {
		if (!state.enabled) return;
		if (event.message.role !== "assistant") return;
		if (planWrittenThisRun && webEvidenceValidThisRun) {
			guardRecoveryQueued = false;
			return;
		}

		const braveDiagnostic = getBraveSearchDiagnostic(pi);
		if (ctx.hasUI) {
			if (braveDiagnostic) {
				ctx.ui.notify(`Plan mode note: ${braveDiagnostic}`, "warning");
			} else {
				ctx.ui.notify("Plan mode note: complete PLAN.md with web evidence when possible.", "warning");
			}
		}
	});

	pi.on("before_agent_start", async (event) => {
		if (!state.enabled || !state.answers) return;
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\n[PLAN MODE ACTIVE]\nYou are in planning mode. Prioritize research and decision quality. Always use the brave_search tool for up-to-date official docs before finalizing stack/tool recommendations. Perform repo research for grounding. Use explicit assumptions/evidence/trade-offs.",
		};
	});

	pi.on("input", async (event, ctx) => {
		if (event.text.startsWith("/")) return { action: "continue" as const };

		if (state.awaitingPrompt && !state.enabled) {
			state.awaitingPrompt = false;
			persistState(pi, state);
			await enablePlanMode(ctx, event.text);
			return { action: "handled" as const };
		}

		if (!state.enabled || !state.answers) return { action: "continue" as const };
		return {
			action: "transform" as const,
			text: buildPlanPrompt(event.text, state.answers),
		};
	});

	pi.on("session_start", async (_event, ctx) => {
		const saved = ctx.sessionManager
			.getEntries()
			.filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === "plan-mode-state")
			.pop() as { data?: PlanModeState } | undefined;
		if (saved?.data) state = saved.data;
		updateStatus(ctx, state.enabled, state.awaitingPrompt === true);
	});
}
