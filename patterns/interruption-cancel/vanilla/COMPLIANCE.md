# Interruption / Cancel — Vanilla JS compliance

Traces `InterruptionCancel.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`InterruptionCancel.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `immediate-acknowledgment` | MUST | `requestCancel()` flips the phase, hides the control, shows the pending indicator, and announces — all synchronously before `onCancel` returns. | "immediate-acknowledgment: requestCancel acknowledges synchronously before the host settles" |
| `no-silent-continuation` | MUST_NOT | No method re-enters `running` except `start()`; `setProgress` is allowed during `cancel-requested` and updates only the progress element. `start()` returns early while the phase is `cancel-requested`, so a pending cancel settles only through `finish()`. | "no-silent-continuation: progress during pending cancellation renders without resetting the phase", "no-silent-continuation: start() while cancellation is pending does not flip back to running" |
| `partial-work-honesty` | MUST | `finish()` fills the "Already done:" and "Stopped before:" lists from the host-supplied arrays via `#fillList`. | "partial-work-honesty: the cancelled summary lists completed and stopped work", "partial-work-honesty: a cancel that stopped everything does not claim completed work" |
| `completion-race-honest` | MUST | `finish({ outcome: 'completed' })` during `cancel-requested` settles to `completed` and unhides the `RACE_DISCLOSURE` note (`cancelWasRequested` flag). The same disclosure is appended to the polite live region, so the race is announced as well as shown. | "completion-race-honest: finishing as completed despite a pending cancel discloses the race", "completion-race-honest: an ordinary completion carries no race disclosure" |
| `cancel-not-gated` | MUST_NOT | `requestCancel()` calls `onCancel` directly with no dialog; the phase guard makes repeats and post-settle calls no-ops. | "cancel-not-gated: one activation, one callback; repeats and post-settle calls are no-ops" |
| `cancel-control-accessible` | MUST | Native button with `aria-label` of `` `Cancel: ${workLabel}` ``. | "cancel-control-accessible: the cancel control is a native, focusable button named for the work", axe tests |
| `cancellation-announced` | MUST | One stable polite live region; text set from `WORK_ANNOUNCEMENTS` at acknowledgment and settle, cleared by `start()` so repeats re-announce. | "cancellation-announced: live region announces acknowledgment and settled outcome" |
| `focus-not-lost` | MUST | `#reclaimFocusFromCancel` runs in `requestCancel()` and `finish()` before the control is hidden; the work region carries `tabIndex = -1`. | "focus-not-lost: cancelling while the control has focus moves focus to the work region", "focus-not-lost: natural completion while the control has focus also recovers focus", "focus-not-lost: focus outside the component is never moved" |
| `escape-cancels` | SHOULD | A wrapper keydown listener maps Escape to `requestCancel()` while running. | "escape-cancels: Escape inside the component requests cancellation" |
| `undo-pairing` | MAY | Not implemented — host concern; the completed-work list defines the scope an undo would need. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states: "axe: no WCAG A/AA violations while running, pending, cancelled, and completed" (completed is checked with and without the race disclosure).
- Keyboard table: Escape is asserted (`escape-cancels`); Tab/Enter/Space rely on the native button.

## Limits of the proof

- Keyboard operability (`cancel-control-accessible`) is proven by proxy: jsdom does not synthesize `click` from Enter/Space, so the test asserts native `<button type="button">`, enabled, in the tab order, and focusable.
- `cancel-not-gated`: "no confirmation dialog" is proven as one activation → one callback with no dialog element in the document.
- `partial-work-honesty`: tests prove the lists the host supplies are rendered completely and in the right list. Whether the host's lists are *true* is the host's responsibility.

## Deviations and notes

- Build-once DOM: settled-state elements are pre-built and toggled with `hidden`, so tests assert visibility state, not text absence (hidden elements still appear in `textContent`).
- `finish()` infers `cancelled` when cancellation was requested; pass `outcome` explicitly to override.
- `destroy()` removes the wrapper (asserted) and its keydown listener.
- Before the first `start()` the wrapper reports `data-phase="completed"` with nothing visible — the component models work, not its absence; mount it when a run starts.
- Fixed (2026-11-11 proof audit): `start()` called while a cancellation was pending re-entered `running`, re-showed the cancel control and cleared the acknowledgment — a violation of `no-silent-continuation`. It is now ignored in that phase.
- Changed (2026-11-11 proof audit): a raced completion now announces "Work completed. This work finished before the cancellation took effect." in the live region; previously the disclosure was visual only, contradicting the contract's screen-reader table.
- Parity note: React stops propagation of the Escape keydown it handles; vanilla does not, so inside a host dialog the same Escape may also reach the dialog.
