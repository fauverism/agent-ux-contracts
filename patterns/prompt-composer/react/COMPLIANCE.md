# Prompt Composer — React compliance

Traces `PromptComposer.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`PromptComposer.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `composer-labeled` | MUST | A visible `<label htmlFor>` names the textarea; placeholder is decorative only. | "composer-labeled: textarea has a visible label associated via htmlFor" |
| `enter-submits` | MUST | `onKeyDown` maps Enter (without Shift) to `submit()` and prevents the default newline; Shift+Enter falls through to the textarea's native newline. | "enter-submits: Enter key calls onSubmit with current value", "enter-submits: Shift+Enter does not submit" |
| `ime-safe` | MUST NOT | The handler returns before submitting when `event.nativeEvent.isComposing` is true. | "ime-safe: Enter during IME composition does not submit" |
| `draft-preserved` | MUST NOT | The component is controlled and never mutates `value`; only the host clears it, and the documented host contract is to clear on accepted submission only. Busy transitions don't touch the draft. | "draft-preserved: textarea is never disabled or readOnly in any state" |
| `no-silent-truncation` | MUST NOT | The native `maxLength` attribute is deliberately omitted; overage flips the `over-limit` state, retains every character, and gates submission. | "no-silent-truncation: textarea has no native maxLength attribute", "no-silent-truncation: character counter renders when maxLength is provided" |
| `typing-never-locked` | MUST | The textarea never receives `disabled` or `readOnly` in any state; only `canSubmit` is gated. | "typing-never-locked: textarea is never disabled or readOnly while busy" |
| `submit-state-accessible` | MUST | The button renders in every state, uses `aria-disabled` (still focusable), and `aria-describedby` points at the `UNAVAILABLE_REASONS` text naming why submission is unavailable. | "submit-state-accessible: button uses aria-disabled, not native disabled", "…button has aria-describedby pointing to reason text", "…reason text updates per state" |
| `shortcut-discoverable` | SHOULD | The `hint` prop renders visibly below the input and is linked via `aria-describedby`. | — (covered indirectly by axe + the labeled test) |
| `grow-with-content` | SHOULD | A rows heuristic (2–8 based on line count) approximates growth; the code comment recommends CSS `field-sizing: content` where supported, since the heuristic ignores soft wrapping. | — (layout; browser e2e) |
| `enter-preference` | MAY | Not implemented — a persistent preference belongs to the host's settings layer. | — |

## Accessibility fields

- axe: "axe: no WCAG A/AA violations in empty, composing, and busy states" runs axe-core (WCAG A/AA tags) in all three gated states; `color-contrast` is excluded because jsdom has no layout engine — it belongs to the browser e2e pass.

## Deviations and notes

- The length status uses `aria-live="polite"` so crossing the budget announces; per-keystroke announcements are throttled naturally because the text only changes materially near the boundary.
- Host contract: clear `value` only after the submission is accepted; clearing on send violates `draft-preserved` at the integration level.
