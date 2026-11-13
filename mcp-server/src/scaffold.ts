/**
 * Scaffolding — DESIGN.md §4. Scaffolds are the reference implementations,
 * copied and transformed by a deterministic template step. Same input →
 * byte-identical output. No freehand synthesis.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolError } from './errors.js';
import type { Catalog, LoadedPattern } from './types.js';
import {
  PATTERN_OPTIONS,
  applyPatternOptions,
  describeOptions,
  optionsSchemaFor,
  type Framework,
} from './options.js';
import { COMPLIANCE_NOTES } from './compliance-notes.js';
import { frameworkGuess, nearestIds } from './search.js';

export interface ScaffoldedFile {
  path: string;
  role: 'component' | 'test' | 'compliance' | 'support';
  content: string;
}

export interface ScaffoldResult {
  pattern_id: string;
  version: string;
  contract_hash: string;
  pin_note: string;
  framework: string;
  options_applied: Record<string, unknown>;
  files: ScaffoldedFile[];
  verify?: { command: string; dependencies: string[] };
  /** The doc's "Agent notes" — most-violated constraints, written for the receiving agent. */
  agent_notes?: string;
  /** Host-wiring snippet for the chosen framework, paths rewritten to the flat scaffold layout. */
  usage?: string;
  constraints: unknown[];
  compliance_notes: Array<{
    constraint_id: string;
    level: string;
    satisfied_by: { file: string; anchor: string; note: string };
  }>;
}

/** Dev dependencies the generated tests import (directly or via the DOM bootstrap). */
const TEST_DEPENDENCIES: Record<Framework, string[]> = {
  react: [
    'react',
    'react-dom',
    '@testing-library/react',
    '@testing-library/dom',
    'axe-core',
    'jsdom',
    'global-jsdom',
    'tsx',
    'typescript',
  ],
  vanilla: ['axe-core', 'jsdom', 'global-jsdom'],
};

/**
 * Per-file JSX pragmas prepended to every generated .tsx file (DESIGN.md
 * amendment 15). The verify command runs through tsx, which takes its JSX
 * mode from whatever tsconfig.json sits in the receiver's working directory:
 * "preserve", "react", or no tsconfig at all compile JSX to
 * React.createElement and every test dies with "React is not defined". The
 * pragmas pin the automatic runtime in the file itself, so the result no
 * longer depends on the receiver's config. Comments only — no code changes.
 */
export const JSX_PRAGMA = '/** @jsxRuntime automatic */\n/** @jsxImportSource react */\n';

/** Extract a `## Heading` section's body from doc.mdx (up to the next `## `). */
function mdxSection(doc: string, heading: string): string | undefined {
  const match = doc.match(new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
  return match?.[1].trim() || undefined;
}

/**
 * Pull the framework's fenced code block out of the doc's usage section and
 * rewrite reference-repo paths (./react/X, ./vanilla/X.js) to the flat
 * layout the scaffold emits.
 */
function usageSnippet(doc: string, fw: Framework): string | undefined {
  // Docs use either one combined section or one per framework.
  const perFramework = fw === 'react' ? 'Using the React implementation' : 'Using the vanilla implementation';
  const section = mdxSection(doc, 'Using the implementations') ?? mdxSection(doc, perFramework);
  if (!section) return undefined;
  const lang = fw === 'react' ? 'tsx' : 'js';
  const block = section.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```'));
  return block?.[1].trim().replace(/\.\/(react|vanilla)\//g, './');
}

function pinNote(version: string, hash: string): string {
  return (
    `Record version ${version} and contract_hash ${hash} alongside the generated code ` +
    '(the COMPLIANCE.md header carries both). If a later fetch returns a different hash, ' +
    'the contract changed — re-verify compliance instead of assuming it.'
  );
}

/** kebab-case id → PascalCase reference file base name. */
export function pascalName(id: string): string {
  return id
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function resolvePattern(catalog: Catalog, patternId: string): LoadedPattern {
  const pattern = catalog.patterns.get(patternId);
  if (pattern) return pattern;

  const invalidReason = catalog.invalid.find((i) => i.id === patternId)?.reason;
  if (invalidReason) {
    throw new ToolError(
      'CONTRACT_INVALID',
      `pattern "${patternId}" exists on disk but its contract failed validation: ${invalidReason}`,
      'Fix the contract (npm run validate reports full details) and retry.',
      { pattern_id: patternId },
    );
  }
  // Recovery in one step (DESIGN.md amendment 18): candidates only when one
  // is genuinely close, and always the full id list, so "no such pattern"
  // never needs a second call to learn what does exist.
  const candidates = nearestIds(catalog, patternId);
  const available = [...catalog.patterns.keys()].sort();
  throw new ToolError(
    'PATTERN_NOT_FOUND',
    patternId.trim() === ''
      ? 'pattern_id is blank'
      : `unknown pattern "${patternId}"`,
    candidates.length > 0
      ? `Retry with "${candidates[0]}" if that is what you meant` +
          (candidates.length > 1 ? ' (other candidates are in did_you_mean)' : '') +
          '. available_patterns lists every valid id.'
      : 'No pattern id is close to this one. available_patterns lists every valid id; call ' +
          'search_patterns with a description of the need to choose one. If none fits, the ' +
          'catalog has no pattern for it — do not substitute an unrelated pattern.',
    { pattern_id: patternId, did_you_mean: candidates, available_patterns: available },
  );
}

export function scaffoldPattern(
  catalog: Catalog,
  patternId: string,
  framework: string,
  rawOptions: Record<string, unknown> = {},
): ScaffoldResult {
  const pattern = resolvePattern(catalog, patternId);
  const contract = pattern.contract;

  if (!contract.implementations.includes(framework)) {
    const guess = frameworkGuess(framework, contract.implementations);
    throw new ToolError(
      'FRAMEWORK_UNSUPPORTED',
      `framework "${framework}" not available for ${patternId}; available: ${contract.implementations.join(', ')}`,
      guess
        ? `Retry with framework "${guess}" (names are lowercase and exact).`
        : `There is no ${framework.trim() || 'such'} implementation of any pattern. Retry with ` +
            `"vanilla" (plain JavaScript, no framework) to wrap or port it; the constraints ` +
            `array in that response is the specification a port must meet. Or use "react".`,
      {
        pattern_id: patternId,
        supported: contract.implementations,
        ...(guess ? { did_you_mean: guess } : {}),
      },
    );
  }
  const fw = framework as Framework;

  const schema = optionsSchemaFor(patternId, fw);
  const parsed = schema.safeParse(rawOptions);
  if (!parsed.success) {
    // An option that exists for this pattern under another framework is not
    // "unknown" — say where it does work (DESIGN.md amendment 18).
    const unknownKeys = parsed.error.issues.flatMap((i) =>
      i.code === 'unrecognized_keys' ? i.keys : [],
    );
    const elsewhere: Record<string, string[]> = {};
    for (const key of unknownKeys) {
      const spec = PATTERN_OPTIONS[patternId]?.[key];
      if (spec && !spec.frameworks.includes(fw)) elsewhere[key] = [...spec.frameworks];
    }
    const elsewhereNote = Object.entries(elsewhere)
      .map(([key, fws]) => `"${key}" exists for ${patternId} only with framework ${fws.join(' or ')}`)
      .join('; ');
    throw new ToolError(
      'OPTIONS_INVALID',
      `invalid options for ${patternId} (${fw}): ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')}` + (elsewhereNote ? `. ${elsewhereNote}` : ''),
      elsewhereNote
        ? `Drop the option, or re-run with the framework that supports it. option_schema ` +
            `lists what ${patternId} accepts for ${fw}.`
        : 'Correct the options and retry; option_schema lists every option this pattern ' +
            'accepts for this framework, and nothing else is accepted.',
      {
        pattern_id: patternId,
        option_schema: describeOptions(patternId, fw),
        ...(Object.keys(elsewhere).length > 0 ? { available_with_framework: elsewhere } : {}),
      },
    );
  }
  const options = parsed.data as Record<string, unknown>;
  const optionsApplied: Record<string, unknown> = {
    includeTests: options.includeTests ?? true,
    includeCompliance: options.includeCompliance ?? true,
    ...Object.fromEntries(
      Object.entries(options).filter(
        ([k, v]) => v !== undefined && !['includeTests', 'includeCompliance'].includes(k),
      ),
    ),
  };

  const referenceName = pascalName(patternId);
  const componentName = (options.componentName as string | undefined) ?? referenceName;
  const ext = fw === 'react' ? 'tsx' : 'js';
  const testExt = fw === 'react' ? 'test.tsx' : 'test.mjs';
  const implDir = join(pattern.dir, fw);

  const read = (file: string): string => {
    const path = join(implDir, file);
    if (!existsSync(path)) {
      throw new ToolError(
        'CONTRACT_INVALID',
        `${patternId} declares a ${fw} implementation but ${file} is missing on disk`,
        'Restore the reference implementation file or remove the framework from contract.implementations.',
        { pattern_id: patternId, missing_file: `${fw}/${file}` },
      );
    }
    return readFileSync(path, 'utf8');
  };

  let files = {
    component: read(`${referenceName}.${ext}`),
    test: read(`${referenceName}.${testExt}`),
  };
  files = applyPatternOptions(patternId, fw, files, options);

  if (componentName !== referenceName) {
    const rename = (src: string) => src.replaceAll(referenceName, componentName);
    files = { component: rename(files.component), test: rename(files.test) };
  }

  if (fw === 'react') {
    files = { component: JSX_PRAGMA + files.component, test: JSX_PRAGMA + files.test };
  }

  const emitted: ScaffoldedFile[] = [
    { path: `${componentName}.${ext}`, role: 'component', content: files.component },
  ];
  let verify: ScaffoldResult['verify'];
  if (optionsApplied.includeTests) {
    emitted.push({ path: `${componentName}.${testExt}`, role: 'test', content: files.test });
    // The tests need a DOM before the runner loads them — ship the same
    // bootstrap the catalog's own suite uses, so the verify loop works
    // out of the box instead of pointing at a file the receiver doesn't have.
    emitted.push({
      path: 'setup-dom.mjs',
      role: 'support',
      content: readFileSync(join(catalog.repoRoot, 'scripts', 'setup-dom.mjs'), 'utf8'),
    });
    verify = {
      command:
        fw === 'react'
          ? `node --import tsx --import ./setup-dom.mjs --test ${componentName}.${testExt}`
          : `node --import ./setup-dom.mjs --test ${componentName}.${testExt}`,
      dependencies: TEST_DEPENDENCIES[fw],
    };
  }
  if (optionsApplied.includeCompliance) {
    const header =
      `> Generated by scaffold_pattern from contract \`${patternId}\` ` +
      `version **${contract.version}**, sha256 \`${pattern.contractHash}\`.\n` +
      '> Pin both in your repo; a different hash on a later fetch means the contract\n' +
      '> changed and this mapping must be re-verified.\n\n';
    emitted.push({
      path: 'COMPLIANCE.md',
      role: 'compliance',
      content: header + read('COMPLIANCE.md'),
    });
  }

  const notes = COMPLIANCE_NOTES[patternId] ?? [];
  const byId = new Map(notes.map((n) => [n.id, n]));
  const compliance_notes = contract.constraints
    .filter((c) => c.level === 'MUST' || c.level === 'MUST_NOT')
    .map((c) => {
      const entry = byId.get(c.id);
      if (!entry) {
        // A MUST without an anchor is a server bug, not a user error.
        throw new Error(
          `compliance-notes table is missing ${patternId}/${c.id} — every MUST needs an anchor`,
        );
      }
      const anchor = entry.anchor[fw];
      if (!files.component.includes(anchor)) {
        throw new Error(
          `compliance anchor for ${patternId}/${c.id} (${fw}) not found in generated code: ${anchor}`,
        );
      }
      return {
        constraint_id: c.id,
        level: c.level,
        satisfied_by: { file: `${componentName}.${ext}`, anchor, note: entry.note },
      };
    });

  // Agent notes and the host-wiring snippet live in doc.mdx — previously
  // published only on the human docs site, invisible to the tool's consumer.
  const docPath = join(pattern.dir, 'doc.mdx');
  const doc = existsSync(docPath) ? readFileSync(docPath, 'utf8') : '';
  const agentNotes = mdxSection(doc, 'Agent notes');
  let usage = usageSnippet(doc, fw);
  if (usage && componentName !== referenceName) {
    usage = usage.replaceAll(referenceName, componentName);
  }

  return {
    pattern_id: patternId,
    version: contract.version,
    contract_hash: pattern.contractHash,
    pin_note: pinNote(contract.version, pattern.contractHash),
    framework: fw,
    options_applied: optionsApplied,
    files: emitted,
    ...(verify ? { verify } : {}),
    ...(agentNotes ? { agent_notes: agentNotes } : {}),
    ...(usage ? { usage } : {}),
    constraints: contract.constraints as unknown[],
    compliance_notes,
  };
}
