import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(approvals, 0);
});

test('explicit-consent: approve click fires onApprove exactly once', async () => {
  let approvals = 0;
  const gate = mounted({ onApprove: async () => { approvals += 1; } });
  approveBtn().click();
  // wait for the async approval
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(approvals, 1);
});

test('explicit-consent: second approve call while executing is a no-op', async () => {
  let approvals = 0;
  const gate = mounted({ onApprove: async () => { approvals += 1; } });
  await gate.approve();
  await gate.approve(); // status is now completed, guard applies
  assert.equal(approvals, 1, 'only one approval');
});

test('accurate-preview: onApprove receives exactly the payload rendered in the detail region', async () => {
  let executed;
  const gate = mounted({ onApprove: (payload) => { executed = payload; } });
  const rendered = host.querySelector('pre.approval-gate__detail').textContent;
  await gate.approve();
  assert.equal(executed, rendered, 'executed payload is byte-identical to the previewed one');
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

test('irreversible-labeled: "Cannot be undone" rendered when irreversible=true', () => {
  mounted({ irreversible: true });
  const warn = host.querySelector('.approval-gate__irreversible');
  assert.ok(warn, 'irreversible element present');
  assert.match(warn.textContent, /Cannot be undone/);
});

test('irreversible-labeled: warning absent without irreversible option', () => {
  mounted();
  assert.equal(host.querySelector('.approval-gate__irreversible'), null);
});

test('gate-announced: status region announces proposed on mount', () => {
  mounted();
  const live = statusEl();
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.match(live.textContent, new RegExp(GATE_ANNOUNCEMENTS.proposed));
});

test('gate-announced: status transitions through executing and completed', async () => {
  const gate = mounted();
  await gate.approve();
  assert.match(statusEl().textContent, new RegExp(GATE_ANNOUNCEMENTS.completed));
  assert.equal(host.querySelector('.approval-gate').dataset.status, 'completed');
});

test('gate-announced: reject sets status to rejected', () => {
  const gate = mounted();
  gate.reject();
  assert.match(statusEl().textContent, new RegExp(GATE_ANNOUNCEMENTS.rejected));
  assert.equal(host.querySelector('.approval-gate').dataset.status, 'rejected');
});

test('escape-rejects: Escape keydown on the gate triggers reject', () => {
  let rejected = false;
  mounted({ onReject: () => { rejected = true; } });
  host.querySelector('.approval-gate').dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  assert.equal(rejected, true);
  assert.equal(decisionsEl().hidden, true, 'decisions hidden after reject');
});

test('gate-announced: failed approval announces failure', async () => {
  const gate = mounted({ onApprove: async () => { throw new Error('network error'); } });
  await gate.approve();
  assert.match(statusEl().textContent, new RegExp(GATE_ANNOUNCEMENTS.failed));
  assert.equal(host.querySelector('.approval-gate').dataset.status, 'failed');
});
