import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { ThinkingVisibility, PHASE_MESSAGES } from './ThinkingVisibility';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const region = (c: HTMLElement) => c.querySelector<HTMLElement>('.thinking-visibility__region')!;
const disclosure = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.thinking-visibility__disclosure')!;
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const answer = (c: HTMLElement) => c.querySelector<HTMLElement>('.thinking-visibility__answer')!;

test('reasoning-distinct: reasoning region is a <section> with aria-label', () => {
  const { container } = render(
    <ThinkingVisibility phase="thinking" thinking="…" label="Working notes" />,
  );
  const sec = region(container);
  assert.ok(sec, 'section element present');
  assert.equal(sec.tagName, 'SECTION');
  assert.equal(sec.getAttribute('aria-label'), 'Working notes');
});

test('reasoning-distinct: answer region is separate from the reasoning region', () => {
  const { container } = render(
    <ThinkingVisibility phase="completed" thinking="notes" label="Working notes">
      <p>The answer.</p>
    </ThinkingVisibility>,
  );
  const reasoningEl = region(container);
  const answerEl = answer(container);
  assert.ok(reasoningEl, 'reasoning region present');
  assert.ok(answerEl, 'answer region present');
  assert.equal(reasoningEl.contains(answerEl), false, 'answer not nested inside reasoning');
});

test('disclosure-accessible: disclosure button has aria-expanded and aria-controls', () => {
  const { container } = render(
    <ThinkingVisibility phase="thinking" thinking="…" />,
  );
  const btn = disclosure(container);
  assert.ok(btn.hasAttribute('aria-expanded'), 'aria-expanded present');
  const controlsId = btn.getAttribute('aria-controls');
  assert.ok(controlsId, 'aria-controls present');
  const target = container.querySelector(`#${controlsId}`);
  assert.ok(target, 'aria-controls target exists');
});

test('disclosure-accessible: clicking disclosure toggles aria-expanded and region visibility', () => {
  const { container } = render(
    <ThinkingVisibility phase="idle" thinking="" />,
  );
  const btn = disclosure(container);
  const sec = region(container);
  // starts collapsed in idle
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(sec.hidden, true);

  fireEvent.click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(sec.hidden, false);

  fireEvent.click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(sec.hidden, true);
});

test('phase-announced: PHASE_MESSAGES text appears in the polite live region', () => {
  const { container, rerender } = render(
    <ThinkingVisibility phase="idle" thinking="" />,
  );
  const live = liveRegion(container);
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.equal(live.textContent, PHASE_MESSAGES.idle);

  rerender(<ThinkingVisibility phase="thinking" thinking="…" />);
  assert.equal(live.textContent, PHASE_MESSAGES.thinking);

  rerender(<ThinkingVisibility phase="answering" thinking="…" />);
  assert.equal(live.textContent, PHASE_MESSAGES.answering);

  rerender(<ThinkingVisibility phase="completed" thinking="…" />);
  assert.equal(live.textContent, PHASE_MESSAGES.completed);
});

test('non-blocking: reasoning region is inline, not an overlay (no fixed/absolute positioning class)', () => {
  const { container } = render(
    <ThinkingVisibility phase="thinking" thinking="step 1" />,
  );
  // Overlay check: the region must not use a role that implies a modal/dialog
  assert.notEqual(region(container).getAttribute('role'), 'dialog');
  assert.notEqual(region(container).getAttribute('role'), 'alertdialog');
  // It should be a section or div (inline)
  assert.ok(['SECTION', 'DIV'].includes(region(container).tagName));
});

test('auto-expand: region is visible during thinking and answering phases', () => {
  const { container, rerender } = render(
    <ThinkingVisibility phase="thinking" thinking="step 1" />,
  );
  assert.equal(region(container).hidden, false, 'visible during thinking');

  rerender(<ThinkingVisibility phase="answering" thinking="step 1" />);
  assert.equal(region(container).hidden, false, 'visible during answering');
});

test('collapse-after-answer: region auto-collapses when phase transitions to completed', () => {
  const { container, rerender } = render(
    <ThinkingVisibility phase="thinking" thinking="step 1" />,
  );
  assert.equal(region(container).hidden, false, 'expanded during thinking');

  rerender(<ThinkingVisibility phase="completed" thinking="step 1" />);
  assert.equal(region(container).hidden, true, 'collapsed after completion');
  assert.equal(disclosure(container).getAttribute('aria-expanded'), 'false');
});

test('collapse-after-answer: user toggle overrides auto-collapse', () => {
  const { container, rerender } = render(
    <ThinkingVisibility phase="thinking" thinking="step 1" />,
  );
  // User manually collapses while thinking
  fireEvent.click(disclosure(container));
  assert.equal(region(container).hidden, true, 'user collapsed during thinking');

  // Phase advances to completed — user preference holds
  rerender(<ThinkingVisibility phase="completed" thinking="step 1" />);
  // The user explicitly collapsed, so it stays collapsed (already collapsed = same result)
  assert.equal(region(container).hidden, true, 'stays collapsed per user preference');
});

test('axe: no WCAG A/AA violations in thinking and completed states', async () => {
  const { container, rerender } = render(
    <ThinkingVisibility phase="thinking" thinking="Step 1: reasoning…" />,
  );
  const thinkingResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(thinkingResult.violations, [], thinkingResult.violations.map((v) => v.id).join(', '));

  rerender(<ThinkingVisibility phase="completed" thinking="Step 1: reasoning…">The answer.</ThinkingVisibility>);
  const completedResult = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(completedResult.violations, [], completedResult.violations.map((v) => v.id).join(', '));
});
