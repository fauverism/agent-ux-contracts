# ADR-0001: The contract is the source of truth

**Status:** Accepted
**Date:** 2026-06-10 (recorded retrospectively 2026-06-18)
**Deciders:** project owner

## Context

Coding agents now write a large share of interface code, and they cannot read a
styleguide. A UX pattern that lives as prose + screenshots is invisible to the
tool doing the work. We needed a representation of a pattern that is
simultaneously: (a) precise enough for a machine to act on, (b) verifiable in
CI, and (c) renderable as human documentation — without those three drifting
apart.

The failure mode we were designing against is the usual one: the doc says one
thing, the code does another, the test covers a third, and nobody notices until
a user does.

## Decision

Make a single artifact normative: `pattern.contract.json`, a set of atomic
RFC-2119 constraints with stable ids, validated against a JSON Schema. Every
other surface is **derived from or checked against** that contract:

- human docs = contract + `doc.mdx` prose (prose explains, never legislates),
- implementations must satisfy every MUST and prove it in `COMPLIANCE.md`,
- the MCP server serves the contract to agents,
- CI validates the contract's shape and the catalog's cross-file integrity.

If a behavior is not in a contract, it does not exist.

## Options Considered

### Option A — Machine-readable contract as the source of truth (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — needs a schema, a validator, and discipline |
| Cost | Up-front authoring cost per pattern |
| Scalability | High — new consumers (site, MCP, future tools) read the same file |
| Team familiarity | High — JSON Schema + RFC-2119 are well understood |

**Pros:** one truth; machine- and human-consumable; CI can enforce it; new
consumers are projections, not forks. **Cons:** writing a good contract is
harder than writing a doc; requires constraints to be _testable_.

### Option B — Prose docs with code samples (the conventional pattern library)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Low to start |
| Scalability | Low — every consumer re-interprets prose |
| Team familiarity | High |

**Pros:** fast, familiar, flexible. **Cons:** not machine-actionable; doc/code/test
drift is unpreventable; an agent can't consume it reliably.

### Option C — Code as the source of truth (the reference impl _is_ the spec)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** no separate artifact to keep in sync; "the code is always right."
**Cons:** the spec is then framework-specific; there's no neutral, queryable,
diffable statement of intent; "why" is buried in implementation; two
implementations (React + vanilla) have no shared authority to agree with.

## Trade-off Analysis

Option B fails requirement (a) outright — agents can't act on prose. Option C
fails (b) and the neutrality we need for _two_ implementations: if the React
code is the spec, the vanilla code has nothing language-independent to conform
to, and "compliance" becomes "matches the other implementation," which is
circular. Option A pays an authoring tax but is the only one where docs, code,
and tests all answer to the same authority, and where that authority is a
small, diffable, machine-queryable file. The tax is mitigated by making the
validator a checklist (`new-pattern` scaffolds an intentionally-invalid
skeleton) and by `TEMPLATE.md`.

## Consequences

- **Easier:** adding a new consumer (the site, the MCP server, a future linter)
  — it's a projection. Catching drift — CI validates structure; COMPLIANCE maps
  every MUST to a test.
- **Harder:** authoring. A constraint must be stated atomically and testably, or
  it doesn't belong (untestable rules get downgraded and flagged).
- **Revisit when:** a constraint type recurs that the schema can't express; or a
  third implementation language strains the "two impls agree with one contract"
  model.

## Action Items

- [x] JSON Schema 2020-12 + ajv strict validation (`schema/`)
- [x] Cross-file integrity checks in CI (`scripts/validate-contracts.mjs`)
- [x] COMPLIANCE.md constraint→test convention for every implementation
- [x] `new-pattern` scaffold that fails validation until completed
