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

test('typing-never-locked: textarea is never disabled or readOnly while busy', () => {
  const { container } = render(
    <PromptComposer value="draft" onChange={() => {}} onSubmit={() => {}} busy />,
  );
  const ta = textarea(container);
  assert.equal(ta.disabled, false, 'not disabled');
  assert.equal(ta.readOnly, false, 'not readOnly');
});

test('draft-preserved: textarea is never disabled or readOnly in any state', () => {
  // empty state
  const { container, rerender } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} />,
  );
  assert.equal(textarea(container).disabled, false);
  assert.equal(textarea(container).readOnly, false);
  // busy state
  rerender(<PromptComposer value="typing" onChange={() => {}} onSubmit={() => {}} busy />);
  assert.equal(textarea(container).disabled, false);
  assert.equal(textarea(container).readOnly, false);
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

test('axe: no WCAG A/AA violations in empty, composing, and busy states', async () => {
  const { container, rerender } = render(
    <PromptComposer value="" onChange={() => {}} onSubmit={() => {}} />,
  );
  const emptyResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(emptyResult.violations, [], emptyResult.violations.map((v) => v.id).join(', '));

  rerender(<PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} />);
  const composingResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(composingResult.violations, [], composingResult.violations.map((v) => v.id).join(', '));

  rerender(<PromptComposer value="hello" onChange={() => {}} onSubmit={() => {}} busy />);
  const busyResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(busyResult.violations, [], busyResult.violations.map((v) => v.id).join(', '));
});
