import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import { ApprovalGate, GATE_ANNOUNCEMENTS } from './ApprovalGate';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const approveBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.approval-gate__approve');
const rejectBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.approval-gate__reject');
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const decisions = (c: HTMLElement) => c.querySelector('.approval-gate__decisions');
const outcome = (c: HTMLElement) => c.querySelector('.approval-gate__outcome');

const defaultProps = {
  summary: 'Delete 14 records from the orders table',
  payload: 'DELETE FROM orders WHERE status = "draft"',
  onApprove: async () => {},
};

test('no-preselected-approve: reject button appears before approve in DOM order', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const reject = rejectBtn(container)!;
  const approve = approveBtn(container)!;
  assert.ok(reject && approve, 'both buttons present');
  const position = reject.compareDocumentPosition(approve);
  // DOCUMENT_POSITION_FOLLOWING = 4 — approve comes after reject
  assert.ok(position & Node.DOCUMENT_POSITION_FOLLOWING, 'reject before approve in DOM');
});

test('no-preselected-approve: neither button is auto-focused on mount', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const focused = document.activeElement;
  assert.notEqual(focused, approveBtn(container), 'approve not auto-focused');
  assert.notEqual(focused, rejectBtn(container), 'reject not auto-focused');
});

test('explicit-consent: onApprove fires only when approve button is clicked', async () => {
  let approvals = 0;
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={async () => { approvals += 1; }} />,
  );
  // clicking reject must not fire onApprove
  await act(async () => { fireEvent.click(rejectBtn(container)!); });
  assert.equal(approvals, 0, 'no approval after reject');
});

test('explicit-consent: approve button click fires onApprove exactly once', async () => {
  let approvals = 0;
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={async () => { approvals += 1; }} />,
  );
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(approvals, 1);
});


test('accurate-preview: onApprove receives exactly the payload rendered in the detail region', async () => {
  let executed: string | undefined;
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={(payload) => { executed = payload; }} />,
  );
  const rendered = container.querySelector('pre.approval-gate__detail')!.textContent;
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(executed, rendered, 'executed payload is byte-identical to the previewed one');
});

test('accurate-preview: payload is rendered in a <pre> element', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const pre = container.querySelector('pre.approval-gate__detail');
  assert.ok(pre, 'pre element present');
  assert.equal(pre!.textContent, defaultProps.payload);
});

test('accurate-preview: detail toggle shows and hides the payload', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const toggle = container.querySelector<HTMLButtonElement>('.approval-gate__detail-toggle')!;
  const pre = container.querySelector<HTMLElement>('pre.approval-gate__detail')!;
  assert.equal(pre.hidden, true, 'payload hidden by default');

  fireEvent.click(toggle);
  assert.equal(pre.hidden, false, 'payload visible after toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');

  fireEvent.click(toggle);
  assert.equal(pre.hidden, true, 'payload hidden again');
});

test('irreversible-labeled: "Cannot be undone" text present when irreversible=true', () => {
  const { container } = render(<ApprovalGate {...defaultProps} irreversible />);
  const warn = container.querySelector('.approval-gate__irreversible');
  assert.ok(warn, 'irreversible element present');
  assert.match(warn!.textContent!, /Cannot be undone/);
});

test('irreversible-labeled: warning absent when irreversible is false', () => {
  const { container } = render(<ApprovalGate {...defaultProps} irreversible={false} />);
  assert.equal(container.querySelector('.approval-gate__irreversible'), null);
});

test('gate-announced: live region announces arrival after mount', async () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  // The useEffect runs async; wait a tick
  await act(async () => {});
  const live = liveRegion(container);
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.match(live.textContent, new RegExp(GATE_ANNOUNCEMENTS.proposed));
  assert.match(live.textContent, new RegExp(defaultProps.summary.slice(0, 10)));
});

test('gate-announced: live region transitions through executing and completed', async () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  // After approve resolves, status should be completed
  assert.match(liveRegion(container).textContent, new RegExp(GATE_ANNOUNCEMENTS.completed));
});

test('gate-announced: live region shows rejected message on reject', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  fireEvent.click(rejectBtn(container)!);
  assert.match(liveRegion(container).textContent, new RegExp(GATE_ANNOUNCEMENTS.rejected));
});

test('controls-accessible: gate has group role with aria-label', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const gate = container.querySelector('.approval-gate');
  assert.equal(gate!.getAttribute('role'), 'group');
  assert.match(gate!.getAttribute('aria-label')!, /Approval required/);
  assert.match(gate!.getAttribute('aria-label')!, /Delete/);
});

test('escape-rejects: Escape key triggers reject', () => {
  let rejected = false;
  const { container } = render(
    <ApprovalGate {...defaultProps} onReject={() => { rejected = true; }} />,
  );
  fireEvent.keyDown(container.querySelector('.approval-gate')!, { key: 'Escape' });
  assert.equal(rejected, true);
  assert.equal(decisions(container), null, 'decisions hidden after reject');
  assert.ok(outcome(container), 'outcome shown');
});

test('axe: no WCAG A/AA violations in proposed state', async () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  await act(async () => {});
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations, [], result.violations.map((v) => v.id).join(', '));
});
