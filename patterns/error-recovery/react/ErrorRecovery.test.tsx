import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
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

const stateOf = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.error-recovery')!.dataset.state;
const detailToggle = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.error-recovery__detail-toggle');
const detailEl = (c: HTMLElement) => c.querySelector<HTMLElement>('.error-recovery__detail');

/** A host that owns the draft, as a real one does. */
function Host({
  failure,
  onRetry = () => {},
  initial = 'my draft',
}: {
  failure: FailureInfo | null;
  onRetry?: () => void | Promise<void>;
  initial?: string;
}) {
  const [input, setInput] = useState(initial);
  return (
    <ErrorRecovery failure={failure} input={input} onInputChange={setInput} onRetry={onRetry} />
  );
}

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

test('input-preserved: edits made after a failure and during a retry are kept', async () => {
  let finishRetry!: () => void;
  const onRetry = () => new Promise<void>((resolve) => { finishRetry = resolve; });
  const { container, rerender } = render(<Host failure={null} onRetry={onRetry} />);

  // The failure arrives: the draft is still there and can be edited.
  rerender(<Host failure={networkFailure} onRetry={onRetry} />);
  assert.equal(stateOf(container), 'errored');
  assert.equal(inputEl(container).value, 'my draft', 'draft survives the failure');
  fireEvent.change(inputEl(container), { target: { value: 'my draft, reworded' } });
  assert.equal(inputEl(container).value, 'my draft, reworded', 'editable after the failure');

  // While the retry is in flight the input stays editable too.
  await act(async () => { fireEvent.click(retryBtn(container)!); });
  assert.equal(stateOf(container), 'retrying');
  assert.equal(inputEl(container).disabled, false);
  assert.equal(inputEl(container).readOnly, false);
  fireEvent.change(inputEl(container), { target: { value: 'edited mid-retry' } });
  assert.equal(inputEl(container).value, 'edited mid-retry', 'editable while retrying');

  // The retry fails again with a different error: still nothing lost.
  await act(async () => { finishRetry(); });
  rerender(<Host failure={{ kind: 'timeout' }} onRetry={onRetry} />);
  assert.equal(stateOf(container), 'errored');
  assert.equal(inputEl(container).value, 'edited mid-retry', 'draft survives a second failure');
});

test('plain-language-summary: the summary is the plain-language copy; raw codes stay in the detail region', () => {
  const raw = { message: 'ECONNRESET 0x1F at fetch (node:internal)', detail: 'request_id=req_abc123' };
  for (const [kind, copy] of Object.entries(FAILURE_COPY)) {
    const { container, unmount } = render(
      <ErrorRecovery
        failure={{ kind: kind as FailureInfo['kind'], ...raw }}
        input=""
        onInputChange={() => {}}
        onRetry={() => {}}
      />,
    );
    const summary = alertEl(container).textContent!;
    assert.equal(summary, copy.summary, `${kind}: summary is the taxonomy copy, verbatim`);
    assert.ok(!summary.includes(raw.message), `${kind}: raw message not in the summary`);
    assert.ok(!summary.includes(raw.detail), `${kind}: technical detail not in the summary`);

    // Raw text lives only in the detail region, collapsed until asked for.
    const detail = detailEl(container)!;
    assert.equal(detail.hidden, true, `${kind}: detail collapsed by default`);
    assert.ok(detail.textContent!.includes(raw.message));
    assert.ok(detail.textContent!.includes(raw.detail));
    const outsideDetail = container.textContent!.replace(detail.textContent!, '');
    assert.ok(!outsideDetail.includes(raw.message), `${kind}: raw message nowhere else`);
    assert.ok(!outsideDetail.includes(raw.detail), `${kind}: technical detail nowhere else`);
    unmount();
  }
});

test('plain-language-summary: the technical detail is reachable through a disclosure', () => {
  const { container } = render(
    <ErrorRecovery
      failure={{ kind: 'unknown', message: 'HTTP 500' }}
      input=""
      onInputChange={() => {}}
      onRetry={() => {}}
    />,
  );
  const toggle = detailToggle(container)!;
  assert.equal(toggle.tagName, 'BUTTON');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-controls'), detailEl(container)!.id);
  fireEvent.click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detailEl(container)!.hidden, false);
  assert.match(detailEl(container)!.textContent!, /HTTP 500/);
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

const expectNoViolations = async (container: HTMLElement, label: string) => {
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};

test('axe: no WCAG A/AA violations in idle, errored, retrying, and recovered states', async () => {
  let finishRetry!: () => void;
  const onRetry = () => new Promise<void>((resolve) => { finishRetry = resolve; });
  const failure: FailureInfo = { kind: 'network', message: 'ECONNRESET', detail: 'req_abc123' };
  const { container, rerender } = render(<Host failure={null} onRetry={onRetry} />);
  assert.equal(stateOf(container), 'idle');
  await expectNoViolations(container, 'idle');

  rerender(<Host failure={failure} onRetry={onRetry} />);
  assert.equal(stateOf(container), 'errored');
  await expectNoViolations(container, 'errored');

  // Errored with the technical detail expanded.
  fireEvent.click(detailToggle(container)!);
  assert.equal(detailEl(container)!.hidden, false);
  await expectNoViolations(container, 'errored (detail expanded)');

  await act(async () => { fireEvent.click(retryBtn(container)!); });
  assert.equal(stateOf(container), 'retrying');
  await expectNoViolations(container, 'retrying');

  // Recovered: the retry succeeded and the host cleared the failure.
  await act(async () => { finishRetry(); });
  rerender(<Host failure={null} onRetry={onRetry} />);
  assert.equal(stateOf(container), 'idle');
  assert.equal(alertEl(container).textContent, '');
  assert.equal(inputEl(container).value, 'my draft', 'the preserved input remains');
  await expectNoViolations(container, 'recovered');
});
