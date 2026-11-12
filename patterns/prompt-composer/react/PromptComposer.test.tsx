import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { PromptComposer, UNAVAILABLE_REASONS } from './PromptComposer';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const textarea = (c: HTMLElement) =>
  c.querySelector<HTMLTextAreaElement>('.prompt-composer__input')!;
const submitBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.prompt-composer__submit')!;
const reasonEl = (c: HTMLElement) => c.querySelector<HTMLElement>('.sr-only')!;
const stateOf = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.prompt-composer')!.dataset.state;

/** One character past the budget used in the over-limit fixtures. */
const LIMIT = 10;
const OVER = 'x'.repeat(LIMIT + 1);

/** The three states in which submission is unavailable. */
const GATED_STATES = [
  ['empty', { value: '', maxLength: LIMIT }],
  ['over-limit', { value: OVER, maxLength: LIMIT }],
  ['busy', { value: 'draft', maxLength: LIMIT, busy: true }],
] as const;

test('composer-labeled: textarea has a visible label associated via htmlFor', () => {
  const { container } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} label="Ask me anything" />,
  );
  const label = container.querySelector<HTMLLabelElement>('.prompt-composer__label');
  assert.ok(label, 'label element present');
  assert.equal(label!.textContent, 'Ask me anything');
  const ta = textarea(container);
  assert.equal(label!.htmlFor, ta.id, 'label.htmlFor matches textarea id');
});

test('enter-submits: Enter key calls onSubmit with current value', () => {
  let submitted = '';
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={(v) => { submitted = v; }} />,
  );
  fireEvent.keyDown(textarea(container), { key: 'Enter', shiftKey: false });
  assert.equal(submitted, 'hello');
});

test('enter-submits: Shift+Enter does not submit', () => {
  let submitted = false;
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={() => { submitted = true; }} />,
  );
  fireEvent.keyDown(textarea(container), { key: 'Enter', shiftKey: true });
  assert.equal(submitted, false);
});

test('enter-submits: Enter is consumed as submit; Shift+Enter keeps its native newline default', () => {
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} />,
  );
  // fireEvent returns false when the handler called preventDefault().
  assert.equal(
    fireEvent.keyDown(textarea(container), { key: 'Enter' }),
    false,
    'Enter default prevented: it submits, it does not also insert a newline',
  );
  assert.equal(
    fireEvent.keyDown(textarea(container), { key: 'Enter', shiftKey: true }),
    true,
    'Shift+Enter default left alone: the browser inserts the newline',
  );
});

test('ime-safe: Enter during IME composition does not submit', () => {
  let submitted = false;
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={() => { submitted = true; }} />,
  );
  // isComposing is on the native event
  const ta = textarea(container);
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isComposing', { value: true });
  ta.dispatchEvent(event);
  assert.equal(submitted, false, 'IME Enter must not submit');
});

for (const [name, props] of GATED_STATES) {
  test(`typing-never-locked: typing is accepted in the ${name} state`, () => {
    const changes: string[] = [];
    const { container } = render(
      <PromptComposer {...props} onChange={(v) => changes.push(v)} onSubmit={() => {}} />,
    );
    assert.equal(stateOf(container), name);
    const ta = textarea(container);
    assert.equal(ta.disabled, false, 'not disabled');
    assert.equal(ta.readOnly, false, 'not readOnly');
    assert.equal(ta.getAttribute('aria-disabled'), null);
    assert.equal(ta.getAttribute('aria-readonly'), null);
    fireEvent.change(ta, { target: { value: 'edited' } });
    assert.deepEqual(changes, ['edited'], 'the edit reaches the host');
  });
}

test('draft-preserved: submit attempts and busy transitions never rewrite the draft', () => {
  const changes: string[] = [];
  const submits: string[] = [];
  const handlers = {
    onChange: (v: string) => changes.push(v),
    onSubmit: (v: string) => submits.push(v),
  };
  const { container, rerender } = render(<PromptComposer value="my draft" {...handlers} />);

  // Accepted-looking attempts: the component hands the draft over and keeps it.
  fireEvent.keyDown(textarea(container), { key: 'Enter' });
  fireEvent.click(submitBtn(container));
  assert.deepEqual(submits, ['my draft', 'my draft']);
  assert.equal(textarea(container).value, 'my draft', 'draft still there after submitting');

  // Gated attempts while a send is in flight.
  rerender(<PromptComposer value="my draft" {...handlers} busy />);
  fireEvent.keyDown(textarea(container), { key: 'Enter' });
  fireEvent.click(submitBtn(container));
  assert.equal(textarea(container).value, 'my draft', 'draft intact while busy');

  rerender(<PromptComposer value="my draft" {...handlers} />);
  assert.equal(textarea(container).value, 'my draft', 'draft intact after busy ends');
  assert.deepEqual(changes, [], 'the component never asked the host to change the draft');
  assert.equal(submits.length, 2, 'busy attempts were gated, not submitted');
});

test('no-silent-truncation: textarea has no native maxLength attribute', () => {
  const { container } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} maxLength={100} />,
  );
  const ta = textarea(container);
  // maxLength defaults to -1 (not set) or should be absent
  assert.ok(
    !ta.hasAttribute('maxlength') || ta.maxLength === -1 || ta.maxLength === 524288,
    'no explicit maxLength restriction on the textarea element',
  );
});

test('no-silent-truncation: character counter renders when maxLength is provided', () => {
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} maxLength={100} />,
  );
  const counter = container.querySelector('.prompt-composer__length');
  assert.ok(counter, 'length counter rendered');
  assert.match(counter!.textContent!, /5.*100/);
});

test('no-silent-truncation: input past the budget is retained in full, exposed, and gated', () => {
  const changes: string[] = [];
  let submits = 0;
  const handlers = {
    onChange: (v: string) => changes.push(v),
    onSubmit: () => { submits += 1; },
  };
  const { container, rerender } = render(
    <PromptComposer value="" maxLength={LIMIT} {...handlers} />,
  );
  fireEvent.change(textarea(container), { target: { value: OVER } });
  assert.deepEqual(changes, [OVER], 'onChange receives every character, none dropped');

  rerender(<PromptComposer value={OVER} maxLength={LIMIT} {...handlers} />);
  assert.equal(textarea(container).value, OVER, 'the full overage stays in the textarea');
  assert.equal(stateOf(container), 'over-limit');

  const counter = container.querySelector<HTMLElement>('.prompt-composer__length')!;
  assert.match(counter.textContent!, /11 \/ 10.*over the limit/, 'overage is stated in text');
  assert.equal(counter.getAttribute('aria-live'), 'polite', 'and announced');
  assert.ok(
    textarea(container).getAttribute('aria-describedby')!.split(' ').includes(counter.id),
    'the counter describes the textarea',
  );

  fireEvent.keyDown(textarea(container), { key: 'Enter' });
  fireEvent.click(submitBtn(container));
  assert.equal(submits, 0, 'an over-limit draft is not submitted');
});

for (const [name, props] of GATED_STATES) {
  test(`submit-state-accessible: in the ${name} state the button stays focusable, aria-disabled, described, and inert`, () => {
    let submits = 0;
    const { container } = render(
      <PromptComposer {...props} onChange={() => {}} onSubmit={() => { submits += 1; }} />,
    );
    assert.equal(stateOf(container), name);
    const btn = submitBtn(container);
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
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    assert.ok(UNAVAILABLE_REASONS[name].trim().length > 0, 'reason copy is not empty');
    assert.equal(description, UNAVAILABLE_REASONS[name]);

    // aria-disabled is honest: activating the control does nothing.
    fireEvent.click(btn);
    fireEvent.keyDown(textarea(container), { key: 'Enter' });
    assert.equal(submits, 0);
  });
}

test('submit-state-accessible: in the composing state the button is available with no unavailable-reason', () => {
  let submits = 0;
  const { container } = render(
    <PromptComposer value="hello" onChange={() => {}} onSubmit={() => { submits += 1; }} />,
  );
  assert.equal(stateOf(container), 'composing');
  assert.equal(submitBtn(container).getAttribute('aria-disabled'), 'false');
  assert.equal(reasonEl(container).textContent, '');
  fireEvent.click(submitBtn(container));
  assert.equal(submits, 1);
});

test('shortcut-discoverable: the hint is rendered as text and describes the textarea', () => {
  const { container } = render(
    <PromptComposer
      value=""
      onChange={() => {}}
      onSubmit={() => {}}
      hint="Enter to send. Shift+Enter for a new line."
    />,
  );
  const hint = container.querySelector<HTMLElement>('.prompt-composer__hint')!;
  assert.equal(hint.textContent, 'Enter to send. Shift+Enter for a new line.');
  assert.ok(!hint.closest('[hidden]'));
  assert.ok(textarea(container).getAttribute('aria-describedby')!.split(' ').includes(hint.id));
});

test('submit-state-accessible: button uses aria-disabled, not native disabled', () => {
  // empty state: aria-disabled true
  const { container, rerender } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} />,
  );
  const btn = submitBtn(container);
  assert.equal(btn.getAttribute('aria-disabled'), 'true', 'aria-disabled true when empty');
  assert.equal(btn.disabled, false, 'never natively disabled');

  // composing state: aria-disabled false
  rerender(<PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} />);
  assert.equal(submitBtn(container).getAttribute('aria-disabled'), 'false', 'aria-disabled false when composing');
});

test('submit-state-accessible: button has aria-describedby pointing to reason text', () => {
  const { container } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} />,
  );
  const btn = submitBtn(container);
  const describedBy = btn.getAttribute('aria-describedby');
  assert.ok(describedBy, 'aria-describedby present');
  const reason = container.querySelector(`#${describedBy.split(' ').at(-1)}`);
  assert.ok(reason, 'aria-describedby target exists');
  assert.match(reason!.textContent!, new RegExp(UNAVAILABLE_REASONS.empty));
});

test('submit-state-accessible: reason text updates per state', () => {
  const { container, rerender } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} />,
  );
  assert.match(reasonEl(container).textContent!, new RegExp(UNAVAILABLE_REASONS.empty));

  rerender(<PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} busy />);
  assert.match(reasonEl(container).textContent!, new RegExp(UNAVAILABLE_REASONS.busy));
});

test('axe: no WCAG A/AA violations in empty, composing, over-limit, and busy states', async () => {
  // maxLength is set throughout so the polite length region is in the DOM under axe.
  const cases = [
    ['empty', { value: '' }],
    ['composing', { value: 'hello' }],
    ['over-limit', { value: OVER }],
    ['busy', { value: 'hello', busy: true }],
  ] as const;
  for (const [name, props] of cases) {
    const { container, unmount } = render(
      <PromptComposer {...props} maxLength={LIMIT} onChange={() => {}} onSubmit={() => {}} />,
    );
    assert.equal(stateOf(container), name);
    const result = await axe.run(container, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${name}: axe violations`);
    unmount();
  }
});
