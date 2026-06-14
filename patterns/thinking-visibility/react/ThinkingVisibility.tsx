import { useId, useState, type ReactNode } from 'react';

export type ThinkingPhase = 'idle' | 'thinking' | 'answering' | 'completed';

/** Announced through the polite live region on each phase change (constraint: phase-announced). */
export const PHASE_MESSAGES: Record<ThinkingPhase, string> = {
  idle: '',
  thinking: 'Model is thinking…',
  answering: 'Writing the answer…',
  completed: 'Response complete.',
};

export interface ThinkingVisibilityProps {
  phase: ThinkingPhase;
  /** Accumulated reasoning text, streamed in as it arrives. */
  thinking: string;
  /** The final answer content — always the visually primary region. */
  children?: ReactNode;
  /** Label for the reasoning region (constraint: working-notes-label). */
  label?: string;
}

export function ThinkingVisibility({
  phase,
  thinking,
  children,
  label = 'Working notes',
}: ThinkingVisibilityProps) {
  // null = follow phase; true/false = explicit user choice wins
  // (constraint: collapse-after-answer collapses unless the user expanded).
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const regionId = useId();

  const autoExpanded = phase === 'thinking' || phase === 'answering';
  const expanded = userToggled ?? autoExpanded;

  return (
    <div className="thinking-visibility" data-phase={phase}>
      {/* Phase transitions are announced without moving focus. */}
      <div role="status" aria-live="polite" className="sr-only">
        {PHASE_MESSAGES[phase]}
      </div>

      <button
        type="button"
        className="thinking-visibility__disclosure"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setUserToggled(!expanded)}
      >
        {label}
        {phase === 'thinking' && (
          <span className="thinking-visibility__activity" aria-hidden="true" />
        )}
      </button>

      {/* Reasoning is a separately-labeled group, visually subordinate to the
          answer (constraint: reasoning-distinct). Inline rendering — never an
          overlay — keeps the rest of the page interactive (constraint: non-blocking). */}
      <section
        id={regionId}
        className="thinking-visibility__region"
        aria-label={label}
        hidden={!expanded}
      >
        {thinking}
      </section>

      <div className="thinking-visibility__answer">{children}</div>
    </div>
  );
}
