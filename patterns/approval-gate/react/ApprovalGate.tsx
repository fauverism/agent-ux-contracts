import { useEffect, useId, useState, type KeyboardEvent } from 'react';

export type GateStatus = 'proposed' | 'executing' | 'completed' | 'failed' | 'rejected';

/** Live-region announcements per status (constraint: gate-announced). */
export const GATE_ANNOUNCEMENTS: Record<GateStatus, string> = {
  proposed: 'Approval required',
  executing: 'Approved — executing…',
  completed: 'Action completed.',
  failed: 'Action failed after approval.',
  rejected: 'Rejected — nothing was executed.',
};

export interface ApprovalGateProps {
  /** Plain-language action: verb + target + scope (constraint: accurate-preview). */
  summary: string;
  /** The exact payload that will execute — what is previewed is what runs. */
  payload: string;
  /** Renders a "Cannot be undone" label (constraint: irreversible-labeled). */
  irreversible?: boolean;
  /** Scope note, e.g. "Affects 14 records". */
  consequence?: string;
  /**
   * Invoked only by explicit activation of the approve control. Receives the
   * previewed payload so executing exactly what was shown is the default
   * path (constraint: accurate-preview).
   */
  onApprove: (payload: string) => void | Promise<void>;
  onReject?: () => void;
}

export function ApprovalGate({
  summary,
  payload,
  irreversible = false,
  consequence,
  onApprove,
  onReject,
}: ApprovalGateProps) {
  const [status, setStatus] = useState<GateStatus>('proposed');
  const [announcement, setAnnouncement] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = useId();

  // Announce arrival after mount: live regions announce *changes*, so the
  // text must be set post-render to be heard (constraint: gate-announced).
  useEffect(() => {
    setAnnouncement(`${GATE_ANNOUNCEMENTS.proposed}: ${summary}`);
  }, [summary]);

  // The ONLY path to onApprove is this handler, reached by explicit
  // activation of the approve button (constraint: explicit-consent).
  const approve = async () => {
    if (status !== 'proposed') return;
    setStatus('executing');
    setAnnouncement(GATE_ANNOUNCEMENTS.executing);
    try {
      // The previewed payload is what the approve handler receives —
      // preview and execution cannot silently diverge inside the gate
      // (constraint: accurate-preview).
      await onApprove(payload);
      setStatus('completed');
      setAnnouncement(GATE_ANNOUNCEMENTS.completed);
    } catch {
      setStatus('failed');
      setAnnouncement(GATE_ANNOUNCEMENTS.failed);
    }
  };

  const reject = () => {
    if (status !== 'proposed') return;
    setStatus('rejected');
    setAnnouncement(GATE_ANNOUNCEMENTS.rejected);
    onReject?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') reject();
  };

  return (
    <div
      className="approval-gate"
      data-status={status}
      role="group"
      aria-label={`Approval required: ${summary}`}
      onKeyDown={onKeyDown}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <p className="approval-gate__summary">
        {summary}
        {irreversible && (
          <strong className="approval-gate__irreversible"> Cannot be undone.</strong>
        )}
        {consequence && <span className="approval-gate__consequence"> {consequence}</span>}
      </p>

      <button
        type="button"
        className="approval-gate__detail-toggle"
        aria-expanded={detailOpen}
        aria-controls={detailId}
        onClick={() => setDetailOpen((open) => !open)}
      >
        Show exactly what will run
      </button>
      <pre id={detailId} className="approval-gate__detail" hidden={!detailOpen}>
        {payload}
      </pre>

      {status === 'proposed' && (
        // Reject precedes approve in DOM and tab order; nothing is
        // auto-focused (constraint: no-preselected-approve).
        <div className="approval-gate__decisions">
          <button type="button" className="approval-gate__reject" onClick={reject}>
            Reject
          </button>
          <button
            type="button"
            className="approval-gate__approve"
            aria-label={`Approve: ${summary}`}
            onClick={approve}
          >
            Approve
          </button>
        </div>
      )}

      {status !== 'proposed' && (
        <p className="approval-gate__outcome">{GATE_ANNOUNCEMENTS[status]}</p>
      )}
    </div>
  );
}
