# README missing on pi.dev package pages after publish

## What happened
Packages showed no README section on pi.dev, even though README.md existed in each package and was included in tarballs.

## What was tried
Checked npm registry packument fields (`readme`), compared with a working package (`pi-subagents`), and verified packed files with `npm pack --dry-run`.

## Solution
Publish with `npm publish` (not bun default). After npm publish, registry `readme` fields were populated and package pages can render README content.
