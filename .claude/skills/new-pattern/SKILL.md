---
name: new-pattern
description: Author a new UX pattern end to end by following patterns/TEMPLATE.md — contract first, then React and vanilla implementations, tests, COMPLIANCE traces, and prose. Only run when the owner explicitly asks for a new pattern, because the catalog size is a hard scope limit.
argument-hint: "<pattern-id> [Display Name]"
disable-model-invocation: true
---

# Author a pattern: $ARGUMENTS

The catalog size is capped in `CLAUDE.md`. Before anything else, compare the
cap with `ls patterns/`. If adding this pattern exceeds the cap, stop and ask
the owner to confirm the scope change; if they confirm, update the cap in
`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, and `docs/NORTH-STAR.md` in the
same change.

## Procedure

Read `patterns/TEMPLATE.md` and `AGENTS.md` first. `patterns/streaming-response/`
is the reference for quality. Then:

1. **Check it is a new pattern.** Search the existing contracts' `name`,
   `aliases`, `tags`, and `dontUseWhen` for overlap. If an existing pattern
   covers most of it, say so and propose extending that contract instead.
2. **Scaffold.** `npm run new-pattern -- $ARGUMENTS`. The skeleton fails
   `npm run validate` on purpose; the validator output is the checklist.
3. **Write the contract and stop for review.** Atomic, testable constraints
   with stable ids and the right RFC-2119 level. At least one accessibility
   MUST. If a rule cannot be tested, downgrade it and flag it as copy review.
   Show the owner the constraint list (id, level, statement) and wait for
   approval before implementing. The contract is the product; the code is a
   projection of it.
4. **Implement React and vanilla.** Vanilla builds the DOM once and mutates
   it. Prop-driven state machines use edge detection. One exported vocabulary
   map per component for user-facing strings.
5. **Write tests** named `"<constraint-id>: <behavior>"`, with `axe-core` run
   in each meaningful state. Every MUST and MUST_NOT has at least one.
6. **Fill both `COMPLIANCE.md` files**: constraint-to-test table with
   anchors, plus deviations.
7. **Write `doc.mdx`.** Explain; never legislate. No new MUST in prose.
8. **Wire the projections**: a plain-language entry in
   `site/lib/plain-language.ts`, a demo in `site/components/demos/`, the
   row in the `README.md` table, compliance notes and option schema in
   `mcp-server/src/`, and at least two realistic queries in
   `mcp-server/evals/cases.ts`.
9. **Audit.** Run the `contract-auditor` subagent on the new pattern and fix
   what it finds.
10. **Gate.** `npm run check` and `npm --prefix site run build` both pass.
11. **Record.** Add a dated entry to `PROGRESS.md`.

Report the constraint count by level, the test count, any deviations
recorded, and anything the owner still needs to review by hand.
