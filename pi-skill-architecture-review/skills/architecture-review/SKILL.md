---
name: architecture-review
description: Agents should invoke this skill for architecture reviews, module boundaries, dependency direction, coupling/cohesion, SOLID concerns, system design trade-offs, layering, service boundaries, or design decisions before implementation.
---

# Architecture Review

Structured architecture review for the user's projects. Evaluates module boundaries, dependency graphs, coupling/cohesion, and adherence to design principles.

## Quick Start

### Run a Quick Architecture Check

For a single module or component:

1. **Map the structure:** What modules/components exist? How are they organized?
2. **Trace dependencies:** Who depends on whom? Are there cycles?
3. **Assess coupling:** How tightly are modules connected? Can you change one without breaking others?
4. **Evaluate cohesion:** Does each module have a single, clear responsibility?
5. **Recommend:** Prioritized findings with rationale

---

## Architecture Review Checklist

### Module Boundaries

- [ ] Each module has a clear, single responsibility
- [ ] Public APIs are minimal — expose only what's needed
- [ ] Internal implementation details are hidden (encapsulation)
- [ ] Module names accurately describe their responsibility
- [ ] No "God module" that does everything

### Dependency Analysis

- [ ] Dependencies flow in one direction (no cycles)
- [ ] High-level modules don't depend on low-level implementation details
- [ ] External dependencies are isolated behind abstractions
- [ ] Dependency count per module is reasonable (< 7 direct deps as guideline)

### Coupling Assessment

| Coupling Type | Description | Severity |
|---|---|---|
| Content coupling | Module directly accesses internals of another | Critical |
| Common coupling | Modules share global mutable state | High |
| Control coupling | Module controls flow of another via flags | Medium |
| Stamp coupling | Modules share complex data structures | Low-Medium |
| Data coupling | Modules share only necessary data | Acceptable |
| Message coupling | Modules communicate via messages/events | Best |

### Cohesion Assessment

| Cohesion Type | Description | Quality |
|---|---|---|
| Coincidental | Elements grouped arbitrarily | Poor |
| Logical | Elements grouped by category, not function | Poor |
| Temporal | Elements grouped by when they execute | Fair |
| Procedural | Elements grouped by execution order | Fair |
| Communicational | Elements operate on same data | Good |
| Sequential | Output of one is input of next | Good |
| Functional | All elements contribute to a single task | Best |

---

## Language-Specific Review

### Rust Module Trees

```bash
# Visualize module structure
cargo tree --depth 1

# Check for circular dependencies
cargo tree --duplicates

# Analyze dependency weight
cargo tree --edges features
```

**Key checks:**
- `mod.rs` vs named modules — prefer named modules (`module_name.rs`) over `mod.rs` for clarity
- `pub` vs `pub(crate)` — minimize public surface, prefer `pub(crate)` for workspace-internal APIs
- Trait boundaries — are traits cohesive? Does each trait represent one capability?
- Error types — one error enum per module, or shared error type with variants per module?
- Re-exports — `pub use` in `lib.rs` should form a clean public API

### React Component Hierarchies

```bash
# Analyze component tree (manual or via React DevTools)
# Check for deep prop drilling
# Verify state ownership lives at the right level
```

**Key checks:**
- Component depth — deeply nested components suggest missing abstractions
- Prop drilling — if props pass through 3+ levels, consider context or composition
- State colocation — state should live as close to where it's used as possible
- Component responsibility — one component, one job. If it has "and" in its description, split it
- Hook composition — custom hooks should encapsulate one behavior

### Django App Structure

```bash
# List apps and their models
python manage.py showmigrations

# Check for circular imports
python -c "import myapp"  # Will error on circular imports
```

**Key checks:**
- App boundaries — each Django app should be independently understandable
- Fat models vs fat views — prefer logic in models/services, not views
- Circular imports — usually a sign of misplaced boundaries
- Manager vs queryset methods — use managers for creation, querysets for filtering
- Signal usage — signals obscure control flow; prefer explicit calls for important logic

---

## SOLID Principles Check

| Principle | Question | Red Flag |
|---|---|---|
| **S**ingle Responsibility | Does this module have one reason to change? | Module changes for unrelated features |
| **O**pen/Closed | Can you extend behavior without modifying existing code? | Every new feature requires editing core modules |
| **L**iskov Substitution | Can subtypes replace their base type without breaking things? | Subclasses override methods with incompatible behavior |
| **I**nterface Segregation | Are interfaces focused and minimal? | Implementors must stub out methods they don't need |
| **D**ependency Inversion | Do high-level modules depend on abstractions, not details? | Business logic imports database drivers directly |

---

## Review Output Template

When delivering an architecture review, use this structure:

```markdown
## Architecture Review: [Project/Module]

**Date:** YYYY-MM-DD
**Reviewer:** Arc
**Scope:** [What was reviewed]

### Summary
[1-2 sentences: overall health and key takeaway]

### Module Map
[Describe the current structure — list modules, their responsibilities, and key relationships]

### Findings

| # | Severity | Area | Finding | Recommendation |
|---|---|---|---|---|
| 1 | High | Coupling | Module A directly accesses B internals | Extract interface, use dependency injection |

### Positive Observations
[What's already well-designed]

### Dependency Graph Notes
[Key observations about dependency flow]

### Recommendations
1. [Prioritized by impact and effort]

### Tech Debt Identified
[New items for the debt registry, if any]
```

---

## Integration

- **Data:** Architecture decisions logged to `MEMORY.md`
- **Cross-reference:** Check `../workspace-security/MEMORY.md` for security-relevant architecture notes
- **Security flag:** If architectural issues create security concerns (missing trust boundaries, shared state across security domains), flag to Zero

---

_Arc skill — Architecture review and design assessment_
