import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ThinkingVisibility, PHASE_MESSAGES } from './ThinkingVisibility.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options = {}) => {
  const tv = new ThinkingVisibility(options);
  tv.mount(host);
  return tv;
};

const regionEl = () => host.querySelector('.thinking-visibility__region');
const disclosureBtn = () => host.querySelector('.thinking-visibility__disclosure');
const statusEl = () => host.querySelector('[role="status"]');

test('reasoning-distinct: reasoning region is a <section> with aria-label', () => {
  mounted({ label: 'Working notes' });
  const section = regionEl();
  assert.ok(section, 'section element present');
  assert.equal(section.tagName, 'SECTION');
  assert.equal(section.getAttribute('aria-label'), 'Working notes');
});

test('reasoning-distinct: answer container is separate from reasoning region', () => {
  const tv = mounted();
  const answerContainer = tv.getAnswerContainer();
  assert.ok(answerContainer, 'answer container returned');
  assert.equal(regionEl().contains(answerContainer), false, 'answer not inside reasoning region');
});

test('disclosure-accessible: disclosure button has aria-expanded and aria-controls', () => {
  mounted();
  const btn = disclosureBtn();
  assert.ok(btn.hasAttribute('aria-expanded'), 'aria-expanded present');
  const controlsId = btn.getAttribute('aria-controls');
  assert.ok(controlsId, 'aria-controls present');
  assert.ok(host.querySelector(`#${controlsId}`), 'aria-controls target exists');
});

test('disclosure-accessible: clicking disclosure toggles region visibility', () => {
  mounted();
  const btn = disclosureBtn();
  // starts collapsed (idle phase)
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(regionEl().hidden, true);

  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(regionEl().hidden, false);

  btn.click();
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(regionEl().hidden, true);
});

test('phase-announced: status region contains PHASE_MESSAGES text for each phase', () => {
  const tv = mounted();
  const live = statusEl();
  assert.equal(live.getAttribute('aria-live'), 'polite');

  for (const phase of ['idle', 'thinking', 'answering', 'completed']) {
    tv.setPhase(phase);
    assert.equal(live.textContent, PHASE_MESSAGES[phase], `phase ${phase} announced`);
  }
});

test('non-blocking: reasoning region is a section element, not a dialog role', () => {
  mounted();
  const sec = regionEl();
  assert.notEqual(sec.getAttribute('role'), 'dialog');
  assert.notEqual(sec.getAttribute('role'), 'alertdialog');
  assert.equal(sec.tagName, 'SECTION');
});

test('auto-expand: region is visible during thinking and answering', () => {
  const tv = mounted();
  tv.setPhase('thinking');
  assert.equal(regionEl().hidden, false, 'visible during thinking');
  tv.setPhase('answering');
  assert.equal(regionEl().hidden, false, 'visible during answering');
});

test('collapse-after-answer: region auto-collapses when phase transitions to completed', () => {
  const tv = mounted();
  tv.setPhase('thinking');
  assert.equal(regionEl().hidden, false, 'expanded during thinking');
  tv.setPhase('completed');
  assert.equal(regionEl().hidden, true, 'collapsed after completion');
  assert.equal(disclosureBtn().getAttribute('aria-expanded'), 'false');
});

test('collapse-after-answer: user toggle overrides auto-expand', () => {
  const tv = mounted();
  tv.setPhase('thinking');
  assert.equal(regionEl().hidden, false, 'auto-expanded during thinking');

  // User manually collapses
  disclosureBtn().click();
  assert.equal(regionEl().hidden, true, 'user collapsed it');

  // Phase continues — user preference holds
  tv.setPhase('answering');
  assert.equal(regionEl().hidden, true, 'user preference holds during answering');
});

test('appendThinking: adds text content to the reasoning region', () => {
  const tv = mounted();
  tv.setPhase('thinking');
  tv.appendThinking('step one. ');
  tv.appendThinking('step two.');
  assert.match(regionEl().textContent, /step one/);
  assert.match(regionEl().textContent, /step two/);
});

test('two instances do not share live region ids', () => {
  const otherHost = document.createElement('div');
  document.body.append(otherHost);
  try {
    const a = new ThinkingVisibility();
    a.mount(host);
    const b = new ThinkingVisibility();
    b.mount(otherHost);
    const aRegionId = host.querySelector('[aria-controls]').getAttribute('aria-controls');
    const bRegionId = otherHost.querySelector('[aria-controls]').getAttribute('aria-controls');
    assert.notEqual(aRegionId, bRegionId, 'region ids are unique per instance');
  } finally {
    otherHost.remove();
  }
});
