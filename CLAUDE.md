# AI UX Patterns — Project Context

## Thesis
Design systems for humans are documentation; design systems for agents are
contracts. This repo is a catalog of AI interface UX patterns, each shipped as
(1) a machine-readable contract (pattern.contract.json, RFC-2119 MUST/SHOULD
constraints), (2) human docs generated from that contract + prose, and
(3) reference implementations (React, vanilla JS; Angular for select patterns).
An MCP server exposes search_patterns and scaffold_pattern so agents and
developers consume patterns at generation time.

## Author context
Senior frontend/UX engineer, 25 yrs design + engineering, multi-stack
enterprise background (React, Angular, ServiceNow). Code quality bar is
principal-level: accessible, typed, tested, no placeholder slop.

## Hard scope limits (do not expand without being asked)
- 10 patterns in v1 (expanded from 8 by the owner). No CLI. No database.
  No auth. No SaaS features.
- MCP server: exactly 2 tools in v1.
- Site: static, file-based, Next.js App Router + Base UI + Tailwind.

## Structure
/patterns/<id>/pattern.contract.json + doc.mdx + react/ + vanilla/ (+ angular/)
/schema/pattern-contract.schema.json
/mcp-server/
/site/

## Conventions
- TypeScript everywhere. Zod or ajv validation of all contracts in CI.
- Every implementation must satisfy its own contract's MUST rules; note how
  in a COMPLIANCE.md per implementation.
- Accessibility is a contract field, not an afterthought.
- Prose tone: direct, practitioner-to-practitioner, no marketing fluff.

## Working here
How to work in this repo (the gate, conventions, gotchas) lives in AGENTS.md,
imported here so every Claude session loads it:

@AGENTS.md

## Orientation
- `docs/NORTH-STAR.md` is the intent doc: audience, launch blockers, open owner
  decisions, and the rules for choosing what to work on. Read it before
  proposing new work. Ask about anything listed there as an open decision.
- `docs/CLAUDE-PLAYBOOK.md` lists the project skills (`/catch-up`,
  `/drift-check`, `/new-pattern`, `/ship`), the `contract-auditor` subagent,
  and the automations around this repo.
- Do not put test counts or other volatile numbers in standing docs. Link to
  the command that prints them.
