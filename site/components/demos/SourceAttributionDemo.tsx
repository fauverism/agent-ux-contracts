'use client';

import {
  CitationAnchor,
  SourceList,
  UncitedPassage,
  consolidateSources,
  type Source,
} from '@patterns/source-attribution/react/SourceAttribution';

const RAW_SOURCES: Source[] = [
  {
    id: 'q3-report',
    title: 'Q3 2026 Revenue Report',
    url: 'https://example.com/reports/q3-2026',
    publisher: 'Example Corp IR',
    publishedAt: '2026-10-14',
  },
  {
    id: 'earnings-call',
    title: 'Q3 Earnings Call Transcript',
    url: 'https://example.com/transcripts/q3-2026',
    publisher: 'Example Corp IR',
  },
  // Deliberate duplicate: two claims cite the same report, one entry renders.
  {
    id: 'q3-report',
    title: 'Q3 2026 Revenue Report',
    url: 'https://example.com/reports/q3-2026',
  },
];

const SOURCES = consolidateSources(RAW_SOURCES);
const byId = (id: string) => SOURCES.find((s) => s.id === id)!;
const indexOf = (id: string) => SOURCES.findIndex((s) => s.id === id) + 1;

export function SourceAttributionDemo() {
  return (
    <div>
      <p style={{ marginTop: 0 }}>
        Revenue grew 12% in Q3
        <CitationAnchor index={indexOf('q3-report')} source={byId('q3-report')} />, with services
        the fastest-growing segment
        <CitationAnchor index={indexOf('earnings-call')} source={byId('earnings-call')} />. Margins
        also improved
        <CitationAnchor index={indexOf('q3-report')} source={byId('q3-report')} />.{' '}
        <UncitedPassage>
          This likely reflects seasonal demand rather than a durable shift.
        </UncitedPassage>
      </p>
      <SourceList sources={SOURCES} />
      <p className="demo-note">
        Three anchors, two sources: repeated citations share an index instead of
        padding the list. The unsourced sentence is labeled as reasoning rather
        than borrowing credibility from its neighbors.
      </p>
    </div>
  );
}
