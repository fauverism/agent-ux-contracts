# Streaming Response — Vanilla JS compliance

Traces `StreamingResponse.js` against `../pattern.contract.json` (v0.2.1).

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`StreamingResponse.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-focus-steal` | MUST_NOT | The only `focus()` call is guarded by `document.activeElement === this.stopBtn` inside `#settle`. | "no-focus-steal: focus outside the component never moves across the lifecycle" |
| `focus-not-lost` | MUST | `#settle` reclaims focus to the output region (`tabIndex = -1`) *before* hiding the stop control, so focus never falls to `<body>`. | "focus-not-lost: settling while the stop control has focus moves focus to the output region" |
| `completion-announced` | MUST | A single stable live region (`role="status"`, `aria-live="polite"`) is created once at mount and only its text mutates; `startStream` clears it so repeated completions re-announce. | "completion-announced: polite live region announces completion, including after a restart" |
| `interruptible` | MUST | The stop control is visible exactly while streaming; `stop()` settles to `interrupted` and every transition method guards on `state !== 'streaming'`, so double-stops and late host settles are no-ops. Escape inside the component also stops. | "interruptible: stop is visible only while streaming and invokes onStop exactly once", "interruptible: Escape stops…" |
| `partial-preserved` | MUST | `#settle` never touches `contentEl`; settled states only hide the activity indicator and stop control. | "partial-preserved: partial output stays rendered after interruption and failure" |
| `no-layout-shift` | SHOULD | Build-once DOM: elements toggle `hidden` rather than being created/destroyed, keeping structure stable; CLS measurement is deferred to a browser e2e pass. | — (e2e) |
| `token-batching` | MAY | Not implemented; `appendContent` is called at the host's chosen frequency. | — |

## Accessibility fields

- Failure announcement: the error element is a pre-existing `role="alert"` that unhides with the failure text (assertive); the polite region stays silent for errors.
- Two instances on one page get distinct live-region ids (asserted).

## Hardening notes (v0.2.0 review)

- Fixed: every transition previously rebuilt the DOM via `innerHTML`, which destroyed focus held inside the component, recreated the live region (unreliable announcements), and left a no-op `removeEventListener` (different function identity than the bound listener it tried to remove).
- Fixed: the default `ariaLiveRegionId` option produced duplicate element ids across instances; ids are now generated per instance.
- Added: `destroy()` for explicit teardown; `appendContent` after settle is ignored (asserted).
- All content rendering uses `textContent` — the old `escape()` helper is gone because nothing passes through `innerHTML` anymore.
