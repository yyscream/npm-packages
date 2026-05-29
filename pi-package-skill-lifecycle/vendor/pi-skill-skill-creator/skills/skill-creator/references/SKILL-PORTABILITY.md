# Skill Portability Guidelines

These guidelines define the portable skill profile for this repository. Follow them when creating or updating `pi-skill-*` packages or extension-bundled skills that should work across Pi, Claude Code, Codex, and other Agent Skills-compatible harnesses.

Portability goal: the core `SKILL.md` workflow should remain useful even when Pi-specific extensions, custom tools, commands, and Firstpick-local paths are unavailable.

## Portability model

Use a two-layer skill design:

1. **Portable core** — generic Agent Skills content that any compatible harness can read and follow.
2. **Harness adapters** — optional sections for Pi, Claude Code, Codex, or local workspace conveniences.

Pi is intentionally lenient in a few places, but portable skills should follow the stricter common subset:

- Skill directory name should match the frontmatter `name`.
- `name` should be lowercase kebab-case, 1-64 chars, with no leading/trailing/consecutive hyphens.
- `description` should be specific enough for routing and not mention Pi-only tools unless the whole skill is Pi-only.
- Bundled files should be referenced with relative paths from the skill directory.

## Recommended package layout

```text
pi-skill-example/
  package.json
  README.md
  LICENSE
  skills/
    example/
      SKILL.md
      scripts/              # optional helper scripts
      references/           # optional long-form docs loaded on demand
      tests/                # optional but preferred contracts/fixtures
        fixtures/
```

For skills bundled inside an extension package, keep the same `skills/<skill-name>/SKILL.md` shape.

## Minimum `SKILL.md` sections

Every new portable skill should include:

```md
---
name: example
description: Specific routing description. Say when to use this skill and what it helps with.
license: MIT
---

# Example

## When to use

## Inputs and assumptions

## Portable workflow

## Safety and side effects

## Scripts, references, and dependencies

## Verification

## Pi adapter
```

Section expectations:

- **When to use** — concrete triggers for automatic or manual loading.
- **Inputs and assumptions** — required files, URLs, environment, permissions, or constraints.
- **Portable workflow** — harness-neutral steps. Avoid Pi-only command names, custom tool names, or private paths here.
- **Safety and side effects** — what is read-only, what mutates files, when to ask for confirmation.
- **Scripts, references, and dependencies** — list bundled scripts and explicit runtime dependencies.
- **Verification** — commands or manual checks that prove the skill worked.
- **Pi adapter** — optional. Use only for Pi-specific tools, commands, settings paths, or UI behavior.

If a skill has no Pi-specific behavior, omit the `Pi adapter` section.

## Portable core rules

### Keep the core workflow generic

Good:

```md
## Portable workflow

1. Inspect the project manifest and existing documentation.
2. Locate the relevant implementation files.
3. Apply the smallest safe change.
4. Run the repository's documented checks.
```

Bad:

```md
## Portable workflow

1. Call `repo_explorer_explore`.
2. Use Pi's `edit` tool.
3. Run `/reload` when done.
```

Use those Pi-specific instructions in `## Pi adapter` instead.

### Use relative bundled paths

Good:

````md
Run the bundled checker from the skill directory:

```bash
python3 ./scripts/check_contract.py --fixtures ./tests/fixtures
```
````

Bad:

````md
Run:

```bash
python3 /home/alice/packages/pi-skill-example/skills/example/scripts/check_contract.py
```
````

### Use placeholders for user/project paths

Good:

```md
Use `<project-root>/README.md` for the current repository README.
Use `$HOME/.config/<tool>/config.toml` when referring to the user's home directory.
```

Bad:

```md
Use `/home/alice/packages/README.md`.
Use `/home/alice/.pi/agent/settings.json` in the portable workflow.
```

Private or machine-specific paths may appear only in examples clearly labeled as local, or in a harness adapter section.

### Avoid hidden dependencies

Scripts should be boring and explicit:

- Prefer Python, POSIX shell, or Node.js for helper scripts.
- State required versions or external commands near the script usage.
- Keep script inputs/outputs documented.
- Make scripts fail loudly with useful errors.
- Do not require globally installed private tools in the portable workflow.

Good:

```md
Requires Python 3.11+ and no third-party packages.
```

Good:

```md
Requires Node.js 20+ and dependencies installed with `npm install` in the package root.
```

Bad:

```md
Run `my-local-helper`, which exists on the author's machine.
```

## Pi adapter guidance

Put Pi-only conveniences under `## Pi adapter` so other harnesses can ignore them safely.

Appropriate Pi adapter content:

- Pi slash commands, for example `/reload`, `/settings`, `/skill:<name>`.
- Pi custom tools, for example `repo_explorer_explore`, `archwiki_search`, or package-specific tools.
- Pi settings paths, for example `$PI_CODING_AGENT_DIR/settings.json` or the user's selected agent settings file.
- Pi package commands, for example `pi install npm:@firstpick/pi-skill-example`.
- Pi-specific UI or extension behavior.

Example:

````md
## Pi adapter

- In Pi, prefer the `repo_explorer_explore` tool before manual repository searches.
- If this skill was installed as a package, enable it with `pi config` or install it with:

```bash
pi install npm:@firstpick/pi-skill-example
```
````

## Personal memory and local state

Portable skill packages should not store personal runtime memory in the package directory.

Use this split:

| Content | Belongs in package? | Recommended location |
|---|---:|---|
| Portable workflow instructions | Yes | `skills/<skill-name>/SKILL.md` |
| Long-form reusable reference docs | Yes | `skills/<skill-name>/references/` |
| Contract tests and fixtures | Yes | `skills/<skill-name>/tests/` |
| Personal observations from real use | No | Host-specific memory store |
| Private paths, tokens, credentials, local incident notes | No | Never in the package |

For Pi-local personal skill memory, prefer:

```text
~/.pi/agent/memory/skills/<skill-name>.md
```

For other harnesses, use their local/private memory location. If no per-skill memory store exists, record durable observations in a user-private memory file and do not package them for publication.

## Tests and fixtures

Add tests when practical, especially when the skill includes scripts or strict output contracts.

Recommended minimums:

- `tests/fixtures/` for small representative inputs.
- A script contract test for every bundled helper script.
- A routing/contract test for skills with strict output formats.
- Verification instructions in `SKILL.md` even when automated tests are not yet present.

Example:

```text
skills/example/tests/
  fixtures/minimal-project/
  test_contract.py
```

## Checklist for new or changed skills

Before considering a skill portable, check:

- [ ] `skills/<name>/SKILL.md` exists and `<name>` matches frontmatter `name`.
- [ ] Frontmatter has `name` and a specific `description`.
- [ ] Core workflow does not depend on Pi-only tools, commands, or private paths.
- [ ] Pi-specific content is isolated under `## Pi adapter`.
- [ ] Bundled scripts use relative paths and document dependencies.
- [ ] Personal memory is stored outside the package directory.
- [ ] Tests/fixtures or clear verification steps exist.
- [ ] README explains installation and expected package contents.
