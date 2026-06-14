# Demo script — 90 seconds, screen recording

**Thesis on screen:** design systems for agents are contracts. One search,
one scaffold, and the agent can *prove* the code follows the rules.

## Pre-record checklist

- [ ] `cd mcp-server && npm install && npm run build` (dist/ exists)
- [ ] Server registered and listed: `claude mcp list` shows `agent-ux-contracts ✓ connected`
- [ ] Fresh Claude Code session in a demo project (`~/demo-chat-app`) prepared
      so the scaffolded tests run on camera (verified: `# pass 12`):
  - `npm i -D react react-dom @types/react @testing-library/react axe-core global-jsdom jsdom tsx typescript`
  - `tsconfig.json` with `"jsx": "react-jsx"` (tsx reads it from the cwd —
    without it the JSX transform falls back to classic and tests fail)
  - `setup-dom.mjs`: `import 'global-jsdom/register'; globalThis.IS_REACT_ACT_ENVIRONMENT = true;`
- [ ] Terminal font ≥16pt, editor ready in a split for the file reveal
- [ ] Do a full dry run — the two tool calls take seconds, but file reveals eat time

## Timeline

### 0:00 – 0:12 — Hook + install

Voiceover: *"My team ships AI features. Every chat UI re-invents loading
states — badly. This is a pattern catalog agents can consume. One command:"*

Type (pre-staged in shell history):

```bash
claude mcp add agent-ux-contracts -- node ~/agent-ux-contracts/mcp-server/dist/index.js
claude
```

### 0:12 – 0:35 — Search

Type into Claude Code:

> **I need a loading state for my AI chat. Find the right pattern.**

On screen: the `search_patterns` call fires. Expand the result briefly and
point at two things (cursor hover, no need to read aloud):

- `"id": "streaming-response"` ranked #1 with `"rationale": "Alias match: 'AI loading state'."`
- the `constraints.musts` list — *"five MUST rules, machine-readable"*

Voiceover: *"Not just a doc link — the result says why it matched and what
the implementation must do. And if my use case were excluded, there's a
caution field that says so."*

### 0:35 – 1:00 — Scaffold

Type:

> **Scaffold it in React.**

On screen: `scaffold_pattern` returns; Claude writes
`StreamingResponse.tsx`, `StreamingResponse.test.tsx`, `COMPLIANCE.md`.

Voiceover: *"This isn't generated freehand — it's the reference
implementation, stamped out deterministically. Tests included. They pass
on arrival:"*

Run (pre-staged, from `~/demo-chat-app`):

```bash
node --import tsx --import ./setup-dom.mjs --test StreamingResponse.test.tsx
```

Show the green `# pass 12`.

### 1:00 – 1:22 — The receipt: compliance_notes

Scroll the tool result to `compliance_notes`. Read one entry aloud:

> *"Every MUST rule maps to the code that satisfies it. `focus-not-lost` —
> 'focus must move to the output region, not be dropped on body' — is
> satisfied at this anchor…"*

Cmd+F in the editor for `reclaimFocusFromStop` → cursor lands on the
function. One beat of silence — this is the shot that matters.

Voiceover: *"The agent that receives this doesn't have to trust it. It can
check every rule against a line of code, and run the tests."*

### 1:22 – 1:30 — Close

Show the response header fields `"version": "0.2.1"` and `"contract_hash": "…"`.

Voiceover: *"Version plus content hash in every response — pin them, and
drift fails your build. Ten patterns, two tools, contracts all the way
down. Repo in the description."*

## Fallbacks

- If the search step picks a different phrasing, "AI chat loading state"
  and "loading state while the model responds" both rank
  streaming-response #1 (eval cases 1 and 10 cover the neighborhood).
- If live tool calls feel slow on camera, record the terminal at 1.25×;
  do not cut the Cmd+F reveal — it is the proof beat.
- 60-second cut: drop the test run (0:50–1:00) and the version close,
  keep search → scaffold → compliance_notes → Cmd+F.
