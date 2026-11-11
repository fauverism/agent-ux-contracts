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

test('no-silent-destruction: every earlier variant stays reachable through the Previous control', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2', 'v3'])} />,
  );
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.match(position(container).textContent!, /Variant 3 of 3/);
  assert.equal(output(container).textContent, 'v3');

  fireEvent.click(prevBtn(container));
  assert.equal(output(container).textContent, 'v2');
  fireEvent.click(prevBtn(container));
  assert.equal(output(container).textContent, 'v1', 'the original output is intact');
  fireEvent.click(nextBtn(container));
  fireEvent.click(nextBtn(container));
  assert.equal(output(container).textContent, 'v3', 'and navigating did not drop anything');
});

test('no-silent-destruction: a failed regeneration leaves the displayed variant and history intact', async () => {
  let attempt = 0;
  const onGenerate = async () => {
    attempt += 1;
    if (attempt === 2) throw new Error('generation failed');
    return `v${attempt + 1}`;
  };
  const { container } = render(<GenerationControl initialOutput="v1" onGenerate={onGenerate} />);
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  await act(async () => { fireEvent.click(regenerateBtn(container)); }); // fails

  assert.equal(output(container).textContent, 'v2', 'still showing the variant from before the failure');
  assert.match(position(container).textContent!, /Variant 2 of 2/, 'no phantom variant added');
  assert.match(liveRegion(container).textContent!, /failed/i, 'failure is announced');
  fireEvent.click(prevBtn(container));
  assert.equal(output(container).textContent, 'v1', 'history survives the failure');
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

test('controls-keyboard-operable: regenerate, previous, next, and refine are native, named, focusable controls', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={makeGenerator(['v2', 'v3'])} withRefine />,
  );
  // Three variants, showing the middle one, so both navigation buttons are enabled.
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  fireEvent.click(prevBtn(container));
  assert.match(position(container).textContent!, /Variant 2 of 3/);

  const refine = container.querySelector<HTMLInputElement>('.generation-control__refine')!;
  const buttons = [regenerateBtn(container), prevBtn(container), nextBtn(container)];
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
    regenerateBtn(container).textContent!.trim(),
    prevBtn(container).getAttribute('aria-label')!,
    nextBtn(container).getAttribute('aria-label')!,
    refine.getAttribute('aria-label')!,
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

test('controls-keyboard-operable: the regenerate control stays focusable while a generation is in flight', async () => {
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={() => new Promise<string>(() => {})} />,
  );
  const btn = regenerateBtn(container);
  btn.focus();
  await act(async () => { fireEvent.click(btn); });
  assert.equal(btn.getAttribute('aria-disabled'), 'true');
  assert.equal(btn.disabled, false, 'aria-disabled, not native disabled: focus is not dropped');
  assert.ok(document.activeElement === btn, 'focus stays on the control');
  assert.ok(btn.textContent!.trim().length > 0, 'still named while busy');
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

const stateOf = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.generation-control')!.dataset.state;
const expectNoViolations = async (container: HTMLElement, label: string) => {
  const result = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(result.violations.map((v) => v.id), [], `${label}: axe violations`);
};

test('axe: no WCAG A/AA violations in generated state', async () => {
  const { container } = render(
    <GenerationControl initialOutput="Hello world" onGenerate={makeGenerator(['v2'])} />,
  );
  await expectNoViolations(container, 'generated');
});

test('axe: no WCAG A/AA violations while regenerating, after a failure, and with several variants', async () => {
  let release!: (value: string) => void;
  let fail = false;
  const onGenerate = () => {
    if (fail) return Promise.reject(new Error('generation failed'));
    return new Promise<string>((resolve) => { release = resolve; });
  };
  const { container } = render(
    <GenerationControl initialOutput="v1" onGenerate={onGenerate} withRefine />,
  );

  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.equal(stateOf(container), 'regenerating');
  await expectNoViolations(container, 'regenerating');

  await act(async () => { release('v2'); });
  assert.match(position(container).textContent!, /Variant 2 of 2/);
  await expectNoViolations(container, 'generated (two variants, at the last)');

  fireEvent.click(prevBtn(container));
  await expectNoViolations(container, 'generated (two variants, at the first)');

  // failed: the contract state maps to "generated + failure announcement".
  fail = true;
  await act(async () => { fireEvent.click(regenerateBtn(container)); });
  assert.match(liveRegion(container).textContent!, /failed/i);
  await expectNoViolations(container, 'failed');
});
