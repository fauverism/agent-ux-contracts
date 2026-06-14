/**
 * Pattern loader — DESIGN.md §2.
 *
 * Reads patterns/<id>/pattern.contract.json, validates each against
 * schema/pattern-contract.schema.json with the same ajv configuration as
 * scripts/validate-contracts.mjs (2020-12 dialect, strict, allErrors).
 * Invalid contracts are excluded from serving and reported.
 *
 * Dev mode (MCP_DEV=1) re-checks mtimes on each tool call and lazily
 * reloads changed contracts — no fs watcher, no lifecycle state.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import _Ajv2020 from 'ajv/dist/2020.js';
import _addFormats from 'ajv-formats';
import type { Catalog, Contract, InvalidPattern, LoadedPattern } from './types.js';
import { contractHash } from './hash.js';

type AjvCtor = new (opts: object) => { compile: (s: object) => Validator };
const Ajv2020 = ((_Ajv2020 as unknown as { default?: unknown }).default ??
  _Ajv2020) as AjvCtor;
const addFormats = ((_addFormats as unknown as { default?: unknown }).default ??
  _addFormats) as (ajv: unknown) => void;

type Validator = ((data: unknown) => boolean) & { errors?: Array<{ message?: string; instancePath?: string }> | null };

function buildValidator(schemaPath: string): Validator {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

function loadOne(
  patternsDir: string,
  dirName: string,
  validate: Validator,
): { pattern?: LoadedPattern; invalid?: InvalidPattern } {
  const contractPath = join(patternsDir, dirName, 'pattern.contract.json');
  if (!existsSync(contractPath)) {
    return { invalid: { id: dirName, reason: 'missing pattern.contract.json' } };
  }

  let contract: Contract;
  try {
    contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch (err) {
    return {
      invalid: { id: dirName, reason: `unparseable JSON: ${(err as Error).message}` },
    };
  }

  if (!validate(contract)) {
    const summary = (validate.errors ?? [])
      .slice(0, 3)
      .map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
      .join('; ');
    return { invalid: { id: dirName, reason: `schema violations: ${summary}` } };
  }

  if (contract.id !== dirName) {
    return {
      invalid: {
        id: dirName,
        reason: `contract.id "${contract.id}" does not match directory name`,
      },
    };
  }

  return {
    pattern: {
      contract,
      dir: join(patternsDir, dirName),
      contractPath,
      mtimeMs: statSync(contractPath).mtimeMs,
      contractHash: contractHash(contract),
    },
  };
}

export interface LoaderOptions {
  /** Repo root containing patterns/ and schema/. */
  repoRoot: string;
  /** Override the patterns directory (tests use fixture dirs). */
  patternsDir?: string;
  log?: (line: string) => void;
}

export class PatternCatalog implements Catalog {
  patterns = new Map<string, LoadedPattern>();
  invalid: InvalidPattern[] = [];
  readonly patternsDir: string;
  private readonly validate: Validator;
  private readonly log: (line: string) => void;

  constructor(opts: LoaderOptions) {
    this.patternsDir = opts.patternsDir ?? join(opts.repoRoot, 'patterns');
    this.validate = buildValidator(
      join(opts.repoRoot, 'schema', 'pattern-contract.schema.json'),
    );
    // stdout is the MCP transport on stdio — all logging goes to stderr.
    this.log = opts.log ?? ((line) => process.stderr.write(`${line}\n`));
    this.loadAll();
    this.log(
      `Loaded ${this.patterns.size} patterns, ${this.invalid.length} invalid.`,
    );
    for (const inv of this.invalid) {
      this.log(`  invalid: ${inv.id} — ${inv.reason}`);
    }
  }

  private patternDirNames(): string[] {
    return readdirSync(this.patternsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  private loadAll(): void {
    this.patterns.clear();
    this.invalid = [];
    for (const dirName of this.patternDirNames()) {
      const { pattern, invalid } = loadOne(this.patternsDir, dirName, this.validate);
      if (pattern) this.patterns.set(pattern.contract.id, pattern);
      if (invalid) this.invalid.push(invalid);
    }
  }

  /** Dev-mode freshness: reload contracts whose mtime changed (DESIGN.md §2). */
  refreshIfStale(): void {
    if (process.env.MCP_DEV !== '1') return;
    const onDisk = this.patternDirNames();
    const known = new Set([...this.patterns.keys(), ...this.invalid.map((i) => i.id)]);
    const added = onDisk.some((d) => !known.has(d));
    const changed = [...this.patterns.values()].some((p) => {
      try {
        return statSync(p.contractPath).mtimeMs !== p.mtimeMs;
      } catch {
        return true; // deleted
      }
    });
    if (added || changed || this.invalid.length > 0) {
      this.loadAll();
      this.log(
        `Reloaded: ${this.patterns.size} patterns, ${this.invalid.length} invalid.`,
      );
    }
  }

  /** True when the id failed validation (vs. simply not existing). */
  invalidReason(id: string): string | undefined {
    return this.invalid.find((i) => i.id === id)?.reason;
  }
}
