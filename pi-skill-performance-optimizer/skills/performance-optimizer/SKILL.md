---
name: performance-optimizer
description: Agents should invoke this skill for slow code, high CPU/memory, latency, large data processing, algorithmic complexity, profiling plans, benchmarks, or optimization requests. Profiles first and weighs trade-offs before changing code.
---

# Performance Optimizer

Evidence-based performance optimization. Never optimize without profiling first. Every optimization comes with a trade-off analysis.

## Quick Start

### Investigate a Performance Issue

1. **Reproduce:** Can you reliably reproduce the slowness? What are the conditions?
2. **Measure:** Profile to find the actual bottleneck. Don't guess.
3. **Analyze:** What's the root cause? Algorithm? I/O? Memory? Contention?
4. **Propose:** 2-3 options with trade-offs (speed vs readability, memory vs CPU, etc.)
5. **Verify:** After optimization, re-measure to confirm improvement.

**The cardinal rule:** Profile first, optimize second. Gut feelings about performance are wrong more often than right.

---

## Profiling Toolkits

### Rust

| Tool | Purpose | Command |
|---|---|---|
| `cargo bench` | Micro-benchmarks (criterion) | `cargo bench` |
| `cargo flamegraph` | CPU flamegraph visualization | `cargo flamegraph --bin <name>` |
| `perf` | Linux perf events | `perf record --call-graph dwarf ./target/release/<bin>` |
| `valgrind --tool=callgrind` | Instruction-level profiling | `valgrind --tool=callgrind ./target/release/<bin>` |
| `cargo bloat` | Binary size analysis | `cargo bloat --release` |
| DHAT (via valgrind) | Heap allocation profiling | `valgrind --tool=dhat ./target/release/<bin>` |

**Quick benchmark setup with criterion:**

```rust
// benches/my_bench.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn benchmark_function(c: &mut Criterion) {
    c.bench_function("descriptive name", |b| {
        b.iter(|| {
            // code to benchmark
        })
    });
}

criterion_group!(benches, benchmark_function);
criterion_main!(benches);
```

### TypeScript / React

| Tool | Purpose | How |
|---|---|---|
| React DevTools Profiler | Component render timing | Browser extension, Profiler tab |
| Lighthouse | Overall web performance | Chrome DevTools > Lighthouse |
| `console.time()` / `console.timeEnd()` | Quick timing | Wrap suspicious code |
| webpack-bundle-analyzer | Bundle size analysis | `bun run build --analyze` |
| `performance.mark()` / `performance.measure()` | Web Performance API | Precise timing of code sections |
| React `<Profiler>` component | Programmatic render profiling | Wrap components in `<Profiler>` |

**Key React performance checks:**
- Unnecessary re-renders (use React DevTools "Highlight updates")
- Large component trees re-rendering from state at the top
- Missing `useMemo` / `useCallback` for expensive computations or stable references
- Bundle size — are you importing entire libraries for one function?

### Django / Python

| Tool | Purpose | Command |
|---|---|---|
| `django-debug-toolbar` | SQL queries, template timing | Add to INSTALLED_APPS |
| `cProfile` | Function-level profiling | `python -m cProfile -s cumtime manage.py <command>` |
| `py-spy` | Sampling profiler (no code changes) | `py-spy record -o profile.svg -- python manage.py runserver` |
| `silk` | Django request/response profiling | Add to middleware |
| `memory_profiler` | Line-by-line memory usage | `@profile` decorator |
| `django.db.connection.queries` | Raw SQL query log | `from django.db import connection; print(connection.queries)` |

**Key Django performance checks:**
- N+1 queries (use `django-debug-toolbar` or `assertNumQueries` in tests)
- Missing database indexes on filtered/ordered columns
- Unoptimized querysets (use `.only()`, `.defer()`, `.values()` when appropriate)
- Template rendering time (are you doing computation in templates?)

---

## Complexity Analysis

### Big-O Quick Reference

| Complexity | Name | Example | Scale |
|---|---|---|---|
| O(1) | Constant | HashMap lookup | Handles any size |
| O(log n) | Logarithmic | Binary search | Handles billions |
| O(n) | Linear | Single pass over collection | Handles millions |
| O(n log n) | Linearithmic | Good sorting (merge, heap) | Handles millions |
| O(n^2) | Quadratic | Nested loops over same collection | Handles thousands |
| O(n^3) | Cubic | Triple nested loops | Handles hundreds |
| O(2^n) | Exponential | Brute-force subsets | Handles ~25 |

### When to Care

- **O(1) to O(n):** Almost never a problem. Don't optimize.
- **O(n log n):** Fine for most use cases. Only optimize for very hot paths.
- **O(n^2):** Watch the input size. Fine for n < 1000, problematic for n > 10000.
- **O(n^3) or worse:** Red flag. Look for algorithmic improvements first.

### Cyclomatic and Data Flow Complexity

Per the project coding standards:

- **Cyclomatic complexity:** Must be < 25 per function
- **Data flow complexity:** Must be < 25 per function

When complexity exceeds these thresholds, the refactoring-advisor skill should be used to plan decomposition.

---

## Common Optimization Patterns

### Rust-Specific

| Pattern | When | Trade-off |
|---|---|---|
| Replace `Vec<Box<dyn Trait>>` with enum dispatch | Known, finite set of variants | Less flexible, but no heap allocation per item |
| Use `&str` instead of `String` | Function doesn't need ownership | Lifetime annotations may complicate API |
| Pre-allocate with `Vec::with_capacity()` | Known or estimated collection size | Minor memory overhead if estimate is wrong |
| Use `SmallVec` | Usually-small collections | Extra dependency, more complex type |
| Replace `clone()` with borrows | Cloning on hot paths | More lifetime management |
| Use `rayon` for data parallelism | CPU-bound work on large collections | Thread pool overhead for small collections |

### React/TypeScript-Specific

| Pattern | When | Trade-off |
|---|---|---|
| `React.memo()` | Component re-renders with same props | Extra memory for memoized result, stale risk if deps wrong |
| `useMemo` / `useCallback` | Expensive computation or stable reference needed | Complexity, memory for cache |
| Code splitting with `React.lazy()` | Large bundles, route-level splitting | Loading states, waterfall risk |
| Virtualized lists (`react-window`) | Rendering 100+ items in a list | More complex implementation |
| Debounce/throttle | Frequent events (scroll, resize, input) | Delayed response |

### Django/Python-Specific

| Pattern | When | Trade-off |
|---|---|---|
| `select_related()` | ForeignKey lookups in loops | Larger initial query, but fewer total queries |
| `prefetch_related()` | Reverse FK / M2M lookups in loops | Extra query, but bounded number of queries |
| `.values()` / `.values_list()` | Only need specific columns | Lose model instance methods |
| Database indexes | Frequently filtered/ordered columns | Slower writes, disk space |
| Caching (`django.core.cache`) | Expensive queries repeated often | Stale data risk, cache invalidation complexity |
| Bulk operations | Creating/updating many rows | Less granular error handling |

---

## Trade-Off Analysis Template

When recommending an optimization, always present:

```markdown
### Optimization: [Description]

**Current:** [What's happening now, with measured performance]
**Proposed:** [What to change]

| Dimension | Before | After |
|---|---|---|
| Time complexity | O(n^2) | O(n log n) |
| Space complexity | O(1) | O(n) |
| Readability | Simple nested loop | Sort + scan requires comment |
| Maintainability | Easy to modify | Requires understanding of invariant |

**Recommendation:** [Proceed / Defer / Skip]
**Justification:** [Why this trade-off is or isn't worth it in this context]
```

---

## Anti-Patterns: When NOT to Optimize

- **Premature optimization.** If there's no measured performance problem, don't create complexity to solve one.
- **Micro-optimizing cold paths.** That function called once at startup? Leave it readable.
- **Optimizing without benchmarks.** "I think this is slow" is not evidence. Profile first.
- **Sacrificing correctness for speed.** Fast and wrong is worse than slow and right.
- **Cargo-culting.** "I read that HashMap is faster" — depends on the size, access pattern, and key type. Measure in your context.

---

## Integration

- **Data:** Performance findings logged to `MEMORY.md`
- **Tools:** Can run profiling/benchmarking tools without asking (see execution policies in AGENTS.md)
- **Refactoring:** When optimization requires restructuring, use the refactoring-advisor skill for safe migration planning
- **Trade-offs:** Every optimization recommendation includes a trade-off table

---

_Arc skill — Performance profiling and optimization_
