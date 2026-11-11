# Confidence Indicator — Vanilla JS compliance

Traces `ConfidenceIndicator.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ConfidenceIndicator.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-false-confidence` | MUST | `render()` displays `options.level` verbatim; the class never re-maps or inflates the level it is given. | "no-false-confidence: every level is displayed as given, never re-mapped to another level", "no-false-confidence: a downgrade from the host is shown immediately, with no stale higher level" (display half only — see Limits of the proof) |
| `accessible-confidence` | MUST | The label element always receives `CONFIDENCE_LABELS[level]` as `textContent`; the `__visual` span is `aria-hidden` decoration. | "accessible-confidence: text label rendered for each level", "accessible-confidence: visual element is aria-hidden" |
| `keyboard-expandable` | MUST | The detail disclosure is a native `<button>` created in `render()` with `aria-expanded`/`aria-controls` kept in sync by its click handler (keyboard-activatable by default). | "keyboard-expandable: the toggle is a native, focusable button with a name", "keyboard-expandable: toggle button present when detail provided", "keyboard-expandable: clicking toggle opens and closes the detail", "keyboard-expandable: toggle aria-controls points to detail element", "keyboard-expandable: expansion state survives update()" |
| `refusal-explicit` | SHOULD | The refusal branch in `render()` appends `refusalReason` as a caveat paragraph next to the label. | "refusal-level: refusalReason rendered when level is refusal", "refusal-level: refusalReason not rendered for non-refusal levels" |
| `no-jargon` | SHOULD | `CONFIDENCE_LABELS` is plain language only; no numeric scores are rendered. | — (copy review; vocabulary is pinned by the exported map) |
| `consistent-semantics` | MUST | `CONFIDENCE_LABELS` is the exported single mapping used by every render; identical levels always produce identical terms. | "consistent-semantics: CONFIDENCE_LABELS values are all unique", "consistent-semantics: a level renders the same term whatever else is on screen" |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — no layout engine in jsdom) runs in all five contract states, with the detail region collapsed and expanded: "axe: no WCAG A/AA violations across all five levels, detail collapsed and expanded".

## Limits of the proof

- `no-false-confidence`: the tests prove the display half — the level the host passes is the level shown, never re-mapped upward or mixed with another level's term. Whether that level reflects the model's *actual* confidence (calibration) is the data producer's responsibility and cannot be tested in a component. That half stays human review.
- `keyboard-expandable`: keyboard operation is proven by proxy. jsdom does not synthesize `click` from Enter/Space, so the test asserts native `<button type="button">`, enabled, in the tab order, focusable, and that toggling does not move focus.
- `consistent-semantics`: proven for this component (one exported map, one term per level, same term in every render). Consistency across the rest of a host UI is the host's responsibility.

## Deviations and notes

- `update()` rebuilds the component's DOM rather than mutating it in place. The expansion state survives, but if the toggle held focus when the host calls `update()`, focus is dropped. This departs from the repo's build-once convention; it is not a contract MUST and is left as a known gap.

- All DOM is built with `createElement`/`textContent` — no `innerHTML` — so caller-supplied strings cannot inject markup.
- `update()` re-renders without duplicating nodes (`root.textContent = ''` reset) while the `expanded` flag persists across rebuilds — asserted by "keyboard-expandable: expansion state survives update()" and "update: level change re-renders with the new label".
- Conditional caveats: "conditional-level: caveats list rendered when level is conditional".

## State coverage

The contract's states name confidence postures, and the component represents
them as the `level` value rather than an internal machine: `high-confidence`
→ `'high'`, `moderate-confidence` → `'moderate'`, `low-confidence` → `'low'`;
`conditional` and `refusal` are used as-is. Transitions happen by the host
re-rendering with a new level — the component holds no state of its own.
