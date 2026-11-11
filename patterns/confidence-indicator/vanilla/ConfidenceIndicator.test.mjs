import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { ConfidenceIndicator, CONFIDENCE_LABELS } from './ConfidenceIndicator.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options) => {
  const ci = new ConfidenceIndicator(options);
  ci.mount(host);
  return ci;
};

const labelEl = () => host.querySelector('.confidence-indicator__label');
const toggleBtn = () => host.querySelector('.confidence-indicator__toggle');
const detailEl = () => host.querySelector('.confidence-indicator__detail');

const LEVELS = Object.keys(CONFIDENCE_LABELS);
const rootEl = () => host.querySelector('.confidence-indicator');
const FULL = { detail: 'Reasoning.', refusalReason: 'Reason.', caveats: ['Caveat'] };

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('no-false-confidence: every level is displayed as given, never re-mapped to another level', () => {
  for (const level of LEVELS) {
    host.textContent = '';
    mounted({ level, ...FULL });
    assert.equal(rootEl().dataset.level, level, `${level}: data-level is the level given`);
    assert.equal(labelEl().textContent, CONFIDENCE_LABELS[level]);
    // No other level's term appears anywhere in the component — in particular
    // a lower level never also shows the "high" term.
    for (const other of LEVELS.filter((l) => l !== level)) {
      assert.ok(
        !host.textContent.includes(CONFIDENCE_LABELS[other]),
        `${level} does not display the ${other} term`,
      );
    }
  }
});

test('no-false-confidence: a downgrade from the host is shown immediately, with no stale higher level', () => {
  const ci = mounted({ level: 'high' });
  ci.update({ level: 'low' });
  assert.equal(rootEl().dataset.level, 'low');
  assert.equal(labelEl().textContent, CONFIDENCE_LABELS.low);
  assert.ok(!host.textContent.includes(CONFIDENCE_LABELS.high));
  assert.equal(host.querySelectorAll('.confidence-indicator').length, 1, 'no stale copy left behind');
});

test('accessible-confidence: text label rendered for each level', () => {
  for (const [level, text] of Object.entries(CONFIDENCE_LABELS)) {
    host.textContent = '';
    const ci = new ConfidenceIndicator({ level });
    ci.mount(host);
    assert.equal(labelEl().textContent, text, `${level} renders label text`);
  }
});

test('accessible-confidence: visual element is aria-hidden', () => {
  mounted({ level: 'high' });
  const visual = host.querySelector('.confidence-indicator__visual');
  assert.ok(visual, 'visual element present');
  assert.equal(visual.getAttribute('aria-hidden'), 'true');
});

test('consistent-semantics: CONFIDENCE_LABELS values are all unique', () => {
  const values = Object.values(CONFIDENCE_LABELS);
  assert.equal(new Set(values).size, values.length);
});

test('consistent-semantics: a level renders the same term whatever else is on screen', () => {
  for (const level of LEVELS) {
    host.textContent = '';
    mounted({ level });
    const bare = labelEl().textContent;
    host.textContent = '';
    mounted({ level, ...FULL });
    assert.equal(bare, CONFIDENCE_LABELS[level]);
    assert.equal(labelEl().textContent, bare, `${level}: same term with and without detail`);
  }
});

test('keyboard-expandable: toggle button present when detail provided', () => {
  mounted({ level: 'moderate', detail: 'Based on strong evidence.' });
  const btn = toggleBtn();
  assert.ok(btn, 'toggle button rendered');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(detailEl().hidden, true);
});

test('keyboard-expandable: the toggle is a native, focusable button with a name', () => {
  mounted({ level: 'moderate', detail: 'Based on strong evidence.' });
  const btn = toggleBtn();
  // Native <button type="button">: Enter/Space activation and Tab reach come
  // from the platform, not from handlers that could be removed.
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.type, 'button');
  assert.equal(btn.disabled, false);
  assert.ok(btn.tabIndex >= 0, 'in the tab order');
  assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
  assert.ok(btn.textContent.trim().length > 0, 'has an accessible name');
  btn.focus();
  assert.ok(document.activeElement === btn, 'focusable');
  // Toggling does not move focus away from the control.
  btn.click();
  assert.ok(document.activeElement === btn, 'focus stays on the toggle after expanding');
  assert.equal(detailEl().hidden, false);
});

test('keyboard-expandable: clicking toggle opens and closes the detail', () => {
  mounted({ level: 'low', detail: 'Limited data.' });
  const btn = toggleBtn();
  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(detailEl().hidden, false);
  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(detailEl().hidden, true);
});

test('keyboard-expandable: toggle aria-controls points to detail element', () => {
  mounted({ level: 'low', detail: 'Limited data.' });
  const btn = toggleBtn();
  const id = btn.getAttribute('aria-controls');
  assert.ok(id, 'aria-controls present');
  assert.ok(host.querySelector(`#${id}`), 'aria-controls target in DOM');
});

test('keyboard-expandable: expansion state survives update()', () => {
  const ci = mounted({ level: 'moderate', detail: 'First.' });
  toggleBtn().click(); // expand
  ci.update({ detail: 'Updated.' });
  // After re-render, expanded state should persist
  assert.equal(toggleBtn().getAttribute('aria-expanded'), 'true');
  assert.equal(detailEl().hidden, false);
});

test('refusal-level: refusalReason rendered when level is refusal', () => {
  mounted({ level: 'refusal', refusalReason: 'Beyond my knowledge cutoff.' });
  const caveat = host.querySelector('.confidence-indicator__caveat');
  assert.ok(caveat, 'caveat rendered');
  assert.match(caveat.textContent, /Beyond my knowledge cutoff/);
});

test('refusal-level: refusalReason not rendered for non-refusal levels', () => {
  mounted({ level: 'low', refusalReason: 'Should not appear.' });
  assert.equal(host.querySelector('.confidence-indicator__caveat'), null);
});

test('conditional-level: caveats list rendered when level is conditional', () => {
  mounted({ level: 'conditional', caveats: ['Assumes stable prices', 'Assumes no new law'] });
  const list = host.querySelector('ul.confidence-indicator__caveat');
  assert.ok(list, 'caveat list present');
  assert.equal(list.querySelectorAll('li').length, 2);
});

test('update: level change re-renders with the new label', () => {
  const ci = mounted({ level: 'high' });
  assert.equal(labelEl().textContent, CONFIDENCE_LABELS.high);
  ci.update({ level: 'low' });
  assert.equal(labelEl().textContent, CONFIDENCE_LABELS.low);
  assert.equal(host.querySelector('.confidence-indicator').dataset.level, 'low');
});

test('axe: no WCAG A/AA violations across all five levels, detail collapsed and expanded', async () => {
  for (const level of LEVELS) {
    host.textContent = '';
    mounted({
      level,
      detail: 'Some reasoning.',
      refusalReason: level === 'refusal' ? 'Cannot answer.' : undefined,
      caveats: level === 'conditional' ? ['Caveat one'] : undefined,
    });
    assert.equal(rootEl().dataset.level, level);
    let result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${level}: axe violations`);

    toggleBtn().click();
    assert.equal(detailEl().hidden, false);
    result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${level} (expanded): axe violations`);
  }
});
