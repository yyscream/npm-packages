# Skill Evaluation Test Conventions

Use these conventions for Pi and Agent Skills-compatible packages that need repeatable quality gates.

## Recommended Layout

```text
skills/<skill-name>/
  SKILL.md
  scripts/
  references/
  tests/
    test_skill_contract.py
    test_routing_examples.py
    fixtures/
      routing.json
```

## Contract Tests

`tests/test_skill_contract.py` should check skill-specific invariants that the generic evaluator cannot know, for example:

- required helper scripts exist and are executable;
- generated JSON conforms to a schema;
- example commands produce bounded output;
- safety language covers risky operations used by that skill.

Prefer Python `unittest` from the standard library so `skill_eval_run` can execute tests without package installs:

```python
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]

class SkillContractTests(unittest.TestCase):
    def test_required_script_exists(self):
        self.assertTrue((SKILL_DIR / "scripts" / "example.py").exists())

if __name__ == "__main__":
    unittest.main()
```

## Routing Fixture Schema

Use `tests/routing.json` or `tests/routing/<case>.json`:

```json
{
  "skill": "example-skill",
  "should_trigger": [
    "Evaluate this example skill before enabling it",
    "Run the example-skill validation workflow",
    "Check this skill's scripts and safety language"
  ],
  "should_not_trigger": [
    "Troubleshoot a Wi-Fi connection",
    "Summarize this academic paper",
    "Change a Hyprland monitor rule"
  ]
}
```

Minimum coverage for routing fixtures:

- at least 3 `should_trigger` prompts;
- at least 3 `should_not_trigger` prompts;
- mark ambiguous prompts in a separate review note instead of hiding them in pass/fail fixtures.

## Failure Policy

Blocking failures:

- missing or invalid `name` / `description` frontmatter;
- missing files referenced from `SKILL.md`;
- destructive commands without nearby explicit confirmation language;
- present tests that fail or time out;
- malformed routing fixture JSON.

Warnings:

- vague or short description;
- missing workflow, trigger, verification, or safety sections;
- no tests directory;
- weak routing keyword overlap;
- Agent Skills portability issues that Pi explicitly tolerates, such as a name/directory mismatch.

## Safety

Running tests executes code from the target skill. For untrusted packages, inspect tests first or run:

```bash
skill_eval_run /path/to/SKILL.md --skip-tests
```
