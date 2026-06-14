# Thinking Visibility — React compliance

Traces `ThinkingVisibility.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ThinkingVisibility.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reasoning-distinct` | MUST | Reasoning renders in a `<section aria-label="Working notes">` with its own class, separate from `__answer`; the answer is always the unconditionally-rendered primary region. | "reasoning-distinct: reasoning region is a \<section\> with aria-label", "reasoning-distinct: answer region is separate from the reasoning region" |
| `disclosure-accessible` | MUST | The disclosure is a native `<button>` with `aria-expanded` and `aria-controls` wired to the region id; toggling is click/keyboard, never hover. | "disclosure-accessible: disclosure button has aria-expanded and aria-controls", "…clicking disclosure toggles aria-expanded and region visibility" |
| `phase-announced` | MUST | A persistent `role="status"` polite live region renders `PHASE_MESSAGES[phase]`; each phase change replaces its text, producing an announcement. | "phase-announced: PHASE_MESSAGES text appears in the polite live region" |
| `non-blocking` | MUST NOT | The component renders inline with no overlay, focus trap, or `inert` siblings; the page remains fully interactive during thinking. | "non-blocking: reasoning region is inline, not an overlay (no fixed/absolute positioning class)" |
| `collapse-after-answer` | SHOULD | `expanded = userToggled ?? autoExpanded` — auto-open during thinking/answering, auto-collapsed at completed, but an explicit user expansion (`userToggled = true`) survives completion. | "collapse-after-answer: region auto-collapses when phase transitions to completed", "collapse-after-answer: user toggle overrides auto-collapse", "auto-expand: region is visible during thinking and answering phases" |
| `working-notes-label` | SHOULD | The `label` prop defaults to "Working notes" and renders as both the disclosure text and the region's accessible name. | "reasoning-distinct: reasoning region is a \<section\> with aria-label" (asserts the label value) |
| `reasoning-opt-out` | MAY | Not implemented — a persistent preference belongs to the host's settings layer. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in thinking and completed states" runs axe-core (WCAG A/AA tags) in both states; `color-contrast` is excluded (no layout engine in jsdom).

## Deviations and notes

- `PHASE_MESSAGES` is exported so hosts and tests share one phase vocabulary.
