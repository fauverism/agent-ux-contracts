import { test, afterEach, mock } from 'node:test';
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
const gateEl = (c: HTMLElement) => c.querySelector<HTMLElement>('.approval-gate')!;
const summaryEl = (c: HTMLElement) => c.querySelector<HTMLElement>('.approval-gate__summary')!;
const detailToggle = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.approval-gate__detail-toggle')!;
const detailEl = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('pre.approval-gate__detail')!;

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

test('explicit-consent: reject click does not fire onApprove', async () => {
  let approvals = 0;
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={async () => { approvals += 1; }} />,
  );
  await act(async () => { fireEvent.click(rejectBtn(container)!); });
  assert.equal(approvals, 0, 'no approval after reject');
  assert.equal(gateEl(container).dataset.status, 'rejected');
});

test('explicit-consent: timers, focus, scroll, stray keys, and the detail toggle never approve', async () => {
  let approvals = 0;
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const { container } = render(
      <ApprovalGate {...defaultProps} onApprove={async () => { approvals += 1; }} />,
    );
    const gate = gateEl(container);
    await act(async () => {
      // A full day passes with the gate untouched.
      mock.timers.tick(24 * 60 * 60 * 1000);
      // Focus reaching the approve control is not activation.
      approveBtn(container)!.focus();
      fireEvent.focusIn(gate);
      fireEvent.scroll(window);
      fireEvent.scroll(gate);
      // No gate-level Enter/Space shortcut.
      fireEvent.keyDown(gate, { key: 'Enter' });
      fireEvent.keyDown(gate, { key: ' ' });
      // Inspecting the payload is not consent.
      fireEvent.click(detailToggle(container));
      fireEvent.click(summaryEl(container));
    });
    assert.equal(approvals, 0, 'nothing but the approve control approves');
    assert.equal(gate.dataset.status, 'proposed', 'gate still pending');
  } finally {
    mock.timers.reset();
  }
});

test('explicit-consent: Escape rejects and never approves', () => {
  let approvals = 0;
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={async () => { approvals += 1; }} />,
  );
  fireEvent.keyDown(gateEl(container), { key: 'Escape' });
  assert.equal(approvals, 0);
  assert.equal(gateEl(container).dataset.status, 'rejected');
});

test('explicit-consent: once executing, the approve control is gone and cannot fire again', async () => {
  let approvals = 0;
  const { container } = render(
    <ApprovalGate
      {...defaultProps}
      onApprove={() => { approvals += 1; return new Promise<void>(() => {}); }}
    />,
  );
  const approve = approveBtn(container)!;
  await act(async () => { fireEvent.click(approve); });
  assert.equal(gateEl(container).dataset.status, 'executing');
  assert.equal(approveBtn(container), null, 'approve control removed while executing');
  // A second activation of the (now detached) control is a no-op.
  await act(async () => { fireEvent.click(approve); });
  assert.equal(approvals, 1);
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

test('accurate-preview: whitespace and markup in the payload reach onApprove byte-identical', async () => {
  const payload = '  <b>rm -rf</b>\n&amp; "quoted"\ttab  ';
  let executed: string | undefined;
  const { container } = render(
    <ApprovalGate {...defaultProps} payload={payload} onApprove={(p) => { executed = p; }} />,
  );
  assert.equal(detailEl(container).textContent, payload, 'preview is the literal payload');
  assert.equal(detailEl(container).children.length, 0, 'payload rendered as text, not markup');
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(executed, payload);
});

test('accurate-preview: a payload change before approval updates the preview and what executes', async () => {
  let executed: string | undefined;
  const onApprove = (p: string) => { executed = p; };
  const { container, rerender } = render(
    <ApprovalGate {...defaultProps} onApprove={onApprove} />,
  );
  rerender(<ApprovalGate {...defaultProps} payload="DROP TABLE orders" onApprove={onApprove} />);
  assert.equal(detailEl(container).textContent, 'DROP TABLE orders');
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(executed, detailEl(container).textContent, 'executed === previewed');
});

test('accurate-preview: summary and consequence render in the visible action summary', () => {
  const { container } = render(
    <ApprovalGate {...defaultProps} consequence="Affects 14 records." />,
  );
  const summary = summaryEl(container);
  assert.ok(summary.textContent!.startsWith(defaultProps.summary), 'summary text leads');
  const consequence = summary.querySelector('.approval-gate__consequence');
  assert.ok(consequence, 'consequence rendered inside the summary');
  assert.match(consequence!.textContent!, /Affects 14 records\./);
  assert.ok(!summary.closest('[hidden]'), 'summary is not hidden');
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

test('irreversible-labeled: "Cannot be undone" renders inside the action summary when irreversible=true', () => {
  const { container } = render(<ApprovalGate {...defaultProps} irreversible />);
  const warn = summaryEl(container).querySelector('.approval-gate__irreversible');
  assert.ok(warn, 'irreversible label is within the summary, not elsewhere in the gate');
  assert.match(warn!.textContent!, /Cannot be undone/);
  assert.ok(!warn!.closest('[hidden]'), 'label is not hidden');
  assert.ok(!warn!.closest('[aria-hidden="true"]'), 'label is exposed to assistive technology');
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
  assert.equal(live.textContent, `${GATE_ANNOUNCEMENTS.proposed}: ${defaultProps.summary}`);
});

test('gate-announced: live region transitions through executing and completed', async () => {
  let finish!: () => void;
  const { container } = render(
    <ApprovalGate
      {...defaultProps}
      onApprove={() => new Promise<void>((resolve) => { finish = resolve; })}
    />,
  );
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(liveRegion(container).textContent, GATE_ANNOUNCEMENTS.executing);
  await act(async () => { finish(); });
  assert.equal(liveRegion(container).textContent, GATE_ANNOUNCEMENTS.completed);
});

test('gate-announced: live region shows rejected message on reject', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  fireEvent.click(rejectBtn(container)!);
  assert.equal(liveRegion(container).textContent, GATE_ANNOUNCEMENTS.rejected);
});

test('gate-announced: failed approval announces failure', async () => {
  const { container } = render(
    <ApprovalGate {...defaultProps} onApprove={async () => { throw new Error('network'); }} />,
  );
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  assert.equal(gateEl(container).dataset.status, 'failed');
  assert.equal(liveRegion(container).textContent, GATE_ANNOUNCEMENTS.failed);
});

test('gate-announced: a summary change after a decision does not re-announce a pending approval', async () => {
  const { container, rerender } = render(<ApprovalGate {...defaultProps} />);
  await act(async () => { fireEvent.click(approveBtn(container)!); });
  await act(async () => {
    rerender(<ApprovalGate {...defaultProps} summary="Delete 15 records from the orders table" />);
  });
  assert.equal(gateEl(container).dataset.status, 'completed');
  assert.equal(liveRegion(container).textContent, GATE_ANNOUNCEMENTS.completed);
});

test('controls-accessible: approve and reject are native, focusable buttons with distinguishing names', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const approve = approveBtn(container)!;
  const reject = rejectBtn(container)!;
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
  const approveName = approve.getAttribute('aria-label') ?? approve.textContent!.trim();
  const rejectName = reject.getAttribute('aria-label') ?? reject.textContent!.trim();
  assert.equal(approveName, `Approve: ${defaultProps.summary}`, 'approve names the action');
  assert.equal(rejectName, 'Reject');
  assert.notEqual(approveName, rejectName, 'names distinguish approval from rejection');
});

test('controls-accessible: gate has group role with aria-label', () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  const gate = container.querySelector('.approval-gate');
  assert.equal(gate!.getAttribute('role'), 'group');
  assert.match(gate!.getAttribute('aria-label')!, /Approval required/);
  assert.match(gate!.getAttribute('aria-label')!, /Delete/);
});

test('keyboard: Escape inside the gate triggers reject', () => {
  let rejected = false;
  const { container } = render(
    <ApprovalGate {...defaultProps} onReject={() => { rejected = true; }} />,
  );
  fireEvent.keyDown(container.querySelector('.approval-gate')!, { key: 'Escape' });
  assert.equal(rejected, true);
  assert.equal(decisions(container), null, 'decisions hidden after reject');
  assert.ok(outcome(container), 'outcome shown');
});

const expectNoViolations = async (container: HTMLElement, label: string) => {
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};

test('axe: no WCAG A/AA violations in proposed state', async () => {
  const { container } = render(<ApprovalGate {...defaultProps} />);
  await act(async () => {});
  await expectNoViolations(container, 'proposed');
});

test('axe: no WCAG A/AA violations in proposed state with irreversible label, consequence, and detail expanded', async () => {
  const { container } = render(
    <ApprovalGate {...defaultProps} irreversible consequence="Affects 14 records." />,
  );
  await act(async () => { fireEvent.click(detailToggle(container)); });
  assert.equal(detailEl(container).hidden, false);
  await expectNoViolations(container, 'proposed (expanded)');
});

test('axe: no WCAG A/AA violations in executing, completed, failed, and rejected states', async () => {
  const cases: Array<[string, () => void | Promise<void>, 'approve' | 'reject']> = [
    ['executing', () => new Promise<void>(() => {}), 'approve'],
    ['completed', async () => {}, 'approve'],
    ['failed', async () => { throw new Error('boom'); }, 'approve'],
    ['rejected', async () => {}, 'reject'],
  ];
  for (const [status, onApprove, decision] of cases) {
    const { container, unmount } = render(
      <ApprovalGate {...defaultProps} onApprove={onApprove} />,
    );
    await act(async () => {
      fireEvent.click(decision === 'approve' ? approveBtn(container)! : rejectBtn(container)!);
    });
    assert.equal(gateEl(container).dataset.status, status);
    await expectNoViolations(container, status);
    unmount();
  }
});
