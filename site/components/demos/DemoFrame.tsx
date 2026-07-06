'use client';

import { useState, type ReactNode } from 'react';

/**
 * Shared chrome for live demos: labels the content as the real reference
 * implementation (not a mock), and offers a reset that remounts the demo so
 * every state machine can be walked again from its initial state.
 */
export function DemoFrame({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(0);

  return (
    <figure className="demo-frame">
      <figcaption className="demo-frame__caption">
        <span>Live demo — the React reference implementation, unmodified</span>
        <button
          type="button"
          className="demo-frame__reset"
          onClick={() => setRun((n) => n + 1)}
        >
          Reset
        </button>
      </figcaption>
      <div className="demo-stage" key={run}>
        {children}
      </div>
    </figure>
  );
}
