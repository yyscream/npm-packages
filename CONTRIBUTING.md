# Contributing

Thanks for contributing.

This repository is a monorepo of publishable npm packages (currently Pi extensions), plus release/check scripts.

## Repository layout

- `pi-extension-*/` – individual publishable packages
- `check-publish-readiness.sh` – pre-publish checks
- `publish-packages.sh` – plan/apply publishing with bun→npm fallback

## Development workflow

1. Create a branch
2. Make focused changes
3. Validate affected package(s)
4. Open PR with clear summary

## Before opening a PR

From repo root:

```bash
./check-publish-readiness.sh --all --publisher bun --check-alt-client
```

If you changed publishing behavior, also run:

```bash
./publish-packages.sh --all
```

(Plan mode only; do **not** publish from CI/PR unless explicitly intended.)

## Package-level expectations

For each changed package:

- Keep `package.json` valid and minimal
- Ensure `pi.extensions` entries resolve to real files/globs
- Keep README accurate (commands, env vars, tools)
- Do not commit secrets/tokens
- Bump version when preparing a release

## Releasing

Plan first:

```bash
./publish-packages.sh --all
```

Publish:

```bash
./publish-packages.sh --all --apply
```

The publish script will:
- detect new vs existing package versions
- publish only needed packages
- try Bun first and fallback to npm if publish fails

## Security

If you find a vulnerability, please follow `SECURITY.md` and report it privately.
