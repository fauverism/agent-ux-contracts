# Progress: AI UX Patterns Catalog

**Last updated:** 2026-06-12  
**Status:** 10/10 patterns at production standard (TEMPLATE.md). MCP server shipped (2 tools, 32 tests, 19/19 search evals, DEMO.md launch script). Site shipped: design foundation (approved), all pages, and the human layer — subscribe (Buttondown), contact channels, RSS, in-voice 404, REV. stamps. Catalog tests 242/242 green.

## What's Done

### Infrastructure

- **[schema/pattern-contract.schema.json](schema/pattern-contract.schema.json)** — JSON Schema 2020-12 with ajv strict validation. Enforces RFC-2119 keyword/level polarity per constraint, requires ≥1 accessibility MUST, ≥1 MUST-level rule, exactly one initial state, stable contracts must ship both React and vanilla.
- **[scripts/validate-contracts.mjs](scripts/validate-contracts.mjs)** — CI gate. Validates every `patterns/*/pattern.contract.json` against schema, plus cross-file integrity (id↔dirname match, unique ids, state/alternative referential integrity, implementation directories with COMPLIANCE.md).
- **[patterns/TEMPLATE.md](patterns/TEMPLATE.md)** — Mechanical authoring procedure. 6 steps: scaffold, write contract (with testability rules), implement React + vanilla, write tests, fill COMPLIANCE mappings, write docs. Checklist-based; every step has a clear gate.
- **Test infrastructure:** node:test + tsx loader + global-jsdom setup ([scripts/setup-dom.mjs](scripts/setup-dom.mjs)) + @testing-library/react + axe-core. Wired into `npm test` to glob `patterns/**/*.test.{tsx,mjs}`.
- **[npm run new-pattern](scripts/new-pattern.mjs)** — Scaffolds a pattern with skeleton contract, stubs, and COMPLIANCE templates. Skeleton intentionally fails validation until completed (validator-as-checklist).
- **[npm run check](package.json)** — Gate before merge: `npm test && npm run validate && npm run typecheck`. All three currently 100% passing.

### Patterns at Production Standard (TEMPLATE.md)

**[streaming-response](patterns/streaming-response/)** (v0.2.1; hardened in the v0.2.0 review, retrieval aliases added in 0.2.1)
- Contract: progressive text rendering, interruptible, partial output preserved, immediate stop acknowledgment, never steals focus.
- Tests: 26 React + vanilla. Covers edge cases (zero-token response, rapid re-invocation, unmount mid-stream, focus recovery when the stop button is removed out from under it, state-latching regression from the principal review).
- Implementations: React uses ref-based edge detection + latch updater to prevent a user stop from being silently overwritten while the host still reports streaming. Vanilla uses build-once DOM.
- Key hardening change (v0.2.0): added `focus-not-lost` MUST after discovering the original contract was unimplementable at a focus-on-stop edge.
- COMPLIANCE: constraint↔test mapping table + deviations.

**[interruption-cancel](patterns/interruption-cancel/)** (v0.1.0)
- Contract: cancel side-effectful agent work with synchronous acknowledgment, no confirmation dialog, progress during pending cancel doesn't re-enter running, honest summary of completed and stopped work, completion-race disclosure, focus recovery.
- Tests: 18 React + vanilla. Covers no-silent-continuation, restart clearing the race flag, destroy/unmount, axe in all states.
- Implementations: Synchronous state flip to `cancel-requested` on click; edge-detection re-entry; `cancelWasRequested` flag for race disclosure.

**[refusal-messaging](patterns/refusal-messaging/)** (v0.1.0)
- Contract: refusals as responses not errors. Reason required, ≥1 alternative enforced (throw on empty), no verbatim retry, partial refusals deliver the fulfilled half, status semantics.
- Tests: 16 React + vanilla. Covers constructor validation, partial refusals, policy disclosure, axe in both kinds.
- Implementations: Non-empty tuple type for React; constructor throw for vanilla. No built-in retry control exists.
- COMPLIANCE note: `no-moralizing` (SHOULD_NOT) is unautomated — it's a copy review task, not a code assertion. User approved this exception.

### Retrofitted Patterns (2026-06-11 quality pass)

The remaining 7 patterns now have full React + vanilla test suites and
COMPLIANCE.md files with real constraint→test mapping tables (the
"Verification hooks" placeholders are gone):

| Pattern | Category | Tests (React + vanilla) |
| --- | --- | --- |
| [prompt-composer](patterns/prompt-composer/) | input | 25 — IME safety, no native maxLength, aria-disabled submit with reason |
| [confidence-indicator](patterns/confidence-indicator/) | output | 22 — per-level labels, disclosure toggle, expansion survives `update()` |
| [source-attribution](patterns/source-attribution/) | transparency | 21 — kit-style: anchor format, dedup, throws on unknown id |
| [thinking-visibility](patterns/thinking-visibility/) | transparency | 21 — phase announcements, user-toggle precedence, collapse-after-answer |
| [approval-gate](patterns/approval-gate/) | control | 28 — consent paths, DOM order, Escape-rejects, failed-approval announcement |
| [error-recovery](patterns/error-recovery/) | feedback | 22 — input preserved, FAILURE_COPY per kind, single-flight retry |
| [generation-control](patterns/generation-control/) | control | 21 — append-only history, single-flight, failure leaves variant intact |

## Test Coverage

- **242 tests passing:** 14 schema mutation tests + 26 streaming-response + 18 interruption-cancel + 16 refusal-messaging + 160 across the 7 retrofitted patterns + 8 source-attribution kit extras.
- **10 patterns with valid contracts:** schema enforces structure; validate-contracts enforces file-level integrity.
- **0 test failures. 0 typecheck errors.**

### MCP Server (shipped 2026-06-11)

[mcp-server/](mcp-server/) — TypeScript, `@modelcontextprotocol/sdk`, stdio transport. Design doc with decision/alternative/why per choice: [mcp-server/DESIGN.md](mcp-server/DESIGN.md) (including post-approval amendments). Setup + example conversations: [mcp-server/README.md](mcp-server/README.md).

- **`search_patterns(query, category?, framework?)`** — two-pass lexical search (exact-substring keyword, fuzzy fallback at strict threshold) over weighted contract fields via fuse.js, behind a `SearchProvider` seam for future embeddings. Every result carries a deterministic relevance rationale, MUST summaries, `version` + `contract_hash` (sha256 of canonicalized contract). Queries matching a pattern's dontUseWhen return the pattern with a `caution` instead of hiding it. Empty results return the category map + suggestions, never a void.
- **`scaffold_pattern(pattern_id, framework, options?)`** — deterministic template transforms over the reference implementations (byte-identical output, snapshot-tested). Returns files + full constraints array + `compliance_notes` anchoring every MUST/MUST_NOT to a code symbol. Options are per-pattern Zod schemas; unknown keys rejected with the option schema. Options that would strip MUST code were cut (DESIGN.md amendment).
- **Failures** are in-band structured errors: `{ code, message, next_action, …context }` — `PATTERN_NOT_FOUND` (+did_you_mean), `FRAMEWORK_UNSUPPORTED` (+supported), `OPTIONS_INVALID` (+option_schema), `CONTRACT_INVALID`.
- **32 tests** (`mcp-server/`, wired into root `npm run check`): loader rejects invalid contracts; ranking sanity; scaffold determinism; **generated React typechecked in a temp project, generated vanilla parse-checked, generated tests executed for the tokenBatching variant**; compliance-note coverage for every MUST × pattern × framework; e2e over real stdio.
- **Search evals** (`mcp-server/evals/`, `npm run eval`, in the check gate): 19 realistic agent queries — product phrasings, vague phrasings, misspellings, a dontUseWhen caution case, an off-topic fallback case. **19/19 at ship.** The baseline run (12/19) exposed that fuse scores every exact match 0.0, collapsing field weights; pass-1 ranking was rewritten as token-coverage × field-weight × 1/df, generic tokens are IDF-gated, and five contracts gained retrieval aliases (patch bumps: streaming-response 0.2.1; confidence-indicator, approval-gate, error-recovery, refusal-messaging 0.1.1). Every decision is an amendment in [mcp-server/DESIGN.md](mcp-server/DESIGN.md).
- **[mcp-server/DEMO.md](mcp-server/DEMO.md)** — 90-second screen-recording script (the launch asset): `claude mcp add` → search → scaffold → compliance_notes → Cmd+F to the anchor → tests pass on camera. The "tests pass in a consumer project" claim is verified (12/12 with the documented demo-project setup).

### Deferred to v1.1 (deliberate, not forgotten)

- **Embeddings search provider** — slots in behind the existing `SearchProvider` interface without touching tool schemas; revisit when the catalog or query miss-rate outgrows lexical.
- **`check_consistency` tool** — verify an existing implementation against its contract (anchors + tests) instead of scaffolding fresh; deferred to hold the 2-tool v1 scope cap.
- **HTTP transport** — stdio covers Claude Code; HTTP belongs with the web client story (site phase).
- **Light stemming** — "failed" doesn't substring-match "failure"; v1 closes these gaps with contract aliases (which double as documentation), a stemmer only if alias growth becomes noise.
- **Eval corpus from real traffic** — the 19 cases are authored; once the server sees real agent queries, harvest misses into `evals/cases.ts`.

### Site — pages (shipped 2026-06-12, foundation approved)

All pages are generated at build time from the same `pattern.contract.json` + `doc.mdx` the MCP server reads — no API, no database. Layout: editorial, left-aligned, ruled sections.

- **Home ([site/app/page.tsx](site/app/page.tsx))** — a manual's title page, not a hero: the thesis set large in the text face, one plain paragraph, then the full pattern index as a typographic table (mono ID links, name, category with an extended-palette square mark, constraint count + MUST count, framework marks). A quiet ruled subscribe block sits above the footer (email affordance; list provider can swap in without touching the setting).
- **Pattern pages ([site/app/patterns/\[id\]/page.tsx](site/app/patterns/[id]/page.tsx))** — two-column on desktop: prose left, sticky mono metadata rail right (version, contract hash — same sha256 the MCP tools emit, category, status, frameworks, related, source link). Constraints set as numbered clauses (decimal-leading-zero counters, ConstraintBadge stamps, statement/rationale/verification in descending voices). **Human/Agent toggle**: Human = doc.mdx + structured contract sections; Agent = the raw contract JSON, server-side highlighted with ink steps only — accent marks nothing but RFC-2119 level keywords (added to the accent usage contract in tokens.css). Both panes server-rendered; the toggle only swaps visibility.
- **Getting started ([site/app/getting-started/page.tsx](site/app/getting-started/page.tsx))** — build + `claude mcp add` + `.mcp.json` in copyable mono blocks (CopyButton falls back to execCommand when the Clipboard API is unfocused), the 90-second demo as a ruled timeline matching DEMO.md's beats.
- **About** — thesis, conventions, TEMPLATE.md link, colophon.
- **Navigation/footer ([site/components/PageShell.tsx](site/components/PageShell.tsx))** — slim persistent masthead (mono wordmark, Patterns / Getting started / About / Subscribe, accent on the current page); footer is a full ruled section: catalog/source/contact link columns + colophon naming the typefaces.
- **Quality gates, measured not asserted:** CLS 0 on load (buffered layout-shift observer, fonts loaded); every token pair ≥4.5:1 in both modes (canvas-normalized measurement; light accent deepened `#0daa70→#08784d` 2.69→4.95:1, quiet ink step re-tuned 48%→58% mix for 4.59/4.96:1); keyboard: native links/buttons only, zero positive tabindex, ink focus outline; **index page budget: 0 JS, 7.7 KB gz CSS, 1.8 KB gz HTML** — a post-export step ([site/scripts/static-index.mjs](site/scripts/static-index.mjs)) strips the Next runtime from the script-free homepage (interactive pages keep it; first-load JS there is ~103 kB).
- **Extended palette** integrated into tokens.css as `light-dark()` pairs (deep set on light paper, bright set on dark) and exposed as Tailwind utilities; used for category marks. A palette block that clobbered `--line` (hairline color) with a `2.5ch` length was folded into `:root` during integration.

### Site — human layer (shipped 2026-06-12)

The parts that make it feel made by a person. Tone: warm, direct, zero marketing voice. All outward-facing facts live in [site/lib/site.ts](site/lib/site.ts).

- **Subscribe ([site/components/SubscribeBlock.tsx](site/components/SubscribeBlock.tsx))** — plain form POST to Buttondown's embed endpoint (works with zero JS; the homepage stays script-free). Mono email input with a visible label, filled accent button "Get new patterns", microcopy: *"One email when a new pattern ships. No streak emojis."* Placed: home above the footer, end of every pattern page, and [/subscribe](site/app/subscribe/page.tsx) as its own quiet page (which also points at RSS). **⚠ Launch blocker: the `agent-ux-contracts` Buttondown username must be claimed (or swapped in lib/site.ts) before the form goes live.**
- **Contact** — three honest channels as a ruled table on /about ([site/components/ContactTable.tsx](site/components/ContactTable.tsx)) and as questions in the footer: *Found a problem?* → pre-filled GitHub issue (where/what/expected template in the URL); *Want help implementing this at your org?* → mailto with the subject already filled (the consulting door, understated); *Just want to say something?* → plain email.
- **RSS ([site/app/feed.xml/route.ts](site/app/feed.xml/route.ts))** — static route handler generated from the contracts at build: title, link, summary + constraint counts per item, `guid = id@version` so contract revisions surface as new items. Item dates come from git history when available and are omitted rather than fabricated (note: dates appear once the patterns are committed — the repo currently has only the initial commit). Autodiscovery `<link>` in the layout; RSS linked in footer, /about colophon, and /subscribe.
- **404 ([site/app/not-found.tsx](site/app/not-found.tsx))** — in voice: "This pattern doesn't exist. Yet?" with three reads on why you're here (typo → check the index; broken link → pre-filled issue; missing pattern → make the argument) and the full index table as the recovery path. Exports as `404.html`.
- **Signature delight (user picked from three proposals): REV. stamps ([site/components/RevStamp.tsx](site/components/RevStamp.tsx))** — a mono version stamp angled 0.8–2°, the angle a deterministic hash of the pattern id, so the index reads like a hand-stamped ledger and each pattern page carries its stamp top-right. Pure CSS static transform: zero JS, nothing animates, nothing to motion-gate, `aria-label="revision x.y.z"`.
- **Audit:** form input labeled + `autocomplete="email"`, subscribe section is a labeled landmark, accent button is the measured 4.95/4.61:1 pair, stamps use the AA-passing quiet ink, zero animated elements added (the view-toggle fade remains the only animation, already reduced-motion-gated). Index page after additions: **0 JS, 8.0 KB gz CSS, 2.2 KB gz HTML**. DEMO.md unchanged — the site additions don't touch the MCP demo flow.

### Site — design foundation (shipped 2026-06-11, approved 2026-06-12)

[site/](site/) — Next.js 15 App Router, static export (`output: 'export'`), Tailwind v4 (CSS-first), TypeScript strict. Creative direction: field manual, not product page — rules/borders for separation, baseline grid, one accent, restraint. No gradients-as-decoration, no glassmorphism, no shadow cards, no pills, no emoji in UI.

- **[site/styles/tokens.css](site/styles/tokens.css)** — single-definition theming via `light-dark()` (no duplicated dark block; force a mode on any subtree with `data-theme`). Warm paper `#f7f2e8` / warm near-black ink `#211c15`; dark is true near-black `#141210` / warm off-white `#ece4d4`. One accent (editorial red-orange `#bf3b11` light / `#f95f2d` dark) with a written usage contract: MUST badges, active nav, link hover, subscribe affordance — nowhere else. Constraint levels: MUST=accent, SHOULD=ink-70, MAY=ink-45 (ink mixes via `color-mix`, no third palette). Type scale ratio 1.25, line heights snapped to the 4px baseline grid, 68ch measure.
- **Typography:** Stack Sans Notch (text voice, variable weight, geometric business sans) + Google Sans Code (content voice: pattern ids, contract excerpts, constraint rules), self-hosted via Fontsource. Alternative considered and rejected: IBM Plex Mono + JetBrains Mono — sturdier but more anonymous.
- **Primitives** ([site/components/](site/components/)): `PageShell` (64rem shell, 2px masthead rule, ruled footer colophon), `ConstraintBadge` (printed-stamp look: square corners, hairline frame, letterpress inset; MUST_NOT is the filled prohibition form), `PatternID` (mono small-caps feel — DOM text stays the literal lowercase id so copy is exact), `RuleDivider` (hairline/strong/double + labeled section variant), `Prose` (Newsreader at measure, square list markers, mono tables with ruled rows).
- **[/styleguide](site/app/styleguide/page.tsx)** — hidden review route (unlinked, noindex): palette swatches, the accent usage contract rendered as MUST/MUST_NOT rules, type scale specimens, a visible 4px-baseline overlay panel, every primitive, and forced light/dark panels side by side. **Review this route before any pages are built.**
- Root `npm run check` now includes the site typecheck. Build verified: static export, both modes verified in-browser (computed token values checked, not just screenshots).

## What's Next

### Phase 4: Launch

1. **Commit the work** — the repo has only the initial commit; committing also gives feed.xml its real per-pattern dates.
2. **Claim the Buttondown username** (`agent-ux-contracts`) or swap the constant in [site/lib/site.ts](site/lib/site.ts) — the subscribe forms POST to it.
3. **Deploy to Vercel** (per CLAUDE.md) — `site/out` static export is build-ready; update `SITE_URL` in lib/site.ts if the domain differs.
4. **Record the 90-second demo** — script is final in [mcp-server/DEMO.md](mcp-server/DEMO.md); embed the recording on /getting-started when it lands.
5. **Index filters/search** — category/tag filtering on the homepage table if the catalog grows past comfortable scanning; Base UI enters then.

## Known Constraints

- **Hard scope (do not expand):** 10 patterns (user expanded from 8), MCP 2 tools, no CLI, no database, no auth, no SaaS.
- **TypeScript everywhere.** Zod for schema parsing if needed; ajv for validation (already in use).
- **Every implementation must satisfy its own contract's MUST rules.** COMPLIANCE.md is the audit trail.
- **Accessibility is a contract field, not an afterthought.** Every pattern has WCAG criteria and tests run axe-core.
- **Prose tone:** direct, practitioner-to-practitioner, no marketing fluff.

## Files Worth Reading

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — The system map: the four subsystems on the schema spine, build-time and runtime data flows, the contract-hash linchpin, cross-cutting invariants, testing/CI, deployment, extension seams.
- **[AGENTS.md](AGENTS.md)** — How to work in this repo: the check gate, contract drift rules, implementation/MCP/site conventions, and the gotchas that have bitten us.
- **[docs/adr/](docs/adr/)** — Architecture decision records (contract-as-truth, two-pass search, static site, deterministic scaffolding).
- **[CLAUDE.md](CLAUDE.md)** — Project thesis and scope limits (brief, 1 page).
- **[patterns/TEMPLATE.md](patterns/TEMPLATE.md)** — Step-by-step authoring procedure (6 steps, checklist gates, 5 pages).
- **[patterns/streaming-response/](patterns/streaming-response/)** — Gold standard. Read the contract, the React/vanilla impls, the COMPLIANCE docs, the tests. Then use as a template for retrofitting the 7 patterns.
- **[package.json](package.json)** — Scripts (`npm test`, `npm run validate`, `npm run check`, `npm run new-pattern`).

## Commands

```bash
npm test                    # Run 242 tests (node:test glob patterns/**/*.test.{tsx,mjs})
npm run validate           # Validate 10 contracts against schema + cross-file checks
npm run typecheck          # tsc -p tsconfig.json (strict)
npm run check              # test + validate + typecheck + mcp-server check (all-or-nothing gate)
npm run new-pattern -- <id> [Display Name]  # Scaffold a pattern skeleton
npm --prefix mcp-server test   # 32 MCP server tests (incl. generated-code compile gate)
```
