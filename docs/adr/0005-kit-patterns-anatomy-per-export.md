# ADR-0005: Kit patterns — anatomy per export

**Status:** Accepted
**Date:** 2026-07-06
**Deciders:** project owner

## Context

The contract machinery was shaped around *control* patterns: one component,
one state machine, constraints about its behavior. That fit approval-gate and
streaming-response perfectly — and strained source-attribution, which is not
a component but a **kit**: inline anchors, a consolidated list, an
uncited-passage wrapper, and a dedupe helper, woven through host-rendered
prose.

A product-owner UX review (2026-07) traced the cost of forcing kits into the
component mold:

- Anatomy described *regions* ("source-metadata", "citation-list") that
  mapped to no artifact an implementer could grab; the uncited-passage export
  wasn't in the anatomy at all despite having its own constraint.
- The pattern's most-violated rule — number anchors from the *consolidated*
  list, so repeated citations share an index — lived only in doc.mdx "Agent
  notes": invisible to the contract machinery, unnamed, untestable, and in
  the section human skimmers skip.
- Nothing checked that the exports the doc promised actually existed in each
  implementation.

The review predicted every transparency-category pattern would accumulate
"nothing resolves this ambiguity" gaps as the catalog grows, because the
single-component template gives kit rules nowhere to live.

## Decision

1. **Contracts declare their shape.** An optional `kind` field:
   `component` (default) or `kit`.
2. **Kit anatomy is anatomy-per-export.** Every anatomy part of a kit MUST
   carry an `export` map — framework → owning code symbol
   (`{"react": "CitationAnchor", "vanilla": "SourceAttribution.createAnchor"}`).
   The schema enforces presence (kit ⇒ every part has `export`); the
   validator enforces truth (every declared framework has a mapping, and
   every mapped symbol exists in that implementation's source).
3. **Coordination rules are constraints, not notes.** Rules that govern how
   the exports relate — the reason a kit is one pattern rather than N — go
   in the `constraints` array with tests, like any other normative rule.
   `consolidated-numbering` (source-attribution 0.2.0) is the reference
   promotion: previously an Agent-notes sentence, now a MUST with a named
   test in both implementations and a scaffold compliance anchor.
4. **States stay.** Kits keep the states array; states that live in the host's
   view or are deliberately unimplemented are documented under COMPLIANCE.md
   "State coverage" (the ADR-adjacent validator rule from the same review).

## Consequences

- source-attribution is the first `kit` contract (0.1.0 → 0.2.0: anatomy
  restructured per-export, `consolidated-numbering` added at MUST level —
  a breaking change by the versioning rule).
- The site's anatomy table shows the owning export per framework, so a
  developer can go from "part" to "symbol I import" without reading source.
- Authoring guidance lives in patterns/TEMPLATE.md §1 ("Is it a component or
  a kit?"). The schema's mutation suite covers the new rules.
- `export` maps are legal on component patterns too (optional there) — a
  component that grows a second export can adopt the convention without a
  reclassification.
