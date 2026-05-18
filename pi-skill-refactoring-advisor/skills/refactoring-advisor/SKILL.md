---
name: refactoring-advisor
description: Agents should invoke this skill for refactors, code smells, migrations, duplication removal, module splitting, API cleanup, or restructuring plans. Emphasizes small safe steps, behavior preservation, and verification after each change.
---

# Refactoring Advisor

Systematic code smell detection and safe refactoring planning. Every refactoring plan ensures the codebase compiles and passes tests at every intermediate step.

## Quick Start

### Identify and Plan a Refactoring

1. **Detect the smell:** What's wrong and why does it matter?
2. **Assess the risk:** What could break? How large is the blast radius?
3. **Check test coverage:** Are the affected areas covered? If not, add tests first.
4. **Plan incremental steps:** Each step should leave the code in a working state.
5. **Estimate effort:** Size the work (S/M/L/XL) and identify dependencies.

---

## Common Code Smells by Language

### Rust

| Smell | Description | Refactoring |
|---|---|---|
| God struct | One struct with too many fields/methods | Extract into smaller, focused structs |
| Unnecessary clones | `.clone()` where borrowing would work | Replace with borrows, use lifetimes |
| Stringly typed | Using `String` where an enum fits | Introduce enum with `From` impls |
| Match explosion | Huge `match` blocks that grow with every variant | Extract match arms into methods, use trait dispatch |
| Unwrap sprawl | `.unwrap()` scattered through non-test code | Replace with `?` operator, proper error handling |
| Leaky abstraction | `pub` on internal implementation details | Reduce to `pub(crate)` or `pub(super)` |
| Monolithic `lib.rs` | Everything in one file | Split into focused modules |
| Over-generic | Generics where a concrete type suffices | Simplify to concrete types until generics are needed |

### TypeScript / React

| Smell | Description | Refactoring |
|---|---|---|
| Prop drilling | Props passed through 3+ component levels | Extract to context, composition, or custom hook |
| God component | Component with 200+ lines or multiple responsibilities | Split into focused components |
| Barrel file bloat | Index files re-exporting everything | Direct imports, remove barrel files |
| Any escape hatch | `as any` or `// @ts-ignore` hiding type issues | Fix the types, use type guards or discriminated unions |
| useEffect spaghetti | Multiple unrelated effects in one component | Split effects, extract to custom hooks |
| Inline styles sprawl | Styles defined inline instead of using design system | Extract to CSS modules, Tailwind classes, or styled components |
| Callback prop chains | Passing callbacks through many layers | Use context or state management |
| State duplication | Same data stored in multiple state variables | Derive computed values, single source of truth |

### Django / Python

| Smell | Description | Refactoring |
|---|---|---|
| Fat views | Business logic in views instead of services | Extract to service layer |
| Circular imports | Modules importing each other | Restructure boundaries, use lazy imports |
| God model | One model with 20+ fields and many methods | Split into related models, use composition |
| N+1 queries | Database queried in a loop | Add `select_related()` / `prefetch_related()` |
| Magic strings | Hardcoded strings for choices, status, etc. | Use `TextChoices` / `IntegerChoices` enums |
| Untyped functions | Missing type hints on public functions | Add type annotations, run mypy |
| Test-free code | No tests for critical business logic | Add tests before refactoring |
| Signal spaghetti | Complex logic hidden in Django signals | Replace with explicit method calls |

---

## Refactoring Safety Protocol

### Before Any Refactoring

1. **Verify test coverage.** Run existing tests. If the area being refactored has no tests, write characterization tests first.
2. **Create a checkpoint.** Ensure all changes are committed. The refactoring starts from a clean state.
3. **Define the end state.** What does "done" look like? How will you verify success?

### During Refactoring

1. **One change at a time.** Each commit should be a single, focused refactoring step.
2. **Compile after every change.** (`cargo check`, `tsc --noEmit`, `python -m py_compile`)
3. **Run tests after every change.** If tests fail, fix before proceeding.
4. **No behavior changes.** Refactoring changes structure, not behavior. If behavior must change, do it in a separate step.

### After Refactoring

1. **Full test suite passes.**
2. **Clippy / ESLint / Ruff clean.** No new warnings introduced.
3. **Review the diff.** Does the change accomplish what was intended? Any accidental behavior changes?

---

## Refactoring Plan Template

When proposing a refactoring, use this structure:

```markdown
## Refactoring Plan: [Description]

**Target:** [File/module/component]
**Smell:** [What's wrong]
**Goal:** [What "done" looks like]
**Risk:** Low / Medium / High
**Effort:** S / M / L / XL
**Test coverage:** Adequate / Needs improvement first

### Pre-requisites
- [ ] Tests pass on current code
- [ ] [Any additional pre-reqs]

### Steps

1. **[Step 1 description]**
   - Files affected: [list]
   - Verification: `cargo check && cargo test`

2. **[Step 2 description]**
   - Files affected: [list]
   - Verification: `cargo check && cargo test`

[... more steps ...]

### Rollback
If issues arise: `git revert` to the last passing commit.

### Success Criteria
- [ ] All tests pass
- [ ] No new clippy/lint warnings
- [ ] [Specific architectural improvement verified]
```

---

## Migration Strategies

### Pattern: Strangler Fig

For gradually replacing a legacy module:

1. Create the new module alongside the old one
2. Route new features through the new module
3. Gradually migrate existing callers
4. Remove the old module when all callers are migrated

**Best for:** Large-scale replacements where a clean cut is risky.

### Pattern: Branch by Abstraction

For replacing an implementation behind an interface:

1. Introduce an abstraction (trait/interface) over the current implementation
2. Update callers to use the abstraction
3. Implement the new version behind the same abstraction
4. Switch the wiring (dependency injection, feature flag)
5. Remove the old implementation

**Best for:** Swapping implementations (database, API client, algorithm).

### Pattern: Parallel Change (Expand-Contract)

For changing a widely-used interface:

1. **Expand:** Add the new interface alongside the old one
2. **Migrate:** Update callers one by one to use the new interface
3. **Contract:** Remove the old interface

**Best for:** API changes, function signature updates, data structure migrations.

---

## Integration

- **Data:** Refactoring plans and outcomes logged to `MEMORY.md`
- **Tests:** Always verify test coverage before and after. Use `cargo test -- --test-threads=1`, `bun test`, or `uv run pytest`
- **Tech debt:** If a refactoring is deferred, add it to the tech debt registry in `MEMORY.md`

---

_Arc skill — Refactoring strategies and code smell detection_
