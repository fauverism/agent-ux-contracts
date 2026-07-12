/*
 * Build-time data layer. Reads ../patterns/<id>/pattern.contract.json and
 * doc.mdx straight from the repo — no API, no database (per CLAUDE.md).
 * Everything here runs in server components during `next build`.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type ConstraintLevel = 'MUST' | 'MUST_NOT' | 'SHOULD' | 'SHOULD_NOT' | 'MAY';

export interface Constraint {
  id: string;
  level: ConstraintLevel;
  category: string;
  statement: string;
  rationale: string;
  verification: string;
}

export interface AnatomyPart {
  id: string;
  description: string;
  required: boolean;
  /** Framework → owning code symbol; present on kit patterns. */
  export?: Record<string, string>;
}

export interface PatternState {
  id: string;
  description: string;
  initial?: boolean;
  /** Absent on terminal states. */
  transitionsTo?: string[];
}

export interface WcagCriterion {
  criterion: string;
  name: string;
  level: string;
  relevance: string;
}

export interface PatternContract {
  id: string;
  version: string;
  name: string;
  summary: string;
  status: string;
  category: string;
  /** "component" (default) or "kit" — multiple cooperating exports. */
  kind?: string;
  aliases: string[];
  tags: string[];
  problem: string;
  useWhen: string[];
  dontUseWhen: string[];
  anatomy: AnatomyPart[];
  states: PatternState[];
  constraints: Constraint[];
  accessibility: {
    wcagCriteria: WcagCriterion[];
    keyboard: { keys: string; action: string }[];
    screenReader: { when: string; behavior: string }[];
    focusManagement: string;
    reducedMotion: string;
  };
  implementations: string[];
  guidance: { do: string[]; dont: string[] };
  relatedPatterns: string[];
  references: { title: string; url: string }[];
}

export interface Pattern {
  contract: PatternContract;
  /** sha256 hex over canonicalized JSON — same algorithm as mcp-server/src/hash.ts. */
  contractHash: string;
  /** doc.mdx body with frontmatter stripped; markdown. */
  doc: string;
  /** Raw contract JSON as it sits on disk (pretty-printed), for the Agent view. */
  rawJson: string;
}

const PATTERNS_DIR = join(process.cwd(), '..', 'patterns');

/** Recursively sorts object keys so the hash is independent of key order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function contractHash(contract: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(contract)))
    .digest('hex');
}

function stripFrontmatter(mdx: string): string {
  const match = mdx.match(/^---\n[\s\S]*?\n---\n/);
  return match ? mdx.slice(match[0].length).trim() : mdx.trim();
}

export function getPatternIds(): string[] {
  return readdirSync(PATTERNS_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(PATTERNS_DIR, entry.name, 'pattern.contract.json')),
    )
    .map((entry) => entry.name)
    .sort();
}

export function getPattern(id: string): Pattern {
  const dir = join(PATTERNS_DIR, id);
  const raw = readFileSync(join(dir, 'pattern.contract.json'), 'utf8');
  const parsed = JSON.parse(raw) as PatternContract & { $schema?: string };
  // The hash covers the contract as parsed from disk, $schema included —
  // identical input to mcp-server's loader, so the hex matches the MCP tools.
  const hash = contractHash(parsed);
  const docPath = join(dir, 'doc.mdx');
  const doc = existsSync(docPath) ? stripFrontmatter(readFileSync(docPath, 'utf8')) : '';
  return { contract: parsed, contractHash: hash, doc, rawJson: raw.trim() };
}

export function getAllPatterns(): Pattern[] {
  return getPatternIds().map(getPattern);
}

export const CATEGORIES = ['input', 'output', 'control', 'transparency', 'feedback'] as const;
