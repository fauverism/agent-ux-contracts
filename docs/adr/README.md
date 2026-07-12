# Architecture Decision Records

Each ADR records one architecturally significant decision: the context, the
options weighed, what we chose, and what it costs us. They are **retrospective
where noted** — the decisions were made during v1; these records exist so a
human or an agent can recover the _why_ without replaying the git history or
re-deriving the trade-off (and re-breaking it).

The MCP server keeps its own finer-grained decision log in
[`../../mcp-server/DESIGN.md`](../../mcp-server/DESIGN.md) (decision / alternative
/ why, plus post-approval amendments). ADRs here are repo-wide; DESIGN.md is
MCP-internal. The big picture is in [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-contract-as-source-of-truth.md) | The contract is the source of truth | Accepted |
| [0002](0002-two-pass-lexical-search-ranking.md) | Two-pass lexical search ranking | Accepted |
| [0003](0003-static-site-build-time-contract-reads.md) | Static-export site, contracts read at build time | Accepted |
| [0004](0004-deterministic-scaffolding.md) | Deterministic scaffolding over reference implementations | Accepted |
| [0005](0005-kit-patterns-anatomy-per-export.md) | Kit patterns — anatomy per export | Accepted |

## Writing a new one

Copy the format below. Number sequentially. Keep options explicit even when the
choice is obvious — the value is the recorded alternative.

```markdown
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD
**Deciders:** who signs off

## Context
The forces at play; the constraints.

## Decision
What we're doing.

## Options Considered
### Option A — name   (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low/Med/High |
| Cost | … |
| Scalability | … |
| Team familiarity | … |
**Pros / Cons**

### Option B — name
…

## Trade-off Analysis
Why the chosen option wins given the context.

## Consequences
What gets easier / harder / needs revisiting.

## Action Items
- [ ] …
```
