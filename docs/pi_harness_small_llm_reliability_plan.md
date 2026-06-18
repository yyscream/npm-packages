# Pi Agent Harness Plan: Small-LLM Reliability Layer

## Goal

Implement a harness layer that helps smaller LLMs stay focused during long-running tasks by moving memory, planning, verification, and loop-control out of the model and into deterministic system components.

The LLM should act as a worker. The harness should be the source of truth.

---

## Core Problem

Smaller LLMs often fail on long or multi-step tasks because they:

- Lose the original objective.
- Forget completed work.
- Repeat the same tool calls.
- Drift into unrelated tasks.
- Misread or ignore previous tool output.
- Prematurely declare success.
- Fail to update their plan after errors.

The fix is not only a better prompt. The harness must continuously manage task state, context, memory, validation, and execution flow.

---

## Architecture Overview

```text
User Request
    ↓
Task Initializer
    ↓
Persistent Task State
    ↓
Planner
    ↓
Execution Loop
    ├─ Context Builder
    ├─ LLM Worker
    ├─ Tool Executor
    ├─ State Updater
    ├─ Loop Detector
    └─ Verifier
    ↓
Final Response
```

---

## Phase 1 — Persistent Task State

### Objective

Create a structured state object that survives across every model call and tool invocation.

The model may forget the task. The task state must not.

### Task State Schema

```json
{
  "task_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "status": "planning | executing | blocked | verifying | complete | failed",
  "user_goal": "original user request",
  "normalized_goal": "clear restatement of the goal",
  "success_criteria": [],
  "constraints": [],
  "current_phase": "",
  "current_step_id": "",
  "plan": [],
  "completed_steps": [],
  "blocked_steps": [],
  "known_facts": [],
  "open_questions": [],
  "decisions": [],
  "tool_history": [],
  "files_touched": [],
  "errors": [],
  "next_action": "",
  "final_answer_requirements": []
}
```

### Implementation Tasks

- Create `TaskState` model.
- Store state in SQLite or local JSON.
- Add load/save/update helpers.
- Write state after every tool call.
- Write state after every model response.
- Include state diff logging for debugging.

### Acceptance Criteria

- A task can resume after interruption.
- The current goal is available before every LLM call.
- Completed steps are not lost.
- Errors and decisions remain visible throughout the task.

---

## Phase 2 — Explicit Planning System

### Objective

Force every non-trivial task through a structured plan before execution.

### Plan Schema

```json
{
  "step_id": "S1",
  "title": "Inspect repository structure",
  "description": "Find relevant files and project layout.",
  "status": "pending | in_progress | complete | blocked | skipped",
  "depends_on": [],
  "expected_output": "Repository summary",
  "verification": "Relevant files identified"
}
```

### Planning Rules

- Every task gets a plan unless it is trivial.
- Each action must map to a plan step.
- The model may propose plan changes, but the harness records them.
- The plan must include success criteria.
- The plan must include a verification step.

### Implementation Tasks

- Add `create_plan()` function.
- Add `update_plan_step()` function.
- Add `select_next_step()` function.
- Add prompt template for planning.
- Add prompt template for revising the plan after failures.

### Acceptance Criteria

- The agent can explain what step it is currently doing.
- No tool call happens without a related plan step.
- Failed steps are marked and handled instead of forgotten.

---

## Phase 3 — Goal Reminder Injection

### Objective

Before every LLM call, inject a compact reminder of the current task.

### Context Header Template

```text
PRIMARY GOAL:
{normalized_goal}

SUCCESS CRITERIA:
{success_criteria}

CURRENT STEP:
{current_step}

COMPLETED STEPS:
{completed_steps}

CONSTRAINTS:
{constraints}

DO NOT:
- Work on unrelated tasks.
- Repeat completed work.
- Claim completion without verification.
```

### Implementation Tasks

- Add `build_context_header(task_state)`.
- Insert context header before every model call.
- Keep reminder compact enough for small context windows.
- Prefer task state over raw chat history.

### Acceptance Criteria

- The current goal appears in every execution prompt.
- The model is reminded of already completed work.
- The model is explicitly warned against false completion.

---

## Phase 4 — Scratchpad Memory File

### Objective

Maintain a human-readable task scratchpad that summarizes the task outside the model context.

### File

```text
.pi/tasks/{task_id}/scratchpad.md
```

### Scratchpad Template

```markdown
# Task Scratchpad

## Goal

## Success Criteria

## Current Status

## Completed

## Current Problem

## Decisions

## Important Facts

## Files Touched

## Next Action
```

### Implementation Tasks

- Create scratchpad on task start.
- Update scratchpad after each major step.
- Inject scratchpad summary into context.
- Allow the user to inspect it.
- Allow the model to propose updates, but validate them through the harness.

### Acceptance Criteria

- The scratchpad accurately reflects current task state.
- The task can be resumed from the scratchpad and state file.
- The scratchpad does not grow without compression.

---

## Phase 5 — Context Builder and Compression

### Objective

Replace long raw conversation history with a curated context package.

### Context Package

```text
1. Goal reminder
2. Current plan step
3. Scratchpad summary
4. Relevant tool outputs
5. Relevant file snippets
6. Recent errors
7. Required response format
```

### Implementation Tasks

- Add `ContextBuilder` module.
- Rank context items by relevance.
- Summarize old tool outputs.
- Keep full logs on disk.
- Inject only relevant excerpts.
- Add token budget management.

### Acceptance Criteria

- Old irrelevant context is not blindly included.
- Important decisions remain available.
- Context stays small enough for local/smaller models.

---

## Phase 6 — Loop Detection

### Objective

Detect when the agent repeats itself and force a strategy change.

### Signals

Track repeated:

- Tool calls.
- File reads.
- Failed commands.
- Similar model outputs.
- Same plan step without progress.

### Example Rule

```text
If the same tool call with the same arguments occurs 3 times, interrupt and ask the model to choose a different strategy.
```

### Implementation Tasks

- Add `ActionHistory` tracker.
- Hash tool name + arguments.
- Detect repeated failed actions.
- Detect no-progress loops.
- Add loop warning prompt.
- Require the next action to be different after a loop warning.

### Acceptance Criteria

- The agent cannot endlessly read the same file.
- The agent cannot rerun the same failing command indefinitely.
- Loop warnings are stored in task state.

---

## Phase 7 — Verification Layer

### Objective

Prevent false completion by checking success criteria before final output.

### Verification Modes

- Checklist verification.
- Test command verification.
- File existence verification.
- Diff review.
- User-facing answer review.
- Optional second-model review.

### Verification Prompt

```text
Verify whether the task is complete.

Goal:
{goal}

Success Criteria:
{success_criteria}

Evidence:
{evidence}

For each criterion, answer:
- Passed / Failed / Unknown
- Evidence
- Remaining work
```

### Implementation Tasks

- Add `Verifier` module.
- Require evidence for each success criterion.
- Block final answer if critical criteria fail.
- Allow partial completion only if clearly disclosed.

### Acceptance Criteria

- The agent cannot mark a task complete without evidence.
- Missing criteria are reported clearly.
- Failed verification routes back to planning or execution.

---

## Phase 8 — Supervisor / Worker Split

### Objective

Improve small-model reliability by separating control from execution.

### Roles

```text
Supervisor
- Owns task state.
- Selects next step.
- Checks progress.
- Prevents drift.

Worker
- Performs one focused task.
- Uses tools.
- Returns structured result.

Verifier
- Checks whether the result satisfies the step.
```

### Worker Contract

```json
{
  "step_id": "S3",
  "action_taken": "",
  "result": "",
  "files_changed": [],
  "errors": [],
  "next_recommendation": "",
  "status": "complete | blocked | failed"
}
```

### Implementation Tasks

- Add role-specific prompt templates.
- Keep worker context narrow.
- Keep supervisor context strategic.
- Add structured worker output parsing.
- Let supervisor update task state, not worker directly.

### Acceptance Criteria

- Workers only receive the context needed for their step.
- Supervisor remains aware of the whole task.
- Step results are structured and verifiable.

---

## Phase 9 — Tool Result Normalization

### Objective

Make tool output easier for small models to use correctly.

### Strategy

Raw tool output should be converted into compact summaries before reinjection.

### Normalized Tool Result

```json
{
  "tool": "read_file",
  "arguments": {},
  "status": "success | error",
  "summary": "",
  "important_details": [],
  "artifacts": [],
  "next_relevance": "",
  "raw_log_path": ""
}
```

### Implementation Tasks

- Wrap all tool calls.
- Store raw output separately.
- Summarize long outputs.
- Extract errors and warnings.
- Attach tool result to current plan step.

### Acceptance Criteria

- Long logs do not flood the model context.
- Important errors remain visible.
- Tool output is traceable to plan steps.

---

## Phase 10 — User-Facing Progress Updates

### Objective

Keep the user informed without exposing low-level noise.

### Rules

Send updates when:

- A plan is created.
- A major phase completes.
- The task is blocked.
- Verification fails.
- The task is partially complete.

### Update Template

```text
Current focus: {current_step}
Completed: {recent_completion}
Next: {next_action}
```

### Implementation Tasks

- Add progress event emitter.
- Generate concise summaries from task state.
- Avoid repeating the same update.
- Do not expose internal scratchpad unless requested.

### Acceptance Criteria

- Users can understand what the agent is doing.
- Progress updates do not spam the user.
- Blockers are surfaced early.

---

## Phase 11 — Configuration

### Example Config

```toml
[reliability]
enabled = true
require_plan = true
require_verification = true
max_repeated_action = 3
scratchpad_enabled = true
context_budget_tokens = 6000
summarize_tool_output = true

[roles]
supervisor_model = "local-14b"
worker_model = "local-14b"
verifier_model = "local-14b"
allow_larger_verifier = true

[storage]
task_state_backend = "sqlite"
task_dir = ".pi/tasks"
```

### Implementation Tasks

- Add config section.
- Allow reliability mode to be enabled per task.
- Allow stricter mode for small models.
- Allow relaxed mode for large models.

---

## Phase 12 — Testing Strategy

### Test Scenarios

1. Long coding task with many files.
2. Research task with many sources.
3. Task with repeated tool failure.
4. Task where the model tries to declare success early.
5. Task interrupted and resumed later.
6. Task with changed user requirements mid-run.
7. Task with irrelevant tempting context.

### Metrics

Track:

- Task completion rate.
- Number of repeated actions.
- Number of false completions.
- Number of successful resumptions.
- Average context size.
- Number of plan revisions.
- Tool calls per completed step.

### Acceptance Criteria

- Fewer repeated tool calls.
- Fewer false completions.
- Better resume behavior.
- Smaller effective context.
- More reliable small-model performance.

---

## Minimal MVP

Build these first:

1. `TaskState`
2. Plan creation
3. Goal reminder injection
4. Scratchpad file
5. Loop detection
6. Verification checklist

This MVP already solves the most common small-model failures.

---

## Suggested File Structure

```text
pi/
  reliability/
    __init__.py
    task_state.py
    planner.py
    context_builder.py
    scratchpad.py
    loop_detector.py
    verifier.py
    tool_wrapper.py
    progress.py
    prompts/
      planner.md
      executor.md
      verifier.md
      loop_warning.md
  tasks/
    {task_id}/
      state.json
      scratchpad.md
      tool_logs/
      artifacts/
```

---

## Example Execution Loop

```python
def run_task(task_id: str):
    state = load_task_state(task_id)

    if not state.plan:
        state.plan = create_plan(state)
        save_task_state(state)

    while state.status not in ["complete", "failed"]:
        step = select_next_step(state)
        state.current_step_id = step.step_id

        context = build_context_package(state, step)
        result = call_worker_model(context)

        normalized_result = normalize_worker_result(result)
        update_task_state(state, normalized_result)
        update_scratchpad(state)

        if detect_loop(state):
            inject_loop_warning(state)
            continue

        verification = verify_step(state, step)
        update_task_state(state, verification)

        if all_success_criteria_met(state):
            final_verification = verify_task_completion(state)
            if final_verification.passed:
                state.status = "complete"
            else:
                state.status = "executing"

        save_task_state(state)

    return build_final_response(state)
```

---

## Final Design Principle

Do not make the smaller model remember the task.

Make the harness remember, constrain, verify, summarize, and recover.

The model should only decide the next focused action inside a controlled loop.
