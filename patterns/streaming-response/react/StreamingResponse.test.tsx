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

const stateOf = (c: HTMLElement) => output(c).dataset.state;

/** Runs `body` with a focused control that lives outside the component. */
const withOutsideFocus = (body: (outside: HTMLButtonElement) => void) => {
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  try {
    body(outside);
  } finally {
    outside.remove();
  }
};

test('no-focus-steal: focus outside the component never moves at start, append, or completion', () => {
  withOutsideFocus((outside) => {
    const { container, rerender } = render(
      <StreamingResponse isStreaming content="" onStop={() => {}} />,
    );
    assert.equal(stateOf(container), 'streaming');
    assert.ok(document.activeElement === outside, 'unchanged at start');

    rerender(<StreamingResponse isStreaming content="Hello, wor" onStop={() => {}} />);
    assert.ok(document.activeElement === outside, 'unchanged during append');

    rerender(
      <StreamingResponse isStreaming={false} content="Hello, world." onStop={() => {}} />,
    );
    assert.equal(stateOf(container), 'completed');
    assert.ok(document.activeElement === outside, 'unchanged at completion');
  });
});

test('no-focus-steal: focus outside the component never moves at failure', () => {
  withOutsideFocus((outside) => {
    const { container, rerender } = render(
      <StreamingResponse isStreaming content="Hello" onStop={() => {}} />,
    );
    rerender(
      <StreamingResponse isStreaming={false} content="Hello" error="boom" onStop={() => {}} />,
    );
    assert.equal(stateOf(container), 'errored', 'the failure transition actually happened');
    assert.ok(document.activeElement === outside, 'unchanged at failure');
  });
});

test('no-focus-steal: focus outside the component never moves at interruption', () => {
  withOutsideFocus((outside) => {
    const { container } = render(
      <StreamingResponse isStreaming content="Hello" onStop={() => {}} />,
    );
    // A pointer click that does not focus the button (as in Safari).
    fireEvent.click(stopButton(container)!);
    assert.equal(stateOf(container), 'interrupted');
    assert.ok(document.activeElement === outside, 'unchanged at interruption');
  });
});

test('focus-not-lost: settling while the stop control has focus moves focus to the output region', () => {
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  stopButton(container)!.focus();
  assert.ok(document.activeElement === stopButton(container));

  rerender(<StreamingResponse isStreaming={false} content="partial" onStop={() => {}} />);

  assert.equal(stopButton(container), null, 'stop control removed after settle');
  assert.ok(document.activeElement === output(container), 'focus is on the output region');
  assert.ok(document.activeElement !== document.body, 'focus is not dropped on body');
});

test('focus-not-lost: activating the focused stop control moves focus to the output region', () => {
  const { container } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  stopButton(container)!.focus();
  fireEvent.click(stopButton(container)!);

  assert.equal(stateOf(container), 'interrupted');
  assert.equal(stopButton(container), null, 'stop control removed');
  assert.ok(document.activeElement === output(container), 'focus is on the output region');
});

test('focus-not-lost: Escape on the focused stop control moves focus to the output region', () => {
  const { container } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  stopButton(container)!.focus();
  fireEvent.keyDown(stopButton(container)!, { key: 'Escape' });

  assert.equal(stateOf(container), 'interrupted');
  assert.equal(stopButton(container), null, 'stop control removed');
  assert.ok(document.activeElement === output(container), 'focus is on the output region');
});

test('focus-not-lost: a failure while the stop control has focus moves focus to the output region', () => {
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="partial" onStop={() => {}} />,
  );
  stopButton(container)!.focus();
  rerender(
    <StreamingResponse isStreaming={false} content="partial" error="boom" onStop={() => {}} />,
  );

  assert.equal(stateOf(container), 'errored');
  assert.equal(stopButton(container), null, 'stop control removed');
  assert.ok(document.activeElement === output(container), 'focus is on the output region');
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

test('interruptible: the stop control is present while streaming even when the host passes no onStop', () => {
  const { container } = render(<StreamingResponse isStreaming content="partial" />);
  const stop = stopButton(container);
  assert.ok(stop, 'a visible control exists; Escape alone is not a control');
  assert.equal(stop!.tagName, 'BUTTON');
  assert.equal(stop!.disabled, false);
  assert.ok(!stop!.closest('[hidden]') && !stop!.closest('[aria-hidden="true"]'));
  assert.equal(stop!.getAttribute('aria-label'), 'Stop generation');

  fireEvent.click(stop!);
  assert.equal(stateOf(container), 'interrupted', 'and it stops the stream');
});

test('interruptible: a user stop is not overwritten while the host keeps streaming', () => {
  let stops = 0;
  const onStop = () => (stops += 1);
  const { container, rerender } = render(
    <StreamingResponse isStreaming content="partial" onStop={onStop} />,
  );
  fireEvent.click(stopButton(container)!);

  // The host has not acknowledged the stop: it re-renders, still streaming,
  // with more content.
  rerender(<StreamingResponse isStreaming content="partial and more" onStop={onStop} />);
  assert.equal(stateOf(container), 'interrupted', 'does not re-enter streaming');
  assert.equal(stopButton(container), null);
  assert.ok(notice(container));

  // A late failure from the host does not overwrite the interruption either.
  rerender(
    <StreamingResponse isStreaming={false} content="partial and more" error="late" onStop={onStop} />,
  );
  assert.equal(stateOf(container), 'interrupted');
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(stops, 1);
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
  assert.ok(!partial!.closest('[hidden]'), 'no hidden ancestor');
  assert.ok(!partial!.closest('[aria-hidden="true"]'), 'no aria-hidden ancestor');
  assert.notEqual(partial!.style.display, 'none');
});

test('partial-preserved: partial output stays rendered alongside the error after failure', () => {
  const { container, rerender } = render(<StreamingResponse isStreaming content="Hello" />);
  rerender(<StreamingResponse isStreaming={false} content="Hello" error="Rate limited" />);

  assert.equal(stateOf(container), 'errored');
  const partial = contentEl(container);
  assert.ok(partial, 'content still rendered');
  assert.equal(partial!.textContent, 'Hello');
  assert.ok(!partial!.closest('[hidden]'), 'no hidden ancestor');
  assert.ok(!partial!.closest('[aria-hidden="true"]'), 'no aria-hidden ancestor');
  assert.notEqual(partial!.style.display, 'none');
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
  // jsdom has no layout engine, so contrast cannot be evaluated here.
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

test('axe: no WCAG A/AA violations in idle, interrupted, and errored states', async () => {
  const check = async (container: HTMLElement, state: string) => {
    assert.equal(stateOf(container), state);
    const result = await axe.run(container, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${state}: axe violations`);
  };

  const idle = render(<StreamingResponse isStreaming={false} content="" onStop={() => {}} />);
  await check(idle.container, 'idle');
  idle.unmount();

  const interrupted = render(
    <StreamingResponse isStreaming content="Partial text" onStop={() => {}} />,
  );
  fireEvent.click(stopButton(interrupted.container)!);
  await check(interrupted.container, 'interrupted');
  interrupted.unmount();

  const errored = render(
    <StreamingResponse isStreaming content="Partial text" onStop={() => {}} />,
  );
  errored.rerender(
    <StreamingResponse isStreaming={false} content="Partial text" error="boom" onStop={() => {}} />,
  );
  await check(errored.container, 'errored');
});
