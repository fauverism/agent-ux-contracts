# Approval Gate — React compliance

Traces `ApprovalGate.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ApprovalGate.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `explicit-consent` | MUST NOT | `onApprove` is reachable only through `approve()`, which is bound solely to the approve button's `onClick`. No timers, lifecycle effects, or other events call it; `approve()` also guards on `status === 'proposed'`. | "explicit-consent: onApprove fires only when approve button is clicked", "explicit-consent: approve button click fires onApprove exactly once" |
| `accurate-preview` | MUST | The `payload` prop renders verbatim in the detail `<pre>`, and `onApprove(payload)` hands the approve handler the same string that was previewed — executing exactly what was shown is the default path, not a convention. | "accurate-preview: onApprove receives exactly the payload rendered in the detail region", "accurate-preview: payload is rendered in a \<pre\> element", "accurate-preview: detail toggle shows and hides the payload" |
| `no-preselected-approve` | MUST NOT | No `autoFocus` anywhere; mounting changes nothing about `document.activeElement`. Reject precedes approve in DOM and tab order. | "no-preselected-approve: reject button appears before approve in DOM order", "no-preselected-approve: neither button is auto-focused on mount" |
| `irreversible-labeled` | MUST | `irreversible` renders a `<strong>` "Cannot be undone." inside the summary paragraph. | "irreversible-labeled: \"Cannot be undone\" text present when irreversible=true", "irreversible-labeled: warning absent when irreversible is false" |
| `controls-accessible` | MUST | Both decisions are native `<button>`s; approve carries `aria-label="Approve: {summary}"` so the accessible name names the action; the gate is a `role="group"` named for the action. | "controls-accessible: gate has group role with aria-label" |
| `gate-announced` | MUST | A polite `role="status"` region is populated in a post-mount effect (live regions announce changes, not initial content) with "Approval required: {summary}"; every status transition updates it via `GATE_ANNOUNCEMENTS`. | "gate-announced: live region announces arrival after mount", "…transitions through executing and completed", "…shows rejected message on reject" |
| `fatigue-batching` | SHOULD | Not implemented — batching is a flow-level concern above a single gate. Hosts generating many similar proposals should group them before rendering gates. | — |
| `proposal-expiry` | MAY | Not implemented; hosts can unmount a stale gate and re-propose. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in proposed state" runs axe-core (WCAG A/AA tags); `color-contrast` is excluded (no layout engine in jsdom).
- Escape-to-reject: "escape-rejects: Escape key triggers reject".

## Host requirements

- Execute the payload your `onApprove` handler receives — it is the exact string that was previewed. Ignoring the argument and closing over a different payload violates `accurate-preview` at the integration level.
- Escape rejects only while focus is inside the gate, by design — a global Escape handler would swallow unrelated dismissals.

## State coverage

- `approved` — collapsed into `executing`: `approve()` begins execution in the
  same step as authorization, so there is no observable approved-but-not-yet-
  executing moment for the UI to render. `GateStatus` omits it deliberately.
- `expired` — not implemented (`proposal-expiry` is MAY); hosts unmount a stale
  gate and re-propose, which satisfies the contract's fresh-review requirement.
