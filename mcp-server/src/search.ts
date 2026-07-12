/**
 * Search — DESIGN.md §3. Lexical hybrid: exact-keyword boost over
 * id/name/aliases/tags, fuse.js fuzzy scoring over weighted contract fields.
 * Ranking lives behind SearchProvider — the seam where an embedding
 * provider slots in later without touching tool schemas.
 */
import Fuse, { type FuseResult } from 'fuse.js';
import type { Catalog, LoadedPattern } from './types.js';

export interface ScoredResult {
  pattern: LoadedPattern;
  score: number; // 0–1, higher is better
  rationale: string;
  caution?: string;
}

export interface SearchProvider {
  rank(query: string, corpus: LoadedPattern[]): ScoredResult[];
}

interface CorpusDoc {
  id: string;
  name: string;
  aliases: string[];
  tags: string[];
  summary: string;
  problem: string;
  useWhen: string[];
  anatomyText: string[];
  dontText: string[];
  pattern: LoadedPattern;
}

function toDoc(pattern: LoadedPattern): CorpusDoc {
  const c = pattern.contract;
  return {
    id: c.id,
    name: c.name,
    aliases: c.aliases ?? [],
    tags: c.tags ?? [],
    summary: c.summary,
    problem: c.problem,
    useWhen: c.useWhen,
    anatomyText: (c.anatomy ?? []).map((a) => a.description),
    dontText: [...c.dontUseWhen, ...(c.guidance?.dont ?? [])],
    pattern,
  };
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'that', 'this', 'how',
  'what', 'when', 'where', 'can', 'should', 'must', 'not', 'into', 'from',
  // Agent-query filler: carries no signal about which pattern is meant.
  'show', 'want', 'wants', 'need', 'needs', 'let', 'make', 'about',
  'actually', 'really', 'just',
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

const excerpt = (text: string, max = 90): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** Deterministic rationale templates per matched field (DESIGN.md §3). */
function rationaleFor(key: string, value: string): string {
  switch (key) {
    case 'id':
    case 'name':
      return `Name match: "${value}".`;
    case 'aliases':
      return `Alias match: "${value}".`;
    case 'tags':
      return `Tag match: "${value}".`;
    case 'summary':
      return `Intent match: "${excerpt(value)}"`;
    case 'problem':
      return `Problem match: "${excerpt(value)}"`;
    case 'useWhen':
      return `Matched use-when: "${excerpt(value)}"`;
    case 'anatomyText':
      return `Matched anatomy: "${excerpt(value)}"`;
    case 'dontText':
      return `Query matches this pattern's don't-use-when — see caution.`;
    default:
      return `Matched "${excerpt(value)}"`;
  }
}

/** Field priority for picking which match explains the result. */
const FIELD_PRIORITY = [
  'id', 'name', 'aliases', 'summary', 'problem', 'useWhen', 'tags', 'anatomyText', 'dontText',
];

/** Searchable fields with their weights, in rationale-priority order. */
const FIELDS: Array<{ name: string; weight: number; get: (d: CorpusDoc) => string[] }> = [
  { name: 'id', weight: 1, get: (d) => [d.id] },
  { name: 'name', weight: 1, get: (d) => [d.name] },
  { name: 'aliases', weight: 1, get: (d) => d.aliases },
  { name: 'summary', weight: 0.8, get: (d) => [d.summary] },
  { name: 'problem', weight: 0.8, get: (d) => [d.problem] },
  { name: 'useWhen', weight: 0.8, get: (d) => d.useWhen },
  { name: 'anatomyText', weight: 0.5, get: (d) => d.anatomyText },
  { name: 'tags', weight: 0.5, get: (d) => d.tags },
  { name: 'dontText', weight: 0.3, get: (d) => d.dontText },
];

interface FieldHit {
  field: string;
  weight: number;
  value: string;
  token: string;
}

/** Best (highest-weight) field of `doc` containing `token`, if any. */
function bestHit(doc: CorpusDoc, token: string): FieldHit | undefined {
  for (const field of FIELDS) {
    const value = field.get(doc).find((v) => v.toLowerCase().includes(token));
    if (value !== undefined) {
      return { field: field.name, weight: field.weight, value, token };
    }
  }
  return undefined;
}

export class LexicalSearchProvider implements SearchProvider {
  rank(query: string, corpus: LoadedPattern[]): ScoredResult[] {
    const docs = corpus.map(toDoc);
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    // Document frequency per token. Tokens matching most of the corpus
    // ("user", "one") carry no signal and are dropped; rare tokens count
    // more via 1/df. Measured per catalog load, so it scales as patterns
    // are added (DESIGN.md §3 amendments).
    const df = new Map<string, number>(
      tokens.map((t) => [t, docs.filter((d) => bestHit(d, t) !== undefined).length]),
    );
    const maxDf = Math.ceil(docs.length * 0.6);
    const informative = tokens.filter((t) => (df.get(t) ?? 0) <= maxDf);
    if (informative.length === 0) return [];

    // Pass 1 — keyword: explicit token-coverage scoring. fuse's combined
    // score is useless here (every exact include-match scores 0.0, which
    // collapses all field weights), so the score is computed directly:
    // Σ(bestFieldWeight × 1/df) over matched tokens, normalized by the
    // total achievable mass. Matching more of the query in better fields
    // wins; breadth of incidental matches does not.
    //
    // Tokens matching nothing in the corpus still count in the denominator
    // (at full mass, as if df=1): an off-catalog query where one word
    // grazes one contract must read as low coverage, not high confidence
    // ("kubernetes ingress timeout" once scored 0.8 on "timeout" alone).
    const weightedTokens = informative.filter((t) => (df.get(t) ?? 0) > 0);
    const denominator = informative.reduce(
      (sum, t) => sum + 1 / Math.max(1, df.get(t) ?? 0),
      0,
    );

    if (weightedTokens.length > 0) {
      const scored: ScoredResult[] = [];
      for (const doc of docs) {
        const hits = weightedTokens
          .map((t) => bestHit(doc, t))
          .filter((h): h is FieldHit => h !== undefined);
        if (hits.length === 0) continue;

        let score =
          hits.reduce((sum, h) => sum + h.weight * (1 / df.get(h.token)!), 0) /
          denominator;

        // Exact-keyword boost on id / aliases / tags (DESIGN.md §3).
        const exactTargets = new Set(
          [doc.id, ...doc.aliases, ...doc.tags].map((s) => s.toLowerCase()),
        );
        if (hits.some((h) => exactTargets.has(h.token))) score += 0.2;
        score = Math.min(1, score);

        const top = [...hits].sort(
          (a, b) =>
            b.weight - a.weight ||
            FIELD_PRIORITY.indexOf(a.field) - FIELD_PRIORITY.indexOf(b.field),
        )[0];

        // Caution only when a token's *best* hit is the exclusion text and
        // that text is a real dontUseWhen entry. A token that also matches
        // the pattern's name or aliases is about the pattern, not the
        // exclusion ("cancel" grazing "a cancel control could never be
        // reached in time" is not a warning), and guidance.dont lines are
        // implementation advice, not exclusions — quoting them as
        // don't-use-when mislabels their provenance.
        const dontHit = hits.find(
          (h) =>
            h.field === 'dontText' &&
            doc.pattern.contract.dontUseWhen.includes(h.value),
        );
        const caution = dontHit
          ? `Your query matches this pattern's don't-use-when: "${excerpt(dontHit.value)}" — it may explicitly exclude your case.`
          : undefined;

        scored.push({
          pattern: doc.pattern,
          score,
          rationale: rationaleFor(top.field, top.value),
          caution,
        });
      }
      if (scored.length > 0) {
        return scored.sort(
          (a, b) =>
            b.score - a.score ||
            a.pattern.contract.id.localeCompare(b.pattern.contract.id),
        );
      }
    }

    // Pass 2 — fuzzy fallback for typo'd queries (no token matched anything
    // as a substring), gated by a strict threshold so a junk token cannot
    // ride a short coincidence inside a longer word (DESIGN.md §3).
    const fuzzy = new Fuse(docs, {
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      useExtendedSearch: true,
      threshold: 0.2,
      keys: FIELDS.map((f) => ({ name: f.name, weight: f.weight })),
    });
    return fuzzy
      .search(informative.join(' | '))
      .map((result) => this.toScoredFuzzy(result))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.pattern.contract.id.localeCompare(b.pattern.contract.id),
      );
  }

  private toScoredFuzzy(result: FuseResult<CorpusDoc>): ScoredResult {
    const doc = result.item;
    const score = Math.min(1, 1 - (result.score ?? 1));

    const matches = result.matches ?? [];
    const top = [...matches].sort(
      (a, b) => FIELD_PRIORITY.indexOf(a.key ?? '') - FIELD_PRIORITY.indexOf(b.key ?? ''),
    )[0];
    const rationale = top
      ? rationaleFor(top.key ?? '', String(top.value ?? ''))
      : `Fuzzy match on "${doc.name}".`;

    // Same provenance rule as pass 1: only genuine dontUseWhen entries
    // warrant a caution, and not when the query also matched the pattern's
    // identity fields.
    const dontMatch = matches.find(
      (m) =>
        m.key === 'dontText' &&
        doc.pattern.contract.dontUseWhen.includes(String(m.value ?? '')) &&
        !matches.some((o) => o.key === 'id' || o.key === 'name' || o.key === 'aliases'),
    );
    const caution = dontMatch
      ? `Your query matches this pattern's don't-use-when: "${excerpt(String(dontMatch.value ?? ''))}" — it may explicitly exclude your case.`
      : undefined;

    return { pattern: doc.pattern, score, rationale, caution };
  }
}

export interface SearchFilters {
  category?: string;
  framework?: string;
}

export interface SearchOutcome {
  results: ScoredResult[];
  /** Present when the top score is weak: results may be off-catalog grazes. */
  advisory?: string;
  nearest?: {
    categories: Array<{ category: string; pattern_ids: string[] }>;
    suggestions: string[];
  };
}

/**
 * Below this top score, results covered only a sliver of the query — one
 * shared word in a ten-pattern corpus looks identical to a genuine match
 * without this gate ("kubernetes ingress timeout" vs a real cancel query).
 */
export const LOW_CONFIDENCE = 0.35;

export function searchPatterns(
  catalog: Catalog,
  provider: SearchProvider,
  query: string,
  filters: SearchFilters = {},
): SearchOutcome {
  // Hard filters apply before scoring, never as score inputs (DESIGN.md §3).
  const corpus = [...catalog.patterns.values()].filter((p) => {
    if (filters.category && p.contract.category !== filters.category) return false;
    if (filters.framework && !p.contract.implementations.includes(filters.framework)) {
      return false;
    }
    return true;
  });

  const results = provider.rank(query, corpus).slice(0, 5);
  if (results.length > 0 && results[0].score >= LOW_CONFIDENCE) return { results };

  const byCategory = new Map<string, string[]>();
  for (const p of catalog.patterns.values()) {
    const list = byCategory.get(p.contract.category) ?? [];
    list.push(p.contract.id);
    byCategory.set(p.contract.category, list);
  }
  const categories = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, ids]) => ({ category, pattern_ids: ids.sort() }));

  // Weak results are returned, but flagged: a low top score means the query
  // shared only a sliver of vocabulary with the catalog, and the honest
  // reading is "possibly off-catalog", not "here's your answer". The
  // category map rides along so the consumer can reorient.
  if (results.length > 0) {
    return {
      results,
      advisory:
        `Low confidence: the best result covered only a small fraction of your query ` +
        `(score ${Math.round(results[0].score * 100) / 100}). The need may be outside this ` +
        `catalog — check the category map in nearest before adopting a result.`,
      nearest: { categories, suggestions: [] },
    };
  }

  // Empty is never a void (DESIGN.md §6): return the category map plus
  // lenient near-miss suggestions over ids and names.
  const lenient = new Fuse(
    [...catalog.patterns.values()].map((p) => ({
      id: p.contract.id,
      name: p.contract.name,
    })),
    { keys: ['id', 'name'], threshold: 0.7, ignoreLocation: true },
  );
  const suggestions = lenient
    .search(query)
    .slice(0, 3)
    .map((r) => r.item.id);

  return { results: [], nearest: { categories, suggestions } };
}

/** Lenient id matcher for PATTERN_NOT_FOUND did_you_mean (DESIGN.md §6). */
export function nearestIds(catalog: Catalog, id: string): string[] {
  const fuse = new Fuse(
    [...catalog.patterns.keys()].map((k) => ({ id: k })),
    { keys: ['id'], threshold: 0.7, ignoreLocation: true },
  );
  return fuse
    .search(id)
    .slice(0, 3)
    .map((r) => r.item.id);
}
