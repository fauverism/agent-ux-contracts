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
  /** The contract's dontUseWhen entries, each with its word index (cautions). */
  exclusions: Array<{ text: string; words: string[] }>;
  /** Words that name the pattern: id, name, aliases, tags. */
  identityWords: string[];
  /** Words of every searchable field, for document frequency. */
  allWords: string[];
  pattern: LoadedPattern;
}

/**
 * Words of a text, lowercased. A hyphenated compound yields the compound and
 * its parts ("read-only" → read-only, read, only), so a query can use either.
 */
function wordsOf(text: string): string[] {
  const out: string[] = [];
  for (const compound of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    if (!compound) continue;
    out.push(compound);
    if (compound.includes('-')) out.push(...compound.split('-').filter(Boolean));
  }
  return out;
}

/**
 * Ranking match: a token matches a text when some word *starts with* it.
 * This replaced a raw substring test (DESIGN.md amendment 17): "ask" no
 * longer matches "task" and "reversible" no longer matches "irreversible",
 * while "fail" still reaches "failure" and "confirm" reaches "confirmation".
 * It is not a stemmer — "failed" still does not match "failure".
 */
function matchesWords(words: string[], token: string): boolean {
  return words.some((w) => w.startsWith(token));
}

/**
 * Caution match: the same rule, but the word may run at most an inflection's
 * length past the token. A caution is a warning, so its evidence is held to
 * a tighter standard than ranking: "cost" reaches "costs", but "sign" does
 * not reach "significant" and "else" does not reach "elsewhere".
 */
const MAX_INFLECTION = 3;
function inflects(words: string[], token: string): boolean {
  return words.some((w) => w.startsWith(token) && w.length - token.length <= MAX_INFLECTION);
}

function toDoc(pattern: LoadedPattern): CorpusDoc {
  const c = pattern.contract;
  const doc = buildDoc(pattern);
  doc.allWords = FIELDS.flatMap((f) => f.get(doc)).flatMap(wordsOf);
  return doc;
}

function buildDoc(pattern: LoadedPattern): CorpusDoc {
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
    exclusions: c.dontUseWhen.map((text) => ({ text, words: wordsOf(text) })),
    identityWords: [c.id, c.name, ...(c.aliases ?? []), ...(c.tags ?? [])].flatMap(wordsOf),
    allWords: [],
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
    const value = field.get(doc).find((v) => matchesWords(wordsOf(v), token));
    if (value !== undefined) {
      return { field: field.name, weight: field.weight, value, token };
    }
  }
  return undefined;
}

/**
 * Minimum evidence for a caution: the summed rarity (1/df) of the query
 * words that point at one exclusion. Two words found in only two patterns
 * each reach it; two words found in half the catalog do not.
 */
export const CAUTION_EVIDENCE = 0.75;

/**
 * Is this query word one of the words that name the pattern? Checked in both
 * directions so an inflection of a naming word still counts as naming it
 * ("declined" against the alias "decline message").
 */
function namesPattern(doc: CorpusDoc, token: string): boolean {
  return doc.identityWords.some(
    (w) => w.startsWith(token) || (w.length >= 4 && token.startsWith(w)),
  );
}

/**
 * Function words that pass the length filter but say nothing about a
 * situation. Used only when weighing caution evidence, where a rare-looking
 * "there" or "own" would otherwise count as a clue.
 */
const CAUTION_NOISE = new Set([
  'are', 'was', 'were', 'has', 'have', 'had', 'its', 'own', 'any', 'all', 'but',
  'than', 'then', 'there', 'their', 'they', 'them', 'our', 'you', 'your', 'will',
  'would', 'could', 'does', 'doesn', 'don', 'didn', 'isn', 'aren', 'won', 'did',
  'get', 'gets', 'got', 'use', 'used', 'using', 'add', 'adds', 'only', 'even',
  'every', 'each', 'some', 'such', 'while', 'because', 'before', 'after',
  'through', 'without', 'within', 'over', 'under', 'between', 'during', 'until',
  'still', 'also', 'too', 'many', 'more', 'most', 'much', 'very', 'always',
  'never', 'anyway',
]);

/**
 * Does the query describe one of this pattern's dontUseWhen cases?
 * (DESIGN.md amendment 17.) Evidence is counted per exclusion entry, from
 * query words that appear in that entry and do not name the pattern — a
 * word shared with the id, name, aliases or tags is about the pattern, not
 * about the exclusion ("cancel" in "a cancel control could never be reached
 * in time"). One shared word is never enough: a caution needs at least two,
 * and enough combined rarity (1/df each) that the overlap is not everyday
 * vocabulary. The entry with the most evidence is the one quoted.
 */
function cautionFor(doc: CorpusDoc, queryWords: string[], docs: CorpusDoc[]): string | undefined {
  let best: { text: string; evidence: number } | undefined;
  for (const exclusion of doc.exclusions) {
    const pointing = queryWords.filter(
      (t) =>
        !CAUTION_NOISE.has(t) &&
        inflects(exclusion.words, t) &&
        !namesPattern(doc, t),
    );
    if (pointing.length < 2) continue;
    const evidence = pointing.reduce(
      (sum, t) => sum + 1 / docs.filter((d) => inflects(d.allWords, t)).length,
      0,
    );
    if (evidence >= CAUTION_EVIDENCE && (!best || evidence > best.evidence)) {
      best = { text: exclusion.text, evidence };
    }
  }
  return best
    ? `Your query matches this pattern's don't-use-when: "${excerpt(best.text)}" — it may explicitly exclude your case.`
    : undefined;
}

export class LexicalSearchProvider implements SearchProvider {
  rank(query: string, corpus: LoadedPattern[]): ScoredResult[] {
    const docs = corpus.map(toDoc);
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    // Caution matching sees hyphenated compounds and their parts.
    const queryWords = [...new Set(tokens.flatMap(wordsOf).filter((t) => t.length >= 3 && !STOPWORDS.has(t)))];

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

        const caution = cautionFor(doc, queryWords, docs);

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

/** Frameworks at least one pattern implements, sorted. */
export function supportedFrameworks(catalog: Catalog): string[] {
  return [...new Set([...catalog.patterns.values()].flatMap((p) => p.contract.implementations))].sort();
}

/**
 * A framework name an agent plausibly meant ("React", "vanilla-js",
 * "javascript"), mapped to the supported spelling. Undefined when the
 * framework is simply not one the catalog has.
 */
export function frameworkGuess(framework: string, supported: string[]): string | undefined {
  const norm = framework.trim().toLowerCase().replace(/[\s._-]+/g, '');
  const table: Record<string, string> = {
    react: 'react', reactjs: 'react', tsx: 'react', jsx: 'react',
    vanilla: 'vanilla', vanillajs: 'vanilla', javascript: 'vanilla', js: 'vanilla',
    plain: 'vanilla', plainjs: 'vanilla', dom: 'vanilla', html: 'vanilla', none: 'vanilla',
  };
  const guess = table[norm];
  return guess && supported.includes(guess) && guess !== framework ? guess : undefined;
}

function categoryMap(catalog: Catalog): Array<{ category: string; pattern_ids: string[] }> {
  const byCategory = new Map<string, string[]>();
  for (const p of catalog.patterns.values()) {
    const list = byCategory.get(p.contract.category) ?? [];
    list.push(p.contract.id);
    byCategory.set(p.contract.category, list);
  }
  return [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, ids]) => ({ category, pattern_ids: ids.sort() }));
}

export function searchPatterns(
  catalog: Catalog,
  provider: SearchProvider,
  query: string,
  filters: SearchFilters = {},
): SearchOutcome {
  const everything = [...catalog.patterns.values()];
  const categories = categoryMap(catalog);

  // A query of blanks, punctuation, or filler words cannot match anything.
  // Say that, so the caller rephrases instead of concluding the catalog has
  // no such pattern (DESIGN.md amendment 18).
  if (tokenize(query).length === 0) {
    return {
      results: [],
      advisory:
        'The query has no searchable words (blank, punctuation, very short, or only filler ' +
        'such as "how", "make", "this"). Describe the UX need in a few words, for example ' +
        '"stop button for a long answer". This says nothing about what the catalog covers.',
      nearest: { categories, suggestions: [] },
    };
  }

  // Hard filters apply before scoring, never as score inputs (DESIGN.md §3).
  const corpus = everything.filter((p) => {
    if (filters.category && p.contract.category !== filters.category) return false;
    if (filters.framework && !p.contract.implementations.includes(filters.framework)) {
      return false;
    }
    return true;
  });

  const results = provider.rank(query, corpus).slice(0, 5);
  if (results.length > 0 && results[0].score >= LOW_CONFIDENCE) return { results };

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

  // Nothing matched. If a filter is the reason, say which one and what the
  // query matches without it — an empty list alone reads as "not covered".
  if (filters.category || filters.framework) {
    const frameworks = supportedFrameworks(catalog);
    const unknownFramework =
      filters.framework !== undefined && !frameworks.includes(filters.framework);
    const unfiltered = provider
      .rank(query, everything)
      .filter((r) => r.score >= LOW_CONFIDENCE)
      .slice(0, 3);
    const guess = unknownFramework ? frameworkGuess(filters.framework!, frameworks) : undefined;
    const cause = unknownFramework
      ? `No pattern is implemented for framework "${filters.framework}". Supported, in lowercase: ` +
        `${frameworks.join(', ')}.` +
        (guess ? ` Did you mean "${guess}"?` : '')
      : `No match within ${[
          filters.category ? `category "${filters.category}"` : '',
          filters.framework ? `framework "${filters.framework}"` : '',
        ]
          .filter(Boolean)
          .join(' and ')}.`;
    const without =
      unfiltered.length > 0
        ? ` Without the filter this query matches: ${unfiltered
            .map((r) => `${r.pattern.contract.id} (${r.pattern.contract.category})`)
            .join(', ')} — listed in nearest.suggestions. Re-run without the filter.`
        : ' The query matches nothing without the filter either.';
    return {
      results: [],
      advisory: cause + without,
      nearest: { categories, suggestions: unfiltered.map((r) => r.pattern.contract.id) },
    };
  }

  // Empty is never a void (DESIGN.md §6): return the category map, and
  // suggestions only when a pattern name is genuinely close to the query.
  const close = new Fuse(
    everything.map((p) => ({ id: p.contract.id, name: p.contract.name })),
    { keys: ['id', 'name'], threshold: NAME_CLOSENESS, ignoreLocation: true },
  );
  const suggestions = close
    .search(query)
    .slice(0, 3)
    .map((r) => r.item.id);

  return {
    results: [],
    advisory:
      'Nothing in the catalog matched this query. nearest.categories lists every pattern' +
      (suggestions.length > 0 ? '; nearest.suggestions has the ids with similar names' : '') +
      '. If none of them fits, the catalog does not cover this need — say so rather than ' +
      'adapting an unrelated pattern.',
    nearest: { categories, suggestions },
  };
}

/**
 * How close a pattern id or name must be to count as "you probably meant
 * this" (fuse threshold; lower is stricter). The earlier 0.7 offered three
 * unrelated ids for almost any string.
 */
const NAME_CLOSENESS = 0.4;

/** "ApprovalGate", "approval_gate", " Approval Gate " → "approval-gate". */
function normalizeId(id: string): string {
  return id
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/**
 * Candidates for PATTERN_NOT_FOUND did_you_mean (DESIGN.md §6, amendment 18),
 * best first: the id with its spelling normalized, then patterns the string
 * names or describes (an alias such as "citations"), then near-typos of an
 * id. Empty when nothing is genuinely close — an unrelated guess presented
 * as "did you mean" is worse than none.
 */
export function nearestIds(catalog: Catalog, id: string): string[] {
  const ids = [...catalog.patterns.keys()];
  const norm = normalizeId(id);
  if (!norm) return [];
  const out: string[] = [];
  if (ids.includes(norm)) out.push(norm);
  // Only results close to the best one: a word such as "refusal" grazes
  // several contracts, and a long candidate list is not a suggestion.
  const ranked = new LexicalSearchProvider().rank(
    norm.replace(/-/g, ' '),
    [...catalog.patterns.values()],
  );
  const floor = Math.max(LOW_CONFIDENCE, (ranked[0]?.score ?? 0) * 0.8);
  const described = ranked.filter((r) => r.score >= floor).map((r) => r.pattern.contract.id);
  const typos = new Fuse(
    ids.map((k) => ({ id: k })),
    { keys: ['id'], threshold: NAME_CLOSENESS, ignoreLocation: true },
  )
    .search(norm)
    .map((r) => r.item.id);
  return [...new Set([...out, ...described, ...typos])].slice(0, 3);
}
