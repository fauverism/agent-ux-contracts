import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import {
  RefusalMessaging,
  REFUSAL_ANNOUNCEMENTS,
  type RefusalAlternative,
} from './RefusalMessaging';

afterEach(() => cleanup());

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const liveRegion = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="status"]')!;
const kind = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.refusal-messaging')!.dataset.kind;

const baseProps = {
  statement: "I can't draft the contract itself.",
  reason: 'Drafting binding legal documents needs a licensed attorney.',
  alternatives: [
    { label: 'Explain what each clause means' },
  ] as const satisfies readonly [RefusalAlternative, ...RefusalAlternative[]],
};

test('reason-given: statement and reason both render as visible text', () => {
  const { container } = render(<RefusalMessaging {...baseProps} />);
  assert.match(container.textContent!, /can't draft the contract itself/);
  assert.match(container.textContent!, /needs a licensed attorney/);
});

test('reason-given: the reason is rendered in its own visible element next to the statement', () => {
  const { container } = render(<RefusalMessaging {...baseProps} />);
  const refusal = container.querySelector<HTMLElement>('.refusal-messaging__refusal')!;
  const statement = refusal.querySelector('.refusal-messaging__statement')!;
  const reason = refusal.querySelector('.refusal-messaging__reason')!;
  assert.equal(statement.textContent, baseProps.statement);
  assert.equal(reason.textContent, baseProps.reason);
  assert.ok(!reason.closest('[hidden]') && !reason.closest('[aria-hidden="true"]'));
  assert.ok(!reason.classList.contains('sr-only'), 'the reason is not screen-reader-only');
});

test('alternative-offered: an empty alternatives list fails loudly', () => {
  assert.throws(
    () =>
      render(
        <RefusalMessaging
          {...baseProps}
          alternatives={[] as unknown as typeof baseProps.alternatives}
        />,
      ),
    /alternative-offered/,
  );
});

test('alternative-offered: provided alternatives render as operable actions', () => {
  let selected = '';
  const { container, getByRole } = render(
    <RefusalMessaging
      {...baseProps}
      alternatives={[
        { label: 'Explain what each clause means', onSelect: () => (selected = 'explain') },
        { label: 'See supported document types', href: '/docs/supported' },
      ]}
    />,
  );
  fireEvent.click(getByRole('button', { name: 'Explain what each clause means' }));
  assert.equal(selected, 'explain');

  const link = getByRole('link', { name: 'See supported document types' });
  assert.ok(link.getAttribute('href'));
  assert.ok(container.querySelectorAll('.refusal-messaging__alternatives li').length === 2);
});

test('no-verbatim-retry: rendered actions are exactly the provided alternatives, no built-in retry', () => {
  const { container } = render(<RefusalMessaging {...baseProps} />);
  const buttons = [...container.querySelectorAll('button')];
  assert.deepEqual(
    buttons.map((b) => b.textContent),
    ['Explain what each clause means'],
  );
  assert.doesNotMatch(container.textContent!, /retry|try again/i);
});

test('no-verbatim-retry: no control beyond the provided alternatives exists in a partial refusal either', () => {
  const { container } = render(
    <RefusalMessaging
      {...baseProps}
      alternatives={[
        { label: 'Explain what each clause means' },
        { label: 'See supported document types', href: '/docs/supported' },
      ]}
      fulfilledContent={<p>Here is the part I can do.</p>}
    />,
  );
  const controls = [...container.querySelectorAll('button, a, input, [role="button"]')];
  assert.deepEqual(
    controls.map((el) => el.textContent),
    ['Explain what each clause means', 'See supported document types'],
    'exactly the host-provided paths, nothing built in',
  );
});

test('partial-honored: fulfilled content and the scoped refusal render as distinct co-present regions', () => {
  const { container } = render(
    <RefusalMessaging
      {...baseProps}
      statement="I summarized the public filing, but I can't infer the private financials."
      fulfilledContent={<p>Summary: revenue grew 12% year over year.</p>}
    />,
  );
  assert.equal(kind(container), 'partial');
  assert.ok(container.querySelector('.refusal-messaging__fulfilled'));
  assert.ok(container.querySelector('.refusal-messaging__refusal'));
  assert.match(container.textContent!, /revenue grew 12%/);
  assert.match(container.textContent!, /can't infer the private financials/);
});

test('refusal-distinct-from-error: status semantics, never role=alert', () => {
  const { container } = render(<RefusalMessaging {...baseProps} />);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.ok(container.querySelector('[role="status"]'));
  assert.equal(kind(container), 'full');
});

test('refusal-distinct-from-error: no alert semantics or malfunction iconography in full or partial refusals', () => {
  for (const extra of [{}, { fulfilledContent: 'Here is the part I can do.' }]) {
    const { container, unmount } = render(<RefusalMessaging {...baseProps} {...extra} />);
    assert.equal(
      container.querySelector('[role="alert"], [aria-live="assertive"], [aria-invalid="true"]'),
      null,
      'nothing assertive or error-flavored',
    );
    assert.equal(
      container.querySelector('svg, img, [role="img"]'),
      null,
      'no icon is rendered, so none can imply malfunction',
    );
    const status = liveRegion(container);
    assert.equal(status.getAttribute('role'), 'status');
    assert.equal(status.getAttribute('aria-live'), 'polite');
    unmount();
  }
});

test('refusal-announced: polite announcement after render, distinct copy for partial refusals', () => {
  const { container } = render(<RefusalMessaging {...baseProps} />);
  assert.equal(liveRegion(container).getAttribute('aria-live'), 'polite');
  assert.equal(liveRegion(container).textContent, REFUSAL_ANNOUNCEMENTS.full);
  cleanup();

  const partial = render(
    <RefusalMessaging {...baseProps} fulfilledContent={<p>Here is the part I can do.</p>} />,
  );
  assert.equal(
    liveRegion(partial.container).textContent,
    REFUSAL_ANNOUNCEMENTS.partial,
  );
});

test('alternatives-accessible: actions are keyboard-operable with their path as the accessible name', () => {
  const { getByRole } = render(<RefusalMessaging {...baseProps} />);
  const action = getByRole('button', { name: 'Explain what each clause means' });
  assert.equal(action.tagName, 'BUTTON');
  assert.equal(action.getAttribute('type'), 'button');
});

test('alternatives-accessible: every alternative, button or link, is a named control in the tab order', () => {
  const alternatives = [
    { label: 'Explain what each clause means', onSelect: () => {} },
    { label: 'See supported document types', href: '/docs/supported' },
    { label: 'Ask about a single clause' },
  ] as const;
  const { container } = render(<RefusalMessaging {...baseProps} alternatives={alternatives} />);
  const controls = [
    ...container.querySelectorAll<HTMLElement>('.refusal-messaging__alternatives li > *'),
  ];
  assert.equal(controls.length, alternatives.length, 'one control per alternative');
  controls.forEach((control, i) => {
    // Native button, or a link with an href (a link without one is not focusable).
    if (control.tagName === 'A') {
      assert.ok(control.getAttribute('href'), 'link alternative has an href');
    } else {
      assert.equal(control.tagName, 'BUTTON');
      assert.equal((control as HTMLButtonElement).type, 'button');
      assert.equal((control as HTMLButtonElement).disabled, false);
    }
    assert.equal(control.textContent, alternatives[i].label, 'named by the path it offers');
    assert.equal(control.getAttribute('aria-label'), null, 'no label overriding the visible path');
    assert.ok(control.tabIndex >= 0, 'in the tab order');
    assert.ok(!control.closest('[hidden]') && !control.closest('[aria-hidden="true"]'));
    control.focus();
    assert.ok(document.activeElement === control, 'focusable');
  });
});

test('policy-detail-available: the disclosure toggles with aria-expanded', async () => {
  const { container, getByRole } = render(
    <RefusalMessaging {...baseProps} policyDetail="Unauthorized-practice-of-law policy." />,
  );
  const toggle = getByRole('button', { name: 'Why this is declined' });
  const detail = container.querySelector<HTMLElement>('.refusal-messaging__policy')!;
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(detail.hidden, true);

  fireEvent.click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detail.hidden, false);

  // axe with the detail expanded (kept in this test so it travels with the
  // optional disclosure).
  const expanded = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(expanded.violations.map((v) => v.id), [], 'expanded: axe violations');
});

test('axe: no WCAG A/AA violations for full and partial refusals', async () => {
  const { container, rerender } = render(
    <RefusalMessaging {...baseProps} policyDetail="Policy text." />,
  );
  let results = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));

  rerender(
    <RefusalMessaging
      {...baseProps}
      fulfilledContent={<p>Here is the part I can do.</p>}
      policyDetail="Policy text."
    />,
  );
  results = await axe.run(container, AXE_OPTIONS);
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));
});
