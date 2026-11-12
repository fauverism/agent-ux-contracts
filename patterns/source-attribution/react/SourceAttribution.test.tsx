import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import {
  CitationAnchor,
  SourceList,
  UncitedPassage,
  consolidateSources,
} from './SourceAttribution';
import type { Source } from './SourceAttribution';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const SOURCES: Source[] = [
  { id: 'a', title: 'Alpha Article', url: 'https://example.com/a', publisher: 'Test Pub' },
  { id: 'b', title: 'Beta Report', url: 'https://example.com/b', publishedAt: '2024-01-15' },
];

test('citation-clickable: CitationAnchor renders an <a> element with an href', () => {
  const { container } = render(
    <CitationAnchor index={1} source={SOURCES[0]} />,
  );
  const link = container.querySelector('a');
  assert.ok(link, 'anchor element present');
  assert.equal(link!.href, SOURCES[0].url);
  assert.ok(link!.closest('sup'), 'wrapped in superscript');
});

test('citation-clickable: CitationAnchor link has descriptive aria-label', () => {
  const { container } = render(
    <CitationAnchor index={2} source={SOURCES[1]} />,
  );
  const link = container.querySelector('a')!;
  assert.match(link.getAttribute('aria-label')!, /Source 2/);
  assert.match(link.getAttribute('aria-label')!, /Beta Report/);
});

test('citation-clickable: the anchor is a focusable link in the tab order, with no hover-only path', () => {
  const { container } = render(<CitationAnchor index={1} source={SOURCES[0]} />);
  const link = container.querySelector('a')!;
  assert.equal(link.getAttribute('href'), SOURCES[0].url, 'a real href: Enter activates it');
  assert.ok(link.tabIndex >= 0, 'in the tab order');
  assert.ok(!link.closest('[hidden]') && !link.closest('[aria-hidden="true"]'));
  link.focus();
  assert.ok(document.activeElement === link, 'focusable');
  // Nothing about the source depends on hovering: no title-only tooltip.
  assert.equal(link.getAttribute('title'), null);
});

test('citation-distinct: the anchor is distinguishable without color and named for assistive technology', () => {
  const { container } = render(
    <p>
      The sky is blue
      <CitationAnchor index={2} source={SOURCES[1]} />.
    </p>,
  );
  const link = container.querySelector('a')!;
  // Structure, not color: superscript + bracketed number inside the prose.
  assert.equal(link.parentElement!.tagName, 'SUP');
  assert.equal(link.textContent, '[2]');
  assert.equal(link.getAttribute('style'), null, 'no inline color carrying the meaning');
  // And an accessible name that says what it is.
  assert.equal(link.getAttribute('aria-label'), 'Source 2: Beta Report');
});

test('citation-distinct: CitationAnchor renders bracketed index, not plain text', () => {
  const { container } = render(
    <CitationAnchor index={3} source={SOURCES[0]} />,
  );
  const link = container.querySelector('a')!;
  assert.equal(link.textContent, '[3]');
  assert.ok(container.querySelector('sup'), 'superscript element present');
});

test('consolidated-numbering: with duplicates, list entries and positions follow the consolidated order', () => {
  const duped: Source[] = [
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
    { id: 'b', title: 'Beta', url: 'https://example.com/b' },
    { id: 'a', title: 'Alpha again', url: 'https://example.com/a' },
  ];
  const consolidated = consolidateSources(duped);
  const { container } = render(<SourceList sources={duped} />);
  const items = [...container.querySelectorAll('li')];
  assert.equal(items.length, consolidated.length, 'one entry per unique source');
  // The rendered order IS the consolidated order — an anchor numbered from
  // consolidateSources() resolves to the matching list entry, so repeated
  // citations of one source share one index.
  consolidated.forEach((source, i) => {
    assert.equal(items[i].id, `source-${source.id}`, `position ${i + 1} matches consolidated order`);
  });
});

test('consolidated-numbering: an anchor numbered from the consolidated list points at that position in the rendered list', () => {
  // Three claims, two sources: the first and third cite the same source.
  const cited: Source[] = [
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
    { id: 'b', title: 'Beta', url: 'https://example.com/b' },
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
  ];
  const consolidated = consolidateSources(cited);
  const indexOf = (id: string) => consolidated.findIndex((source) => source.id === id) + 1;

  const { container } = render(
    <div>
      <p>
        {cited.map((source, i) => (
          <CitationAnchor key={i} index={indexOf(source.id)} source={source} />
        ))}
      </p>
      <SourceList sources={cited} />
    </div>,
  );
  const anchors = [...container.querySelectorAll('sup a')];
  const entries = [...container.querySelectorAll('li')];

  assert.deepEqual(anchors.map((a) => a.textContent), ['[1]', '[2]', '[1]'], '1-based; repeats share one index');
  assert.equal(entries.length, 2, 'and one list entry');
  anchors.forEach((anchor, i) => {
    const n = Number(anchor.textContent!.slice(1, -1));
    const entry = entries[n - 1];
    assert.equal(entry.id, `source-${cited[i].id}`, `anchor ${anchor.textContent} is entry ${n} of the list`);
    assert.equal(
      entry.querySelector('a')!.getAttribute('href'),
      anchor.getAttribute('href'),
      'anchor and entry link to the same source',
    );
    assert.match(entry.textContent!, new RegExp(`Source ${n} of 2`));
  });
});

test('no-citation-spam: consolidateSources removes duplicates, preserving first-seen order', () => {
  const duped: Source[] = [
    { id: 'a', title: 'First A', url: 'https://example.com/a' },
    { id: 'b', title: 'B', url: 'https://example.com/b' },
    { id: 'a', title: 'Second A (duplicate)', url: 'https://example.com/a2' },
  ];
  const result = consolidateSources(duped);
  assert.equal(result.length, 2, 'duplicate removed');
  assert.equal(result[0].id, 'a');
  assert.equal(result[0].title, 'First A', 'first-seen wins');
  assert.equal(result[1].id, 'b');
});

test('no-citation-spam: SourceList deduplicates sources automatically', () => {
  const duped: Source[] = [
    ...SOURCES,
    { id: 'a', title: 'Alpha duplicate', url: 'https://example.com/a' },
  ];
  const { container } = render(<SourceList sources={duped} />);
  const items = container.querySelectorAll('li');
  assert.equal(items.length, 2, 'only unique sources listed');
});

test('source-verifiable: anchors and list entries link straight to the source URL, unmasked', () => {
  const sources: Source[] = [
    { id: 'a', title: 'Alpha Article', url: 'https://example.com/a?ref=1#section-2' },
    { id: 'b', title: 'Beta Report', url: 'https://reports.example.org/beta.pdf' },
  ];
  const { container } = render(
    <div>
      {sources.map((source, i) => (
        <CitationAnchor key={source.id} index={i + 1} source={source} />
      ))}
      <SourceList sources={sources} />
    </div>,
  );
  const anchorLinks = [...container.querySelectorAll('sup a')];
  const entryLinks = [...container.querySelectorAll('li a')];
  assert.equal(anchorLinks.length, 2);
  assert.equal(entryLinks.length, 2, 'every list entry is a link');
  sources.forEach((source, i) => {
    // getAttribute: the literal href, not a resolved or rewritten one. No
    // redirector, no tracking wrapper — the reader can check the source itself.
    assert.equal(anchorLinks[i].getAttribute('href'), source.url);
    assert.equal(entryLinks[i].getAttribute('href'), source.url);
    assert.equal(entryLinks[i].textContent, source.title, 'entry link is named by the source title');
    for (const link of [anchorLinks[i], entryLinks[i]]) {
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
      assert.equal(link.getAttribute('onclick'), null);
    }
  });
});

test('source-verifiable: SourceList renders links with publisher and date metadata', () => {
  const { container } = render(<SourceList sources={SOURCES} />);
  // publisher
  assert.match(container.textContent!, /Test Pub/);
  // date in a time element
  const time = container.querySelector('time');
  assert.ok(time, 'time element present for publishedAt');
  assert.equal(time!.getAttribute('dateTime'), '2024-01-15');
});

test('source-verifiable: SourceList renders accessible section heading', () => {
  const { container } = render(<SourceList sources={SOURCES} label="References" />);
  const section = container.querySelector('section');
  assert.ok(section, 'section element present');
  assert.equal(section!.getAttribute('aria-label'), 'References');
  const heading = container.querySelector('h2');
  assert.ok(heading, 'h2 heading present');
  assert.equal(heading!.textContent, 'References');
});

test('source-verifiable: SourceList renders nothing when sources array is empty', () => {
  const { container } = render(<SourceList sources={[]} />);
  assert.equal(container.firstChild, null, 'nothing rendered for empty sources');
});

test('UncitedPassage: renders children with the uncited label', () => {
  const { container } = render(
    <UncitedPassage label="Model reasoning — no source">
      This is inferred.
    </UncitedPassage>,
  );
  const span = container.querySelector('.source-attribution__uncited');
  assert.ok(span, 'uncited wrapper present');
  assert.equal(span!.getAttribute('data-cited'), 'false');
  const labelEl = container.querySelector('.source-attribution__uncited-label');
  assert.ok(labelEl, 'label element present');
  assert.match(labelEl!.textContent!, /Model reasoning/);
});

test('axe: CitationAnchor has no WCAG A/AA violations', async () => {
  const { container } = render(<CitationAnchor index={1} source={SOURCES[0]} />);
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations, [], result.violations.map((v) => v.id).join(', '));
});

test('axe: SourceList has no WCAG A/AA violations', async () => {
  const { container } = render(<SourceList sources={SOURCES} />);
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations, [], result.violations.map((v) => v.id).join(', '));
});

test('axe: UncitedPassage and a full cited answer have no WCAG A/AA violations', async () => {
  const uncited = render(
    <p>
      <UncitedPassage>This part is inferred.</UncitedPassage>
    </p>,
  );
  let result = await axe.run(uncited.container, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], 'uncited: axe violations');
  uncited.unmount();

  // The pieces together, as a host composes them: prose with anchors, an
  // uncited passage, and the consolidated list.
  const cited = render(
    <article>
      <p>
        A grounded claim
        <CitationAnchor index={1} source={SOURCES[0]} /> and another
        <CitationAnchor index={2} source={SOURCES[1]} />.{' '}
        <UncitedPassage>And an inference.</UncitedPassage>
      </p>
      <SourceList sources={SOURCES} />
    </article>,
  );
  result = await axe.run(cited.container, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], 'cited: axe violations');
});
