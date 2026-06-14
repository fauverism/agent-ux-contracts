import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { Prose } from '@/components/Prose';
import { ContactTable } from '@/components/ContactTable';
import { REPO } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why AI interface patterns are shipped as machine-readable contracts with tests, not documentation.',
};

export default function About() {
  return (
    <PageShell current="about">
      <Prose>
        <h1>About</h1>
        <p>
          Coding agents now write a large share of interface code, and they
          cannot read a styleguide. A pattern that lives as prose and
          screenshots is invisible to the tool doing the work. This catalog
          takes the opposite bet: every pattern is a contract — RFC-2119
          constraints (<code>MUST</code>, <code>MUST_NOT</code>,{' '}
          <code>SHOULD</code>, <code>MAY</code>) in JSON, validated against a
          schema, with every MUST mapped to a named test.
        </p>
        <p>
          Humans get the same material as a manual: the problem, when to use
          it and when not to, anatomy, states, and the constraints set out
          like clauses in a standard. Agents get the raw contract over MCP,
          plus a scaffold tool that emits the reference implementation with a
          compliance note anchoring every rule to the code that satisfies it.
        </p>

        <h2>Conventions</h2>
        <ul>
          <li>
            Ten patterns across five categories: input, output, control,
            transparency, feedback. Scope is capped on purpose.
          </li>
          <li>
            Every constraint is testable, or it is downgraded — untestable
            tone rules stay at SHOULD_NOT and are flagged as copy review, not
            code assertions.
          </li>
          <li>
            Reference implementations in React and vanilla JS, each with a
            COMPLIANCE.md mapping constraint to test. 242 tests run on every
            change.
          </li>
          <li>
            Contracts are versioned and content-hashed; retrieval vocabulary
            (aliases, tags) is contract surface, so search misses are fixed
            with contract patches, not ranking hacks.
          </li>
        </ul>

        <h2>Authoring</h2>
        <p>
          New patterns follow a mechanical procedure —{' '}
          <a href={`${REPO}/blob/main/patterns/TEMPLATE.md`}>
            patterns/TEMPLATE.md
          </a>{' '}
          — six steps with checklist gates, starting from a scaffold that
          intentionally fails validation until completed. The validator is
          the checklist.
        </p>

        <h2>Contact</h2>
        <p>
          Three doors, all of them real. Pick the one that fits and
          you&rsquo;ll hear back from a person.
        </p>
      </Prose>
      <ContactTable />
      <Prose>
        <h2 style={{ marginTop: '3rem' }}>Colophon</h2>
        <p>
          Built with Next.js as a static export; the pages are generated from
          the same <code>pattern.contract.json</code> files the MCP server
          reads. Set in Google Sans Code. Source on{' '}
          <a href={REPO}>GitHub</a>. There&rsquo;s an{' '}
          <a href="/feed.xml">RSS feed</a> for new patterns.
        </p>
      </Prose>
    </PageShell>
  );
}
