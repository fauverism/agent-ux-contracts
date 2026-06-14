# Error Recovery — Vanilla JS compliance

Traces `ErrorRecovery.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ErrorRecovery.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `input-preserved` | MUST | The textarea is created once in `mount()` and never rebuilt; `showFailure()`/`clearFailure()` only swap text elsewhere, so user edits genuinely survive every failure. | "input-preserved: textarea is present after mount and after showFailure", "…textarea value survives showFailure", "…textarea is never disabled or readOnly", "getInput: returns current textarea value including edits" |
| `actionable-error` | MUST | `FAILURE_COPY` maps every kind to a summary and action; `showFailure()` always reveals the actions row with a retry/resend button. Unknown kinds fall back to `unknown`, so no failure renders without an action. | "actionable-error: retry button text matches FAILURE_COPY per kind", "actionable-error: actions hidden at idle, shown after showFailure" |
| `plain-language-summary` | MUST | Summaries come from `FAILURE_COPY`; raw `message`/`detail` go into the detail `<pre>` behind the "Technical details" disclosure (hidden entirely when there is none). | — (copy review; vocabulary pinned by the exported `FAILURE_COPY` map and asserted per kind) |
| `error-announced` | MUST | The persistent `role="alert"` element receives the summary via `textContent` on each failure — replaced, never stacked. | "error-announced: alert role element present" |
| `retry-single-flight` | MUST | `retry()` guards on `inFlight`; during flight the button exposes `aria-disabled`/`aria-busy` and the polite status region reads "Retrying…". | "retry-single-flight: second retry call while in-flight is a no-op", "retry-single-flight: retry button has aria-disabled and aria-busy while retrying" |
| `refusal-distinguished` | SHOULD | The `refusal` entry carries rephrase-oriented copy and the "Edit and resend" label; transient kinds say "Try again". | "actionable-error: refusal kind uses \"Edit and resend\"" |
| `auto-retry-transient` | MAY | Not implemented — belongs to the host's transport layer. | — |

## Deviations and notes

- `data-state` walks idle → errored → retrying → errored correctly; the retrying branch is asserted inside "retry-single-flight: retry button has aria-disabled and aria-busy while retrying".
- `clearFailure()` resets the alert and hides the actions row: "clearFailure: hides actions and clears alert text".
