import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { RefusalMessaging, REFUSAL_ANNOUNCEMENTS } from './RefusalMessaging.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const baseOptions = {
  statement: "I can't draft the contract itself.",
  reason: 'Drafting binding legal documents needs a licensed attorney.',
  alternatives: [{ label: 'Explain what each clause means' }],
};

const mounted = (options = {}) => {
  const rm = new RefusalMessaging({ ...baseOptions, ...options });
  rm.mount(host);
  return rm;
};

const liveRegion = () => host.querySelector('[role="status"]');
const wrapper = () => host.querySelector('.refusal-messaging');

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('reason-given: statement and reason both render; a missing reason fails loudly', () => {
  mounted();
  assert.match(host.textContent, /can't draft the contract itself/);
  assert.match(host.textContent, /needs a licensed attorney/);

  assert.throws(
    () => new RefusalMessaging({ ...baseOptions, reason: '' }),
    /reason-given/,
  );
});

test('reason-given: the reason is rendered in its own visible element next to the statement', () => {
  mounted();
  const refusal = host.querySelector('.refusal-messaging__refusal');
  const statement = refusal.querySelector('.refusal-messaging__statement');
  const reason = refusal.querySelector('.refusal-messaging__reason');
  assert.equal(statement.textContent, baseOptions.statement);
  assert.equal(reason.textContent, baseOptions.reason);
  assert.ok(!reason.closest('[hidden]') && !reason.closest('[aria-hidden="true"]'));
  assert.ok(!reason.classList.contains('sr-only'), 'the reason is not screen-reader-only');
});

test('alternative-offered: empty alternatives fail loudly; provided ones render as operable actions', () => {
  assert.throws(
    () => new RefusalMessaging({ ...baseOptions, alternatives: [] }),
    /alternative-offered/,
  );

  let selected = '';
  mounted({
    alternatives: [
      { label: 'Explain what each clause means', onSelect: () => (selected = 'explain') },
      { label: 'See supported document types', href: '/docs/supported' },
    ],
  });
  const buttons = host.querySelectorAll('.refusal-messaging__alternatives button');
  const links = host.querySelectorAll('.refusal-messaging__alternatives a');
  assert.equal(buttons.length, 1);
  assert.equal(links.length, 1);

  buttons[0].click();
  assert.equal(selected, 'explain');
});

test('no-verbatim-retry: rendered actions are exactly the provided alternatives', () => {
  mounted();
  const actions = [...host.querySelectorAll('.refusal-messaging__alternatives li')];
  assert.deepEqual(
    actions.map((li) => li.textContent),
    ['Explain what each clause means'],
  );
  assert.doesNotMatch(host.textContent, /retry|try again/i);
});

test('no-verbatim-retry: no control beyond the provided alternatives exists in a partial refusal either', () => {
  mounted({
    alternatives: [
      { label: 'Explain what each clause means' },
      { label: 'See supported document types', href: '/docs/supported' },
    ],
    fulfilledText: 'Here is the part I can do.',
  });
  const controls = [...host.querySelectorAll('button, a, input, [role="button"]')];
  assert.deepEqual(
    controls.map((el) => el.textContent),
    ['Explain what each clause means', 'See supported document types'],
    'exactly the host-provided paths, nothing built in',
  );
});

test('partial-honored: fulfilled content and the scoped refusal are distinct co-present regions', () => {
  mounted({ fulfilledText: 'Summary: revenue grew 12% year over year.' });
  assert.equal(wrapper().dataset.kind, 'partial');
  assert.ok(host.querySelector('.refusal-messaging__fulfilled'));
  assert.ok(host.querySelector('.refusal-messaging__refusal'));
  assert.match(host.textContent, /revenue grew 12%/);
  const fulfilled = host.querySelector('.refusal-messaging__fulfilled');
  const refusal = host.querySelector('.refusal-messaging__refusal');
  assert.equal(fulfilled.textContent, 'Summary: revenue grew 12% year over year.', 'delivered in full');
  assert.ok(!fulfilled.closest('[hidden]') && !fulfilled.closest('[aria-hidden="true"]'));
  assert.ok(!fulfilled.contains(refusal) && !refusal.contains(fulfilled), 'separate regions');
  assert.match(refusal.textContent, /can't draft the contract itself/, 'the refusal is still stated');
});

test('refusal-distinct-from-error: status semantics, never role=alert', () => {
  mounted();
  assert.equal(host.querySelector('[role="alert"]'), null);
  assert.ok(host.querySelector('[role="status"]'));
  assert.equal(wrapper().dataset.kind, 'full');
});

test('refusal-distinct-from-error: no alert semantics or malfunction iconography in full or partial refusals', () => {
  for (const extra of [{}, { fulfilledText: 'Here is the part I can do.' }]) {
    host.textContent = '';
    mounted(extra);
    assert.equal(
      host.querySelector('[role="alert"], [aria-live="assertive"], [aria-invalid="true"]'),
      null,
      'nothing assertive or error-flavored',
    );
    assert.equal(
      host.querySelector('svg, img, [role="img"]'),
      null,
      'no icon is rendered, so none can imply malfunction',
    );
    assert.equal(liveRegion().getAttribute('role'), 'status');
    assert.equal(liveRegion().getAttribute('aria-live'), 'polite');
  }
});

test('refusal-announced: polite announcement set after mount, distinct copy for partial refusals', () => {
  mounted();
  assert.equal(liveRegion().getAttribute('aria-live'), 'polite');
  assert.equal(liveRegion().textContent, REFUSAL_ANNOUNCEMENTS.full);

  host.textContent = '';
  mounted({ fulfilledText: 'Here is the part I can do.' });
  assert.equal(liveRegion().textContent, REFUSAL_ANNOUNCEMENTS.partial);
});

test('alternatives-accessible: actions are native controls named by their path', () => {
  mounted();
  const button = host.querySelector('.refusal-messaging__alternatives button');
  assert.equal(button.type, 'button');
  assert.equal(button.textContent, 'Explain what each clause means');
});

test('alternatives-accessible: every alternative, button or link, is a named control in the tab order', () => {
  const alternatives = [
    { label: 'Explain what each clause means', onSelect: () => {} },
    { label: 'See supported document types', href: '/docs/supported' },
    { label: 'Ask about a single clause' },
  ];
  mounted({ alternatives });
  const controls = [...host.querySelectorAll('.refusal-messaging__alternatives li > *')];
  assert.equal(controls.length, alternatives.length, 'one control per alternative');
  controls.forEach((control, i) => {
    // Native button, or a link with an href (a link without one is not focusable).
    if (control.tagName === 'A') {
      assert.ok(control.getAttribute('href'), 'link alternative has an href');
    } else {
      assert.equal(control.tagName, 'BUTTON');
      assert.equal(control.type, 'button');
      assert.equal(control.disabled, false);
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
  mounted({ policyDetail: 'Unauthorized-practice-of-law policy.' });
  const toggle = host.querySelector('.refusal-messaging__policy-toggle');
  const detail = host.querySelector('.refusal-messaging__policy');

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(detail.hidden, true);

  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detail.hidden, false);

  // axe with the detail collapsed-then-expanded (kept in this test so it
  // travels with the optional disclosure).
  const expanded = await axe.run(host, AXE_OPTIONS);
  assert.deepEqual(expanded.violations.map((v) => v.id), [], 'expanded: axe violations');
});

test('destroy removes the component without throwing', () => {
  const rm = mounted();
  assert.doesNotThrow(() => rm.destroy());
  assert.equal(host.querySelector('.refusal-messaging'), null);
});

test('axe: no WCAG A/AA violations for full and partial refusals', async () => {
  const alternatives = [
    { label: 'Explain what each clause means' },
    { label: 'See supported document types', href: '/docs/supported' },
  ];
  for (const [kind, extra] of [
    ['full', {}],
    ['partial', { fulfilledText: 'Here is the part I can do.' }],
  ]) {
    host.textContent = '';
    mounted({ alternatives, ...extra });
    assert.equal(wrapper().dataset.kind, kind);
    const result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${kind}: axe violations`);
  }
});
