# Approval Gate — React compliance

Traces `ApprovalGate.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`ApprovalGate.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `explicit-consent` | MUST NOT | `onApprove` is reachable only through `approve()`, which is bound solely to the approve button's `onClick`. No timers, lifecycle effects, or other events call it; `approve()` also guards on `status === 'proposed'`. | "explicit-consent: reject click does not fire onApprove", "explicit-consent: approve button click fires onApprove exactly once", "explicit-consent: timers, focus, scroll, stray keys, and the detail toggle never approve", "explicit-consent: Escape rejects and never approves", "explicit-consent: once executing, the approve control is gone and cannot fire again" |
| `accurate-preview` | MUST | The `payload` prop renders verbatim in the detail `<pre>`, and `onApprove(payload)` hands the approve handler the same string that was previewed — executing exactly what was shown is the default path, not a convention. | "accurate-preview: onApprove receives exactly the payload rendered in the detail region", "accurate-preview: whitespace and markup in the payload reach onApprove byte-identical", "accurate-preview: a payload change before approval updates the preview and what executes", "accurate-preview: summary and consequence render in the visible action summary", "accurate-preview: payload is rendered in a \<pre\> element", "accurate-preview: detail toggle shows and hides the payload" |
| `no-preselected-approve` | MUST NOT | No `autoFocus` anywhere; mounting changes nothing about `document.activeElement`. Reject precedes approve in DOM and tab order. | "no-preselected-approve: reject button appears before approve in DOM order", "no-preselected-approve: neither button is auto-focused on mount" |
| `irreversible-labeled` | MUST | `irreversible` renders a `<strong>` "Cannot be undone." inside the summary paragraph. | "irreversible-labeled: \"Cannot be undone\" renders inside the action summary when irreversible=true", "irreversible-labeled: warning absent when irreversible is false" |
| `controls-accessible` | MUST | Both decisions are native `<button>`s; approve carries `aria-label="Approve: {summary}"` so the accessible name names the action; the gate is a `role="group"` named for the action. | "controls-accessible: approve and reject are native, focusable buttons with distinguishing names", "controls-accessible: gate has group role with aria-label", axe tests |
| `gate-announced` | MUST | A polite `role="status"` region is populated in a post-mount effect (live regions announce changes, not initial content) with "Approval required: {summary}"; every status transition updates it via `GATE_ANNOUNCEMENTS`. The arrival text is only (re)written while the gate is still `proposed`. | "gate-announced: live region announces arrival after mount", "gate-announced: live region transitions through executing and completed", "gate-announced: live region shows rejected message on reject", "gate-announced: failed approval announces failure", "gate-announced: a summary change after a decision does not re-announce a pending approval" |
| `fatigue-batching` | SHOULD | Not implemented — batching is a flow-level concern above a single gate. Hosts generating many similar proposals should group them before rendering gates. | — |
| `proposal-expiry` | MAY | Not implemented; hosts can unmount a stale gate and re-propose. | — |

## Accessibility fields

- axe runs (WCAG A/AA tags; `color-contrast` excluded — no layout engine in jsdom) in every implemented state: "axe: no WCAG A/AA violations in proposed state", "axe: no WCAG A/AA violations in proposed state with irreversible label, consequence, and detail expanded", "axe: no WCAG A/AA violations in executing, completed, failed, and rejected states". `approved` and `expired` are not implemented (see State coverage).
- Escape-to-reject (contract keyboard table, not a constraint): "keyboard: Escape inside the gate triggers reject".

## Limits of the proof

- Keyboard operability is proven by proxy: jsdom does not synthesize `click` from Enter/Space, so `controls-accessible` asserts native `<button type="button">`, enabled, in the tab order, and focusable.
- `explicit-consent` is a universal negative ("never"). The sweep test enumerates the triggers the contract names (timeout, scroll, focus) plus stray keys and non-approve clicks; it cannot enumerate every conceivable trigger.
- `accurate-preview`: tests prove the payload shown is the payload executed and that the summary renders. Whether the host-written summary *describes* that payload is copy review.

## Host requirements

- Execute the payload your `onApprove` handler receives — it is the exact string that was previewed. Ignoring the argument and closing over a different payload violates `accurate-preview` at the integration level.
- Escape rejects only while focus is inside the gate, by design — a global Escape handler would swallow unrelated dismissals.

## State coverage

- `approved` — collapsed into `executing`: `approve()` begins execution in the
  same step as authorization, so there is no observable approved-but-not-yet-
  executing moment for the UI to render. `GateStatus` omits it deliberately.
- `expired` — not implemented (`proposal-expiry` is MAY); hosts unmount a stale
  gate and re-propose, which satisfies the contract's fresh-review requirement.
