---
name: spec-vs-impl-checker
description: Agents should invoke this skill when a spec, plan, README, issue, or requirement must be verified against implementation. Traces requirements to code, checks interface contracts, and reports gaps or mismatches.
---

# Spec-vs-Implementation Checker

Systematically verify that every specification requirement is implemented correctly.

## Process

### Step 1 — Build Requirement Registry

Extract every requirement from the spec and combined plan into a structured registry:

```markdown
| Req ID | Source | Section | Requirement | Type |
|---|---|---|---|---|
| REQ-001 | spec.md | 4.1 | Users can register with email/password | Functional |
| REQ-002 | spec.md | 4.1 | Email must be validated (format + uniqueness) | Validation |
| REQ-003 | combined-plan.md | 2 | Passwords hashed with bcrypt (cost 12) | Security |
| REQ-004 | architecture.md | 3.2 | Auth module exposes /api/auth/* endpoints | Interface |
```

### Step 2 — Trace to Implementation

For each requirement, find the implementing code:

```markdown
| Req ID | Implementation | File(s) | Test(s) | Status |
|---|---|---|---|---|
| REQ-001 | register() handler | src/auth/handlers.rs:45 | test_register | VERIFIED |
| REQ-002 | validate_email() | src/auth/validation.rs:12 | test_email_validation | VERIFIED |
| REQ-003 | hash_password() | src/auth/crypto.rs:8 | — | UNTESTED |
| REQ-004 | router config | src/auth/mod.rs:20 | test_auth_routes | VERIFIED |
```

### Step 3 — Verify Each Requirement

For each traced requirement:

1. **Read the code** — Does the implementation match what the spec describes?
2. **Check the tests** — Is there a test that verifies this specific requirement?
3. **Run the test** — Does the test actually pass?
4. **Check edge cases** — Does the implementation handle the edge cases the spec implies?

Status values:

| Status | Meaning |
|---|---|
| VERIFIED | Implemented correctly, tested, test passes |
| IMPLEMENTED | Code exists but no specific test |
| UNTESTED | Code exists, test exists but doesn't cover this requirement |
| PARTIAL | Partially implemented (e.g., happy path only, missing error handling) |
| MISSING | No implementation found for this requirement |
| DEVIATED | Implementation differs from spec (document how) |

### Step 4 — Interface Contract Verification

For each module interface defined in the architecture:

- Verify the interface exists as specified (endpoints, function signatures, types)
- Verify error contracts (what errors can be returned, in what format)
- Verify data contracts (request/response shapes match the architecture doc)
- Test cross-module integration points

### Step 5 — Generate Traceability Report

```markdown
# Spec-vs-Implementation Report — <Project Name>

**Date:** YYYY-MM-DD
**Spec Requirements:** N
**Verified:** X (Y%)
**Partial/Missing:** Z

## Requirement Traceability Matrix

[Full table from steps 1-3]

## Interface Contract Status

[Table of module interfaces and their verification status]

## Gaps Found

### Missing Implementations
- REQ-XXX: [description, severity]

### Deviations from Spec
- REQ-YYY: Spec says [X], implementation does [Y]. Impact: [assessment]

### Untested Requirements
- REQ-ZZZ: Implemented but no test coverage
```

## When to Escalate

- **Missing implementation** → Bug report to Forge
- **Spec ambiguity** → Flag to Clawpick for Sage/Prism clarification
- **Architecture deviation** → Flag to Arc
- **Security constraint not met** → Flag to Zero

---

_Watchdog skill — Spec-vs-implementation traceability and verification_
