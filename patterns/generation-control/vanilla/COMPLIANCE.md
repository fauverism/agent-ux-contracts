# Generation Control — Vanilla JS compliance

Traces `GenerationControl.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`GenerationControl.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-silent-destruction` | MUST NOT | `this.variants` is append-only; `regenerate()` pushes and `show()` navigates. No code path removes or overwrites a variant. | "no-silent-destruction: regenerate appends a new variant, does not replace v1", "no-silent-destruction: every earlier variant stays reachable through the Previous control", "no-silent-destruction: a failed regeneration leaves the displayed variant and history intact" |
| `variant-position-visible` | MUST | `renderCurrent()` writes "Variant N of M" into the navigator's position element on every change. | "variant-position-visible: position label present on mount", "…updates after regeneration", "…updates on show()" |
| `single-flight-regeneration` | MUST | `regenerate()` guards on `this.busy`; during flight the button exposes `aria-disabled`/`aria-busy` and reads "Generating…". | "single-flight-regeneration: concurrent calls produce only one new variant", "single-flight-regeneration: repeat clicks on the button while generating produce one request", "single-flight-regeneration: button has aria-disabled and aria-busy while generating" |
| `controls-keyboard-operable` | MUST | All controls are native `<button>`s with accessible names; the refine field carries an `aria-label`. | "controls-keyboard-operable: regenerate, previous, next, and refine are native, named, focusable controls", "controls-keyboard-operable: the regenerate control stays focusable while a generation is in flight", "controls-keyboard-operable: nav buttons are native \<button\> elements", "controls-keyboard-operable: prev disabled at first variant, next disabled at last", axe tests |
| `variant-change-announced` | MUST | The polite `role="status"` region is updated by `show()` and `regenerate()` with position-bearing messages. | "variant-change-announced: status region announces on show()", "variant-change-announced: status region announces when generation completes" |
| `refine-carries-context` | SHOULD | The refine input's value passes to `onGenerate(refinement)` and is never cleared; appending to original context is the documented host contract. | — (host contract; the input is never reset by any code path) |
| `side-by-side-compare` | MAY | Not implemented. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) covers all three contract states: "axe: no WCAG A/AA violations when generated, regenerating, after a failure, and with several variants". `failed` is exercised as "generated + failure announcement": on failure the current variant stays rendered and the status region reports it.

## Limits of the proof

- `controls-keyboard-operable`: keyboard operation is proven by proxy. jsdom does not synthesize `click` from Enter/Space, so the tests assert native `<button type="button">` / `<input>`, enabled, named, in the tab order, and focusable — including the regenerate control while it is busy.
- `no-silent-destruction`: "irrecoverably" is proven for the life of the mounted component (history is in memory). Persistence across unmount or reload is the host's responsibility.

## Deviations and notes

- Output renders via `textContent` (plain text). Hosts needing rich output should render into `__output` themselves while preserving the history semantics.
- Navigation buttons use native `disabled` at the ends of history (deliberate end-stop); the regenerate button keeps focus during busy via `aria-disabled`.
- `show()` clamps out-of-range indexes (guard returns early) — failure leaves `variants` and the rendered output untouched, asserted by "failed regeneration: existing variant remains intact".
