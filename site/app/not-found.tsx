import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { PatternIndexTable } from '@/components/PatternIndexTable';
import { getAllPatterns } from '@/lib/patterns';
import { ISSUE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: '404',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const patterns = getAllPatterns();
  return (
    <PageShell>
      <p className="font-mono text-xs uppercase tracking-wider text-ink-45">
        404 — no such page
      </p>
      <h1
        className="mt-2 max-w-[28ch] font-text font-medium"
        style={{ fontSize: 'var(--step-4)', lineHeight: 'var(--leading-4)' }}
      >
        This pattern doesn&rsquo;t exist. Yet?
      </h1>
      <p className="mt-4 max-w-[68ch]">
        If you typed an id, check the spelling against the index below. If you
        followed a link here, that&rsquo;s a problem on my end —{' '}
        <a
          href={ISSUE_URL}
          className="underline decoration-ink-45 underline-offset-2 hover:text-accent"
        >
          tell me
        </a>
        . And if you think this page <em>should</em> be a pattern, that&rsquo;s
        the most interesting case of the three: open an issue and make the
        argument.
      </p>

      <h2 className="mt-12 border-b-2 border-line-strong pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70">
        Everything that does exist — {patterns.length} contracts
      </h2>
      <PatternIndexTable patterns={patterns} />
    </PageShell>
  );
}
