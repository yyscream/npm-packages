---
name: test-plan-generator
description: Agents should invoke this skill when planning tests from specs, architecture docs, PRs, risky changes, new features, bug fixes, or release work. Generates prioritized unit, integration, E2E, regression, and edge-case coverage.
---

# Test Plan Generator

Generate structured, prioritized test plans from spec and architecture documents.

## Inputs

- `projects/<project-name>/combined-plan.md` (primary source of truth)
- `projects/<project-name>/spec.md` (original requirements)
- `projects/<project-name>/architecture.md` (module boundaries and interfaces)
- Forge's completion report (existing test coverage)

## Process

### Step 1 — Extract Requirements

Read the combined plan and extract every testable requirement:

- Explicit acceptance criteria from the spec
- Interface contracts from the architecture
- Security constraints from Zero's review
- Error handling expectations
- Edge cases mentioned in the spec
- Non-functional requirements (performance, accessibility)

### Step 2 — Derive Test Cases

For each requirement, create one or more test cases:

```markdown
| ID | Requirement | Test Case | Category | Priority | Status |
|---|---|---|---|---|---|
| TC-001 | User can create account | Valid email + password creates account | E2E | P0 | Pending |
| TC-002 | User can create account | Duplicate email rejected with error | E2E | P0 | Pending |
| TC-003 | Email validation | Invalid format "foo@" rejected | Unit | P1 | Pending |
| TC-004 | Rate limit on login | 6th attempt within 1 min returns 429 | Integration | P1 | Pending |
```

### Step 3 — Prioritize

Use this priority scheme:

| Priority | Criteria | Examples |
|---|---|---|
| P0 (Must test) | Core user flows, data integrity, auth | Login, create, read, update, delete |
| P1 (Should test) | Error handling, edge cases, security functional | Invalid input, rate limits, empty states |
| P2 (Nice to test) | Boundary values, concurrent access, rare paths | Max-length input, simultaneous edits |
| P3 (If time allows) | Cosmetic, UX polish, accessibility | Layout consistency, keyboard navigation |

### Step 4 — Coverage Analysis

Compare test cases against spec requirements:

```markdown
## Coverage Matrix

| Spec Section | Requirements | Test Cases | Coverage |
|---|---|---|---|
| Authentication | 5 | 12 | 100% |
| User Profile | 3 | 6 | 100% |
| Data Export | 2 | 1 | 50% — missing error path tests |
```

## Output Format

```markdown
# Test Plan — <Project Name>

**Generated:** YYYY-MM-DD
**Spec Version:** [commit hash or date]
**Total Test Cases:** N
**Coverage:** X% of spec requirements mapped

## Test Cases by Priority

### P0 — Must Test
[Table of P0 test cases]

### P1 — Should Test
[Table of P1 test cases]

### P2 — Nice to Test
[Table of P2 test cases]

### P3 — If Time Allows
[Table of P3 test cases]

## Coverage Gaps

[List of spec requirements without test cases]

## Test Execution Order

1. [Recommended execution sequence based on dependencies]
```

---

_Watchdog skill — Test plan generation and coverage analysis_
