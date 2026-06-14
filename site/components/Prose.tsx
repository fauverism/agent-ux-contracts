import type { ReactNode } from 'react';

interface ProseProps {
  children: ReactNode;
  className?: string;
}

/** Long-form text: Newsreader at the 65–75ch measure, baseline-grid
 *  spacing, mono for inline code/tables. */
export function Prose({ children, className }: ProseProps) {
  return <div className={className ? `prose ${className}` : 'prose'}>{children}</div>;
}
