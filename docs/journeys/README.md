# Journeys

Use cases for the catalog, written so an AI agent can execute them.

Each `*.journey.json` file is one journey: a persona, the moment it starts,
ordered steps naming the exact tool or command each one uses, and success
criteria with a check an agent can perform. Steps the product cannot support
yet are marked unavailable and point at a named gap, so a run reports them as
blocked instead of improvising.

A journey run is a usability test of the product, performed by an agent
playing the persona. That makes this directory three things at once:

- **The product's use cases**, each with the reason it beats the
  alternatives ([`docs/research/landscape.md`](../research/landscape.md)).
- **A regression suite for the experience.** `npm run check` proves the code
  matches the contracts. Journeys prove a person can get value from it.
- **A backlog with evidence.** Every gap names what was observed, the
  smallest fix, and whether it needs an owner decision.

## The journeys

Grouped by the status each file claims. Run
`node scripts/validate-journeys.mjs` to list current statuses.

### Works today

| Journey | In one line |
| --- | --- |
| [`self-explaining-regression`](self-explaining-regression.journey.json) | A later agent breaks a rule; the failing test names the rule and the reason |
| [`probe-a-running-ui`](probe-a-running-ui.journey.json) | Judge any running UI against a contract from a browser, with no source access |

### Partly works

| Journey | In one line |
| --- | --- |
| [`ground-a-coding-agent`](ground-a-coding-agent.journey.json) | Find, scaffold, verify, pin. The core journey |
| [`know-when-not-to`](know-when-not-to.journey.json) | The catalog talks an agent out of a pattern that does not fit |
| [`certify-your-own-components`](certify-your-own-components.journey.json) | Adopt the rules in your own stack, for a design system or a generative-UI catalog |
| [`audit-existing-ui`](audit-existing-ui.journey.json) | Review existing code against a contract, line by line |
| [`pin-and-drift-watch`](pin-and-drift-watch.journey.json) | Copied code that knows when its rules changed |
| [`handoff-by-constraint-id`](handoff-by-constraint-id.journey.json) | One vocabulary from the designer's ticket to the test output |
| [`accessibility-evidence-pack`](accessibility-evidence-pack.journey.json) | Assemble WCAG evidence from the contract and its tests |
| [`with-and-without`](with-and-without.journey.json) | Build it cold and with the catalog; score both. The proof of the thesis |
| [`incident-becomes-a-rule`](incident-becomes-a-rule.journey.json) | Turn a production UX incident into a rule with a test |
| [`house-rules-private-catalog`](house-rules-private-catalog.journey.json) | Your own patterns in the same format, served by the same server |

### Not built

| Journey | In one line |
| --- | --- |
| [`zero-install-first-run`](zero-install-first-run.journey.json) | A stranger gets to green tests in five minutes. The definition of done for launch |

The first recorded run of these is
[`runs/2026-11-11-baseline.md`](runs/2026-11-11-baseline.md).

## Run one

In Claude Code, in this repository:

```
/run-journey ground-a-coding-agent
/run-journey all
/run-journey zero-install-first-run plan
```

The skill is a thin wrapper around [`RUNNER.md`](RUNNER.md), which is the
whole protocol and is written to be read by any agent.

## Import them into another AI tool

The journey files and the runner are self-contained. Nothing in them depends
on Claude.

| Where | How |
| --- | --- |
| Any coding agent with this repository open | "Read `docs/journeys/RUNNER.md`, then run `docs/journeys/<id>.journey.json`." |
| A chat tool with file upload | Attach `RUNNER.md` and one or more journey files. Without tools the agent does a desk run: it reviews the journey on paper and says so. |
| A tool that takes one pasted document | `node scripts/validate-journeys.mjs --bundle > journeys.md` writes the runner and every journey as one Markdown file. |
| A scheduled run | Prompts are in [`docs/CLAUDE-PLAYBOOK.md`](../CLAUDE-PLAYBOOK.md), section 4. |
| Your own harness | Each file validates against [`journey.schema.json`](journey.schema.json). The run report ends with a JSON block in a fixed shape. |

To execute steps, the agent needs the catalog's two MCP tools. `RUNNER.md`
says how to connect them in each case.

## Choose what to build from them

```bash
node scripts/validate-journeys.mjs --gaps
```

prints every gap across all journeys as a table, most-blocking first, with
its scope. A gap shared by several journeys is one fix that moves several
use cases. `in scope` gaps can be picked up; `owner:` gaps wait for the
decision they name in [`docs/NORTH-STAR.md`](../NORTH-STAR.md).

To have an agent lay out the work for one journey without building anything,
run it in plan mode.

## Write a new one

1. Copy the journey closest to yours and change the id to match the new file
   name.
2. Write the persona and trigger first. If you cannot say who starts this and
   when, it is a feature idea, not a journey.
3. One mechanism per step. If a step needs something the product does not
   have, set `available` to `false` and add a gap with evidence. Do not write
   the journey as if the gap were closed.
4. Make every success check something an agent can observe. "The user is
   satisfied" is not a check.
5. List the constraint ids you mention under `contracts`, so a renamed
   constraint fails the gate here.
6. Run it once before committing, record the result under
   `runs/<date>-<name>.md`, and set `baseline`.
7. `npm run validate`.

## Rules for this directory

- A journey's `status` is a claim. `works-today` requires a passing recorded
  run; the validator enforces it.
- Journeys describe the product from outside. They never contain a new MUST;
  rules live in contracts.
- Run reports are dated and never edited. A new run is a new file.
- A new alternative named in `advantage.versus` gets a row in
  [`docs/research/landscape.md`](../research/landscape.md) first.
