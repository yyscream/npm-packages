# Pi Web UI mobile improvement plan

## Research basis

- MDN viewport docs: use `width=device-width, initial-scale=1`; `viewport-fit=cover` requires safe-area inset handling; `interactive-widget=resizes-content` can make layout respond to virtual keyboards.
- MDN VisualViewport docs: mobile browsers may change the visual viewport rather than the layout viewport; `visualViewport` exposes `resize` and `scroll` events for keyboard/zoom-aware positioning.
- W3C/WAI WCAG target-size guidance: custom pointer targets should be at least `44px × 44px` for enhanced touch usability; mobile guidance also recommends clear navigation, minimized distractions, responsive reflow, and touch-target spacing.

## Current code audit

- `public/index.html:5` has only `width=device-width, initial-scale=1`; it does not opt into `viewport-fit=cover` or `interactive-widget=resizes-content`.
- `public/styles.css` already has responsive breakpoints at `1050px` and `720px`, uses `100dvh`, and applies `env(safe-area-inset-bottom)` to the mobile composer.
- Touch targets are currently smaller than the W3C enhanced target size in multiple places: global `button, select, input` uses `min-height: 2.35rem` (~37.6px at 16px root), and mobile `.composer-row button` also uses `2.35rem`.
- `public/app.js` collapses the side panel by default at `max-width: 720px`, but does not react when the viewport crosses that breakpoint after load.
- `public/app.js` has no `visualViewport`/keyboard handling and always calls `scrollChatToBottom()` during streaming updates, which can fight users reading older messages.
- `package.json` currently has no test scripts.

## Prioritized implementation list

| Priority | Implement | Why it helps on mobile | Main files | Acceptance / verification |
|---|---|---|---|---|
| P0 | Add a mobile regression harness | Prevents future CSS/JS tweaks from breaking small screens. | `package.json`, new `tests/` or `scripts/` | Run at 320/360/390/430/768px widths; assert no horizontal overflow, composer visible, all primary controls reachable, side panel usable, and key touch targets `>=44×44px`. |
| P0 | Stabilize viewport + keyboard behavior | Chat UIs fail hardest when the keyboard hides the composer or resizes unpredictably. | `public/index.html`, `public/styles.css`, `public/app.js` | Add viewport metadata after browser-support review; add VisualViewport-driven CSS vars/fallbacks; verify composer remains above keyboard on iOS Safari and Android Chrome. |
| P0 | Make composer thumb-friendly | Current mobile row has too many same-weight actions and sub-44px controls. | `public/index.html`, `public/styles.css`, `public/app.js` | On `<=720px`, keep `Send` as dominant action, make all tap targets at least 44px high, move `New`, `Compact`, `Git workflow`, and possibly busy behavior into an actions sheet/menu. |
| P1 | Convert the side panel into a mobile drawer/bottom sheet | The side panel is collapsed by default, but opening it on mobile should not push the chat into a long stacked page. | `public/index.html`, `public/styles.css`, `public/app.js` | Side panel opens as overlay with backdrop, close affordance, focus management, Escape/backdrop close, and scroll contained inside the panel. |
| P1 | Add smart transcript anchoring + “jump to latest” | Streaming should auto-scroll only when the user is already near the bottom. | `public/app.js`, `public/styles.css` | If user scrolls up, incoming tokens do not force-scroll; show a visible “Latest” button/badge; tapping it returns to bottom and resumes auto-scroll. |
| P1 | Compress tabs/footer/status for one-hand use | Tabs and metrics occupy scarce vertical space; important state should stay visible but not crowd the transcript. | `public/styles.css`, `public/app.js` | Mobile footer becomes one-line summary with expandable details; tabs remain horizontally scrollable with 44px close/new targets; cwd/model/branch remain discoverable. |
| P2 | Make dialogs and path picker mobile-native | Modal content and directory picking need full-height/bottom-sheet behavior on phones. | `public/styles.css`, `public/app.js` | Dialogs fit within visual viewport, respect top/bottom safe areas, lock background scroll, and all directory/fast-pick actions are touch-sized. |
| P2 | Add accessibility/performance mobile polish | Reduces motion/glow overhead and fixes hover-only affordances on touch devices. | `public/styles.css`, `public/app.js` | Add `prefers-reduced-motion`; reduce decorative backgrounds on small screens; handle `hover: none`; make Git tooltip info accessible by tap/focus, not hover only. |

## Verification checklist for implementation

1. Static checks: `node --check public/app.js`, `node --check bin/pi-webui.mjs`, and `npm pack --dry-run`.
2. Automated mobile layout checks: emulate iPhone SE-ish `320×568`, common Android `360×740`, iPhone `390×844`, large phone `430×932`, and tablet `768×1024`.
3. Layout assertions: `document.documentElement.scrollWidth <= window.innerWidth`, no clipped composer, no unreachable Send button, no body scroll leak while overlays are open.
4. Touch assertions: measure key `button`, `select`, tab, side-panel, and dialog controls; flag any custom control below `44×44px` unless an equivalent larger target exists.
5. Manual device checks: iOS Safari and Android Chrome with virtual keyboard open, orientation changes, network side-panel open, path picker open, and long streamed assistant output.

## Implementation progress

Started in this package:

- Added static mobile regression checks in `tests/mobile-static.test.mjs` and package `test`/`check` scripts.
- Updated the viewport meta for `viewport-fit=cover` and `interactive-widget=resizes-content`.
- Added VisualViewport-driven CSS variables for keyboard/viewport-aware sizing.
- Raised base and mobile composer touch targets to at least 44px.
- Converted the mobile side panel into an overlay drawer with a backdrop close target.
- Added smart transcript anchoring and a `Latest ↓` control so streaming does not force-scroll while reading older output.
- Added mobile dialog/path-picker viewport constraints.
- Moved secondary composer controls (`Busy prompt behavior`, `New`, `Compact`, `Git workflow`) into a mobile actions sheet so the primary mobile composer stays focused on `Actions`, `Steer`, `Follow-up`, and `Send`.
- Added an expandable mobile footer: collapsed view prioritizes `cwd` and context, `Details` reveals the remaining metrics plus git/runtime/model metadata.
- Collapsed terminal tabs on mobile into an active-tab toggle; the full tab strip opens as an overlay only when needed, preserving transcript/composer space.
- Changed mobile extension/path-picker dialogs into bottom-sheet-style dialogs constrained to the visual viewport.
- Made cwd picker fast picks server-persistent across browser tabs, Pi terminal tabs, and Web UI server restarts, with migration from existing browser-local fast picks.
- Added reduced-motion/coarse-pointer polish to avoid hover/motion-heavy behavior on touch devices.

Still needs real-device/browser verification, especially iOS Safari keyboard behavior and Android Chrome keyboard behavior.
