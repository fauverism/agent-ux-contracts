/**
 * Search eval harness: runs realistic agent queries against the live
 * catalog through the same searchPatterns() path the tool handler uses,
 * asserts on outcomes, prints a scorecard. Non-zero exit on any failure —
 * usable as a CI gate. Run: npm run eval
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PatternCatalog } from '../src/loader.js';
import { LexicalSearchProvider, searchPatterns, type SearchOutcome } from '../src/search.js';
import { CASES, type EvalCase } from './cases.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalog = new PatternCatalog({ repoRoot, log: () => {} });
const provider = new LexicalSearchProvider();

interface CaseResult {
  pass: boolean;
  detail: string;
}

function topIds(outcome: SearchOutcome): string[] {
  return outcome.results.map((r) => r.pattern.contract.id);
}

function runCase(c: EvalCase): CaseResult {
  const outcome = searchPatterns(catalog, provider, c.query, { category: c.category });
  const ids = topIds(outcome);
  const got = ids.length > 0 ? `[${ids.slice(0, 3).join(', ')}]` : '(no results)';

  switch (c.expect.kind) {
    case 'top1': {
      const pass = ids[0] === c.expect.id;
      return {
        pass,
        detail: pass ? `${c.expect.id} #1` : `expected ${c.expect.id} #1, got ${got}`,
      };
    }
    case 'topN': {
      const rank = ids.indexOf(c.expect.id);
      const pass = rank !== -1 && rank < c.expect.n;
      return {
        pass,
        detail: pass
          ? `${c.expect.id} #${rank + 1} (within top ${c.expect.n})`
          : `expected ${c.expect.id} in top ${c.expect.n}, got ${got}`,
      };
    }
    case 'caution': {
      const result = outcome.results.find((r) => r.pattern.contract.id === c.expect.id);
      const pass = Boolean(result?.caution);
      return {
        pass,
        detail: pass
          ? `${c.expect.id} returned with caution`
          : result
            ? `${c.expect.id} returned without caution`
            : `${c.expect.id} not in results: ${got}`,
      };
    }
    case 'fallback': {
      const pass =
        outcome.results.length === 0 &&
        Boolean(outcome.nearest) &&
        outcome.nearest!.categories.length === 5;
      return {
        pass,
        detail: pass
          ? 'empty results + full category map'
          : outcome.results.length > 0
            ? `expected fallback, got results ${got}`
            : 'fallback fired but category map incomplete',
      };
    }
  }
}

const lines: string[] = [];
let passed = 0;

for (const [index, c] of CASES.entries()) {
  const { pass, detail } = runCase(c);
  if (pass) passed += 1;
  const mark = pass ? '✓' : '✗';
  const num = String(index + 1).padStart(2);
  lines.push(
    ` ${mark} ${num}. ${c.name.padEnd(22)} ${JSON.stringify(c.query).padEnd(58)} ${detail}`,
  );
}

const total = CASES.length;
const pct = Math.round((passed / total) * 100);

console.log('\nagent-ux-contracts search evals');
console.log('================================\n');
console.log(lines.join('\n'));
console.log(`\nScorecard: ${passed}/${total} passed (${pct}%)\n`);

process.exit(passed === total ? 0 : 1);
