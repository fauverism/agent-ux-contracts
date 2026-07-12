'use client';

import { ApprovalGate } from '@patterns/approval-gate/react/ApprovalGate';

const PAYLOAD = JSON.stringify(
  {
    action: 'send_email',
    to: ['dana@example.com', 'lee@example.com', 'sam@example.com'],
    subject: 'Follow-up: Q3 usage review',
    body: 'Hi — following up on the usage review we discussed…',
  },
  null,
  2,
);

export function ApprovalGateDemo() {
  return (
    <div>
      <p className="demo-note" style={{ marginTop: 0 }}>
        The agent has proposed an action. Nothing executes until you decide —
        note that neither button is focused, and Escape rejects.
      </p>
      <ApprovalGate
        summary="Send follow-up email to 3 customers"
        payload={PAYLOAD}
        irreversible
        consequence="Sends immediately to all 3 recipients."
        // The handler receives the previewed payload; a real host executes
        // exactly that string. Here we only simulate the latency.
        onApprove={() => new Promise<void>((resolve) => setTimeout(resolve, 900))}
      />
    </div>
  );
}
