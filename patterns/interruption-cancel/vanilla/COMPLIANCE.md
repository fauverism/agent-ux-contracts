# Interruption / Cancel — Vanilla JS compliance

Traces `InterruptionCancel.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`InterruptionCancel.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `immediate-acknowledgment` | MUST | `requestCancel()` flips the phase, hides the control, shows the pending indicator, and announces — all synchronously before `onCancel` returns. | "immediate-acknowledgment: requestCancel acknowledges synchronously before the host settles" |
| `no-silent-continuation` | MUST_NOT | No method re-enters `running` except `start()`; `setProgress` is allowed during `cancel-requested` and updates only the progress element. | "no-silent-continuation: progress during pending cancellation renders without resetting the phase" |
| `partial-work-honesty` | MUST | `finish()` fills the "Already done:" and "Stopped before:" lists from the host-supplied arrays via `#fillList`. | "partial-work-honesty: the cancelled summary lists completed and stopped work" |
| `completion-race-honest` | MUST | `finish({ outcome: 'completed' })` during `cancel-requested` settles to `completed` and unhides the `RACE_DISCLOSURE` note (`cancelWasRequested` flag). | "completion-race-honest: finishing as completed despite a pending cancel discloses the race" |
| `cancel-not-gated` | MUST_NOT | `requestCancel()` calls `onCancel` directly with no dialog; the phase guard makes repeats and post-settle calls no-ops. | "cancel-not-gated: one activation, one callback; repeats and post-settle calls are no-ops" |
| `cancel-control-accessible` | MUST | Native button with `aria-label` of `` `Cancel: ${workLabel}` ``. | "cancel-control-accessible: the accessible name names the work" |
| `cancellation-announced` | MUST | One stable polite live region; text set from `WORK_ANNOUNCEMENTS` at acknowledgment and settle, cleared by `start()` so repeats re-announce. | "cancellation-announced: live region announces acknowledgment and settled outcome" |
| `focus-not-lost` | MUST | `#reclaimFocusFromCancel` runs in `requestCancel()` and `finish()` before the control is hidden; the work region carries `tabIndex = -1`. | "focus-not-lost: cancelling while the control has focus…", "focus-not-lost: natural completion…" |
| `escape-cancels` | SHOULD | A wrapper keydown listener maps Escape to `requestCancel()` while running. | "escape-cancels: Escape inside the component requests cancellation" |
| `undo-pairing` | MAY | Not implemented — host concern; the completed-work list defines the scope an undo would need. | — |

## Deviations and notes

- Build-once DOM: settled-state elements are pre-built and toggled with `hidden`, so tests assert visibility state, not text absence (hidden elements still appear in `textContent`).
- `finish()` infers `cancelled` when cancellation was requested; pass `outcome` explicitly to override.
- `destroy()` removes the wrapper and its keydown listener (asserted).
