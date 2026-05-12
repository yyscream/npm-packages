# pi-extension-git-footer-status

Enhanced Pi footer with git health and model/token telemetry.

## What it does

- Shows compact runtime metrics in the footer:
  - input/output/cache tokens
  - prompt-injection estimate (`PI: X tok`, compacted as `k` for thousands)
  - live output token counter + token output speed (`tok/s`) measured from assistant streaming lifecycle events, with a session-history fallback
  - cost + context-window usage
  - current model and reasoning level
- Shows git status context on the path line:
  - branch/detached state
  - ahead/behind
  - staged/unstaged/untracked/conflicts
  - operation state (rebase/merge/cherry-pick/revert/bisect)
  - stash/submodule/worktree/tag/last-commit-age/signing mismatch indicators

## Install

```bash
pi install npm:@firstpick/pi-extension-git-footer-status
```

## Configuration

No required configuration.

## Commands

- `/git-footer-refresh` — refresh git/footer information immediately.

## Tools

None.
