export type ConstraintLevel = 'MUST' | 'MUST_NOT' | 'SHOULD' | 'SHOULD_NOT' | 'MAY';

interface ConstraintBadgeProps {
  level: ConstraintLevel;
}

/** RFC-2119 level as a printed stamp. MUST/MUST_NOT carry the accent;
 *  MUST_NOT is the filled (prohibition) form. */
export function ConstraintBadge({ level }: ConstraintBadgeProps) {
  return (
    <span className="constraint-badge" data-level={level}>
      {level.replace('_', ' ')}
    </span>
  );
}
