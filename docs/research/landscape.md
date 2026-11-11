# Landscape: who else is near this, and where this wins

A dated snapshot. Everything in the tables was read from the linked page on
**2026-11-11** unless the row says otherwise. This field moves monthly;
re-verify a row before quoting it. The use cases that follow from this
research are in [`docs/journeys/`](../journeys/README.md).

## The short version

1. **Nobody else found ships behavior rules as testable, machine-readable
   contracts.** A web search for the concept ("machine-readable UX pattern
   specification for AI agents, RFC 2119 constraints") returns this repo as the
   closest match. The idea is unclaimed. It is also unproven: no one else doing
   it may mean no one has needed it yet.
2. **The field splits into five camps.** Guidance for humans, component kits,
   context servers for coding agents, protocols for agent-rendered UI, and spec
   tooling. Each delivers one of *what to build*, *the code*, *the context*, or
   *the plumbing*. None delivers *proof that the behavior is right*.
3. **Competitors are far ahead on the first five minutes.** One command, no
   clone, a live site, a license that permits use. That gap matters more today
   than any feature.
4. **So: compete on proof, borrow their distribution.** The component kits
   already solved install. The patterns can ride those channels instead of
   building a CLI or a service, which the scope limits forbid anyway.

## The landscape

The `id` column is the key the journey files use in `advantage.versus`.

### Camp 1: pattern guidance for humans

| id | What it is | What a coding agent gets | Verifiable behavior |
| --- | --- | --- | --- |
| `shape-of-ai` | [The Shape of AI](https://www.shapeof.ai): 57 patterns in 6 groups (wayfinders, inputs, tuners, governors, trust builders, identifiers). CC BY-NC-SA. | Nothing direct. The index page lists no code, API, or machine-readable format. | None |
| `ai-ux-playground` | [AI UX Playground](https://www.aiuxplayground.com/patterns): 155 patterns in 11 categories, each with definition, when to use, when not to, anti-patterns, product examples, most with a live demo. | Nothing direct. No code, specs, or MCP mentioned. | None. "When not to use" exists, as prose for a human reader. |
| `hax-toolkit` | [Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/): 18 guidelines for human-AI interaction, a design library, design patterns, a team workbook. | Nothing direct. No code or tooling offered. | None |

Google's People + AI Guidebook belongs in this camp; its page did not render
for verification on this date, so it has no row.

### Camp 2: component kits

| id | What it is | What a coding agent gets | Verifiable behavior |
| --- | --- | --- | --- |
| `ai-elements` | [Vercel AI Elements](https://github.com/vercel/ai-elements): React components for AI apps built on shadcn/ui. Install with `npx ai-elements@latest` or through the shadcn CLI. Requires a Next.js project with the AI SDK, shadcn/ui initialized, and Tailwind in CSS-variables mode. **The README says the project will be deprecated at the end of November 2026 and replaced by the shadcn/ui version of AI Elements.** | Component source copied into the project. The repo has a `skills/ai-elements` folder. | The README does not mention tests, accessibility, or behavior rules. |
| `assistant-ui` | [assistant-ui](https://www.assistant-ui.com/llms.txt): React primitives (Thread, Composer, Message), runtimes for AI SDK, LangGraph and AG-UI, styled components through a CLI registry. Docs for Vue, React Native and terminal too. | A docs MCP server, every docs page as Markdown, an `llms.txt`, and task-based agent skills. | Describes primitives as accessible. Documents no guarantees and no tests delivered to the consumer. |
| `patternbase` | [PatternBase](https://github.com/design-sparx/pattern-base): 54 components implementing the Shape of AI taxonomy for Ant Design, Mantine, and shadcn/ui, with a shared core. MIT. | Component source. | Has a Vitest suite in its own repo. The README does not mention accessibility, specs, or tests shipped with a copied component. |
| `shadcn-registry` | [shadcn registry](https://ui.shadcn.com/docs/registry/getting-started) and [MCP server](https://ui.shadcn.com/docs/mcp): a distribution format, not a kit. A registry is static JSON served over HTTP (`/r/registry.json` plus `/r/<name>.json`). Consumers run `shadcn add <url>` or configure a namespace such as `@acme`. The MCP server lets agents browse, search, and install from any compatible registry. | Search and install across every registry the project lists. | None. It moves files. |

### Camp 3: context servers for coding agents

| id | What it is | What a coding agent gets | Verifiable behavior |
| --- | --- | --- | --- |
| `storybook-mcp` | [Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview): docs, development, and testing toolsets over a component manifest. Preview; API may change. | Props, stories, extra docs, and a `test-run` tool for the team's own stories. | Whatever the team already wrote as stories. The manifest carries no behavior rules. |
| `figma-mcp` | [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server): variables, components, layout data, and Code Connect mappings from a selected frame. | The look and structure of a design, and which code component it maps to. | None. The guide does not cover interaction behavior, states, or accessibility. |

### Camp 4: protocols for agent-rendered UI

| id | What it is | Says how components must behave? |
| --- | --- | --- |
| `a2ui` | [A2UI](https://a2ui.org/) v1.0, Apache-2.0: the agent emits declarative JSON, the client renders it from a catalog the developer registered. Renderers for React, Lit, Angular, Flutter, SwiftUI, Compose. | No. Behavior and accessibility are left to the developer's catalog. |
| `ag-ui` | [AG-UI](https://docs.ag-ui.com/introduction): an event-based protocol between agent backends and frontends, started by CopilotKit with LangChain and CrewAI. | No. It is transport. |
| `mcp-apps` | [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps): an MCP extension where a tool declares a `ui://` resource and the host renders it in a sandboxed iframe. Supported by Claude, VS Code Copilot, Microsoft 365 Copilot, Goose and others. | No. It specifies security and messaging, not UX. |

### Camp 5: specs and packaging for agents

| id | What it is | Relevance |
| --- | --- | --- |
| `spec-driven-dev` | [GitHub Spec Kit](https://github.com/github/spec-kit) (constitution, specify, plan, tasks, implement, converge) and Kiro's EARS-style requirements. | Same instinct: agree the rules before the code. The specs are written fresh per project and are prose; secondary write-ups note that the acceptance criteria "do not run". (Spec Kit read from its README; the Kiro and EARS points come from search summaries, not primary pages.) |
| `agent-skills` | The [skills CLI](https://github.com/vercel-labs/skills): `npx skills add owner/repo` installs `SKILL.md` folders from a GitHub repo into "OpenCode, Claude Code, Codex, Cursor, and 75 more". | A distribution channel that needs no package, server, or CLI of your own. |
| `claude-plugins` | [Claude Code plugins](https://code.claude.com/docs/en/plugins): a directory bundling skills, agents, hooks, and MCP servers. A marketplace is a repo with `.claude-plugin/marketplace.json`. | A way to deliver the MCP server and skills together to Claude Code users. |
| `affora` | [Affora](https://arxiv.org/abs/2609.19125) (arXiv, September 2026): a design system for interfaces that computer-use agents *operate*, with executable checks. | A different problem with a similar name. See "Positioning" below. |

## What this product has that none of the above showed

Each item is something the catalog does today, checked on 2026-11-11.

| Capability | Evidence in this repo | Nearest thing elsewhere |
| --- | --- | --- |
| Rules as data, with stable ids and RFC 2119 levels | `patterns/*/pattern.contract.json` | Prose guidelines (`hax-toolkit`, `shape-of-ai`) |
| Tests named by the rule they prove, delivered with the code | `scaffold_pattern` returns the test file; test names start with the constraint id | `patternbase` has tests in its own repo |
| Every MUST mapped to a code anchor | `compliance_notes` in the scaffold response | Nothing found |
| A version and hash to pin | `contract_hash`, `pin_note`, COMPLIANCE.md header | Copy-paste kits sever the link at copy time |
| "Don't use this here" at generation time | `caution` and low-confidence `advisory` from `search_patterns` | `ai-ux-playground` documents when-not-to for human readers |
| Accessibility inside the spec | `accessibility` block and accessibility-category constraints in every contract | `assistant-ui` describes primitives as accessible |
| Rules independent of the stack | The contract is JSON; React and vanilla are two projections of it | Every kit binds to React; `ai-elements` also to Next.js, AI SDK, shadcn, Tailwind |

## Where the others are ahead

Stated plainly, because these decide whether anyone gets far enough to see
the table above.

| Gap | Them | This repo today |
| --- | --- | --- |
| First use | One command (`npx ai-elements@latest`, `npx shadcn add <url>`, `npx skills add owner/repo`) | Clone, build, and register an absolute path |
| A live site | All of them | `DEPLOYMENT_NOT_FOUND` |
| Permission to use it | MIT (`patternbase`), Apache-2.0 (`a2ui`), CC BY-NC-SA (`shape-of-ai`) | All Rights Reserved |
| Breadth | 54 to 155 patterns | 10 |
| Docs for agents without MCP | `llms.txt`, Markdown twins of every page (`assistant-ui`) | No `llms.txt`, no raw contract URL |
| First-run reliability | Not tested here | The documented verify command fails in a Next.js-style project. See the [baseline run](../journeys/runs/2026-11-11-baseline.md). |

Breadth is the one gap not to chase. Ten patterns with proof is the position;
155 without it is someone else's.

## UX moves worth making

Ordered by leverage. "Owner decision" means it touches a decision listed in
[`NORTH-STAR.md`](../NORTH-STAR.md) and should not be built before that
decision is made. None of these was built or tested as part of this research.

| # | Move | Why | Scope |
| --- | --- | --- | --- |
| 1 | **Make verification pass first time, everywhere.** Ship what the verify command needs with the scaffold instead of relying on the consumer's `tsconfig`. | The product's promise is "verify, don't trust". A first run that fails 13 of 13 breaks the promise at the moment it is made. | In scope |
| 2 | **Fix the don't-use-this warnings.** They miss paraphrases and fire on substrings. | This is the capability no one else has. It has to be right. | In scope |
| 3 | **Serve each contract as a static file at a stable URL, and add `llms.txt`.** | Lets any agent, with or without MCP, fetch a contract and check a pin without cloning. Static files only. | In scope (needs the site live) |
| 4 | **Give every constraint a link.** An anchor per constraint id on the pattern page. | Makes a constraint id something a designer can paste into a ticket. | In scope |
| 5 | **Publish the patterns as a shadcn-compatible registry from the site build.** Static JSON under `/r/`. | Install becomes `npx shadcn add <url>`, and every agent using the shadcn MCP server can find the patterns. No CLI or service of your own. Timely: AI Elements is moving into shadcn/ui itself. Needs a spike to confirm that test and COMPLIANCE files travel as registry files. | Owner decision: license, distribution |
| 6 | **Publish a `skills/` folder.** One skill that carries the contracts and the procedure "search, implement, verify, pin". | Install becomes `npx skills add fauverism/agent-ux-contracts` across coding agents. Contract-only adoption, no server. | Owner decision: license, distribution |
| 7 | **Publish the MCP server so setup is one line.** npm, or a Claude Code plugin marketplace entry that bundles it. | Removes clone-and-build. | Owner decision: distribution |
| 8 | **Link WCAG criteria to constraints in the schema.** | Turns the accessibility block into evidence an agent can assemble without guessing. | In scope; a schema change |

## Positioning

"Agent UX" now means two things. In this repo it means the experience people
have of AI products. In `affora`, and in a growing body of work, it means
interfaces that agents operate. The repo name invites the second reading.
One clarifying sentence wherever the thesis appears would prevent it, for
example: *contracts for the interfaces people use to work with AI*. That is a
messaging choice for the owner.

The claim to lead with, because the research supports it and nothing found
contradicts it: **the others give an agent a component; this gives it the
rules and the proof.**

## Method and limits

- Sources were found by web search and then opened directly where possible.
  Rows without a caveat were read from the linked page. Caveats are inline.
- Absence claims ("does not mention tests") describe the page that was read,
  not the whole product.
- Not examined: pricing, adoption numbers, commercial design-system platforms
  with MCP servers, and anything behind a login.
- No competitor was installed or run. Claims about this repo were tested;
  claims about others were read.
