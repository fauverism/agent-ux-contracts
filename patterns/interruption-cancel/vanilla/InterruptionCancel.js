/**
 * InterruptionCancel — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 *
 * Build-once DOM, mutated in place (see patterns/TEMPLATE.md conventions).
 */

/** Polite announcements per phase (constraint: cancellation-announced). */
export const WORK_ANNOUNCEMENTS = {
  running: '',
  'cancel-requested': 'Cancellation requested — stopping.',
  cancelled: 'Work cancelled.',
  completed: 'Work completed.',
};

export const RACE_DISCLOSURE =
  'This work finished before the cancellation took effect.';

export class InterruptionCancel {
  /**
   * @param {object} options
   * @param {string} options.workLabel Names the work; carried into the cancel
   *   control's accessible name.
   * @param {() => void} options.onCancel Called exactly once when the user
   *   requests cancellation.
   */
  constructor({ workLabel, onCancel }) {
    this.workLabel = workLabel;
    this.onCancel = onCancel;
    this.phase = 'completed'; // running | cancel-requested | cancelled | completed
    this.cancelWasRequested = false;

    this.root = null;
    this.wrapper = null;
    this.liveRegion = null;
    this.region = null;
    this.progressEl = null;
    this.pendingEl = null;
    this.summaryEl = null;
    this.outcomeEl = null;
    this.raceEl = null;
    this.doneLabel = null;
    this.doneList = null;
    this.stoppedLabel = null;
    this.stoppedList = null;
    this.cancelBtn = null;

    this.handleKeydown = (event) => {
      // Escape requests cancellation while focus is inside the component
      // (constraint: escape-cancels).
      if (event.key === 'Escape' && this.phase === 'running') this.requestCancel();
    };
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('InterruptionCancel: container not found');

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'interruption-cancel';
    this.wrapper.dataset.phase = this.phase;
    this.wrapper.addEventListener('keydown', this.handleKeydown);

    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');

    // tabindex -1: focus recovery target when the cancel control goes away
    // (constraint: focus-not-lost).
    this.region = document.createElement('div');
    this.region.className = 'interruption-cancel__region';
    this.region.tabIndex = -1;

    this.progressEl = document.createElement('p');
    this.progressEl.className = 'interruption-cancel__progress';
    this.progressEl.hidden = true;

    this.pendingEl = document.createElement('p');
    this.pendingEl.className = 'interruption-cancel__pending';
    this.pendingEl.textContent = 'Cancelling…';
    this.pendingEl.hidden = true;

    this.summaryEl = document.createElement('div');
    this.summaryEl.className = 'interruption-cancel__summary';
    this.summaryEl.hidden = true;

    this.outcomeEl = document.createElement('p');
    this.outcomeEl.className = 'interruption-cancel__outcome';

    this.raceEl = document.createElement('p');
    this.raceEl.className = 'interruption-cancel__race-note';
    this.raceEl.textContent = RACE_DISCLOSURE;
    this.raceEl.hidden = true;

    this.doneLabel = document.createElement('p');
    this.doneLabel.className = 'interruption-cancel__list-label';
    this.doneLabel.textContent = 'Already done:';
    this.doneLabel.hidden = true;
    this.doneList = document.createElement('ul');
    this.doneList.className = 'interruption-cancel__done';
    this.doneList.hidden = true;

    this.stoppedLabel = document.createElement('p');
    this.stoppedLabel.className = 'interruption-cancel__list-label';
    this.stoppedLabel.textContent = 'Stopped before:';
    this.stoppedLabel.hidden = true;
    this.stoppedList = document.createElement('ul');
    this.stoppedList.className = 'interruption-cancel__stopped';
    this.stoppedList.hidden = true;

    this.summaryEl.append(
      this.outcomeEl,
      this.raceEl,
      this.doneLabel,
      this.doneList,
      this.stoppedLabel,
      this.stoppedList,
    );
    this.region.append(this.progressEl, this.pendingEl, this.summaryEl);

    this.cancelBtn = document.createElement('button');
    this.cancelBtn.type = 'button';
    this.cancelBtn.className = 'interruption-cancel__cancel';
    this.cancelBtn.textContent = 'Cancel';
    this.cancelBtn.setAttribute('aria-label', `Cancel: ${this.workLabel}`);
    this.cancelBtn.hidden = true;
    this.cancelBtn.addEventListener('click', () => this.requestCancel());

    this.wrapper.append(this.liveRegion, this.region, this.cancelBtn);
    this.root.append(this.wrapper);
  }

  /** Begins (or restarts) a run. */
  start() {
    this.phase = 'running';
    this.cancelWasRequested = false;
    this.progressEl.hidden = true;
    this.progressEl.textContent = '';
    this.pendingEl.hidden = true;
    this.summaryEl.hidden = true;
    this.raceEl.hidden = true;
    this.#fillList(this.doneLabel, this.doneList, []);
    this.#fillList(this.stoppedLabel, this.stoppedList, []);
    this.cancelBtn.hidden = false;
    this.wrapper.dataset.phase = this.phase;
    this.liveRegion.textContent = '';
  }

  /**
   * Progress may keep arriving while cancellation is pending; it renders
   * without resetting the phase (constraint: no-silent-continuation).
   */
  setProgress(text) {
    if (this.phase !== 'running' && this.phase !== 'cancel-requested') return;
    this.progressEl.textContent = text;
    this.progressEl.hidden = text === '';
  }

  /**
   * Synchronous acknowledgment, no confirmation dialog
   * (constraints: immediate-acknowledgment, cancel-not-gated).
   */
  requestCancel() {
    if (this.phase !== 'running') return;
    this.cancelWasRequested = true;
    this.#reclaimFocusFromCancel();
    this.phase = 'cancel-requested';
    this.cancelBtn.hidden = true;
    this.pendingEl.hidden = false;
    this.wrapper.dataset.phase = this.phase;
    this.liveRegion.textContent = WORK_ANNOUNCEMENTS[this.phase];
    this.onCancel();
  }

  /**
   * Host reports the work settled.
   * @param {object} [result]
   * @param {'completed'|'cancelled'} [result.outcome] Omit to infer:
   *   cancelled if cancellation was requested, completed otherwise. Pass
   *   'completed' explicitly when the work finished despite a pending cancel
   *   (constraint: completion-race-honest).
   * @param {string[]} [result.completedWork] Side effects that happened
   *   (constraint: partial-work-honesty).
   * @param {string[]} [result.stoppedWork] Work stopped before it ran.
   */
  finish({ outcome, completedWork = [], stoppedWork = [] } = {}) {
    if (this.phase !== 'running' && this.phase !== 'cancel-requested') return;

    const inferred = this.phase === 'cancel-requested' ? 'cancelled' : 'completed';
    const settled = outcome ?? inferred;
    const raced = settled === 'completed' && this.cancelWasRequested;

    this.#reclaimFocusFromCancel();
    this.phase = settled;
    this.cancelBtn.hidden = true;
    this.pendingEl.hidden = true;
    this.progressEl.hidden = true;
    this.wrapper.dataset.phase = this.phase;

    this.outcomeEl.textContent =
      settled === 'cancelled'
        ? `Cancelled: ${this.workLabel}.`
        : `Completed: ${this.workLabel}.`;
    this.raceEl.hidden = !raced;
    this.#fillList(this.doneLabel, this.doneList, completedWork);
    this.#fillList(
      this.stoppedLabel,
      this.stoppedList,
      settled === 'cancelled' ? stoppedWork : [],
    );
    this.summaryEl.hidden = false;

    this.liveRegion.textContent = WORK_ANNOUNCEMENTS[this.phase];
  }

  #fillList(labelEl, listEl, items) {
    listEl.textContent = '';
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      listEl.append(li);
    }
    labelEl.hidden = items.length === 0;
    listEl.hidden = items.length === 0;
  }

  #reclaimFocusFromCancel() {
    if (document.activeElement === this.cancelBtn) this.region.focus();
  }

  getPhase() {
    return this.phase;
  }

  destroy() {
    this.wrapper?.removeEventListener('keydown', this.handleKeydown);
    this.wrapper?.remove();
    this.wrapper = null;
    this.root = null;
  }
}
