# Prompt Composer — Vanilla JS compliance

Traces `PromptComposer.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`PromptComposer.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `composer-labeled` | MUST | `mount()` builds a visible `<label>` wired to the textarea id. | "composer-labeled: label element is present and associated with the textarea" |
| `enter-submits` | MUST | The keydown listener maps Enter (without Shift) to `submit()` with `preventDefault`; Shift+Enter inserts a newline natively. | "enter-submits: Enter key calls onSubmit with current value", "enter-submits: Shift+Enter does not submit", "enter-submits: Enter is consumed as submit; Shift+Enter keeps its native newline default" |
| `ime-safe` | MUST NOT | The listener returns before submitting when `event.isComposing` is true. | "ime-safe: Enter during isComposing does not submit" |
| `draft-preserved` | MUST NOT | Nothing in the class empties the textarea except the explicit `clear()` method; `setBusy()` and failed `submit()` calls leave the draft untouched. | "draft-preserved: setValue survives setBusy without clearing", "draft-preserved: submit attempts never clear the draft, whether accepted, gated, or failed", "clear: clears the textarea value" (the only clearing path) |
| `no-silent-truncation` | MUST NOT | The native `maxLength` attribute is never set; `state()` reports `over-limit` while every character is retained and submission is gated. | "no-silent-truncation: input past the budget is retained in full, exposed, and gated", "no-silent-truncation: textarea has no native maxLength attribute", "no-silent-truncation: character counter renders when maxLength provided" |
| `typing-never-locked` | MUST | No code path sets `disabled` or `readOnly` on the textarea. | "typing-never-locked: typing is accepted in the {empty, over-limit, busy} state" (one test per state) |
| `submit-state-accessible` | MUST | The button exists in every state with `aria-disabled` (focusable) and `aria-describedby` pointing at the reason element fed from `UNAVAILABLE_REASONS`. | "submit-state-accessible: in the {empty, over-limit, busy} state the button stays focusable, aria-disabled, described, and inert" (one test per state), "submit-state-accessible: button uses aria-disabled, not native disabled", "submit-state-accessible: reason text updates per state" |
| `shortcut-discoverable` | SHOULD | The hint renders visibly and is in the textarea's `aria-describedby` chain. | "shortcut-discoverable: the hint is rendered as text and describes the textarea" |
| `grow-with-content` | SHOULD | `refresh()` applies the 2–8 rows heuristic; CSS `field-sizing: content` is recommended where supported. | — (deviation: untested. Growth is layout; jsdom has no layout engine and the repo has no browser test pass yet.) |
| `enter-preference` | MAY | Not implemented. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in empty, composing, over-limit, and busy states" runs axe-core (WCAG A/AA tags) in all four contract states with `maxLength` set, so the polite length region is in the DOM under test; `color-contrast` is excluded because jsdom has no layout engine.

## Limits of the proof

- `enter-submits`: jsdom performs no default text insertion, so "Shift+Enter inserts a newline" is proven by proxy — the keydown's default is not prevented, leaving the browser's native newline in place.
- `submit-state-accessible` / `composer-labeled`: "visible" is proven by proxy (`hidden` attribute, no hidden or `aria-hidden` ancestor, in the tab order, focusable). There is no layout engine in jsdom, and the reason text relies on the host's `.sr-only` class.
- `draft-preserved`: `onSubmit` returns nothing, so the component cannot tell an accepted submission from a rejected one. What the tests prove is the component's half: it never clears or rewrites the draft itself. Clearing only on accepted submission is the host's half (see notes).
- `ime-safe`: proven for events that report `isComposing`. Safari can fire the confirming Enter after `compositionend` with `isComposing === false` (keyCode 229); that case needs a real-browser check and is not covered here.

## Deviations and notes

- The length status uses `aria-live="polite"`; its text is the running count, which changes on every keystroke, so some screen readers will announce it while typing. The contract only requires the over-limit transition to be announced.
- Host contract: call `clear()` only after the submission is accepted, and only if the draft still equals what was sent — the user can keep typing while busy.
- Submission gating is asserted from both directions: "submit: clicking button does not submit when empty" and "submit: clicking button submits when composing".
