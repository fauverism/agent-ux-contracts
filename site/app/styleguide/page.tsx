import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/PageShell';
import { ConstraintBadge, type ConstraintLevel } from '@/components/ConstraintBadge';
import { PatternID } from '@/components/PatternID';
import { RuleDivider } from '@/components/RuleDivider';
import { Prose } from '@/components/Prose';

// Review route. Hidden: not linked from anywhere, excluded from indexing.
export const metadata: Metadata = {
  title: 'Styleguide',
  robots: { index: false, follow: false },
};

function Swatch({ name, token, note }: { name: string; token: string; note: string }) {
  return (
    <div className="border border-line">
      <div className="h-14 border-b border-line" style={{ background: `var(${token})` }} />
      <div className="p-2 font-mono">
        <div className="text-xs font-medium">{name}</div>
        <div className="text-[11px] leading-4 text-ink-45">
          {token} — {note}
        </div>
      </div>
    </div>
  );
}

function ScaleStep({ step, px, leading }: { step: string; px: string; leading: string }) {
  return (
    <div className="flex items-baseline gap-6 border-b border-line py-2">
      <span className="w-32 shrink-0 font-mono text-[11px] leading-4 text-ink-45">
        {step} · {px}/{leading}
      </span>
      <span
        className="font-text"
        style={{ fontSize: `var(--step-${step})`, lineHeight: `var(--leading-${step})` }}
      >
        Render progressively as tokens arrive
      </span>
    </div>
  );
}

const LEVELS: ConstraintLevel[] = ['MUST', 'MUST_NOT', 'SHOULD', 'SHOULD_NOT', 'MAY'];

/** A compact composite rendered twice, once per forced mode. */
function ModePanel({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div data-theme={mode} className="border border-line bg-paper p-6 text-ink">
      <p className="pattern-id text-ink-45">{mode} — forced via data-theme</p>
      <h3 className="mt-3 font-text" style={{ fontSize: 'var(--step-2)', lineHeight: 'var(--leading-2)' }}>
        Streaming Response
      </h3>
      <p className="mt-1 font-text" style={{ maxWidth: '40ch' }}>
        Render model output progressively as tokens arrive, keeping the page
        readable, interruptible, and accessible while content is in flight.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LEVELS.map((level) => (
          <ConstraintBadge key={level} level={level} />
        ))}
      </div>
      <p className="mt-4 font-mono text-sm">
        <PatternID id="streaming-response" />{' '}
        <span className="text-ink-45">v0.2.1 · output</span>
      </p>
      <p className="mt-2 font-text">
        Links are ink,{' '}
        <a href="#top" className="underline decoration-ink-45 underline-offset-2 hover:text-accent hover:decoration-current">
          accent on hover only
        </a>
        .
      </p>
    </div>
  );
}

export default function Styleguide() {
  return (
    <PageShell
      nav={
        <a href="/styleguide/" aria-current="page">
          styleguide
        </a>
      }
    >
      <Prose>
        <h1>Design foundation</h1>
        <p>
          A field manual, not a product page. Separation comes from rules and
          borders. One accent, four sanctioned placements. Everything below is
          a token or a primitive — review this before any pages exist.
        </p>
      </Prose>

      <RuleDivider label="01 · palette" />

      <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        <Swatch name="paper" token="--paper" note="warm, not white" />
        <Swatch name="paper-raised" token="--paper-raised" note="code, insets" />
        <Swatch name="ink" token="--ink" note="warm near-black" />
        <Swatch name="accent" token="--accent" note="the stamp" />
        <Swatch name="ink-70" token="--ink-70" note="SHOULD level" />
        <Swatch name="ink-45" token="--ink-45" note="MAY level" />
        <Swatch name="line" token="--line" note="hairline rules" />
        <Swatch name="line-strong" token="--line-strong" note="masthead, heads" />
      </div>

      <p className="mb-2 mt-8 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
        extended palette — categorical marks, light-dark() pairs
      </p>
      <div className="grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-7">
        <Swatch name="grey" token="--c-grey" note="neutral mark" />
        <Swatch name="purple" token="--c-purple" note="mark" />
        <Swatch name="fuschia" token="--c-fuschia" note="mark" />
        <Swatch name="blue" token="--c-blue" note="mark" />
        <Swatch name="green" token="--c-green" note="mark" />
        <Swatch name="orange" token="--c-orange" note="mark" />
        <Swatch name="yellow" token="--c-yellow" note="mark" />
      </div>

      <div className="mt-8 max-w-3xl space-y-2 font-mono text-sm">
        <p className="flex items-baseline gap-3">
          <ConstraintBadge level="MUST" />
          <span>
            accent appears only on: MUST badges, active nav, link hover, the
            subscribe affordance.
          </span>
        </p>
        <p className="flex items-baseline gap-3">
          <ConstraintBadge level="MUST_NOT" />
          <span>
            gradients as decoration, glassmorphism, drop-shadow cards, pills,
            emoji in UI.
          </span>
        </p>
        <p className="flex items-baseline gap-3">
          <ConstraintBadge level="MUST" />
          <span>grays derive from ink via color-mix — no third palette.</span>
        </p>
      </div>

      <RuleDivider label="02 · typography" />

      <Prose>
        <p>
          <strong>Implemented:</strong> Google Sans Code (text voice — business
          geometric sans, variable weight, modern editorial character) with
          Google Sans Code (content voice — pattern ids, contract excerpts,
          constraint rules).{' '}
          <strong>Alternative considered:</strong> IBM Plex Mono + JetBrains
          Mono — sturdier but more anonymous; JetBrains Mono reads "IDE",
          Plex reads "printed spec".
        </p>
      </Prose>

      <div className="mt-6 max-w-3xl">
        {(
          [
            ['5', '48.8px', '56px'],
            ['4', '39.1px', '48px'],
            ['3', '31.3px', '40px'],
            ['2', '25px', '32px'],
            ['1', '20px', '28px'],
            ['0', '16px', '28px'],
            ['-1', '12.8px', '20px'],
          ] as const
        ).map(([step, px, leading]) => (
          <ScaleStep key={step} step={step} px={px} leading={leading} />
        ))}
        <p className="mt-2 font-mono text-[11px] leading-4 text-ink-45">
          ratio 1.25 · line heights snap to the 4px baseline grid
        </p>
      </div>

      <div
        className="mt-8 max-w-3xl border border-line p-6"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, color-mix(in oklab, var(--ink) 10%, transparent) 0 1px, transparent 1px 0.25rem)',
          backgroundOrigin: 'content-box',
        }}
      >
        <Prose>
          <p style={{ marginBottom: 0 }}>
            Body text on the visible 4px grid: a 16px Google Sans Code line on
            a 28px rhythm. The mono voice interleaves —{' '}
            <code>partial-output-preserved</code> — without breaking the
            baseline. Prose measures 65–75ch; this paragraph sits at the
            68ch default.
          </p>
        </Prose>
      </div>

      <div className="mt-8 max-w-3xl">
        <p className="mb-2 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
          mono as content voice — contract excerpt
        </p>
        <pre className="overflow-x-auto border border-line bg-paper-raised p-5 font-mono text-sm leading-5">
          {`{
  "id": "streaming-response",
  "level": "MUST",
  "statement": "Partial output remains visible and selectable
                after a stop; it is never cleared."
}`}
        </pre>
      </div>

      <RuleDivider label="03 · primitives" />

      <div className="max-w-3xl space-y-10">
        <div>
          <p className="mb-3 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
            ConstraintBadge — printed stamps, MUST_NOT is the filled form
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((level) => (
              <ConstraintBadge key={level} level={level} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
            PatternID — copy stays lowercase; small caps are visual only
          </p>
          <Prose>
            <p style={{ marginBottom: 0 }}>
              The boundary between <PatternID id="interruption-cancel" /> and{' '}
              <PatternID id="streaming-response" /> is side effects: cancel
              work, not text.
            </p>
          </Prose>
        </div>

        <div>
          <p className="mb-3 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
            RuleDivider — hairline / strong / double / labeled
          </p>
          <RuleDivider />
          <RuleDivider variant="strong" />
          <RuleDivider variant="double" />
          <RuleDivider label="anatomy" />
        </div>

        <div>
          <p className="mb-3 font-mono text-[11px] leading-4 uppercase tracking-wider text-ink-45">
            Prose — headings, lists, code, quote, table
          </p>
          <div className="border border-line p-6">
            <Prose>
              <h2>When to use it</h2>
              <p>
                Model responses arrive over seconds, not milliseconds. Showing
                nothing until completion makes the product feel broken; showing
                everything as it arrives makes it feel alive — if the page
                stays <a href="#top">readable and interruptible</a>.
              </p>
              <h3>The contract requires</h3>
              <ul>
                <li>a visible stop control while content is in flight</li>
                <li>
                  partial output preserved after <code>stop()</code> — never
                  cleared
                </li>
                <li>completion announced to assistive technology</li>
              </ul>
              <blockquote>
                <p>
                  Design systems for humans are documentation; design systems
                  for agents are contracts.
                </p>
              </blockquote>
              <table>
                <thead>
                  <tr>
                    <th>Constraint</th>
                    <th>Level</th>
                    <th>Test</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>focus-not-lost</td>
                    <td>MUST</td>
                    <td>focus recovery when stop control unmounts</td>
                  </tr>
                  <tr>
                    <td>token-batching</td>
                    <td>MAY</td>
                    <td>rAF batcher keeps reference assertions green</td>
                  </tr>
                </tbody>
              </table>
            </Prose>
          </div>
        </div>
      </div>

      <RuleDivider label="04 · both modes" />

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <ModePanel mode="light" />
        <ModePanel mode="dark" />
      </div>
    </PageShell>
  );
}
