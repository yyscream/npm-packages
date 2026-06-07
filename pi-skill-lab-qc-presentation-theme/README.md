# @firstpick/pi-skill-lab-qc-presentation-theme

Pi package containing the `lab-qc-presentation-theme` Agent Skill.

Use it to create or restyle browser-based HTML/CSS/JS presentations for chemical production quality-control laboratory audiences:

- laboratory technicians;
- scientists;
- quality-control teamleaders.

The skill captures the reusable **styling, theming, deck mechanics, and audience framing** from the successful green laboratory-themed presentation. It intentionally ignores previous presentation content and instructs agents to regenerate slides only from the current source material.

## What it provides

- `skills/lab-qc-presentation-theme/SKILL.md` — routing and workflow instructions.
- `skills/lab-qc-presentation-theme/references/THEME-SPEC.md` — detailed theme specification.
- `skills/lab-qc-presentation-theme/assets/starter-template.html` — static deck starter.
- `skills/lab-qc-presentation-theme/assets/lab-qc-theme.css` — reusable green laboratory CSS.
- `skills/lab-qc-presentation-theme/assets/lab-qc-deck.js` — keyboard navigation, overview, notes, print/PDF support.
- Contract tests for package validation.

## Install

From npm after publishing:

```bash
pi install npm:@firstpick/pi-skill-lab-qc-presentation-theme
```

From a local checkout:

```bash
pi install <absolute-path-to-package>
```

Installing or enabling packages changes the active Pi runtime configuration; review the skill first.

## Verification

```bash
cd <package-root>
npm test
```

## Notes

- No build step or runtime dependencies are required.
- Generated presentations should remain static and browser-openable.
- Company logos should be supplied per deck and referenced locally, not bundled by default.
