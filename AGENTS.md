# AGENTS.md

Working instructions for coding agents (and the humans steering them) in this
repo. This is the **how to work here** doc. Its companions:

- [`CLAUDE.md`](CLAUDE.md) — what we're building and the scope (the brief).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the system is structured.
- [`docs/adr/`](docs/adr/) — why the load-bearing decisions were made.
- [`patterns/TEMPLATE.md`](patterns/TEMPLATE.md) — the mechanical procedure to author a pattern.
- [`mcp-server/DESIGN.md`](mcp-server/DESIGN.md) — MCP-internal decisions + amendments.

If you read one thing first, read **ARCHITECTURE.md §1** (the central invariant).

---

## The golden rule

**The contract is the only source of truth for behavior.** Normative rules live
in `patterns/<id>/pattern.contract.json` as RFC-2119 constraints with stable
ids — nowhere else. Do **not** introduce a new MUST/SHOULD in prose, in a code
comment, or in a test. If you believe behavior should change, change the
contract first (and bump its version), then make code and docs follow.

Corollaries:
- Every MUST has a named test, mapped in `COMPLIANCE.md`. No silent gaps.
- Search misses are **vocabulary** bugs: fix them by adding `aliases`/`tags` to
  the contract + a patch bump, not by hacking ranking.
- Accessibility is a contract field and a tested behavior, not a finishing pass.

---

## Before you say "done": run the gate

```bash
npm run check
```

This is one all-or-nothing gate:

```
npm test                       # 242 catalog tests (schema mutation + react + vanilla, axe in states)
&& npm run validate            # 10 contracts: ajv schema + cross-file integrity
&& npm run typecheck           # tsc strict
&& npm --prefix mcp-server run check   # 32 MCP tests + 19/19 search evals + typecheck
&& npm --prefix site run typecheck     # site strict typecheck
```

Everything must be green. The MCP check **compiles the generated React and runs
generated tests**, and the eval harness is part of it — so "the scaffold works"
and "search still ranks correctly" are enforced, not assumed.

Useful narrower commands:

```bash
npm test -- patterns/streaming-response/react/StreamingResponse.test.tsx  # one test file (glob)
npm run validate                         # contracts only
npm --prefix mcp-server run eval         # search scorecard only
npm run new-pattern -- <id> [Display Name]   # scaffold a new pattern skeleton
npm --prefix site run dev                # site dev server (see the gotcha below)
npm --prefix site run build              # static export → site/out
```

---

## Repo map (quick)

```
schema/      pattern-contract.schema.json — the contract of contracts
patterns/    <id>/ : pattern.contract.json + doc.mdx + react/ + vanilla/ + COMPLIANCE.md
scripts/     validate-contracts.mjs (CI gate), new-pattern.mjs, setup-dom.mjs
mcp-server/  TypeScript MCP server (stdio): search + scaffold tools; evals/; DESIGN.md
site/        Next.js static-export field manual: app/ components/ lib/ styles/
docs/adr/    architecture decision records
```

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Changing a pattern

Follow [`patterns/TEMPLATE.md`](patterns/TEMPLATE.md). In short:

1. `npm run new-pattern -- <id>` scaffolds a skeleton that **intentionally fails
   `validate`** — the validator is your checklist; drive it to green.
2. Write the contract: atomic, testable constraints with stable ids and the
   right RFC-2119 level. If a rule can't be tested, downgrade it (e.g. to
   SHOULD_NOT) and flag it as copy-review in COMPLIANCE — don't pretend.
3. Implement React **and** vanilla (required for `stable`).
4. Write tests named `"<constraint-id>: <behavior>"`; run `axe-core` in each
   meaningful state.
5. Fill `COMPLIANCE.md`: a constraint→test table (anchors, not line numbers) +
   any deviations.
6. Write `doc.mdx` prose. Explain; never legislate.

**When you edit an existing contract**, treat versioning as load-bearing:

| Change | Bump |
|--------|------|
| Clarification, retrieval vocabulary (`aliases`/`tags`), non-normative wording | **patch** |
| Additive non-MUST behavior | **minor** |
| A MUST added, removed, or its meaning changed | **major** |

Bumping the version changes the contract hash automatically. Re-trace COMPLIANCE
if behavior moved, and update the impls' trace headers.

---

## Implementation conventions (the ones learned the hard way)

- **Vanilla builds the DOM once** and mutates text/attributes. No `innerHTML`
  rebuilds — they drop focus and re-create live regions, silently breaking
  accessibility MUSTs.
- **Prop-driven state machines use edge detection** (a prev-value ref). Don't let
  a user action be overwritten when the host re-reports stale state. (This is the
  streaming-response stop-button regression that created the `focus-not-lost`
  MUST — see that pattern as the reference.)
- **One exported vocabulary map per component** for user-facing strings.
- Tests use `node:test` + `tsx` + `global-jsdom` + `@testing-library/react` +
  `axe-core`. There is **no Jest/Vitest** in the catalog.

## MCP server conventions

- **Log to stderr only.** stdout is the stdio transport; a stray `console.log`
  corrupts the protocol.
- **Errors are in-band structured data**, not thrown protocol errors:
  `{ code, message, next_action, ...context }`.
- **The search eval is a gate.** If you touch ranking or vocabulary, keep
  `mcp-server/evals` at 19/19. Add real misses to `evals/cases.ts`.
- Record non-trivial decisions as **amendments in `DESIGN.md`** (decision /
  alternative / why) — the owner reviews design docs before implementation.
- The contract hash lives in `mcp-server/src/hash.ts`. It is **duplicated** in
  `site/lib/patterns.ts` on purpose (no shared package across that boundary).
  **If you change canonicalization in one, change it in the other** or the site
  and MCP will disagree about the same contract's hash.

## Site conventions

- **Design tokens and primitives own their CSS** (`site/styles/tokens.css`,
  `primitives.css`); Tailwind utilities are for page layout. Don't hardcode
  colors — use the tokens.
- **The accent has a written usage contract** (top of `tokens.css`): MUST badges,
  active nav, link hover, the subscribe affordance, and RFC-2119 keywords in the
  Agent JSON view — **nowhere else.** No decorative accent, no gradients-as-
  decoration, no shadow cards, no pills (radius ≤ 1px), no emoji in UI.
- **Theming is single-definition** via `light-dark()`. Force a mode on a subtree
  with `data-theme`. Grays are `color-mix` of ink — no third palette.
- **The index page must stay 0 JS.** It works because the homepage has no client
  components; a post-export step (`scripts/static-index.mjs`) strips the runtime
  from `out/index.html`. Don't add a client component to the homepage without
  accepting the JS cost.
- **Keep client interactivity in isolated `'use client'` islands** (currently
  `ViewToggle`, `CopyButton`). Server-render everything else.
- Fonts load from the **Google Fonts CDN** (`app/layout.tsx`) — DM Sans + Google
  Sans Code. If you add a weight/face, update that `<link>`.

---

## Gotchas (read these — they have bitten us)

- **Don't run `next build` while `next dev` is running on the same `.next`.** The
  production build clobbers the dev server's chunks and you get "Application
  error" / `MODULE_NOT_FOUND` in dev. Stop dev first; if it's already corrupted,
  `rm -rf site/.next` and restart dev.
- **`tsx` reads `tsconfig.json` from the current working directory.** A consumer
  project running scaffolded tests needs `"jsx": "react-jsx"` in its own
  `tsconfig`, or JSX falls back to classic and "React is not defined" appears.
- **Substring search has no stemmer.** "failed" doesn't match "failure". v1
  closes these gaps with contract `aliases` (which double as documentation), not
  a stemmer. Add the alias.
- **The repo currently has only the initial commit.** Things that read git
  history degrade gracefully but stay empty until you commit — notably the RSS
  feed's per-item `pubDate` (`site/app/feed.xml/route.ts`). Commit the work to
  populate dates.
- **`scaffold` options must never strip MUST-implementing code.** If you add an
  option, prove it only varies inessentials (see ADR-0004).

---

## Scope guardrails (do not expand without the owner)

10 patterns, MCP 2 tools, no CLI, no database, no auth, no SaaS. Growth slots
into existing seams — `SearchProvider` for better search, new pattern dirs for
new patterns, `'use client'` islands for site interactivity — not new surfaces.
Deferred v1.1 items are listed in [`PROGRESS.md`](PROGRESS.md).

## Git / PR hygiene

- Branch off `main`; don't commit or push unless asked.
- End commit messages with the `Co-Authored-By` footer the harness expects.
- After a change, update [`PROGRESS.md`](PROGRESS.md); update
  [`mcp-server/DEMO.md`](mcp-server/DEMO.md) only if you changed the demo flow.
