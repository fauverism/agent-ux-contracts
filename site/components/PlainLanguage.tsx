import { getPlainLanguage } from '@/lib/plain-language';

/* The non-technical entry point to a pattern page: plain words, before any
   contract vocabulary (RFC-2119, WCAG, states) shows up. */
export function PlainLanguage({ id }: { id: string }) {
  const entry = getPlainLanguage(id);
  if (!entry) return null;

  return (
    <div className="plain-english">
      <p className="plain-english-label">In plain English</p>
      <p className="plain-english-lead">{entry.oneLiner}</p>
      <p>{entry.explanation}</p>
    </div>
  );
}
