# ADR-0002: Two-pass lexical search ranking

**Status:** Accepted
**Date:** 2026-06-11 (recorded retrospectively 2026-06-18)
**Deciders:** project owner

## Context

`search_patterns` must turn a product-language query ("I need a loading state
for my AI chat") into the right pattern, ranked, with a defensible rationale.
The catalog is small (10 patterns) and the queries are short and noisy
(misspellings, filler words, vague phrasings). We want good retrieval **without**
shipping an embeddings model or a vector store in v1.

The first implementation used fuse.js for everything. An eval harness of 19
realistic queries scored it **12/19** and exposed two distinct failures:

1. **Field weights collapsed.** fuse's extended-search _include_ operator
   (`'token`) scores every exact match `0.0`. So a query token grazing five
   low-value fields tied with a token hitting a high-value alias — both `0.0`.
   The whole point of weighting `id`/`aliases`/`tags` above `problem`/`rationale`
   was lost.
2. **Junk matched.** A single lenient fuzzy pass let off-topic tokens
   ("kubernetes", "zebra") fuzzy-match real patterns, so the "no result"
   fallback never fired.

## Decision

Split ranking into two passes and stop delegating the exact pass to fuse:

1. **Exact pass (computed directly).** Score = Σ over query tokens of
   `field_weight × (1/df)`, normalized by achievable mass, where a token's
   contribution comes from the **highest-weight field** it hits. An **IDF gate**
   drops tokens that appear in >60% of the corpus (e.g. "user", df 10/10) — they
   carry no signal. An exact hit on `id`/`aliases`/`tags` gets a small bonus.
2. **Fuzzy pass (fuse.js, threshold 0.2)** runs **only if the exact pass returns
   nothing** — purely to catch misspellings via edit distance.

Both passes sit behind a `SearchProvider` interface so an embeddings provider can
replace them later without touching tool schemas.

## Options Considered

### Option A — Two-pass: direct exact scoring + fuzzy fallback (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — custom scoring in `search.ts` |
| Cost | Zero runtime deps beyond fuse |
| Scalability | Good for a small, curated catalog; seam exists for embeddings |
| Team familiarity | High — tf-idf-ish, legible, debuggable |

**Pros:** field weights actually work; IDF gate kills filler; the empty-result
fallback fires honestly; every decision is explainable in the rationale string.
**Cons:** hand-rolled scoring to maintain; tuned to catalog size.

### Option B — Keep tuning fuse.js weights/threshold

**Pros:** less custom code. **Cons:** _can't_ express field-weighted tf-idf
through the include operator (everything is `0.0`); we tried — it plateaued at
15/19 and the remaining failures were structural, not tuning.

### Option C — Embeddings now

**Pros:** best semantic recall. **Cons:** model + vector store + latency + a
dependency, for a 10-item catalog; premature. Deferred to v1.1 behind the
existing seam.

## Trade-off Analysis

Option B is disqualified by mechanism, not effort: the include operator's `0.0`
scoring makes field weighting impossible, which is the one thing we need. Option
C buys recall we don't yet need at a complexity we don't want to carry — and the
`SearchProvider` seam means choosing A now costs nothing later. Option A is the
only one that makes the weights real, and it has the side benefit of being fully
explainable (the rationale string is derived from the same computation).

After the rewrite the eval scored **19/19**. The remaining gains came from
recognizing that some failures were _vocabulary_ gaps, not ranking bugs — fixed
by adding `aliases`/`tags` to five contracts with patch bumps (see the drift
rule in ADR-0001 / ARCHITECTURE §10).

## Consequences

- **Easier:** debugging a bad rank (the score decomposes into legible terms);
  fixing a miss (usually a one-line alias + patch bump); proving search quality
  (the 19-case eval is in the check gate).
- **Harder:** the exact-pass scoring is bespoke and assumes a small corpus; it
  will need revisiting — or replacing with embeddings — as the catalog grows.
- **Revisit when:** the catalog outgrows lexical retrieval, or real-traffic
  evals show systematic misses the alias mechanism can't absorb.

## Action Items

- [x] Direct exact-pass scoring (`mcp-server/src/search.ts`)
- [x] IDF gate at 60% df; fuzzy fallback at 0.2, gated on empty exact pass
- [x] `SearchProvider` interface seam for future embeddings
- [x] 19-case eval harness in the check gate (`mcp-server/evals/`)
- [x] Decisions logged as amendments in `mcp-server/DESIGN.md`
