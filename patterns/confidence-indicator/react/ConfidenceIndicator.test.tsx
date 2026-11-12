import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { ConfidenceIndicator, CONFIDENCE_LABELS } from './ConfidenceIndicator';
import type { ConfidenceLevel } from './ConfidenceIndicator';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const label = (c: HTMLElement) => c.querySelector<HTMLElement>('.confidence-indicator__label')!;
const toggle = (c: HTMLElement) => c.querySelector<HTMLButtonElement>('.confidence-indicator__toggle');
const detail = (c: HTMLElement) => c.querySelector<HTMLElement>('.confidence-indicator__detail');

const LEVELS = Object.keys(CONFIDENCE_LABELS) as ConfidenceLevel[];
const root = (c: HTMLElement) => c.querySelector<HTMLElement>('.confidence-indicator')!;

test('no-false-confidence: every level is displayed as given, never re-mapped to another level', () => {
  for (const level of LEVELS) {
    const { container, unmount } = render(
      <ConfidenceIndicator
        level={level}
        detail="Reasoning."
        refusalReason="Reason."
        caveats={['Caveat']}
      />,
    );
    assert.equal(root(container).dataset.level, level, `${level}: data-level is the level given`);
    assert.equal(label(container).textContent, CONFIDENCE_LABELS[level]);
    // No other level's term appears anywhere in the component — in particular
    // a lower level never also shows the "high" term.
    for (const other of LEVELS.filter((l) => l !== level)) {
      assert.ok(
        !container.textContent!.includes(CONFIDENCE_LABELS[other]),
        `${level} does not display the ${other} term`,
      );
    }
    unmount();
  }
});

test('no-false-confidence: a downgrade from the host is shown immediately, with no stale higher level', () => {
  const { container, rerender } = render(<ConfidenceIndicator level="high" />);
  rerender(<ConfidenceIndicator level="low" />);
  assert.equal(root(container).dataset.level, 'low');
  assert.equal(label(container).textContent, CONFIDENCE_LABELS.low);
  assert.ok(!container.textContent!.includes(CONFIDENCE_LABELS.high));
});

test('accessible-confidence: label text is rendered as readable text, not only visual', () => {
  for (const [level, text] of Object.entries(CONFIDENCE_LABELS)) {
    const { container, unmount } = render(
      <ConfidenceIndicator level={level as any} />,
    );
    assert.equal(label(container).textContent, text, `${level} label renders as text`);
    unmount();
  }
});

test('accessible-confidence: visual element is aria-hidden', () => {
  const { container } = render(<ConfidenceIndicator level="high" />);
  const visual = container.querySelector('.confidence-indicator__visual');
  assert.ok(visual, 'visual element present');
  assert.equal(visual!.getAttribute('aria-hidden'), 'true');
});

test('consistent-semantics: CONFIDENCE_LABELS keys map each level uniquely', () => {
  const values = Object.values(CONFIDENCE_LABELS);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'no two levels share a label');
});

test('consistent-semantics: a level renders the same term whatever else is on screen', () => {
  for (const level of LEVELS) {
    const bare = render(<ConfidenceIndicator level={level} />);
    const full = render(
      <ConfidenceIndicator
        level={level}
        detail="Reasoning."
        refusalReason="Reason."
        caveats={['Caveat']}
      />,
    );
    assert.equal(label(bare.container).textContent, CONFIDENCE_LABELS[level]);
    assert.equal(
      label(full.container).textContent,
      label(bare.container).textContent,
      `${level}: same term with and without detail`,
    );
    bare.unmount();
    full.unmount();
  }
});

test('keyboard-expandable: toggle button present when detail prop provided', () => {
  const { container } = render(
    <ConfidenceIndicator level="moderate" detail="Based on strong evidence." />,
  );
  const btn = toggle(container);
  assert.ok(btn, 'toggle button rendered');
  assert.equal(btn!.getAttribute('aria-expanded'), 'false', 'collapsed by default');
  const detailEl = detail(container);
  assert.ok(detailEl, 'detail element present');
  assert.equal(detailEl!.hidden, true, 'detail hidden by default');
});

test('keyboard-expandable: the toggle is a native, focusable button with a name', () => {
  const { container } = render(
    <ConfidenceIndicator level="moderate" detail="Based on strong evidence." />,
  );
  const btn = toggle(container)!;
  // Native <button type="button">: Enter/Space activation and Tab reach come
  // from the platform, not from handlers that could be removed.
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.type, 'button');
  assert.equal(btn.disabled, false);
  assert.ok(btn.tabIndex >= 0, 'in the tab order');
  assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
  assert.ok(btn.textContent!.trim().length > 0, 'has an accessible name');
  btn.focus();
  assert.ok(document.activeElement === btn, 'focusable');
  // Toggling does not move focus away from the control.
  fireEvent.click(btn);
  assert.ok(document.activeElement === btn, 'focus stays on the toggle after expanding');
  assert.equal(detail(container)!.hidden, false);
});

test('keyboard-expandable: clicking toggle opens and closes the detail', () => {
  const { container } = render(
    <ConfidenceIndicator level="moderate" detail="Based on strong evidence." />,
  );
  const btn = toggle(container)!;
  fireEvent.click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(detail(container)!.hidden, false, 'detail visible after click');

  fireEvent.click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(detail(container)!.hidden, true, 'detail hidden after second click');
});

test('keyboard-expandable: toggle has aria-controls pointing to the detail element', () => {
  const { container } = render(
    <ConfidenceIndicator level="low" detail="Limited data." />,
  );
  const btn = toggle(container)!;
  const controlsId = btn.getAttribute('aria-controls');
  assert.ok(controlsId, 'aria-controls present');
  const target = container.querySelector(`#${controlsId}`);
  assert.ok(target, 'aria-controls target exists in DOM');
});

test('keyboard-expandable: no toggle button when detail is absent', () => {
  const { container } = render(<ConfidenceIndicator level="high" />);
  assert.equal(toggle(container), null, 'no toggle without detail');
});

test('refusal-level: refusalReason renders when level is refusal', () => {
  const { container } = render(
    <ConfidenceIndicator level="refusal" refusalReason="Outside my knowledge cutoff." />,
  );
  const caveat = container.querySelector('.confidence-indicator__caveat');
  assert.ok(caveat, 'caveat element rendered');
  assert.match(caveat!.textContent!, /Outside my knowledge cutoff/);
});

test('refusal-level: refusalReason is not rendered for non-refusal levels', () => {
  const { container } = render(
    <ConfidenceIndicator level="low" refusalReason="Should not appear." />,
  );
  assert.equal(container.querySelector('.confidence-indicator__caveat'), null);
});

test('conditional-level: caveats list rendered when level is conditional', () => {
  const { container } = render(
    <ConfidenceIndicator level="conditional" caveats={['Assumes price remains stable', 'Assumes no regulatory change']} />,
  );
  const list = container.querySelector('ul.confidence-indicator__caveat');
  assert.ok(list, 'caveat list rendered');
  assert.equal(list!.querySelectorAll('li').length, 2);
});

test('axe: no WCAG A/AA violations across all five levels', async () => {
  const levels: Array<'high' | 'moderate' | 'low' | 'conditional' | 'refusal'> = [
    'high', 'moderate', 'low', 'conditional', 'refusal',
  ];
  for (const level of levels) {
    const { container, unmount } = render(
      <ConfidenceIndicator
        level={level}
        detail="Some reasoning."
        refusalReason={level === 'refusal' ? 'Cannot answer.' : undefined}
        caveats={level === 'conditional' ? ['Caveat one'] : undefined}
      />,
    );
    const result = await axe.run(container, AXE_OPTIONS);
    assert.deepEqual(result.violations, [], `${level}: ${result.violations.map((v) => v.id).join(', ')}`);
    unmount();
  }
});

test('axe: no WCAG A/AA violations with the detail region expanded', async () => {
  for (const level of LEVELS) {
    const { container, unmount } = render(
      <ConfidenceIndicator
        level={level}
        detail="Some reasoning."
        refusalReason={level === 'refusal' ? 'Cannot answer.' : undefined}
        caveats={level === 'conditional' ? ['Caveat one'] : undefined}
      />,
    );
    fireEvent.click(toggle(container)!);
    assert.equal(detail(container)!.hidden, false);
    const result = await axe.run(container, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${level} (expanded): axe violations`);
    unmount();
  }
});
