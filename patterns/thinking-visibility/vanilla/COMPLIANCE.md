# Thinking Visibility — Vanilla JS compliance

Traces `ThinkingVisibility.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ThinkingVisibility.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reasoning-distinct` | MUST | `mount()` builds a `<section aria-label>` for reasoning and a separate `__answer` container; hosts render answers only via `getAnswerContainer()`. | "reasoning-distinct: reasoning text lands only in the labelled reasoning region, the answer only in the answer region", "reasoning-distinct: reasoning region is a \<section\> with aria-label", "reasoning-distinct: answer container is separate from reasoning region" |
| `disclosure-accessible` | MUST | The disclosure is a native `<button>`; `applyExpansion()` keeps `aria-expanded` and the region's `hidden` attribute in sync on every toggle and phase change. | "disclosure-accessible: the disclosure is a native, focusable button with a name", "disclosure-accessible: aria-expanded matches the region visibility in every phase and after every toggle", "disclosure-accessible: disclosure button has aria-expanded and aria-controls", "disclosure-accessible: clicking disclosure toggles region visibility" |
| `phase-announced` | MUST | `setPhase()` writes `PHASE_MESSAGES[phase]` into the persistent `role="status"` polite live region. | "phase-announced: status region contains PHASE_MESSAGES text for each phase" |
| `non-blocking` | MUST NOT | The component renders inline into its container; no overlay or focus trap is created, and no listener prevents interaction elsewhere. | "non-blocking: the rest of the page stays focusable and operable through every phase", "non-blocking: reasoning region is a section element, not a dialog role" |
| `collapse-after-answer` | SHOULD | `isExpanded()` returns `userToggled ?? (phase is thinking/answering)` — collapsed at completed unless the user explicitly expanded. | "collapse-after-answer: region auto-collapses when phase transitions to completed", "collapse-after-answer: user toggle overrides auto-expand", "auto-expand: region is visible during thinking and answering" |
| `working-notes-label` | SHOULD | The constructor's `label` (default "Working notes") is both the disclosure text and the section's `aria-label`. | "reasoning-distinct: reasoning region is a \<section\> with aria-label" (asserts the label value) |
| `reasoning-opt-out` | MAY | Not implemented — persistence belongs to the host's settings layer. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states, and in completed with the reasoning re-expanded: "axe: no WCAG A/AA violations in idle, thinking, answering, and completed states".

## Limits of the proof

- `non-blocking`: tests prove the component adds no modal semantics, makes nothing outside it inert or `aria-hidden`, never moves focus, and does not trap Tab. A visual overlay created by a host stylesheet (fixed positioning over the page) is outside what jsdom can see.
- `disclosure-accessible`: keyboard operation is by proxy — native `<button type="button">`, in the tab order, focusable; jsdom does not synthesize `click` from Enter/Space.
- `reasoning-distinct`: "visually distinct" is proven structurally (a separately labelled `<section>` with its own class, sibling to the answer). Rendered appearance depends on the host stylesheet.

## Deviations and notes

- `appendThinking()` appends text nodes — streamed chunks render progressively and cannot inject markup — asserted by "appendThinking: adds text content to the reasoning region".
- Per-instance region ids prevent `aria-controls` collisions: "two instances do not share live region ids".
