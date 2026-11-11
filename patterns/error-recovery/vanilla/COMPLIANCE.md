# Error Recovery — Vanilla JS compliance

Traces `ErrorRecovery.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST maps to at least one assertion in
`ErrorRecovery.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `input-preserved` | MUST | The textarea is created once in `mount()` and never rebuilt; `showFailure()`/`clearFailure()` only swap text elsewhere, so user edits genuinely survive every failure. | "input-preserved: edits made after a failure and during a retry are kept", "input-preserved: textarea is present after mount and after showFailure", "input-preserved: textarea value survives showFailure", "input-preserved: textarea is never disabled or readOnly", "getInput: returns current textarea value including edits" |
| `actionable-error` | MUST | `FAILURE_COPY` maps every kind to a summary and action; `showFailure()` always reveals the actions row with a retry/resend button. Unknown kinds fall back to `unknown`, so no failure renders without an action. | "actionable-error: retry button text matches FAILURE_COPY per kind", "actionable-error: actions hidden at idle, shown after showFailure" |
| `plain-language-summary` | MUST | Summaries come from `FAILURE_COPY`; raw `message`/`detail` go into the detail `<pre>` behind the "Technical details" disclosure (hidden entirely when there is none). | "plain-language-summary: the summary is the plain-language copy; raw codes stay in the detail region", "plain-language-summary: the technical detail is reachable through a disclosure" (structure; the wording itself is copy review) |
| `error-announced` | MUST | The persistent `role="alert"` element receives the summary via `textContent` on each failure — replaced, never stacked. | "error-announced: alert role element present" |
| `retry-single-flight` | MUST | `retry()` guards on `inFlight`; during flight the button exposes `aria-disabled`/`aria-busy` and the polite status region reads "Retrying…". | "retry-single-flight: second retry call while in-flight is a no-op", "retry-single-flight: retry button has aria-disabled and aria-busy while retrying" |
| `refusal-distinguished` | SHOULD | The `refusal` entry carries rephrase-oriented copy and the "Edit and resend" label; transient kinds say "Try again". | "actionable-error: refusal kind uses \"Edit and resend\"" |
| `auto-retry-transient` | MAY | Not implemented — belongs to the host's transport layer. | — |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) runs in all four contract states, plus errored with the technical detail expanded: "axe: no WCAG A/AA violations in idle, errored, retrying, and recovered states".

## Limits of the proof

- `plain-language-summary`: tests prove the structure — the summary is the taxonomy copy verbatim and host-supplied raw text appears only inside the collapsed detail region. Whether the copy in `FAILURE_COPY` reads as plain language is copy review.
- `input-preserved`: proven for a mounted component. A host that unmounts the component on failure loses the draft regardless (see notes).
- Keyboard operation of the recovery actions is by proxy: native `<button>`s, never natively disabled.

## Deviations and notes

- `data-state` walks idle → errored → retrying → errored correctly; the retrying branch is asserted inside "retry-single-flight: retry button has aria-disabled and aria-busy while retrying".
- `clearFailure()` resets the alert and hides the actions row: "clearFailure: hides actions and clears alert text".

## State coverage

- `recovered` — represented as `failure === null` after a successful retry
  (the alert clears, the preserved input remains); recovery is the absence of
  a failure, so no named literal exists in the source.
