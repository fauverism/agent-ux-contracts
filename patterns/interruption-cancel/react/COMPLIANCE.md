# Interruption / Cancel — React compliance

Traces `InterruptionCancel.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`InterruptionCancel.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `immediate-acknowledgment` | MUST | `handleCancel` sets `cancel-requested` and the announcement synchronously in the click handler; the host's `running` prop is untouched. | "immediate-acknowledgment: cancel moves to cancel-requested synchronously, before the host settles" |
| `no-silent-continuation` | MUST_NOT | The effect re-enters `running` only on a rising edge of the `running` prop (`wasRunning` ref); progress prop updates re-render content without touching phase. | "no-silent-continuation: progress arriving while cancellation is pending never re-enters running" |
| `partial-work-honesty` | MUST | The settled summary renders `completedWork` ("Already done:") and `stoppedWork` ("Stopped before:") lists supplied by the host. | "partial-work-honesty: the cancelled summary lists completed and stopped work", "partial-work-honesty: a cancel that stopped everything does not claim completed work" |
| `completion-race-honest` | MUST | On the falling edge, `outcome="completed"` while in `cancel-requested` settles to `completed`; `cancelWasRequested` ref triggers the `RACE_DISCLOSURE` note. The same disclosure is appended to the polite live region, so the race is announced as well as shown. | "completion-race-honest: work finishing despite a pending cancel settles to completed with disclosure", "completion-race-honest: an ordinary completion carries no race disclosure" |
| `cancel-not-gated` | MUST_NOT | `handleCancel` invokes `onCancel` directly — no dialog; the phase guard makes repeats no-ops. | "cancel-not-gated: one activation, one callback, no dialog; repeat activations are no-ops" |
| `cancel-control-accessible` | MUST | Native button with `aria-label` of `` `Cancel: ${workLabel}` ``. | "cancel-control-accessible: the cancel control is a native, focusable button named for the work", axe tests |
| `cancellation-announced` | MUST | The polite live region renders `WORK_ANNOUNCEMENTS[phase]` declaratively; text changes at acknowledgment and settle. | "cancellation-announced: live region announces the acknowledgment and the settled outcome" |
| `focus-not-lost` | MUST | `reclaimFocusFromCancel` runs in `handleCancel` and on the falling edge, before the re-render removes the control; the work region carries `tabIndex={-1}`. | "focus-not-lost: cancelling while the control has focus moves focus to the work region", "focus-not-lost: natural completion while the control has focus also recovers focus", "focus-not-lost: focus outside the component is never moved" |
| `escape-cancels` | SHOULD | Wrapper `onKeyDown` maps Escape to `handleCancel` while running. | "escape-cancels: Escape inside the component requests cancellation" |
| `undo-pairing` | MAY | Not implemented — reversal mechanics belong to the host; the summary's `completedWork` list is the scope an undo would need. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states: "axe: no WCAG A/AA violations while running, pending, and cancelled" and "axe: no WCAG A/AA violations when completed, with and without the race disclosure".
- Keyboard table: Escape is asserted (`escape-cancels`); Tab/Enter/Space rely on the native button.

## Limits of the proof

- Keyboard operability (`cancel-control-accessible`) is proven by proxy: jsdom does not synthesize `click` from Enter/Space, so the test asserts native `<button type="button">`, enabled, in the tab order, and focusable.
- `cancel-not-gated`: "no confirmation dialog" is proven as one activation → one callback with no dialog element in the document.
- `partial-work-honesty`: tests prove the lists the host supplies are rendered completely and in the right list. Whether the host's lists are *true* is the host's responsibility.

## Deviations and notes

- Host contract: flip `running` to `false` when the abort lands; pass `outcome="completed"` if the work finished despite the pending cancel. The component infers `cancelled` otherwise.
- Mounting with `running={false}` renders a settled summary — the component models work, not its absence; mount it when a run starts.
- Break-it coverage beyond the constraints: restart clearing the race flag, unmount mid-run.
- Changed (2026-11-11 proof audit): a raced completion now announces "Work completed. This work finished before the cancellation took effect." in the live region; previously the disclosure was visual only, contradicting the contract's screen-reader table.
