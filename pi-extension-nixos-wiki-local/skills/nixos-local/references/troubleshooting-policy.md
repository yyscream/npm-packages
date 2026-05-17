# Local NixOS/Nix Troubleshooting Policy

- Use local NixOS/Nix documentation first and cite exact local files/sections.
- Do not assume the host is NixOS. The user may be on Arch/EndeavourOS while asking about Nix projects.
- Treat docs as guidance, not proof of the current system or flake state. Verify with read-only diagnostics when local evidence matters.
- Separate documentation findings from observed project/system evidence.
- Prefer focused extracts over full-page dumps.
- Prefer commands that avoid writes: `--no-write-lock-file`, `--no-build`, metadata/eval/status commands, and file inspection.
- Fall back to official online NixOS/Nix docs only when local docs are missing, stale, or insufficient.
- Ask before package installs, profile changes, lock-file updates, NixOS rebuilds, daemon/config edits, cache/trusted-key changes, store cleanup, or recursive deletes.

## Triage flow

1. Classify the question:
   - Nix command usage
   - Flake workflow
   - Nix language expression
   - NixOS module/option
   - nixpkgs packaging/overlay
   - Store/cache/daemon/profile issue
2. Search local docs using the narrowest useful terms plus domain expansions.
3. Extract focused sections from one or more official local sources.
4. Inspect local files/state only if relevant and safe.
5. Give a practical answer with source citations and label mutations separately.

## Evidence hierarchy

1. Local docs from `~/.nixoswiki` via `nixoswiki_*` tools.
2. Project files: `flake.nix`, `flake.lock`, `default.nix`, `shell.nix`, `configuration.nix`, modules, overlays, package definitions.
3. Read-only command output: `nix --version`, `nix flake metadata --no-write-lock-file`, `nix flake check --no-build`, `nix eval`, `nix path-info`, etc.
4. Online official docs only when local docs are insufficient.
