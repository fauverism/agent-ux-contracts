import type { ReactNode } from 'react';

export interface Source {
  /** Stable id; anchors referencing the same id share one source-list entry. */
  id: string;
  title: string;
  url: string;
  publisher?: string;
  /** ISO date string, e.g. "2025-11-04". */
  publishedAt?: string;
  note?: string;
}

/**
 * Removes duplicate sources by id, preserving first-seen order.
 * Constraint `no-citation-spam`: identical claims share one entry.
 */
export function consolidateSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

export interface CitationAnchorProps {
  /** 1-based position in the consolidated source list. */
  index: number;
  source: Source;
}

/**
 * Inline citation marker. A real link (keyboard-operable, focusable) rendered
 * as a superscript bracketed number — distinct from body text without
 * relying on color (constraints: citation-clickable, citation-distinct).
 */
export function CitationAnchor({ index, source }: CitationAnchorProps) {
  return (
    <sup className="source-attribution__anchor">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Source ${index}: ${source.title}`}
      >
        [{index}]
      </a>
    </sup>
  );
}

export interface SourceListProps {
  sources: Source[];
  /** Accessible heading for the list. */
  label?: string;
}

/**
 * Consolidated bibliography. Metadata renders on-page so users judge
 * credibility without leaving (constraint: metadata-available).
 */
export function SourceList({ sources, label = 'Sources' }: SourceListProps) {
  const consolidated = consolidateSources(sources);
  if (consolidated.length === 0) return null;

  return (
    <section className="source-attribution__list" aria-label={label}>
      <h2 className="source-attribution__heading">{label}</h2>
      <ol>
        {consolidated.map((source, i) => (
          <li key={source.id} id={`source-${source.id}`}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
            <span className="source-attribution__meta">
              {source.publisher && <> — {source.publisher}</>}
              {source.publishedAt && (
                <>
                  {' '}
                  (<time dateTime={source.publishedAt}>{source.publishedAt}</time>)
                </>
              )}
            </span>
            {source.note && <p className="source-attribution__note">{source.note}</p>}
            <span className="sr-only">{`Source ${i + 1} of ${consolidated.length}`}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface UncitedPassageProps {
  children: ReactNode;
  /** Label explaining why this passage carries no citation. */
  label?: string;
}

/**
 * Wrapper for reasoning/generation passages with no retrieval grounding
 * (constraint: uncited-labeled).
 */
export function UncitedPassage({
  children,
  label = 'Model reasoning — no source',
}: UncitedPassageProps) {
  return (
    <span className="source-attribution__uncited" data-cited="false">
      {children}
      <span className="source-attribution__uncited-label">{label}</span>
    </span>
  );
}
