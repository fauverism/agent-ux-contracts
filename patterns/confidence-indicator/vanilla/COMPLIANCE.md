# Confidence Indicator — Vanilla JS compliance

Traces `ConfidenceIndicator.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ConfidenceIndicator.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-false-confidence` | MUST | `render()` displays `options.level` verbatim; the class never re-maps or inflates the level it is given. | — (human review; faithful display is covered indirectly by the per-level label test) |
| `accessible-confidence` | MUST | The label element always receives `CONFIDENCE_LABELS[level]` as `textContent`; the `__visual` span is `aria-hidden` decoration. | "accessible-confidence: text label rendered for each level", "accessible-confidence: visual element is aria-hidden" |
| `keyboard-expandable` | MUST | The detail disclosure is a native `<button>` created in `render()` with `aria-expanded`/`aria-controls` kept in sync by its click handler (keyboard-activatable by default). | "keyboard-expandable: toggle button present when detail provided", "…clicking toggle opens and closes the detail", "…toggle aria-controls points to detail element", "…expansion state survives update()" |
| `refusal-explicit` | SHOULD | The refusal branch in `render()` appends `refusalReason` as a caveat paragraph next to the label. | "refusal-level: refusalReason rendered when level is refusal", "refusal-level: refusalReason not rendered for non-refusal levels" |
| `no-jargon` | SHOULD | `CONFIDENCE_LABELS` is plain language only; no numeric scores are rendered. | — (copy review; vocabulary is pinned by the exported map) |
| `consistent-semantics` | MUST | `CONFIDENCE_LABELS` is the exported single mapping used by every render; identical levels always produce identical terms. | "consistent-semantics: CONFIDENCE_LABELS values are all unique" |

## Deviations and notes

- All DOM is built with `createElement`/`textContent` — no `innerHTML` — so caller-supplied strings cannot inject markup.
- `update()` re-renders without duplicating nodes (`root.textContent = ''` reset) while the `expanded` flag persists across rebuilds — asserted by "keyboard-expandable: expansion state survives update()" and "update: level change re-renders with the new label".
- Conditional caveats: "conditional-level: caveats list rendered when level is conditional".
