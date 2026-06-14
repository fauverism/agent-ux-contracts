import type { ReactNode } from 'react';

/*
 * Minimal JSON highlighter for the Agent view. Runs in server components —
 * zero client JS. The palette is deliberately the site's own: ink steps carry
 * structure, the accent marks only RFC-2119 level keywords (a sanctioned
 * placement — see the usage contract in tokens.css). No rainbow themes.
 */

const LEVELS = new Set(['MUST', 'MUST_NOT', 'SHOULD', 'SHOULD_NOT', 'MAY']);

const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

export function highlightJson(json: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of json.matchAll(TOKEN)) {
    const index = match.index;
    if (index > last) out.push(json.slice(last, index));
    const [, str, colon, literal, punct] = match;
    if (str !== undefined) {
      const isKey = colon !== undefined;
      const bare = str.slice(1, -1);
      const cls = isKey ? 'j-key' : LEVELS.has(bare) ? 'j-level' : 'j-str';
      out.push(
        <span key={key++} className={cls}>
          {str}
        </span>,
      );
      if (colon) {
        out.push(
          <span key={key++} className="j-punct">
            {colon}
          </span>,
        );
      }
    } else if (literal !== undefined) {
      out.push(
        <span key={key++} className="j-lit">
          {literal}
        </span>,
      );
    } else if (punct !== undefined) {
      out.push(
        <span key={key++} className="j-punct">
          {punct}
        </span>,
      );
    }
    last = index + match[0].length;
  }
  if (last < json.length) out.push(json.slice(last));
  return out;
}
