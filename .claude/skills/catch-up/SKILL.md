---
name: catch-up
description: Re-entry briefing for this repo after time away. Summarizes project intent, what changed since the last session, whether the check gate is green, open launch blockers, and the next three things worth doing. Use when the owner says they have been away, asks "where was I", "what's the state of this", or starts a session without a specific task.
argument-hint: "[since, e.g. '2 weeks ago' or a git ref]"
allowed-tools: Bash(git log *) Bash(git status *) Bash(git branch *) Bash(npm run check) Bash(npm ci) Bash(npm --prefix mcp-server ci) Bash(npm --prefix site ci) Bash(node scripts/validate-journeys.mjs *) Read Grep Glob
---

# Catch-up briefing

You are briefing the owner, who has been away from this repo. They want to be
oriented in two minutes of reading. Do not change any files.

Window to cover: `$ARGUMENTS` if given, otherwise everything since the
"Last verified" date in `docs/NORTH-STAR.md`.

## Snapshot at invocation

Branch and working tree:

!`git status -sb 2>&1 | head -20 || true`

Last 15 commits:

!`git log --date=short --format='%h %ad %s' -15 2>&1 || true`

Remote branches:

!`git branch -r --sort=-committerdate --format='%(committerdate:short) %(refname:short)' 2>&1 | head -10 || true`

## Steps

1. Read `docs/NORTH-STAR.md` in full and the status header plus "What's Next"
   of `PROGRESS.md`.
2. Run `git log --stat` over the window and group the changes by subsystem
   (`patterns/`, `schema/`, `mcp-server/`, `site/`, docs, tooling).
3. Run `npm run check`. If dependencies are missing, run `npm ci` in the
   root, `mcp-server/`, and `site/` first. Report the real result, including
   any failure output. Do not fix failures in this skill; report them.
4. If GitHub tools are available, list open pull requests and open issues.
   If not, say so in one line.
5. Re-test each row of the gaps table in `docs/NORTH-STAR.md` that can be
   checked from here (for example, request `SITE_URL` from
   `site/lib/site.ts` and report the status code). Mark each row confirmed,
   resolved, or not checkable.
6. Run `node scripts/validate-journeys.mjs` and
   `node scripts/validate-journeys.mjs --gaps`. Note each journey's status
   and the date of its last recorded run. Do not run the journeys here;
   suggest `/run-journey all` if the newest run report is older than the
   newest commit under `mcp-server/src/`, `patterns/`, or `site/app/`.

## Report format

Lead with a one-sentence verdict on the repo's health. Then, in this order:

- **Intent** — the thesis and audience in two sentences, from NORTH-STAR.
- **Since you left** — what changed, grouped by subsystem. If nothing, say so.
- **Gate** — pass or fail per stage, with failure output if any.
- **Open blockers** — the gaps table with today's status per row.
- **Use cases** — how many journeys work today, partly work, and are not
  built, and the three `in scope` gaps that block the most journeys.
- **Owner decisions pending** — from NORTH-STAR, one line each.
- **Next three** — the three highest-value tasks, chosen with the
  "How to choose what to work on" rules in NORTH-STAR. For each: what, why
  now, and roughly how big.

Flag anything in the docs that contradicts what you observed, and suggest
`/drift-check` if there is more than one contradiction.
