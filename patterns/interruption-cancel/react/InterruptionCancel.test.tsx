import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { InterruptionCancel, RACE_DISCLOSURE, WORK_ANNOUNCEMENTS } from './InterruptionCancel';

afterEach(() => cleanup());

const phase = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.interruption-cancel')!.dataset.phase;
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const cancelButton = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.interruption-cancel__cancel');
const region = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.interruption-cancel__region')!;

const q = (c: HTMLElement, selector: string) => c.querySelector<HTMLElement>(selector);
const items = (c: HTMLElement, selector: string) =>
  [...c.querySelectorAll(`${selector} li`)].map((li) => li.textContent);

const baseProps = { workLabel: 'drafting 7 emails', running: true, onCancel: () => {} };

test('immediate-acknowledgment: cancel moves to cancel-requested synchronously, before the host settles', () => {
  let cancels = 0;
  const { container } = render(
    <InterruptionCancel {...baseProps} onCancel={() => (cancels += 1)} />,
  );
  fireEvent.click(cancelButton(container)!);

  // Host still reports running: true — the UI must already acknowledge.
  assert.equal(phase(container), 'cancel-requested');
  assert.equal(liveRegion(container).textContent, 'Cancellation requested — stopping.');
  assert.equal(cancels, 1);
  // The acknowledgment is visible too, and distinct from running: the
  // pending indicator replaces the cancel control.
  assert.ok(q(container, '.interruption-cancel__pending'), 'pending indicator shown');
  assert.equal(cancelButton(container), null, 'cancel control gone');
});

test('no-silent-continuation: progress arriving while cancellation is pending never re-enters running', () => {
  const { container, rerender } = render(
    <InterruptionCancel {...baseProps} progress="Step 2 of 7" />,
  );
  fireEvent.click(cancelButton(container)!);
  assert.equal(phase(container), 'cancel-requested');

  // A late tool result lands: progress updates, phase must not reset.
  rerender(<InterruptionCancel {...baseProps} progress="Step 3 of 7" />);
  assert.equal(phase(container), 'cancel-requested');
  assert.equal(q(container, '.interruption-cancel__progress')!.textContent, 'Step 3 of 7');
  assert.equal(cancelButton(container), null, 'the cancel control does not come back');
  assert.ok(q(container, '.interruption-cancel__pending'), 'still shown as cancelling');
});

test('partial-work-honesty: the cancelled summary lists completed and stopped work', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(container)!);
  rerender(
    <InterruptionCancel
      {...baseProps}
      running={false}
      completedWork={['Email to Ana sent', 'Email to Ben sent']}
      stoppedWork={['Email to Cara', 'Email to Dev']}
    />,
  );

  assert.equal(phase(container), 'cancelled');
  // Every item, in the right list: what ran is not reported as stopped, and
  // what was stopped is not reported as done.
  assert.deepEqual(items(container, '.interruption-cancel__done'), [
    'Email to Ana sent',
    'Email to Ben sent',
  ]);
  assert.deepEqual(items(container, '.interruption-cancel__stopped'), [
    'Email to Cara',
    'Email to Dev',
  ]);
  const labels = [...container.querySelectorAll('.interruption-cancel__list-label')].map(
    (el) => el.textContent,
  );
  assert.deepEqual(labels, ['Already done:', 'Stopped before:']);
  const summary = q(container, '.interruption-cancel__summary')!;
  assert.ok(!summary.closest('[hidden]') && !summary.closest('[aria-hidden="true"]'));
});

test('partial-work-honesty: a cancel that stopped everything does not claim completed work', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(container)!);
  rerender(
    <InterruptionCancel {...baseProps} running={false} stoppedWork={['Email to Ana']} />,
  );
  assert.equal(q(container, '.interruption-cancel__done'), null, 'no "already done" list');
  assert.deepEqual(items(container, '.interruption-cancel__stopped'), ['Email to Ana']);
});

test('completion-race-honest: work finishing despite a pending cancel settles to completed with disclosure', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(container)!);
  rerender(<InterruptionCancel {...baseProps} running={false} outcome="completed" />);

  assert.equal(phase(container), 'completed');
  assert.equal(q(container, '.interruption-cancel__race-note')!.textContent, RACE_DISCLOSURE);
  assert.match(
    q(container, '.interruption-cancel__outcome')!.textContent!,
    /^Completed:/,
    'not reported as cancelled',
  );
  // The disclosure reaches assistive technology, not only sighted users.
  assert.equal(
    liveRegion(container).textContent,
    `${WORK_ANNOUNCEMENTS.completed} ${RACE_DISCLOSURE}`,
  );
});

test('completion-race-honest: an ordinary completion carries no race disclosure', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  rerender(<InterruptionCancel {...baseProps} running={false} />);

  assert.equal(phase(container), 'completed');
  assert.equal(q(container, '.interruption-cancel__race-note'), null);
  assert.equal(liveRegion(container).textContent, WORK_ANNOUNCEMENTS.completed);
});

test('cancel-not-gated: one activation, one callback, no dialog; repeat activations are no-ops', () => {
  let cancels = 0;
  const { container } = render(
    <InterruptionCancel {...baseProps} onCancel={() => (cancels += 1)} />,
  );
  const btn = cancelButton(container)!;
  fireEvent.click(btn);
  assert.equal(cancels, 1, 'the first activation cancels; nothing asks "are you sure?"');
  assert.equal(document.querySelector('dialog, [role="dialog"], [role="alertdialog"]'), null);
  fireEvent.click(btn);
  assert.equal(cancels, 1);
});

test('cancel-control-accessible: the cancel control is a native, focusable button named for the work', () => {
  const { container } = render(<InterruptionCancel {...baseProps} />);
  const btn = cancelButton(container)!;
  // Native <button type="button">: Enter/Space activation and Tab reach come
  // from the platform, not from handlers that could be removed.
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.type, 'button');
  assert.equal(btn.disabled, false);
  assert.equal(btn.getAttribute('aria-disabled'), null);
  assert.ok(btn.tabIndex >= 0, 'in the tab order');
  assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
  btn.focus();
  assert.ok(document.activeElement === btn, 'focusable');
  assert.equal(btn.getAttribute('aria-label'), 'Cancel: drafting 7 emails');
});

test('cancellation-announced: live region announces the acknowledgment and the settled outcome', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  const lr = liveRegion(container);
  assert.equal(lr.getAttribute('aria-live'), 'polite');
  assert.equal(lr.textContent, '', 'silent while running');

  fireEvent.click(cancelButton(container)!);
  assert.equal(lr.textContent, 'Cancellation requested — stopping.');

  rerender(<InterruptionCancel {...baseProps} running={false} />);
  assert.equal(lr.textContent, 'Work cancelled.');
});

test('focus-not-lost: cancelling while the control has focus moves focus to the work region', () => {
  const { container } = render(<InterruptionCancel {...baseProps} />);
  const btn = cancelButton(container)!;
  btn.focus();
  fireEvent.click(btn);

  assert.equal(cancelButton(container), null, 'control removed at acknowledgment');
  // assert.ok(a === b): assert.equal on DOM nodes builds an enormous diff on failure.
  assert.ok(document.activeElement === region(container));
  assert.ok(document.activeElement !== document.body);
});

test('focus-not-lost: natural completion while the control has focus also recovers focus', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  cancelButton(container)!.focus();
  rerender(<InterruptionCancel {...baseProps} running={false} />);

  assert.ok(document.activeElement === region(container));
});

test('focus-not-lost: focus outside the component is never moved', () => {
  const outside = document.createElement('button');
  document.body.append(outside);
  try {
    const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
    outside.focus();
    fireEvent.click(cancelButton(container)!);
    assert.ok(document.activeElement === outside, 'unchanged at acknowledgment');
    rerender(<InterruptionCancel {...baseProps} running={false} />);
    assert.equal(phase(container), 'cancelled');
    assert.ok(document.activeElement === outside, 'unchanged at settle');
  } finally {
    outside.remove();
  }
});

test('escape-cancels: Escape inside the component requests cancellation', () => {
  let cancels = 0;
  const { container } = render(
    <InterruptionCancel {...baseProps} onCancel={() => (cancels += 1)} />,
  );
  const btn = cancelButton(container)!;
  btn.focus();
  fireEvent.keyDown(btn, { key: 'Escape' });

  assert.equal(cancels, 1);
  assert.equal(phase(container), 'cancel-requested');
});

test('restart: a new run after settle clears the summary and the race flag', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(container)!);
  rerender(<InterruptionCancel {...baseProps} running={false} outcome="completed" />);
  assert.match(container.textContent!, new RegExp(RACE_DISCLOSURE));

  rerender(<InterruptionCancel {...baseProps} running />);
  assert.equal(phase(container), 'running');
  assert.ok(cancelButton(container), 'cancel control back for the new run');
  assert.doesNotMatch(container.textContent!, new RegExp(RACE_DISCLOSURE));

  // The new run completing normally must not inherit the old race disclosure.
  rerender(<InterruptionCancel {...baseProps} running={false} />);
  assert.equal(phase(container), 'completed');
  assert.doesNotMatch(container.textContent!, new RegExp(RACE_DISCLOSURE));
});

test('unmount mid-run does not throw', () => {
  const { unmount } = render(<InterruptionCancel {...baseProps} />);
  assert.doesNotThrow(() => unmount());
});

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('axe: no WCAG A/AA violations while running, pending, and cancelled', async () => {
  const { container, rerender } = render(
    <InterruptionCancel {...baseProps} progress="Step 2 of 7" />,
  );
  let results = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));

  fireEvent.click(cancelButton(container)!);
  results = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));

  rerender(
    <InterruptionCancel {...baseProps} running={false} completedWork={['Email sent']} />,
  );
  results = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));
});

test('axe: no WCAG A/AA violations when completed, with and without the race disclosure', async () => {
  const natural = render(<InterruptionCancel {...baseProps} />);
  natural.rerender(
    <InterruptionCancel {...baseProps} running={false} completedWork={['Email sent']} />,
  );
  assert.equal(phase(natural.container), 'completed');
  let results = await axe.run(natural.container, AXE_OPTIONS);
  assert.deepEqual(results.violations.map((v) => v.id), [], 'completed');
  natural.unmount();

  const raced = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(raced.container)!);
  raced.rerender(<InterruptionCancel {...baseProps} running={false} outcome="completed" />);
  assert.equal(phase(raced.container), 'completed');
  assert.ok(q(raced.container, '.interruption-cancel__race-note'));
  results = await axe.run(raced.container, AXE_OPTIONS);
  assert.deepEqual(results.violations.map((v) => v.id), [], 'completed (raced)');
});
