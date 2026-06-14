import { useId, useState } from 'react';

export type ConfidenceLevel = 'high' | 'moderate' | 'low' | 'conditional' | 'refusal';

/**
 * Single source of truth for level → label semantics.
 * Constraint `consistent-semantics`: the same term always means the same level.
 * Constraint `no-jargon`: plain language, no numeric scores.
 */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  moderate: 'Likely',
  low: 'Uncertain',
  conditional: 'Depends on assumptions',
  refusal: "Can't answer",
};

export interface ConfidenceIndicatorProps {
  /** The model's actual confidence; never re-mapped by this component. */
  level: ConfidenceLevel;
  /** Why the model expressed this level; rendered behind a keyboard-accessible disclosure. */
  detail?: string;
  /** Shown when level is "refusal" (constraint: refusal-explicit). */
  refusalReason?: string;
  /** Caveats for the "conditional" level; rendered in the caveat region. */
  caveats?: string[];
}

export function ConfidenceIndicator({
  level,
  detail,
  refusalReason,
  caveats,
}: ConfidenceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const label = CONFIDENCE_LABELS[level];

  return (
    <div className="confidence-indicator" data-level={level}>
      {/* Visual is decorative; the text label is the accessible signal. */}
      <span className="confidence-indicator__visual" aria-hidden="true" />
      <span className="confidence-indicator__label">{label}</span>

      {detail && (
        <>
          <button
            type="button"
            className="confidence-indicator__toggle"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => setExpanded((open) => !open)}
          >
            Why?
          </button>
          <div id={detailId} className="confidence-indicator__detail" hidden={!expanded}>
            {detail}
          </div>
        </>
      )}

      {level === 'refusal' && refusalReason && (
        <p className="confidence-indicator__caveat">{refusalReason}</p>
      )}

      {level === 'conditional' && caveats && caveats.length > 0 && (
        <ul className="confidence-indicator__caveat">
          {caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
