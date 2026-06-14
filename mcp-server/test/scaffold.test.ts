import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PatternCatalog } from '../src/loader.js';
import { scaffoldPattern, pascalName, type ScaffoldResult } from '../src/scaffold.js';
import { ToolError } from '../src/errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const mcpRoot = join(here, '..');
const repoRoot = join(mcpRoot, '..');
const tmpRoot = join(mcpRoot, '.scaffold-tmp');
const tscBin = join(mcpRoot, 'node_modules', '.bin', 'tsc');

let catalog: PatternCatalog;

before(() => {
  catalog = new PatternCatalog({ repoRoot, log: () => {} });
  rmSync(tmpRoot, { recursive: true, force: true });
  mkdirSync(tmpRoot, { recursive: true });
});

after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const writeCase = (name: string, result: ScaffoldResult): string => {
  const dir = join(tmpRoot, name);
  mkdirSync(dir, { recursive: true });
  for (const file of result.files) {
    writeFileSync(join(dir, file.path), file.content);
  }
  return dir;
};

test('determinism: same input produces byte-identical output', () => {
  const a = scaffoldPattern(catalog, 'streaming-response', 'react', { stopLabel: 'Halt' });
  const b = scaffoldPattern(catalog, 'streaming-response', 'react', { stopLabel: 'Halt' });
  assert.deepEqual(a, b);
});

test('response shape: version, hash, constraints array, and roles are present', () => {
  const result = scaffoldPattern(catalog, 'approval-gate', 'react');
  assert.equal(result.pattern_id, 'approval-gate');
  assert.equal(result.version, '0.1.1');
  assert.match(result.contract_hash, /^[0-9a-f]{64}$/);
  assert.ok(result.constraints.length > 0, 'full constraints array included');
  assert.deepEqual(
    result.files.map((f) => f.role),
    ['component', 'test', 'compliance'],
  );
  assert.deepEqual(result.options_applied, { includeTests: true, includeCompliance: true });
});

test('compliance_notes: every MUST and MUST_NOT is covered for every pattern and framework', () => {
  for (const [id, pattern] of catalog.patterns) {
    for (const framework of pattern.contract.implementations) {
      // scaffoldPattern throws internally if a MUST lacks an anchor or the
      // anchor is missing from the generated code — this is the CI check
      // from DESIGN.md §4.
      const result = scaffoldPattern(catalog, id, framework);
      const musts = pattern.contract.constraints.filter(
        (c) => c.level === 'MUST' || c.level === 'MUST_NOT',
      );
      assert.equal(
        result.compliance_notes.length,
        musts.length,
        `${id}/${framework}: one note per MUST rule`,
      );
      const component = result.files.find((f) => f.role === 'component')!;
      for (const note of result.compliance_notes) {
        assert.ok(
          component.content.includes(note.satisfied_by.anchor),
          `${id}/${framework}/${note.constraint_id}: anchor present in generated code`,
        );
      }
    }
  }
});

test('options: includeTests=false and includeCompliance=false omit those files', () => {
  const result = scaffoldPattern(catalog, 'prompt-composer', 'vanilla', {
    includeTests: false,
    includeCompliance: false,
  });
  assert.deepEqual(result.files.map((f) => f.role), ['component']);
});

test('options: componentName renames the export, the file, and the test imports', () => {
  const result = scaffoldPattern(catalog, 'streaming-response', 'react', {
    componentName: 'TokenStream',
  });
  const component = result.files.find((f) => f.role === 'component')!;
  const testFile = result.files.find((f) => f.role === 'test')!;
  assert.equal(component.path, 'TokenStream.tsx');
  assert.match(component.content, /export function TokenStream\(/);
  assert.ok(!component.content.includes('StreamingResponse'), 'old name gone');
  assert.match(testFile.content, /from '\.\/TokenStream'/);
});

test('options: default-literal transforms land in the generated source', () => {
  const composer = scaffoldPattern(catalog, 'prompt-composer', 'react', {
    maxLength: 500,
    label: 'Ask anything',
  });
  const src = composer.files[0].content;
  assert.match(src, /maxLength = 500,/);
  assert.match(src, /label = 'Ask anything',/);

  const thinking = scaffoldPattern(catalog, 'thinking-visibility', 'vanilla', {
    label: 'Reasoning',
  });
  assert.match(thinking.files[0].content, /label = 'Reasoning' } = \{\}/);

  const generation = scaffoldPattern(catalog, 'generation-control', 'vanilla', {
    withRefine: true,
  });
  assert.match(generation.files[0].content, /withRefine = true }/);
});

test('options: withPartialOutput=false strips the block and its test', () => {
  const result = scaffoldPattern(catalog, 'error-recovery', 'react', {
    withPartialOutput: false,
  });
  const component = result.files.find((f) => f.role === 'component')!;
  const testFile = result.files.find((f) => f.role === 'test')!;
  assert.ok(!component.content.includes('partialOutput'), 'prop and block removed');
  assert.ok(
    !testFile.content.includes('partialOutput: partial output rendered'),
    'matching test removed',
  );
});

test('options: withPolicyDetail=false strips the disclosure in both frameworks', () => {
  for (const framework of ['react', 'vanilla'] as const) {
    const result = scaffoldPattern(catalog, 'refusal-messaging', framework, {
      withPolicyDetail: false,
    });
    const component = result.files.find((f) => f.role === 'component')!;
    const testFile = result.files.find((f) => f.role === 'test')!;
    assert.ok(!component.content.includes('policyDetail'), `${framework}: policy code removed`);
    assert.ok(!component.content.includes('policy-toggle'), `${framework}: toggle removed`);
    assert.ok(
      !testFile.content.includes('policy-detail-available'),
      `${framework}: policy test removed`,
    );
  }
});

test('options: tokenBatching is vanilla-only and injects the rAF batcher', () => {
  const result = scaffoldPattern(catalog, 'streaming-response', 'vanilla', {
    tokenBatching: true,
  });
  const src = result.files[0].content;
  assert.match(src, /requestAnimationFrame/);
  assert.match(src, /#flushHandle/);

  assert.throws(
    () => scaffoldPattern(catalog, 'streaming-response', 'react', { tokenBatching: true }),
    (err: unknown) => err instanceof ToolError && err.code === 'OPTIONS_INVALID',
  );
});

test('errors: unknown pattern_id returns PATTERN_NOT_FOUND with did_you_mean', () => {
  try {
    scaffoldPattern(catalog, 'streaming-respons', 'react');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof ToolError);
    assert.equal(err.code, 'PATTERN_NOT_FOUND');
    const payload = err.toPayload().error as { did_you_mean: string[]; next_action: string };
    assert.ok(payload.did_you_mean.includes('streaming-response'));
    assert.ok(payload.next_action.length > 0);
  }
});

test('errors: unsupported framework returns FRAMEWORK_UNSUPPORTED with the available list', () => {
  try {
    scaffoldPattern(catalog, 'streaming-response', 'vue');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof ToolError);
    assert.equal(err.code, 'FRAMEWORK_UNSUPPORTED');
    assert.match(err.message, /available: react, vanilla/);
    assert.deepEqual(err.context.supported, ['react', 'vanilla']);
  }
});

test('errors: unknown options return OPTIONS_INVALID with the option schema', () => {
  try {
    scaffoldPattern(catalog, 'prompt-composer', 'react', { rows: 4 });
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof ToolError);
    assert.equal(err.code, 'OPTIONS_INVALID');
    const schema = err.context.option_schema as Record<string, string>;
    assert.ok('maxLength' in schema, 'option schema names what is accepted');
  }
});

// --- generated code must actually work ---

test('generated React code typechecks (all patterns, default options, plus option variants)', () => {
  const cases: Array<[string, string, Record<string, unknown>]> = [
    ...[...catalogIds()].map(
      (id) => [`react-${id}`, id, {}] as [string, string, Record<string, unknown>],
    ),
    ['react-rename', 'streaming-response', { componentName: 'TokenStream' }],
    ['react-composer-opts', 'prompt-composer', { maxLength: 500, label: 'Ask anything' }],
    ['react-no-partial', 'error-recovery', { withPartialOutput: false }],
    ['react-no-policy', 'refusal-messaging', { withPolicyDetail: false }],
  ];

  for (const [name, id, options] of cases) {
    writeCase(name, scaffoldPattern(catalog, id, 'react', options));
  }

  writeFileSync(
    join(tmpRoot, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: 'es2022',
        lib: ['es2022', 'dom', 'dom.iterable'],
        module: 'esnext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        skipLibCheck: true,
      },
      include: ['**/*.tsx'],
    }),
  );

  // Generated code that does not compile is a test failure (build brief).
  try {
    execFileSync(tscBin, ['-p', 'tsconfig.json'], { cwd: tmpRoot, stdio: 'pipe' });
  } catch (err) {
    const out = (err as { stdout?: Buffer }).stdout?.toString() ?? String(err);
    assert.fail(`generated React code failed to typecheck:\n${out}`);
  }
});

test('generated vanilla code parses (node --check, all patterns plus variants)', () => {
  const cases: Array<[string, string, Record<string, unknown>]> = [
    ...[...catalogIds()].map(
      (id) => [`vanilla-${id}`, id, {}] as [string, string, Record<string, unknown>],
    ),
    ['vanilla-batching', 'streaming-response', { tokenBatching: true }],
    ['vanilla-no-policy', 'refusal-messaging', { withPolicyDetail: false }],
  ];

  for (const [name, id, options] of cases) {
    const dir = writeCase(name, scaffoldPattern(catalog, id, 'vanilla', options));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }));
    const component = join(dir, `${pascalName(id)}.js`);
    execFileSync(process.execPath, ['--check', component], { stdio: 'pipe' });
  }
});

test('generated tests pass for the tokenBatching variant (behavior, not just syntax)', () => {
  const dir = join(tmpRoot, 'vanilla-batching');
  const testFile = join(dir, 'StreamingResponse.test.mjs');
  // Run the scaffolded vanilla suite against the transformed component using
  // the repo's DOM test setup. Batching defers paints during streaming but
  // settling flushes synchronously, so the reference assertions must hold.
  execFileSync(
    process.execPath,
    ['--import', 'tsx', '--import', './scripts/setup-dom.mjs', '--test', testFile],
    { cwd: repoRoot, stdio: 'pipe' },
  );
});

function catalogIds(): string[] {
  return [...catalog.patterns.keys()].sort();
}
