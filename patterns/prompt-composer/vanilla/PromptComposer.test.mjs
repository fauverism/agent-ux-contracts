import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
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
const wrapper = () => host.querySelector('.prompt-composer');

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

/** One character past the budget used in the over-limit fixtures. */
const LIMIT = 10;
const OVER = 'x'.repeat(LIMIT + 1);

const enterKey = (init = {}) =>
  new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
/** Simulates the user typing: sets the value and fires the DOM input event. */
const type = (value) => {
  textarea().value = value;
  // window.Event: the global Event in node:test is Node's, which jsdom rejects.
  textarea().dispatchEvent(new window.Event('input', { bubbles: true }));
};

/** The three states in which submission is unavailable, and how to reach each. */
const GATED_STATES = [
  ['empty', () => {}],
  ['over-limit', (pc) => pc.setValue(OVER)],
  ['busy', (pc) => { pc.setValue('draft'); pc.setBusy(true); }],
];

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

test('enter-submits: Enter is consumed as submit; Shift+Enter keeps its native newline default', () => {
  const pc = mounted();
  pc.setValue('hello');
  // dispatchEvent returns false when a listener called preventDefault().
  assert.equal(
    textarea().dispatchEvent(enterKey()),
    false,
    'Enter default prevented: it submits, it does not also insert a newline',
  );
  assert.equal(
    textarea().dispatchEvent(enterKey({ shiftKey: true })),
    true,
    'Shift+Enter default left alone: the browser inserts the newline',
  );
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

for (const [name, enter] of GATED_STATES) {
  test(`typing-never-locked: typing is accepted in the ${name} state`, () => {
    const pc = mounted({ maxLength: LIMIT });
    enter(pc);
    assert.equal(pc.state(), name);
    assert.equal(textarea().disabled, false, 'not disabled');
    assert.equal(textarea().readOnly, false, 'not readOnly');
    assert.equal(textarea().getAttribute('aria-disabled'), null);
    assert.equal(textarea().getAttribute('aria-readonly'), null);
    type('edited');
    assert.equal(pc.getValue(), 'edited', 'the edit is kept');
    assert.equal(textarea().disabled, false, 'still not disabled after typing');
  });
}

test('draft-preserved: setValue survives setBusy without clearing', () => {
  const pc = mounted();
  pc.setValue('my draft');
  pc.setBusy(true);
  assert.equal(pc.getValue(), 'my draft', 'draft intact after setBusy');
  pc.setBusy(false);
  assert.equal(pc.getValue(), 'my draft', 'draft intact after clearing busy');
});

test('draft-preserved: submit attempts never clear the draft, whether accepted, gated, or failed', () => {
  const submits = [];
  const pc = mounted({ onSubmit: (v) => submits.push(v) });
  pc.setValue('my draft');

  // Accepted-looking attempts: the component hands the draft over and keeps it.
  textarea().dispatchEvent(enterKey());
  submitBtn().click();
  assert.deepEqual(submits, ['my draft', 'my draft']);
  assert.equal(pc.getValue(), 'my draft', 'draft still there after submitting');

  // Gated attempts while a send is in flight.
  pc.setBusy(true);
  textarea().dispatchEvent(enterKey());
  submitBtn().click();
  assert.equal(submits.length, 2, 'busy attempts were gated, not submitted');
  assert.equal(pc.getValue(), 'my draft', 'draft intact while busy');
  pc.setBusy(false);

  // A host handler that throws (rejected submission) leaves the draft alone.
  const failing = new PromptComposer({ onSubmit: () => { throw new Error('rejected'); } });
  const other = document.createElement('div');
  document.body.append(other);
  try {
    failing.mount(other);
    failing.setValue('keep me');
    assert.throws(() => failing.submit(), /rejected/);
    assert.equal(failing.getValue(), 'keep me', 'draft intact after a failed submission');
  } finally {
    other.remove();
  }
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

test('no-silent-truncation: input past the budget is retained in full, exposed, and gated', () => {
  let submits = 0;
  const pc = mounted({ maxLength: LIMIT, onSubmit: () => { submits += 1; } });
  type(OVER);
  assert.equal(pc.getValue(), OVER, 'every character kept, none dropped');
  assert.equal(textarea().value.length, LIMIT + 1);
  assert.equal(pc.state(), 'over-limit');
  assert.equal(wrapper().dataset.state, 'over-limit');

  const counter = host.querySelector('.prompt-composer__length');
  assert.match(counter.textContent, /11 \/ 10.*over the limit/, 'overage is stated in text');
  assert.equal(counter.getAttribute('aria-live'), 'polite', 'and announced');
  assert.ok(
    textarea().getAttribute('aria-describedby').split(' ').includes(counter.id),
    'the counter describes the textarea',
  );

  textarea().dispatchEvent(enterKey());
  submitBtn().click();
  assert.equal(submits, 0, 'an over-limit draft is not submitted');
  assert.equal(pc.getValue(), OVER, 'and is still not truncated');
});

for (const [name, enter] of GATED_STATES) {
  test(`submit-state-accessible: in the ${name} state the button stays focusable, aria-disabled, described, and inert`, () => {
    let submits = 0;
    const pc = mounted({ maxLength: LIMIT, onSubmit: () => { submits += 1; } });
    enter(pc);
    assert.equal(pc.state(), name);
    const btn = submitBtn();
    assert.equal(btn.tagName, 'BUTTON');
    assert.equal(btn.getAttribute('aria-disabled'), 'true');
    assert.equal(btn.disabled, false, 'never natively disabled (that would drop it from the tab order)');
    assert.equal(btn.hidden, false);
    assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
    assert.ok(btn.tabIndex >= 0, 'in the tab order');
    btn.focus();
    assert.ok(document.activeElement === btn, 'focusable');

    // The accessible description resolves to a non-empty reason for this state.
    const description = btn
      .getAttribute('aria-describedby')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    assert.ok(UNAVAILABLE_REASONS[name].trim().length > 0, 'reason copy is not empty');
    assert.equal(description, UNAVAILABLE_REASONS[name]);

    // aria-disabled is honest: activating the control does nothing.
    btn.click();
    textarea().dispatchEvent(enterKey());
    assert.equal(submits, 0);
  });
}

test('shortcut-discoverable: the hint is rendered as text and describes the textarea', () => {
  mounted({ hint: 'Enter to send. Shift+Enter for a new line.' });
  const hint = host.querySelector('.prompt-composer__hint');
  assert.equal(hint.textContent, 'Enter to send. Shift+Enter for a new line.');
  assert.ok(!hint.closest('[hidden]'));
  assert.ok(textarea().getAttribute('aria-describedby').split(' ').includes(hint.id));
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

test('axe: no WCAG A/AA violations in empty, composing, over-limit, and busy states', async () => {
  // maxLength is set so the polite length region is in the DOM under axe.
  const pc = mounted({ maxLength: LIMIT });
  const steps = [
    ['empty', () => {}],
    ['composing', () => pc.setValue('hello')],
    ['over-limit', () => pc.setValue(OVER)],
    ['busy', () => { pc.setValue('hello'); pc.setBusy(true); }],
  ];
  for (const [name, enter] of steps) {
    enter();
    assert.equal(pc.state(), name);
    const result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${name}: axe violations`);
  }
});
