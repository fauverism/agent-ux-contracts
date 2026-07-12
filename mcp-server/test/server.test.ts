/**
 * End-to-end over the real stdio transport: spawn the server as a child
 * process and exercise both tools through an MCP client. This is the check
 * that outputSchema/structuredContent actually work on the wire.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = dirname(fileURLToPath(import.meta.url));
const mcpRoot = join(here, '..');
const repoRoot = join(mcpRoot, '..');

let client: Client;

before(async () => {
  client = new Client({ name: 'e2e-test', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', join(mcpRoot, 'src', 'index.ts')],
    env: { ...process.env, AGENT_UX_CONTRACTS_ROOT: repoRoot },
  });
  await client.connect(transport);
});

after(async () => {
  await client.close();
});

test('e2e: both tools are listed with input and output schemas', async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['scaffold_pattern', 'search_patterns']);
  for (const tool of tools) {
    assert.ok(tool.inputSchema, `${tool.name} has an input schema`);
    assert.ok(tool.outputSchema, `${tool.name} has an output schema`);
  }
});

test('e2e: search_patterns returns structured results with rationale', async () => {
  const result = await client.callTool({
    name: 'search_patterns',
    arguments: { query: 'stream tokens progressively' },
  });
  assert.ok(!result.isError, 'not an error');
  const structured = result.structuredContent as {
    results: Array<{ id: string; rationale: string; contract_hash: string }>;
  };
  assert.ok(structured.results.length > 0);
  assert.equal(structured.results[0].id, 'streaming-response');
  assert.ok(structured.results[0].rationale.length > 0);
  assert.match(structured.results[0].contract_hash, /^[0-9a-f]{64}$/);
});

test('e2e: scaffold_pattern returns files, constraints, and compliance_notes', async () => {
  const result = await client.callTool({
    name: 'scaffold_pattern',
    arguments: { pattern_id: 'approval-gate', framework: 'react' },
  });
  assert.ok(!result.isError, 'not an error');
  const structured = result.structuredContent as {
    files: Array<{ role: string }>;
    constraints: unknown[];
    compliance_notes: Array<{ constraint_id: string }>;
  };
  assert.deepEqual(
    structured.files.map((f) => f.role),
    ['component', 'test', 'support', 'compliance'],
  );
  assert.ok(structured.constraints.length > 0);
  assert.ok(structured.compliance_notes.length > 0);
});

test('e2e: failures arrive as in-band structured errors, not protocol errors', async () => {
  const result = await client.callTool({
    name: 'scaffold_pattern',
    arguments: { pattern_id: 'streaming-response', framework: 'vue' },
  });
  assert.equal(result.isError, true);
  const content = result.content as Array<{ type: string; text: string }>;
  const payload = JSON.parse(content[0].text) as {
    error: { code: string; message: string; next_action: string; supported: string[] };
  };
  assert.equal(payload.error.code, 'FRAMEWORK_UNSUPPORTED');
  assert.match(payload.error.message, /available: react, vanilla/);
  assert.ok(payload.error.next_action.length > 0);
  assert.deepEqual(payload.error.supported, ['react', 'vanilla']);
});
