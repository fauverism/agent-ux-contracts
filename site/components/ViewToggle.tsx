'use client';

import { useId, useState, type ReactNode } from 'react';

/*
 * Human/Agent view switch: the same contract, rendered for people or shown
 * raw for machines — flipping to the translucent overlay page of a manual.
 * Both panes are server-rendered; this component only swaps visibility, so
 * the content works without hydration and ships no duplicated data.
 */
export function ViewToggle({ human, agent }: { human: ReactNode; agent: ReactNode }) {
  const [view, setView] = useState<'human' | 'agent'>('human');
  const humanId = useId();
  const agentId = useId();

  return (
    <div>
      <div className="view-toggle" role="group" aria-label="Contract view">
        <button
          type="button"
          aria-pressed={view === 'human'}
          aria-controls={humanId}
          onClick={() => setView('human')}
        >
          Human
        </button>
        <button
          type="button"
          aria-pressed={view === 'agent'}
          aria-controls={agentId}
          onClick={() => setView('agent')}
        >
          Agent
        </button>
      </div>
      <div id={humanId} className="view-pane mt-8" hidden={view !== 'human'}>
        {human}
      </div>
      <div id={agentId} className="view-pane mt-8" hidden={view !== 'agent'}>
        {agent}
      </div>
    </div>
  );
}
