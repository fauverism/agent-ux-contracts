#!/usr/bin/env node
/*
 * PostToolUse hook (Edit|Write). When Claude edits a pattern contract or the
 * schema, run the contract validator immediately and hand any failure back to
 * Claude, so a broken contract is caught at the edit instead of at the gate.
 *
 * Exit 0: nothing to say. Exit 2: stderr is shown to Claude as feedback.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let filePath = '';
try {
  filePath = JSON.parse(input)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}

const normalized = filePath.replaceAll('\\', '/');
const isContract = /\/patterns\/[^/]+\/pattern\.contract\.json$/.test(normalized);
const isSchema = normalized.endsWith('/schema/pattern-contract.schema.json');
if (!isContract && !isSchema) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

// The validator needs ajv. Without installed dependencies there is nothing
// useful to report, so stay silent rather than block the edit.
if (!existsSync(join(root, 'node_modules', 'ajv'))) process.exit(0);

const result = spawnSync(process.execPath, ['scripts/validate-contracts.mjs'], {
  cwd: root,
  encoding: 'utf8',
});

if (result.status === 0) process.exit(0);

process.stderr.write(
  `Contract validation failed after editing ${filePath}.\n` +
    'Fix the contract before continuing; the validator output is the checklist.\n\n' +
    `${result.stdout ?? ''}${result.stderr ?? ''}`,
);
process.exit(2);
