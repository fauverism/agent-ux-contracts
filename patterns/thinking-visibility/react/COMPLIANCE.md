# Thinking Visibility — React compliance

Traces `ThinkingVisibility.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ThinkingVisibility.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reasoning-distinct` | MUST | Reasoning renders in a `<section aria-label="Working notes">` with its own class, separate from `__answer`; the answer is always the unconditionally-rendered primary region. | "reasoning-distinct: reasoning text lands only in the labelled reasoning region, the answer only in the answer region", "reasoning-distinct: reasoning region is a \<section\> with aria-label", "reasoning-distinct: answer region is separate from the reasoning region" |
| `disclosure-accessible` | MUST | The disclosure is a native `<button>` with `aria-expanded` and `aria-controls` wired to the region id; toggling is click/keyboard, never hover. | "disclosure-accessible: the disclosure is a native, focusable button with a name", "disclosure-accessible: aria-expanded matches the region visibility in every phase and after every toggle", "disclosure-accessible: disclosure button has aria-expanded and aria-controls", "disclosure-accessible: clicking disclosure toggles aria-expanded and region visibility" |
| `phase-announced` | MUST | A persistent `role="status"` polite live region renders `PHASE_MESSAGES[phase]`; each phase change replaces its text, producing an announcement. | "phase-announced: PHASE_MESSAGES text appears in the polite live region" |
| `non-blocking` | MUST NOT | The component renders inline with no overlay, focus trap, or `inert` siblings; the page remains fully interactive during thinking. | "non-blocking: the rest of the page stays focusable and operable through every phase", "non-blocking: reasoning region is inline, not an overlay (no fixed/absolute positioning class)" |
| `collapse-after-answer` | SHOULD | `expanded = userToggled ?? autoExpanded` — auto-open during thinking/answering, auto-collapsed at completed, but an explicit user expansion (`userToggled = true`) survives completion. | "collapse-after-answer: region auto-collapses when phase transitions to completed", "collapse-after-answer: user toggle overrides auto-collapse", "auto-expand: region is visible during thinking and answering phases" |
| `working-notes-label` | SHOULD | The `label` prop defaults to "Working notes" and renders as both the disclosure text and the region's accessible name. | "reasoning-distinct: reasoning region is a \<section\> with aria-label" (asserts the label value) |
| `reasoning-opt-out` | MAY | Not implemented — a persistent preference belongs to the host's settings layer. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states, and in completed with the reasoning re-expanded: "axe: no WCAG A/AA violations in idle, thinking, answering, and completed states".

## Limits of the proof

- `non-blocking`: tests prove the component adds no modal semantics, makes nothing outside it inert or `aria-hidden`, never moves focus, and does not trap Tab. A visual overlay created by a host stylesheet (fixed positioning over the page) is outside what jsdom can see.
- `disclosure-accessible`: keyboard operation is by proxy — native `<button type="button">`, in the tab order, focusable; jsdom does not synthesize `click` from Enter/Space.
- `reasoning-distinct`: "visually distinct" is proven structurally (a separately labelled `<section>` with its own class, sibling to the answer). Rendered appearance depends on the host stylesheet.

## Deviations and notes

- `PHASE_MESSAGES` is exported so hosts and tests share one phase vocabulary.
