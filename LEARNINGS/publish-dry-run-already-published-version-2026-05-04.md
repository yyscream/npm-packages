# publish script false failures on already-published versions

- What happened: `npm publish --dry-run` returned non-zero for packages whose exact version was already published, so the script marked them as errors.
- Tried: Reproduced manually in affected packages; confirmed npm error `You cannot publish over the previously published versions`.
- Solution: Updated `publish-packages.sh` to evaluate registry version status first and treat dry-run failure as informational when that version already exists, resulting in `skip` instead of `error`.
