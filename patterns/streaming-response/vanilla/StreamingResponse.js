/**
 * StreamingResponse — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 *
 * The DOM is built once at mount and mutated in place. Rebuilding via
 * innerHTML on each transition would destroy focus held inside the component
 * and recreate the live region, which makes announcements unreliable.
 */

let instanceCounter = 0;

export class StreamingResponse {
  /**
   * @param {object} [options]
   * @param {() => void} [options.onStop] Called when the user stops generation.
   */
  constructor({ onStop = null } = {}) {
    this.onStop = onStop;
    this.state = 'idle'; // idle | streaming | completed | interrupted | errored
    this.content = '';
    this.error = null;

    this.root = null;
    this.wrapper = null;
    this.liveRegion = null;
    this.output = null;
    this.contentEl = null;
    this.activityEl = null;
    this.errorEl = null;
    this.stopBtn = null;
    this.noticeEl = null;

    this.handleKeydown = (event) => {
      // Escape stops the stream while focus is inside the component
      // (contract keyboard table).
      if (event.key === 'Escape' && this.state === 'streaming') this.stop();
    };
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('StreamingResponse: container not found');

    const liveRegionId = `streaming-status-${(instanceCounter += 1)}`;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'streaming-response';
    this.wrapper.addEventListener('keydown', this.handleKeydown);

    // Stable live region, created once (constraint: completion-announced).
    this.liveRegion = document.createElement('div');
    this.liveRegion.id = liveRegionId;
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');

    // tabindex -1: programmatic focus target when the stop control goes away
    // (constraint: focus-not-lost).
    this.output = document.createElement('div');
    this.output.className = 'streaming-response__output';
    this.output.tabIndex = -1;
    this.output.dataset.state = this.state;

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'streaming-response__content';

    this.activityEl = document.createElement('div');
    this.activityEl.className = 'streaming-response__activity';
    this.activityEl.setAttribute('aria-hidden', 'true');
    this.activityEl.hidden = true;
    const cursor = document.createElement('span');
    cursor.className = 'streaming-response__cursor';
    this.activityEl.append(cursor);

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'streaming-response__error';
    this.errorEl.setAttribute('role', 'alert');
    this.errorEl.hidden = true;

    this.output.append(this.contentEl, this.activityEl, this.errorEl);

    this.stopBtn = document.createElement('button');
    this.stopBtn.type = 'button';
    this.stopBtn.className = 'streaming-response__stop';
    this.stopBtn.setAttribute('aria-label', 'Stop generation');
    this.stopBtn.textContent = 'Stop';
    this.stopBtn.hidden = true;
    this.stopBtn.addEventListener('click', () => this.stop());

    this.noticeEl = document.createElement('div');
    this.noticeEl.className = 'streaming-response__notice';
    this.noticeEl.textContent = 'Generation stopped. Partial output preserved.';
    this.noticeEl.hidden = true;

    this.wrapper.append(this.liveRegion, this.output, this.stopBtn, this.noticeEl);
    this.root.append(this.wrapper);
  }

  /** Enters streaming from idle or any settled state (restart-safe). */
  startStream() {
    this.state = 'streaming';
    this.content = '';
    this.error = null;
    this.contentEl.textContent = '';
    this.errorEl.hidden = true;
    this.errorEl.textContent = '';
    this.noticeEl.hidden = true;
    this.activityEl.hidden = false;
    this.stopBtn.hidden = false;
    this.output.dataset.state = this.state;
    // Reset so a second completion re-announces even with identical text.
    this.liveRegion.textContent = '';
  }

  appendContent(chunk) {
    if (this.state !== 'streaming') return;
    this.content += chunk;
    this.contentEl.textContent = this.content;
  }

  completeStream() {
    if (this.state !== 'streaming') return;
    this.#settle('completed', 'Response complete.');
  }

  failStream(error) {
    if (this.state !== 'streaming') return;
    this.error = error;
    // role="alert" announces assertively when unhidden; the polite region
    // stays quiet to avoid a double announcement.
    this.errorEl.textContent = `Generation failed: ${error}`;
    this.errorEl.hidden = false;
    this.#settle('errored', '');
  }

  stop() {
    if (this.state !== 'streaming') return;
    this.#settle('interrupted', 'Generation stopped.');
    this.noticeEl.hidden = false;
    this.onStop?.();
  }

  #settle(state, announcement) {
    // Reclaim focus before hiding the control that holds it
    // (constraint: focus-not-lost); no-op when focus is elsewhere
    // (constraint: no-focus-steal).
    if (document.activeElement === this.stopBtn) this.output.focus();
    this.state = state;
    this.activityEl.hidden = true;
    this.stopBtn.hidden = true;
    this.output.dataset.state = state;
    if (announcement) this.liveRegion.textContent = announcement;
  }

  getContent() {
    return this.content;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'idle';
    this.content = '';
    this.error = null;
    this.contentEl.textContent = '';
    this.errorEl.hidden = true;
    this.errorEl.textContent = '';
    this.noticeEl.hidden = true;
    this.activityEl.hidden = true;
    this.stopBtn.hidden = true;
    this.output.dataset.state = this.state;
    this.liveRegion.textContent = '';
  }

  destroy() {
    this.wrapper?.removeEventListener('keydown', this.handleKeydown);
    this.wrapper?.remove();
    this.wrapper = null;
    this.root = null;
  }
}
