import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { InterruptionCancel, RACE_DISCLOSURE } from './InterruptionCancel';

afterEach(() => cleanup());

const phase = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.interruption-cancel')!.dataset.phase;
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const cancelButton = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.interruption-cancel__cancel');
const region = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.interruption-cancel__region')!;

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
  assert.match(region(container).textContent!, /Step 3 of 7/);
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
  const text = container.textContent!;
  assert.match(text, /Email to Ana sent/);
  assert.match(text, /Email to Cara/);
  assert.match(text, /Already done:/);
  assert.match(text, /Stopped before:/);
});

test('completion-race-honest: work finishing despite a pending cancel settles to completed with disclosure', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  fireEvent.click(cancelButton(container)!);
  rerender(<InterruptionCancel {...baseProps} running={false} outcome="completed" />);

  assert.equal(phase(container), 'completed');
  assert.match(container.textContent!, new RegExp(RACE_DISCLOSURE));
  assert.equal(liveRegion(container).textContent, 'Work completed.');
});

test('cancel-not-gated: one activation, one callback, no dialog; repeat activations are no-ops', () => {
  let cancels = 0;
  const { container } = render(
    <InterruptionCancel {...baseProps} onCancel={() => (cancels += 1)} />,
  );
  const btn = cancelButton(container)!;
  fireEvent.click(btn);
  fireEvent.click(btn);
  assert.equal(cancels, 1);
});

test('cancel-control-accessible: the accessible name names the work', () => {
  const { container } = render(<InterruptionCancel {...baseProps} />);
  assert.equal(
    cancelButton(container)!.getAttribute('aria-label'),
    'Cancel: drafting 7 emails',
  );
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
  assert.equal(document.activeElement, region(container));
  assert.notEqual(document.activeElement, document.body);
});

test('focus-not-lost: natural completion while the control has focus also recovers focus', () => {
  const { container, rerender } = render(<InterruptionCancel {...baseProps} />);
  cancelButton(container)!.focus();
  rerender(<InterruptionCancel {...baseProps} running={false} />);

  assert.equal(document.activeElement, region(container));
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
