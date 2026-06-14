# Thinking Visibility — Vanilla JS compliance

Traces `ThinkingVisibility.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ThinkingVisibility.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reasoning-distinct` | MUST | `mount()` builds a `<section aria-label>` for reasoning and a separate `__answer` container; hosts render answers only via `getAnswerContainer()`. | "reasoning-distinct: reasoning region is a \<section\> with aria-label", "reasoning-distinct: answer container is separate from reasoning region" |
| `disclosure-accessible` | MUST | The disclosure is a native `<button>`; `applyExpansion()` keeps `aria-expanded` and the region's `hidden` attribute in sync on every toggle and phase change. | "disclosure-accessible: disclosure button has aria-expanded and aria-controls", "…clicking disclosure toggles region visibility" |
| `phase-announced` | MUST | `setPhase()` writes `PHASE_MESSAGES[phase]` into the persistent `role="status"` polite live region. | "phase-announced: status region contains PHASE_MESSAGES text for each phase" |
| `non-blocking` | MUST NOT | The component renders inline into its container; no overlay or focus trap is created, and no listener prevents interaction elsewhere. | "non-blocking: reasoning region is a section element, not a dialog role" |
| `collapse-after-answer` | SHOULD | `isExpanded()` returns `userToggled ?? (phase is thinking/answering)` — collapsed at completed unless the user explicitly expanded. | "collapse-after-answer: region auto-collapses when phase transitions to completed", "collapse-after-answer: user toggle overrides auto-expand", "auto-expand: region is visible during thinking and answering" |
| `working-notes-label` | SHOULD | The constructor's `label` (default "Working notes") is both the disclosure text and the section's `aria-label`. | "reasoning-distinct: reasoning region is a \<section\> with aria-label" (asserts the label value) |
| `reasoning-opt-out` | MAY | Not implemented — persistence belongs to the host's settings layer. | — |

## Deviations and notes

- `appendThinking()` appends text nodes — streamed chunks render progressively and cannot inject markup — asserted by "appendThinking: adds text content to the reasoning region".
- Per-instance region ids prevent `aria-controls` collisions: "two instances do not share live region ids".
