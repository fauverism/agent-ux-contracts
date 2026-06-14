import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export type WorkPhase = 'running' | 'cancel-requested' | 'cancelled' | 'completed';

/** Polite announcements per phase (constraint: cancellation-announced). */
export const WORK_ANNOUNCEMENTS: Record<WorkPhase, string> = {
  running: '',
  'cancel-requested': 'Cancellation requested — stopping.',
  cancelled: 'Work cancelled.',
  completed: 'Work completed.',
};

export const RACE_DISCLOSURE =
  'This work finished before the cancellation took effect.';

export interface InterruptionCancelProps {
  /** Names the work; carried into the cancel control's accessible name. */
  workLabel: string;
  /** True while the host's work is executing. */
  running: boolean;
  /**
   * How the work ended, reported on the falling edge of `running`. Omit to
   * infer: cancelled if cancellation was requested, completed otherwise.
   * Pass 'completed' explicitly when the work finished despite a pending
   * cancel (constraint: completion-race-honest).
   */
  outcome?: 'completed' | 'cancelled';
  /** Progress display while running (and while cancellation is pending). */
  progress?: string;
  /** Side effects that completed before the stop (constraint: partial-work-honesty). */
  completedWork?: string[];
  /** Work that was stopped before it ran. */
  stoppedWork?: string[];
  /** Called exactly once when the user requests cancellation. */
  onCancel: () => void;
}

export function InterruptionCancel({
  workLabel,
  running,
  outcome,
  progress,
  completedWork = [],
  stoppedWork = [],
  onCancel,
}: InterruptionCancelProps) {
  const [phase, setPhase] = useState<WorkPhase>(running ? 'running' : 'completed');
  const wasRunning = useRef(running);
  const cancelWasRequested = useRef(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // If the focused cancel control is about to be removed, keep focus on the
  // work region instead of letting it drop to <body>
  // (constraint: focus-not-lost).
  const reclaimFocusFromCancel = () => {
    if (cancelRef.current && document.activeElement === cancelRef.current) {
      regionRef.current?.focus();
    }
  };

  useEffect(() => {
    const was = wasRunning.current;
    wasRunning.current = running;

    if (running && !was) {
      // Rising edge only — once cancellation is requested, nothing short of a
      // fresh run re-enters running (constraint: no-silent-continuation).
      cancelWasRequested.current = false;
      setPhase('running');
    } else if (!running && was) {
      reclaimFocusFromCancel();
      setPhase((current) => {
        if (current === 'cancel-requested') {
          return outcome === 'completed' ? 'completed' : 'cancelled';
        }
        if (current === 'running') {
          return outcome === 'cancelled' ? 'cancelled' : 'completed';
        }
        return current;
      });
    }
  }, [running, outcome]);

  // Synchronous acknowledgment, no confirmation dialog
  // (constraints: immediate-acknowledgment, cancel-not-gated).
  const handleCancel = () => {
    if (phase !== 'running') return;
    cancelWasRequested.current = true;
    reclaimFocusFromCancel();
    setPhase('cancel-requested');
    onCancel();
  };

  // Escape requests cancellation while focus is inside the component
  // (constraint: escape-cancels).
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && phase === 'running') {
      event.stopPropagation();
      handleCancel();
    }
  };

  const settled = phase === 'cancelled' || phase === 'completed';
  const raced = phase === 'completed' && cancelWasRequested.current;

  return (
    <div className="interruption-cancel" data-phase={phase} onKeyDown={handleKeyDown}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {WORK_ANNOUNCEMENTS[phase]}
      </div>

      {/* tabIndex -1: focus recovery target when the cancel control goes away. */}
      <div ref={regionRef} tabIndex={-1} className="interruption-cancel__region">
        {!settled && progress && (
          <p className="interruption-cancel__progress">{progress}</p>
        )}

        {phase === 'cancel-requested' && (
          <p className="interruption-cancel__pending">Cancelling…</p>
        )}

        {settled && (
          <div className="interruption-cancel__summary">
            <p className="interruption-cancel__outcome">
              {phase === 'cancelled' ? `Cancelled: ${workLabel}.` : `Completed: ${workLabel}.`}
            </p>
            {raced && <p className="interruption-cancel__race-note">{RACE_DISCLOSURE}</p>}
            {completedWork.length > 0 && (
              <>
                <p className="interruption-cancel__list-label">Already done:</p>
                <ul className="interruption-cancel__done">
                  {completedWork.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {phase === 'cancelled' && stoppedWork.length > 0 && (
              <>
                <p className="interruption-cancel__list-label">Stopped before:</p>
                <ul className="interruption-cancel__stopped">
                  {stoppedWork.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {phase === 'running' && (
        <button
          ref={cancelRef}
          type="button"
          className="interruption-cancel__cancel"
          aria-label={`Cancel: ${workLabel}`}
          onClick={handleCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
