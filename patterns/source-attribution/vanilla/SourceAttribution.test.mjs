import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SourceAttribution, consolidateSources } from './SourceAttribution.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const SOURCES = [
  { id: 'a', title: 'Alpha Article', url: 'https://example.com/a', publisher: 'Test Pub' },
  { id: 'b', title: 'Beta Report', url: 'https://example.com/b', publishedAt: '2024-01-15' },
];

test('citation-clickable: createAnchor returns a sup containing an <a> with href', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  const anchor = sa.createAnchor('a');
  assert.ok(anchor.tagName === 'SUP', 'superscript element');
  const link = anchor.querySelector('a');
  assert.ok(link, 'anchor element inside sup');
  assert.equal(link.href, SOURCES[0].url);
});

test('citation-clickable: anchor has aria-label with index and title', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  const anchor = sa.createAnchor('a');
  const link = anchor.querySelector('a');
  assert.match(link.getAttribute('aria-label'), /Source 1/);
  assert.match(link.getAttribute('aria-label'), /Alpha Article/);
});

test('citation-distinct: anchor text is bracketed index', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  const anchor = sa.createAnchor('b');
  const link = anchor.querySelector('a');
  assert.equal(link.textContent, '[2]');
  assert.ok(anchor.tagName === 'SUP', 'superscript wrapping');
});

test('no-citation-spam: consolidateSources removes duplicates preserving first-seen', () => {
  const duped = [
    { id: 'a', title: 'First A', url: 'https://example.com/a' },
    { id: 'b', title: 'B', url: 'https://example.com/b' },
    { id: 'a', title: 'Duplicate A', url: 'https://example.com/a2' },
  ];
  const result = consolidateSources(duped);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'First A');
});

test('no-citation-spam: constructor deduplicates sources via consolidateSources', () => {
  const sa = new SourceAttribution({
    sources: [
      ...SOURCES,
      { id: 'a', title: 'Alpha duplicate', url: 'https://example.com/a' },
    ],
  });
  sa.renderList(host);
  const items = host.querySelectorAll('li');
  assert.equal(items.length, 2, 'duplicate not listed');
});

test('source-verifiable: renderList includes publisher and date metadata', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  sa.renderList(host);
  assert.match(host.textContent, /Test Pub/);
  const time = host.querySelector('time');
  assert.ok(time, 'time element for publishedAt');
  assert.equal(time.getAttribute('dateTime'), '2024-01-15');
});

test('source-verifiable: renderList renders accessible section with heading', () => {
  const sa = new SourceAttribution({ sources: SOURCES, label: 'References' });
  sa.renderList(host);
  const section = host.querySelector('section.source-attribution__list');
  assert.ok(section, 'section present');
  assert.equal(section.getAttribute('aria-label'), 'References');
  const h2 = host.querySelector('h2');
  assert.ok(h2, 'h2 heading present');
  assert.equal(h2.textContent, 'References');
});

test('source-verifiable: renderList renders nothing for empty sources', () => {
  const sa = new SourceAttribution({ sources: [] });
  sa.renderList(host);
  assert.equal(host.querySelector('section'), null, 'no section for empty sources');
});

test('markUncited: marks element with class and data-cited=false', () => {
  const span = document.createElement('span');
  span.textContent = 'Inferred content.';
  SourceAttribution.markUncited(span, 'Model reasoning — no source');
  assert.ok(span.classList.contains('source-attribution__uncited'));
  assert.equal(span.getAttribute('data-cited'), 'false');
  const labelEl = span.querySelector('.source-attribution__uncited-label');
  assert.ok(labelEl, 'label element appended');
  assert.match(labelEl.textContent, /Model reasoning/);
});

test('consolidated-numbering: duplicate citations share one index and one list entry', () => {
  const duped = [
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
    { id: 'b', title: 'Beta', url: 'https://example.com/b' },
    { id: 'a', title: 'Alpha again', url: 'https://example.com/a' },
  ];
  const sa = new SourceAttribution({ sources: duped });
  const first = sa.createAnchor('a');
  const second = sa.createAnchor('a');
  assert.equal(first.textContent, '[1]');
  assert.equal(second.textContent, '[1]', 'repeat citation of the same source shares the index');
  assert.equal(sa.createAnchor('b').textContent, '[2]');
  sa.renderList(host);
  assert.equal(host.querySelectorAll('li').length, 2, 'one entry per unique source');
});

test('createAnchor: throws for unknown sourceId', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  assert.throws(() => sa.createAnchor('nonexistent'), /unknown source/);
});

test('indexOf: returns 1-based position of source in consolidated list', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  assert.equal(sa.indexOf('a'), 1);
  assert.equal(sa.indexOf('b'), 2);
  assert.equal(sa.indexOf('x'), 0, 'returns 0 for unknown id (findIndex returns -1, +1 = 0)');
});
