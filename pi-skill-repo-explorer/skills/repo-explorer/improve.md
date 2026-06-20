# Repo Explorer Skill Improvement Plan

## Continuation status — 2026-05-28

### Done

- Added the native `repo_explorer_explore` extension/tool with compact/normal/full model-visible budgets.
- Routed `SKILL.md` through the extractor/validator helper flow and documented portable `--input -` validation.
- Fixed index blind spots for `.github`, safe dotfiles, lockfiles, and sensitive `.env` metadata-only handling.
- Normalized common symbol kinds/spans for Python and TS/JS, including async functions and arrow-function exports.
- Improved file/symbol ranking enough that the original self-evaluation goal no longer elevates `LICENSE` or generic constants as top evidence.
- Resolved internal imports for common Python/TS/JS/Rust/Go cases and suppresses external dependencies outside `deep` mode.
- Added fixture-based regression tests for strict validation, dotfile coverage, symbol spans, dependency relevance, redaction, and budget trimming.

### Added in this continuation

- Added `confidence` and `confidence_reason` fields for key files, symbols, and evidence items.
- Tightened validator checks for ISO-8601 timestamps, item field types, confidence enums, positive line ranges, item path existence, evidence snippet line ranges, and unredacted secrets.
- Made `shallow` extraction match the documented structure-only behavior by skipping dependency tracing.
- Fixed evidence `line_end` to describe the actual emitted snippet range.
- Documented concrete `shallow`/`standard`/`deep` semantics in `SKILL.md`.

### Added on 2026-06-20 effectiveness implementation

- Propagated native tool `budget` and `includeEvidence` into `extract_explorer_handoff.py`.
- Added script-level `--budget compact|normal|full` and `--include-evidence true|false` controls.
- Added top-level `omitted` accounting metadata for files, symbols, dependencies, evidence, and omission reasons.
- Stopped treating ordinary symbol-budget truncation as a `budget_exceeded` error.
- Split report semantics into explorer limitations vs target repository risks, with model-visible output counts and omitted counts.
- Added compact/no-evidence, omitted-budget, and dependency-trace-limitation regression tests.
- Added report-level tracking metadata, explicit improvement signals/candidates, downstream feedback placeholders, and `summarize_effectiveness_reports.py` for Markdown rollups.

### Still open

- Add Tree-sitter or AST-backed parsing where available, with regex fallback.
- Reduce path repetition in the raw handoff schema (`repo_root`, relative paths, or path IDs), not just in the native tool's compact formatter.
- Add call-graph extraction, not just import dependency mapping.
- Make risk reporting more goal-specific beyond dependency-trace limitations and test-coverage heuristics.
- Validate against a real TS/React repo and a real Python repo, not only fixtures and this package.

## Current assessment

The current `repo-explorer` skill has a useful shape: it pushes agents toward bounded repository exploration, persistent indexing, evidence snippets, redaction, and a strict JSON handoff. That is directionally good for both accuracy and token control.

However, the implementation is still a brittle v0.1 workflow. It can miss important files, produce noisy handoffs, validate weaker contracts than the skill advertises, and waste tokens on low-value symbols/dependencies. Accuracy and effectiveness are limited more by ranking/index quality and missing tests than by the high-level skill concept.

## Evidence from local evaluation

Commands run against this package and small synthetic fixtures found:

- `build_repo_index.py` indexed this repo successfully: 8 files, 4 Python scripts, 2 Markdown files, `package.json`, `LICENSE`.
- `extract_explorer_handoff.py` + `validate_handoff.py` produced a formally valid handoff, but for the goal `evaluate repo explorer skill accuracy effectiveness token efficiency` it returned:
  - 8 key files, including `LICENSE` and `README.md` as medium-relevance files.
  - 30 relevant symbols, hitting the hard limit.
  - First symbols such as `repo_path`, `repo_name`, `file_hash`, `count_lines`, which are not very relevant to the evaluation goal.
  - 20 dependency entries, hitting the hard limit.
- `validate_handoff.py` accepted a handoff that omitted `index_info` and `errors`, even though `SKILL.md` says all schema fields are required.
- `validate_handoff.py --input /dev/stdin` failed in this Windows/MSYS environment with `Cannot read input: ... /proc/self/fd/0`, despite the skill recommending `/dev/stdin`.
- A synthetic repo containing `.github/workflows/ci.yml`, `.env`, `.gitignore`, `package.json`, and `src/auth.ts` indexed only `package.json` and `src/auth.ts`. Hidden dirs/files are skipped even though `classify_role()` contains role logic for `.github`, `.env`, and `.gitignore`.

## Main accuracy gaps

1. **Important file classes are silently skipped**
   - `should_skip_dir()` skips every dot directory, so `.github`, `.gitlab`, `.circleci`, `.vscode`, etc. are unreachable.
   - `should_skip_file()` skips extensionless dotfiles, so `.env`, `.env.example`, `.gitignore`, `.editorconfig`, and similar files cannot be indexed.
   - Lockfiles are ignored, which is often bad for dependency/security exploration.

2. **Symbol extraction is too regex-only and shallow**
   - Python misses `async def`; TypeScript misses many common exports such as arrow functions and default exports; Rust misses methods inside `impl` and async functions.
   - `line_end` is set to `line_start`, so callers do not know symbol span.
   - Symbol `kind` values from the index (`class_or_function`, `public_symbol`, `export`) do not match the output schema enum (`function | class | type | constant | module | trait | interface`).

3. **Ranking is noisy**
   - Build manifests/config/docs get high base scores even when unrelated to the goal.
   - Any symbol with a generic kind score can be included even without goal relevance, especially in `deep` mode or when top files are broad.
   - Substring matching creates false positives and does not handle synonyms like `login`/`auth`/`session`.

4. **Dependency mapping is incomplete**
   - Only import-like statements are captured, with shallow regexes and the first 200 lines only.
   - Internal imports are not resolved to files.
   - Call relationships are not captured despite `dependency_map.kind` allowing `call`.

5. **Schema validation is not strict enough**
   - `index_info` and `errors` are required by `SKILL.md` but not enforced by `validate_handoff.py`.
   - Enums, timestamps, path existence, evidence line ranges, `line_end >= line_start`, item-level required fields, and unknown error codes are only partially or not checked.
   - Secret detection reports warnings but does not require a corresponding `redacted_secret` error when secrets remain.

6. **No regression tests or fixtures**
   - There are no fixture repos proving behavior for Python, TS/JS, Rust, hidden config, dependency imports, redaction, stale indexes, or budget trimming.

## Main effectiveness gaps

1. **The workflow omits the extraction helper**
   - `SKILL.md` tells the agent to manually assemble JSON after indexing, but the package includes `extract_explorer_handoff.py`. The skill should explicitly route through that helper where possible.

2. **Examples are not portable enough**
   - `/dev/stdin` is not reliable in this environment. Support `--input -` and document that instead.
   - Commands should remind agents to resolve scripts relative to the skill directory, not the caller repo.

3. **Depth semantics are underspecified**
   - `shallow`, `standard`, and `deep` need concrete budgets: number of files to inspect, whether snippets are allowed, whether import/call tracing is required, and when to stop.

4. **The handoff does not expose confidence**
   - Callers need to know whether results are strong evidence, weak lexical matches, stale, untested, or incomplete.

5. **Risk reporting is generic**
   - The current low/no-test risk may be useful, but risks should primarily reflect the caller's exploration goal and evidence gaps.

## Token efficiency gaps

1. **Handoffs can spend tokens on noise**
   - Filling `relevant_symbols` and `dependency_map` to hard limits with weak matches hurts token efficiency and caller comprehension.

2. **Absolute paths are repeated everywhere**
   - Repeating full Windows paths across `key_files`, `symbols`, and `evidence` wastes tokens. Use `repo_root` once and relative paths elsewhere, or include path IDs.

3. **Evidence snippets are always raw text**
   - Snippets should be included only for high-confidence, decision-critical evidence. Otherwise provide line references and let the caller request more.

4. **No output budget accounting**
   - The extractor should report approximate output size, omitted counts, and why items were trimmed.

## Recommended improvements

### P0 — Contract and correctness fixes

- Update `validate_handoff.py` to enforce the actual schema:
  - Require `index_info` and `errors`.
  - Validate all item fields, enum values, timestamp format, numeric line ranges, snippet length, and valid error codes.
  - Fail if secret patterns remain unredacted in output.
- Add portable stdin handling:
  - Accept `--input -` for stdin.
  - Keep `/dev/stdin` only as a Unix-compatible fallback.
- Fix index coverage:
  - Do not blanket-skip all dot dirs/files.
  - Explicitly allow safe metadata for `.github`, `.gitlab`, `.circleci`, `.gitignore`, `.editorconfig`, `.env.example`, `.env.sample`, etc.
  - Treat real `.env` files as sensitive: index metadata only, never content snippets.
- Align symbol kinds with the output schema.
- Add fixture-based tests for validator strictness, dotfile coverage, redaction, and extraction output limits.

### P1 — Better relevance and evidence quality

- Replace simple substring scoring with a weighted scorer:
  - Path segment matches > symbol exact matches > symbol fuzzy matches > content matches > generic role priority.
  - Penalize docs/licenses unless the goal mentions docs/license/readme.
  - Deduplicate near-identical symbols and imports.
- Add language-aware symbol extraction:
  - Prefer Tree-sitter where available; fall back to regex.
  - Capture symbol spans (`line_start`, `line_end`) and normalized kinds.
  - Cover common TS/JS/Python/Rust patterns first.
- Resolve internal imports to files where possible.
- Add content search over a small candidate set, not the whole repo, to catch goals not present in path/symbol names.
- Include confidence per key file/symbol/evidence item, e.g. `high | medium | low`, with a short reason.

### P2 — Token efficiency and UX

- Change the handoff schema to reduce path repetition:
  - Add `repo_root`.
  - Use relative paths or path IDs in all repeated references.
- Add output modes:
  - `compact`: key files + risks + next actions, minimal evidence.
  - `standard`: current shape with stricter relevance.
  - `deep`: dependency/call tracing plus more evidence.
- Add an explicit token budget option, e.g. `--budget compact|normal|full` or `--max-output-chars`.
- Add `omitted` metadata instead of dumping low-value items:
  - `omitted.files`, `omitted.symbols`, `omitted.dependencies`, `omitted.reason`.
- Make evidence lazy by default:
  - Include line refs first.
  - Include snippets only for top 3-5 decisive findings or when requested.

## Suggested implementation plan

1. **Tighten the contract first**
   - Update `validate_handoff.py` and add tests that intentionally fail malformed handoffs.
   - Acceptance: validator rejects missing `index_info`/`errors` and invalid item enums.

2. **Fix indexing blind spots**
   - Replace blanket dotfile/dotdir skipping with explicit allow/deny rules.
   - Acceptance: fixture repo indexes CI config and safe dotfiles while avoiding `.env` content exposure.

3. **Reduce noisy output**
   - Require a minimum relevance score for symbols/dependencies.
   - Penalize generic docs/config unless the goal asks for them.
   - Acceptance: this repo evaluation goal no longer returns `LICENSE` or generic constants as top evidence.

4. **Improve symbol/import accuracy**
   - Normalize symbol kinds and add span extraction for common languages.
   - Resolve relative/internal imports for Python and TS/JS.
   - Acceptance: fixture repos produce correct symbol spans and internal dependency edges.

5. **Add compact output support**
   - Move to relative paths and optional snippets.
   - Acceptance: same exploration produces a materially smaller handoff without losing top-ranked evidence.

## Verification checklist for future changes

Run these after implementing improvements:

```bash
python3 -m pytest skills/repo-explorer/tests
python3 skills/repo-explorer/scripts/build_repo_index.py --repo <fixture-repo> --output /tmp/repo-index.json
python3 skills/repo-explorer/scripts/extract_explorer_handoff.py --index /tmp/repo-index.json --goal "find auth flow" --depth standard > /tmp/handoff.json
python3 skills/repo-explorer/scripts/validate_handoff.py --input /tmp/handoff.json
```

Also test on at least one real TS/React repo, one Python repo, and this package itself. Compare handoffs manually for:

- Did it include the files a senior engineer would inspect first?
- Are symbols and dependencies directly relevant to the goal?
- Are snippets decisive rather than decorative?
- Is the output shorter than the current handoff for the same task?
