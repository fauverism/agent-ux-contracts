'use client';

import { useEffect, useRef, useState } from 'react';
import { InterruptionCancel } from '@patterns/interruption-cancel/react/InterruptionCancel';

const STEPS = [
  'Draft summary written',
  'Calendar invite created',
  'Notification email sent',
];

export function InterruptionCancelDemo() {
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<'completed' | 'cancelled'>();
  const [done, setDone] = useState<string[]>([]);
  const [stopped, setStopped] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const cancelRequested = useRef(false);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    clearInterval(timer.current);
    cancelRequested.current = false;
    setDone([]);
    setStopped([]);
    setOutcome(undefined);
    setRunning(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setDone(STEPS.slice(0, i));
      if (i >= STEPS.length) {
        clearInterval(timer.current);
        setOutcome('completed');
        setRunning(false);
      }
    }, 1400);
  };

  const cancel = () => {
    cancelRequested.current = true;
    // The host's abort is asynchronous — the component acknowledges
    // immediately on its own; the work settles ~a step later.
    setTimeout(() => {
      clearInterval(timer.current);
      setDone((completed) => {
        setStopped(STEPS.slice(completed.length));
        return completed;
      });
      setOutcome('cancelled');
      setRunning(false);
    }, 700);
  };

  return (
    <div>
      <div className="demo-controls">
        <button type="button" className="demo-button" onClick={start} disabled={running}>
          Run a 3-step agent task
        </button>
      </div>
      <InterruptionCancel
        workLabel="the follow-up task"
        running={running}
        outcome={outcome}
        progress={running ? `Step ${Math.min(done.length + 1, STEPS.length)} of ${STEPS.length}` : undefined}
        completedWork={done}
        stoppedWork={stopped}
        onCancel={cancel}
      />
      <p className="demo-note">
        Cancel mid-run: the acknowledgment is immediate, and the settled state
        reports which side effects already happened instead of hiding them.
      </p>
    </div>
  );
}
