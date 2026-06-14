import { useId, type KeyboardEvent } from 'react';

export type ComposerState = 'empty' | 'composing' | 'over-limit' | 'busy';

/** Why submission is currently unavailable; exposed to assistive technology. */
export const UNAVAILABLE_REASONS: Record<Exclude<ComposerState, 'composing'>, string> = {
  empty: 'Message is empty.',
  'over-limit': 'Message is over the length limit.',
  busy: 'Sending in progress.',
};

export interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the draft; the host clears `value` only on accepted submission
   *  (constraint: draft-preserved). */
  onSubmit: (value: string) => void;
  /** True while a submission is in flight; gates submission, never typing. */
  busy?: boolean;
  /** Length budget. Deliberately NOT wired to the native maxLength attribute
   *  (constraint: no-silent-truncation). */
  maxLength?: number;
  /** Visible label (constraint: composer-labeled). */
  label?: string;
  /** Visible keyboard hint (constraint: shortcut-discoverable). */
  hint?: string;
  placeholder?: string;
}

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  busy = false,
  maxLength,
  label = 'Message',
  hint = 'Enter to send. Shift+Enter for a new line.',
  placeholder,
}: PromptComposerProps) {
  const inputId = useId();
  const hintId = useId();
  const lengthId = useId();
  const reasonId = useId();

  const overLimit = maxLength !== undefined && value.length > maxLength;
  const empty = value.trim() === '';
  const state: ComposerState = busy
    ? 'busy'
    : overLimit
      ? 'over-limit'
      : empty
        ? 'empty'
        : 'composing';
  const canSubmit = state === 'composing';

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    // Enter confirms a character conversion during IME composition, not a
    // message (constraint: ime-safe).
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  // Crude growth heuristic; prefer `field-sizing: content` in the stylesheet
  // where supported (constraint: grow-with-content).
  const rows = Math.min(8, Math.max(2, value.split('\n').length));

  return (
    <div className="prompt-composer" data-state={state}>
      <label className="prompt-composer__label" htmlFor={inputId}>
        {label}
      </label>

      {/* Never disabled or readonly in any state (constraint: typing-never-locked). */}
      <textarea
        id={inputId}
        className="prompt-composer__input"
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={maxLength !== undefined ? `${hintId} ${lengthId}` : hintId}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />

      <p id={hintId} className="prompt-composer__hint">
        {hint}
      </p>

      {maxLength !== undefined && (
        <p id={lengthId} className="prompt-composer__length" aria-live="polite">
          {value.length} / {maxLength}
          {overLimit && ' — over the limit'}
        </p>
      )}

      {/* Visible and focusable in every state (constraint: submit-state-accessible). */}
      <button
        type="button"
        className="prompt-composer__submit"
        aria-disabled={!canSubmit}
        aria-describedby={reasonId}
        onClick={submit}
      >
        {busy ? 'Sending…' : 'Send'}
      </button>
      <span id={reasonId} className="sr-only">
        {canSubmit ? '' : UNAVAILABLE_REASONS[state as Exclude<ComposerState, 'composing'>]}
      </span>
    </div>
  );
}
