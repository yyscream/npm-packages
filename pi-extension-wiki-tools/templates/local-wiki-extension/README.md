# Local Wiki Pi Extension Template

Template for creating local documentation/wiki retrieval packages analogous to the existing ArchWiki and Hyprland Wiki extensions.

It provides the same agent-facing shape:

- setup/status commands
- local search/read/sections/extract/related tools
- packaged skill that tells the agent when and how to use the local docs first
- cache-backed indexing with local path citations

## Files

```txt
local-wiki-extension/
├── package.json.tmpl
├── index.ts.tmpl
├── LICENSE.tmpl
├── skills/__skill-name__/SKILL.md.tmpl
└── references/scaffold-checklist.md
```

## How to create a new wiki package

1. Copy this template directory to a package directory:

   ```bash
   cp -a templates/local-wiki-extension pi-extension-<topic>-wiki-local
   cd pi-extension-<topic>-wiki-local
   ```

2. Replace placeholders in all `*.tmpl` files and rename them:

   | Placeholder | Example |
   |---|---|
   | `{{packageName}}` | `@firstpick/pi-extension-example-wiki-local` |
   | `{{extensionId}}` | `example` (tools become `examplewiki_search`) |
   | `{{displayName}}` | `Example Wiki` |
   | `{{topicName}}` | `Example` |
   | `{{skillName}}` | `example-local` |
   | `{{docsPath}}` | `$HOME/.examplewiki` |
   | `{{repoUrl}}` | `https://github.com/example/example-wiki.git` or empty |
   | `{{fileExtensionsRegex}}` | `\.mdx?$` or `\.html?$` |
   | `{{promptDetectionRegex}}` | `\b(example|examplectl)\b` |
   | `{{setupCommand}}` | `/examplewiki-local-setup` |

   Then rename:

   ```bash
   mv package.json.tmpl package.json
   mv index.ts.tmpl index.ts
   mv LICENSE.tmpl LICENSE
   mv skills/__skill-name__ "skills/<skillName>"
   mv "skills/<skillName>/SKILL.md.tmpl" "skills/<skillName>/SKILL.md"
   ```

3. Customize the `CONFIG` object in `index.ts`. Treat it as the canonical source for paths, commands, labels, query expansions, and setup behavior.

4. Customize `skills/<skillName>/SKILL.md` with domain-specific routing, diagnostics, safety rules, and citation expectations.

5. Validate locally:

   ```bash
   npm install --package-lock-only
   pi --skill ./skills/<skillName> --extension ./index.ts
   ```

## Design notes

- Prefer local docs first; web sources are fallback only when local docs are missing, stale, or insufficient.
- Tools should fail loudly if the local corpus is missing instead of silently falling back.
- Keep citations local-path-first: `<path> — <section>`.
- Keep mutation behind explicit commands (`/<extensionId>-local-setup`) and keep retrieval tools read-only.
