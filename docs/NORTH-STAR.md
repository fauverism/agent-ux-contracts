# North Star

Why this repo exists, who it is for, and what stands between today and a
product people use. Read this first after any time away. It is the *intent*
doc; its companions cover the rest:

| Question | Doc |
| --- | --- |
| Why does this exist, and what is next? | this file |
| What are the scope limits? | [`CLAUDE.md`](../CLAUDE.md) |
| How do I work here? | [`AGENTS.md`](../AGENTS.md) |
| How is it built? | [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/adr/`](adr/) |
| What shipped, and when? | [`PROGRESS.md`](../PROGRESS.md) |
| How do I use Claude on this repo? | [`CLAUDE-PLAYBOOK.md`](CLAUDE-PLAYBOOK.md) |

**Last verified against the repo: 2026-11-11.** Run `/catch-up` for a fresh
read; run `/drift-check` to test this file against reality.

---

## The thesis (does not change)

> Design systems for humans are documentation. Design systems for agents are
> contracts.

A UX pattern here is a machine-readable `pattern.contract.json` of RFC-2119
constraints. Docs, reference implementations, the MCP server, and the site are
projections of that contract. If a behavior is not in a contract, it is not
real.

## Who it is for

Frontend and UX engineers who build AI interfaces and increasingly have a
coding agent write the first draft. They know what a good streaming response
or approval gate feels like, and they are tired of re-explaining it to an
agent, then reviewing output that silently drops the accessibility half.

The first user is the author. The test for every decision: **would I reach for
this on a real project this week?**

## What "a product" means here

Someone who has never seen this repo can go from "I need an approval gate" to
compliant, tested code in their own project in a few minutes, and can tell
later whether their copy has drifted from the contract. Three things make
that true:

1. **Findable** — a live site that explains the pattern to humans and agents.
2. **Installable** — a way to consume it without cloning the repo and wiring
   absolute paths.
3. **Trustworthy** — every MUST traced to a test, a contract hash to pin, and
   a public gate that proves it stays that way.

## Where it stands (2026-11-11)

Built and green:

- 10 patterns, each with a contract, `doc.mdx`, React and vanilla
  implementations, tests, and a `COMPLIANCE.md` trace.
- MCP server with `search_patterns` and `scaffold_pattern`, a search eval
  scorecard in the gate, deterministic scaffolding.
- Static site: index, pattern pages with live demos and a Human/Agent toggle,
  plain-language overviews, an adoption section that does not require Claude
  Code, RSS, subscribe.
- `npm run check` passes end to end. `npm --prefix site run build` produces a
  clean static export.

Not true yet, in rough order of how much each blocks real use:

| # | Gap | Evidence | Kind |
| --- | --- | --- | --- |
| 1 | **The site is not live.** `https://agent-ux-contracts.vercel.app` returns Vercel `DEPLOYMENT_NOT_FOUND`. | `curl -I` on 2026-11-11; `SITE_URL` in `site/lib/site.ts` | Launch blocker |
| 2 | **The license forbids the adoption path.** `LICENSE.md` is "All Rights Reserved", while every pattern page tells readers to clone the repo and copy the implementation. | `LICENSE.md`, `site/components/AdoptSection.tsx` | Owner decision |
| 3 | **The MCP server only installs from a local clone.** Both packages are `private`, nothing is published, setup needs an absolute path to `dist/index.js`. | `mcp-server/package.json`, `mcp-server/README.md` | Product gap |
| 4 | **The subscribe form posts to an unclaimed Buttondown username.** | `BUTTONDOWN_USERNAME` in `site/lib/site.ts` | Launch blocker |
| 5 | **The 90-second demo is scripted but not recorded.** | `mcp-server/DEMO.md` | Launch asset |
| 6 | **No real usage signal.** The search evals are authored, not harvested from real agent queries. | `mcp-server/evals/cases.ts` | Learning gap |

Closed on 2026-11-11: there was no CI despite the docs calling the check gate
"CI" (now `.github/workflows/check.yml`), and `AGENTS.md` was not being loaded
into Claude sessions (now imported from `CLAUDE.md`).

## Decisions only the owner can make

These are open. Nothing in the repo settles them, and Claude should ask
rather than assume.

1. **License.** Staying "All Rights Reserved" means the catalog is a
   portfolio piece and a consulting door. A permissive license (MIT or
   Apache-2.0 for code, optionally CC BY for prose) makes it a product others
   can adopt. The site copy currently assumes the second.
2. **Distribution.** Options, smallest first: keep clone-and-build; publish
   the MCP server to npm so setup is one `npx` line; add an HTTP transport so
   it can be hosted. The last two each touch a hard scope limit ("no CLI",
   "no SaaS") and need an explicit yes.
3. **Scope after v1.** The cap is 10 patterns and 2 MCP tools. Deferred
   candidates are recorded in `PROGRESS.md` (embeddings search,
   `check_consistency` tool, HTTP transport, light stemming, eval corpus from
   real traffic). Which of these matters depends on what real use shows.
4. **Domain.** Keep the `vercel.app` subdomain or move to an owned domain;
   `SITE_URL` is the single place to change.

## How to choose what to work on

In order. Stop at the first rule that answers the question.

1. Is the gate red? Fix that.
2. Is something a stranger would hit broken (gaps 1 to 4)? Fix that before
   building anything new.
3. Did real use expose a miss, such as a search query that found nothing, a
   scaffold that needed hand edits, or a contract rule that was wrong in
   practice? Fix the contract first, then the code. Add the query to the
   evals.
4. Only then: new patterns or new surface, and only with an explicit scope
   decision.

Work that fails "would I reach for this on a real project this week?" waits.

## Keeping this file true

- A change to audience, scope, license, or distribution is a change to this
  file, in the same PR.
- When a gap closes, move it to the "Closed" line with the date. When a
  decision is made, record it here in one line and write an ADR if it is
  architectural.
- No test counts or other volatile numbers in this file. Link to the command
  that produces them.
