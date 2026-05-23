# @firstpick/pi-prompts-git-pr

Reusable prompt templates for commit messages, pull request descriptions, and branch review workflows.

## Included prompts

- `/check-pr` — audit PR commits by author/branch/URL and identify risks.
- `/git-staged-msg` — generate short and long conventional commit messages from staged changes.
- `/pr` — generate a PR description from the current branch diff.
- `/pr-review-branch` — run a non-editing PR-style review against the base branch.
- `/pr-review-implement` — safely implement valid PR review suggestions.
- `/pr-update` — append new branch changes to an existing PR draft.

## Install

```bash
pi install npm:@firstpick/pi-prompts-git-pr
```

For local testing from this repository root:

```bash
pi install ./pi-package-prompts-git-pr
```

## Configuration

No required configuration. After installation, type `/` in Pi to autocomplete the prompt templates.

## Dependencies

No repository-local Pi extensions, tools, skills, or other prompt packages are required. This bundle only contributes prompt templates through `pi.prompts`.
