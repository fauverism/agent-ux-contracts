# Architecture

> Design systems for humans are documentation. Design systems for agents are
> contracts.

This repository is a catalog of AI-interface UX patterns in which **the
contract is the artifact**. A pattern is not a doc with some code attached; it
is a machine-readable `pattern.contract.json` of RFC-2119 constraints, and
everything else in the system — human docs, reference implementations, the MCP
server, the website — is a _projection_ of that contract. The contract is the
single source of truth; every other surface is derived from it or checked
against it.

This document is the map. For *why* a given decision was made, see
[`docs/adr/`](docs/adr/) and [`mcp-server/DESIGN.md`](mcp-server/DESIGN.md);
for *how to work in the repo*, see [`AGENTS.md`](AGENTS.md); for *what we're
building and the scope*, see [`CLAUDE.md`](CLAUDE.md).

---

## 1. The central invariant

```
                        pattern.contract.json
                     (RFC-2119 MUST/SHOULD/MAY)
                                 │
              the one source of truth for behavior
                                 │
        ┌────────────┬───────────┼────────────┬───────────────┐
        ▼            ▼           ▼            ▼               ▼
     JSON Schema  doc.mdx   react/ +     MCP server       site/
     validation   (prose)   vanilla/     (search +        (static
     (CI gate)              + COMPLIANCE  scaffold)        manual)
```

Everything obeys one rule: **normative behavior lives only in `constraints`**,
as atomic rules with stable ids. Prose (`doc.mdx`) may explain a constraint but
must never introduce a new one. Implementations must satisfy every MUST and
prove it (`COMPLIANCE.md` maps each constraint to a named test). The schema
makes the contract well-formed; CI makes the catalog internally consistent; the
MCP server serves contracts to agents; the site renders them for humans. If a
behavior isn't in a contract, it isn't real.

---

## 2. System at a glance

Four subsystems sit on one spine (the schema). They are independently testable
and share no runtime — they communicate only through the contract files on
disk and, at runtime, through the stdio MCP protocol.

| # | Subsystem | Path | Runtime | Consumes | Produces |
|---|-----------|------|---------|----------|----------|
| 0 | **Schema** (the spine) | `schema/` | build/CI | — | the shape every contract must take |
| 1 | **Catalog** | `patterns/<id>/` | build/CI | the schema | 10 contracts + prose + impls |
| 2 | **Reference implementations** | `patterns/<id>/{react,vanilla}/` | browser | a contract | compliant components + tests + COMPLIANCE |
| 3 | **MCP server** | `mcp-server/` | Node (stdio) | the catalog | `search_patterns`, `scaffold_pattern` for agents |
| 4 | **Site** | `site/` | static (build → CDN) | the catalog | the human-readable field manual |

Three independent consumers read the contract, named in the schema's own
`description`: the docs/site generator, the MCP server, and CI validation.
That triad is the reason the contract is JSON and not prose.

---

## 3. The spine — `schema/pattern-contract.schema.json`

JSON Schema 2020-12, validated with `ajv` in strict mode (`additionalProperties:
false` throughout). It is the "contract of contracts."

**Required top-level fields:** `id`, `version`, `name`, `summary`, `status`,
`category`, `problem`, `useWhen`, `dontUseWhen`, `anatomy`, `states`,
`constraints`, `accessibility`, `implementations`.

**What the schema enforces structurally (beyond field presence):**

- **RFC-2119 polarity** — each constraint's `level` (`MUST`, `MUST_NOT`,
  `SHOULD`, `SHOULD_NOT`, `MAY`) is a first-class field; the docs and badges
  derive prohibition vs. obligation from it, never from prose.
- **At least one accessibility MUST** and **at least one MUST-level rule** per
  pattern — accessibility is a contract field, not an afterthought.
- **Exactly one initial state** in the `states` machine.
- **`stable` contracts must ship both `react` and `vanilla`** (draft may ship
  fewer).
- **Semver** with an explicit rule: a major bump is required when a MUST-level
  constraint is added, removed, or changes meaning.

**Categories** (`enum`): `input`, `output`, `control`, `transparency`,
`feedback`, `context`. Five are in use; `context` (memory/history/state
awareness) is reserved and currently unused. Secondary facets go in `tags`, not
`category`.

**The schema deliberately does _not_ check cross-file integrity** (id ↔ dirname,
unique ids, referential integrity of state/alternative ids, impl dirs having a
COMPLIANCE.md). That is CI's job — see §8.

---

## 4. Subsystem 1 — the catalog (`patterns/`)

Ten patterns, each a self-contained directory:

```
patterns/<id>/
├── pattern.contract.json   the contract (validated against the schema)
├── doc.mdx                 prose: problem framing, usage, agent notes (frontmatter: pattern id)
├── react/
│   ├── <Name>.tsx          reference React implementation
│   ├── <Name>.test.tsx     node:test + @testing-library/react + axe-core
│   └── COMPLIANCE.md        constraint → test mapping table + deviations
└── vanilla/
    ├── <Name>.test.mjs      (vanilla impl is inlined/build-once; see below)
    └── COMPLIANCE.md
```

See [`README.md`](README.md) for the full pattern list and one-liners.
`streaming-response` (contract v0.2.x) is the hardened reference — read it first.

**`doc.mdx` is prose only.** Its frontmatter carries the pattern id; its body
is Markdown rendered with `react-markdown` (GFM). It must not contain normative
rules — those live in the contract. The site strips the frontmatter and renders
the body in the "Human" view.

---

## 5. Subsystem 2 — reference implementations + COMPLIANCE

Each `stable` pattern ships **React** and **vanilla** implementations. They are
not illustrative; they are the byte-source the MCP scaffolder stamps out, so
they must be exactly compliant.

**The proof obligation:** every MUST/MUST_NOT in the contract maps to a named
test in `COMPLIANCE.md` via a constraint→test table (anchors, not line numbers).
Tests are named `"<constraint-id>: <behavior>"`. A constraint with no test is a
contract bug, not an acceptable gap. Untestable rules (e.g. tone) are downgraded
to SHOULD_NOT and flagged in COMPLIANCE as copy-review, never silently asserted.

**House conventions** (load-bearing, learned the hard way):

- **Vanilla builds the DOM once** and mutates text/attributes — no `innerHTML`
  rebuilds (which would drop focus and re-create live regions).
- **Prop-driven state machines use edge detection** (a prev-value ref) so a
  user action isn't silently overwritten when the host re-reports stale state.
  (This is the streaming-response stop-button regression that motivated the
  `focus-not-lost` MUST.)
- **One exported vocabulary map per component** for any user-facing strings.
- Tests run **`axe-core` in every meaningful state**.

---

## 6. Subsystem 3 — the MCP server (`mcp-server/`)

A TypeScript MCP server (`@modelcontextprotocol/sdk`, **stdio** transport) that
serves the catalog to coding agents. Two tools, by deliberate scope cap:

| Tool | Purpose |
|------|---------|
| `search_patterns(query, category?, framework?)` | Ranked search with a one-sentence rationale per hit, MUST summaries, `version` + `contract_hash`. dontUseWhen matches return the pattern with a `caution`, not a hide. Empty results return the category map + suggestions, never a void. |
| `scaffold_pattern(pattern_id, framework, options?)` | Deterministic template transform over the reference implementation: component + tests + COMPLIANCE + the full constraints array + `compliance_notes` anchoring every MUST to a code symbol. |

**Module map** (`mcp-server/src/`):

```
index.ts            stdio entrypoint
server.ts           tool registration + request handling
loader.ts           reads/validates patterns/*, computes contractHash, refuses invalid contracts
search.ts           two-pass lexical ranking behind a SearchProvider seam
scaffold.ts         deterministic transforms over reference impls
compliance-notes.ts maps each MUST to its code anchor
hash.ts             sha256 over canonicalized JSON   ← the linchpin (see §8)
schemas.ts          Zod schemas for tool I/O
options.ts          per-pattern scaffold option schemas
errors.ts           in-band structured error shape
types.ts            shared types
```

**Search is two-pass** (see [ADR-0002](docs/adr/0002-two-pass-lexical-search-ranking.md)):

1. **Exact pass** — token-coverage × field-weight × `1/df`, with an IDF gate
   that drops tokens matching >60% of the corpus (e.g. "user", df 10/10). This
   is computed directly, _not_ delegated to fuse.js, because fuse's
   extended-search include operator scores every exact match `0.0` and collapses
   all field weights.
2. **Fuzzy pass** — fuse.js edit-distance at threshold 0.2, **only if pass 1
   finds nothing.** Single-pass leniency let "zebra" match "gen-era-tion".

The `SearchProvider` interface is a seam: an embeddings provider can replace the
lexical one without touching tool schemas. Deferred to v1.1.

**Failures are in-band structured errors**, never protocol errors:
`{ code, message, next_action, ...context }` — `PATTERN_NOT_FOUND`
(+`did_you_mean`), `FRAMEWORK_UNSUPPORTED` (+`supported`), `OPTIONS_INVALID`
(+`option_schema`), `CONTRACT_INVALID`. **All logging goes to stderr** — stdout
is the transport.

**Search quality is a test, not a vibe:** `mcp-server/evals/` runs 19 realistic
agent queries (product phrasings, vague phrasings, misspellings, a caution case,
an off-topic fallback) on every check. A miss is treated as a contract bug
(usually a missing alias) — fixed with a contract patch + version bump, since
`aliases`/`tags` are the schema's documented retrieval surface.

---

## 7. Subsystem 4 — the site (`site/`)

Next.js 15 (App Router) **static export** (`output: 'export'`, `trailingSlash:
true`), Tailwind v4 (CSS-first), TypeScript strict. No server runtime, no
database, no API — pages are generated at build from the same contract files.
See [ADR-0003](docs/adr/0003-static-site-build-time-contract-reads.md).

**Build-time data layer** (`site/lib/patterns.ts`): reads
`../patterns/<id>/pattern.contract.json` and `doc.mdx` with `node:fs` during
`next build`, computes the contract hash (§8), and exposes typed `Pattern`
objects. This runs in server components only.

**Routes:**

```
/                       title-page thesis + the pattern index table (the index IS the homepage)
/patterns/[id]          generated from contract + doc.mdx; Human/Agent toggle, sticky metadata rail
/getting-started        MCP setup (copyable blocks) + the 90s demo timeline
/about                  thesis, conventions, contact channels, colophon
/subscribe              quiet subscribe page (Buttondown) + RSS pointer
/feed.xml               RSS, generated from the catalog (route handler, force-static)
/styleguide             hidden (noindex, unlinked) — every token + primitive
/404 (not-found)        in-voice; recovery path is the index table
```

**Design system** (`site/styles/tokens.css` + `primitives.css`): field-manual
aesthetic — rules/borders for separation (never shadows), 4px baseline grid, one
accent with a written four-placement usage contract, square corners. Theming is
single-definition via CSS `light-dark()`; any subtree can be forced with
`data-theme`. Grays are `color-mix` steps of ink (no third palette). Primitives
are CSS classes with thin TSX wrappers (`PageShell`, `ConstraintBadge`,
`PatternID`, `RuleDivider`, `Prose`, `RevStamp`).

**Typography:** **DM Sans** (text voice) + **Google Sans Code** (mono content
voice), loaded from the **Google Fonts CDN** via `<link>` in `app/layout.tsx`
(`display=swap`, with `preconnect`). _Note:_ this is the one runtime external
dependency on the otherwise self-contained static export; it replaced an earlier
self-hosted Fontsource setup. If offline resilience or zero third-party requests
becomes a requirement, self-hosting is the fallback.

**The index page ships zero JavaScript.** It has no client components, so a
post-export step (`site/scripts/static-index.mjs`, wired into `build`) strips the
Next runtime `<script>` tags from `out/index.html` only. Interactive pages
(`ViewToggle`, `CopyButton`) keep their runtime. Budget at last measure: index =
0 JS, ~8 KB gz CSS, ~2 KB gz HTML; other pages ~103 KB first-load JS.

**Client interactivity is minimal and isolated** to two `'use client'`
components: `ViewToggle` (Human/Agent visibility swap — both panes are
server-rendered) and `CopyButton` (clipboard with `execCommand` fallback).

---

## 8. The linchpin — the contract hash

The single mechanism that ties the MCP server and the site together is a
**content hash computed identically in two places**:

- `mcp-server/src/hash.ts`
- `site/lib/patterns.ts`

```
contractHash = sha256( JSON.stringify( canonicalize(contract) ) )
canonicalize = recursively sort all object keys   (arrays keep order)
```

Both hash the contract **as parsed from disk, `$schema` key included**, so the
hex an agent receives from `scaffold_pattern`/`search_patterns` is byte-identical
to the one printed in the website's metadata rail. That is what makes "pin the
version + hash and drift fails your build" a real guarantee rather than a slogan:
the same input + the same canonicalization = the same hash, regardless of key
order or whitespace in the source file.

> ⚠️ **Invariant:** these two implementations must stay in lockstep. If you
> change canonicalization in one, change it in the other, or the site and the
> MCP server will disagree about the hash of the same contract. This duplication
> is intentional (no shared package across the `site`/`mcp-server` boundary) but
> it is a coupling — treat it as one.

---

## 9. Data flows

### Build-time: contracts → static site

```
patterns/<id>/pattern.contract.json ─┐
patterns/<id>/doc.mdx ───────────────┤
                                      ▼
                       site/lib/patterns.ts  (fs read at build)
                                      │  parse · hash · strip frontmatter
                                      ▼
                  React Server Components (generateStaticParams)
                                      │  next build
                                      ▼
                              site/out/*.html  (+ feed.xml, 404.html)
                                      │  scripts/static-index.mjs
                                      ▼
                     index.html stripped to 0 JS → deploy to CDN
```

### Runtime: agent query → ranked patterns

```
coding agent ──stdio──▶ mcp-server (index.ts → server.ts)
                              │
                   search.ts: pass 1 exact (token×field×1/df, IDF-gated)
                              │  (pass 2 fuzzy only if pass 1 empty)
                              ▼
            results: pattern + rationale + MUST summaries + version + hash
                              │
       agent calls scaffold_pattern(id, framework)
                              ▼
        scaffold.ts: deterministic transform over reference impl
                              ▼
   files + constraints[] + compliance_notes (every MUST → code anchor)
```

The two flows never touch at runtime. The site is frozen at build; the MCP
server reads the same files live (with mtime-based reload in dev). Their only
shared truth is the contract files and the hash algorithm.

---

## 10. Cross-cutting invariants

These hold across subsystems. Breaking one is an architecture regression, not a
local bug.

1. **The contract is the only source of normative behavior.** No new MUST in
   prose, in code comments, or in a test.
2. **Every MUST has a named test**, mapped in COMPLIANCE. No silent gaps.
3. **The contract hash is computed one way** (§8), in two kept-in-sync places.
4. **Retrieval vocabulary is contract surface.** Search misses are fixed with
   `aliases`/`tags` edits + a patch bump, not ranking hacks.
5. **Accessibility is a required field and a tested behavior**, with `axe-core`
   in every state and WCAG criteria named in the contract.
6. **Scope is capped:** 10 patterns, MCP 2 tools, no CLI, no database, no auth.
   Growth slots into existing seams (SearchProvider, new pattern dirs), not new
   surfaces.
7. **TypeScript strict everywhere;** Zod for runtime I/O parsing (MCP), ajv for
   schema validation (CI). Node 20+.

---

## 11. Testing & CI — the check gate

One all-or-nothing gate, `npm run check` at the root:

```
npm test                       242 catalog tests (schema mutation + react + vanilla, axe in states)
  && npm run validate          10 contracts: schema (ajv) + cross-file integrity
  && npm run typecheck         tsc -p tsconfig.json (strict)
  && npm --prefix mcp-server run check   32 MCP tests (incl. generated-code compile gate) + eval + typecheck
  && npm --prefix site run typecheck     site strict typecheck
```

Notable: the MCP check **typechecks generated React in a temp project**,
parse-checks generated vanilla, and **executes generated tests** for a scaffold
variant — so "the scaffold compiles and its tests pass" is enforced, not
assumed. The 19-case search eval is part of the MCP check. The schema itself has
mutation tests (`schema/pattern-contract.test.mjs`) that prove it _rejects_
malformed contracts, not just accepts good ones.

**Test stack:** `node:test` + `tsx` loader + `global-jsdom`
(`scripts/setup-dom.mjs`) + `@testing-library/react` + `axe-core`. No Jest/Vitest
in the catalog.

---

## 12. Versioning & drift policy

- **Contracts are semver'd.** Patch = clarification / retrieval vocabulary /
  non-normative. Minor = additive non-MUST. **Major = a MUST is added, removed,
  or changes meaning.**
- **A contract change ripples:** bump the version, update the hash (automatic),
  re-trace COMPLIANCE if behavior moved, and update the implementations' trace
  headers. The check gate catches the version assertion in MCP tests.
- **The hash is the drift tripwire** for consumers who pin it.

---

## 13. Deployment topology

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  site/ (static export)  │        │  mcp-server/ (Node, stdio)   │
│  next build → out/      │        │  npm run build → dist/       │
│  → Vercel (CDN)         │        │  runs locally beside an agent│
│  + Google Fonts CDN     │        │  (claude mcp add … node dist)│
└─────────────────────────┘        └──────────────────────────────┘
        served to humans                   spoken to by agents
```

The site deploys to Vercel as static files (per `CLAUDE.md`). The MCP server is
not deployed as a service in v1 — it runs locally next to the agent over stdio
(HTTP transport is a deferred v1.1 item tied to the web-client story). The two
share the repo and the contracts; they do not call each other.

---

## 14. Extension seams

Where the system is designed to grow, without new surfaces:

- **New pattern** → `npm run new-pattern -- <id>`; follow
  [`patterns/TEMPLATE.md`](patterns/TEMPLATE.md). The scaffold intentionally
  fails `validate` until completed (validator-as-checklist).
- **New framework** (e.g. Svelte) → add an impl dir + COMPLIANCE; the schema's
  `implementations` array and the scaffolder's per-framework transforms extend.
- **Better search** → implement `SearchProvider` (embeddings) behind the
  existing interface; tool schemas are untouched.
- **New MCP tool** (e.g. `check_consistency`) → deferred to hold the 2-tool cap;
  the loader/hash/compliance plumbing already supports it.
- **Site interactivity** (filters, search) → add `'use client'` islands; the
  0-JS index stays 0-JS as long as the homepage has no client components.

Deferred to v1.1 (deliberate, in `PROGRESS.md`): embeddings provider,
`check_consistency`, HTTP transport, light stemming, evals harvested from real
traffic.

---

## 15. Where decisions are recorded

| Question | Read |
|----------|------|
| Why is the system shaped this way? | this file + [`docs/adr/`](docs/adr/) |
| Why these MCP design choices (decision/alternative/why + amendments)? | [`mcp-server/DESIGN.md`](mcp-server/DESIGN.md) |
| How do I add or change a pattern, mechanically? | [`patterns/TEMPLATE.md`](patterns/TEMPLATE.md) |
| How should an agent work in this repo? | [`AGENTS.md`](AGENTS.md) |
| What's the scope and thesis? | [`CLAUDE.md`](CLAUDE.md) |
| What's done / next? | [`PROGRESS.md`](PROGRESS.md) |
| How is a pattern proven compliant? | each `patterns/<id>/*/COMPLIANCE.md` |

---

## 16. Tech stack

| Concern | Choice |
|---------|--------|
| Language | TypeScript (strict), Node 20+ |
| Contract format | JSON Schema 2020-12, validated by `ajv` (strict) |
| Runtime I/O validation | `zod` (MCP tool I/O) |
| Catalog tests | `node:test` + `tsx` + `global-jsdom` + `@testing-library/react` + `axe-core` |
| MCP | `@modelcontextprotocol/sdk`, stdio transport |
| Search | `fuse.js` (fuzzy pass only) + custom exact-pass scoring |
| Site framework | Next.js 15 App Router, `output: 'export'` |
| Styling | Tailwind v4 (CSS-first) + custom tokens/primitives, `light-dark()` theming |
| Markdown | `react-markdown` + `remark-gfm` (server-rendered) |
| Fonts | DM Sans + Google Sans Code via Google Fonts CDN |
| Newsletter | Buttondown (embed form POST, no JS) |
| Hosting | Vercel (static) |

---

## 17. Glossary

- **Contract** — `pattern.contract.json`; the machine-readable source of truth
  for one pattern.
- **Constraint** — an atomic RFC-2119 rule with a stable id, a level, a
  statement, a rationale, and a verification note.
- **Compliance note / COMPLIANCE.md** — the audit trail mapping each MUST to the
  code symbol and named test that satisfy it.
- **Contract hash** — sha256 of the canonicalized contract; the drift tripwire,
  computed identically in the MCP server and the site.
- **SearchProvider** — the interface seam that lets lexical search be swapped for
  embeddings without changing tool schemas.
- **Scaffold** — a known-compliant implementation emitted by `scaffold_pattern`
  as a deterministic transform over a reference implementation.
- **Human/Agent view** — the site's per-pattern toggle: rendered docs vs. the raw
  contract JSON an agent would receive.
