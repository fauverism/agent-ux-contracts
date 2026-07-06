import type { Metadata } from 'next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageShell } from '@/components/PageShell';
import { ConstraintBadge } from '@/components/ConstraintBadge';
import { PatternID } from '@/components/PatternID';
import { RuleDivider } from '@/components/RuleDivider';
import { Prose } from '@/components/Prose';
import { ViewToggle } from '@/components/ViewToggle';
import { SubscribeBlock } from '@/components/SubscribeBlock';
import { RevStamp } from '@/components/RevStamp';
import { AdoptSection } from '@/components/AdoptSection';
import { PatternDemo, hasDemo } from '@/components/demos';
import { getPattern, getPatternIds, type Pattern } from '@/lib/patterns';
import { highlightJson } from '@/lib/highlight';
import { REPO } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getPatternIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { contract } = getPattern(id);
  return { title: contract.name, description: contract.summary };
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 border-b border-line pb-1 font-mono text-[11px] font-semibold uppercase leading-4 tracking-wider text-ink-70">
      {children}
    </h2>
  );
}

function HumanView({ pattern }: { pattern: Pattern }) {
  const { contract, doc } = pattern;
  return (
    <div>
      {hasDemo(contract.id) && (
        <>
          <SectionHead>Live demo</SectionHead>
          <PatternDemo id={contract.id} />
        </>
      )}

      <Prose>
        <Markdown remarkPlugins={[remarkGfm]}>{doc}</Markdown>
      </Prose>

      <SectionHead>Use when / don&rsquo;t use when</SectionHead>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 mt-3 font-mono text-xs font-semibold uppercase tracking-wider">
            Use when
          </p>
          <ul className="max-w-[68ch] list-[square] pl-5">
            {contract.useWhen.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 mt-3 font-mono text-xs font-semibold uppercase tracking-wider">
            Don&rsquo;t use when
          </p>
          <ul className="max-w-[68ch] list-[square] pl-5 text-ink-70">
            {contract.dontUseWhen.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionHead>Constraints — the contract</SectionHead>
      <ol className="clause-list">
        {contract.constraints.map((constraint) => (
          <li key={constraint.id} className="clause">
            <div className="clause-body">
              <div className="clause-head">
                <span className="clause-id">{constraint.id}</span>
                <ConstraintBadge level={constraint.level} />
                <span className="font-mono text-xs text-ink-45">
                  {constraint.category}
                </span>
              </div>
              <p className="clause-statement">{constraint.statement}</p>
              <p className="clause-rationale">{constraint.rationale}</p>
              <p className="clause-verification">
                Verification: {constraint.verification}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <SectionHead>Anatomy</SectionHead>
      <Prose>
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {contract.anatomy.map((part) => (
              <tr key={part.id}>
                <td>{part.id}</td>
                <td>{part.required ? 'yes' : 'no'}</td>
                <td>{part.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Prose>

      <SectionHead>States</SectionHead>
      <Prose>
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th>Transitions to</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {contract.states.map((state) => (
              <tr key={state.id}>
                <td>
                  {state.id}
                  {state.initial ? ' (initial)' : ''}
                </td>
                <td>{state.transitionsTo?.join(', ') ?? '— terminal'}</td>
                <td>{state.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Prose>

      <SectionHead>Accessibility</SectionHead>
      <Prose>
        <table>
          <thead>
            <tr>
              <th>WCAG</th>
              <th>Level</th>
              <th>Relevance</th>
            </tr>
          </thead>
          <tbody>
            {contract.accessibility.wcagCriteria.map((criterion) => (
              <tr key={criterion.criterion}>
                <td>
                  {criterion.criterion} {criterion.name}
                </td>
                <td>{criterion.level}</td>
                <td>{criterion.relevance}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>Keys</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {contract.accessibility.keyboard.map((binding) => (
              <tr key={binding.keys}>
                <td>{binding.keys}</td>
                <td>{binding.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Focus management.</strong>{' '}
          {contract.accessibility.focusManagement}
        </p>
        <p>
          <strong>Reduced motion.</strong>{' '}
          {contract.accessibility.reducedMotion}
        </p>
      </Prose>

      <SectionHead>Guidance</SectionHead>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 mt-3 font-mono text-xs font-semibold uppercase tracking-wider">
            Do
          </p>
          <ul className="max-w-[68ch] list-[square] pl-5">
            {contract.guidance.do.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 mt-3 font-mono text-xs font-semibold uppercase tracking-wider">
            Don&rsquo;t
          </p>
          <ul className="max-w-[68ch] list-[square] pl-5 text-ink-70">
            {contract.guidance.dont.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionHead>Adopt this pattern</SectionHead>
      <AdoptSection pattern={pattern} />

      {contract.references.length > 0 && (
        <>
          <SectionHead>References</SectionHead>
          <Prose>
            <ul>
              {contract.references.map((reference) => (
                <li key={reference.url}>
                  <a href={reference.url}>{reference.title}</a>
                </li>
              ))}
            </ul>
          </Prose>
        </>
      )}
    </div>
  );
}

export default async function PatternPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pattern = getPattern(id);
  const { contract } = pattern;

  return (
    <PageShell current="patterns">
      <div className="pattern-layout">
        <article>
          <header className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs text-ink-45">
                <a href="/#patterns" className="text-ink-45 hover:text-accent">
                  index
                </a>{' '}
                / <PatternID id={contract.id} />
              </p>
              <h1
                className="mt-2 font-text font-medium"
                style={{ fontSize: 'var(--step-4)', lineHeight: 'var(--leading-4)' }}
              >
                {contract.name}
              </h1>
              <p className="mt-2 max-w-[68ch] text-ink-70">{contract.summary}</p>
            </div>
            <RevStamp id={contract.id} version={contract.version} size="lg" />
          </header>

          <RuleDivider variant="strong" />

          <ViewToggle
            human={<HumanView pattern={pattern} />}
            agent={
              <div>
                <p className="mb-3 max-w-[68ch] font-mono text-xs text-ink-45">
                  pattern.contract.json — what an agent receives. sha256{' '}
                  {pattern.contractHash.slice(0, 12)}…
                </p>
                <pre className="agent-json">
                  <code>{highlightJson(pattern.rawJson)}</code>
                </pre>
              </div>
            }
          />

          {/* End of the manual entry: the one ask, set apart by its rule. */}
          <SubscribeBlock id={`subscribe-${contract.id}`} />
        </article>

        <aside className="pattern-rail" aria-label="Pattern metadata">
          <dl>
            <dt>Version</dt>
            <dd>{contract.version}</dd>
            <dt>Contract hash</dt>
            <dd title={pattern.contractHash}>
              {pattern.contractHash.slice(0, 16)}…
            </dd>
            <dt>Category</dt>
            <dd>{contract.category}</dd>
            <dt>Status</dt>
            <dd>{contract.status}</dd>
            <dt>Frameworks</dt>
            <dd>{contract.implementations.join(', ')}</dd>
            <dt>Constraints</dt>
            <dd>
              {contract.constraints.length} total ·{' '}
              {contract.constraints.filter((c) => c.level.startsWith('MUST')).length}{' '}
              MUST
            </dd>
            {contract.relatedPatterns.length > 0 && (
              <>
                <dt>Related</dt>
                <dd>
                  {contract.relatedPatterns.map((related, index) => (
                    <span key={related}>
                      {index > 0 && ', '}
                      <a
                        href={`/patterns/${related}/`}
                        className="text-ink-70 underline hover:text-accent"
                      >
                        {related}
                      </a>
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>Source</dt>
            <dd>
              <a
                href={`${REPO}/tree/main/patterns/${contract.id}`}
                className="text-ink-70 underline hover:text-accent"
              >
                patterns/{contract.id}
              </a>
            </dd>
          </dl>
        </aside>
      </div>
    </PageShell>
  );
}
