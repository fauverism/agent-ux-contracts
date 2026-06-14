import { useId, useState } from 'react';

export type FailureKind = 'network' | 'timeout' | 'overloaded' | 'refusal' | 'tool' | 'unknown';

export interface FailureInfo {
  kind: FailureKind;
  /** Raw provider message; shown only inside the detail disclosure. */
  message?: string;
  /** Technical detail (codes, request ids); shown only inside the detail disclosure. */
  detail?: string;
}

/**
 * The error taxonomy. Every kind maps to a plain-language summary and at
 * least one recovery action (constraints: actionable-error,
 * plain-language-summary, refusal-distinguished).
 */
export const FAILURE_COPY: Record<FailureKind, { summary: string; action: string }> = {
  network: {
    summary: "Couldn't reach the service. Your prompt is saved — try again.",
    action: 'Try again',
  },
  timeout: {
    summary: 'The request timed out. Your prompt is saved — try again.',
    action: 'Try again',
  },
  overloaded: {
    summary: 'The service is overloaded right now. Wait a moment, then try again.',
    action: 'Try again',
  },
  refusal: {
    summary: 'The model declined this request. Rewording often helps — edit your prompt and resend.',
    action: 'Edit and resend',
  },
  tool: {
    summary: 'A tool the model used failed. Retry, or rephrase to avoid that step.',
    action: 'Try again',
  },
  unknown: {
    summary: 'Something went wrong. Your prompt is saved — try again.',
    action: 'Try again',
  },
};

export interface ErrorRecoveryProps {
  /** Current failure, or null when recovered/idle. */
  failure: FailureInfo | null;
  /** The user's prompt — preserved and editable at all times. */
  input: string;
  onInputChange: (value: string) => void;
  /** Re-submits the (possibly edited) input. */
  onRetry: () => void | Promise<void>;
  /** Output that arrived before the failure, kept visible. */
  partialOutput?: string;
}

export function ErrorRecovery({
  failure,
  input,
  onInputChange,
  onRetry,
  partialOutput,
}: ErrorRecoveryProps) {
  const [inFlight, setInFlight] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = useId();
  const copy = failure ? FAILURE_COPY[failure.kind] : null;
  const hasDetail = Boolean(failure?.message || failure?.detail);

  // Single-flight: repeat activations while busy are no-ops
  // (constraint: retry-single-flight).
  const retry = async () => {
    if (inFlight) return;
    setInFlight(true);
    try {
      await onRetry();
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="error-recovery" data-state={failure ? (inFlight ? 'retrying' : 'errored') : 'idle'}>
      {partialOutput && (
        <div className="error-recovery__partial">{partialOutput}</div>
      )}

      {/* One persistent alert region; text is replaced, never stacked. */}
      <div role="alert" className="error-recovery__summary">
        {copy ? copy.summary : ''}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {inFlight ? 'Retrying…' : ''}
      </div>

      {/* The input survives every failure, editable throughout
          (constraint: input-preserved). */}
      <textarea
        className="error-recovery__input"
        aria-label="Your prompt"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
      />

      {failure && copy && (
        <div className="error-recovery__actions">
          <button
            type="button"
            className="error-recovery__retry"
            aria-disabled={inFlight}
            aria-busy={inFlight}
            onClick={retry}
          >
            {copy.action}
          </button>

          {hasDetail && (
            <>
              <button
                type="button"
                className="error-recovery__detail-toggle"
                aria-expanded={detailOpen}
                aria-controls={detailId}
                onClick={() => setDetailOpen((open) => !open)}
              >
                Technical details
              </button>
              <pre id={detailId} className="error-recovery__detail" hidden={!detailOpen}>
                {[failure.message, failure.detail].filter(Boolean).join('\n')}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
