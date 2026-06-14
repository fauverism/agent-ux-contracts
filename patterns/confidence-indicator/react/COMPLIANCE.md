# Confidence Indicator — React compliance

Traces `ConfidenceIndicator.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ConfidenceIndicator.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-false-confidence` | MUST | The component renders the `level` prop verbatim and never re-maps or inflates it. Calibration of the level itself is the data producer's responsibility; this component is a faithful display. | — (human review; faithful display is covered indirectly by the per-level label test) |
| `accessible-confidence` | MUST | The text label from `CONFIDENCE_LABELS` is always rendered as visible text; the colored `__visual` glyph is `aria-hidden` decoration, never the only signal. | "accessible-confidence: label text is rendered as readable text, not only visual", "accessible-confidence: visual element is aria-hidden" |
| `keyboard-expandable` | MUST | The detail region is toggled by a native `<button>` with `aria-expanded` and `aria-controls`; no hover-only path exists. | "keyboard-expandable: toggle button present when detail prop provided", "…clicking toggle opens and closes the detail", "…toggle has aria-controls pointing to the detail element", "…no toggle button when detail is absent" |
| `refusal-explicit` | SHOULD | When `level="refusal"`, the `refusalReason` prop renders in the caveat region adjacent to the label. | "refusal-level: refusalReason renders when level is refusal", "refusal-level: refusalReason is not rendered for non-refusal levels" |
| `no-jargon` | SHOULD | `CONFIDENCE_LABELS` maps every level to plain language ("Likely", "Uncertain"); no numeric scores appear anywhere in the component. | — (copy review; vocabulary is pinned by the exported map) |
| `consistent-semantics` | MUST | `CONFIDENCE_LABELS` is the exported single source of truth; every render path reads from it, so a level can never display two different terms. | "consistent-semantics: CONFIDENCE_LABELS keys map each level uniquely" |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations across all five levels" runs axe-core (WCAG A/AA tags) per level with detail/refusal/caveats populated; `color-contrast` is excluded (no layout engine in jsdom).
- Conditional caveats: "conditional-level: caveats list rendered when level is conditional".

## Deviations and notes

- `refusalReason` and `caveats` are caller-supplied; passing `level="refusal"` without a reason renders the label only. Hosts should always supply the reason (`refusal-explicit` is SHOULD-level).
