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

test('policy-detail-available: the disclosure toggles with aria-expanded', () => {
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
});

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

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
