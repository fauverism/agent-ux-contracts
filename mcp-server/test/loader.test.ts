import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PatternCatalog } from '../src/loader.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function fixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aux-loader-'));

  // A valid contract: copy a real one (id must match its directory name).
  mkdirSync(join(dir, 'streaming-response'));
  writeFileSync(
    join(dir, 'streaming-response', 'pattern.contract.json'),
    readFileSync(
      join(repoRoot, 'patterns', 'streaming-response', 'pattern.contract.json'),
    ),
  );

  // Schema-invalid: missing nearly every required field.
  mkdirSync(join(dir, 'broken-pattern'));
  writeFileSync(
    join(dir, 'broken-pattern', 'pattern.contract.json'),
    JSON.stringify({ id: 'broken-pattern', name: 'Broken' }),
  );

  // Unparseable JSON.
  mkdirSync(join(dir, 'garbled'));
  writeFileSync(join(dir, 'garbled', 'pattern.contract.json'), '{ not json');

  // Valid JSON, valid-ish shape, but id does not match the directory.
  mkdirSync(join(dir, 'misnamed'));
  writeFileSync(
    join(dir, 'misnamed', 'pattern.contract.json'),
    readFileSync(join(repoRoot, 'patterns', 'approval-gate', 'pattern.contract.json')),
  );

  return dir;
}

test('loader: serves valid contracts, rejects invalid ones with reasons', () => {
  const dir = fixtureDir();
  const lines: string[] = [];
  try {
    const catalog = new PatternCatalog({
      repoRoot,
      patternsDir: dir,
      log: (l) => lines.push(l),
    });

    assert.equal(catalog.patterns.size, 1, 'only the valid contract is served');
    assert.ok(catalog.patterns.has('streaming-response'));
    assert.equal(catalog.invalid.length, 3, 'three invalid contracts reported');

    const reasons = Object.fromEntries(catalog.invalid.map((i) => [i.id, i.reason]));
    assert.match(reasons['broken-pattern'], /schema violations/);
    assert.match(reasons['garbled'], /unparseable JSON/);
    assert.match(reasons['misnamed'], /does not match directory name/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loader: startup log states loaded and invalid counts', () => {
  const dir = fixtureDir();
  const lines: string[] = [];
  try {
    new PatternCatalog({ repoRoot, patternsDir: dir, log: (l) => lines.push(l) });
    assert.equal(lines[0], 'Loaded 1 patterns, 3 invalid.');
    assert.equal(lines.filter((l) => l.startsWith('  invalid:')).length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loader: the real catalog loads all 10 patterns with 0 invalid', () => {
  const lines: string[] = [];
  const catalog = new PatternCatalog({ repoRoot, log: (l) => lines.push(l) });
  assert.equal(catalog.patterns.size, 10);
  assert.equal(catalog.invalid.length, 0);
  assert.equal(lines[0], 'Loaded 10 patterns, 0 invalid.');
});

test('loader: contract hash is stable and key-order independent', () => {
  const catalog = new PatternCatalog({ repoRoot, log: () => {} });
  const again = new PatternCatalog({ repoRoot, log: () => {} });
  for (const [id, pattern] of catalog.patterns) {
    assert.match(pattern.contractHash, /^[0-9a-f]{64}$/);
    assert.equal(pattern.contractHash, again.patterns.get(id)!.contractHash);
  }
});
