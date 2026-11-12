import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
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
const stateOf = () => host.querySelector('.error-recovery').dataset.state;
const detailToggle = () => host.querySelector('.error-recovery__detail-toggle');
const detailEl = () => host.querySelector('.error-recovery__detail');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
/** Simulates the user typing: sets the value and fires the DOM input event. */
const type = (value) => {
  inputEl().value = value;
  // window.Event: the global Event in node:test is Node's, which jsdom rejects.
  inputEl().dispatchEvent(new window.Event('input', { bubbles: true }));
};

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};
const expectNoViolations = async (label) => {
  const result = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};

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

test('input-preserved: edits made after a failure and during a retry are kept', async () => {
  let finishRetry;
  const er = mounted({
    input: 'my draft',
    onRetry: () => new Promise((resolve) => { finishRetry = resolve; }),
  });
  const original = inputEl();

  // The failure arrives: the draft is still there and can be edited.
  er.showFailure({ kind: 'network' });
  assert.equal(stateOf(), 'errored');
  assert.equal(er.getInput(), 'my draft', 'draft survives the failure');
  type('my draft, reworded');
  assert.equal(er.getInput(), 'my draft, reworded', 'editable after the failure');

  // While the retry is in flight the input stays editable too.
  retryBtn().click();
  assert.equal(stateOf(), 'retrying');
  assert.equal(inputEl().disabled, false);
  assert.equal(inputEl().readOnly, false);
  type('edited mid-retry');
  assert.equal(er.getInput(), 'edited mid-retry', 'editable while retrying');

  // The retry fails again with a different error: still nothing lost.
  finishRetry();
  await tick();
  er.showFailure({ kind: 'timeout' });
  assert.equal(stateOf(), 'errored');
  assert.equal(er.getInput(), 'edited mid-retry', 'draft survives a second failure');
  assert.ok(inputEl() === original, 'the same textarea element throughout — never rebuilt');

  er.clearFailure();
  assert.equal(er.getInput(), 'edited mid-retry', 'and survives recovery');
});

test('plain-language-summary: the summary is the plain-language copy; raw codes stay in the detail region', () => {
  const raw = { message: 'ECONNRESET 0x1F at fetch (node:internal)', detail: 'request_id=req_abc123' };
  const er = mounted();
  for (const [kind, copy] of Object.entries(FAILURE_COPY)) {
    er.showFailure({ kind, ...raw });
    const summary = alertEl().textContent;
    assert.equal(summary, copy.summary, `${kind}: summary is the taxonomy copy, verbatim`);
    assert.ok(!summary.includes(raw.message), `${kind}: raw message not in the summary`);
    assert.ok(!summary.includes(raw.detail), `${kind}: technical detail not in the summary`);

    // Raw text lives only in the detail region, collapsed until asked for.
    assert.equal(detailEl().hidden, true, `${kind}: detail collapsed by default`);
    assert.ok(detailEl().textContent.includes(raw.message));
    assert.ok(detailEl().textContent.includes(raw.detail));
    const outsideDetail = host.textContent.replace(detailEl().textContent, '');
    assert.ok(!outsideDetail.includes(raw.message), `${kind}: raw message nowhere else`);
    assert.ok(!outsideDetail.includes(raw.detail), `${kind}: technical detail nowhere else`);
  }
});

test('plain-language-summary: the technical detail is reachable through a disclosure', () => {
  const er = mounted();
  er.showFailure({ kind: 'unknown', message: 'HTTP 500' });
  const toggle = detailToggle();
  assert.equal(toggle.tagName, 'BUTTON');
  assert.equal(toggle.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-controls'), detailEl().id);
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detailEl().hidden, false);
  assert.match(detailEl().textContent, /HTTP 500/);
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

  retryBtn().click(); // first activation — starts flight
  retryBtn().click(); // second activation — should be ignored
  er.retry(); // and so is a programmatic call
  assert.equal(calls, 1, 'repeat activations ignored while in-flight');
  resolve();
  await new Promise((r) => setTimeout(r, 0));
});

test('retry-single-flight: retry button has aria-disabled and aria-busy while retrying', async () => {
  let resolve;
  const slowRetry = () => new Promise((res) => { resolve = res; });
  const er = mounted({ onRetry: slowRetry });
  er.showFailure({ kind: 'network' });

  retryBtn().click();
  assert.equal(retryBtn().disabled, false, 'still focusable: aria-disabled, not native disabled');
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

test('axe: no WCAG A/AA violations in idle, errored, retrying, and recovered states', async () => {
  let finishRetry;
  const er = mounted({
    input: 'my prompt',
    onRetry: () => new Promise((resolve) => { finishRetry = resolve; }),
  });
  assert.equal(stateOf(), 'idle');
  await expectNoViolations('idle');

  er.showFailure({ kind: 'network', message: 'ECONNRESET', detail: 'req_abc123' });
  assert.equal(stateOf(), 'errored');
  await expectNoViolations('errored');

  // Errored with the technical detail expanded.
  detailToggle().click();
  assert.equal(detailEl().hidden, false);
  await expectNoViolations('errored (detail expanded)');

  retryBtn().click();
  assert.equal(stateOf(), 'retrying');
  await expectNoViolations('retrying');

  // Recovered: the retry succeeded and the host cleared the failure.
  finishRetry();
  await tick();
  er.clearFailure();
  assert.equal(stateOf(), 'idle');
  assert.equal(alertEl().textContent, '');
  assert.equal(er.getInput(), 'my prompt', 'the preserved input remains');
  await expectNoViolations('recovered');
});
