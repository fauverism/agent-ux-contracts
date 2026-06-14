import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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

test('keyboard-expandable: toggle button present when detail provided', () => {
  mounted({ level: 'moderate', detail: 'Based on strong evidence.' });
  const btn = toggleBtn();
  assert.ok(btn, 'toggle button rendered');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(detailEl().hidden, true);
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
