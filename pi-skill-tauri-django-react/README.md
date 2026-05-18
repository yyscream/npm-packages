# @firstpick/pi-skill-tauri-django-react

A Pi skill for Tauri + Django + React desktop apps, especially backend lifecycle, CORS/auth, frontend integration, build packaging, dual desktop/web deployment, Rust commands, and platform-specific gotchas.

## What it does

- Adds the `tauri-django-react` skill to Pi's skill library.
- Guides agents to invoke the skill for Tauri + Django + React desktop apps, especially backend lifecycle, CORS/auth, frontend integration, build packaging, dual desktop/web deployment, Rust commands, and platform-specific gotchas.
- Bundles `skills/tauri-django-react/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-tauri-django-react
```

## Configuration

No required configuration.

## Expected project structure

The skill targets projects that combine Tauri, Django, and React. The exact layout can vary, but the included examples and helper scripts assume a project root with separate backend, frontend, and Tauri areas.

Typical layout:

```text
project-root/
  backend/
    manage.py
    tauri_entry.py
    pyinstaller.spec
  frontend/
    package.json
    src/
  src-tauri/
    tauri.conf.json
    Cargo.toml
  scripts/
    build-backend.sh
    build-backend.ps1
```

The skill package also bundles helper scripts relative to the installed skill directory:

```text
skills/tauri-django-react/
  SKILL.md
  scripts/
    scaffold.py
    validate.py
```

Manual usage example:

```bash
python3 /path/to/installed/package/skills/tauri-django-react/scripts/validate.py \
  --project-root /path/to/project \
  --format json
```

The generated or validated project usually needs standard toolchains installed separately: Python/Django dependencies, Node frontend dependencies, Rust/Cargo, Tauri CLI, and PyInstaller for backend bundling.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `tauri-django-react`.
Agent: Invokes the `tauri-django-react` skill, follows its workflow, and reports the result.
```
