interface RuleDividerProps {
  variant?: 'hairline' | 'strong' | 'double';
  /** Inline section label set into the rule, mono small caps. */
  label?: string;
}

export function RuleDivider({ variant = 'hairline', label }: RuleDividerProps) {
  if (label) {
    return (
      <div className="rule-labeled" role="separator" aria-label={label}>
        <span>{label}</span>
      </div>
    );
  }
  return <hr className="rule" data-variant={variant} />;
}
