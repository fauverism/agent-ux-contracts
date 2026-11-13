import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PatternCatalog } from '../src/loader.js';
import { LexicalSearchProvider, searchPatterns, nearestIds } from '../src/search.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let catalog: PatternCatalog;
const provider = new LexicalSearchProvider();

before(() => {
  catalog = new PatternCatalog({ repoRoot, log: () => {} });
});

test('ranking: a name match ranks the obvious pattern first', () => {
  const { results } = searchPatterns(catalog, provider, 'streaming response');
  assert.ok(results.length > 0);
  assert.equal(results[0].pattern.contract.id, 'streaming-response');
  assert.ok(results[0].score > 0.5, `score is meaningful, got ${results[0].score}`);
  assert.ok(results[0].rationale.length > 0, 'rationale present');
});

test('ranking: intent phrasing finds the right pattern without naming it', () => {
  const { results } = searchPatterns(catalog, provider, 'verify citations and sources');
  assert.ok(results.length > 0);
  assert.equal(results[0].pattern.contract.id, 'source-attribution');
});

test('ranking: results are capped at 5 and sorted by descending score', () => {
  const { results } = searchPatterns(catalog, provider, 'user response output control');
  assert.ok(results.length <= 5);
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(results[i - 1].score >= results[i].score, 'descending scores');
  }
});

test('ranking: every result carries a deterministic rationale', () => {
  const a = searchPatterns(catalog, provider, 'stop generation midway');
  const b = searchPatterns(catalog, provider, 'stop generation midway');
  assert.deepEqual(
    a.results.map((r) => [r.pattern.contract.id, r.score, r.rationale]),
    b.results.map((r) => [r.pattern.contract.id, r.score, r.rationale]),
    'same query, same ranking, same rationale',
  );
});

test('caution: a query matching dontUseWhen flags the result instead of hiding it', () => {
  const { results } = searchPatterns(
    catalog,
    provider,
    'output must be moderated and post-processed in full before showing',
  );
  const sr = results.find((r) => r.pattern.contract.id === 'streaming-response');
  assert.ok(sr, 'streaming-response still returned');
  assert.ok(sr.caution, 'caution set');
  assert.match(sr.caution!, /don't-use-when/);
});

test('filters: category is a hard filter, not a score input', () => {
  const { results } = searchPatterns(catalog, provider, 'confidence', {
    category: 'transparency',
  });
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.equal(r.pattern.contract.category, 'transparency');
  }
  assert.equal(results[0].pattern.contract.id, 'confidence-indicator');
});

test('filters: an unknown framework filters everything and falls back to nearest', () => {
  const outcome = searchPatterns(catalog, provider, 'streaming response', {
    framework: 'vue',
  });
  assert.equal(outcome.results.length, 0);
  assert.ok(outcome.nearest, 'nearest present');
});

test('empty results: never a void — category map plus suggestions', () => {
  const outcome = searchPatterns(catalog, provider, 'xylophone zebra blockchain');
  assert.equal(outcome.results.length, 0);
  assert.ok(outcome.nearest);
  const categories = outcome.nearest!.categories.map((c) => c.category).sort();
  assert.deepEqual(categories, ['control', 'feedback', 'input', 'output', 'transparency']);
  const allIds = outcome.nearest!.categories.flatMap((c) => c.pattern_ids);
  assert.equal(allIds.length, 10, 'every pattern is reachable through the category map');
  assert.ok(Array.isArray(outcome.nearest!.suggestions));
});

test('nearestIds: typo distance produces did-you-mean candidates', () => {
  const ids = nearestIds(catalog, 'streaming-respons');
  assert.ok(ids.includes('streaming-response'), `got: ${ids.join(', ')}`);
});

// --- recovery content for bad input (DESIGN.md amendment 18) ---

test('recovery: a query with no searchable words says so and suggests nothing', () => {
  for (const query of ['   ', 'how can I make this', '???', 'ui']) {
    const outcome = searchPatterns(catalog, provider, query);
    assert.equal(outcome.results.length, 0, query);
    assert.match(outcome.advisory ?? '', /no searchable words/, query);
    assert.deepEqual(outcome.nearest?.suggestions, [], `${query}: no made-up suggestions`);
    assert.equal(outcome.nearest?.categories.length, 5);
  }
});

test('recovery: an off-catalog query is told the catalog may not cover it, with no unrelated suggestions', () => {
  const outcome = searchPatterns(catalog, provider, 'kubernetes pod autoscaling configuration');
  assert.equal(outcome.results.length, 0);
  assert.match(outcome.advisory ?? '', /Nothing in the catalog matched/);
  assert.match(outcome.advisory ?? '', /does not cover this need/);
  assert.deepEqual(outcome.nearest?.suggestions, []);
});

test('recovery: a category filter that excludes the match names the filter and the match', () => {
  const outcome = searchPatterns(catalog, provider, 'citations', { category: 'control' });
  assert.equal(outcome.results.length, 0);
  assert.match(outcome.advisory ?? '', /No match within category "control"/);
  assert.match(outcome.advisory ?? '', /source-attribution \(transparency\)/);
  assert.deepEqual(outcome.nearest?.suggestions, ['source-attribution']);
});

test('recovery: an unsupported framework filter names the supported ones and what the query matches', () => {
  const vue = searchPatterns(catalog, provider, 'stop button', { framework: 'vue' });
  assert.equal(vue.results.length, 0);
  assert.match(vue.advisory ?? '', /No pattern is implemented for framework "vue"/);
  assert.match(vue.advisory ?? '', /react, vanilla/);
  assert.ok(vue.nearest?.suggestions.includes('interruption-cancel'));

  const cased = searchPatterns(catalog, provider, 'stop button', { framework: 'React' });
  assert.match(cased.advisory ?? '', /Did you mean "react"\?/);
});

test('nearestIds: an alias resolves to its pattern first; unrelated strings get no candidates', () => {
  assert.equal(nearestIds(catalog, 'citations')[0], 'source-attribution');
  assert.equal(nearestIds(catalog, 'ApprovalGate')[0], 'approval-gate');
  assert.equal(nearestIds(catalog, 'approval_gate')[0], 'approval-gate');
  for (const id of ['voice-input', 'xyzzy', 'diff-based-editing', ' ']) {
    assert.deepEqual(nearestIds(catalog, id), [], `"${id}" is close to nothing`);
  }
});
