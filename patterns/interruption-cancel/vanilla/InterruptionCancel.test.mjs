import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { InterruptionCancel, RACE_DISCLOSURE } from './InterruptionCancel.js';

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

test('immediate-acknowledgment: requestCancel acknowledges synchronously before the host settles', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().click();

  assert.equal(ic.getPhase(), 'cancel-requested');
  assert.equal(liveRegion().textContent, 'Cancellation requested — stopping.');
  assert.equal(cancels, 1);
});

test('no-silent-continuation: progress during pending cancellation renders without resetting the phase', () => {
  const ic = mounted();
  ic.start();
  ic.setProgress('Step 2 of 7');
  cancelBtn().click();

  ic.setProgress('Step 3 of 7');
  assert.equal(ic.getPhase(), 'cancel-requested');
  assert.match(host.textContent, /Step 3 of 7/);
  assert.equal(wrapper().dataset.phase, 'cancel-requested');
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
  assert.match(host.textContent, /Already done:/);
  assert.match(host.textContent, /Email to Ana sent/);
  assert.match(host.textContent, /Stopped before:/);
  assert.match(host.textContent, /Email to Cara/);
});

test('completion-race-honest: finishing as completed despite a pending cancel discloses the race', () => {
  const ic = mounted();
  ic.start();
  ic.requestCancel();
  ic.finish({ outcome: 'completed' });

  assert.equal(ic.getPhase(), 'completed');
  assert.match(host.textContent, new RegExp(RACE_DISCLOSURE));
  assert.equal(liveRegion().textContent, 'Work completed.');
});

test('cancel-not-gated: one activation, one callback; repeats and post-settle calls are no-ops', () => {
  let cancels = 0;
  const ic = mounted({ onCancel: () => (cancels += 1) });
  ic.start();
  cancelBtn().click();
  cancelBtn().click();
  ic.requestCancel();
  assert.equal(cancels, 1);
});

test('cancel-control-accessible: the accessible name names the work', () => {
  const ic = mounted();
  ic.start();
  assert.equal(cancelBtn().getAttribute('aria-label'), 'Cancel: drafting 7 emails');
});

test('cancellation-announced: live region announces acknowledgment and settled outcome', () => {
  const ic = mounted();
  ic.start();
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

  assert.equal(document.activeElement, ic.region);
  assert.notEqual(document.activeElement, document.body);
});

test('focus-not-lost: natural completion while the control has focus also recovers focus', () => {
  const ic = mounted();
  ic.start();
  cancelBtn().focus();
  ic.finish();

  assert.equal(document.activeElement, ic.region);
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
