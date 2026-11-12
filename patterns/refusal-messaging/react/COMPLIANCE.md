# Refusal Messaging — React compliance

Traces `RefusalMessaging.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`RefusalMessaging.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reason-given` | MUST | `statement` and `reason` are required props rendered as visible paragraphs; the type system rejects their omission. | "reason-given: statement and reason both render as visible text", "reason-given: the reason is rendered in its own visible element next to the statement" |
| `alternative-offered` | MUST | `alternatives` is a non-empty tuple type (`[RefusalAlternative, ...RefusalAlternative[]]`) and an empty array throws at render, so violations fail loudly in untyped hosts too. | "alternative-offered: an empty alternatives list fails loudly", "…provided alternatives render as operable actions" |
| `no-verbatim-retry` | MUST_NOT | The component renders exactly the provided alternatives — there is no built-in retry control and no API slot for one. Copy-level retry labels are a host responsibility (see notes). | "no-verbatim-retry: rendered actions are exactly the provided alternatives, no built-in retry", "no-verbatim-retry: no control beyond the provided alternatives exists in a partial refusal either" |
| `partial-honored` | MUST | `fulfilledContent` renders in its own region above the refusal region; `data-kind="partial"` distinguishes the state. | "partial-honored: fulfilled content and the scoped refusal render as distinct co-present regions" |
| `refusal-distinct-from-error` | MUST | The refusal region is plain content plus a `role="status"` live region; no `role="alert"` exists anywhere in the component. | "refusal-distinct-from-error: status semantics, never role=alert", "refusal-distinct-from-error: no alert semantics or malfunction iconography in full or partial refusals" |
| `refusal-announced` | MUST | The announcement is set in an effect after mount (live regions announce *changes*), with distinct copy per kind from `REFUSAL_ANNOUNCEMENTS`. | "refusal-announced: polite announcement after render, distinct copy for partial refusals" |
| `alternatives-accessible` | MUST | Alternatives render as native buttons (or links when `href` is given) whose visible label is the accessible name. | "alternatives-accessible: actions are keyboard-operable with their path as the accessible name", "alternatives-accessible: every alternative, button or link, is a named control in the tab order", axe test |
| `no-moralizing` | SHOULD NOT | Copy is host-supplied; the component adds no commentary of its own. Enforcement is manual copy review per the contract. | — (manual review) |
| `policy-detail-available` | MAY | Implemented as a keyboard-operable disclosure with `aria-expanded`/`aria-controls`. | "policy-detail-available: the disclosure toggles with aria-expanded" (also runs axe with the detail expanded) |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine): "axe: no WCAG A/AA violations for full and partial refusals" covers `refused` and `partial-refusal`; the expanded policy detail is checked inside "policy-detail-available: the disclosure toggles with aria-expanded". `idle` is the unmounted component (see State coverage), so there is nothing to scan.

## Limits of the proof

- `reason-given`, `alternative-offered`, `partial-honored`: the statement, reason, alternatives and fulfilled content are host-supplied. Tests prove they are rendered, visible, and placed in the right region; whether the reason is specific to the request, the alternative related to it, or the refusal scoped to the remainder is copy review.
- `no-verbatim-retry`: tests prove the component adds no control of its own. A host that passes an alternative labelled "Try again" defeats the rule at the copy level.
- `refusal-distinct-from-error`: "no iconography implying malfunction" is proven as "no icon is rendered at all"; host CSS can still add one.
- `alternatives-accessible`: keyboard operation is by proxy — native `<button type="button">` or `<a href>`, in the tab order, focusable.

## Deviations and notes

- **Empty `reason` is not rejected at runtime (deviation, owner decision 2026-11-11: recorded, not changed).** `reason` is a required `string` prop, but `reason=""` renders a bare statement — which `reason-given` calls non-compliant. The vanilla implementation throws in that case; React relies on the type and on the host. Hosts passing a possibly-empty reason need their own guard.
- The component cannot police the *text* of host-supplied alternatives; a host passing `{ label: "Try again" }` defeats `no-verbatim-retry` at the copy level. That belongs to the same manual review as `no-moralizing`.
- Render-time throw on empty alternatives is deliberate: a refusal with no forward path is a contract violation, and failing loudly beats degrading silently.

## State coverage

The component is render-only; the contract's states describe the host's view
of the conversation: `idle` — component not mounted (nothing declined yet);
`refused` — mounted without fulfilled content (full refusal);
`partial-refusal` — mounted with `fulfilledContent`, delivering the answered
portion alongside the refusal scoped to the remainder.
