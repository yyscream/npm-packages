---
name: tech-debt-tracker
description: Agents should invoke this skill when identifying, categorizing, prioritizing, or planning technical debt work, debt sprints, cleanup backlogs, TODO consolidation, or long-term maintainability risks. Tracks debt with severity/effort.
---

# Tech Debt Tracker

Systematic tracking and management of technical debt. Debt is not inherently bad — it's a trade-off. The problem is *untracked* debt that compounds silently.

## Quick Start

### Log a New Debt Item

When debt is identified (during reviews, development, or ad-hoc):

1. **Categorize:** What type of debt is it?
2. **Severity:** How much pain does it cause?
3. **Effort:** How much work to fix?
4. **Priority:** Severity vs effort — is it worth fixing now?
5. **Log:** Add to the registry in `MEMORY.md`

---

## Debt Categories

| Category | Description | Examples |
|---|---|---|
| **Architecture** | Structural issues that affect the whole system | Missing module boundaries, circular dependencies, wrong abstraction level |
| **Code** | Local code quality issues | Code smells, duplicated logic, overly complex functions, dead code |
| **Test** | Missing or inadequate test coverage | No tests for critical paths, brittle tests, missing edge case coverage |
| **Documentation** | Missing or outdated documentation | Undocumented public APIs, stale README, missing architecture docs |
| **Dependency** | Outdated or problematic dependencies | Deprecated libraries, unpatched CVEs, abandoned packages, version conflicts |

---

## Severity Levels

| Severity | Meaning | Impact |
|---|---|---|
| **Critical** | Blocks progress or causes recurring incidents | Developers work around it daily, causes bugs |
| **High** | Causes ongoing friction and slows development | Every feature touching this area takes longer |
| **Medium** | Noticeable but manageable | Annoyance, not a blocker. Occasional confusion. |
| **Low** | Cosmetic or minor | Cleanup opportunity, no functional impact |

---

## Effort Estimates

| Effort | Time | Scope |
|---|---|---|
| **S** | < 1 hour | Single function or file change |
| **M** | 1-4 hours | Multiple files, focused refactoring |
| **L** | 4-16 hours | Cross-module changes, possible API updates |
| **XL** | > 16 hours | Major restructuring, migration, or rewrite |

---

## Priority Matrix

Use severity + effort to determine action:

| | Effort S | Effort M | Effort L | Effort XL |
|---|---|---|---|---|
| **Critical** | Fix immediately | Fix this sprint | Plan and schedule | Plan, break into phases |
| **High** | Fix now (quick win) | Fix this sprint | Schedule within 2 weeks | Plan, break into phases |
| **Medium** | Fix when nearby | Schedule within 2 weeks | Backlog | Backlog (consider living with it) |
| **Low** | Fix if touching the file | Backlog | Backlog | Accept the debt |

**Quick wins** (High severity + S effort, or Critical + S/M effort) should be fixed as soon as possible — they deliver the most value per hour of investment.

---

## Debt Entry Format

When adding to the registry in `MEMORY.md`:

| Field | Description |
|---|---|
| ID | Incremental number (DEBT-001, DEBT-002, ...) |
| Project | Which project/codebase |
| Category | Architecture / Code / Test / Documentation / Dependency |
| Description | What the debt is and why it matters |
| Severity | Critical / High / Medium / Low |
| Effort | S / M / L / XL |
| Status | Open / In Progress / Resolved / Accepted |
| Discovered | Date the debt was identified |
| Resolved | Date it was fixed (if applicable) |

**Example entry:**

| ID | Project | Category | Description | Severity | Effort | Status | Discovered |
|---|---|---|---|---|---|---|---|
| DEBT-001 | tui-setup | Code | `app.rs` has cyclomatic complexity 32 in `handle_event` — needs decomposition | High | M | Open | 2026-02-14 |
| DEBT-002 | tui-setup | Test | No unit tests for parser module — refactoring is risky | High | L | Open | 2026-02-14 |

---

## Debt Review Cadence

### When to Review Debt

- **During code reviews:** Note new debt found during review
- **Start of major feature work:** Check if the area has known debt that should be addressed first
- **Monthly review:** Scan the registry for items that have changed priority (became more/less urgent)
- **After incidents:** Did the debt contribute? Escalate priority if so

### Monthly Debt Review Checklist

1. Scan the debt registry for stale items (resolved but not marked, or no longer relevant)
2. Re-assess priority of open items (has context changed?)
3. Identify quick wins that have accumulated
4. Propose a "debt sprint" if high-severity items are piling up
5. Archive resolved items (move to a "Resolved" section in MEMORY.md)

---

## Debt Reporting

### Debt Summary Report

When asked for a debt status report:

```markdown
## Tech Debt Summary: [Project]

**Date:** YYYY-MM-DD
**Total items:** N (C critical, H high, M medium, L low)

### Quick Wins Available
[S-effort items with High+ severity — easy fixes with big impact]

| ID | Description | Effort |
|---|---|---|
| DEBT-003 | ... | S |

### Top Priority Items
[Highest severity items regardless of effort]

| ID | Description | Severity | Effort |
|---|---|---|---|
| DEBT-001 | ... | Critical | M |

### Trend
[Is debt growing, shrinking, or stable? Any concerning patterns?]

### Recommendations
1. [Prioritized actions]
```

---

## Integration

- **Data:** Debt registry maintained in `MEMORY.md` (Tech Debt Registry section)
- **Cross-reference:** architecture-review (discovers structural debt), code-quality (discovers code debt), refactoring-advisor (plans debt remediation)
- **Security debt:** If debt has security implications (unpatched dependencies, missing input validation), flag to Zero

---

_Arc skill — Technical debt tracking and management_
