# Confidence Indicator — React compliance

Traces `ConfidenceIndicator.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ConfidenceIndicator.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-false-confidence` | MUST | The component renders the `level` prop verbatim and never re-maps or inflates it. Calibration of the level itself is the data producer's responsibility; this component is a faithful display. | "no-false-confidence: every level is displayed as given, never re-mapped to another level", "no-false-confidence: a downgrade from the host is shown immediately, with no stale higher level" (display half only — see Limits of the proof) |
| `accessible-confidence` | MUST | The text label from `CONFIDENCE_LABELS` is always rendered as visible text; the colored `__visual` glyph is `aria-hidden` decoration, never the only signal. | "accessible-confidence: label text is rendered as readable text, not only visual", "accessible-confidence: visual element is aria-hidden" |
| `keyboard-expandable` | MUST | The detail region is toggled by a native `<button>` with `aria-expanded` and `aria-controls`; no hover-only path exists. | "keyboard-expandable: the toggle is a native, focusable button with a name", "keyboard-expandable: toggle button present when detail prop provided", "keyboard-expandable: clicking toggle opens and closes the detail", "keyboard-expandable: toggle has aria-controls pointing to the detail element", "keyboard-expandable: no toggle button when detail is absent" |
| `refusal-explicit` | SHOULD | When `level="refusal"`, the `refusalReason` prop renders in the caveat region adjacent to the label. | "refusal-level: refusalReason renders when level is refusal", "refusal-level: refusalReason is not rendered for non-refusal levels" |
| `no-jargon` | SHOULD | `CONFIDENCE_LABELS` maps every level to plain language ("Likely", "Uncertain"); no numeric scores appear anywhere in the component. | — (copy review; vocabulary is pinned by the exported map) |
| `consistent-semantics` | MUST | `CONFIDENCE_LABELS` is the exported single source of truth; every render path reads from it, so a level can never display two different terms. | "consistent-semantics: CONFIDENCE_LABELS keys map each level uniquely", "consistent-semantics: a level renders the same term whatever else is on screen" |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — no layout engine in jsdom) runs in all five contract states, with the detail region collapsed and expanded: "axe: no WCAG A/AA violations across all five levels", "axe: no WCAG A/AA violations with the detail region expanded".
- Conditional caveats: "conditional-level: caveats list rendered when level is conditional".

## Limits of the proof

- `no-false-confidence`: the tests prove the display half — the level the host passes is the level shown, never re-mapped upward or mixed with another level's term. Whether that level reflects the model's *actual* confidence (calibration) is the data producer's responsibility and cannot be tested in a component. That half stays human review.
- `keyboard-expandable`: keyboard operation is proven by proxy. jsdom does not synthesize `click` from Enter/Space, so the test asserts native `<button type="button">`, enabled, in the tab order, focusable, and that toggling does not move focus.
- `consistent-semantics`: proven for this component (one exported map, one term per level, same term in every render). Consistency across the rest of a host UI is the host's responsibility.

## Deviations and notes

- `refusalReason` and `caveats` are caller-supplied; passing `level="refusal"` without a reason renders the label only. Hosts should always supply the reason (`refusal-explicit` is SHOULD-level).

## State coverage

The contract's states name confidence postures, and the component represents
them as the `level` value rather than an internal machine: `high-confidence`
→ `'high'`, `moderate-confidence` → `'moderate'`, `low-confidence` → `'low'`;
`conditional` and `refusal` are used as-is. Transitions happen by the host
re-rendering with a new level — the component holds no state of its own.
