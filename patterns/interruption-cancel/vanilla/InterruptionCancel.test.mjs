import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axe from 'axe-core';
import { InterruptionCancel, RACE_DISCLOSURE, WORK_ANNOUNCEMENTS } from './InterruptionCancel.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

const mounted = (options = {}) => {
  const ic = new InterruptionCancel({
    workLabel: 'drafting 7 emails',
    onCancel: () => {},
    ...options,
  });
  ic.mount(host);
  return ic;
};

const cancelBtn = () => host.querySelector('.interruption-cancel__cancel');
const liveRegion = () => host.querySelector('[role="status"]');
const wrapper = () => host.querySelector('.interruption-cancel');
const q = (selector) => host.querySelector(selector);
const items = (selector) => [...q(selector).children].map((li) => li.textContent);

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

test('immediate-acknowledgment: requestCancel acknowledges synchronously before the host settles', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().click();

  assert.equal(ic.getPhase(), 'cancel-requested');
  assert.equal(liveRegion().textContent, 'Cancellation requested — stopping.');
  assert.equal(cancels, 1);
  // The acknowledgment is visible too, and distinct from running: the
  // pending indicator replaces the cancel control.
  assert.equal(wrapper().dataset.phase, 'cancel-requested');
  assert.equal(q('.interruption-cancel__pending').hidden, false, 'pending indicator shown');
  assert.equal(cancelBtn().hidden, true, 'cancel control hidden');
});

test('no-silent-continuation: progress during pending cancellation renders without resetting the phase', () => {
  const ic = mounted();
  ic.start();
  ic.setProgress('Step 2 of 7');
  cancelBtn().click();

  ic.setProgress('Step 3 of 7');
  assert.equal(ic.getPhase(), 'cancel-requested');
  assert.equal(wrapper().dataset.phase, 'cancel-requested');
  assert.equal(q('.interruption-cancel__progress').textContent, 'Step 3 of 7');
  assert.equal(q('.interruption-cancel__progress').hidden, false, 'progress is actually shown');
  assert.equal(cancelBtn().hidden, true, 'the cancel control does not come back');
  assert.equal(q('.interruption-cancel__pending').hidden, false, 'still shown as cancelling');
});

test('no-silent-continuation: start() while cancellation is pending does not flip back to running', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().click();

  // A host that calls start() per step (e.g. per tool call) must not undo
  // the acknowledgment.
  ic.start();
  assert.equal(ic.getPhase(), 'cancel-requested');
  assert.equal(wrapper().dataset.phase, 'cancel-requested');
  assert.equal(cancelBtn().hidden, true);
  assert.equal(q('.interruption-cancel__pending').hidden, false);
  assert.equal(liveRegion().textContent, WORK_ANNOUNCEMENTS['cancel-requested']);

  // The pending cancel still settles as a cancel.
  ic.finish();
  assert.equal(ic.getPhase(), 'cancelled');
  assert.equal(cancels, 1);
});

test('partial-work-honesty: the cancelled summary lists completed and stopped work', () => {
  const ic = mounted();
  ic.start();
  ic.requestCancel();
  ic.finish({
    completedWork: ['Email to Ana sent', 'Email to Ben sent'],
    stoppedWork: ['Email to Cara'],
  });

  assert.equal(ic.getPhase(), 'cancelled');
  // Rendered, not merely present in the DOM.
  for (const selector of [
    '.interruption-cancel__summary',
    '.interruption-cancel__done',
    '.interruption-cancel__stopped',
  ]) {
    assert.equal(q(selector).hidden, false, `${selector} is shown`);
  }
  // Every item, in the right list: what ran is not reported as stopped, and
  // what was stopped is not reported as done.
  assert.deepEqual(items('.interruption-cancel__done'), [
    'Email to Ana sent',
    'Email to Ben sent',
  ]);
  assert.deepEqual(items('.interruption-cancel__stopped'), ['Email to Cara']);
  const labels = [...host.querySelectorAll('.interruption-cancel__list-label')];
  assert.deepEqual(labels.map((el) => el.textContent), ['Already done:', 'Stopped before:']);
  assert.ok(labels.every((el) => el.hidden === false), 'both list labels shown');
});

test('partial-work-honesty: a cancel that stopped everything does not claim completed work', () => {
  const ic = mounted();
  ic.start();
  ic.requestCancel();
  ic.finish({ stoppedWork: ['Email to Ana'] });
  assert.equal(q('.interruption-cancel__done').hidden, true, 'no "already done" list');
  assert.deepEqual(items('.interruption-cancel__done'), []);
  assert.deepEqual(items('.interruption-cancel__stopped'), ['Email to Ana']);
});

test('completion-race-honest: finishing as completed despite a pending cancel discloses the race', () => {
  const ic = mounted();
  ic.start();
  ic.requestCancel();
  ic.finish({ outcome: 'completed' });

  assert.equal(ic.getPhase(), 'completed');
  // The note is built at mount, so its text is always in the DOM; what
  // matters is that it is unhidden, inside a shown summary.
  assert.equal(q('.interruption-cancel__race-note').hidden, false);
  assert.equal(q('.interruption-cancel__race-note').textContent, RACE_DISCLOSURE);
  assert.equal(q('.interruption-cancel__summary').hidden, false);
  assert.match(q('.interruption-cancel__outcome').textContent, /^Completed:/, 'not reported as cancelled');
  // The disclosure reaches assistive technology, not only sighted users.
  assert.equal(liveRegion().textContent, `${WORK_ANNOUNCEMENTS.completed} ${RACE_DISCLOSURE}`);
});

test('completion-race-honest: an ordinary completion carries no race disclosure', () => {
  const ic = mounted();
  ic.start();
  ic.finish();

  assert.equal(ic.getPhase(), 'completed');
  assert.equal(q('.interruption-cancel__race-note').hidden, true);
  assert.equal(liveRegion().textContent, WORK_ANNOUNCEMENTS.completed);
});

test('cancel-not-gated: one activation, one callback; repeats and post-settle calls are no-ops', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().click();
  assert.equal(cancels, 1, 'the first activation cancels; nothing asks "are you sure?"');
  assert.equal(document.querySelector('dialog, [role="dialog"], [role="alertdialog"]'), null);
  cancelBtn().click();
  ic.requestCancel();
  assert.equal(cancels, 1);
});

test('cancel-control-accessible: the cancel control is a native, focusable button named for the work', () => {
  const ic = mounted();
  ic.start();
  const btn = cancelBtn();
  // Native <button type="button">: Enter/Space activation and Tab reach come
  // from the platform, not from handlers that could be removed.
  assert.equal(btn.tagName, 'BUTTON');
  assert.equal(btn.type, 'button');
  assert.equal(btn.disabled, false);
  assert.equal(btn.getAttribute('aria-disabled'), null);
  assert.equal(btn.hidden, false, 'shown while running');
  assert.ok(btn.tabIndex >= 0, 'in the tab order');
  assert.ok(!btn.closest('[hidden]') && !btn.closest('[aria-hidden="true"]'));
  btn.focus();
  assert.ok(document.activeElement === btn, 'focusable');
  assert.equal(btn.getAttribute('aria-label'), 'Cancel: drafting 7 emails');
});

test('cancellation-announced: live region announces acknowledgment and settled outcome', () => {
  const ic = mounted();
  ic.start();
  assert.equal(liveRegion().getAttribute('aria-live'), 'polite');
  assert.equal(liveRegion().textContent, '', 'silent while running');

  ic.requestCancel();
  assert.equal(liveRegion().textContent, 'Cancellation requested — stopping.');

  ic.finish();
  assert.equal(liveRegion().textContent, 'Work cancelled.');
});

test('focus-not-lost: cancelling while the control has focus moves focus to the work region', () => {
  const ic = mounted();
  ic.start();
  cancelBtn().focus();
  cancelBtn().click();

  // assert.ok(a === b): assert.equal on DOM nodes builds an enormous diff on failure.
  assert.ok(document.activeElement === ic.region);
  assert.ok(document.activeElement !== document.body);
});

test('focus-not-lost: natural completion while the control has focus also recovers focus', () => {
  const ic = mounted();
  ic.start();
  cancelBtn().focus();
  ic.finish();

  assert.ok(document.activeElement === ic.region);
});

test('focus-not-lost: focus outside the component is never moved', () => {
  const outside = document.createElement('button');
  document.body.append(outside);
  try {
    const ic = mounted();
    ic.start();
    outside.focus();
    cancelBtn().click();
    assert.ok(document.activeElement === outside, 'unchanged at acknowledgment');
    ic.finish();
    assert.equal(ic.getPhase(), 'cancelled');
    assert.ok(document.activeElement === outside, 'unchanged at settle');
  } finally {
    outside.remove();
  }
});

test('escape-cancels: Escape inside the component requests cancellation', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().focus();
  cancelBtn().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  assert.equal(cancels, 1);
  assert.equal(ic.getPhase(), 'cancel-requested');
});

test('restart: start() after settle clears the summary and the race disclosure', () => {
  const ic = mounted();
  ic.start();
  ic.requestCancel();
  ic.finish({ outcome: 'completed' });
  const raceNote = host.querySelector('.interruption-cancel__race-note');
  assert.equal(raceNote.hidden, false, 'race disclosed after the race');

  ic.start();
  assert.equal(ic.getPhase(), 'running');
  assert.equal(cancelBtn().hidden, false);
  assert.equal(raceNote.hidden, true, 'race disclosure cleared by the new run');

  // The new run completing normally must not inherit the old race flag.
  ic.finish();
  assert.equal(ic.getPhase(), 'completed');
  assert.equal(raceNote.hidden, true);
});

test('destroy removes the component without throwing', () => {
  const ic = mounted();
  ic.start();
  assert.doesNotThrow(() => ic.destroy());
  assert.equal(host.querySelector('.interruption-cancel'), null);
});

test('axe: no WCAG A/AA violations while running, pending, cancelled, and completed', async () => {
  const ic = mounted();
  const steps = [
    ['running', () => { ic.start(); ic.setProgress('Step 2 of 7'); }],
    ['cancel-requested', () => cancelBtn().click()],
    ['cancelled', () => ic.finish({ completedWork: ['Email sent'], stoppedWork: ['Email to Ben'] })],
    ['completed', () => { ic.start(); ic.finish({ completedWork: ['Email sent'] }); }],
    // Completed with the race disclosure showing.
    ['completed', () => { ic.start(); ic.requestCancel(); ic.finish({ outcome: 'completed' }); }],
  ];
  for (const [phase, enter] of steps) {
    enter();
    assert.equal(ic.getPhase(), phase);
    const result = await axe.run(host, AXE_OPTIONS);
    assert.deepEqual(result.violations.map((v) => v.id), [], `${phase}: axe violations`);
  }
});
