import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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

test('no-silent-destruction: regenerate appends a new variant, does not replace v1', async () => {
  const gc = mounted();
  await gc.regenerate();
  assert.equal(gc.variants.length, 2, 'two variants exist');
  gc.show(0);
  assert.match(outputEl().textContent, /v1/, 'v1 still accessible');
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
