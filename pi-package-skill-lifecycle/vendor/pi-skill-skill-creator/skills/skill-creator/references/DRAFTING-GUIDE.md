# Skill Creator Drafting Guide

## Reusability classes

Use one of these classes before drafting:

| Class | Meaning | Minimum evidence |
|---|---|---|
| `repeated-3-plus` | Workflow succeeded at least three times | Count/examples of repeated use |
| `expensive` | One success is enough because the workflow is costly/risky | Cost/risk avoided by standardizing |
| `strategic-reuse` | Strong expectation of reuse across packages/projects | Where it is likely to recur |
| `confirmed` | Human explicitly confirmed reusability | Short confirmation reason |

`unknown` must block draft creation.

## Draft location policy

Safe default:

```text
~/.pi/agent/drafts/skills/<skill-name>/SKILL.md
```

Unsafe by default:

```text
~/.pi/agent/skills/drafts/<skill-name>/SKILL.md
```

Pi recursively discovers `SKILL.md` under `~/.pi/agent/skills/`, so drafts there can appear in the available skill list before review.

## Draft review checklist

- [ ] Frontmatter has valid `name` and specific `description`.
- [ ] `## When to Use` describes concrete triggers.
- [ ] `## Workflow` is actionable and ordered.
- [ ] `## Verification` includes commands or observable checks.
- [ ] `## Safety and Failure Modes` includes confirmation boundaries.
- [ ] No secrets or private paths are present.
- [ ] Draft is not enabled automatically.
- [ ] `skill_eval_run` was run if available, or fallback validation was reported.

## Enablement handoff

After review, ask the user which path they want:

1. Keep as draft.
2. Move/copy into `~/.pi/agent/skills/<skill-name>/`.
3. Convert to package skeleton and install through `pi install /path/to/package`.
4. Publish later as an npm package.
