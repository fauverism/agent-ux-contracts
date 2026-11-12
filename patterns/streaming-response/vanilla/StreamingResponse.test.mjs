import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { StreamingResponse } from './StreamingResponse.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options) => {
  const sr = new StreamingResponse(options);
  sr.mount(host);
  return sr;
};

const stopBtn = () => host.querySelector('.streaming-response__stop');
const liveRegion = () => host.querySelector('[role="status"]');
const contentEl = () => host.querySelector('.streaming-response__content');

const noticeEl = () => host.querySelector('.streaming-response__notice');
const alertEl = () => host.querySelector('[role="alert"]');

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  // jsdom has no layout engine, so contrast cannot be evaluated here.
  rules: { 'color-contrast': { enabled: false } },
};

/** Runs `body` with a focused control that lives outside the component. */
const withOutsideFocus = (body) => {
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  try {
    body(outside);
  } finally {
    outside.remove();
  }
};

test('no-focus-steal: focus outside the component never moves at start, append, completion, or failure', () => {
  withOutsideFocus((outside) => {
    const sr = mounted();
    sr.startStream();
    assert.ok(document.activeElement === outside, 'unchanged at start');
    sr.appendContent('Hello');
    assert.ok(document.activeElement === outside, 'unchanged during append');
    sr.completeStream();
    assert.equal(sr.getState(), 'completed');
    assert.ok(document.activeElement === outside, 'unchanged at completion');

    sr.startStream();
    sr.failStream('boom');
    assert.equal(sr.getState(), 'errored');
    assert.ok(document.activeElement === outside, 'unchanged at failure');
  });
});

test('no-focus-steal: focus outside the component never moves at interruption', () => {
  withOutsideFocus((outside) => {
    const sr = mounted();
    sr.startStream();
    // A pointer click that does not focus the button (as in Safari).
    stopBtn().click();
    assert.equal(sr.getState(), 'interrupted');
    assert.ok(document.activeElement === outside, 'unchanged after a stop click');

    sr.startStream();
    sr.stop();
    assert.equal(sr.getState(), 'interrupted');
    assert.ok(document.activeElement === outside, 'unchanged after a programmatic stop');
  });
});

test('focus-not-lost: settling while the stop control has focus moves focus to the output region', () => {
  const sr = mounted();
  const settles = [
    ['completion', () => sr.completeStream()],
    ['failure', () => sr.failStream('boom')],
    ['stop click', () => stopBtn().click()],
    ['Escape', () => stopBtn().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))],
  ];
  for (const [name, settle] of settles) {
    sr.startStream();
    stopBtn().focus();
    assert.ok(document.activeElement === stopBtn(), `${name}: stop control focused first`);

    settle();

    assert.equal(stopBtn().hidden, true, `${name}: stop control hidden`);
    assert.ok(document.activeElement === sr.output, `${name}: focus is on the output region`);
    assert.ok(document.activeElement !== document.body, `${name}: focus not dropped on body`);
  }
});

test('completion-announced: polite live region announces completion, including after a restart', () => {
  const sr = mounted();
  assert.equal(liveRegion().getAttribute('aria-live'), 'polite');

  sr.startStream();
  assert.equal(liveRegion().textContent, '', 'silent while streaming');
  sr.completeStream();
  assert.equal(liveRegion().textContent, 'Response complete.');

  sr.startStream();
  assert.equal(liveRegion().textContent, '', 'reset on restart');
  sr.completeStream();
  assert.equal(liveRegion().textContent, 'Response complete.');
});

test('interruptible: stop is visible only while streaming and invokes onStop exactly once', () => {
  let stops = 0;
  const sr = mounted({ onStop: () => (stops += 1) });
  assert.equal(stopBtn().hidden, true, 'hidden while idle');

  sr.startStream();
  assert.equal(stopBtn().hidden, false, 'visible while streaming');

  // The control itself: a native, enabled, named button.
  assert.equal(stopBtn().tagName, 'BUTTON');
  assert.equal(stopBtn().disabled, false);
  assert.equal(stopBtn().getAttribute('aria-label'), 'Stop generation');
  assert.ok(!stopBtn().closest('[aria-hidden="true"]'));

  stopBtn().click();
  assert.equal(stops, 1);
  assert.equal(sr.getState(), 'interrupted');
  assert.equal(liveRegion().textContent, 'Generation stopped.');
  assert.equal(stopBtn().hidden, true, 'hidden again once stopped');
  assert.equal(noticeEl().hidden, false, 'interrupted notice shown');

  // Double activation and a late host settle must not re-fire or re-settle.
  sr.stop();
  sr.completeStream();
  assert.equal(stops, 1);
  assert.equal(sr.getState(), 'interrupted');
});

test('interruptible: the stop control is present while streaming even when the host passes no onStop', () => {
  const sr = mounted();
  sr.startStream();
  assert.equal(stopBtn().hidden, false, 'a visible control exists; Escape alone is not a control');
  stopBtn().click();
  assert.equal(sr.getState(), 'interrupted', 'and it stops the stream');
});

test('interruptible: a user stop is not overwritten by late host signals', () => {
  let stops = 0;
  const sr = mounted({ onStop: () => (stops += 1) });
  sr.startStream();
  sr.appendContent('partial');
  stopBtn().click();

  // The host has not acknowledged the stop: more content, then a failure.
  sr.appendContent(' and more');
  assert.equal(sr.getState(), 'interrupted', 'does not re-enter streaming');
  assert.equal(sr.getContent(), 'partial', 'late chunks are not appended');
  sr.failStream('late');
  assert.equal(sr.getState(), 'interrupted', 'a late failure does not overwrite the stop');
  assert.equal(alertEl().hidden, true);
  assert.equal(stopBtn().hidden, true);
  assert.equal(stops, 1);
});

test('interruptible: the stop control is hidden after completion and after failure', () => {
  const sr = mounted();
  sr.startStream();
  sr.completeStream();
  assert.equal(stopBtn().hidden, true, 'hidden after completion');

  sr.startStream();
  assert.equal(stopBtn().hidden, false, 'back for the next stream');
  sr.failStream('boom');
  assert.equal(stopBtn().hidden, true, 'hidden after failure');
});

test('interruptible: Escape stops the stream while focus is inside the component', () => {
  let stops = 0;
  const sr = mounted({ onStop: () => (stops += 1) });
  sr.startStream();
  stopBtn().focus();
  stopBtn().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );

  assert.equal(stops, 1);
  assert.equal(sr.getState(), 'interrupted');
});

const assertContentVisible = (expected, label) => {
  assert.equal(contentEl().textContent, expected, `${label}: text kept`);
  assert.ok(!contentEl().closest('[hidden]'), `${label}: no hidden ancestor`);
  assert.ok(!contentEl().closest('[aria-hidden="true"]'), `${label}: no aria-hidden ancestor`);
  assert.notEqual(contentEl().style.display, 'none', `${label}: not display:none`);
};

test('partial-preserved: partial output stays rendered and unobscured after interruption', () => {
  const sr = mounted();
  sr.startStream();
  sr.appendContent('Hello, wo');
  sr.stop();
  assert.equal(sr.getState(), 'interrupted');
  assertContentVisible('Hello, wo', 'interrupted');
});

test('partial-preserved: partial output stays rendered and unobscured alongside the error after failure', () => {
  const sr = mounted();
  sr.startStream();
  sr.appendContent('Take two');
  sr.failStream('Rate limited');
  assert.equal(sr.getState(), 'errored');
  assertContentVisible('Take two', 'errored');
  assert.equal(alertEl().hidden, false);
  assert.match(alertEl().textContent, /Rate limited/);
});

test('appendContent is ignored once the stream has settled', () => {
  const sr = mounted();
  sr.startStream();
  sr.appendContent('kept');
  sr.completeStream();
  sr.appendContent(' dropped');
  assert.equal(sr.getContent(), 'kept');
  assert.equal(contentEl().textContent, 'kept');
});

test('zero-token completion announces with empty content', () => {
  const sr = mounted();
  sr.startStream();
  sr.completeStream();
  assert.equal(contentEl().textContent, '');
  assert.equal(liveRegion().textContent, 'Response complete.');
});

test('two instances do not collide on live region ids', () => {
  const otherHost = document.createElement('div');
  document.body.append(otherHost);
  try {
    const a = new StreamingResponse();
    a.mount(host);
    const b = new StreamingResponse();
    b.mount(otherHost);
    assert.notEqual(a.liveRegion.id, b.liveRegion.id);
  } finally {
    otherHost.remove();
  }
});

test('destroy removes the component and its listeners without throwing', () => {
  const sr = mounted();
  sr.startStream();
  assert.doesNotThrow(() => sr.destroy());
  assert.equal(host.querySelector('.streaming-response'), null);
});

test('axe: no WCAG A/AA violations in idle, streaming, completed, interrupted, and errored states', async () => {
  const sr = mounted();
  const steps = [
    ['idle', () => {}],
    ['streaming', () => { sr.startStream(); sr.appendContent('Streaming text'); }],
    ['completed', () => sr.completeStream()],
    ['interrupted', () => { sr.startStream(); sr.appendContent('Partial'); sr.stop(); }],
    ['errored', () => { sr.startStream(); sr.appendContent('Partial'); sr.failStream('boom'); }],
  ];
  for (const [state, enter] of steps) {
    enter();
    assert.equal(sr.getState(), state);
    const result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${state}: axe violations`);
  }
});
