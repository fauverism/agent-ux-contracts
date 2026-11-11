---
name: drift-check
description: Audit this repo's documentation and cross-file invariants against what the code actually does, and report every mismatch. Use before a release, after a long gap, when a doc looks stale, or when asked whether the docs are still accurate. Pass "fix" to also correct the mismatches that are purely factual.
argument-hint: "[fix]"
allowed-tools: Bash(git log *) Bash(git ls-files *) Bash(npm run check) Bash(npm run validate) Bash(npm --prefix mcp-server run eval) Bash(npm --prefix site run build) Bash(diff *) Read Grep Glob
---

# Drift check

`npm run check` proves the code agrees with the contracts. Nothing proves the
prose agrees with the code. This skill is that check.

Mode: if `$ARGUMENTS` contains `fix`, correct purely factual mismatches
(a wrong count, a dead path, a stale status line) and list what you changed.
Otherwise change nothing. Never edit a `pattern.contract.json`, a decision in
an ADR, or the "Decisions only the owner can make" section of
`docs/NORTH-STAR.md` in either mode; report those instead.

## Checks

Run all of them. Report each as OK, DRIFT, or NOT CHECKED with the reason.

1. **Gate** — `npm run check` passes. Record the real counts it prints.
2. **Volatile numbers in prose** — grep the Markdown files for test counts,
   eval scores, and pattern counts. Each one either matches what the gate
   just printed or is drift. Prefer removing a count over updating it.
3. **Scope statements agree** — the pattern count and MCP tool count stated
   in `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `PROGRESS.md`, and
   `docs/NORTH-STAR.md` match each other and match `ls patterns/` and the
   tools registered in `mcp-server/src/server.ts`.
4. **Hash lockstep** — the `canonicalize` function and the hashing call in
   `mcp-server/src/hash.ts` and `site/lib/patterns.ts` are behaviorally
   identical. Read both; a difference here is the most serious finding this
   skill can produce.
5. **Paths and links** — every repo-relative path or Markdown link in the
   root docs, `docs/`, and `mcp-server/*.md` resolves to a tracked file.
6. **README table** — the pattern table in `README.md` lists exactly the
   directories under `patterns/`, with categories matching each contract.
7. **Plain-language coverage** — every pattern id has an entry in
   `site/lib/plain-language.ts` and a demo registered in
   `site/components/demos/index.tsx`.
8. **Compliance trace versions** — where a `COMPLIANCE.md` or an
   implementation header names a contract version, it matches the `version`
   in that pattern's contract.
9. **PROGRESS freshness** — the "Last updated" date in `PROGRESS.md` is not
   older than the newest commit touching `patterns/`, `schema/`,
   `mcp-server/src/`, or `site/app/`.
10. **North Star gaps** — re-test each row of the gaps table in
    `docs/NORTH-STAR.md` that can be checked from here.
11. **Claude tooling** — every skill, subagent, hook script, and workflow
    named in `docs/CLAUDE-PLAYBOOK.md` exists, and every one that exists
    under `.claude/` is named there.

## Report

A table of the eleven checks with status and a one-line finding, then the
DRIFT items in detail: file and line, what it says, what is true, and the
proposed correction. End with what you changed, if anything.
