import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import { GenerationControl } from './GenerationControl';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const output = (c: HTMLElement) => c.querySelector('.generation-control__output')!;
const position = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.generation-control__position')!;
const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const regenerateBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('.generation-control__regenerate')!;
const prevBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('[aria-label="Previous variant"]')!;
const nextBtn = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>('[aria-label="Next variant"]')!;

const makeGenerator = (outputs: string[]) => {
  let i = 0;
  return async () => outputs[i++ % outputs.length];
};

test('no-silent-destruction: generating appends to history, does not replace', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2', 'v3'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  // Navigate back — v1 must still exist
  fireEvent.click(prevBtn(container));
  assert.match(output(container).textContent!, /v1/, 'v1 still accessible');
  assert.match(position(container).textContent, /Variant 1 of 2/);
});

test('variant-position-visible: position label renders on mount', () => {
  const { container } = render(
    <GenerationControl initialOutput="hello" onGenerate={makeGenerator(['v2'])} />,
  );
  assert.match(position(container).textContent, /Variant 1 of 1/);
});

test('variant-position-visible: position label updates after regeneration', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.match(position(container).textContent, /Variant 2 of 2/);
});

test('variant-position-visible: position label updates on navigation', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  fireEvent.click(prevBtn(container));
  assert.match(position(container).textContent, /Variant 1 of 2/);
});

test('single-flight-regeneration: concurrent generate calls produce only one new variant', async () => {
  let calls = 0;
  let resolve!: (v: string) => void;
  const slowGen = async () => {
    calls += 1;
    return new Promise<string>((res) => { resolve = res; });
  };

  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={slowGen} />,
  );

  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  // Click again while in-flight
  fireEvent.click(regenerateBtn(container));
  assert.equal(calls, 1, 'second click ignored while generating');

  await act(async () => { resolve('v2'); });
  assert.match(position(container).textContent, /Variant 2 of 2/, 'only one variant added');
});

test('single-flight-regeneration: regenerate button has aria-disabled and aria-busy while generating', async () => {
  let resolve!: (v: string) => void;
  const slowGen = async () => new Promise<string>((res) => { resolve = res; });
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={slowGen} />,
  );

  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.equal(regenerateBtn(container).getAttribute('aria-disabled'), 'true');
  assert.equal(regenerateBtn(container).getAttribute('aria-busy'), 'true');

  await act(async () => { resolve('v2'); });
  assert.equal(regenerateBtn(container).getAttribute('aria-disabled'), 'false');
});

test('controls-keyboard-operable: prev/next buttons are native buttons (keyboard accessible)', () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  assert.equal(prevBtn(container).tagName, 'BUTTON');
  assert.equal(nextBtn(container).tagName, 'BUTTON');
});

test('controls-keyboard-operable: prev disabled at first variant, next disabled at last', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  assert.equal(prevBtn(container).disabled, true, 'prev disabled at v1');
  // only one variant exists — next is also disabled (nothing to go forward to)
  assert.equal(nextBtn(container).disabled, true, 'next disabled with one variant');

  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  // Now at v2 (last of 2)
  assert.equal(nextBtn(container).disabled, true, 'next disabled at last variant');
  assert.equal(prevBtn(container).disabled, false, 'prev enabled when not at first');
});

test('variant-change-announced: live region announces on navigation', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  fireEvent.click(prevBtn(container));

  const live = liveRegion(container);
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.match(live.textContent!, /Showing variant 1 of 2/);
});

test('variant-change-announced: live region announces when generation completes', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.match(liveRegion(container).textContent!, /Variant 2 of 2 ready/);
});

test('axe: no WCAG A/AA violations in generated state', async () => {
  const { container } = render(
    <GenerationControl initialOutput="Hello world" onGenerate={makeGenerator(['v2'])} />,
  );
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations, [], result.violations.map((v) => v.id).join(', '));
});
