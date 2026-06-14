import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export type StreamDisplayState =
  | 'idle'
  | 'streaming'
  | 'completed'
  | 'interrupted'
  | 'errored';

export interface StreamingResponseProps {
  /** True while the host's stream is in flight. */
  isStreaming: boolean;
  /** Accumulated output; the host appends as chunks arrive. */
  content: string;
  /** Failure message; read when the stream settles. */
  error?: string | null;
  /** Called when the user stops generation. */
  onStop?: () => void;
}

/** Polite announcements per settled state (constraint: completion-announced). */
const ANNOUNCEMENTS: Partial<Record<StreamDisplayState, string>> = {
  completed: 'Response complete.',
  interrupted: 'Generation stopped.',
};

export function StreamingResponse({
  isStreaming,
  content,
  error = null,
  onStop,
}: StreamingResponseProps) {
  const [displayState, setDisplayState] = useState<StreamDisplayState>('idle');
  const wasStreaming = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);

  // If the focused stop control is about to be removed, keep focus inside the
  // component instead of letting the browser drop it on <body>
  // (constraint: focus-not-lost). No-op when focus is elsewhere
  // (constraint: no-focus-steal).
  const reclaimFocusFromStop = () => {
    if (stopRef.current && document.activeElement === stopRef.current) {
      outputRef.current?.focus();
    }
  };

  useEffect(() => {
    const was = wasStreaming.current;
    wasStreaming.current = isStreaming;

    if (isStreaming && !was) {
      // Rising edge only — a user stop while the host still reports an active
      // stream must not re-enter streaming (constraint: interruptible).
      setDisplayState('streaming');
    } else if (!isStreaming && was) {
      reclaimFocusFromStop();
      // Settle, unless a user stop already settled it (the latch).
      setDisplayState((current) =>
        current === 'streaming' ? (error ? 'errored' : 'completed') : current,
      );
    }
  }, [isStreaming, error]);

  const isActive = displayState === 'streaming';

  const handleStop = () => {
    if (!isActive) return;
    reclaimFocusFromStop();
    setDisplayState('interrupted');
    onStop?.();
  };

  // Escape stops the stream while focus is inside the component
  // (contract keyboard table).
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isActive) {
      event.stopPropagation();
      handleStop();
    }
  };

  return (
    <div className="streaming-response" onKeyDown={handleKeyDown}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {ANNOUNCEMENTS[displayState] ?? ''}
      </div>

      {/* tabIndex -1: programmatic focus target when the stop control goes away. */}
      <div
        ref={outputRef}
        tabIndex={-1}
        className="streaming-response__output"
        data-state={displayState}
      >
        {content && <div className="streaming-response__content">{content}</div>}

        {isActive && (
          <div className="streaming-response__activity" aria-hidden="true">
            <span className="streaming-response__cursor" />
          </div>
        )}

        {displayState === 'errored' && error && (
          <div className="streaming-response__error" role="alert">
            Generation failed: {error}
          </div>
        )}
      </div>

      {isActive && onStop && (
        <button
          ref={stopRef}
          type="button"
          className="streaming-response__stop"
          aria-label="Stop generation"
          onClick={handleStop}
        >
          Stop
        </button>
      )}

      {displayState === 'interrupted' && (
        <div className="streaming-response__notice">
          Generation stopped. Partial output preserved.
        </div>
      )}
    </div>
  );
}
