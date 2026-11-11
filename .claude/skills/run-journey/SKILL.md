---
name: run-journey
description: Execute one or all of the product journeys in docs/journeys as the persona would, and report where the experience works and where it breaks, with evidence. Use when asked to run, test, or check a journey or use case, to "test the experience", or to plan the work a journey needs. Pass a journey id or "all", and optionally "plan".
argument-hint: "<journey-id | all> [plan]"
allowed-tools: mcp__agent-ux-contracts__search_patterns mcp__agent-ux-contracts__scaffold_pattern Read Grep Glob Bash(node scripts/validate-journeys.mjs *)
---

# Run journey: $ARGUMENTS

Available journeys and their claimed status:

!`node scripts/validate-journeys.mjs 2>&1 | head -30 || true`

## What to do

1. Read `docs/journeys/RUNNER.md` in full. It is the protocol. Follow it
   exactly; this file only adds what is specific to Claude Code in this
   repository.
2. Resolve the target from the arguments: one journey id, or `all`. If the
   arguments include `plan`, use the runner's plan mode. With no arguments,
   list the journeys and ask which to run.
3. Read `docs/journeys/<id>.journey.json` for each target.
4. Run it as RUNNER.md describes and report in its format.

## Specific to this repository

- The catalog's tools are connected as
  `mcp__agent-ux-contracts__search_patterns` and
  `mcp__agent-ux-contracts__scaffold_pattern`. If they are missing, run
  `npm ci` in the root and in `mcp-server/`, then say the MCP server needs
  approving or reconnecting. Do not fall back to reading contracts from disk
  in a step that names an `mcp-tool`.
- Create the scratch project under the session's scratchpad or temp
  directory, never inside this repository.
- You know this codebase. The persona does not. When a step works only
  because of something you know from the repository and the product did not
  say, that is friction: record it.
- For `all`, run the journeys whose `automation.runnable` is `full` first,
  then `partial`, then give `spec-only` journeys a plan-mode pass. Finish
  with the summary table and the output of
  `node scripts/validate-journeys.mjs --gaps`.
- Journeys that need a clean second session (`with-and-without`) or a browser
  (`probe-a-running-ui`): use a subagent with no MCP tools, or Playwright,
  only if the user asked for that journey by name or asked for `all`.
  Otherwise report the step as blocked and say what it needs.

## After the run

- Do not edit journey files, contracts, or product code. Report what should
  change.
- If the user asks to record the run, write it to
  `docs/journeys/runs/<YYYY-MM-DD>-<journey-or-all>.md` and update each
  journey's `baseline` to match, then run `npm run validate`.
- If a run finds a search query that returned the wrong pattern or a wrong
  caution, say that it belongs in `mcp-server/evals/cases.ts`.
