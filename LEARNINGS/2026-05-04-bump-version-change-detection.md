# bump-package-versions: avoid unnecessary bumps

What happened: `./bump-package-versions.sh --all` planned version bumps for published packages even when nothing publishable changed.

Tried: Compared local package state to npm registry tarball for the currently published version.

Solution: Added publishable-content comparison (`npm pack --dry-run --json` vs `npm pack <name>@<version>` tarball, with `package.json.version` ignored). Now versions are bumped only when publishable files differ.
