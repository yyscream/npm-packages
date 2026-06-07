# Lab QC Presentation Theme Specification

This reference captures the reusable visual system for future presentations in the chemical production quality-control laboratory domain. It defines styling, German-language output expectations, and presentation mechanics only; content must always come from the current user-provided source.

## Audience and Tone

Target one or more of these roles:

- **Laboratory technician** — practical steps, sample handling, instrument outputs, repeatability, checklists, clear do/don't guidance.
- **Scientist** — method logic, data interpretation, validation evidence, assumptions, experimental/analytical workflow.
- **Quality-control teamleader** — review standards, role assignment, escalation, SOP fit, traceability, training, deviation control.

Language and tone:

- Generate visible presentation text, speaker notes, controls, README/source briefs, handouts, and other project documentation in **German** by default unless the user explicitly requests another language.
- Keep common terms such as QC, QA, SOP, SAP, LIMS, ELN, Batch/Charge, and Audit Trail where they are clearer or locally standard.
- Technical, calm, precise, operational.
- Avoid executive or manager pitch language.
- Prefer statements that can be verified from current source material.
- Use concrete QC-lab examples over broad transformation claims.

## Brand and Visual Identity

Use a modern professional green laboratory theme inspired by the previous deck.

### Color tokens

```css
--green-900: #05351f;  /* deep headings */
--green-800: #0b4c2c;  /* brand dark */
--green-700: #0d6b3c;  /* primary accent */
--green-600: #12814b;  /* active accent */
--green-500: #20a262;  /* fresh highlight */
--mint-200:  #d8f3e4;  /* highlighted panels */
--mint-100:  #eefaf3;  /* subtle backgrounds */
--sage-100:  #f4f8f3;  /* neutral lab tint */
--ink:       #18241d;  /* body text */
--muted:     #607166;  /* secondary text */
--line:      #d9e4dc;  /* borders */
--paper:     #ffffff;  /* card surface */
--warm:      #fbfcf8;  /* slide surface */
```

### Typography

- Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Titles: large, dark green, tight line-height, slight negative letter spacing.
- Body: 1.0–1.2rem equivalent, comfortable line height around 1.45–1.55.
- Avoid dense paragraphs. Use cards, bullets, and tables.

### Logo usage

- If a company logo is provided, use it in:
  - top navigation/header lockup;
  - title/hero or side card;
  - closing slide.
- Keep logo local to the deck directory. Do not hotlink or embed base64 unless the user asks.
- Logo should be visually prominent but not oversized; keep whitespace.

## Layout System

### Deck shell

- Static browser deck, 16:9-oriented.
- Maximum slide width around 1380px for screen presentation.
- Topbar with logo/brand lockup and optional controls.
- Footer with progress bar and slide count.
- Each slide is a rounded white/warm card on a subtle green lab background.

### Slide structure

Recommended slide classes/components:

- `.slide.hero` — large title plus logo/visual card.
- `.eyebrow` — uppercase section label with green dot motif.
- `.lead` — high-level explanatory text.
- `.card`, `.panel`, `.metric-card` — modular content blocks.
- `.role-card` — audience-specific cards.
- `.workflow-map` — process nodes and arrows.
- `.risk-table` — two-column risk/control matrix.
- `.matrix` — suitability or decision matrix.
- `.timeline` — phased implementation or validation plan.
- `.prompt-card` or `.code-card` — monospace blocks when relevant.

## Laboratory Motifs

Use subtle motif overlays only:

- Low-opacity hexagonal/grid background.
- Low-opacity molecule watermark on slides.
- Soft green radial gradients.
- Rounded glass-card effects with restrained shadows.

Avoid:

- Bright neon laboratory graphics.
- Cartoon beakers or irrelevant decorative science icons.
- Heavy animations that distract from QC content.

## Interaction Contract

The generated deck should support:

- `ArrowRight`, `PageDown`, `Space`: next slide.
- `ArrowLeft`, `PageUp`, `Backspace`: previous slide.
- `Home`/`End`: first/last slide.
- `O`: overview/grid mode.
- `N`: show/hide speaker notes.
- `P`: print/PDF.
- Optional `F`: fullscreen.
- Touch swipe on mobile/tablets.

## Print/PDF Contract

Include `@media print` rules:

- Page size 16:9, e.g. `@page { size: 16in 9in; margin: 0; }`.
- Hide controls, overview, ambient backgrounds, and speaker notes.
- Render every slide as one page.
- Use `print-color-adjust: exact` where supported.

## Content Framing Patterns

Good slide patterns for this domain:

1. **Why this matters in QC lab work** — direct operational relevance.
2. **Role-specific impact** — technician/scientist/teamleader cards.
3. **Workflow map** — sample/data/instrument/report/review flow.
4. **Risk and control** — QC-relevant controls, validation, traceability.
5. **Checklist** — what to do before use or release.
6. **30/60/90-day or phased plan** — if the content is implementation-oriented.
7. **Close** — one operational principle and next action.

Language examples:

- Use German QC phrasing such as: “Rückverfolgbarkeit der Probe”, “Methodenvalidierung”, “Geräteexport”, “LIMS/ELN-Übergabe”, “Prüfnachweis”, “Abweichungsbearbeitung”.
- Avoid English business-pitch phrases such as “executive alignment”, “market narrative”, “shareholder value”, “manager dashboard”, or “business transformation” unless explicitly present in source and needed.

## Quality Bar

A finished deck should be:

- written in German by default for both presentation and generated documentation;
- technically credible to QC lab staff;
- visually coherent without relying on external CDNs;
- navigable by keyboard;
- printable/exportable to PDF;
- locally self-contained except for user-approved assets;
- clearly based on the current source material only.
