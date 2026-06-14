# Prompt Composer — Vanilla JS compliance

Traces `PromptComposer.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`PromptComposer.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `composer-labeled` | MUST | `mount()` builds a visible `<label>` wired to the textarea id. | "composer-labeled: label element is present and associated with the textarea" |
| `enter-submits` | MUST | The keydown listener maps Enter (without Shift) to `submit()` with `preventDefault`; Shift+Enter inserts a newline natively. | "enter-submits: Enter key calls onSubmit with current value", "enter-submits: Shift+Enter does not submit" |
| `ime-safe` | MUST NOT | The listener returns before submitting when `event.isComposing` is true. | "ime-safe: Enter during isComposing does not submit" |
| `draft-preserved` | MUST NOT | Nothing in the class empties the textarea except the explicit `clear()` method; `setBusy()` and failed `submit()` calls leave the draft untouched. | "draft-preserved: setValue survives setBusy without clearing", "clear: clears the textarea value" (the only clearing path) |
| `no-silent-truncation` | MUST NOT | The native `maxLength` attribute is never set; `state()` reports `over-limit` while every character is retained and submission is gated. | "no-silent-truncation: textarea has no native maxLength attribute", "no-silent-truncation: character counter renders when maxLength provided" |
| `typing-never-locked` | MUST | No code path sets `disabled` or `readOnly` on the textarea. | "typing-never-locked: textarea is never disabled or readOnly" |
| `submit-state-accessible` | MUST | The button exists in every state with `aria-disabled` (focusable) and `aria-describedby` pointing at the reason element fed from `UNAVAILABLE_REASONS`. | "submit-state-accessible: button uses aria-disabled, not native disabled", "…reason text updates per state" |
| `shortcut-discoverable` | SHOULD | The hint renders visibly and is in the textarea's `aria-describedby` chain. | — |
| `grow-with-content` | SHOULD | `refresh()` applies the 2–8 rows heuristic; CSS `field-sizing: content` is recommended where supported. | — (layout; browser e2e) |
| `enter-preference` | MAY | Not implemented. | — |

## Deviations and notes

- Submission gating is asserted from both directions: "submit: clicking button does not submit when empty" and "submit: clicking button submits when composing".
