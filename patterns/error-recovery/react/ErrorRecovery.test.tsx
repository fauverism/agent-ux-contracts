import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import { ErrorRecovery, FAILURE_COPY } from './ErrorRecovery';
import type { FailureInfo } from './ErrorRecovery';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const inputEl = (c: HTMLElement) =>
  c.querySelector<HTMLTextAreaElement>('.error-recovery__input')!;
const alertEl = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="alert"]')!;
const retryBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.error-recovery__retry');

const networkFailure: FailureInfo = { kind: 'network' };
const refusalFailure: FailureInfo = { kind: 'refusal' };

test('input-preserved: textarea is always rendered regardless of failure state', () => {
  const { container, rerender } = render(
    <ErrorRecovery failure={null} input="my prompt" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.ok(inputEl(container), 'textarea present when idle');

  rerender(
    <ErrorRecovery failure={networkFailure} input="my prompt" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.ok(inputEl(container), 'textarea present when errored');
});

test('input-preserved: input value is retained across failure prop change', () => {
  const { container, rerender } = render(
    <ErrorRecovery failure={null} input="my draft" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.equal(inputEl(container).value, 'my draft');

  rerender(
    <ErrorRecovery failure={networkFailure} input="my draft" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.equal(inputEl(container).value, 'my draft', 'draft preserved after failure');
});

test('input-preserved: textarea is never disabled or readOnly', () => {
  const { container, rerender } = render(
    <ErrorRecovery failure={networkFailure} input="prompt" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.equal(inputEl(container).disabled, false);
  assert.equal(inputEl(container).readOnly, false);
});

test('error-announced: alert role present on summary element', () => {
  const { container } = render(
    <ErrorRecovery failure={networkFailure} input="" onInputChange={() => {}} onRetry={() => {}} />,
  );
  const alert = alertEl(container);
  assert.ok(alert, 'role="alert" element present');
  assert.equal(alert.getAttribute('role'), 'alert');
  assert.match(alert.textContent!, new RegExp(FAILURE_COPY.network.summary.slice(0, 15)));
});

test('error-announced: alert is present in the DOM even when idle (empty text)', () => {
  const { container } = render(
    <ErrorRecovery failure={null} input="" onInputChange={() => {}} onRetry={() => {}} />,
  );
  // The alert region always exists, just empty
  assert.ok(alertEl(container), 'alert region in DOM when idle');
  assert.equal(alertEl(container).textContent, '', 'empty when no failure');
});

test('actionable-error: retry button present for each failure kind with correct label', () => {
  for (const [kind, copy] of Object.entries(FAILURE_COPY)) {
    const { container, unmount } = render(
      <ErrorRecovery
        failure={{ kind: kind as any }}
        input=""
        onInputChange={() => {}}
        onRetry={() => {}}
      />,
    );
    const btn = retryBtn(container);
    assert.ok(btn, `retry button present for kind=${kind}`);
    assert.equal(btn!.textContent, copy.action, `label matches copy for kind=${kind}`);
    unmount();
  }
});

test('actionable-error: refusal kind uses "Edit and resend" label', () => {
  const { container } = render(
    <ErrorRecovery failure={refusalFailure} input="" onInputChange={() => {}} onRetry={() => {}} />,
  );
  assert.equal(retryBtn(container)!.textContent, 'Edit and resend');
});

test('retry-single-flight: onRetry not called while in-flight', async () => {
  let calls = 0;
  let resolve!: () => void;
  const slowRetry = () =>
    new Promise<void>((res) => {
      resolve = res;
    });

  const { container } = render(
    <ErrorRecovery
      failure={networkFailure}
      input=""
      onInputChange={() => {}}
      onRetry={() => { calls += 1; return slowRetry(); }}
    />,
  );

  await act(async () => { fireEvent.click(retryBtn(container)!); });
  // While in-flight, click again
  fireEvent.click(retryBtn(container)!);
  assert.equal(calls, 1, 'second click ignored while in-flight');

  await act(async () => { resolve(); });
});

test('retry-single-flight: retry button has aria-disabled and aria-busy while retrying', async () => {
  let resolve!: () => void;
  const slowRetry = () => new Promise<void>((res) => { resolve = res; });
  const { container } = render(
    <ErrorRecovery failure={networkFailure} input="" onInputChange={() => {}} onRetry={slowRetry} />,
  );

  await act(async () => { fireEvent.click(retryBtn(container)!); });
  assert.equal(retryBtn(container)!.getAttribute('aria-disabled'), 'true');
  assert.equal(retryBtn(container)!.getAttribute('aria-busy'), 'true');

  await act(async () => { resolve(); });
});

test('partialOutput: partial output rendered above the failure summary', () => {
  const { container } = render(
    <ErrorRecovery
      failure={networkFailure}
      input=""
      onInputChange={() => {}}
      onRetry={() => {}}
      partialOutput="Partial answer so far…"
    />,
  );
  const partial = container.querySelector('.error-recovery__partial');
  assert.ok(partial, 'partial output rendered');
  assert.match(partial!.textContent!, /Partial answer/);
});

test('axe: no WCAG A/AA violations in idle and errored states', async () => {
  const { container, rerender } = render(
    <ErrorRecovery failure={null} input="my prompt" onInputChange={() => {}} onRetry={() => {}} />,
  );
  const idleResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(idleResult.violations, [], idleResult.violations.map((v) => v.id).join(', '));

  rerender(
    <ErrorRecovery failure={networkFailure} input="my prompt" onInputChange={() => {}} onRetry={() => {}} />,
  );
  const erroredResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(erroredResult.violations, [], erroredResult.violations.map((v) => v.id).join(', '));
});
