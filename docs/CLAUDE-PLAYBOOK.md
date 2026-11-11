# Claude Playbook

How to use Claude to maintain and grow this repo: what is already set up
here, what needs one action from the owner, and techniques worth knowing.
Written for the owner and for Claude.

**Feature claims verified against the Claude Code docs on 2026-11-11.** These
products change quickly and get renamed. When something here does not match
what you see, trust the linked doc page and fix this file.

---

## 1. Coming back after time away

Open a session in this repo and type:

```
/catch-up
```

It reads [`NORTH-STAR.md`](NORTH-STAR.md), summarizes commits since the last
verified date, runs the gate, re-tests the launch blockers, and proposes the
next three tasks. It changes nothing. Then, if the docs look off:

```
/drift-check
```

## 2. What is set up in this repo

Everything in this table is committed, so it works in the terminal, the
desktop app, the IDE extensions, and cloud sessions alike.

| What | Where | How it runs |
| --- | --- | --- |
| Project instructions | [`CLAUDE.md`](../CLAUDE.md), which imports [`AGENTS.md`](../AGENTS.md) | Loaded at the start of every session |
| `/catch-up` | `.claude/skills/catch-up/` | You type it, or Claude loads it when you ask "where was I" |
| `/drift-check [fix]` | `.claude/skills/drift-check/` | You type it, or Claude loads it when you ask whether docs are accurate |
| `/new-pattern <id> [Name]` | `.claude/skills/new-pattern/` | Only when you type it. Stops for contract review before writing code |
| `/ship [summary]` | `.claude/skills/ship/` | Only when you type it. Gate, version-bump check, `PROGRESS.md` entry, commit message |
| `contract-auditor` subagent | `.claude/agents/contract-auditor.md` | Claude delegates after pattern changes, or you say "use the contract-auditor on approval-gate" |
| Contract validation hook | `.claude/hooks/validate-contract.mjs` | **Not wired yet.** See section 3 |
| The catalog's own MCP server | [`.mcp.json`](../.mcp.json) | Claude Code asks once to approve it, then `search_patterns` and `scaffold_pattern` are available in sessions here. Needs `npm ci` in the root and in `mcp-server/` |
| CI gate | `.github/workflows/check.yml` | Every pull request and every push to `main`: `npm run check`, site tests, static build. No secrets, no model calls |

Why these and not more: each one replaces something that was being done by
hand or not at all. A skill that would only restate `AGENTS.md` is not here.

### Why `CLAUDE.md` imports `AGENTS.md`

Claude Code reads `AGENTS.md` only when a repo has no `CLAUDE.md`. This repo
has both, so until 2026-11-11 the "how to work here" doc was not loaded. The
`@AGENTS.md` line in `CLAUDE.md` fixes that and keeps one file that other
coding agents can also read.
([memory docs](https://code.claude.com/docs/en/memory))

## 3. One step only the owner can take: wire the hook and permissions

Claude is not allowed to write its own permission rules or hooks, so this
file is yours to create. Save it as `.claude/settings.json` and commit it:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run check)",
      "Bash(npm test)",
      "Bash(npm run validate)",
      "Bash(npm run typecheck)",
      "Bash(npm --prefix mcp-server run check)",
      "Bash(npm --prefix mcp-server run eval)",
      "Bash(npm --prefix site run typecheck)",
      "Bash(npm --prefix site run build)",
      "Bash(npm --prefix site run test)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-contract.mjs"
          }
        ]
      }
    ]
  }
}
```

What it does:

- **Permissions**: Claude stops asking before running the gate commands.
  Nothing that writes outside the repo is on the list.
- **Hook**: after any edit to a `pattern.contract.json` or the schema, the
  contract validator runs and a failure goes straight back to Claude. A hook
  is deterministic; an instruction in `CLAUDE.md` is a request. Use a hook
  for rules that must always hold.
  ([hooks guide](https://code.claude.com/docs/en/hooks-guide))

The hook script was tested on three cases on 2026-11-11: a non-contract file
(silent), a valid contract (silent), a contract with a wrong `id` (exit 2
with the validator output).

## 4. Automations that need your account

None of these are committed, because each needs a secret, an app install, or
a setting on claude.ai. Listed by how much they would help this repo.

### Scheduled tasks: a standing drift check

A scheduled task (formerly "routine") is a saved prompt plus repo that runs
in the cloud on a schedule, on an API call, or on a GitHub event. Create one
at [claude.ai/code/routines](https://claude.ai/code/routines) or with
`/schedule` in the CLI. Runs push to `claude/`-prefixed branches unless told
otherwise. Research preview; runs count against your plan usage.
([docs](https://code.claude.com/docs/en/routines))

Useful ones here, with the prompt to paste:

| Cadence | Prompt |
| --- | --- |
| Weekly | `Run /drift-check. If every check is OK, stop and say so in one line. If there is drift, run /drift-check fix, open a pull request with the corrections, and list anything you could not fix.` |
| Monthly | `Check for outdated dependencies in the root, mcp-server/, and site/. Apply patch and minor updates only, run npm run check and npm --prefix site run build, and open a pull request if both pass. Report major updates without applying them.` |
| On pull request opened | `Run the contract-auditor subagent on every pattern directory this pull request touches and post the report as one comment.` |

This is the piece that would have kept the docs honest over the last four
months without you opening the repo.

### Cloud sessions: work without the laptop

A cloud session clones the repo into a VM and keeps running when you close
the lid. Start one at [claude.ai/code](https://claude.ai/code), from the Code
tab in the mobile app, or from the terminal:

```bash
claude --cloud "Run /catch-up and then fix the top item"
```

Pull one back into your terminal with `claude --teleport`. Several
`--cloud` sessions run in parallel, each on its own branch.
([docs](https://code.claude.com/docs/en/claude-code-on-the-web))

A fresh VM has no `node_modules`, and installing all three packages takes
about a minute. Put the install in the environment's setup script (cloud
environment settings) so sessions start ready:

```bash
if [ -d agent-ux-contracts ]; then
  cd agent-ux-contracts
  npm ci && npm --prefix mcp-server ci && npm --prefix site ci
fi
```

### Auto-fix for pull requests

With the Claude GitHub App installed on the repo, Claude can watch a pull
request and push fixes for CI failures and review comments. Turn it on from
the pull request's menu in a cloud session, or run `/autofix-pr` on the
branch in your terminal. Now that `check.yml` exists, there is a CI signal
for it to react to.

### `@claude` in issues and pull requests

Run `/install-github-app` in a local session. It installs the app, stores a
secret, and opens a pull request with the workflow file. With a Claude
subscription the secret is `CLAUDE_CODE_OAUTH_TOKEN`, created by
`claude setup-token`. After that, `@claude` in any issue or pull request
comment gets a response, and a workflow can run a project skill by passing
`prompt: "/drift-check"`.
([docs](https://code.claude.com/docs/en/github-actions))

Prefer scheduled tasks over a GitHub Actions cron for this repo: GitHub
disables scheduled workflows in public repositories after 60 days without
activity, which is exactly when a drift check matters.

### Code review

- `/code-review` in any session reviews the current diff. Any plan.
- `/security-review` reviews the diff for security issues.
- The managed Code Review product (automatic review on every pull request)
  is for Team and Enterprise plans.
  ([docs](https://code.claude.com/docs/en/code-review))

## 5. Techniques worth knowing

**Dogfood the product.** With `.mcp.json` in place, ask Claude in this repo
to "find a pattern for letting the user stop a long agent task" and it will
call `search_patterns` on the real catalog. Every query that returns the
wrong pattern is a case for `mcp-server/evals/cases.ts`. That is the
cheapest source of the real-usage signal NORTH-STAR lists as missing.

**Plan first on anything touching a contract.** `claude --permission-mode
plan` (or the mode picker) makes Claude explore and propose without editing.
Contracts are the product; agree on the constraint list before code exists.

**Subagents keep the main conversation small.** The `contract-auditor` reads
a whole pattern directory in its own context and returns only the report. Ask
for one per pattern and they run in parallel. Adding `memory: project` to a
subagent's frontmatter gives it notes that persist across sessions.
([docs](https://code.claude.com/docs/en/sub-agents))

**Skills can carry live data.** A line starting with `` !`command` `` in a
`SKILL.md` runs before Claude sees the skill, and the output is inlined.
`/catch-up` and `/ship` use this for git state. Add `|| true` to commands
that may fail, or the whole skill aborts.
([docs](https://code.claude.com/docs/en/skills))

**Path-scoped rules.** A file in `.claude/rules/` with a `paths:` list in its
frontmatter loads only when Claude touches matching files. If `AGENTS.md`
grows past about 200 lines, move the site and MCP sections into
`.claude/rules/site.md` and `.claude/rules/mcp-server.md`.

**Personal notes that are not committed.** `CLAUDE.local.md` at the repo
root, added to `.gitignore`, for preferences that are yours alone. Claude
also keeps its own auto memory per repository; `/memory` shows and edits
both.

**Context hygiene in long sessions.** `/context` shows what is filling the
window, `/compact <what to keep>` summarizes, `/clear` starts over. Start a
fresh session per task; the docs in this repo exist so that a fresh session
is cheap.

**Headless runs.** `claude -p "Run /drift-check"` prints the result and
exits, for use in scripts.

**Repeat on an interval.** `/loop 10m <prompt>` re-runs a prompt in the
current session, for watching a deploy or a long build. It ends with the
session; use a scheduled task for anything that should outlive it.

## 6. Adding to this setup

Decide what kind of thing it is before writing it:

| You want | Use | Because |
| --- | --- | --- |
| Claude to always know a fact or convention | `CLAUDE.md` / `AGENTS.md` | Loaded every session; keep it short |
| A multi-step procedure you run on demand | A skill in `.claude/skills/` | Loaded only when used |
| A rule that must hold every time | A hook | Deterministic; does not depend on Claude remembering |
| A focused job with its own context | A subagent in `.claude/agents/` | Returns a report, not its working |
| Something that runs while you are away | A scheduled task | Cloud, on a schedule or event |
| A check with no judgment in it | CI (`check.yml`) or a script | Cheaper and more reliable than a model |

Rules for this repo:

- A new skill, subagent, hook, or workflow gets a row in section 2 in the
  same change. `/drift-check` verifies this.
- Skills that write to the repo or cost real effort set
  `disable-model-invocation: true` so they only run when typed.
- Skills point at `AGENTS.md` and `patterns/TEMPLATE.md` instead of copying
  them. One source of truth for conventions, same as for contracts.
- Nothing here expands product scope. These are tools for building the
  catalog, not features of it.
