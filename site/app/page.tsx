import { PageShell } from '@/components/PageShell';
import { PatternIndexTable } from '@/components/PatternIndexTable';
import { PlainLanguageIndex } from '@/components/PlainLanguageIndex';
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

      <p className="mt-8 max-w-[68ch] font-text intro-copy">
        Every pattern here is a machine-readable contract — RFC-2119
        constraints with tests — plus reference implementations in React and
        vanilla JS, and an MCP server so coding agents can search the catalog
        and scaffold known-compliant code. Humans read the manual; agents read
        the contracts. Same rules. <a href="/getting-started/">Getting started</a> will guide you through connecting the server to Claude Code and scaffolding your first pattern. Or, if you just want to dive into the patterns, the index is below.
      </p>

      <section aria-labelledby="plain-head" className="mt-12">
        <h2
          id="plain-head"
          className="border-b-2 border-line-strong pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70"
        >
          What&rsquo;s here, in plain English
        </h2>
        <p className="mt-3 max-w-[68ch] font-text intro-copy">
          No-jargon version: these are {patterns.length} small ideas for
          making AI feel less like a black box — asking before it acts,
          saying how sure it is, showing where an answer came from, and never
          losing your work when something goes wrong. Click any name below
          for the full explanation.
        </p>
        <div className="mt-6">
          <PlainLanguageIndex patterns={patterns} />
        </div>
      </section>

      <section id="patterns" aria-labelledby="index-head" className="mt-12">
        <h2
          id="index-head"
          className="border-b-2 border-line-strong pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70"
        >
          Pattern index — {patterns.length} contracts
        </h2>
        <p className="mt-3 max-w-[68ch] font-text intro-copy text-ink-70">
          The technical version of the same list: category, constraint
          counts, and reference implementations.
        </p>
        <PatternIndexTable patterns={patterns} />
      </section>

      <SubscribeBlock />
    </PageShell>
  );
}
