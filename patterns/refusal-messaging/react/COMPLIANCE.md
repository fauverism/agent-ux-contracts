# Refusal Messaging — React compliance

Traces `RefusalMessaging.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`RefusalMessaging.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reason-given` | MUST | `statement` and `reason` are required props rendered as visible paragraphs; the type system rejects their omission. | "reason-given: statement and reason both render as visible text" |
| `alternative-offered` | MUST | `alternatives` is a non-empty tuple type (`[RefusalAlternative, ...RefusalAlternative[]]`) and an empty array throws at render, so violations fail loudly in untyped hosts too. | "alternative-offered: an empty alternatives list fails loudly", "…provided alternatives render as operable actions" |
| `no-verbatim-retry` | MUST_NOT | The component renders exactly the provided alternatives — there is no built-in retry control and no API slot for one. Copy-level retry labels are a host responsibility (see notes). | "no-verbatim-retry: rendered actions are exactly the provided alternatives, no built-in retry" |
| `partial-honored` | MUST | `fulfilledContent` renders in its own region above the refusal region; `data-kind="partial"` distinguishes the state. | "partial-honored: fulfilled content and the scoped refusal render as distinct co-present regions" |
| `refusal-distinct-from-error` | MUST | The refusal region is plain content plus a `role="status"` live region; no `role="alert"` exists anywhere in the component. | "refusal-distinct-from-error: status semantics, never role=alert" |
| `refusal-announced` | MUST | The announcement is set in an effect after mount (live regions announce *changes*), with distinct copy per kind from `REFUSAL_ANNOUNCEMENTS`. | "refusal-announced: polite announcement after render, distinct copy for partial refusals" |
| `alternatives-accessible` | MUST | Alternatives render as native buttons (or links when `href` is given) whose visible label is the accessible name. | "alternatives-accessible: actions are keyboard-operable with their path as the accessible name", axe test |
| `no-moralizing` | SHOULD NOT | Copy is host-supplied; the component adds no commentary of its own. Enforcement is manual copy review per the contract. | — (manual review) |
| `policy-detail-available` | MAY | Implemented as a keyboard-operable disclosure with `aria-expanded`/`aria-controls`. | "policy-detail-available: the disclosure toggles with aria-expanded" |

## Deviations and notes

- The component cannot police the *text* of host-supplied alternatives; a host passing `{ label: "Try again" }` defeats `no-verbatim-retry` at the copy level. That belongs to the same manual review as `no-moralizing`.
- Render-time throw on empty alternatives is deliberate: a refusal with no forward path is a contract violation, and failing loudly beats degrading silently.

## State coverage

The component is render-only; the contract's states describe the host's view
of the conversation: `idle` — component not mounted (nothing declined yet);
`refused` — mounted without fulfilled content (full refusal);
`partial-refusal` — mounted with `fulfilledContent`, delivering the answered
portion alongside the refusal scoped to the remainder.
