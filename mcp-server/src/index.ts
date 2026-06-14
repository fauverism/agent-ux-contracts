#!/usr/bin/env node
/**
 * Entry point: stdio transport. The repo root (containing patterns/ and
 * schema/) defaults to the directory above mcp-server/; override with
 * AGENT_UX_CONTRACTS_ROOT for out-of-tree checkouts.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const here = dirname(fileURLToPath(import.meta.url));
// src/ or dist/ → mcp-server/ → repo root.
const defaultRoot = join(here, '..', '..');
const repoRoot = resolve(process.env.AGENT_UX_CONTRACTS_ROOT ?? defaultRoot);

const { server } = createServer({ repoRoot });

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('agent-ux-contracts MCP server ready (stdio).\n');
