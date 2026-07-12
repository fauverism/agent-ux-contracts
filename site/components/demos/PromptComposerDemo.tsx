'use client';

import { useState } from 'react';
import { PromptComposer } from '@patterns/prompt-composer/react/PromptComposer';

export function PromptComposerDemo() {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const submit = (draft: string) => {
    setBusy(true);
    setTimeout(() => {
      setSent((s) => [...s, draft]);
      setValue('');
      setBusy(false);
    }, 800);
  };

  return (
    <div>
      <PromptComposer
        value={value}
        onChange={setValue}
        onSubmit={submit}
        busy={busy}
        maxLength={80}
        label="Message the agent"
        hint="Enter sends · Shift+Enter for a new line"
        placeholder="Try typing past 80 characters — nothing is silently truncated"
      />
      {sent.length > 0 && (
        <ul className="demo-note">
          {sent.map((s, i) => (
            <li key={i}>Sent: {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
