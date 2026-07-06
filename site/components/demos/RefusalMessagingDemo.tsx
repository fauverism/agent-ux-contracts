'use client';

import { useState } from 'react';
import { RefusalMessaging } from '@patterns/refusal-messaging/react/RefusalMessaging';

export function RefusalMessagingDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);

  return (
    <div>
      <div className="demo-controls">
        <button type="button" className="demo-button" onClick={() => setPartial(false)} disabled={!partial}>
          Full refusal
        </button>
        <button type="button" className="demo-button" onClick={() => setPartial(true)} disabled={partial}>
          Partial refusal
        </button>
      </div>
      <RefusalMessaging
        statement="I can't draft the employment contract itself."
        reason="Drafting binding legal documents needs a licensed attorney."
        alternatives={[
          {
            label: 'Explain what each clause means',
            onSelect: () => setPicked('Sure — here is what each clause does, in plain language…'),
          },
          {
            label: 'See supported document types',
            onSelect: () => setPicked('Supported: summaries, checklists, plain-language explanations.'),
          },
        ]}
        fulfilledContent={
          partial ? (
            <p>
              Here is the plain-English summary you asked for alongside the
              draft: the agreement covers a 12-month term with a 30-day notice
              clause…
            </p>
          ) : undefined
        }
        policyDetail="Unauthorized-practice-of-law policy."
      />
      {picked && <p className="demo-note">→ {picked}</p>}
      <p className="demo-note">
        No retry button, no error styling — a refusal is a decision, not a
        malfunction. Every alternative relates to what was actually asked.
      </p>
    </div>
  );
}
