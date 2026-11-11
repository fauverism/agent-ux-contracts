# Prompt Composer — React compliance

Traces `PromptComposer.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`PromptComposer.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `composer-labeled` | MUST | A visible `<label htmlFor>` names the textarea; placeholder is decorative only. | "composer-labeled: textarea has a visible label associated via htmlFor" |
| `enter-submits` | MUST | `onKeyDown` maps Enter (without Shift) to `submit()` and prevents the default newline; Shift+Enter falls through to the textarea's native newline. | "enter-submits: Enter key calls onSubmit with current value", "enter-submits: Shift+Enter does not submit", "enter-submits: Enter is consumed as submit; Shift+Enter keeps its native newline default" |
| `ime-safe` | MUST NOT | The handler returns before submitting when `event.nativeEvent.isComposing` is true. | "ime-safe: Enter during IME composition does not submit" |
| `draft-preserved` | MUST NOT | The component is controlled and never mutates `value`; only the host clears it, and the documented host contract is to clear on accepted submission only. Busy transitions don't touch the draft. | "draft-preserved: submit attempts and busy transitions never rewrite the draft" |
| `no-silent-truncation` | MUST NOT | The native `maxLength` attribute is deliberately omitted; overage flips the `over-limit` state, retains every character, and gates submission. | "no-silent-truncation: input past the budget is retained in full, exposed, and gated", "no-silent-truncation: textarea has no native maxLength attribute", "no-silent-truncation: character counter renders when maxLength is provided" |
| `typing-never-locked` | MUST | The textarea never receives `disabled` or `readOnly` in any state; only `canSubmit` is gated. | "typing-never-locked: typing is accepted in the {empty, over-limit, busy} state" (one test per state) |
| `submit-state-accessible` | MUST | The button renders in every state, uses `aria-disabled` (still focusable), and `aria-describedby` points at the `UNAVAILABLE_REASONS` text naming why submission is unavailable. | "submit-state-accessible: in the {empty, over-limit, busy} state the button stays focusable, aria-disabled, described, and inert" (one test per state), "submit-state-accessible: in the composing state the button is available with no unavailable-reason", "submit-state-accessible: button uses aria-disabled, not native disabled", "submit-state-accessible: button has aria-describedby pointing to reason text", "submit-state-accessible: reason text updates per state" |
| `shortcut-discoverable` | SHOULD | The `hint` prop renders visibly below the input and is linked via `aria-describedby`. | "shortcut-discoverable: the hint is rendered as text and describes the textarea" |
| `grow-with-content` | SHOULD | A rows heuristic (2–8 based on line count) approximates growth; the code comment recommends CSS `field-sizing: content` where supported, since the heuristic ignores soft wrapping. | — (deviation: untested. Growth is layout; jsdom has no layout engine and the repo has no browser test pass yet.) |
| `enter-preference` | MAY | Not implemented — a persistent preference belongs to the host's settings layer. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in empty, composing, over-limit, and busy states" runs axe-core (WCAG A/AA tags) in all four contract states with `maxLength` set, so the polite length region is in the DOM under test; `color-contrast` is excluded because jsdom has no layout engine.

## Limits of the proof

- `enter-submits`: jsdom performs no default text insertion, so "Shift+Enter inserts a newline" is proven by proxy — the keydown's default is not prevented, leaving the browser's native newline in place.
- `submit-state-accessible` / `composer-labeled`: "visible" is proven by proxy (`hidden` attribute, no hidden or `aria-hidden` ancestor, in the tab order, focusable). There is no layout engine in jsdom, and the reason text relies on the host's `.sr-only` class.
- `draft-preserved`: `onSubmit` returns nothing, so the component cannot tell an accepted submission from a rejected one. What the tests prove is the component's half: it never clears or rewrites the draft itself. Clearing only on accepted submission is the host's half (see notes).
- `ime-safe`: proven for events that report `isComposing`. Safari can fire the confirming Enter after `compositionend` with `isComposing === false` (keyCode 229); that case needs a real-browser check and is not covered here.

## Deviations and notes

- The length status uses `aria-live="polite"` so crossing the budget announces. Its text is the running count, which changes on every keystroke, so some screen readers will announce it while typing; the contract only requires the over-limit transition to be announced.
- Host contract: clear `value` only after the submission is accepted; clearing on send violates `draft-preserved` at the integration level.
