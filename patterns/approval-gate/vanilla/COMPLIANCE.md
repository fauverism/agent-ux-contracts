# Approval Gate — Vanilla JS compliance

Traces `ApprovalGate.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ApprovalGate.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `explicit-consent` | MUST NOT | `options.onApprove` is invoked only inside `approve()`, which the component itself calls only from the approve button's click listener, guarded on `status === 'proposed'`. No timers or auto paths exist. `approve()` is also a public method — see Deviations. | "explicit-consent: reject click does not fire onApprove", "explicit-consent: approve click fires onApprove exactly once", "explicit-consent: timers, focus, scroll, stray keys, and the detail toggle never approve", "explicit-consent: Escape rejects and never approves", "explicit-consent: a second approve activation while executing is a no-op" |
| `accurate-preview` | MUST | `payload` is captured at mount as `previewedPayload`, rendered verbatim (via `textContent`) in the detail `<pre>`, and `onApprove(this.previewedPayload)` hands the approve handler that same string — mutating `options` after mount cannot change what executes. | "accurate-preview: onApprove receives exactly the payload rendered in the detail region", "accurate-preview: whitespace and markup in the payload reach onApprove byte-identical", "accurate-preview: mutating options after mount cannot make execution diverge from the preview", "accurate-preview: summary and consequence render in the visible action summary", "accurate-preview: payload is in a \<pre\> element", "accurate-preview: detail toggle shows and hides payload" |
| `no-preselected-approve` | MUST NOT | `mount()` never calls `focus()`; `document.activeElement` is untouched. Reject is appended before approve so tab order reaches it first. | "no-preselected-approve: reject button appears before approve in DOM order", "no-preselected-approve: neither button is auto-focused on mount" |
| `irreversible-labeled` | MUST | The `irreversible` option appends a `<strong>` "Cannot be undone." to the summary. | "irreversible-labeled: \"Cannot be undone\" renders inside the action summary when irreversible=true", "irreversible-labeled: warning absent without irreversible option" |
| `controls-accessible` | MUST | Native `<button type="button">`s; approve carries `aria-label="Approve: {summary}"`, reject is named "Reject"; the gate is a `role="group"` named for the action. | "controls-accessible: approve and reject are native, focusable buttons with distinguishing names", "controls-accessible: gate has group role with aria-label", axe tests |
| `gate-announced` | MUST | The polite live region's text is set after the gate is in the DOM ("Approval required: {summary}") and on every `setStatus()` via `GATE_ANNOUNCEMENTS`. | "gate-announced: status region announces proposed with the summary on mount", "gate-announced: status transitions through executing and completed", "gate-announced: reject sets status to rejected", "gate-announced: failed approval announces failure" |
| `fatigue-batching` | SHOULD | Not implemented — a flow-level concern above a single gate. | — |
| `proposal-expiry` | MAY | Not implemented; hosts can remove a stale gate and re-propose. | — |

## Accessibility fields

- axe runs (WCAG A/AA tags; `color-contrast` excluded — no layout engine in jsdom) in every implemented state: "axe: no WCAG A/AA violations in proposed state", "axe: no WCAG A/AA violations in proposed state with irreversible label, consequence, and detail expanded", "axe: no WCAG A/AA violations in executing, completed, failed, and rejected states". `approved` and `expired` are not implemented (see State coverage).
- Escape-to-reject (contract keyboard table, not a constraint): "keyboard: Escape keydown inside the gate triggers reject" — decisions hide after the transition (asserted in the same test).

## Host requirements

- Execute the payload your `onApprove` handler receives — it is the exact string that was previewed.

## Limits of the proof

- Keyboard operability is proven by proxy: jsdom does not synthesize `click` from Enter/Space, so `controls-accessible` asserts native `<button type="button">`, enabled, in the tab order, and focusable.
- `explicit-consent` is a universal negative ("never"). The sweep test enumerates the triggers the contract names (timeout, scroll, focus) plus stray keys and non-approve clicks; it cannot enumerate every conceivable trigger.
- `accurate-preview`: tests prove the payload shown is the payload executed and that the summary renders. Whether the host-written summary *describes* that payload is copy review.
- `gate-announced`: jsdom proves the polite region holds the text after mount, not that a screen reader speaks it. The region is inserted and populated in the same task; verify with real assistive technology.

## Deviations and notes

- **Public `approve()` (deviation, owner decision 2026-11-11: recorded, not changed).** The contract's `explicit-consent` verification says no code path reaches the approve callback except activation of the approve control. The component honors that internally, but `approve()` is a public method, so a host *can* call it from a timer or another event. A host that calls `approve()` itself violates `explicit-consent` at the integration level. The React implementation exposes no equivalent handle. `setStatus()` is likewise public and unvalidated — treat both as internal.
- All strings render via `textContent`, so caller-supplied summaries and payloads cannot inject markup.

## State coverage

- `approved` — collapsed into `executing`: `approve()` begins execution in the
  same step as authorization, so there is no observable approved-but-not-yet-
  executing moment for the UI to render; `setStatus` never receives it.
- `expired` — not implemented (`proposal-expiry` is MAY); hosts remove a stale
  gate and re-propose, which satisfies the contract's fresh-review requirement.
