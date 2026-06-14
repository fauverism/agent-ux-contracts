# agent-ux-contracts

Design systems for humans are documentation; design systems for agents are
contracts. This is a catalog of AI interface UX patterns where the contract is
the artifact: each pattern ships as a machine-readable
`pattern.contract.json` (RFC-2119 MUST/SHOULD constraints), human docs
generated from that contract plus prose (`doc.mdx`), and reference
implementations that trace their compliance constraint-by-constraint.

## Patterns (v1)

| Pattern | Category | One-liner |
| --- | --- | --- |
| [interruption-cancel](patterns/interruption-cancel/) | control | Cancel agent work with instant acknowledgment and an honest account of side effects |
| [prompt-composer](patterns/prompt-composer/) | input | Enter sends, Shift+Enter newlines, drafts survive, IME-safe |
| [refusal-messaging](patterns/refusal-messaging/) | feedback | Refusals as responses: reason given, path forward, never error-styled |
| [streaming-response](patterns/streaming-response/) | output | Progressive rendering that stays readable, interruptible, accessible |
| [confidence-indicator](patterns/confidence-indicator/) | transparency | Plain-language certainty signals, from high confidence to refusal |
| [source-attribution](patterns/source-attribution/) | transparency | Citations users can verify, deduped and keyboard-operable |
| [thinking-visibility](patterns/thinking-visibility/) | transparency | Collapsible working notes that never masquerade as the answer |
| [approval-gate](patterns/approval-gate/) | control | Explicit, informed consent before consequential agent actions |
| [error-recovery](patterns/error-recovery/) | feedback | Failures that preserve input and always offer a way forward |
| [generation-control](patterns/generation-control/) | control | Regenerate and variants without silently destroying output |

## Structure

```
schema/    pattern-contract.schema.json — the contract of contracts (JSON Schema 2020-12)
patterns/  <id>/pattern.contract.json + doc.mdx + react/ + vanilla/
scripts/   validate-contracts.mjs — CI gate: schema + cross-file checks
```

Every implementation directory carries a `COMPLIANCE.md` tracing each contract
constraint to the code that satisfies it. Accessibility is a contract field —
WCAG criteria, keyboard tables, and screen reader behavior are part of the
machine-readable spec, not an appendix.

## Validation

```bash
npm test           # schema behavior suite (ajv strict mode + mutation tests)
npm run validate   # every contract: schema + referential integrity + compliance files
npm run typecheck  # React reference implementations
npm run check      # all of the above
```

The schema enforces what schemas can: RFC-2119 keyword/level consistency,
at least one accessibility constraint and one MUST-level rule per contract,
exactly one initial state. The validate script covers what they can't:
id ↔ directory agreement, unique constraint ids, state-transition and
related-pattern referential integrity, and that every declared implementation
exists with a compliance report.

## Roadmap

- `mcp-server/` — `search_patterns` and `scaffold_pattern` tools so agents
  consume contracts at generation time
- `site/` — static docs site generated from contract + prose
