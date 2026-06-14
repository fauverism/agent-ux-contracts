'use client';

import { useRef, useState } from 'react';

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  return ok;
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash();
    } catch {
      // Clipboard API needs a focused, secure document; fall back.
      if (legacyCopy(text)) flash();
    }
  };

  return (
    <button type="button" className="copy-btn" onClick={() => void copy()}>
      {copied ? 'Copied' : 'Copy'}
      <span role="status" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
