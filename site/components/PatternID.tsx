interface PatternIDProps {
  id: string;
}

/** A contract id (e.g. streaming-response) in the mono content voice.
 *  Small-caps look is visual only — the DOM text stays the literal id,
 *  so selection and copy are exact. */
export function PatternID({ id }: PatternIDProps) {
  return <code className="pattern-id">{id}</code>;
}
