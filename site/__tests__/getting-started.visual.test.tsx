/**
 * Visual / rendering tests for the Getting Started walkthrough.
 *
 * "Visual" here means the page renders to a correct, accessible DOM — the
 * house standard for this repo, where accessibility is a contract field, not
 * an afterthought. axe-core gates WCAG A/AA; the structural assertions gate
 * the layout primitives the page leans on (command blocks, the agent-json
 * result view, the labelled section rules) so a broken render is caught here
 * rather than in someone's eyes.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, act } from '@testing-library/react';
import axe from 'axe-core';
import GettingStarted from '../app/getting-started/page';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  // Contrast is a token-level concern owned by the design system, not by this
  // page's markup; the pattern tests disable it for the same reason.
  rules: { 'color-contrast': { enabled: false } },
};

test('axe: the rendered page has no WCAG A/AA violations', async () => {
  const { container } = render(<GettingStarted />);
  await act(async () => {});
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(
    result.violations,
    [],
    result.violations.map((v) => `${v.id}: ${v.help}`).join('\n'),
  );
});

test('landmarks: the page renders inside a main region under a nav', () => {
  const { container } = render(<GettingStarted />);
  assert.ok(container.querySelector('main.shell-main'), 'main content region');
  assert.ok(container.querySelector('nav[aria-label="Site"]'), 'site nav');
  assert.ok(
    container.querySelector('a[aria-current="page"]'),
    'current page marked in the nav',
  );
});

test('heading order: h1 first, then only h2s — no skipped levels', () => {
  const { container } = render(<GettingStarted />);
  const levels = [...container.querySelectorAll('h1, h2, h3, h4')].map((h) =>
    Number(h.tagName[1]),
  );
  assert.equal(levels[0], 1, 'starts at h1');
  assert.ok(
    levels.slice(1).every((l) => l === 2),
    'every following heading is an h2 — flat, scannable outline',
  );
});

test('command blocks: each runnable command and prompt renders as a code block', () => {
  const { container } = render(<GettingStarted />);
  const blocks = container.querySelectorAll('.cmd-block');
  // build, add, .mcp.json, list, list-output, search prompt, scaffold prompt,
  // test cmd, test output, + 3 extra prompts = 12.
  assert.ok(blocks.length >= 11, `expected the command/prompt blocks, got ${blocks.length}`);
  for (const block of blocks) {
    assert.ok(block.querySelector('pre code'), 'block has preformatted content');
  }
});

test('result view: the search result renders syntax-highlighted, not as flat text', () => {
  const { container } = render(<GettingStarted />);
  const result = container.querySelector('.agent-json');
  assert.ok(result, 'agent-json result block present');
  assert.ok(
    result!.querySelector('.j-key'),
    'JSON keys are highlighted — the same view used on pattern pages',
  );
  assert.ok(result!.querySelector('.j-str'), 'JSON string values are highlighted');
});

test('copy affordances: input blocks are copyable, output blocks are not', () => {
  const { container } = render(<GettingStarted />);
  // Expected-output blocks (mcp list result, test result) deliberately omit a
  // copy button — you don't paste output anywhere.
  const labels = [...container.querySelectorAll('.cmd-block')].map((b) => ({
    hasCopy: !!b.querySelector('.copy-btn'),
    text: b.textContent ?? '',
  }));
  const connected = labels.find((l) => l.text.includes('✓ Connected'));
  assert.ok(connected, 'the connection-output block exists');
  assert.equal(connected!.hasCopy, false, 'output block has no copy button');

  const buildBlock = labels.find((l) => l.text.includes('git clone'));
  assert.ok(buildBlock, 'the build-command block exists');
  assert.equal(buildBlock!.hasCopy, true, 'runnable command is copyable');
});

test('section rules: the walkthrough and recap are visually separated', () => {
  const { container } = render(<GettingStarted />);
  const rules = [...container.querySelectorAll('.rule-labeled')].map(
    (r) => r.getAttribute('aria-label') ?? '',
  );
  assert.ok(rules.includes('the walkthrough'), 'walkthrough divider');
  assert.ok(rules.includes('recap'), 'recap divider');
});
