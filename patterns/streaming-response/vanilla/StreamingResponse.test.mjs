import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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

test('no-focus-steal: focus outside the component never moves across the lifecycle', () => {
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  try {
    const sr = mounted();
    sr.startStream();
    sr.appendContent('Hello');
    assert.equal(document.activeElement, outside, 'unchanged during streaming');
    sr.completeStream();
    assert.equal(document.activeElement, outside, 'unchanged at completion');

    sr.startStream();
    sr.failStream('boom');
    assert.equal(document.activeElement, outside, 'unchanged at failure');
  } finally {
    outside.remove();
  }
});

test('focus-not-lost: settling while the stop control has focus moves focus to the output region', () => {
  const sr = mounted();
  sr.startStream();
  stopBtn().focus();

  sr.completeStream();

  assert.equal(document.activeElement, sr.output, 'focus is on the output region');
  assert.notEqual(document.activeElement, document.body);
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

  stopBtn().click();
  assert.equal(stops, 1);
  assert.equal(sr.getState(), 'interrupted');
  assert.equal(liveRegion().textContent, 'Generation stopped.');

  // Double activation and a late host settle must not re-fire or re-settle.
  sr.stop();
  sr.completeStream();
  assert.equal(stops, 1);
  assert.equal(sr.getState(), 'interrupted');
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

test('partial-preserved: partial output stays rendered after interruption and failure', () => {
  const sr = mounted();
  sr.startStream();
  sr.appendContent('Hello, wo');
  sr.stop();
  assert.equal(contentEl().textContent, 'Hello, wo');
  assert.equal(contentEl().closest('[hidden]'), null);
  assert.equal(contentEl().closest('[aria-hidden="true"]'), null);

  sr.startStream();
  sr.appendContent('Take two');
  sr.failStream('Rate limited');
  assert.equal(contentEl().textContent, 'Take two');
  const alert = host.querySelector('[role="alert"]');
  assert.equal(alert.hidden, false);
  assert.match(alert.textContent, /Rate limited/);
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
