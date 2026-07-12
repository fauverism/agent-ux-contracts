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
schema/      pattern-contract.schema.json — the contract of contracts (JSON Schema 2020-12)
patterns/    <id>/pattern.contract.json + doc.mdx + react/ + vanilla/
scripts/     validate-contracts.mjs — CI gate: schema + cross-file checks
mcp-server/  search_patterns + scaffold_pattern tools (stdio MCP)
site/        static-export field manual generated from the contracts
docs/adr/    architecture decision records
```

Every implementation directory carries a `COMPLIANCE.md` tracing each contract
constraint to the code that satisfies it. Accessibility is a contract field —
WCAG criteria, keyboard tables, and screen reader behavior are part of the
machine-readable spec, not an appendix.

## Documentation

| Doc | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The system map: subsystems, data flows, invariants, the contract-hash linchpin. |
| [AGENTS.md](AGENTS.md) | How to work in this repo (the check gate, conventions, gotchas) — for agents and the humans steering them. |
| [docs/adr/](docs/adr/) | Why the load-bearing decisions were made. |
| [CLAUDE.md](CLAUDE.md) | The brief: thesis and scope. |
| [PROGRESS.md](PROGRESS.md) | Current status and what's next. |
| [patterns/TEMPLATE.md](patterns/TEMPLATE.md) | The mechanical procedure to author a pattern. |
| [mcp-server/DESIGN.md](mcp-server/DESIGN.md) | MCP-internal decisions and amendments. |

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
related-pattern referential integrity, that every declared implementation
exists with a compliance report, and that every contract state is accounted
for in each implementation — present in the source or documented as an
explicit deviation in its COMPLIANCE.md.

## Roadmap

- `mcp-server/` — `search_patterns` and `scaffold_pattern` tools so agents
  consume contracts at generation time
- `site/` — static docs site generated from contract + prose
