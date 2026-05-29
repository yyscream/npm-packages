# @firstpick/pi-skill-skill-evaluator

Reusable evaluation harness for Pi and Agent Skills-compatible skill packages.

## What it does

- Adds the `skill-evaluator` skill to Pi's skill library.
- Provides CLI commands and Pi tools:
  - `skill_eval_run <skill-path>` / `skill_eval_run` tool for one skill.
  - `skill_eval_all` / `skill_eval_all` tool for discovered skills.
- Produces both JSON and Markdown reports.
- Exits non-zero on blocking failures.
- Distinguishes blocking failures from warnings.

## Checks

Blocking failures:

- missing or invalid `name` / `description` frontmatter;
- missing bundled paths referenced from `SKILL.md`;
- destructive command patterns without nearby explicit confirmation language;
- malformed routing fixtures;
- present tests that fail or time out.

Warnings:

- vague or short descriptions that weaken routing;
- missing trigger, workflow, verification, or safety sections;
- Agent Skills portability issues that Pi explicitly tolerates;
- weak routing fixture keyword overlap;
- skipped or undiscoverable tests.

## Install

This is vendored inside `@firstpick/pi-package-skill-lifecycle`; install the parent package:

```bash
pi install npm:@firstpick/pi-package-skill-lifecycle
```

For local development from this vendored package directory:

```bash
cd pi-package-skill-lifecycle/vendor/pi-skill-skill-evaluator
npm test
./bin/skill_eval_run ./skills/skill-evaluator/SKILL.md
```

## Commands and tools

Evaluate one skill:

```bash
skill_eval_run /path/to/skill/SKILL.md \
  --json-output /tmp/skill-eval.json \
  --markdown-output /tmp/skill-eval.md
```

Evaluate skills from an explicit root without reading user Pi settings:

```bash
skill_eval_all --no-settings --skill-root /path/to/skills \
  --json-output /tmp/skill-eval-all.json \
  --markdown-output /tmp/skill-eval-all.md
```

Evaluate enabled skills from a selected Pi agent directory only when you intentionally want active-environment coverage:

```bash
skill_eval_all --enabled-only --agent-dir /path/to/pi-agent-dir
```

The Pi extension registers matching tools named `skill_eval_run` and `skill_eval_all` for agents.

Useful CLI options:

```text
--format json|markdown      stdout format, default markdown
--skip-tests                do not execute tests under target skill tests/
--test-timeout SECONDS      per-skill test timeout, default 60
--agent-dir PATH            explicit Pi agent directory for active-environment discovery
--skill-root PATH           extra root for skill_eval_all discovery
--no-settings               ignore Pi settings during discovery
```

## Test conventions

See `skills/skill-evaluator/references/TEST-CONVENTIONS.md` for the recommended test layout and routing fixture schema.

## Safety

The evaluator does not mutate skill source files. Running target skill tests can execute code from that skill, so use `--skip-tests` for untrusted third-party skills.
