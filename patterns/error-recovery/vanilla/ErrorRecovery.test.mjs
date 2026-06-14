import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorRecovery, FAILURE_COPY } from './ErrorRecovery.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options = {}) => {
  const er = new ErrorRecovery({ onRetry: async () => {}, ...options });
  er.mount(host);
  return er;
};

const inputEl = () => host.querySelector('.error-recovery__input');
const alertEl = () => host.querySelector('[role="alert"]');
const retryBtn = () => host.querySelector('.error-recovery__retry');
const actionsEl = () => host.querySelector('.error-recovery__actions');

test('input-preserved: textarea is present after mount and after showFailure', () => {
  const er = mounted({ input: 'my prompt' });
  assert.ok(inputEl(), 'textarea present at idle');
  er.showFailure({ kind: 'network' });
  assert.ok(inputEl(), 'textarea present after failure');
});

test('input-preserved: textarea value survives showFailure', () => {
  const er = mounted({ input: 'original draft' });
  er.showFailure({ kind: 'timeout' });
  assert.equal(inputEl().value, 'original draft', 'draft intact after failure');
});

test('input-preserved: textarea is never disabled or readOnly', () => {
  const er = mounted({ input: 'prompt' });
  er.showFailure({ kind: 'network' });
  assert.equal(inputEl().disabled, false);
  assert.equal(inputEl().readOnly, false);
});

test('error-announced: alert role element present', () => {
  const er = mounted();
  assert.ok(alertEl(), 'role="alert" element present');
  er.showFailure({ kind: 'network' });
  assert.match(alertEl().textContent, new RegExp(FAILURE_COPY.network.summary.slice(0, 15)));
});

test('actionable-error: retry button text matches FAILURE_COPY per kind', () => {
  for (const [kind, copy] of Object.entries(FAILURE_COPY)) {
    const container = document.createElement('div');
    document.body.append(container);
    try {
      const er = new ErrorRecovery({ onRetry: async () => {} });
      er.mount(container);
      er.showFailure({ kind });
      const btn = container.querySelector('.error-recovery__retry');
      assert.ok(btn, `retry button present for kind=${kind}`);
      assert.equal(btn.textContent, copy.action, `label matches for kind=${kind}`);
    } finally {
      container.remove();
    }
  }
});

test('actionable-error: refusal kind uses "Edit and resend"', () => {
  const er = mounted();
  er.showFailure({ kind: 'refusal' });
  assert.equal(retryBtn().textContent, 'Edit and resend');
});

test('actionable-error: actions hidden at idle, shown after showFailure', () => {
  const er = mounted();
  assert.equal(actionsEl().hidden, true, 'actions hidden at idle');
  er.showFailure({ kind: 'network' });
  assert.equal(actionsEl().hidden, false, 'actions shown after failure');
});

test('retry-single-flight: second retry call while in-flight is a no-op', async () => {
  let calls = 0;
  let resolve;
  const slowRetry = () =>
    new Promise((res) => {
      resolve = res;
    });
  const er = mounted({ onRetry: () => { calls += 1; return slowRetry(); } });
  er.showFailure({ kind: 'network' });

  er.retry(); // first call — starts flight
  er.retry(); // second call — should be ignored
  assert.equal(calls, 1, 'second call ignored while in-flight');
  resolve();
  await new Promise((r) => setTimeout(r, 0));
});

test('retry-single-flight: retry button has aria-disabled and aria-busy while retrying', async () => {
  let resolve;
  const slowRetry = () => new Promise((res) => { resolve = res; });
  const er = mounted({ onRetry: slowRetry });
  er.showFailure({ kind: 'network' });

  er.retry();
  assert.equal(retryBtn().getAttribute('aria-disabled'), 'true');
  assert.equal(retryBtn().getAttribute('aria-busy'), 'true');
  assert.equal(host.querySelector('.error-recovery').dataset.state, 'retrying');

  resolve();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(retryBtn().getAttribute('aria-disabled'), null, 'aria-disabled cleared after retry');
});

test('clearFailure: hides actions and clears alert text', () => {
  const er = mounted();
  er.showFailure({ kind: 'timeout' });
  assert.equal(actionsEl().hidden, false);
  er.clearFailure();
  assert.equal(actionsEl().hidden, true, 'actions hidden after clear');
  assert.equal(alertEl().textContent, '', 'alert text cleared');
});

test('getInput: returns current textarea value including edits', () => {
  const er = mounted({ input: 'original' });
  inputEl().value = 'edited prompt';
  assert.equal(er.getInput(), 'edited prompt');
});
