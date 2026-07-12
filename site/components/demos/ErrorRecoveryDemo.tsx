'use client';

import { useState } from 'react';
import {
  ErrorRecovery,
  type FailureInfo,
} from '@patterns/error-recovery/react/ErrorRecovery';

export function ErrorRecoveryDemo() {
  const [input, setInput] = useState('Summarize the attached usage report for the exec review');
  const [failure, setFailure] = useState<FailureInfo | null>({
    kind: 'timeout',
    message: 'Request timed out after 30s',
    detail: 'request_id: req_8f4a — upstream generation exceeded deadline',
  });
  const [recovered, setRecovered] = useState(false);

  const retry = () =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        setFailure(null);
        setRecovered(true);
        resolve();
      }, 1000);
    });

  return (
    <div>
      <ErrorRecovery
        failure={failure}
        input={input}
        onInputChange={setInput}
        onRetry={retry}
        partialOutput="The report covers July–September usage across 14 workspaces…"
      />
      {recovered && (
        <p className="demo-note">
          Recovered — and your prompt survived the failure, edits included. The
          partial output above was never thrown away either.
        </p>
      )}
      {failure && (
        <p className="demo-note">
          Edit the prompt before retrying if you like — failure never locks or
          clears your input. Technical detail stays behind the disclosure.
        </p>
      )}
    </div>
  );
}
