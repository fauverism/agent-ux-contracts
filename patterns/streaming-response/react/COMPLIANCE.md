# Streaming Response — React compliance

Traces `StreamingResponse.tsx` against `../pattern.contract.json` (v0.2.1).

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`StreamingResponse.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-focus-steal` | MUST_NOT | The component never calls `focus()` unless focus is on its own stop control; `reclaimFocusFromStop` no-ops when focus is elsewhere. | "no-focus-steal: focus outside the component never moves at start, append, or completion", "no-focus-steal: focus outside the component never moves at failure", "no-focus-steal: focus outside the component never moves at interruption" |
| `focus-not-lost` | MUST | `reclaimFocusFromStop` runs before the settle re-render removes the stop control, moving focus to the output region (`tabIndex={-1}`). The control's visibility keys off `displayState`, not the `isStreaming` prop, so it is still mounted when the falling-edge effect runs. | "focus-not-lost: settling while the stop control has focus moves focus to the output region", "focus-not-lost: activating the focused stop control moves focus to the output region", "focus-not-lost: Escape on the focused stop control moves focus to the output region", "focus-not-lost: a failure while the stop control has focus moves focus to the output region" |
| `completion-announced` | MUST | The live region (`role="status"`, `aria-live="polite"`) renders `ANNOUNCEMENTS[displayState]` declaratively; a restart resets it to empty so a second identical completion message is a text *change* and re-announces. | "completion-announced: polite live region announces completion, including after a restart" |
| `interruptible` | MUST | The stop control renders only in the streaming state; `handleStop` settles to `interrupted`. The effect re-enters streaming only on a rising edge of `isStreaming` (`wasStreaming` ref), and the settle updater latches (`current === 'streaming' ? … : current`), so neither a still-true `isStreaming` nor the host's later falling edge overwrites a user stop. Escape inside the component also stops. The control renders whether or not the host passes `onStop` — the prop is a notification, not a switch for the control. | "interruptible: stop control renders only while streaming and invokes onStop exactly once", "interruptible: the stop control is present while streaming even when the host passes no onStop", "interruptible: a user stop is not overwritten while the host keeps streaming", "interruptible: stop settles to interrupted even while the host still reports an active stream", "interruptible: Escape stops the stream while focus is inside the component" |
| `partial-preserved` | MUST | Content rendering depends only on `content`, never on the settled state; nothing hides or removes it on interruption or failure. | "partial-preserved: partial output stays rendered and unobscured after interruption", "partial-preserved: partial output stays rendered alongside the error after failure" |
| `no-layout-shift` | SHOULD | The activity indicator and stop control render in fixed positions after the output region; CLS is not measured (jsdom has no layout). | — (deviation: untested; see Limits of the proof) |
| `token-batching` | MAY | Not implemented; the host owns append frequency since `content` is a prop. | — |

## Accessibility fields

- WCAG 4.1.3 / failure announcement: failure renders `role="alert"` (assertive) while the polite region stays silent to avoid double announcement — asserted in the failure test.
- Keyboard table (Escape, Tab): Escape is asserted; Tab order is native (no tabindex juggling).
- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all five contract states: "axe: no WCAG A/AA violations while streaming or settled" (streaming, completed) and "axe: no WCAG A/AA violations in idle, interrupted, and errored states".
## Limits of the proof

- "Visible" (`interruptible`) and "visually hidden" (`partial-preserved`) are proven by proxy: the `hidden` attribute, `aria-hidden` ancestors, and inline `display`. jsdom has no stylesheet or layout, so class-based hiding by a host stylesheet is outside these tests.
- `no-focus-steal` at interruption with focus outside the component is exercised with a click that does not focus the button (and, in vanilla, a programmatic stop) — the only ways that combination arises.
- `no-layout-shift` (SHOULD) is untested: it needs a layout engine, and the repo has no browser test pass yet.

## Hardening notes (v0.2.0 review)

- Fixed: a user stop while the host still reported `isStreaming` was immediately overwritten back to streaming by the state-comparison effect. Transitions are now edge-detected.
- Fixed: focus was dropped on `<body>` when the stream settled while the stop control had focus.
- Removed: unused `initialFocusRef`/`contentRef`, the `ariaLiveRegionId` prop (ids are an internal concern), and imperative live-region writes that would not re-announce repeated completions.
- Fixed (2026-11-11 proof audit): the stop control was rendered only when the optional `onStop` prop was passed, leaving Escape as the only way to stop — a violation of `interruptible`. It now renders whenever the stream is active.
- Host contract: flip `isStreaming` to `false` (with `error` set, if any) when the transport settles; set `error` before or together with the falling edge.
