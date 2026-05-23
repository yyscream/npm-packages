---
description: Fix a reported issue end-to-end with focused changes and verification.
argument-hint: "[issue/context]"
---

Fix the reported issue end-to-end.

Issue/context: `$ARGUMENTS`

Workflow:
1. Reproduce or infer likely failure path.
2. Implement minimal, correct patch.
3. Run relevant checks/tests.
4. Summarize root cause + fix + verification.

Constraints:
- Keep changes focused.
- Avoid unrelated refactors unless required.
- If blocked, explain exactly what's missing.
