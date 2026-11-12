# Journey runner

You are an AI agent. This document is your instructions. You have been given
one or more **journey files** (`*.journey.json`). Each describes a use case
for the agent-ux-contracts catalog: a persona, the moment the journey starts,
ordered steps, and success criteria. Your job is to walk the journey as that
persona would and report, with evidence, where it works and where it does
not.

A journey run is a usability test of the product. The product is on trial,
not you. A run that finds a problem is a successful run.

## Modes

- **run** (default): execute the journey and report.
- **plan**: do not execute. For each gap in the journey, write the smallest
  change that would close it, ordered with `in-scope` gaps first. List
  `owner-decision` gaps separately as questions for the owner. Do not design
  around a decision that has not been made.

Building what a plan describes is a separate request. Never start building
from inside a run.

## Rules

1. **Use only what the step names.** Each step has one `uses` mechanism.
   Do not substitute a different tool, read the catalog's source to find an
   answer the tool should have given, or lean on what you already know about
   this repository. The persona has only what the product hands them.
2. **Never work around an unavailable step.** If `available` is `false`,
   record the step as `blocked` with its gap id and continue with the steps
   that do not depend on it. Do not simulate its result.
3. **Never fix the product.** Do not edit anything in the catalog repository.
   If you see the fix, describe it in the report.
4. **Work in a scratch project.** When `automation.workspace` is `scratch`,
   create a new empty directory outside the catalog repository and do
   everything there. Leave it in place and report its path.
5. **Record friction.** Friction is anything the persona had to already know,
   guess, or look up elsewhere because the product did not say it at that
   step. A step can succeed and still have friction. Write each instance as
   one sentence.
6. **Evidence or it did not happen.** Every step status and every criterion
   result cites what you observed: a tool response excerpt, a command and its
   exit status, a file and line. If you could not observe it, the result is
   `not-evaluated`, with the reason.
7. **Stop a step after two failed attempts.** Record it as `failed` and move
   on. Persistence hides usability problems.
8. **Steps with `"optional": true`** may be skipped when the mechanism is not
   connected. Record `skipped`.

## How each `uses.kind` is executed

| kind | Do this |
| --- | --- |
| `mcp-tool` | Call the named tool with `input` exactly as written. If the tools are not connected, see "Connecting the catalog" below. |
| `command` | Run `run` in a shell, in the scratch project unless the step says otherwise. Replace `<placeholders>` with values from earlier steps. |
| `read` | Read `target`. `where` says whether it is in the catalog repository (`repo`), the scratch project (`workspace`), or on the web (`web`). |
| `edit` | Make exactly the `change` described to `target`. Only ever in the scratch project. |
| `external` | Use the named outside tool. If it is not connected and the step is not optional, record the step as `blocked` and say what was missing. |
| `judgment` | No tool. Decide as the actor would, using only what earlier steps produced, and write down the decision and its basis. |

## Connecting the catalog

The two tools are `search_patterns` and `scaffold_pattern`.

- **Claude Code inside the catalog repository**: they are registered by
  `.mcp.json` as `mcp__agent-ux-contracts__search_patterns` and
  `mcp__agent-ux-contracts__scaffold_pattern`.
- **Any other MCP client**: register a stdio server whose command is
  `node --import tsx mcp-server/src/index.ts`, run from the catalog
  repository root after `npm ci` there and in `mcp-server/`.
- **No tool access at all** (a chat window with the files attached): do a
  desk run. Mark every `mcp-tool`, `command`, and `edit` step
  `not-executed`, then review the journey on paper: are the steps in the
  right order, is any step missing, would the persona know what to do next?
  Say clearly at the top of the report that nothing was executed.

## Procedure

1. Read the whole journey file. Restate the persona, trigger, and goal in two
   sentences so the reader can see you understood it.
2. Check each precondition. If one does not hold and you cannot establish it,
   stop and report `blocked` with the precondition named.
3. Execute the steps in order. For each, record `status`
   (`done`, `failed`, `blocked`, `skipped`, `not-executed`), evidence, and
   friction.
4. Evaluate each success criterion using its `check`. Record `pass`, `fail`,
   or `not-evaluated`, with evidence.
5. Decide the verdict:
   - `pass`: every criterion passed.
   - `fail`: at least one criterion failed.
   - `blocked`: a precondition or an unavailable step prevented evaluation of
     at least one criterion, and none failed.
6. Compare what you saw with the file. If a gap listed in the journey no
   longer reproduces, or you found one that is not listed, say so. Do not
   edit the journey file unless asked.

## Report format

Lead with one sentence: the journey id, the verdict, and the single most
important thing you found. Then:

**Steps**

| Step | Status | Evidence | Friction |
| --- | --- | --- | --- |

**Success criteria**

| Criterion | Result | Evidence |
| --- | --- | --- |

**Findings** — new problems, in order of how badly they hurt the persona.
For each: what happened, what the persona expected, the smallest fix.

**Journey file accuracy** — gaps that no longer reproduce, gaps that are
missing, and whether `status` still matches what you saw.

End with this block, filled in, so runs can be compared over time:

```json
{
  "journey": "<id>",
  "revised": "<the journey file's revised date>",
  "run_date": "<YYYY-MM-DD>",
  "mode": "run",
  "executed": true,
  "verdict": "pass | fail | blocked",
  "steps": [{ "id": "s1", "status": "done", "friction": 0 }],
  "success": [{ "id": "c1", "result": "pass" }],
  "new_findings": 0,
  "status_still_accurate": true
}
```

When you run several journeys, give each its own report and finish with one
table: journey, verdict, criteria passed out of total, new findings.
