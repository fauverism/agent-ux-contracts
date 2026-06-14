import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { StreamingResponse } from './StreamingResponse';

afterEach(() => cleanup());

const output = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.streaming-response__output')!;
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const stopButton = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.streaming-response__stop');
const notice = (c: HTMLElement) => c.querySelector('.streaming-response__notice');
const contentEl = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.streaming-response__content');

test('no-focus-steal: focus outside the component never moves across the lifecycle', () => {
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  try {
    const { rerender } = render(
      <StreamingResponse isStreaming content="" onStop={() => {}} />,
    );
    assert.equal(document.activeElement, outside, 'unchanged at start');

    rerender(<StreamingResponse isStreaming content="Hello, wor" onStop={() => {}} />);
    assert.equal(document.activeElement, outside, 'unchanged during append');

    rerender(
      <StreamingResponse isStreaming={false} content="Hello, world." onStop={() => {}} />,
    );
    assert.equal(document.activeElement, outside, 'unchanged at completion');

    rerender(
      <StreamingResponse
        isStreaming={false}
        content="Hello, world."
        error="boom"
        onStop={() => {}}
      />,
    );
    assert.equal(document.activeElement, outside, 'unchanged at failure');
  } finally {
    outside.remove();
  }
});

test('focus-not-lost: settling while the stop control has focus moves focus to the output region', () => {
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  stopButton(container)!.focus();
  assert.equal(document.activeElement, stopButton(container));

  rerender(<StreamingResponse isStreaming={false} content="partial" onStop={() => {}} />);

  assert.equal(stopButton(container), null, 'stop control removed after settle');
  assert.equal(document.activeElement, output(container), 'focus is on the output region');
  assert.notEqual(document.activeElement, document.body, 'focus is not dropped on body');
});

test('completion-announced: polite live region announces completion, including after a restart', () => {
  const { container, rerender } = render(<StreamingResponse isStreaming content="Hi" />);
  const region = liveRegion(container);
  assert.equal(region.getAttribute('aria-live'), 'polite');
  assert.equal(region.textContent, '', 'silent while streaming');

  rerender(<StreamingResponse isStreaming={false} content="Hi" />);
  assert.equal(region.textContent, 'Response complete.');

  // Restart and complete a second time: the text must change away and back so
  // assistive technology re-announces it.
  rerender(<StreamingResponse isStreaming content="Hi again" />);
  assert.equal(liveRegion(container).textContent, '', 'reset on restart');
  rerender(<StreamingResponse isStreaming={false} content="Hi again" />);
  assert.equal(liveRegion(container).textContent, 'Response complete.');
});

test('interruptible: stop control renders only while streaming and invokes onStop exactly once', () => {
  let stops = 0;
  const { container, rerender } = render(
    <StreamingResponse isStreaming={false} content="" onStop={() => (stops += 1)} />,
  );
  assert.equal(stopButton(container), null, 'absent while idle');

  rerender(<StreamingResponse isStreaming content="partial" onStop={() => (stops += 1)} />);
  assert.ok(stopButton(container), 'present while streaming');

  fireEvent.click(stopButton(container)!);
  assert.equal(stops, 1);
  assert.equal(stopButton(container), null, 'removed after stopping');
  assert.ok(notice(container), 'interrupted notice shown');
  assert.equal(liveRegion(container).textContent, 'Generation stopped.');
});

test('interruptible: stop settles to interrupted even while the host still reports an active stream', () => {
  let stops = 0;
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => (stops += 1)} />,
  );
  fireEvent.click(stopButton(container)!);

  // The host has not yet acknowledged the stop: isStreaming is still true.
  assert.ok(notice(container), 'stays interrupted, does not re-enter streaming');
  assert.equal(stopButton(container), null);

  // When the host finally settles, the interruption is not overwritten.
  rerender(
    <StreamingResponse isStreaming={false} content="partial" onStop={() => (stops += 1)} />,
  );
  assert.ok(notice(container), 'still interrupted after host settles');
  assert.equal(liveRegion(container).textContent, 'Generation stopped.');
  assert.equal(stops, 1);
});

test('interruptible: Escape stops the stream while focus is inside the component', () => {
  let stops = 0;
  const { container } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => (stops += 1)} />,
  );
  const stop = stopButton(container)!;
  stop.focus();
  fireEvent.keyDown(stop, { key: 'Escape' });

  assert.equal(stops, 1);
  assert.ok(notice(container), 'interrupted after Escape');
});

test('partial-preserved: partial output stays rendered and unobscured after interruption', () => {
  const { container } = render(
    <StreamingResponse isStreaming content="Hello, wo" onStop={() => {}} />,
  );
  fireEvent.click(stopButton(container)!);

  const partial = contentEl(container);
  assert.ok(partial, 'content still rendered');
  assert.equal(partial!.textContent, 'Hello, wo');
  assert.equal(partial!.closest('[hidden]'), null, 'no hidden ancestor');
  assert.equal(partial!.closest('[aria-hidden="true"]'), null, 'no aria-hidden ancestor');
});

test('partial-preserved: partial output stays rendered alongside the error after failure', () => {
  const { container, rerender } = render(<StreamingResponse isStreaming content="Hello" />);
  rerender(<StreamingResponse isStreaming={false} content="Hello" error="Rate limited" />);

  assert.equal(contentEl(container)!.textContent, 'Hello');
  const alert = container.querySelector('[role="alert"]');
  assert.ok(alert, 'failure surfaced as an alert');
  assert.match(alert!.textContent!, /Rate limited/);
  assert.equal(liveRegion(container).textContent, '', 'no double announcement');
});

test('zero-token completion announces without rendering an empty content node', () => {
  const { container, rerender } = render(<StreamingResponse isStreaming content="" />);
  rerender(<StreamingResponse isStreaming={false} content="" />);

  assert.equal(contentEl(container), null);
  assert.equal(liveRegion(container).textContent, 'Response complete.');
});

test('restart: a second stream can begin from any settled state', () => {
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="one" onStop={() => {}} />,
  );
  rerender(<StreamingResponse isStreaming={false} content="one" onStop={() => {}} />);
  assert.equal(output(container).dataset.state, 'completed');

  rerender(<StreamingResponse isStreaming content="" onStop={() => {}} />);
  assert.equal(output(container).dataset.state, 'streaming');
  assert.ok(stopButton(container), 'stop control available on the second stream');
});

test('unmount mid-stream does not throw', () => {
  const { unmount } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  assert.doesNotThrow(() => unmount());
});

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  // jsdom has no layout engine; contrast is checked in the browser-based e2e pass.
  rules: { 'color-contrast': { enabled: false } },
};

test('axe: no WCAG A/AA violations while streaming or settled', async () => {
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="Streaming text" onStop={() => {}} />,
  );
  const streaming = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(
    streaming.violations,
    [],
    streaming.violations.map((v) => v.id).join(', '),
  );

  rerender(
    <StreamingResponse isStreaming={false} content="Done." onStop={() => {}} />,
  );
  const settled = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(settled.violations, [], settled.violations.map((v) => v.id).join(', '));
});
