'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ThinkingVisibility,
  type ThinkingPhase,
} from '@patterns/thinking-visibility/react/ThinkingVisibility';

const REASONING =
  'Checking the three usual causes: focus management, live-region timing, ' +
  'and layout shift. The report mentions a screen reader, so live-region ' +
  'timing is the most likely culprit — the region must exist before the ' +
  'stream starts.';

const WORDS = REASONING.split(' ');

export function ThinkingVisibilityDemo() {
  const [phase, setPhase] = useState<ThinkingPhase>('idle');
  const [thinking, setThinking] = useState('');
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  const ask = () => {
    clearInterval(timer.current);
    setThinking('');
    setPhase('thinking');
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setThinking(WORDS.slice(0, i).join(' '));
      if (i >= WORDS.length) {
        clearInterval(timer.current);
        setPhase('answering');
        setTimeout(() => setPhase('completed'), 900);
      }
    }, 70);
  };

  return (
    <div>
      <div className="demo-controls">
        <button type="button" className="demo-button" onClick={ask} disabled={phase === 'thinking' || phase === 'answering'}>
          Ask a question
        </button>
      </div>
      <ThinkingVisibility phase={phase} thinking={thinking} label="Working notes">
        {(phase === 'answering' || phase === 'completed') && (
          <p>
            The live region needs to be in the DOM before streaming starts —
            add it during idle render, not on the first token.
          </p>
        )}
      </ThinkingVisibility>
      <p className="demo-note">
        The reasoning stays collapsible working notes; the answer is always the
        visually primary region, never upstaged by the thinking.
      </p>
    </div>
  );
}
