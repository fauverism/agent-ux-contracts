# Refusal Messaging — Vanilla JS compliance

Traces `RefusalMessaging.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`RefusalMessaging.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `reason-given` | MUST | The constructor throws on a missing reason; `mount()` renders statement and reason as visible paragraphs via `textContent`. | "reason-given: statement and reason both render; a missing reason fails loudly" |
| `alternative-offered` | MUST | The constructor throws on an empty or missing alternatives array; provided ones render as operable controls. | "alternative-offered: empty alternatives fail loudly; provided ones render as operable actions" |
| `no-verbatim-retry` | MUST_NOT | `mount()` renders exactly the provided alternatives; no retry control exists in the component. | "no-verbatim-retry: rendered actions are exactly the provided alternatives" |
| `partial-honored` | MUST | `fulfilledText` renders in its own region above the refusal region; `data-kind="partial"` marks the state. | "partial-honored: fulfilled content and the scoped refusal are distinct co-present regions" |
| `refusal-distinct-from-error` | MUST | Status semantics only; no `role="alert"` is ever created. | "refusal-distinct-from-error: status semantics, never role=alert" |
| `refusal-announced` | MUST | The live region is appended empty and its text set after the wrapper is in the document, so the announcement is a change assistive technology reports; copy per kind from `REFUSAL_ANNOUNCEMENTS`. | "refusal-announced: polite announcement set after mount, distinct copy for partial refusals" |
| `alternatives-accessible` | MUST | Native `<button type="button">` or `<a href>` per alternative, labeled by its path text. | "alternatives-accessible: actions are native controls named by their path" |
| `no-moralizing` | SHOULD NOT | Copy is host-supplied; manual copy review per the contract. | — (manual review) |
| `policy-detail-available` | MAY | Keyboard-operable disclosure with `aria-expanded`/`aria-controls` and a per-instance id. | "policy-detail-available: the disclosure toggles with aria-expanded" |

## Deviations and notes

- Constructor-time throws (missing reason, empty alternatives) are the untyped-host equivalent of the React implementation's tuple type: contract violations fail loudly at the boundary.
- All text renders via `textContent`; nothing passes through `innerHTML`.

## State coverage

The component is render-only; the contract's states describe the host's view
of the conversation: `idle` — component not mounted (nothing declined yet);
`refused` — mounted without fulfilled content (full refusal);
`partial-refusal` — mounted with `fulfilledText`, delivering the answered
portion alongside the refusal scoped to the remainder.
