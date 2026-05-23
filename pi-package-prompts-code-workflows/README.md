# @firstpick/pi-prompts-code-workflows

Reusable prompt templates for code review, debugging, issue planning, and incident triage in any repository.

## Included prompts

- `/fix` — fix a reported issue end-to-end with verification.
- `/incident` — triage incidents with impact, severity, mitigation, and investigation plan.
- `/issue-fix` — turn an issue into root-cause analysis and implementation plan.
- `/issue-new` — draft a clean maintainer-friendly issue.
- `/review` — review code for correctness, security, performance, and maintainability.
- `/sum-issue` — summarize current feature/fix state and next step.

## Install

```bash
pi install npm:@firstpick/pi-prompts-code-workflows
```

For local testing from this repository root:

```bash
pi install ./pi-package-prompts-code-workflows
```

## Configuration

No required configuration. After installation, type `/` in Pi to autocomplete the prompt templates.

## Dependencies

No repository-local Pi extensions, tools, skills, or other prompt packages are required. This bundle only contributes prompt templates through `pi.prompts`.
