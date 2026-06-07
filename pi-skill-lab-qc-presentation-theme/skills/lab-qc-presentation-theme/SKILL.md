---
name: lab-qc-presentation-theme
description: "Use when creating or restyling German HTML/CSS/JS presentations for chemical production quality-control laboratory audiences: laboratory technicians, scientists, and/or quality-control teamleaders. Reproduces a modern professional green laboratory theme while regenerating content only from the current source material."
license: MIT
compatibility: Portable Agent Skills-style skill; optional Pi adapter included.
---

# Lab QC Presentation Theme

Create polished browser-based presentations for chemical production quality-control laboratories while preserving the reusable visual style from the prior successful deck. The skill standardizes **theme, German-language output, structure, audience framing, and verification**; it does **not** preserve prior deck content.

## When to Use

Use this skill when the user asks to create, convert, or restyle a presentation and all of these are true:

- The deliverable is an HTML/CSS/JS presentation or browser-based slide deck.
- The industry context is chemical production quality control laboratory work.
- The audience is one or more of: laboratory technician, scientist, quality-control teamleader.
- The requested style should be modern, professional, subtle, laboratory-themed, and greenish.

Do not use this skill for:

- Generic corporate, sales, executive, or manager-oriented decks.
- Scientific posters, manuscripts, SOPs, or reports that are not slide presentations.
- Reusing the old presentation's content, claims, charts, or topic; only the visual system and deck mechanics are reusable.

## Inputs and Assumptions

Expected inputs, as available:

- Source content: Markdown, notes, outline, report, pasted text, or user instructions.
- Optional company logo image. If supplied, copy it next to the generated deck and reference it locally.
- Optional output filename/directory. If absent, create clear names such as `lab-qc-presentation.html`, `lab-qc-presentation.css`, and `lab-qc-presentation.js`.
- Optional audience subset. If unspecified, target all three allowed roles.
- Optional language override. If absent, generate the presentation, speaker notes, UI labels, README files, source briefs, handouts, and other project documentation in **German**.

Assumptions:

- The deck should be useful to technical QC laboratory roles, not business management.
- German is the default output language for visible deck text and generated documentation unless the user explicitly requests another language.
- Keep common regulated/QC abbreviations such as QC, QA, SOP, SAP, LIMS, and ELN when they are clearer than forced translations.
- The content must come from the current input. Do not import facts or sections from earlier decks unless the user explicitly provides them again.
- When source material contains uncertainty, estimates, or claims, preserve uncertainty and avoid overclaiming.

## Portable Workflow

1. **Inspect the current source material**
   - Find the Markdown or source notes in the working directory, or use the user's supplied text.
   - Identify the intended audience subset: laboratory technician, scientist, quality-control teamleader.
   - Determine the language: default to German for the deck and generated documentation unless the user explicitly requests another language.
   - Extract only presentation-relevant content from the current source.

2. **Plan a technical QC-lab narrative**
   - Prefer practical slide arcs: context → workflow impact → role-specific implications → risks/controls → implementation/checklist → close.
   - Use German QC laboratory vocabulary where appropriate: Proben, Chargen, Methoden, Geräte/Instrumente, LIMS/ELN, Abweichungen, SOPs, Validierung, Rückverfolgbarkeit, QA/QC-Prüfung.
   - Avoid manager framing such as budget pitch, executive KPI narrative, market positioning, or generic transformation language.

3. **Apply the theme contract**
   - Read `references/THEME-SPEC.md` for the visual system.
   - Use the bundled assets as a starting point when useful:
     - `assets/starter-template.html`
     - `assets/lab-qc-theme.css`
     - `assets/lab-qc-deck.js`
   - Keep HTML, CSS, and JS in separate files for maintainability.
   - Use a 16:9 deck with keyboard navigation, overview mode, progress, notes toggle, and print/PDF support.

4. **Generate role-aware slides**
   - Add a title/hero slide with company logo if available.
   - Include one or more audience framing slides showing the selected role(s).
   - Use role cards, workflow maps, risk/control tables, checklists, matrices, timelines, and simple inline SVG charts where they clarify technical content.
   - Maintain concise slide text; move extra presenter guidance to hidden speaker notes.

5. **Preserve the laboratory visual language**
   - Green palette, white/glass cards, soft shadows, subtle molecular/hex background motifs.
   - Clean typography, strong hierarchy, restrained lab icons, no cartoonish science clipart.
   - Use safety/control emphasis for QC topics: validation, audit trail, documented review, sample/data integrity.

6. **Verify before final response**
   - Confirm all referenced local assets exist.
   - Count slides and report the count.
   - Check that the generated deck references the selected logo path correctly when a logo is provided.
   - Spot-check that visible deck text, speaker notes, controls, README/source briefs, and generated documentation are in German unless a different language was requested.
   - Openability check: the HTML file should work directly in a browser without a build step.

## Theme Contract Summary

Minimum reproducible theme characteristics:

- **Palette:** dark forest green headings, KLK-like mid green accents, mint backgrounds, warm white slide surfaces.
- **Language:** German for presentation and generated documentation by default; preserve standard QC abbreviations where useful.
- **Tone:** professional laboratory, quality-controlled, technical, calm, precise.
- **Layout:** large expressive titles, modular cards, role cards, split panels, workflow nodes, risk tables, checklists, timelines.
- **Motifs:** subtle molecular watermark and/or hex grid; motifs must stay low-opacity and never distract from content.
- **Branding:** logo in topbar and closing slide when available; otherwise reserve neutral brand space.
- **Interaction:** left/right/space navigation, overview shortcut, notes toggle, print/PDF shortcut, progress footer.
- **Print:** `@media print` with 16:9 pages and controls hidden.

For detailed tokens and component rules, see `references/THEME-SPEC.md`.

## Safety and Side Effects

- Creating or overwriting presentation files is a file-writing side effect; use the smallest clear output set and avoid unrelated file changes.
- Ask before deleting, moving, or overwriting user-authored files unless the user explicitly requested replacement.
- Do not place secrets, private customer data, credentials, raw production data, or unredacted regulated data into the deck.
- If the source contains sensitive QC or production data, recommend anonymized/synthetic examples before creating a shareable presentation.
- Do not invent citations, statistics, study claims, or company facts not present in the current source material.
- If the user asks for an audience outside the allowed role set, ask whether to adapt the scope or proceed without this skill.

## Scripts, References, and Dependencies

No build dependencies are required. The bundled files are plain HTML/CSS/JS assets that can be copied or adapted:

```text
assets/starter-template.html
assets/lab-qc-theme.css
assets/lab-qc-deck.js
references/THEME-SPEC.md
```

The generated presentation should be browser-openable as static files. Any generated project documentation should be German by default.

## Verification

For the skill package itself:

```bash
cd <package-root>
npm test
```

For a generated presentation, run an equivalent local check:

```bash
python3 - <<'PY'
from pathlib import Path
import re
html = Path('lab-qc-presentation.html')
text = html.read_text(encoding='utf-8')
refs = re.findall(r'(?:href|src)="([^"]+)"', text)
missing = [r for r in refs if not r.startswith(('http://','https://','#')) and not Path(r).exists()]
slides = len(re.findall(r'<section[^>]+class="[^"]*slide', text))
print({'slides': slides, 'missing_refs': missing})
assert slides >= 8
assert not missing
PY
```

Adjust the filename if the user requested a different one.

## Pi Adapter

- In Pi, use `read` for source Markdown and existing generated assets before editing.
- Use `write` for new deck files or full rewrites; use `edit` for precise updates to existing files.
- Write generated presentation text, speaker notes, UI labels, README files, source briefs, and project documentation in German unless the user explicitly requests another language.
- Use the live todo checklist for non-trivial deck creation.
- If the user supplies an uploaded logo, copy it into the project/output directory before referencing it.
- Do not auto-install or enable this skill package after editing it; package enablement requires explicit user confirmation.
