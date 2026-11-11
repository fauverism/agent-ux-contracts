import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { ApprovalGate, GATE_ANNOUNCEMENTS } from './ApprovalGate.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const defaultOptions = {
  summary: 'Delete 14 records from the orders table',
  payload: 'DELETE FROM orders WHERE status = "draft"',
  onApprove: async () => {},
};

const mounted = (options = {}) => {
  const gate = new ApprovalGate({ ...defaultOptions, ...options });
  gate.mount(host);
  return gate;
};

const approveBtn = () => host.querySelector('.approval-gate__approve');
const rejectBtn = () => host.querySelector('.approval-gate__reject');
const statusEl = () => host.querySelector('[role="status"]');
const decisionsEl = () => host.querySelector('.approval-gate__decisions');
const gateEl = () => host.querySelector('.approval-gate');
const summaryEl = () => host.querySelector('.approval-gate__summary');
const detailToggle = () => host.querySelector('.approval-gate__detail-toggle');
const detailEl = () => host.querySelector('pre.approval-gate__detail');
/** Lets the async approve path settle. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};
const expectNoViolations = async (label) => {
  const result = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};

test('no-preselected-approve: reject button appears before approve in DOM order', () => {
  mounted();
  const reject = rejectBtn();
  const approve = approveBtn();
  assert.ok(reject && approve, 'both buttons present');
  const pos = reject.compareDocumentPosition(approve);
  assert.ok(pos & Node.DOCUMENT_POSITION_FOLLOWING, 'reject before approve in DOM');
});

test('no-preselected-approve: neither button is auto-focused on mount', () => {
  mounted();
  assert.notEqual(document.activeElement, approveBtn());
  assert.notEqual(document.activeElement, rejectBtn());
});

test('explicit-consent: reject click does not fire onApprove', async () => {
  let approvals = 0;
  mounted({ onApprove: async () => { approvals += 1; } });
  rejectBtn().click();
  await tick();
  assert.equal(approvals, 0);
  assert.equal(gateEl().dataset.status, 'rejected');
});

test('explicit-consent: approve click fires onApprove exactly once', async () => {
  let approvals = 0;
  mounted({ onApprove: async () => { approvals += 1; } });
  approveBtn().click();
  await tick();
  assert.equal(approvals, 1);
});

test('explicit-consent: timers, focus, scroll, stray keys, and the detail toggle never approve', () => {
  let approvals = 0;
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    mounted({ onApprove: async () => { approvals += 1; } });
    const gate = gateEl();
    // A full day passes with the gate untouched.
    mock.timers.tick(24 * 60 * 60 * 1000);
    // Focus reaching the approve control is not activation.
    approveBtn().focus();
    gate.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    window.dispatchEvent(new window.Event('scroll'));
    gate.dispatchEvent(new window.Event('scroll', { bubbles: true }));
    // No gate-level Enter/Space shortcut.
    gate.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    gate.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    // Inspecting the payload is not consent.
    detailToggle().click();
    summaryEl().click();
    assert.equal(approvals, 0, 'nothing but the approve control approves');
    assert.equal(gate.dataset.status, 'proposed', 'gate still pending');
  } finally {
    mock.timers.reset();
  }
});

test('explicit-consent: Escape rejects and never approves', async () => {
  let approvals = 0;
  mounted({ onApprove: async () => { approvals += 1; } });
  gateEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.equal(approvals, 0);
  assert.equal(gateEl().dataset.status, 'rejected');
});

test('explicit-consent: a second approve activation while executing is a no-op', async () => {
  let approvals = 0;
  mounted({ onApprove: () => { approvals += 1; return new Promise(() => {}); } });
  approveBtn().click();
  approveBtn().click();
  await tick();
  assert.equal(approvals, 1, 'only one approval while the first is in flight');
  assert.equal(gateEl().dataset.status, 'executing');
  assert.equal(decisionsEl().hidden, true, 'decision controls hidden while executing');
});

test('accurate-preview: onApprove receives exactly the payload rendered in the detail region', async () => {
  let executed;
  mounted({ onApprove: (payload) => { executed = payload; } });
  const rendered = detailEl().textContent;
  approveBtn().click();
  await tick();
  assert.equal(executed, rendered, 'executed payload is byte-identical to the previewed one');
});

test('accurate-preview: whitespace and markup in the payload reach onApprove byte-identical', async () => {
  const payload = '  <b>rm -rf</b>\n&amp; "quoted"\ttab  ';
  let executed;
  mounted({ payload, onApprove: (p) => { executed = p; } });
  assert.equal(detailEl().textContent, payload, 'preview is the literal payload');
  assert.equal(detailEl().children.length, 0, 'payload rendered as text, not markup');
  approveBtn().click();
  await tick();
  assert.equal(executed, payload);
});

test('accurate-preview: mutating options after mount cannot make execution diverge from the preview', async () => {
  let executed;
  const gate = mounted({ onApprove: (p) => { executed = p; } });
  // The preview was rendered at mount; a later mutation must not change what runs.
  gate.options.payload = 'DROP TABLE orders';
  approveBtn().click();
  await tick();
  assert.equal(executed, detailEl().textContent, 'executed === previewed');
  assert.equal(executed, defaultOptions.payload);
});

test('accurate-preview: summary and consequence render in the visible action summary', () => {
  mounted({ consequence: 'Affects 14 records.' });
  const summary = summaryEl();
  assert.ok(summary.textContent.startsWith(defaultOptions.summary), 'summary text leads');
  const consequence = summary.querySelector('.approval-gate__consequence');
  assert.ok(consequence, 'consequence rendered inside the summary');
  assert.match(consequence.textContent, /Affects 14 records\./);
  assert.ok(!summary.closest('[hidden]'), 'summary is not hidden');
});

test('accurate-preview: payload is in a <pre> element', () => {
  mounted();
  const pre = host.querySelector('pre.approval-gate__detail');
  assert.ok(pre, 'pre element present');
  assert.equal(pre.textContent, defaultOptions.payload);
});

test('accurate-preview: detail toggle shows and hides payload', () => {
  mounted();
  const toggle = host.querySelector('.approval-gate__detail-toggle');
  const pre = host.querySelector('pre.approval-gate__detail');
  assert.equal(pre.hidden, true, 'hidden by default');

  toggle.click();
  assert.equal(pre.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');

  toggle.click();
  assert.equal(pre.hidden, true);
});

test('irreversible-labeled: "Cannot be undone" renders inside the action summary when irreversible=true', () => {
  mounted({ irreversible: true });
  const warn = summaryEl().querySelector('.approval-gate__irreversible');
  assert.ok(warn, 'irreversible label is within the summary, not elsewhere in the gate');
  assert.match(warn.textContent, /Cannot be undone/);
  assert.ok(!warn.closest('[hidden]'), 'label is not hidden');
  assert.ok(!warn.closest('[aria-hidden="true"]'), 'label is exposed to assistive technology');
});

test('irreversible-labeled: warning absent without irreversible option', () => {
  mounted();
  assert.equal(host.querySelector('.approval-gate__irreversible'), null);
});

test('gate-announced: status region announces proposed with the summary on mount', () => {
  mounted();
  const live = statusEl();
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.equal(live.textContent, `${GATE_ANNOUNCEMENTS.proposed}: ${defaultOptions.summary}`);
});

test('gate-announced: status transitions through executing and completed', async () => {
  let finish;
  mounted({ onApprove: () => new Promise((resolve) => { finish = resolve; }) });
  approveBtn().click();
  assert.equal(statusEl().textContent, GATE_ANNOUNCEMENTS.executing);
  assert.equal(gateEl().dataset.status, 'executing');
  finish();
  await tick();
  assert.equal(statusEl().textContent, GATE_ANNOUNCEMENTS.completed);
  assert.equal(gateEl().dataset.status, 'completed');
});

test('gate-announced: reject sets status to rejected', () => {
  mounted();
  rejectBtn().click();
  assert.equal(statusEl().textContent, GATE_ANNOUNCEMENTS.rejected);
  assert.equal(gateEl().dataset.status, 'rejected');
});

test('gate-announced: failed approval announces failure', async () => {
  mounted({ onApprove: async () => { throw new Error('network error'); } });
  approveBtn().click();
  await tick();
  assert.equal(statusEl().textContent, GATE_ANNOUNCEMENTS.failed);
  assert.equal(gateEl().dataset.status, 'failed');
});

test('controls-accessible: approve and reject are native, focusable buttons with distinguishing names', () => {
  mounted();
  const approve = approveBtn();
  const reject = rejectBtn();
  for (const control of [approve, reject]) {
    // Native <button type="button">: Enter/Space activation and Tab reach
    // come from the platform, not from handlers that could be removed.
    assert.equal(control.tagName, 'BUTTON');
    assert.equal(control.type, 'button');
    assert.equal(control.disabled, false);
    assert.equal(control.getAttribute('aria-disabled'), null);
    assert.ok(control.tabIndex >= 0, 'in the tab order');
    assert.ok(!control.closest('[hidden]') && !control.closest('[aria-hidden="true"]'));
    control.focus();
    assert.ok(document.activeElement === control, 'focusable');
  }
  const approveName = approve.getAttribute('aria-label') ?? approve.textContent.trim();
  const rejectName = reject.getAttribute('aria-label') ?? reject.textContent.trim();
  assert.equal(approveName, `Approve: ${defaultOptions.summary}`, 'approve names the action');
  assert.equal(rejectName, 'Reject');
  assert.notEqual(approveName, rejectName, 'names distinguish approval from rejection');
});

test('controls-accessible: gate has group role with aria-label', () => {
  mounted();
  assert.equal(gateEl().getAttribute('role'), 'group');
  assert.equal(gateEl().getAttribute('aria-label'), `Approval required: ${defaultOptions.summary}`);
});

test('keyboard: Escape keydown inside the gate triggers reject', () => {
  let rejected = false;
  mounted({ onReject: () => { rejected = true; } });
  // Dispatched on a focused descendant; reaches the gate by bubbling.
  rejectBtn().focus();
  rejectBtn().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(rejected, true);
  assert.equal(decisionsEl().hidden, true, 'decisions hidden after reject');
});

test('axe: no WCAG A/AA violations in proposed state', async () => {
  mounted();
  await expectNoViolations('proposed');
});

test('axe: no WCAG A/AA violations in proposed state with irreversible label, consequence, and detail expanded', async () => {
  mounted({ irreversible: true, consequence: 'Affects 14 records.' });
  detailToggle().click();
  assert.equal(detailEl().hidden, false);
  await expectNoViolations('proposed (expanded)');
});

test('axe: no WCAG A/AA violations in executing, completed, failed, and rejected states', async () => {
  const cases = [
    ['executing', () => new Promise(() => {}), approveBtn],
    ['completed', async () => {}, approveBtn],
    ['failed', async () => { throw new Error('boom'); }, approveBtn],
    ['rejected', async () => {}, rejectBtn],
  ];
  for (const [status, onApprove, control] of cases) {
    host.textContent = '';
    mounted({ onApprove });
    control().click();
    await tick();
    assert.equal(gateEl().dataset.status, status);
    await expectNoViolations(status);
  }
});
