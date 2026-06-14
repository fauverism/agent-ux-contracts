# MCP Server — Design

Two tools, stdio transport, TypeScript, `@modelcontextprotocol/sdk`. The
server is a read-only view over `/patterns/` — it owns no pattern data.
(Note: the catalog is 10 patterns, not 8 — v1 scope was explicitly expanded.)

## 1. Tool contracts

Both tools declare an MCP `outputSchema` and return `structuredContent`
(machine-consumable JSON), plus a text block mirroring it for clients that
don't render structured output. **Alternative considered:** prose/markdown
responses. Rejected — the consumer is an agent that must branch on fields,
not parse paragraphs.

### `search_patterns`

```ts
input: {
  query: string;                       // free text
  category?: 'input'|'output'|'control'|'feedback'|'transparency';
  framework?: 'react'|'vanilla';       // hard filter on contract.implementations
}
output: {
  results: Array<{
    id: string;
    name: string;
    intent: string;                    // contract.summary verbatim
    category: string;
    version: string;                   // contract.version
    contract_hash: string;             // see §5
    score: number;                     // 0–1, normalized
    rationale: string;                 // one sentence: WHY it matched (see §3)
    caution?: string;                  // set when the query matched dontUseWhen/guidance.dont
    constraints: {
      counts: { must: number; must_not: number; should: number; may: number };
      musts: Array<{ id: string; statement: string }>;  // MUST + MUST_NOT only
    };
  }>;                                  // ranked, max 5
  nearest?: { categories: Array<{ category: string; pattern_ids: string[] }>;
              suggestions: string[] }; // only when results is empty (§6)
}
```

### `scaffold_pattern`

```ts
input: {
  pattern_id: string;
  framework: 'react'|'vanilla';
  options?: Record<string, unknown>;   // validated against the pattern's option schema (§4)
}
output: {
  pattern_id: string;
  version: string;
  contract_hash: string;
  framework: string;
  options_applied: Record<string, unknown>;  // defaults filled in — echo what was generated
  files: Array<{ path: string; role: 'component'|'test'|'compliance'; content: string }>;
  constraints: Constraint[];           // the contract's constraints array, verbatim
  compliance_notes: Array<{
    constraint_id: string;
    level: string;
    satisfied_by: { file: string; anchor: string; note: string };
    // anchor = exported symbol / function / element class, never a line number
  }>;
}
```

`constraints` + `compliance_notes` exist so the receiving agent can
**verify** the scaffold against the contract (run the included tests, check
each anchor) rather than trust it.

## 2. Source of truth

**Decision:** read `patterns/*/pattern.contract.json` from disk at startup,
validate each against `schema/pattern-contract.schema.json` with ajv (same
strict config as `scripts/validate-contracts.mjs` — reuse, don't fork).
Invalid contracts are excluded from serving and logged to stderr with their
ajv errors. In dev (`MCP_DEV=1`), each tool call re-checks contract file
mtimes and lazily reloads changed ones.

**Alternative considered:** an fs watcher (chokidar / `fs.watch`).
Rejected — `fs.watch` is flaky cross-platform, chokidar is a dependency
serving only dev, and a watcher adds lifecycle state to an otherwise
stateless server. Mtime-check-per-call gives the same freshness with zero
deps and no teardown bugs. Prod mode caches at startup; restarts are cheap.

No pattern data is duplicated inside the server. Scaffold templates (§4)
reference the reference implementations; constraint data always comes from
the contract on disk.

## 3. Search strategy

**Decision:** lexical hybrid — exact-keyword boost over `id`, `name`,
`aliases`, `tags`, then fuse.js fuzzy scoring over weighted fields:

| Field | Weight | Maps to the brief's… |
| --- | --- | --- |
| `id`, `name`, `aliases` | 1.0 | — |
| `summary`, `problem`, `useWhen` | 0.8 | "intent" |
| `anatomy[].description` | 0.5 | "anatomy" |
| `tags` | 0.5 | — |
| `dontUseWhen`, `guidance.dont` | 0.3 | "antipatterns" |

A match landing primarily in `dontUseWhen`/`guidance.dont` still returns
the pattern but sets `caution` ("your query matches this pattern's
don't-use-when: …") — an agent searching "validate full output before
showing" should learn that streaming-response explicitly excludes that
case. `category` and `framework` are hard filters applied before scoring,
never score inputs.

`rationale` is generated deterministically from the top-scoring field:
template per field kind ("matched use-when: '<excerpt>'", "alias match:
'<alias>'"). No LLM in the loop.

**Alternative considered:** embeddings. Rejected for v1 — 10 patterns is
brute-forceable by eye; lexical is deterministic (same query → same
ranking, testable in CI), zero model deps, no API key. **The seam:** ranking
lives behind a `SearchProvider` interface (`rank(query, corpus) →
ScoredResult[]`). An `EmbeddingProvider` slots in later without touching
tool schemas or the corpus builder.

## 4. Scaffolding strategy

**Decision:** scaffolds are the reference implementations, copied and
transformed by a deterministic template step — never synthesized freehand.
Same input → byte-identical output (snapshot-tested). Parameterization is
limited to options that map to a documented constructor option, prop
default, or MAY-level constraint. Each pattern declares its options as a
Zod schema; unknown options are a validation error, not a silent ignore.

Common options (all patterns): `componentName?` (rename the export),
`includeTests` (default true), `includeCompliance` (default true).

Per-pattern structural options:

| Pattern | Options |
| --- | --- |
| streaming-response | `tokenBatching` (implements the MAY constraint via rAF batcher), `stopLabel` |
| prompt-composer | `maxLength?` (emits counter wiring), `label`, `hint` |
| confidence-indicator | `withDetail` (include the Why? disclosure) |
| source-attribution | `parts` (subset of kit: `anchors`/`list`/`uncited`; default all) |
| thinking-visibility | `label` (default "Working notes") |
| approval-gate | `withDetailDisclosure` (default true) |
| error-recovery | `withPartialOutput` (default true) |
| generation-control | `withRefine` (maps to the existing constructor option) |
| interruption-cancel | `workLabelDefault` |
| refusal-messaging | `withPolicyDetail` (default true) |

**Alternative considered:** LLM-side generation guided by the contract
(ship constraints, let the agent write code). Rejected as the *only* path —
it's what the constraints array already enables; the scaffold's value is a
known-compliant starting point whose tests pass on arrival.
`compliance_notes` anchors are maintained alongside the templates and
verified by a CI check that every anchor symbol exists in the template
output.

## 5. Versioning

Every response (both tools) carries `version` (contract semver) and
`contract_hash` — SHA-256 over the canonicalized contract JSON (sorted
keys, no whitespace). Teams pin the pair; a hash change with an unchanged
version is drift and should fail their check. **Alternative considered:**
version only. Rejected — semver is hand-maintained and will lag edits;
the hash is mechanical truth.

## 6. Failure modes

Errors return as structured tool results (`isError: true` with a JSON
body), not MCP protocol errors — agents recover better from in-band errors
they can read. Shape: `{ error: { code, message, ...context } }`.

| Condition | Behavior |
| --- | --- |
| Unknown `pattern_id` | `PATTERN_NOT_FOUND` + `did_you_mean`: top-3 fuzzy id matches |
| Framework not in contract's `implementations` | `FRAMEWORK_UNSUPPORTED` + `supported`: the contract's list |
| Malformed contract on disk | Excluded at load, ajv errors logged to stderr; direct requests for that id return `CONTRACT_INVALID` with a one-line ajv summary |
| Empty search results | Not an error: `results: []` + `nearest` — every category with its pattern ids, plus top near-miss suggestions. Never an empty void. |
| Invalid scaffold `options` | `OPTIONS_INVALID` + the Zod issue list and the pattern's option schema |

---

## Amendments (implementation findings)

Approved design, adjusted where implementation proved a decision wrong:

1. **Dropped options `withDetail` (confidence-indicator),
   `withDetailDisclosure` (approval-gate), `parts` (source-attribution).**
   Each would strip MUST-implementing code (`keyboard-expandable`,
   `accurate-preview`, `citation-clickable`/`source-verifiable`), producing
   a contract-violating scaffold. A scaffold option must never be able to
   emit non-compliant code. All three toggles already exist as runtime
   props in the reference implementations. Also dropped `workLabelDefault`
   (interruption-cancel): workLabel is data, not structure — a baked-in
   default invites unlabeled cancel controls.
2. **`tokenBatching` is vanilla-only.** The React reference takes `content`
   as a prop, so append frequency belongs to the host (as its COMPLIANCE
   already documents); requesting it for React is `OPTIONS_INVALID`.
3. **`framework` is a free string on input, not an enum.** An unknown value
   ("vue") produces the structured `FRAMEWORK_UNSUPPORTED` error with the
   supported list — actionable — instead of an opaque input-validation
   failure.
4. **Search runs two passes.** Pass 1: exact-substring keyword match over
   the weighted fields. Pass 2, only when pass 1 finds nothing: fuzzy
   (fuse.js) with a strict 0.2 threshold for typo recovery. A single
   lenient fuzzy pass let a junk token ride 3-character coincidences
   ("zebra" → gen*era*tion) into confident-looking scores.

### Eval-driven tuning (the `evals/` scorecard exposed these)

5. **Pass-1 scoring is computed directly, not taken from fuse.** With the
   include operator, fuse scores every exact match 0.0 — all field weights
   collapse and every match ties at perfect, so breadth of incidental
   matches outranked precision ("effect" grazing five interruption-cancel
   fields beat "typewriter" hitting streaming-response's alias). Pass 1
   now scores Σ(best-field-weight × 1/df) per matched token, normalized by
   the query's total achievable mass: covering more of the query in
   better fields wins. fuse remains the engine for the fuzzy pass, where
   its edit-distance scoring is genuinely the right tool.
6. **IDF gate and weighting.** Tokens matching more than 60% of the corpus
   are dropped ("user" matches 10/10 contracts, "one" 7/10 — zero signal);
   surviving tokens count 1/df, so rare terms decide rankings. Measured
   per catalog load — the thresholds scale as patterns are added.
7. **Stopwords extended with agent-query filler** (show, want/s, need/s,
   let, make, about): words agents put in every query regardless of which
   pattern they mean.
8. **Retrieval vocabulary added to five contracts** — product language the
   contracts never used: streaming-response +"AI loading state"/+`loading`
   (→0.2.1), confidence-indicator +"how sure is the model" (→0.1.1),
   approval-gate +"delete confirmation"/+`destructive` (→0.1.1),
   error-recovery +"retry failed request" (→0.1.1), refusal-messaging
   +"the model refused" (→0.1.1). `aliases`/`tags` are the schema's
   documented retrieval surface, so this is contract work, not a search
   hack — and per §5 (our own drift rule) every touched contract got a
   patch bump alongside its new hash.

The 19-case scorecard (`npm run eval`, wired into `npm run check`) is the
regression harness for all of the above: 100% at ship.

Out of scope for v1 (per CLAUDE.md): HTTP transport, embeddings, a third
tool, any pattern authoring/write path.
