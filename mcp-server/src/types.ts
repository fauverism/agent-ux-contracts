/** Minimal view of a pattern contract — only the fields the server reads. */
export interface Constraint {
  id: string;
  level: 'MUST' | 'MUST_NOT' | 'SHOULD' | 'SHOULD_NOT' | 'MAY';
  category?: string;
  statement: string;
  rationale?: string;
  verification?: string;
}

export interface Contract {
  id: string;
  version: string;
  name: string;
  summary: string;
  status: string;
  category: 'input' | 'output' | 'control' | 'feedback' | 'transparency';
  aliases?: string[];
  tags?: string[];
  problem: string;
  useWhen: string[];
  dontUseWhen: string[];
  anatomy?: Array<{ id: string; description: string; required?: boolean }>;
  constraints: Constraint[];
  implementations: string[];
  guidance?: { do?: string[]; dont?: string[] };
  relatedPatterns?: string[];
}

export interface LoadedPattern {
  contract: Contract;
  /** Absolute path to the pattern directory. */
  dir: string;
  /** Absolute path to the contract file (for dev-mode mtime checks). */
  contractPath: string;
  mtimeMs: number;
  /** sha256 hex of the canonicalized contract JSON. */
  contractHash: string;
}

export interface InvalidPattern {
  id: string;
  reason: string;
}

export interface Catalog {
  patterns: Map<string, LoadedPattern>;
  invalid: InvalidPattern[];
  patternsDir: string;
}
