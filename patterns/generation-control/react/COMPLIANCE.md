# Generation Control — React compliance

Traces `GenerationControl.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`GenerationControl.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-silent-destruction` | MUST NOT | `variants` is append-only history; `regenerate()` pushes and navigates, never replaces. Every prior variant stays reachable through the navigator. | "no-silent-destruction: generating appends to history, does not replace", "no-silent-destruction: every earlier variant stays reachable through the Previous control", "no-silent-destruction: a failed regeneration leaves the displayed variant and history intact" |
| `variant-position-visible` | MUST | The `positionLabel` ("Variant N of M") renders in the navigator and updates on every navigation and arrival. | "variant-position-visible: position label renders on mount", "…updates after regeneration", "…updates on navigation" |
| `single-flight-regeneration` | MUST | `regenerate()` no-ops while `busy`; the control exposes `aria-disabled` and `aria-busy`, and its label switches to "Generating…". | "single-flight-regeneration: concurrent generate calls produce only one new variant", "single-flight-regeneration: regenerate button has aria-disabled and aria-busy while generating" |
| `controls-keyboard-operable` | MUST | Regenerate and both navigation controls are native `<button>`s with accessible names ("New version", "Previous variant", "Next variant"). | "controls-keyboard-operable: regenerate, previous, next, and refine are native, named, focusable controls", "controls-keyboard-operable: the regenerate control stays focusable while a generation is in flight", "controls-keyboard-operable: prev/next buttons are native buttons (keyboard accessible)", "controls-keyboard-operable: prev disabled at first variant, next disabled at last", axe tests |
| `variant-change-announced` | MUST | The polite `role="status"` region announces "Generating…", "Variant N of N ready.", and "Showing variant N of M." on every transition. | "variant-change-announced: live region announces on navigation", "variant-change-announced: live region announces when generation completes" |
| `refine-carries-context` | SHOULD | The refinement is passed to `onGenerate(refinement)` as an *addition*; the host contract (documented on the prop) is to append it to the original context. The field's value persists across generations. | — (host contract; the persistence is structural — `refinement` state is never reset) |
| `side-by-side-compare` | MAY | Not implemented — sequential navigation only in the reference. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) covers all three contract states: "axe: no WCAG A/AA violations in generated state" and "axe: no WCAG A/AA violations while regenerating, after a failure, and with several variants". `failed` is exercised as "generated + failure announcement" (see notes).

## Limits of the proof

- `controls-keyboard-operable`: keyboard operation is proven by proxy. jsdom does not synthesize `click` from Enter/Space, so the tests assert native `<button type="button">` / `<input>`, enabled, named, in the tab order, and focusable — including the regenerate control while it is busy.
- `no-silent-destruction`: "irrecoverably" is proven for the life of the mounted component (history is in memory). Persistence across unmount or reload is the host's responsibility.

## Deviations and notes

- Navigation buttons use native `disabled` at history ends (deliberate end-stop, per the contract's guidance against silent wrapping); the regenerate button uses `aria-disabled` instead so focus is not dropped during the transient busy state.
- On generation failure the announcement reports failure and the current variant remains rendered — the `failed` contract state maps to "generated + failure announcement".
