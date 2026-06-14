import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PromptComposer, UNAVAILABLE_REASONS } from './PromptComposer.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options = {}) => {
  const pc = new PromptComposer({ onSubmit: () => {}, ...options });
  pc.mount(host);
  return pc;
};

const textarea = () => host.querySelector('.prompt-composer__input');
const submitBtn = () => host.querySelector('.prompt-composer__submit');
const reasonEl = () => host.querySelector('.sr-only');

test('composer-labeled: label element is present and associated with the textarea', () => {
  const pc = mounted({ label: 'Ask away' });
  const label = host.querySelector('label.prompt-composer__label');
  assert.ok(label, 'label element present');
  assert.equal(label.textContent, 'Ask away');
  assert.equal(label.htmlFor, textarea().id, 'label.htmlFor matches textarea id');
});

test('enter-submits: Enter key calls onSubmit with current value', () => {
  let submitted = null;
  const pc = mounted({ onSubmit: (v) => { submitted = v; } });
  pc.setValue('hello');
  textarea().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  assert.equal(submitted, 'hello');
});

test('enter-submits: Shift+Enter does not submit', () => {
  let submitted = false;
  const pc = mounted({ onSubmit: () => { submitted = true; } });
  pc.setValue('hello');
  textarea().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }),
  );
  assert.equal(submitted, false);
});

test('ime-safe: Enter during isComposing does not submit', () => {
  let submitted = false;
  const pc = mounted({ onSubmit: () => { submitted = true; } });
  pc.setValue('hello');
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isComposing', { value: true });
  textarea().dispatchEvent(event);
  assert.equal(submitted, false, 'IME Enter must not submit');
});

test('typing-never-locked: textarea is never disabled or readOnly', () => {
  const pc = mounted();
  pc.setBusy(true);
  assert.equal(textarea().disabled, false, 'not disabled while busy');
  assert.equal(textarea().readOnly, false, 'not readOnly while busy');
});

test('draft-preserved: setValue survives setBusy without clearing', () => {
  const pc = mounted();
  pc.setValue('my draft');
  pc.setBusy(true);
  assert.equal(pc.getValue(), 'my draft', 'draft intact after setBusy');
  pc.setBusy(false);
  assert.equal(pc.getValue(), 'my draft', 'draft intact after clearing busy');
});

test('no-silent-truncation: textarea has no native maxLength attribute', () => {
  const pc = mounted({ maxLength: 100 });
  const ta = textarea();
  assert.ok(
    !ta.hasAttribute('maxlength') || ta.maxLength === -1 || ta.maxLength === 524288,
    'no restrictive maxLength on textarea',
  );
});

test('no-silent-truncation: character counter renders when maxLength provided', () => {
  const pc = mounted({ maxLength: 100 });
  pc.setValue('hello');
  const counter = host.querySelector('.prompt-composer__length');
  assert.ok(counter, 'length counter present');
  assert.match(counter.textContent, /5.*100/);
});

test('submit-state-accessible: button uses aria-disabled, not native disabled', () => {
  const pc = mounted();
  // empty: aria-disabled true
  assert.equal(submitBtn().getAttribute('aria-disabled'), 'true');
  assert.equal(submitBtn().disabled, false, 'never natively disabled');

  // composing: aria-disabled false
  pc.setValue('hello');
  assert.equal(submitBtn().getAttribute('aria-disabled'), 'false');
  assert.equal(submitBtn().disabled, false);
});

test('submit-state-accessible: reason text updates per state', () => {
  const pc = mounted();
  // empty state
  assert.match(reasonEl().textContent, new RegExp(UNAVAILABLE_REASONS.empty));

  // busy state
  pc.setValue('hello');
  pc.setBusy(true);
  assert.match(reasonEl().textContent, new RegExp(UNAVAILABLE_REASONS.busy));

  // composing: no reason
  pc.setBusy(false);
  assert.equal(reasonEl().textContent, '');
});

test('submit: clicking button does not submit when empty', () => {
  let submitted = false;
  const pc = mounted({ onSubmit: () => { submitted = true; } });
  submitBtn().click();
  assert.equal(submitted, false);
});

test('submit: clicking button submits when composing', () => {
  let submitted = null;
  const pc = mounted({ onSubmit: (v) => { submitted = v; } });
  pc.setValue('hello world');
  submitBtn().click();
  assert.equal(submitted, 'hello world');
});

test('clear: clears the textarea value', () => {
  const pc = mounted();
  pc.setValue('something');
  pc.clear();
  assert.equal(pc.getValue(), '');
});
