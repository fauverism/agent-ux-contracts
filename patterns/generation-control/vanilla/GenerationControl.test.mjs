import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { GenerationControl } from './GenerationControl.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options = {}) => {
  const gc = new GenerationControl({
    initialOutput: 'v1',
    onGenerate: async () => 'v2',
    ...options,
  });
  gc.mount(host);
  return gc;
};

const outputEl = () => host.querySelector('.generation-control__output');
const positionEl = () => host.querySelector('.generation-control__position');
const statusEl = () => host.querySelector('[role="status"]');
const regenerateBtn = () => host.querySelector('.generation-control__regenerate');
const prevBtn = () => host.querySelector('[aria-label="Previous variant"]');
const nextBtn = () => host.querySelector('[aria-label="Next variant"]');
const stateOf = () => host.querySelector('.generation-control').dataset.state;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
/** Clicks "New version" and waits for the generation to settle. */
const regenerateViaButton = async () => {
  regenerateBtn().click();
  await tick();
};

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};
const expectNoViolations = async (label) => {
  const result = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};
/** Returns v2, v3, … on successive calls. */
const counter = () => {
  let n = 1;
  return async () => `v${(n += 1)}`;
};

test('no-silent-destruction: regenerate appends a new variant, does not replace v1', async () => {
  const gc = mounted();
  await gc.regenerate();
  assert.equal(gc.variants.length, 2, 'two variants exist');
  gc.show(0);
  assert.match(outputEl().textContent, /v1/, 'v1 still accessible');
});

test('no-silent-destruction: every earlier variant stays reachable through the Previous control', async () => {
  mounted({ onGenerate: counter() });
  await regenerateViaButton();
  await regenerateViaButton();
  assert.match(positionEl().textContent, /Variant 3 of 3/);
  assert.equal(outputEl().textContent, 'v3');

  prevBtn().click();
  assert.equal(outputEl().textContent, 'v2');
  prevBtn().click();
  assert.equal(outputEl().textContent, 'v1', 'the original output is intact');
  nextBtn().click();
  nextBtn().click();
  assert.equal(outputEl().textContent, 'v3', 'and navigating did not drop anything');
});

test('no-silent-destruction: a failed regeneration leaves the displayed variant and history intact', async () => {
  let attempt = 0;
  mounted({
    onGenerate: async () => {
      attempt += 1;
      if (attempt === 2) throw new Error('generation failed');
      return `v${attempt + 1}`;
    },
  });
  await regenerateViaButton();
  await regenerateViaButton(); // fails

  assert.equal(outputEl().textContent, 'v2', 'still showing the variant from before the failure');
  assert.match(positionEl().textContent, /Variant 2 of 2/, 'no phantom variant added');
  assert.match(statusEl().textContent, /failed/i, 'failure is announced');
  prevBtn().click();
  assert.equal(outputEl().textContent, 'v1', 'history survives the failure');
});

test('variant-position-visible: position label present on mount', () => {
  mounted();
  assert.match(positionEl().textContent, /Variant 1 of 1/);
});

test('variant-position-visible: position label updates after regeneration', async () => {
  const gc = mounted();
  await gc.regenerate();
  assert.match(positionEl().textContent, /Variant 2 of 2/);
});

test('variant-position-visible: position label updates on show()', async () => {
  const gc = mounted();
  await gc.regenerate();
  gc.show(0);
  assert.match(positionEl().textContent, /Variant 1 of 2/);
});

test('single-flight-regeneration: concurrent calls produce only one new variant', async () => {
  let calls = 0;
  let resolve;
  const slowGen = () => {
    calls += 1;
    return new Promise((res) => { resolve = res; });
  };
  const gc = mounted({ onGenerate: slowGen });
  gc.regenerate(); // first call — starts flight
  gc.regenerate(); // second call — no-op
  assert.equal(calls, 1, 'second call ignored while busy');
  resolve('v2');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(gc.variants.length, 2, 'only one variant added');
});

test('single-flight-regeneration: repeat clicks on the button while generating produce one request', async () => {
  let calls = 0;
  let resolve;
  const gc = mounted({
    onGenerate: () => {
      calls += 1;
      return new Promise((res) => { resolve = res; });
    },
  });
  regenerateBtn().click();
  regenerateBtn().click();
  regenerateBtn().click();
  assert.equal(calls, 1, 'repeat activations ignored while busy');
  resolve('v2');
  await tick();
  assert.equal(gc.variants.length, 2, 'only one variant added');
  assert.match(positionEl().textContent, /Variant 2 of 2/);
});

test('single-flight-regeneration: button has aria-disabled and aria-busy while generating', async () => {
  let resolve;
  const slowGen = () => new Promise((res) => { resolve = res; });
  const gc = mounted({ onGenerate: slowGen });
  gc.regenerate();
  assert.equal(regenerateBtn().getAttribute('aria-disabled'), 'true');
  assert.equal(regenerateBtn().getAttribute('aria-busy'), 'true');
  assert.equal(host.querySelector('.generation-control').dataset.state, 'regenerating');
  resolve('v2');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(regenerateBtn().getAttribute('aria-disabled'), null, 'aria-disabled cleared');
});

test('controls-keyboard-operable: regenerate, previous, next, and refine are native, named, focusable controls', async () => {
  mounted({ onGenerate: counter(), withRefine: true });
  // Three variants, showing the middle one, so both navigation buttons are enabled.
  await regenerateViaButton();
  await regenerateViaButton();
  prevBtn().click();
  assert.match(positionEl().textContent, /Variant 2 of 3/);

  const refine = host.querySelector('.generation-control__refine');
  const buttons = [regenerateBtn(), prevBtn(), nextBtn()];
  for (const btn of buttons) {
    // Native <button type="button">: Enter/Space activation and Tab reach
    // come from the platform, not from handlers that could be removed.
    assert.equal(btn.tagName, 'BUTTON');
    assert.equal(btn.type, 'button');
    assert.equal(btn.disabled, false);
  }
  assert.equal(refine.tagName, 'INPUT');
  assert.equal(refine.disabled, false);
  assert.equal(refine.readOnly, false);

  const names = [
    regenerateBtn().textContent.trim(),
    prevBtn().getAttribute('aria-label'),
    nextBtn().getAttribute('aria-label'),
    refine.getAttribute('aria-label'),
  ];
  assert.ok(names.every((name) => name && name.length > 0), 'every control has an accessible name');
  assert.equal(new Set(names).size, names.length, 'and the names tell the controls apart');

  for (const control of [...buttons, refine]) {
    assert.ok(control.tabIndex >= 0, 'in the tab order');
    assert.ok(!control.closest('[hidden]') && !control.closest('[aria-hidden="true"]'));
    control.focus();
    assert.ok(document.activeElement === control, 'focusable');
  }
});

test('controls-keyboard-operable: the regenerate control stays focusable while a generation is in flight', () => {
  mounted({ onGenerate: () => new Promise(() => {}) });
  const btn = regenerateBtn();
  btn.focus();
  btn.click();
  assert.equal(btn.getAttribute('aria-disabled'), 'true');
  assert.equal(btn.disabled, false, 'aria-disabled, not native disabled: focus is not dropped');
  assert.ok(document.activeElement === btn, 'focus stays on the control');
  assert.ok(btn.textContent.trim().length > 0, 'still named while busy');
});

test('controls-keyboard-operable: nav buttons are native <button> elements', () => {
  mounted();
  assert.equal(prevBtn().tagName, 'BUTTON');
  assert.equal(nextBtn().tagName, 'BUTTON');
});

test('controls-keyboard-operable: prev disabled at first variant, next disabled at last', async () => {
  const gc = mounted();
  assert.equal(prevBtn().disabled, true, 'prev disabled at v1');
  await gc.regenerate();
  // Now at v2 (last)
  assert.equal(nextBtn().disabled, true, 'next disabled at last');
  assert.equal(prevBtn().disabled, false, 'prev enabled');
  gc.show(0);
  assert.equal(prevBtn().disabled, true, 'prev disabled again at first');
  assert.equal(nextBtn().disabled, false, 'next enabled');
});

test('variant-change-announced: status region announces on show()', async () => {
  const gc = mounted();
  await gc.regenerate();
  gc.show(0);
  const live = statusEl();
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.match(live.textContent, /variant 1 of 2/i);
});

test('variant-change-announced: status region announces when generation completes', async () => {
  const gc = mounted();
  await gc.regenerate();
  assert.match(statusEl().textContent, /Variant 2 of 2 ready/);
});

test('failed regeneration: existing variant remains intact', async () => {
  const gc = mounted({
    onGenerate: async () => { throw new Error('generation failed'); },
  });
  await gc.regenerate();
  assert.equal(gc.variants.length, 1, 'no new variant on failure');
  assert.match(outputEl().textContent, /v1/, 'v1 still displayed');
  assert.match(statusEl().textContent, /failed/i, 'failure announced');
});

test('axe: no WCAG A/AA violations when generated, regenerating, after a failure, and with several variants', async () => {
  let release;
  let fail = false;
  mounted({
    withRefine: true,
    onGenerate: () => {
      if (fail) return Promise.reject(new Error('generation failed'));
      return new Promise((resolve) => { release = resolve; });
    },
  });
  assert.equal(stateOf(), 'generated');
  await expectNoViolations('generated');

  regenerateBtn().click();
  assert.equal(stateOf(), 'regenerating');
  await expectNoViolations('regenerating');

  release('v2');
  await tick();
  assert.match(positionEl().textContent, /Variant 2 of 2/);
  await expectNoViolations('generated (two variants, at the last)');

  prevBtn().click();
  await expectNoViolations('generated (two variants, at the first)');

  // failed: the contract state maps to "generated + failure announcement".
  fail = true;
  await regenerateViaButton();
  assert.match(statusEl().textContent, /failed/i);
  await expectNoViolations('failed');
});
