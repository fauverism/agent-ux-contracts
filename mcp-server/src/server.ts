/**
 * MCP server wiring — two tools, stdio transport (DESIGN.md).
 * All logging goes to stderr; stdout is the protocol channel.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolError } from './errors.js';
import { PatternCatalog, type LoaderOptions } from './loader.js';
import {
  LexicalSearchProvider,
  searchPatterns,
  type ScoredResult,
  type SearchProvider,
} from './search.js';
import { scaffoldPattern } from './scaffold.js';
import {
  scaffoldInputShape,
  scaffoldOutputSchema,
  scaffoldOutputShape,
  searchInputShape,
  searchOutputSchema,
  searchOutputShape,
} from './schemas.js';
import type { LoadedPattern } from './types.js';

const SERVER_VERSION = '0.1.0';

function toSearchResult(scored: ScoredResult) {
  const { contract } = scored.pattern;
  const musts = contract.constraints.filter(
    (c) => c.level === 'MUST' || c.level === 'MUST_NOT',
  );
  const count = (level: string) =>
    contract.constraints.filter((c) => c.level === level).length;
  return {
    id: contract.id,
    name: contract.name,
    intent: contract.summary,
    category: contract.category,
    version: contract.version,
    contract_hash: scored.pattern.contractHash,
    score: Math.round(scored.score * 1000) / 1000,
    rationale: scored.rationale,
    ...(scored.caution ? { caution: scored.caution } : {}),
    constraints: {
      counts: {
        must: count('MUST'),
        must_not: count('MUST_NOT'),
        should: count('SHOULD') + count('SHOULD_NOT'),
        may: count('MAY'),
      },
      musts: musts.map((c) => ({ id: c.id, statement: c.statement })),
    },
  };
}

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function ok(structured: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

function fail(error: ToolError): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(error.toPayload(), null, 2) }],
    isError: true,
  };
}

export interface CreateServerOptions extends LoaderOptions {
  searchProvider?: SearchProvider;
}

export function createServer(opts: CreateServerOptions): {
  server: McpServer;
  catalog: PatternCatalog;
} {
  const catalog = new PatternCatalog(opts);
  const provider = opts.searchProvider ?? new LexicalSearchProvider();

  const server = new McpServer({ name: 'agent-ux-contracts', version: SERVER_VERSION });

  server.registerTool(
    'search_patterns',
    {
      title: 'Search UX pattern contracts',
      description:
        'Ranked search over the AI-interface UX pattern catalog. Returns pattern ids, intent, ' +
        'MUST-level constraint summaries, and a one-sentence rationale for why each result matched. '
        + 'Empty results include the category map and near-miss suggestions instead of a void.',
      inputSchema: searchInputShape,
      outputSchema: searchOutputShape,
    },
    async ({ query, category, framework }) => {
      try {
        catalog.refreshIfStale();
        const outcome = searchPatterns(catalog, provider, query, { category, framework });
        const structured = {
          results: outcome.results.map(toSearchResult),
          ...(outcome.nearest ? { nearest: outcome.nearest } : {}),
        };
        return ok(searchOutputSchema.parse(structured));
      } catch (err) {
        if (err instanceof ToolError) return fail(err);
        throw err;
      }
    },
  );

  server.registerTool(
    'scaffold_pattern',
    {
      title: 'Scaffold a pattern implementation',
      description:
        'Generates a known-compliant starting implementation (component + tests + COMPLIANCE.md) ' +
        'from the reference templates, plus the full constraints array and compliance_notes mapping ' +
        'every MUST rule to the code that satisfies it — verify, don\'t trust.',
      inputSchema: scaffoldInputShape,
      outputSchema: scaffoldOutputShape,
    },
    async ({ pattern_id, framework, options }) => {
      try {
        catalog.refreshIfStale();
        const result = scaffoldPattern(catalog, pattern_id, framework, options ?? {});
        return ok(scaffoldOutputSchema.parse(result) as Record<string, unknown>);
      } catch (err) {
        if (err instanceof ToolError) return fail(err);
        throw err;
      }
    },
  );

  return { server, catalog };
}

export type { LoadedPattern };
