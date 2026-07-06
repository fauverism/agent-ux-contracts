'use client';

import { useState } from 'react';
import {
  ConfidenceIndicator,
  type ConfidenceLevel,
} from '@patterns/confidence-indicator/react/ConfidenceIndicator';

const LEVELS: ConfidenceLevel[] = ['high', 'moderate', 'low', 'conditional', 'refusal'];

const DETAIL: Record<ConfidenceLevel, string> = {
  high: 'Multiple retrieved sources agree, and the answer is within well-documented territory.',
  moderate: 'The sources agree on the shape of the answer but differ on specifics.',
  low: 'Only one indirect source touches this; treat the answer as a starting point.',
  conditional: 'The answer holds under the assumptions below; verify them for your case.',
  refusal: 'Confidence is not the issue — the request itself was declined.',
};

export function ConfidenceIndicatorDemo() {
  const [level, setLevel] = useState<ConfidenceLevel>('high');

  return (
    <div>
      <div className="demo-controls" role="group" aria-label="Pick a confidence level">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className="demo-button"
            aria-pressed={level === l}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <ConfidenceIndicator
        level={level}
        detail={DETAIL[level]}
        refusalReason={level === 'refusal' ? 'Medical dosage advice needs a clinician.' : undefined}
        caveats={
          level === 'conditional'
            ? ['Assumes the 2026 fee schedule', 'Assumes US jurisdiction']
            : undefined
        }
      />
      <p className="demo-note">
        Same term, same meaning, every time — the label vocabulary is fixed and
        the reasoning sits behind a keyboard-accessible disclosure.
      </p>
    </div>
  );
}
