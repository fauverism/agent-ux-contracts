import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
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

const PHASES = ['idle', 'thinking', 'answering', 'completed'];
const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('reasoning-distinct: reasoning text lands only in the labelled reasoning region, the answer only in the answer region', () => {
  const tv = mounted({ label: 'Working notes' });
  tv.setPhase('answering');
  tv.appendThinking('First I compare the two options.');
  const answerEl = tv.getAnswerContainer();
  answerEl.textContent = 'Option B is cheaper.';

  assert.equal(regionEl().textContent, 'First I compare the two options.');
  assert.equal(answerEl.textContent, 'Option B is cheaper.');
  assert.ok(!regionEl().contains(answerEl) && !answerEl.contains(regionEl()), 'sibling regions');
  // Semantically distinct: a named group of its own, not part of the answer.
  assert.equal(regionEl().tagName, 'SECTION');
  assert.equal(regionEl().getAttribute('aria-label'), 'Working notes');
  assert.notEqual(regionEl().className, answerEl.className, 'separately styleable');
});

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

test('disclosure-accessible: the disclosure is a native, focusable button with a name', () => {
  const tv = mounted({ label: 'Working notes' });
  tv.setPhase('thinking');
  const btn = disclosureBtn();
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
  btn.click();
  assert.ok(document.activeElement === btn, 'toggling does not move focus off the control');
});

test('disclosure-accessible: aria-expanded matches the region visibility in every phase and after every toggle', () => {
  const tv = mounted();
  const inSync = (when) =>
    assert.equal(
      disclosureBtn().getAttribute('aria-expanded'),
      String(!regionEl().hidden),
      `aria-expanded reflects visibility ${when}`,
    );
  inSync('at mount');
  for (const phase of PHASES) {
    tv.setPhase(phase);
    inSync(`in ${phase}`);
  }
  // completed: collapsed. The user opens it, then closes it.
  disclosureBtn().click();
  assert.equal(regionEl().hidden, false);
  inSync('after the user expands');
  disclosureBtn().click();
  assert.equal(regionEl().hidden, true);
  inSync('after the user collapses');
  // The control points at the region it controls.
  assert.equal(disclosureBtn().getAttribute('aria-controls'), regionEl().id);
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

test('non-blocking: the rest of the page stays focusable and operable through every phase', () => {
  let outsideClicks = 0;
  const outside = document.createElement('button');
  outside.textContent = 'Elsewhere on the page';
  outside.addEventListener('click', () => { outsideClicks += 1; });
  const sibling = document.createElement('main');
  sibling.append(outside);
  document.body.append(sibling);
  try {
    const tv = mounted();
    outside.focus();
    for (const phase of PHASES) {
      tv.setPhase(phase);
      tv.appendThinking('step. ');
      // Focus is never pulled into the reasoning display.
      assert.ok(document.activeElement === outside, `${phase}: focus left where the user put it`);
      // Nothing outside is made inert or hidden from assistive technology.
      for (const el of [sibling, document.body, document.documentElement]) {
        assert.equal(el.hasAttribute('inert'), false, `${phase}: nothing made inert`);
        assert.notEqual(el.getAttribute('aria-hidden'), 'true', `${phase}: nothing aria-hidden`);
      }
      // No modal semantics anywhere in the component.
      assert.equal(
        host.querySelector('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
        null,
        `${phase}: not a dialog`,
      );
      // Keys are not swallowed: Tab from outside keeps its default (no focus trap).
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      assert.equal(outside.dispatchEvent(tab), true, `${phase}: Tab not trapped`);
      outside.click();
    }
    assert.equal(outsideClicks, PHASES.length, 'outside control worked in every phase');
  } finally {
    sibling.remove();
  }
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

test('axe: no WCAG A/AA violations in idle, thinking, answering, and completed states', async () => {
  const tv = mounted();
  const check = async (label) => {
    const result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
  };
  await check('idle');

  tv.setPhase('thinking');
  tv.appendThinking('Step 1: reasoning…');
  await check('thinking');

  tv.setPhase('answering');
  tv.getAnswerContainer().textContent = 'The ans';
  await check('answering');

  tv.setPhase('completed');
  tv.getAnswerContainer().textContent = 'The answer.';
  assert.equal(regionEl().hidden, true);
  await check('completed (collapsed)');

  disclosureBtn().click();
  assert.equal(regionEl().hidden, false);
  await check('completed (reasoning expanded)');
});
