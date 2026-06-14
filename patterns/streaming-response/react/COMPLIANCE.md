# Streaming Response — React compliance

Traces `StreamingResponse.tsx` against `../pattern.contract.json` (v0.2.1).

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`StreamingResponse.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `no-focus-steal` | MUST_NOT | The component never calls `focus()` unless focus is on its own stop control; `reclaimFocusFromStop` no-ops when focus is elsewhere. | "no-focus-steal: focus outside the component never moves across the lifecycle" |
| `focus-not-lost` | MUST | `reclaimFocusFromStop` runs before the settle re-render removes the stop control, moving focus to the output region (`tabIndex={-1}`). The control's visibility keys off `displayState`, not the `isStreaming` prop, so it is still mounted when the falling-edge effect runs. | "focus-not-lost: settling while the stop control has focus moves focus to the output region" |
| `completion-announced` | MUST | The live region (`role="status"`, `aria-live="polite"`) renders `ANNOUNCEMENTS[displayState]` declaratively; a restart resets it to empty so a second identical completion message is a text *change* and re-announces. | "completion-announced: polite live region announces completion, including after a restart" |
| `interruptible` | MUST | The stop control renders only in the streaming state; `handleStop` settles to `interrupted`. The effect re-enters streaming only on a rising edge of `isStreaming` (`wasStreaming` ref), and the settle updater latches (`current === 'streaming' ? … : current`), so neither a still-true `isStreaming` nor the host's later falling edge overwrites a user stop. Escape inside the component also stops. | "interruptible: stop control renders only while streaming…", "…stop settles to interrupted even while the host still reports an active stream", "…Escape stops the stream while focus is inside the component" |
| `partial-preserved` | MUST | Content rendering depends only on `content`, never on the settled state; nothing hides or removes it on interruption or failure. | "partial-preserved: …after interruption", "partial-preserved: …alongside the error after failure" |
| `no-layout-shift` | SHOULD | The activity indicator and stop control render in fixed positions after the output region; CLS measurement is deferred to a browser-based e2e pass (jsdom has no layout). | — (e2e) |
| `token-batching` | MAY | Not implemented; the host owns append frequency since `content` is a prop. | — |

## Accessibility fields

- WCAG 4.1.3 / failure announcement: failure renders `role="alert"` (assertive) while the polite region stays silent to avoid double announcement — asserted in the failure test.
- Keyboard table (Escape, Tab): Escape is asserted; Tab order is native (no tabindex juggling).
- axe: "axe: no WCAG A/AA violations while streaming or settled" runs axe-core (WCAG A/AA tags) in both states; `color-contrast` is excluded because jsdom has no layout engine — it belongs to the browser e2e pass.

## Hardening notes (v0.2.0 review)

- Fixed: a user stop while the host still reported `isStreaming` was immediately overwritten back to streaming by the state-comparison effect. Transitions are now edge-detected.
- Fixed: focus was dropped on `<body>` when the stream settled while the stop control had focus.
- Removed: unused `initialFocusRef`/`contentRef`, the `ariaLiveRegionId` prop (ids are an internal concern), and imperative live-region writes that would not re-announce repeated completions.
- Host contract: flip `isStreaming` to `false` (with `error` set, if any) when the transport settles; set `error` before or together with the falling edge.
