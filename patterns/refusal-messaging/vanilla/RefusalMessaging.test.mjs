import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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

test('reason-given: statement and reason both render; a missing reason fails loudly', () => {
  mounted();
  assert.match(host.textContent, /can't draft the contract itself/);
  assert.match(host.textContent, /needs a licensed attorney/);

  assert.throws(
    () => new RefusalMessaging({ ...baseOptions, reason: '' }),
    /reason-given/,
  );
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

test('partial-honored: fulfilled content and the scoped refusal are distinct co-present regions', () => {
  mounted({ fulfilledText: 'Summary: revenue grew 12% year over year.' });
  assert.equal(wrapper().dataset.kind, 'partial');
  assert.ok(host.querySelector('.refusal-messaging__fulfilled'));
  assert.ok(host.querySelector('.refusal-messaging__refusal'));
  assert.match(host.textContent, /revenue grew 12%/);
});

test('refusal-distinct-from-error: status semantics, never role=alert', () => {
  mounted();
  assert.equal(host.querySelector('[role="alert"]'), null);
  assert.ok(host.querySelector('[role="status"]'));
  assert.equal(wrapper().dataset.kind, 'full');
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

test('policy-detail-available: the disclosure toggles with aria-expanded', () => {
  mounted({ policyDetail: 'Unauthorized-practice-of-law policy.' });
  const toggle = host.querySelector('.refusal-messaging__policy-toggle');
  const detail = host.querySelector('.refusal-messaging__policy');

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(detail.hidden, true);

  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detail.hidden, false);
});

test('destroy removes the component without throwing', () => {
  const rm = mounted();
  assert.doesNotThrow(() => rm.destroy());
  assert.equal(host.querySelector('.refusal-messaging'), null);
});
