# Generation Control — Vanilla JS compliance

Traces `GenerationControl.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`GenerationControl.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-silent-destruction` | MUST NOT | `this.variants` is append-only; `regenerate()` pushes and `show()` navigates. No code path removes or overwrites a variant. | "no-silent-destruction: regenerate appends a new variant, does not replace v1", "failed regeneration: existing variant remains intact" |
| `variant-position-visible` | MUST | `renderCurrent()` writes "Variant N of M" into the navigator's position element on every change. | "variant-position-visible: position label present on mount", "…updates after regeneration", "…updates on show()" |
| `single-flight-regeneration` | MUST | `regenerate()` guards on `this.busy`; during flight the button exposes `aria-disabled`/`aria-busy` and reads "Generating…". | "single-flight-regeneration: concurrent calls produce only one new variant", "single-flight-regeneration: button has aria-disabled and aria-busy while generating" |
| `controls-keyboard-operable` | MUST | All controls are native `<button>`s with accessible names; the refine field carries an `aria-label`. | "controls-keyboard-operable: nav buttons are native \<button\> elements", "controls-keyboard-operable: prev disabled at first variant, next disabled at last" |
| `variant-change-announced` | MUST | The polite `role="status"` region is updated by `show()` and `regenerate()` with position-bearing messages. | "variant-change-announced: status region announces on show()", "variant-change-announced: status region announces when generation completes" |
| `refine-carries-context` | SHOULD | The refine input's value passes to `onGenerate(refinement)` and is never cleared; appending to original context is the documented host contract. | — (host contract; the input is never reset by any code path) |
| `side-by-side-compare` | MAY | Not implemented. | — |

## Deviations and notes

- Output renders via `textContent` (plain text). Hosts needing rich output should render into `__output` themselves while preserving the history semantics.
- Navigation buttons use native `disabled` at the ends of history (deliberate end-stop); the regenerate button keeps focus during busy via `aria-disabled`.
- `show()` clamps out-of-range indexes (guard returns early) — failure leaves `variants` and the rendered output untouched, asserted by "failed regeneration: existing variant remains intact".
