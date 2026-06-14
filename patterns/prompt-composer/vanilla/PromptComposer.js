/**
 * PromptComposer — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 */

/** Why submission is currently unavailable; exposed to assistive technology. */
export const UNAVAILABLE_REASONS = {
  empty: 'Message is empty.',
  'over-limit': 'Message is over the length limit.',
  busy: 'Sending in progress.',
};

let composerIdCounter = 0;

export class PromptComposer {
  /**
   * @param {object} options
   * @param {(value: string) => void} options.onSubmit Called with the draft;
   *   hosts call clear() only on accepted submission (constraint: draft-preserved).
   * @param {number} [options.maxLength] Length budget. Deliberately NOT wired
   *   to the native maxLength attribute (constraint: no-silent-truncation).
   * @param {string} [options.label] Visible label (constraint: composer-labeled).
   * @param {string} [options.hint] Visible keyboard hint (constraint: shortcut-discoverable).
   * @param {string} [options.placeholder]
   */
  constructor({
    onSubmit,
    maxLength,
    label = 'Message',
    hint = 'Enter to send. Shift+Enter for a new line.',
    placeholder = '',
  }) {
    this.onSubmit = onSubmit;
    this.maxLength = maxLength;
    this.label = label;
    this.hint = hint;
    this.placeholder = placeholder;
    this.busy = false;

    this.root = null;
    this.wrapper = null;
    this.textarea = null;
    this.lengthEl = null;
    this.submitBtn = null;
    this.reasonEl = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('PromptComposer: container not found');

    const n = (composerIdCounter += 1);
    const inputId = `prompt-composer-input-${n}`;
    const hintId = `prompt-composer-hint-${n}`;
    const lengthId = `prompt-composer-length-${n}`;
    const reasonId = `prompt-composer-reason-${n}`;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'prompt-composer';

    const labelEl = document.createElement('label');
    labelEl.className = 'prompt-composer__label';
    labelEl.htmlFor = inputId;
    labelEl.textContent = this.label;

    // Never disabled or readonly in any state (constraint: typing-never-locked).
    this.textarea = document.createElement('textarea');
    this.textarea.id = inputId;
    this.textarea.className = 'prompt-composer__input';
    this.textarea.rows = 2;
    this.textarea.placeholder = this.placeholder;
    this.textarea.setAttribute(
      'aria-describedby',
      this.maxLength !== undefined ? `${hintId} ${lengthId}` : hintId,
    );
    this.textarea.addEventListener('input', () => this.refresh());
    this.textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      // Enter confirms a character conversion during IME composition, not a
      // message (constraint: ime-safe).
      if (event.isComposing) return;
      event.preventDefault();
      this.submit();
    });

    const hintEl = document.createElement('p');
    hintEl.id = hintId;
    hintEl.className = 'prompt-composer__hint';
    hintEl.textContent = this.hint;

    if (this.maxLength !== undefined) {
      this.lengthEl = document.createElement('p');
      this.lengthEl.id = lengthId;
      this.lengthEl.className = 'prompt-composer__length';
      this.lengthEl.setAttribute('aria-live', 'polite');
    }

    // Visible and focusable in every state (constraint: submit-state-accessible).
    this.submitBtn = document.createElement('button');
    this.submitBtn.type = 'button';
    this.submitBtn.className = 'prompt-composer__submit';
    this.submitBtn.setAttribute('aria-describedby', reasonId);
    this.submitBtn.addEventListener('click', () => this.submit());

    this.reasonEl = document.createElement('span');
    this.reasonEl.id = reasonId;
    this.reasonEl.className = 'sr-only';

    this.wrapper.append(labelEl, this.textarea, hintEl);
    if (this.lengthEl) this.wrapper.append(this.lengthEl);
    this.wrapper.append(this.submitBtn, this.reasonEl);
    this.root.append(this.wrapper);

    this.refresh();
  }

  state() {
    const value = this.textarea.value;
    if (this.busy) return 'busy';
    if (this.maxLength !== undefined && value.length > this.maxLength) return 'over-limit';
    if (value.trim() === '') return 'empty';
    return 'composing';
  }

  refresh() {
    const state = this.state();
    const value = this.textarea.value;
    const canSubmit = state === 'composing';

    this.wrapper.dataset.state = state;

    // Crude growth heuristic; prefer `field-sizing: content` in the
    // stylesheet where supported (constraint: grow-with-content).
    this.textarea.rows = Math.min(8, Math.max(2, value.split('\n').length));

    if (this.lengthEl) {
      const over =
        this.maxLength !== undefined && value.length > this.maxLength
          ? ' — over the limit'
          : '';
      this.lengthEl.textContent = `${value.length} / ${this.maxLength}${over}`;
    }

    this.submitBtn.textContent = this.busy ? 'Sending…' : 'Send';
    this.submitBtn.setAttribute('aria-disabled', String(!canSubmit));
    this.reasonEl.textContent = canSubmit ? '' : UNAVAILABLE_REASONS[state];
  }

  submit() {
    if (this.state() !== 'composing') return;
    this.onSubmit(this.textarea.value);
  }

  setBusy(busy) {
    this.busy = busy;
    this.refresh();
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(value) {
    this.textarea.value = value;
    this.refresh();
  }

  /** Explicit clearing — the only component-side path that empties a draft. */
  clear() {
    this.setValue('');
  }
}
