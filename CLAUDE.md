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
- 8 patterns in v1. No CLI. No database. No auth. No SaaS features.
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
