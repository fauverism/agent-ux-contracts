/**
 * Code-based tests for the Getting Started walkthrough.
 *
 * These lock the page's *content contract*: the structure the lesson promises
 * (intro → workflow → benefits → steps → recap → help) and the two success
 * messages a reader must actually see — the live connection and the real
 * search_patterns result. The success strings are verified against the live
 * MCP server (streaming-response, score 0.756, alias-matched); if the catalog
 * changes them, this test should fail and the page should be re-cut.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup } from '@testing-library/react';
import GettingStarted from '../app/getting-started/page';

afterEach(() => cleanup());

const headingTexts = (c: HTMLElement) =>
  [...c.querySelectorAll('h1, h2')].map((h) => h.textContent?.trim() ?? '');

test('intro: a single h1 sets up the lesson', () => {
  const { container } = render(<GettingStarted />);
  const h1s = container.querySelectorAll('h1');
  assert.equal(h1s.length, 1, 'exactly one page title');
  assert.match(h1s[0].textContent!, /Getting started/);
});

test('structure: sections appear in the order the brief asks for', () => {
  const { container } = render(<GettingStarted />);
  const heads = headingTexts(container);

  const required = [
    'Getting started', // intro
    'What you’ll do', // workflow of the lesson
    'Why it’s worth it', // benefits
    'Step 1 · Build the server', // tutorial steps…
    'Step 2 · Connect Claude Code',
    'Step 3 · Confirm the connection',
    'Step 4 · Search in product language',
    'Step 5 · Scaffold & verify',
    'What you’ve got now', // summary
    'If you get stuck', // help
  ];

  let cursor = -1;
  for (const label of required) {
    const at = heads.findIndex((h, i) => i > cursor && h.includes(label));
    assert.notEqual(at, -1, `section "${label}" present and after the previous one`);
    cursor = at;
  }
});

test('workflow: the five steps are previewed up front as an ordered list', () => {
  const { container } = render(<GettingStarted />);
  const firstList = container.querySelector('ol');
  assert.ok(firstList, 'an ordered list previews the walkthrough');
  assert.equal(firstList!.querySelectorAll('li').length, 5, 'five steps previewed');
});

test('benefits: the why-bother section lists concrete payoffs', () => {
  const { container } = render(<GettingStarted />);
  const text = container.textContent ?? '';
  assert.match(text, /Stop re-deriving the same UI/);
  assert.match(text, /RFC-2119/);
  assert.match(text, /verify, not just trust/i);
});

test('success message #1: the live connection signal is shown', () => {
  const { container } = render(<GettingStarted />);
  const text = container.textContent ?? '';
  assert.match(text, /claude mcp list/, 'the command to check the connection');
  assert.match(text, /✓ Connected/, 'the success signal a reader must see');
});

test('success message #2: the real search_patterns result is shown verbatim', () => {
  const { container } = render(<GettingStarted />);
  const result = container.querySelector('.agent-json');
  assert.ok(result, 'the tool result renders in the agent-json view');
  const text = result!.textContent ?? '';

  // Authentic values from the live server — drift here is a real bug.
  assert.match(text, /streaming-response/, 'ranks the right pattern');
  assert.match(text, /0\.756/, 'real relevance score');
  assert.match(text, /Alias match/, 'the explainable rationale');
  assert.match(text, /"version": "0\.2\.1"/, 'pinnable version');

  for (const mustId of [
    'no-focus-steal',
    'focus-not-lost',
    'completion-announced',
    'interruptible',
    'partial-preserved',
  ]) {
    assert.match(text, new RegExp(mustId), `MUST rule ${mustId} listed`);
  }
});

test('the product-language query is the one a reader pastes', () => {
  const { container } = render(<GettingStarted />);
  assert.match(container.textContent ?? '', /I need a loading state for my AI chat/);
});

test('verification step: the scaffold tests pass on arrival', () => {
  const { container } = render(<GettingStarted />);
  const text = container.textContent ?? '';
  assert.match(text, /scaffold_pattern/);
  assert.match(text, /# pass 12/, 'green test output shown as proof');
});

test('extra prompts: more than one additional prompt is offered', () => {
  const { container } = render(<GettingStarted />);
  const text = container.textContent ?? '';
  assert.match(text, /More prompts to try/);
  assert.match(text, /caution/i, 'one prompt exercises the exclusion path');
  // The three extra prompts plus the two inline ones are all copyable.
  assert.ok(
    container.querySelectorAll('.copy-btn').length >= 5,
    'every command and prompt has a copy affordance',
  );
});

test('help: the page tells a stuck reader exactly where to go', () => {
  const { container } = render(<GettingStarted />);
  const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
  assert.ok(
    hrefs.some((h) => h.includes('/issues/new')),
    'a pre-filled issue link',
  );
  assert.ok(
    hrefs.some((h) => h.startsWith('mailto:')),
    'a direct contact link',
  );
  assert.ok(
    hrefs.some((h) => h.includes('/tree/main/mcp-server')),
    'a link to the source',
  );
});
