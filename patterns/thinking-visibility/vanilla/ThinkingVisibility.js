/**
 * ThinkingVisibility — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 */

/** Announced through the polite live region on each phase change (constraint: phase-announced). */
export const PHASE_MESSAGES = {
  idle: '',
  thinking: 'Model is thinking…',
  answering: 'Writing the answer…',
  completed: 'Response complete.',
};

let regionIdCounter = 0;

export class ThinkingVisibility {
  /**
   * @param {object} [options]
   * @param {string} [options.label] Label for the reasoning region.
   */
  constructor({ label = 'Working notes' } = {}) {
    this.label = label;
    this.phase = 'idle';
    // null = follow phase; true/false = explicit user choice wins
    // (constraint: collapse-after-answer collapses unless the user expanded).
    this.userToggled = null;

    this.root = null;
    this.statusEl = null;
    this.disclosureEl = null;
    this.regionEl = null;
    this.answerEl = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('ThinkingVisibility: container not found');

    const regionId = `thinking-region-${(regionIdCounter += 1)}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'thinking-visibility';
    wrapper.dataset.phase = this.phase;

    this.statusEl = document.createElement('div');
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.className = 'sr-only';

    this.disclosureEl = document.createElement('button');
    this.disclosureEl.type = 'button';
    this.disclosureEl.className = 'thinking-visibility__disclosure';
    this.disclosureEl.textContent = this.label;
    this.disclosureEl.setAttribute('aria-controls', regionId);
    this.disclosureEl.addEventListener('click', () => {
      this.userToggled = !this.isExpanded();
      this.applyExpansion();
    });

    // Separately-labeled group, visually subordinate to the answer
    // (constraint: reasoning-distinct). Inline — never an overlay —
    // so the rest of the page stays interactive (constraint: non-blocking).
    this.regionEl = document.createElement('section');
    this.regionEl.id = regionId;
    this.regionEl.className = 'thinking-visibility__region';
    this.regionEl.setAttribute('aria-label', this.label);

    this.answerEl = document.createElement('div');
    this.answerEl.className = 'thinking-visibility__answer';

    wrapper.append(this.statusEl, this.disclosureEl, this.regionEl, this.answerEl);
    this.root.append(wrapper);
    this.applyExpansion();
  }

  isExpanded() {
    return this.userToggled ?? (this.phase === 'thinking' || this.phase === 'answering');
  }

  applyExpansion() {
    const expanded = this.isExpanded();
    this.disclosureEl.setAttribute('aria-expanded', String(expanded));
    this.regionEl.hidden = !expanded;
  }

  /** @param {'idle'|'thinking'|'answering'|'completed'} phase */
  setPhase(phase) {
    this.phase = phase;
    this.root.querySelector('.thinking-visibility').dataset.phase = phase;
    this.statusEl.textContent = PHASE_MESSAGES[phase];
    this.applyExpansion();
  }

  /** Streams a reasoning chunk into the region as it arrives. */
  appendThinking(chunk) {
    this.regionEl.append(document.createTextNode(chunk));
  }

  /** Host renders the final answer into this container. */
  getAnswerContainer() {
    return this.answerEl;
  }
}
