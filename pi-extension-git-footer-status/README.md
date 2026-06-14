# pi-extension-git-footer-status

Enhanced Pi footer with git health and model/token telemetry.

![Status bar with metrics and git context](https://unpkg.com/@firstpick/pi-extension-git-footer-status/images/Statusbar_v0.1.5.png)

## What it does

- Shows compact runtime metrics in the footer:
  - input/output/cache tokens
  - export-backed initial prompt estimate (`PI: X tok`, same estimator as `/stats-pi`, compacted as `k` for thousands; falls back to live context data if Pi HTML export is unavailable)
  - live output token counter + token output speed (`tok/s`) measured from assistant streaming lifecycle events, with a session-history fallback
  - cost + context-window usage
  - current model and reasoning level
- Shows git status context on the path line:
  - branch/detached state
  - ahead/behind
  - staged/unstaged/untracked/conflicts
  - operation state (rebase/merge/cherry-pick/revert/bisect)
  - stash/submodule/worktree/tag/last-commit-age/signing mismatch indicators
- Publishes the same footer data as a structured `git-footer-webui` status payload so Pi Web UI can render the extension-owned footer instead of duplicating this logic in the Web UI package.

## Install

```bash
pi install npm:@firstpick/pi-extension-git-footer-status
```

## Configuration

No required configuration.

Performance-related environment toggles:

- `PI_GIT_FOOTER_FETCH=0` — disable startup `git fetch`. Enabled by default.
- `PI_GIT_FOOTER_AUTO_REFRESH_MS=10000` — git status auto-refresh interval. Set `0` to disable.
- `PI_GIT_FOOTER_DISABLE_PROMPT_ESTIMATE=1` — disable the background `PI: X tok` prompt estimate.

The initial prompt estimate and session-usage recompute run lazily after the TUI is ready, so the footer should not block startup.

## Commands

- `/git-footer-refresh` — refresh git/footer information immediately.

## Tools

None.

## Example view

```text
🪙 ↑126k · ↓11k │ 💾 R1.4M │ PI: 6.8k tok │ ⚡ 48.6 tok/s │ 💸 $1.667 (sub) │ 🧠 19.0%/272k                                                                                                                (openai-codex) gpt-5.5 • low
~/npm-packages (main) │ ✎15 │ ⏱15m · Agent
```

At a glance you can see token flow, cache reads, prompt-injection size, streaming speed, cost/subscription state, context pressure, model/reasoning level, current repo/branch, dirty-file count, and session time without running `git status`.
