# Approval Gate — Vanilla JS compliance

Traces `ApprovalGate.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ApprovalGate.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `explicit-consent` | MUST NOT | `options.onApprove` is invoked only inside `approve()`, bound solely to the approve button's click listener and guarded on `status === 'proposed'`. No timers or auto paths exist. | "explicit-consent: reject click does not fire onApprove", "explicit-consent: approve click fires onApprove exactly once", "explicit-consent: second approve call while executing is a no-op" |
| `accurate-preview` | MUST | `payload` renders verbatim (via `textContent`) in the detail `<pre>`, and `onApprove(this.options.payload)` hands the approve handler the same string that was previewed — executing exactly what was shown is the default path, not a convention. | "accurate-preview: onApprove receives exactly the payload rendered in the detail region", "accurate-preview: payload is in a \<pre\> element", "accurate-preview: detail toggle shows and hides payload" |
| `no-preselected-approve` | MUST NOT | `mount()` never calls `focus()`; `document.activeElement` is untouched. Reject is appended before approve so tab order reaches it first. | "no-preselected-approve: reject button appears before approve in DOM order", "no-preselected-approve: neither button is auto-focused on mount" |
| `irreversible-labeled` | MUST | The `irreversible` option appends a `<strong>` "Cannot be undone." to the summary. | "irreversible-labeled: \"Cannot be undone\" rendered when irreversible=true", "irreversible-labeled: warning absent without irreversible option" |
| `controls-accessible` | MUST | Native `<button>`s; approve carries `aria-label="Approve: {summary}"`; reject is appended before approve so tab order reaches it first. | "no-preselected-approve: reject button appears before approve in DOM order" (asserts DOM/tab order) |
| `gate-announced` | MUST | The polite live region's text is set after the gate is in the DOM ("Approval required: {summary}") and on every `setStatus()` via `GATE_ANNOUNCEMENTS`. | "gate-announced: status region announces proposed on mount", "…status transitions through executing and completed", "…reject sets status to rejected", "…failed approval announces failure" |
| `fatigue-batching` | SHOULD | Not implemented — a flow-level concern above a single gate. | — |
| `proposal-expiry` | MAY | Not implemented; hosts can remove a stale gate and re-propose. | — |

## Deviations and notes

- Escape-to-reject inside the gate: "escape-rejects: Escape keydown on the gate triggers reject" — decisions hide and the outcome renders after any transition (asserted in the same test).
- All strings render via `textContent`, so caller-supplied summaries and payloads cannot inject markup.

## State coverage

- `approved` — collapsed into `executing`: `approve()` begins execution in the
  same step as authorization, so there is no observable approved-but-not-yet-
  executing moment for the UI to render; `setStatus` never receives it.
- `expired` — not implemented (`proposal-expiry` is MAY); hosts remove a stale
  gate and re-propose, which satisfies the contract's fresh-review requirement.
