# Streaming Response — Vanilla JS compliance

Traces `StreamingResponse.js` against `../pattern.contract.json` (v0.2.1).

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`StreamingResponse.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-focus-steal` | MUST_NOT | The only `focus()` call is guarded by `document.activeElement === this.stopBtn` inside `#settle`. | "no-focus-steal: focus outside the component never moves at start, append, completion, or failure", "no-focus-steal: focus outside the component never moves at interruption" |
| `focus-not-lost` | MUST | `#settle` reclaims focus to the output region (`tabIndex = -1`) *before* hiding the stop control, so focus never falls to `<body>`. | "focus-not-lost: settling while the stop control has focus moves focus to the output region" (completion, failure, stop click, Escape) |
| `completion-announced` | MUST | A single stable live region (`role="status"`, `aria-live="polite"`) is created once at mount and only its text mutates; `startStream` clears it so repeated completions re-announce. | "completion-announced: polite live region announces completion, including after a restart" |
| `interruptible` | MUST | The stop control is visible exactly while streaming; `stop()` settles to `interrupted` and every transition method guards on `state !== 'streaming'`, so double-stops and late host settles are no-ops. Escape inside the component also stops. | "interruptible: stop is visible only while streaming and invokes onStop exactly once", "interruptible: the stop control is present while streaming even when the host passes no onStop", "interruptible: a user stop is not overwritten by late host signals", "interruptible: the stop control is hidden after completion and after failure", "interruptible: Escape stops the stream while focus is inside the component" |
| `partial-preserved` | MUST | `#settle` never touches `contentEl`; settled states only hide the activity indicator and stop control. | "partial-preserved: partial output stays rendered and unobscured after interruption", "partial-preserved: partial output stays rendered and unobscured alongside the error after failure" |
| `no-layout-shift` | SHOULD | Build-once DOM: elements toggle `hidden` rather than being created/destroyed, keeping structure stable. | — (deviation: untested; see Limits of the proof) |
| `token-batching` | MAY | Not implemented; `appendContent` is called at the host's chosen frequency. | — |

## Accessibility fields

- Failure announcement: the error element is a pre-existing `role="alert"` that unhides with the failure text (assertive); the polite region stays silent for errors.
- Two instances on one page get distinct live-region ids (asserted).
- Keyboard table (Escape, Tab): Escape is asserted; Tab order is native (no tabindex juggling).
- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all five contract states: "axe: no WCAG A/AA violations in idle, streaming, completed, interrupted, and errored states".
## Limits of the proof

- "Visible" (`interruptible`) and "visually hidden" (`partial-preserved`) are proven by proxy: the `hidden` attribute, `aria-hidden` ancestors, and inline `display`. jsdom has no stylesheet or layout, so class-based hiding by a host stylesheet is outside these tests.
- `no-focus-steal` at interruption with focus outside the component is exercised with a click that does not focus the button (and, in vanilla, a programmatic stop) — the only ways that combination arises.
- `no-layout-shift` (SHOULD) is untested: it needs a layout engine, and the repo has no browser test pass yet.

## Hardening notes (v0.2.0 review)

- Fixed: every transition previously rebuilt the DOM via `innerHTML`, which destroyed focus held inside the component, recreated the live region (unreliable announcements), and left a no-op `removeEventListener` (different function identity than the bound listener it tried to remove).
- Fixed: the default `ariaLiveRegionId` option produced duplicate element ids across instances; ids are now generated per instance.
- Added: `destroy()` for explicit teardown; `appendContent` after settle is ignored (asserted).
- All content rendering uses `textContent` — the old `escape()` helper is gone because nothing passes through `innerHTML` anymore.
