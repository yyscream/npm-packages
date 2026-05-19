# firstpick npm/bun packages

This repository contains my public JavaScript/TypeScript packages published via npm (using Bun and/or npm).

Right now it contains **Pi extension packages**.

## Skill packages

These package active Pi skills that are not already bundled in an existing `pi-extension-*` package. Each package uses `pi.skills: ["./skills"]` and includes its full skill directory, including bundled scripts/references/assets.

Extension-bundled skills kept as direct Pi config includes instead of duplicate packages:

- `arch-linux-local` from `pi-extension-archwiki-local`
- `hyprland-local` from `pi-extension-hyprland-wiki-local`
- `nixos-local` from `pi-extension-nixos-wiki-local`

- `@firstpick/pi-skill-acceptance-tester` (`pi-skill-acceptance-tester`) — Use automatically as the final gate before release, handoff, or claiming completion for substantial changes. Runs acceptance/readiness checks, determines pass/fail, and gives a go/no-go recommendation.
- `@firstpick/pi-skill-architecture-review` (`pi-skill-architecture-review`) — Use automatically for architecture reviews, module boundaries, dependency direction, coupling/cohesion, SOLID concerns, system design trade-offs, layering, service boundaries, or design decisions before implementation.
- `@firstpick/pi-skill-backup-manager` (`pi-skill-backup-manager`) — Use automatically for backup health checks, restore testing, NAS/Gitea backup integrity, 3-2-1 strategy review, backup script audits, or verifying repositories and archives can be restored safely.
- `@firstpick/pi-skill-bug-reporter` (`pi-skill-bug-reporter`) — Use automatically when defects, regressions, failed tests, unexpected behavior, or spec mismatches are found. Produces structured reproducible bug reports with severity, evidence, environment, and actionable next steps.
- `@firstpick/pi-skill-code-quality` (`pi-skill-code-quality`) — Use automatically for code reviews, linting/formatting setup, maintainability checks, complexity concerns, warning cleanup, coding standards, or quality gates in Rust, TypeScript, Python, shell, and mixed repos.
- `@firstpick/pi-skill-code-security` (`pi-skill-code-security`) — Use automatically for code security reviews, leaked secret checks, dependency risk, unsafe shell/Python/TypeScript/Rust patterns, auth/input-validation flaws, SAST-style audits, or supply-chain concerns in repositories.
- `@firstpick/pi-skill-competitor-analysis` (`pi-skill-competitor-analysis`) — Use automatically when comparing competing products, services, libraries, tools, vendors, or approaches for market/product positioning, feature matrices, strategic trade-offs, pricing, adoption, or differentiation.
- `@firstpick/pi-skill-deep-research` (`pi-skill-deep-research`) — Use automatically for high-stakes or complex research needing multi-source evidence, scientific/technical fact-checking, decision traces, or rigorous verification. Runs deterministic two-phase research with schema/policy validation.
- `@firstpick/pi-skill-deployment-automation` (`pi-skill-deployment-automation`) — Use automatically for Docker Compose deployments, container updates, stack health checks, rollbacks, compose-file changes, image upgrades, failed deploys, or service restart planning. Provides safe deployment and rollback workflows.
- `@firstpick/pi-skill-design-patterns` (`pi-skill-design-patterns`) — Use automatically when choosing patterns, designing traits/interfaces/components, deciding abstraction boundaries, evaluating dependency injection/callbacks, or comparing implementation approaches in Rust, TypeScript/React, or Django/Python.
- `@firstpick/pi-skill-network-diagnostics` (`pi-skill-network-diagnostics`) — Use automatically for connectivity, DNS, Pi-hole, port reachability, routing, firewall reachability, TLS/network timeouts, or service access failures. Provides structured network troubleshooting commands and interpretation.
- `@firstpick/pi-skill-paper-summarizer` (`pi-skill-paper-summarizer`) — Use automatically for academic or technical papers, arXiv/PubMed/IEEE/ACM links, PDFs, methodology review, limitations, practical implications, or extracting findings for engineering decisions.
- `@firstpick/pi-skill-performance-optimizer` (`pi-skill-performance-optimizer`) — Use automatically for slow code, high CPU/memory, latency, large data processing, algorithmic complexity, profiling plans, benchmarks, or optimization requests. Profiles first and weighs trade-offs before changing code.
- `@firstpick/pi-skill-refactoring-advisor` (`pi-skill-refactoring-advisor`) — Use automatically for refactors, code smells, migrations, duplication removal, module splitting, API cleanup, or restructuring plans. Emphasizes small safe steps, behavior preservation, and verification after each change.
- `@firstpick/pi-skill-repo-explorer` (`pi-skill-repo-explorer`) — Use automatically before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes. Explores a repository and returns a strict JSON handoff with key files, symbols, risks, and evidence.
- `@firstpick/pi-skill-research-orchestration` (`pi-skill-research-orchestration`) — Use automatically for broad multi-claim research projects needing planning, parallel investigation, source merging, gap closure, citation audit, and final synthesis when narrower research skills are insufficient.
- `@firstpick/pi-skill-server-audit` (`pi-skill-server-audit`) — Use automatically for Linux server security reviews, SSH hardening, firewall/open-port audits, user/permission checks, exposed services, or host hardening requests. Produces severity-rated findings and practical remediation steps.
- `@firstpick/pi-skill-spec-vs-impl-checker` (`pi-skill-spec-vs-impl-checker`) — Use automatically when a spec, plan, README, issue, or requirement must be verified against implementation. Traces requirements to code, checks interface contracts, and reports gaps or mismatches.
- `@firstpick/pi-skill-tauri-django-react` (`pi-skill-tauri-django-react`) — Use automatically for Tauri + Django + React desktop apps, especially backend lifecycle, CORS/auth, frontend integration, build packaging, dual desktop/web deployment, Rust commands, and platform-specific gotchas.
- `@firstpick/pi-skill-tech-debt-tracker` (`pi-skill-tech-debt-tracker`) — Use automatically when identifying, categorizing, prioritizing, or planning technical debt work, debt sprints, cleanup backlogs, TODO consolidation, or long-term maintainability risks. Tracks debt with severity/effort.
- `@firstpick/pi-skill-tech-deep-dive` (`pi-skill-tech-deep-dive`) — Use automatically when choosing or evaluating libraries, frameworks, tools, platforms, models, databases, APIs, or architectures for a use case. Produces criteria scoring, ecosystem assessment, and recommendations.
- `@firstpick/pi-skill-test-plan-generator` (`pi-skill-test-plan-generator`) — Use automatically when planning tests from specs, architecture docs, PRs, risky changes, new features, bug fixes, or release work. Generates prioritized unit, integration, E2E, regression, and edge-case coverage.
- `@firstpick/pi-skill-vulnerability-scanner` (`pi-skill-vulnerability-scanner`) — Use automatically when checking CVEs or known vulnerabilities in installed packages, dependencies, Docker images, OS packages, exposed services, or software versions. Produces severity-rated scan reports.

## Packages

### `@firstpick/pi-extension-archwiki-local`
Adds local ArchWiki retrieval tools to Pi using the installed `arch-wiki-docs` package.

- `/archwiki-status` cache/docs status command
- `archwiki_search`, `archwiki_read`, `archwiki_sections`, `archwiki_extract`, `archwiki_related` tools
- Prefers local ArchWiki evidence for Arch/Linux troubleshooting

### `@firstpick/pi-extension-bang-command-autocomplete`
Adds autocomplete for `!<command>` in Pi.

- Fast suggestions from a built-in command list
- Optional shell-history command indexing via env flag

### `@firstpick/pi-extension-brave-search`
Adds a `brave_search` tool to Pi for up-to-date web search.

- Uses Brave Search API
- Supports query options like country/language/freshness/safesearch
- Includes status/test helper commands

### `@firstpick/pi-extension-fish-user-bash`
Runs Pi `!` / `!!` commands through fish shell.

- Fish as default shell backend
- Configurable shell path via env var

### `@firstpick/pi-extension-memory-helper`
Adds lightweight memory commands and a memory tool.

- `/remember` to append notes
- `/memory-search` to search memory files
- `remember_note` tool for agent use

### `@firstpick/pi-extension-notes`
Adds local notes management inside Pi.

- Create, list, read, update, delete notes
- Fuzzy note lookup and quick status command
- Optional rule-note injection into prompt

### `@firstpick/pi-extension-plan-mode-toggle`
Plan mode workflow controls for Pi.

- `/plan-mode on|off|status`
- `/plan-model [select|provider/model-id]`
- `Ctrl+Q` shortcut for toggle/arm flow

### `@firstpick/pi-extension-git-footer-status`
Enhanced footer/status line for Pi sessions.

- Git status snapshot (branch, dirty state, sync, operations)
- Token/cost/context usage telemetry in footer
- `/git-footer-refresh` command

### `@firstpick/pi-extension-reverse-last`
Undo support for Pi `write`/`edit` file mutations.

- Per-session undo stack
- `/reverse-last [count]` command
- Optional state directory override via env var

### `@firstpick/pi-extension-safety-guard`
Protective confirmation layer for risky operations.

- Confirmation prompts for dangerous bash commands
- Protected-path checks for `write`/`edit`
- Auto-block behavior in non-interactive mode

### `@firstpick/pi-extension-stats`
Usage analytics command for Pi session history.

- Daily token graph (`/stats`, `/stats N`, `/stats all`)
- Input/output/cache breakdown
- Top model usage summary

### `@firstpick/pi-extension-plan-executor`
Autonomous `PLAN.md` checklist execution loop.

- `/execute-plan [path]`
- `/stop-plan`
- `/plan-status`

### `@firstpick/pi-extension-release-npm`
Release orchestration command for this monorepo.

- `/release-npm` runs release checks and optional publish flow

### `@firstpick/pi-extension-todo-progress`
Auto todo/progress tracking extension.

- auto-creates todos for multi-step prompts
- persistent progress widget until completion

### `@firstpick/pi-extension-upgrade-extensions`
Update npm-installed Pi extensions.

- `/extensions-update` with interactive multi-select
- `/extensions-update all` to directly update all available updates

### `@firstpick/pi-utils`
Shared helpers used by multiple Pi extensions.

- Agent-dir resolution (`PI_CODING_AGENT_DIR` aware)
- Environment boolean parsing
- Agent-relative path resolution

## Templates

### `templates/local-wiki-extension`
Reusable scaffold for local documentation/wiki extensions analogous to the ArchWiki and Hyprland Wiki packages.

- local search/read/sections/extract/related tools
- setup/status commands
- packaged skill template for local-docs-first routing
- cache-backed Markdown/HTML corpus indexing

## Utility scripts

- `install-pi-add.sh` – discovers local `pi-extension-*`, `pi-skill-*`, and `pi-package-*` packages and installs selected/all via `pi install npm:<package>` (supports interactive mode, `--all`, `--dry-run`, `--force`)
- `check-publish-readiness.sh` – validates package metadata, extension entries, dry-run publish, registry/version status, and local-vs-npm packed contents
- `publish-packages.sh` – plans/applies publish actions dynamically for all package folders
- `bump-package-versions.sh` – checks npm published versions first and enforces the next release version for changed packages (`+0.0.1`, rolling `*.9` to next minor `.0`; bumps up or reduces down only when needed)
- `release-workflow.sh` – orchestrates release checks: `--check` reports required bumps, `--plan` includes bump planning, and `--publish` applies required bumps before publishing
- `sync-pi-package-symlinks.sh` – ensures local development symlinks for Pi extensions (`~/.pi/agent/extensions/*.ts`) and packaged skills (`~/.pi/agent/skills/<skill-name>`) point to canonical resources in `npm-packages`; renames non-symlink conflicts to `.hardcoded.<timestamp>.bak`

## Publish model

- Registry: **npm**
- Client: **npm** by default; **bun** is the fallback publisher when available
- Installation for users remains standard npm registry usage, e.g.:

```bash
pi install npm:@firstpick/pi-extension-notes
```
