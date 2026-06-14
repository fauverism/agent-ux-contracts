import { useState, type ReactNode } from 'react';

export interface GenerationControlProps {
  /** The first generated output; becomes variant 1 of the history. */
  initialOutput: string;
  /**
   * Produces a new variant. The optional refinement is the user's adjustment
   * instruction; hosts append it to the original context, never replace it
   * (constraint: refine-carries-context).
   */
  onGenerate: (refinement?: string) => Promise<string>;
  /** Renders one variant; defaults to a plain text block. */
  renderOutput?: (output: string) => ReactNode;
  /** Shows the refine instruction field. */
  withRefine?: boolean;
}

export function GenerationControl({
  initialOutput,
  onGenerate,
  renderOutput,
  withRefine = false,
}: GenerationControlProps) {
  // Full history — variants are appended, never replaced
  // (constraint: no-silent-destruction).
  const [variants, setVariants] = useState<string[]>([initialOutput]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refinement, setRefinement] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const total = variants.length;
  const positionLabel = `Variant ${index + 1} of ${total}`;

  // Single-flight: repeat activations while busy are no-ops
  // (constraint: single-flight-regeneration).
  const regenerate = async () => {
    if (busy) return;
    setBusy(true);
    setAnnouncement('Generating a new variant…');
    try {
      const output = await onGenerate(refinement.trim() || undefined);
      const next = [...variants, output];
      setVariants(next);
      setIndex(next.length - 1);
      setAnnouncement(`Variant ${next.length} of ${next.length} ready.`);
    } catch {
      // Failed: the displayed variant remains intact and usable.
      setAnnouncement(`Generation failed — still showing ${positionLabel.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  };

  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    setAnnouncement(`Showing variant ${nextIndex + 1} of ${total}.`);
  };

  const current = variants[index];

  return (
    <div className="generation-control" data-state={busy ? 'regenerating' : 'generated'}>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="generation-control__output">
        {renderOutput ? renderOutput(current) : <div>{current}</div>}
      </div>

      <div className="generation-control__bar">
        <button
          type="button"
          className="generation-control__regenerate"
          aria-disabled={busy}
          aria-busy={busy}
          onClick={regenerate}
        >
          {busy ? 'Generating…' : 'New version'}
        </button>

        {/* Navigation disables at the ends rather than wrapping silently. */}
        <nav className="generation-control__navigator" aria-label="Variants">
          <button
            type="button"
            aria-label="Previous variant"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            ‹
          </button>
          <span className="generation-control__position">{positionLabel}</span>
          <button
            type="button"
            aria-label="Next variant"
            disabled={index === total - 1}
            onClick={() => goTo(index + 1)}
          >
            ›
          </button>
        </nav>
      </div>

      {withRefine && (
        // The instruction persists across generations; it is never reset.
        <input
          type="text"
          className="generation-control__refine"
          aria-label="Adjustment for the next version"
          placeholder="e.g. shorter, more formal"
          value={refinement}
          onChange={(event) => setRefinement(event.target.value)}
        />
      )}
    </div>
  );
}
