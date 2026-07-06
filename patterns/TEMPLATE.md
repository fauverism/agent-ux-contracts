# How to create a new pattern

Mechanical procedure. Follow it in order; every step has a check that tells
you whether you're done. The contract comes first — implementations satisfy
contracts, never the reverse.

## 0. Scaffold

```bash
npm run new-pattern -- <kebab-case-id> [Display Name]
```

This creates the directory layout with a contract skeleton that
**intentionally fails** `npm run validate`. The validator is the checklist:
when it goes green, the structure is complete.

## 1. Write the contract (`pattern.contract.json`)

Resolve every TODO. Rules that the schema cannot fully enforce:

- **One behavior per constraint.** If a statement needs "and" to connect two
  separately-testable behaviors, split it.
- **The statement keyword matches the level.** A `MUST_NOT` constraint says
  "MUST NOT" in its statement; a `MUST` constraint never does.
- **Every MUST is testable as written.** Before keeping a MUST, write its
  `verification` as the literal assertion that will prove it ("Unit test:
  …asserts X"). If you can't phrase the assertion, the constraint is vague —
  rewrite it. Watch for words like "selectable", "clear", "intuitive",
  "appropriate": they don't assert.
- **Check the edges.** The streaming-response review found a MUST that was
  unimplementable when focus sat on a control the state change removed.
  Walk each constraint through every state transition before trusting it.
- **Keyboard/screenReader tables are commitments, not aspirations.** Anything
  promised there must exist in both implementations (e.g. Escape-to-stop).
- At least one `accessibility`-category constraint and one MUST-level
  constraint (schema-enforced).
- References must be real, resolvable URLs you have actually verified.

Check: `npm run validate` passes for the contract-level rules.

## 2. Write the implementations

`react/<Pascal>.tsx` and `vanilla/<Pascal>.js`. House conventions:

- TypeScript for React: typed props interface, plain function component,
  named export matching the filename.
- Vanilla: ES class with `mount(container)` / `destroy()`; **build the DOM
  once** and mutate in place — never rebuild via `innerHTML` (it destroys
  focus, recreates live regions, and detaches listeners).
- All text via `textContent` / JSX text — no `innerHTML` with caller data.
- Live regions: one stable element, created once, only its text changes;
  reset its text when a cycle restarts so identical messages re-announce.
- Generate element ids per instance (`useId` / counter) — never fixed ids.
- Shared vocabulary (labels, announcements) lives in one exported map both
  the implementation and its tests import.
- No `autoFocus`, no focus moves except a contract-mandated recovery.
- Driving state from props? Detect **edges** (prev-value ref), don't compare
  against display state — see the stop-button regression in
  `streaming-response/react/COMPLIANCE.md`.

## 3. Write the tests

`react/<Pascal>.test.tsx` and `vanilla/<Pascal>.test.mjs` (stubs exist).
Infrastructure is already wired: node:test + tsx + jsdom via
`scripts/setup-dom.mjs`, Testing Library, axe-core.

- **One test per MUST/MUST_NOT**, named `"<constraint-id>: <behavior>"`.
- An axe test (WCAG A/AA tags, `color-contrast` disabled — jsdom has no
  layout) in each meaningful state.
- Break-it cases: rapid re-invocation, zero-length input/output, settle
  during user interaction, unmount mid-cycle, double activation of any
  control.

Check: `npm test` — the suite globs `patterns/**/*.test.{tsx,mjs}`.

## 4. Fill in COMPLIANCE.md (both implementations)

Use the table format from the stub: constraint | level | how satisfied |
test name(s). Every MUST row cites at least one real test by name. SHOULD/MAY
items not implemented go under "Deviations and notes" with the reason —
honesty over coverage theater. Reference code by anchor (function/element
names), never line numbers; they rot.

Add a "State coverage" section for any contract state the implementation
collapses, renames, or leaves to the host — the validator fails a state that
appears in neither the source nor COMPLIANCE.md. Unmentioned is
indistinguishable from forgotten.

## 5. Fill in doc.mdx

Practitioner prose: the failure modes the pattern prevents and the judgment
calls behind the constraints. Usage snippets for both implementations. An
"Agent notes" section with the rules an agent must not violate when
generating this pattern.

## 6. Finish

- Add a row to the README pattern table.
- `npm run check` — schema tests, contract validation, pattern tests, and
  typecheck all green.

## Definition of done

- [ ] `npm run check` green
- [ ] Every MUST/MUST_NOT has a named test and a COMPLIANCE row citing it
- [ ] Keyboard/screenReader table promises exist in both implementations
- [ ] axe passes in every meaningful state
- [ ] doc.mdx prose + agent notes written
- [ ] README table row added
