'use client';

import { useEffect, useRef, useState } from 'react';
import { StreamingResponse } from '@patterns/streaming-response/react/StreamingResponse';

const RESPONSE =
  'Streaming keeps long generations honest: the page renders tokens as they ' +
  'arrive, the stop control stays reachable the whole time, and if you stop ' +
  'midway the partial output stays on screen instead of vanishing. Screen ' +
  'readers hear a completion announcement through the live region — try it ' +
  'with one running.';

const WORDS = RESPONSE.split(' ');

export function StreamingResponseDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const failAt = useRef<number | null>(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = (failMidway: boolean) => {
    clearInterval(timer.current);
    failAt.current = failMidway ? Math.floor(WORDS.length / 3) : null;
    setContent('');
    setError(null);
    setIsStreaming(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (failAt.current !== null && i >= failAt.current) {
        clearInterval(timer.current);
        setError('The model connection dropped mid-response.');
        setIsStreaming(false);
        return;
      }
      setContent(WORDS.slice(0, i).join(' '));
      if (i >= WORDS.length) {
        clearInterval(timer.current);
        setIsStreaming(false);
      }
    }, 90);
  };

  const stop = () => {
    clearInterval(timer.current);
    setIsStreaming(false);
  };

  return (
    <div>
      <div className="demo-controls">
        <button type="button" className="demo-button" onClick={() => start(false)} disabled={isStreaming}>
          Stream a response
        </button>
        <button type="button" className="demo-button" onClick={() => start(true)} disabled={isStreaming}>
          Stream, then fail midway
        </button>
      </div>
      <StreamingResponse isStreaming={isStreaming} content={content} error={error} onStop={stop} />
    </div>
  );
}
