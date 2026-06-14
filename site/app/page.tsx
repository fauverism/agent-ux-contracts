import { PageShell } from '@/components/PageShell';
import { PatternIndexTable } from '@/components/PatternIndexTable';
import { SubscribeBlock } from '@/components/SubscribeBlock';
import { getAllPatterns } from '@/lib/patterns';

export default function Home() {
  const patterns = getAllPatterns();

  return (
    <PageShell current="patterns">
      {/* Title page of the manual — thesis, not hero. */}
      <h1 className="thesis">
        Design systems for humans are documentation.{' '}
        <em>Design systems for agents are contracts.</em>
      </h1>

      <p className="mt-8 max-w-[68ch] font-text">
        Every pattern here is a machine-readable contract — RFC-2119
        constraints with tests — plus reference implementations in React and
        vanilla JS, and an MCP server so coding agents can search the catalog
        and scaffold known-compliant code. Humans read the manual; agents read
        the contracts. Same rules.
      </p>

      <section id="patterns" aria-labelledby="index-head" className="mt-12">
        <h2
          id="index-head"
          className="border-b-2 border-line-strong pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70"
        >
          Pattern index — {patterns.length} contracts
        </h2>
        <PatternIndexTable patterns={patterns} />
      </section>

      <SubscribeBlock />
    </PageShell>
  );
}
