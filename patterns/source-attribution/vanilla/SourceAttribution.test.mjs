import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
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

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('citation-clickable: the anchor is a focusable link in the tab order, with no hover-only path', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  host.append(sa.createAnchor('a'));
  const link = host.querySelector('a');
  assert.equal(link.getAttribute('href'), SOURCES[0].url, 'a real href: Enter activates it');
  assert.ok(link.tabIndex >= 0, 'in the tab order');
  assert.ok(!link.closest('[hidden]') && !link.closest('[aria-hidden="true"]'));
  link.focus();
  assert.ok(document.activeElement === link, 'focusable');
  // Nothing about the source depends on hovering: no title-only tooltip.
  assert.equal(link.getAttribute('title'), null);
});

test('citation-distinct: the anchor is distinguishable without color and named for assistive technology', () => {
  const sa = new SourceAttribution({ sources: SOURCES });
  const link = sa.createAnchor('b').querySelector('a');
  // Structure, not color: superscript + bracketed number.
  assert.equal(link.parentElement.tagName, 'SUP');
  assert.equal(link.textContent, '[2]');
  assert.equal(link.getAttribute('style'), null, 'no inline color carrying the meaning');
  // And an accessible name that says what it is.
  assert.equal(link.getAttribute('aria-label'), 'Source 2: Beta Report');
});

test('source-verifiable: anchors and list entries link straight to the source URL, unmasked', () => {
  const sources = [
    { id: 'a', title: 'Alpha Article', url: 'https://example.com/a?ref=1#section-2' },
    { id: 'b', title: 'Beta Report', url: 'https://reports.example.org/beta.pdf' },
  ];
  const sa = new SourceAttribution({ sources });
  sa.renderList(host);
  const entryLinks = [...host.querySelectorAll('li a')];
  assert.equal(entryLinks.length, 2, 'every list entry is a link');
  sources.forEach((source, i) => {
    const anchorLink = sa.createAnchor(source.id).querySelector('a');
    // getAttribute: the literal href, not a resolved or rewritten one. No
    // redirector, no tracking wrapper — the reader can check the source itself.
    assert.equal(anchorLink.getAttribute('href'), source.url);
    assert.equal(entryLinks[i].getAttribute('href'), source.url);
    assert.equal(entryLinks[i].textContent, source.title, 'entry link is named by the source title');
    for (const link of [anchorLink, entryLinks[i]]) {
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
      assert.equal(link.getAttribute('onclick'), null);
    }
  });
});

test('consolidated-numbering: each anchor index is the 1-based position of its source in the rendered list', () => {
  // Three claims, two sources: the first and third cite the same source.
  const cited = [
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
    { id: 'b', title: 'Beta', url: 'https://example.com/b' },
    { id: 'a', title: 'Alpha', url: 'https://example.com/a' },
  ];
  const sa = new SourceAttribution({ sources: cited });
  sa.renderList(host);
  const entries = [...host.querySelectorAll('li')];
  assert.equal(entries.length, 2, 'one list entry per source');

  const anchors = cited.map((source) => sa.createAnchor(source.id).querySelector('a'));
  assert.deepEqual(anchors.map((a) => a.textContent), ['[1]', '[2]', '[1]'], '1-based; repeats share one index');
  anchors.forEach((anchor, i) => {
    const n = Number(anchor.textContent.slice(1, -1));
    const entry = entries[n - 1];
    assert.equal(entry.id, `source-${cited[i].id}`, `anchor ${anchor.textContent} is entry ${n} of the list`);
    assert.equal(
      entry.querySelector('a').getAttribute('href'),
      anchor.getAttribute('href'),
      'anchor and entry link to the same source',
    );
  });
});

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

test('axe: anchors, the source list, and an uncited passage have no WCAG A/AA violations', async () => {
  const sa = new SourceAttribution({ sources: SOURCES });

  // uncited: a passage marked as model reasoning.
  const uncitedPara = document.createElement('p');
  const inferred = document.createElement('span');
  inferred.textContent = 'This part is inferred.';
  uncitedPara.append(SourceAttribution.markUncited(inferred));
  host.append(uncitedPara);
  let result = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], 'uncited: axe violations');

  // cited: prose with anchors plus the consolidated list, as a host composes them.
  host.textContent = '';
  const para = document.createElement('p');
  para.append('A grounded claim', sa.createAnchor('a'), ' and another', sa.createAnchor('b'), '.');
  const listHost = document.createElement('div');
  host.append(para, listHost);
  sa.renderList(listHost);
  result = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], 'cited: axe violations');
});
