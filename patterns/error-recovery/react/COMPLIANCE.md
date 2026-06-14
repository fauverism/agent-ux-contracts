# Error Recovery — React compliance

Traces `ErrorRecovery.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ErrorRecovery.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `input-preserved` | MUST | The textarea is a controlled input rendered unconditionally — it exists and stays editable in idle, errored, and retrying states alike. | "input-preserved: textarea is always rendered regardless of failure state", "…input value is retained across failure prop change", "…textarea is never disabled or readOnly" |
| `actionable-error` | MUST | `FAILURE_COPY` maps every `FailureKind` to a summary and an action; the retry/resend button renders for every failure. The exported map makes "every kind has an action" a one-line unit test. | "actionable-error: retry button present for each failure kind with correct label" |
| `plain-language-summary` | MUST | Summaries in `FAILURE_COPY` are plain language with a next step; raw `message`/`detail` render only inside the "Technical details" disclosure. | — (copy review; the vocabulary is pinned by the exported `FAILURE_COPY` map and asserted per kind in the actionable-error test) |
| `error-announced` | MUST | A persistent `role="alert"` element carries the summary; failure text replaces its content (assertive announcement), and summaries are replaced, never stacked. | "error-announced: alert role present on summary element", "error-announced: alert is present in the DOM even when idle (empty text)" |
| `retry-single-flight` | MUST | `retry()` no-ops while `inFlight`; the button exposes `aria-disabled` and `aria-busy` during the attempt. | "retry-single-flight: onRetry not called while in-flight", "retry-single-flight: retry button has aria-disabled and aria-busy while retrying" |
| `refusal-distinguished` | SHOULD | The `refusal` kind gets rephrase-oriented copy and an "Edit and resend" action; transient kinds get "Try again". | "actionable-error: refusal kind uses \"Edit and resend\" label" |
| `auto-retry-transient` | MAY | Not implemented — auto-retry policy (bounds, backoff) belongs to the host's transport layer. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in idle and errored states" runs axe-core (WCAG A/AA tags) in both states; `color-contrast` is excluded (no layout engine in jsdom).

## Deviations and notes

- `partialOutput` keeps pre-failure output visible per the contract's guidance — asserted by "partialOutput: partial output rendered above the failure summary".
- The component stays mounted across the failure lifecycle; unmounting it on failure would defeat `input-preserved` — noted as a host requirement.
