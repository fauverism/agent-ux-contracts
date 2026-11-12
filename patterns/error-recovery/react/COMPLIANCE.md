# Error Recovery — React compliance

Traces `ErrorRecovery.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ErrorRecovery.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `input-preserved` | MUST | The textarea is a controlled input rendered unconditionally — it exists and stays editable in idle, errored, and retrying states alike. | "input-preserved: edits made after a failure and during a retry are kept", "input-preserved: textarea is always rendered regardless of failure state", "input-preserved: input value is retained across failure prop change", "input-preserved: textarea is never disabled or readOnly" |
| `actionable-error` | MUST | `FAILURE_COPY` maps every `FailureKind` to a summary and an action; the retry/resend button renders for every failure. The exported map makes "every kind has an action" a one-line unit test. | "actionable-error: retry button present for each failure kind with correct label" |
| `plain-language-summary` | MUST | Summaries in `FAILURE_COPY` are plain language with a next step; raw `message`/`detail` render only inside the "Technical details" disclosure. | "plain-language-summary: the summary is the plain-language copy; raw codes stay in the detail region", "plain-language-summary: the technical detail is reachable through a disclosure" (structure; the wording itself is copy review) |
| `error-announced` | MUST | A persistent `role="alert"` element carries the summary; failure text replaces its content (assertive announcement), and summaries are replaced, never stacked. | "error-announced: alert role present on summary element", "error-announced: alert is present in the DOM even when idle (empty text)" |
| `retry-single-flight` | MUST | `retry()` no-ops while `inFlight`; the button exposes `aria-disabled` and `aria-busy` during the attempt. | "retry-single-flight: onRetry not called while in-flight", "retry-single-flight: retry button has aria-disabled and aria-busy while retrying" |
| `refusal-distinguished` | SHOULD | The `refusal` kind gets rephrase-oriented copy and an "Edit and resend" action; transient kinds get "Try again". | "actionable-error: refusal kind uses \"Edit and resend\" label" |
| `auto-retry-transient` | MAY | Not implemented — auto-retry policy (bounds, backoff) belongs to the host's transport layer. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states, plus errored with the technical detail expanded: "axe: no WCAG A/AA violations in idle, errored, retrying, and recovered states".

## Limits of the proof

- `plain-language-summary`: tests prove the structure — the summary is the taxonomy copy verbatim and host-supplied raw text appears only inside the collapsed detail region. Whether the copy in `FAILURE_COPY` reads as plain language is copy review.
- `input-preserved`: proven for a mounted component. A host that unmounts the component on failure loses the draft regardless (see notes).
- Keyboard operation of the recovery actions is by proxy: native `<button>`s, never natively disabled.

## Deviations and notes

- `partialOutput` keeps pre-failure output visible per the contract's guidance — asserted by "partialOutput: partial output rendered above the failure summary".
- The component stays mounted across the failure lifecycle; unmounting it on failure would defeat `input-preserved` — noted as a host requirement.
