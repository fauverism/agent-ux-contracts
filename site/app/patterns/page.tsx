import { PageShell } from '@/components/PageShell';
import { PatternIndexTable } from '@/components/PatternIndexTable';
import { getAllPatterns } from '@/lib/patterns';

// /patterns/ is the most guessable URL on the site; before this page existed
// it 404'd, reachable only by typing or deep-linking (nav "Patterns" points
// at the homepage index). Render the same index here.
export const metadata = {
  title: 'Pattern index',
};

export default function PatternsIndex() {
  const patterns = getAllPatterns();

  return (
    <PageShell current="patterns">
      <h1 className="thesis">Pattern index</h1>

      <p className="mt-8 max-w-[68ch] font-text intro-copy">
        All {patterns.length} contracts, by id. Each pattern page carries the
        human manual and the machine-readable contract it was generated from.
      </p>

      <section aria-labelledby="index-head" className="mt-12">
        <h2
          id="index-head"
          className="border-b-2 border-line-strong pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70"
        >
          Pattern index — {patterns.length} contracts
        </h2>
        <PatternIndexTable patterns={patterns} />
      </section>
    </PageShell>
  );
}
