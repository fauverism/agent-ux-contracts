# agent-ux-contracts MCP server

Two tools over the pattern catalog, stdio transport:

- **`search_patterns(query, category?, framework?)`** — ranked search with a
  one-sentence rationale per result explaining *why* it matched, MUST-level
  constraint summaries, and `contract_hash` for pinning. Empty results return
  the category map and near-miss suggestions, never a void.
- **`scaffold_pattern(pattern_id, framework, options?)`** — a known-compliant
  starting implementation generated deterministically from the reference
  templates: component + tests + COMPLIANCE.md, plus the full constraints
  array and `compliance_notes` mapping every MUST rule to the code anchor
  that satisfies it. The receiving agent can verify, not just trust.

The server owns no pattern data — it reads `../patterns/*/pattern.contract.json`
at startup, validates each against `../schema/pattern-contract.schema.json`
(ajv strict, same config as the CI gate), refuses to serve invalid contracts,
and logs which ones failed. Design decisions and trade-offs: [DESIGN.md](DESIGN.md).

## Setup

```bash
cd mcp-server
npm install
npm run build      # emits dist/
npm run check      # 32 tests + typecheck
```

### Claude Code

```bash
claude mcp add agent-ux-contracts -- node /absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js
```

Or in `.mcp.json` (project scope) / `~/.claude.json` (user scope):

```json
{
  "mcpServers": {
    "agent-ux-contracts": {
      "command": "node",
      "args": ["/absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js"]
    }
  }
}
```

No build step during development: swap the command for
`npx tsx /absolute/path/to/agent-ux-contracts/mcp-server/src/index.ts` and set
`"env": { "MCP_DEV": "1" }` — contract edits are picked up per tool call via
mtime checks, no restart needed.

Running the server from outside the repo? Set `AGENT_UX_CONTRACTS_ROOT` to the
checkout that contains `patterns/` and `schema/`.

## Example conversations

**1. Finding the right pattern**

> **You:** I'm building a chat UI — the model takes ~10s to respond and users
> complain it feels frozen. What pattern applies?
>
> **Claude** calls `search_patterns({ query: "long response latency feels frozen progressive output" })`
> and reads the top result's rationale ("Problem match: 'Model responses
> arrive over seconds, not milliseconds…'"), then answers: *streaming-response
> (output, v0.2.0). Its MUSTs: render progressively, visible stop control,
> partial output preserved, completion announced to assistive tech, never
> steal focus. Caution check: if you must moderate the full output before
> showing any of it, this pattern explicitly excludes your case.*

**2. Scaffolding with verification**

> **You:** Scaffold the approval gate in React so agent tool-calls need
> consent first.
>
> **Claude** calls `scaffold_pattern({ pattern_id: "approval-gate", framework: "react" })`,
> writes the three files, then walks the `compliance_notes`: *every MUST is
> anchored — `explicit-consent` at the `status !== 'proposed'` guard,
> `gate-announced` at `GATE_ANNOUNCEMENTS`… Running the included tests: 14
> pass. Pin `version 0.1.0` + `contract_hash 9a41…` in your lockfile note; a
> hash change with an unchanged version means drift.*

**3. Recovering from a wrong call**

> **You:** Scaffold diff-based-editing for Vue.
>
> **Claude** calls `scaffold_pattern({ pattern_id: "diff-based-editing", framework: "vue" })`
> and gets `PATTERN_NOT_FOUND` with `did_you_mean` and a next action; a
> follow-up `search_patterns({ query: "edit generated output" })` lands on
> generation-control. The retry with `framework: "vue"` returns
> `FRAMEWORK_UNSUPPORTED — available: react, vanilla`, so Claude answers:
> *no Vue reference exists; closest is generation-control in React — want
> that, or the vanilla version to wrap in Vue yourself?*

## Tool reference

Inputs and outputs are Zod-validated in both directions; results arrive as
`structuredContent` (with a JSON text mirror). Failures are in-band
`isError` results shaped `{ error: { code, message, next_action, …context } }`
with codes `PATTERN_NOT_FOUND` (+ `did_you_mean`), `FRAMEWORK_UNSUPPORTED`
(+ `supported`), `OPTIONS_INVALID` (+ `option_schema`), `CONTRACT_INVALID`.

Scaffold options — common: `componentName` (PascalCase rename), `includeTests`,
`includeCompliance` (both default true). Per-pattern (validated strictly;
unknown keys are rejected with the pattern's option schema):

| Pattern | Option | Effect |
| --- | --- | --- |
| streaming-response | `stopLabel: string` | stop-control text (accessible name unchanged) |
| streaming-response | `tokenBatching: true` | vanilla only — rAF append batching (the MAY constraint) |
| prompt-composer | `label`, `hint: string`; `maxLength: number` | default literals / counter wiring |
| thinking-visibility | `label: string` | reasoning-region label |
| generation-control | `withRefine: boolean` | default for the existing constructor option |
| error-recovery | `withPartialOutput: false` | React only — omit the optional partial-output block + its test |
| refusal-messaging | `withPolicyDetail: false` | omit the policy disclosure (MAY constraint) + its test |

Options never remove MUST-implementing code — see the amendment note in
[DESIGN.md](DESIGN.md) §4 for the options that were dropped for that reason.

## Tests and evals

```bash
npm test       # 32 unit/integration tests
npm run eval   # 19-case search scorecard (realistic agent queries)
npm run check  # both, plus typecheck — the gate
```

32 tests: loader rejects invalid contracts with reasons; search ranking
sanity (including the dontUseWhen caution and the never-empty fallback);
scaffold determinism, option transforms, and structured errors;
**generated React code is typechecked in a temp project and generated
vanilla code is parse-checked — output that doesn't compile is a test
failure**; the scaffolded test suite is executed for the tokenBatching
variant; `compliance_notes` coverage of every MUST/MUST_NOT for every
pattern × framework; and an end-to-end pass over real stdio.

The eval harness ([evals/](evals/)) runs product-language queries an agent
would actually send ("loading state for AI chat", misspellings, off-topic
queries that must hit the category fallback) and prints a pass/fail
scorecard — 19/19 at ship. Ranking changes must keep the scorecard green;
tuning history lives in [DESIGN.md](DESIGN.md) amendments. Demo recording
script: [DEMO.md](DEMO.md).
