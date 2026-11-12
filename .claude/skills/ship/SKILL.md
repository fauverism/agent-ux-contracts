---
name: ship
description: Pre-merge routine for this repo. Runs the full gate and the site build, checks contract version bumps against what changed, updates PROGRESS.md, and prepares a commit. Run when a change is finished and the owner wants it ready to merge.
argument-hint: "[one-line summary of the change]"
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(npm run check) Bash(npm --prefix site run build) Read Grep Glob Edit
---

# Ship: $ARGUMENTS

Working tree:

!`git status -sb 2>&1 | head -30 || true`

Files changed against main:

!`git diff --stat origin/main...HEAD 2>&1 | tail -30 || true`

## Steps

1. **Gate.** Run `npm run check`, then `npm --prefix site run build`. If
   either fails, stop and report the failure. Do not skip, disable, or
   loosen a test to get green.
2. **Contract versions.** For every `pattern.contract.json` in the diff,
   classify the change with the table in `AGENTS.md` (patch, minor, major)
   and confirm `version` moved by at least that much. A MUST added, removed,
   or changed in meaning without a major bump is a blocker.
3. **Traces follow contracts.** If a constraint changed, confirm both
   `COMPLIANCE.md` files for that pattern and the test names changed with
   it.
4. **Hash lockstep.** If `mcp-server/src/hash.ts` or the hashing code in
   `site/lib/patterns.ts` is in the diff, confirm the other one changed
   identically.
5. **Scope.** If the change adds a pattern, an MCP tool, or a new surface,
   confirm the owner approved the scope change and that `CLAUDE.md` and
   `docs/NORTH-STAR.md` reflect it.
6. **Records.** Add a dated entry to `PROGRESS.md` and bump its "Last
   updated" line. If the change closes a gap or settles a decision listed in
   `docs/NORTH-STAR.md`, update that file. If it is an architectural
   decision, add an ADR under `docs/adr/`.
7. **Commit message.** Draft one: an imperative subject under 70 characters,
   then a body that says what changed and why.

Commit and push only if the owner asked for that in this session. Otherwise
stop after step 7 and show the drafted message.

Report: gate result, each check above as pass or blocker, and the files you
updated.
