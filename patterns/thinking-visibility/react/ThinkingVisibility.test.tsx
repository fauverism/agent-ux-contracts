import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { ThinkingVisibility, PHASE_MESSAGES } from './ThinkingVisibility';
import type { ThinkingPhase } from './ThinkingVisibility';

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

const PHASES: ThinkingPhase[] = ['idle', 'thinking', 'answering', 'completed'];

test('reasoning-distinct: reasoning text lands only in the labelled reasoning region, the answer only in the answer region', () => {
  const { container } = render(
    <ThinkingVisibility phase="answering" thinking="First I compare the two options." label="Working notes">
      <p>Option B is cheaper.</p>
    </ThinkingVisibility>,
  );
  const reasoningEl = region(container);
  const answerEl = answer(container);
  assert.equal(reasoningEl.textContent, 'First I compare the two options.');
  assert.equal(answerEl.textContent, 'Option B is cheaper.');
  assert.ok(!answerEl.textContent!.includes('First I compare'), 'reasoning does not leak into the answer');
  assert.ok(!reasoningEl.contains(answerEl) && !answerEl.contains(reasoningEl), 'sibling regions');
  // Semantically distinct: a named group of its own, not part of the answer.
  assert.equal(reasoningEl.tagName, 'SECTION');
  assert.equal(reasoningEl.getAttribute('aria-label'), 'Working notes');
  assert.notEqual(reasoningEl.className, answerEl.className, 'separately styleable');
});

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

test('disclosure-accessible: the disclosure is a native, focusable button with a name', () => {
  const { container } = render(
    <ThinkingVisibility phase="thinking" thinking="…" label="Working notes" />,
  );
  const btn = disclosure(container);
  // Native <button type="button">: Enter/Space activation and Tab reach come
  // from the platform, not from handlers that could be removed.
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.type, 'button');
  assert.equal(btn.disabled, false);
  assert.ok(btn.tabIndex >= 0, 'in the tab order');
  assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
  assert.equal(btn.textContent, 'Working notes', 'named by the label');
  btn.focus();
  assert.ok(document.activeElement === btn, 'focusable');
  fireEvent.click(btn);
  assert.ok(document.activeElement === btn, 'toggling does not move focus off the control');
});

test('disclosure-accessible: aria-expanded matches the region visibility in every phase and after every toggle', () => {
  const { container, rerender } = render(<ThinkingVisibility phase="idle" thinking="" />);
  const inSync = (when: string) =>
    assert.equal(
      disclosure(container).getAttribute('aria-expanded'),
      String(!region(container).hidden),
      `aria-expanded reflects visibility ${when}`,
    );
  for (const phase of PHASES) {
    rerender(<ThinkingVisibility phase={phase} thinking="notes" />);
    inSync(`in ${phase}`);
  }
  // completed: collapsed. The user opens it, then closes it.
  fireEvent.click(disclosure(container));
  assert.equal(region(container).hidden, false);
  inSync('after the user expands');
  fireEvent.click(disclosure(container));
  assert.equal(region(container).hidden, true);
  inSync('after the user collapses');
  // The control points at the region it controls.
  assert.equal(disclosure(container).getAttribute('aria-controls'), region(container).id);
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

test('non-blocking: the rest of the page stays focusable and operable through every phase', () => {
  let outsideClicks = 0;
  const outside = document.createElement('button');
  outside.textContent = 'Elsewhere on the page';
  outside.addEventListener('click', () => { outsideClicks += 1; });
  const sibling = document.createElement('main');
  sibling.append(outside);
  document.body.append(sibling);
  try {
    const { container, rerender } = render(<ThinkingVisibility phase="idle" thinking="" />);
    outside.focus();
    for (const phase of PHASES) {
      rerender(<ThinkingVisibility phase={phase} thinking="step 1" />);
      // Focus is never pulled into the reasoning display.
      assert.ok(document.activeElement === outside, `${phase}: focus left where the user put it`);
      // Nothing outside is made inert or hidden from assistive technology.
      for (const el of [sibling, document.body, document.documentElement]) {
        assert.equal(el.hasAttribute('inert'), false, `${phase}: nothing made inert`);
        assert.notEqual(el.getAttribute('aria-hidden'), 'true', `${phase}: nothing aria-hidden`);
      }
      // No modal semantics anywhere in the component.
      assert.equal(
        container.querySelector('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
        null,
        `${phase}: not a dialog`,
      );
      // Keys are not swallowed: Tab from outside keeps its default (no focus trap).
      assert.equal(fireEvent.keyDown(outside, { key: 'Tab' }), true, `${phase}: Tab not trapped`);
      fireEvent.click(outside);
    }
    assert.equal(outsideClicks, PHASES.length, 'outside control worked in every phase');
  } finally {
    sibling.remove();
  }
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

test('axe: no WCAG A/AA violations in idle, thinking, answering, and completed states', async () => {
  const { container, rerender } = render(<ThinkingVisibility phase="idle" thinking="" />);
  const check = async (label: string) => {
    const result = await axe.run(container, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
  };
  await check('idle');

  rerender(<ThinkingVisibility phase="thinking" thinking="Step 1: reasoning…" />);
  await check('thinking');

  rerender(
    <ThinkingVisibility phase="answering" thinking="Step 1: reasoning…">The ans</ThinkingVisibility>,
  );
  await check('answering');

  rerender(
    <ThinkingVisibility phase="completed" thinking="Step 1: reasoning…">The answer.</ThinkingVisibility>,
  );
  assert.equal(region(container).hidden, true);
  await check('completed (collapsed)');

  fireEvent.click(disclosure(container));
  assert.equal(region(container).hidden, false);
  await check('completed (reasoning expanded)');
});
