---
name: bug-reporter
description: Agents should invoke this skill when defects, regressions, failed tests, unexpected behavior, or spec mismatches are found. Produces structured reproducible bug reports with severity, evidence, environment, and actionable next steps.
---

# Bug Reporter

Produce clear, actionable, reproducible bug reports.

## Bug Report Template

Every bug report follows this exact structure:

```markdown
## BUG-<number>: <Short descriptive title>

**Severity:** Blocker / Critical / Major / Minor
**Module:** <module name from architecture>
**Spec Reference:** <requirement ID or spec section>
**Found During:** <test case ID or manual testing description>

### Reproduction Steps

**Preconditions:**
- [Required state, configuration, or setup]

**Steps:**
1. [Exact step]
2. [Exact step]
3. [Exact step — this triggers the bug]

### Expected Result

[What the spec says should happen, with spec section reference]

### Actual Result

[What actually happens]

**Evidence:**
- Error message: `<exact error text>`
- Log output: `<relevant log lines>`
- Test output: `<test failure details>`

### Environment

- OS: [if relevant]
- Runtime: [Node version, Rust toolchain, Python version]
- Configuration: [relevant config settings]
- Database state: [if relevant]

### Analysis

**Likely root cause:** [Brief assessment if obvious, "Unknown" if not]
**Related bugs:** [BUG-XXX if related]
**Workaround:** [If one exists, describe it. Otherwise "None known."]
```

## Severity Classification

### Blocker
- Application crashes or won't start
- Data loss or corruption
- Core user flow completely broken (can't login, can't save)
- Security bypass (flag to Zero as well)

### Critical
- Major feature doesn't work
- No workaround available
- Affects majority of users
- Spec requirement completely unmet

### Major
- Feature partially broken
- Workaround exists but is inconvenient
- Affects specific user scenarios
- Edge case in a core flow

### Minor
- Cosmetic or display issue
- Typo in user-facing text
- Non-critical edge case
- Unexpected but harmless behavior

## Bug Numbering

Within a QA pass, bugs are numbered sequentially: BUG-001, BUG-002, etc.
If re-testing after fixes, new bugs continue the sequence (BUG-005, BUG-006).
Fixed bugs keep their original number — mark them as FIXED in the report.

## Bug Summary Table

At the top of every QA report, include a summary:

```markdown
| Bug | Severity | Module | Status | Summary |
|---|---|---|---|---|
| BUG-001 | Critical | auth | OPEN | Login fails with valid credentials |
| BUG-002 | Major | profile | OPEN | Avatar upload accepts files > 10MB |
| BUG-003 | Minor | ui | OPEN | Footer overlaps on mobile viewport |
```

## Re-test Protocol

When Forge fixes a bug:

1. Pull the latest code
2. Reproduce using the original steps — verify the bug is fixed
3. Run the related test cases — verify no regressions
4. Update the bug status: OPEN → FIXED
5. If the fix introduced a new bug, file it as a new BUG-XXX

---

_Watchdog skill — Structured bug reporting and severity classification_
