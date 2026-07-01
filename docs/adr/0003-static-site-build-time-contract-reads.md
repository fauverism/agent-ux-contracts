# ADR-0003: Static-export site, contracts read at build time

**Status:** Accepted
**Date:** 2026-06-12 (recorded retrospectively 2026-06-18)
**Deciders:** project owner

## Context

The site is a field manual: a pattern index and one page per pattern, generated
from `pattern.contract.json` + `doc.mdx`. The content changes only when a
contract changes (i.e. at author time, in git), never per request. There is no
user data, no auth, no personalization. We want the index page in particular to
be fast and durable, and we want the pages to be provably consistent with the
contracts the MCP server serves.

## Decision

Build the site with Next.js App Router in **static export mode**
(`output: 'export'`). Read the contract files directly from the repo with
`node:fs` **at build time** in server components (`site/lib/patterns.ts`); there
is no API and no database. Compute the contract hash in the site using the **same
canonicalization as the MCP server** so the two agree (see ARCHITECTURE §8).

Push the index page to **zero JavaScript**: it has no client components, so a
post-export step (`site/scripts/static-index.mjs`) strips the Next runtime
`<script>` tags from `out/index.html` only. Interactive pages keep their runtime.

## Options Considered

### Option A — Static export, build-time fs reads (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — no server, no data layer |
| Cost | Free hosting (CDN); fast |
| Scalability | Trivial — it's files |
| Team familiarity | High — Next App Router |

**Pros:** pages are pure functions of the contracts; no runtime to break or
secure; CDN-cacheable; the hash links site ↔ MCP; index ships 0 JS.
**Cons:** content updates require a rebuild (fine — content lives in git); fs
reads cross the `site/ → ../patterns/` boundary at build (acceptable, build-only).

### Option B — Next.js with a server runtime (SSR / route handlers reading a DB)

**Pros:** dynamic content, on-demand revalidation. **Cons:** a server to run and
secure for content that never changes per request; over-built; couples uptime to
a database we don't have a reason to add.

### Option C — Hand-rolled static site generator

**Pros:** no framework weight. **Cons:** reinvents routing, MDX rendering, and
the build pipeline; loses React Server Components, which make the contract→HTML
projection trivial.

## Trade-off Analysis

The content's update cadence (git commits, not requests) makes a runtime pure
overhead — Option B adds operational surface for zero functional gain. Option C
trades a well-understood framework for bespoke build tooling we'd maintain
forever. Option A matches the shape of the problem: contracts are static inputs,
pages are static outputs, the build is the only moment they meet. The 0-JS index
is a bonus the architecture _allows_ (no client components on the homepage) and a
cheap post-export script _realizes_.

The one cost worth flagging: fonts now load from the **Google Fonts CDN** via a
`<link>` (DM Sans + Google Sans Code), which reintroduces a single third-party
runtime request to an otherwise self-contained export. If "no third-party
requests" or offline resilience becomes a requirement, self-hosting the fonts is
the documented fallback.

## Consequences

- **Easier:** hosting (static files on Vercel); reasoning about correctness
  (pages are deterministic from contracts); keeping site and MCP in agreement
  (shared hash).
- **Harder:** anything genuinely dynamic later (filters, full-text search) must
  arrive as `'use client'` islands — and the 0-JS index only stays 0-JS while the
  homepage has no client component.
- **Revisit when:** content needs to change without a deploy, or interactive
  features outgrow small client islands.

## Action Items

- [x] `output: 'export'`, `trailingSlash: true` (`site/next.config.ts`)
- [x] Build-time data layer (`site/lib/patterns.ts`) reading `../patterns/*`
- [x] Contract hash matched to the MCP server's algorithm
- [x] `static-index.mjs` post-export strip wired into `build`
- [ ] Self-host fonts if third-party-request-free / offline becomes a requirement
