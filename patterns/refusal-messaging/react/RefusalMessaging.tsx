import { useEffect, useId, useState, type ReactNode } from 'react';

export interface RefusalAlternative {
  /** The path this action offers, used as the visible and accessible name. */
  label: string;
  onSelect?: () => void;
  /** Render as a link instead of a button. */
  href?: string;
}

/** Announcement copy per refusal kind (constraint: refusal-announced). */
export const REFUSAL_ANNOUNCEMENTS = {
  full: 'Request declined.',
  partial: 'Request partially completed; the rest was declined.',
} as const;

export interface RefusalMessagingProps {
  /** What was declined, scoped precisely (constraint: reason-given). */
  statement: string;
  /** Why, in plain language tied to this request (constraint: reason-given). */
  reason: string;
  /**
   * At least one forward path related to the intent
   * (constraint: alternative-offered). Non-empty by type; enforced at
   * runtime too so violations fail loudly.
   */
  alternatives: readonly [RefusalAlternative, ...RefusalAlternative[]];
  /** Delivered portion of a partially-fulfilled request (constraint: partial-honored). */
  fulfilledContent?: ReactNode;
  /** Expandable policy reference (constraint: policy-detail-available). */
  policyDetail?: string;
}

export function RefusalMessaging({
  statement,
  reason,
  alternatives,
  fulfilledContent,
  policyDetail,
}: RefusalMessagingProps) {
  if (alternatives.length === 0) {
    throw new Error(
      'refusal-messaging: alternative-offered requires at least one alternative',
    );
  }

  const [announcement, setAnnouncement] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyId = useId();
  const kind = fulfilledContent ? 'partial' : 'full';

  // Live regions announce changes, not initial render — set the text after
  // mount so the refusal is actually spoken (constraint: refusal-announced).
  useEffect(() => {
    setAnnouncement(REFUSAL_ANNOUNCEMENTS[kind]);
  }, [kind]);

  return (
    <div className="refusal-messaging" data-kind={kind}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {fulfilledContent && (
        <div className="refusal-messaging__fulfilled">{fulfilledContent}</div>
      )}

      {/* Status semantics, never role="alert" — a refusal is a decision, not
          a malfunction (constraint: refusal-distinct-from-error). */}
      <div className="refusal-messaging__refusal">
        <p className="refusal-messaging__statement">{statement}</p>
        <p className="refusal-messaging__reason">{reason}</p>

        {/* Exactly the provided alternatives; no built-in retry
            (constraint: no-verbatim-retry). */}
        <ul className="refusal-messaging__alternatives">
          {alternatives.map((alternative) => (
            <li key={alternative.label}>
              {alternative.href ? (
                <a href={alternative.href}>{alternative.label}</a>
              ) : (
                <button type="button" onClick={alternative.onSelect}>
                  {alternative.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        {policyDetail && (
          <>
            <button
              type="button"
              className="refusal-messaging__policy-toggle"
              aria-expanded={policyOpen}
              aria-controls={policyId}
              onClick={() => setPolicyOpen((open) => !open)}
            >
              Why this is declined
            </button>
            <div id={policyId} className="refusal-messaging__policy" hidden={!policyOpen}>
              {policyDetail}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
