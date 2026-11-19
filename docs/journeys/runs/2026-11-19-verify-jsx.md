# Run, 2026-11-19: verify under any JSX setting

A re-run of the two journeys that carried the `verify-needs-react-jsx` gap,
after the gap was closed in two steps: scaffolded React files gained JSX
pragmas on 2026-11-12 (`mcp-server/DESIGN.md` amendment 15), and on this date
the pragmas moved into the reference files themselves (amendment 19). The
gap is removed from `zero-install-first-run.journey.json` in the same change;
`ground-a-coding-agent.journey.json` dropped it on 2026-11-12. This is a
dated record; it is not updated.

Done by hand following [`../RUNNER.md`](../RUNNER.md), by the session that
made the change. That is the opposite of a persona; re-run from a clean
session before treating the passes as independent.

Environment: Node 22.23, the catalog at `780306d` plus this change, MCP
server run from source over stdio (`node --import tsx mcp-server/src/index.ts`)
and driven by an SDK client, scratch projects outside the repository.

| Journey | Verdict | Criteria passed | What it found |
| --- | --- | --- | --- |
| `ground-a-coding-agent` | fail | 4 of 5 | Verify now passes first run under `"jsx": "preserve"` (17 of 17); only the install criterion fails |
| `zero-install-first-run` | fail | 0 of 4, 3 not evaluated | Still blocked on launch and distribution; the license criterion fails |

---

## ground-a-coding-agent: fail

`ground-a-coding-agent` fails on c5 alone: the verify command that failed 13
of 13 at baseline passes 17 of 17 on the first run in a `"jsx": "preserve"`
project, and connecting the catalog still takes a clone and an absolute path.

**Steps**

| Step | Status | Evidence | Friction |
| --- | --- | --- | --- |
| s1 | done | `mcp-server/README.md` line 37: `claude mcp add agent-ux-contracts -- node /absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js`, after `npm install` and `npm run build` in a clone | The persona must clone, build, and edit an absolute path before the first tool call. |
| s2 | done | `search_patterns` → `results[0].id` `interruption-cancel`, score 1, rationale `Alias match: "stop task".`, version 0.1.2, hash `a73303e4…` | none |
| s3 | done | No `caution` on the top result, no `advisory` on the response. MUSTs that matter here: `immediate-acknowledgment`, `cancel-not-gated`, `focus-not-lost` | none |
| s4 | done | `scaffold_pattern` returned `files`, `verify`, `usage`, `agent_notes`, `constraints`, `compliance_notes`; files: `InterruptionCancel.tsx`, `InterruptionCancel.test.tsx`, `setup-dom.mjs`, `COMPLIANCE.md` | none |
| s5 | done | Four files written byte for byte to `src/patterns/interruption-cancel/`; both `.tsx` files open with `/** @jsxRuntime automatic */` and `/** @jsxImportSource react */` | none |
| s6 | done | `npm i -D react react-dom @testing-library/react @testing-library/dom axe-core jsdom global-jsdom tsx typescript`, exit 0, about 2 s (warm cache) | none |
| s7 | done | `node --import tsx --import ./setup-dom.mjs --test InterruptionCancel.test.tsx` from the pattern directory: exit 0, `# pass 17`, `# fail 0`. Project root `tsconfig.json` is `{"compilerOptions":{"jsx":"preserve"}}`, unmodified | none |
| s8 | done | From `usage` and `agent_notes` alone: `onCancel` goes to a real abort (`AbortController.abort()`); host drives `running`, `outcome`, `progress`, `completedWork`, `stoppedWork`; no confirm dialog; do not flip back to running on late progress; report completed side effects | none |
| s9 | done | COMPLIANCE.md header carries version `0.1.2` and the full `contract_hash` from s4 | none |
| s10 | done | Report written from s4 by constraint id: all 8 MUST/MUST_NOT rules anchored, each test named `"<constraint-id>: …"` in the test file, all passing in s7 | none |

**Success criteria**

| Criterion | Result | Evidence |
| --- | --- | --- |
| c1 right pattern first | pass | s2 `results[0].id` is `interruption-cancel` |
| c2 every MUST mapped to code | pass | 8 MUST/MUST_NOT constraints, 8 `compliance_notes`, all 8 anchors found in `InterruptionCancel.tsx` |
| c3 verify passes first run, no config change | pass | s7 exit 0, 17 of 17, under `"jsx": "preserve"` |
| c4 pin recorded | pass | s9 |
| c5 one-command setup, no absolute path | **fail** | s1 |

The same verify command was also run with the project's `tsconfig.json`
removed: exit 0, 17 of 17. Baseline for comparison (2026-11-11): 13 of 13
failed under both `preserve` and no tsconfig, with
`ReferenceError: React is not defined`. The test count differs from the
baseline's 13 because interruption-cancel's suite grew on 2026-11-12.

**Findings**

None new.

**Journey file accuracy**

`status: "partial"` still matches: everything but installation works. The
two listed gaps (`clone-only-install`, `license-blocks-adoption`) both still
reproduce. No unlisted gap was seen.

```json
{
  "journey": "ground-a-coding-agent",
  "revised": "2026-11-12",
  "run_date": "2026-11-19",
  "mode": "run",
  "executed": true,
  "verdict": "fail",
  "steps": [
    { "id": "s1", "status": "done", "friction": 1 },
    { "id": "s2", "status": "done", "friction": 0 },
    { "id": "s3", "status": "done", "friction": 0 },
    { "id": "s4", "status": "done", "friction": 0 },
    { "id": "s5", "status": "done", "friction": 0 },
    { "id": "s6", "status": "done", "friction": 0 },
    { "id": "s7", "status": "done", "friction": 0 },
    { "id": "s8", "status": "done", "friction": 0 },
    { "id": "s9", "status": "done", "friction": 0 },
    { "id": "s10", "status": "done", "friction": 0 }
  ],
  "success": [
    { "id": "c1", "result": "pass" },
    { "id": "c2", "result": "pass" },
    { "id": "c3", "result": "pass" },
    { "id": "c4", "result": "pass" },
    { "id": "c5", "result": "fail" }
  ],
  "new_findings": 0,
  "status_still_accurate": true
}
```

## zero-install-first-run: fail

`zero-install-first-run` fails on its license criterion and cannot reach the
other three: the site is still not deployed and there is still no one-line
install, though the JSX failure that would have met the persona at s3 is gone.

**Steps**

| Step | Status | Evidence | Friction |
| --- | --- | --- | --- |
| s1 | blocked (`site-not-live`) | `https://agent-ux-contracts.vercel.app/patterns/approval-gate/` → HTTP 404, body `DEPLOYMENT_NOT_FOUND` | — |
| s2 | blocked (`no-one-line-install`) | `available: false` | — |
| s3 | blocked (`no-one-line-install`) | `available: false` | — |
| s4 | done | `LICENSE.md` line 1: `All Rights Reserved` | The page tells the reader to copy code the license does not let them use. |

**Success criteria**

| Criterion | Result | Evidence |
| --- | --- | --- |
| c1 one command, no clone | not-evaluated | s2 blocked |
| c2 green tests in under five minutes | not-evaluated | s1 to s3 blocked |
| c3 works in unmodified create-next-app | not-evaluated | s3 blocked; see the note below |
| c4 license permits the page's instructions | **fail** | s4 |

Note on c3, outside the journey's steps: the route the pattern page prints
today (clone, copy `patterns/<id>/react` and `scripts/setup-dom.mjs`,
`npm i -D …`, run the tests) was followed as written in an `npm init -y`
project whose `tsconfig.json` sets `"jsx": "preserve"`: approval-gate 26 of
26, interruption-cancel 17 of 17. Whatever one-line install closes
`no-one-line-install` inherits that, because the pragmas are in the
reference files.

**Findings**

None new.

**Journey file accuracy**

`verify-needs-react-jsx` no longer reproduces, by either route, and is
removed in this change (`revised` → 2026-11-19). The baseline recorded this
journey as `blocked`, but c4 was evaluable then too and would have failed
for the same reason; by RUNNER.md's verdict rule the result is `fail`. The
other three gaps reproduce. `status: "not-built"` still matches.

```json
{
  "journey": "zero-install-first-run",
  "revised": "2026-11-19",
  "run_date": "2026-11-19",
  "mode": "run",
  "executed": true,
  "verdict": "fail",
  "steps": [
    { "id": "s1", "status": "blocked", "friction": 0 },
    { "id": "s2", "status": "blocked", "friction": 0 },
    { "id": "s3", "status": "blocked", "friction": 0 },
    { "id": "s4", "status": "done", "friction": 1 }
  ],
  "success": [
    { "id": "c1", "result": "not-evaluated" },
    { "id": "c2", "result": "not-evaluated" },
    { "id": "c3", "result": "not-evaluated" },
    { "id": "c4", "result": "fail" }
  ],
  "new_findings": 0,
  "status_still_accurate": true
}
```

| Journey | Verdict | Criteria passed | New findings |
| --- | --- | --- | --- |
| `ground-a-coding-agent` | fail | 4 of 5 | 0 |
| `zero-install-first-run` | fail | 0 of 4 (3 not evaluated) | 0 |
