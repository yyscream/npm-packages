---
name: acceptance-tester
description: Agents should invoke this skill as the final gate before release, handoff, or claiming completion for substantial changes. Runs acceptance/readiness checks, determines pass/fail, and gives a go/no-go recommendation.
---

# Acceptance Tester

Final quality gate — determines whether a project is ready to proceed.

## Acceptance Criteria Source

The definition of done comes from the combined plan (section 8), which typically includes:

- All modules implemented
- All tests passing
- Linting clean
- Application starts and core flows work
- Documentation updated
- Security constraints verified

## Acceptance Checklist

Run through this checklist systematically:

### 1. Build Verification
- [ ] Project builds without errors
- [ ] No compiler/linter warnings (or all are documented exceptions)
- [ ] All dependencies resolve correctly

### 2. Test Suite
- [ ] Full test suite passes (`cargo test` / `npm test` / `pytest`)
- [ ] Coverage meets target from combined plan (default: 80%)
- [ ] No skipped or ignored tests without documented reason

### 3. Core Flow Verification
For each core user flow defined in the spec:
- [ ] Happy path works end-to-end
- [ ] Primary error paths handled gracefully
- [ ] Data persists correctly across operations

### 4. Spec Completeness
- [ ] All P0 spec requirements verified (from spec-vs-impl checker)
- [ ] No Blocker or Critical bugs outstanding
- [ ] All Major bugs either fixed or explicitly deferred with user approval

### 5. Security Constraints
For each constraint from Zero's review:
- [ ] Constraint is implemented
- [ ] Constraint is tested
- [ ] No obvious bypasses found during functional testing

### 6. Integration Points
- [ ] Cross-module integrations work correctly
- [ ] Error propagation across module boundaries is handled
- [ ] Data format consistency across interfaces

## Verdict Determination

### PASS — Ready for Next Phase
All of these must be true:
- Build succeeds
- All tests pass
- Coverage target met
- Zero Blocker bugs
- Zero Critical bugs
- All P0 spec requirements verified
- All security constraints verified

### CONDITIONAL PASS
- Minor or some Major bugs remain but none are blockers
- User has approved deferring specific issues to v2
- Core flows work, edge cases may have issues

### FAIL — Return to Forge
Any of these triggers a fail:
- Build fails
- Tests fail
- Blocker bugs found
- Critical bugs found
- P0 spec requirement missing or broken
- Security constraint not met

## Output Format

```markdown
# Acceptance Test Report — <Project Name>

**Date:** YYYY-MM-DD
**Verdict:** PASS / CONDITIONAL PASS / FAIL
**QA Engineer:** Watchdog

## Checklist Results

| Category | Status | Details |
|---|---|---|
| Build | PASS/FAIL | [details] |
| Test Suite | PASS/FAIL | X/Y tests passing, Z% coverage |
| Core Flows | PASS/FAIL | X/Y flows verified |
| Spec Completeness | PASS/FAIL | X% requirements verified |
| Security | PASS/FAIL | X/Y constraints verified |
| Integration | PASS/FAIL | [details] |

## Outstanding Issues

| Bug | Severity | Status | Decision |
|---|---|---|---|
| BUG-003 | Minor | OPEN | Deferred to v2 |

## Recommendation

[PASS]: Project is ready for documentation (Ink) and release.
[CONDITIONAL PASS]: Project can proceed with noted caveats.
[FAIL]: Return to Forge. Fix items: [list].
```

## Handoff

- **On PASS:** Control returns to Clawpick, who invokes Ink for documentation.
- **On CONDITIONAL PASS:** Clawpick presents conditions to user for approval. If approved, proceeds to Ink.
- **On FAIL:** Clawpick routes bug reports to Forge. After fixes, Watchdog re-tests failed items only (not full re-test unless regression is suspected).

---

_Watchdog skill — Acceptance testing and release readiness assessment_
