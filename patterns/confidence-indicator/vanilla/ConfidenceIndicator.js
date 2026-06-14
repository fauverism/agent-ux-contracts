/**
 * ConfidenceIndicator — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 */

/**
 * Single source of truth for level → label semantics.
 * Constraint `consistent-semantics`: the same term always means the same level.
 * Constraint `no-jargon`: plain language, no numeric scores.
 */
export const CONFIDENCE_LABELS = {
  high: 'High confidence',
  moderate: 'Likely',
  low: 'Uncertain',
  conditional: 'Depends on assumptions',
  refusal: "Can't answer",
};

let detailIdCounter = 0;

export class ConfidenceIndicator {
  /**
   * @param {object} options
   * @param {'high'|'moderate'|'low'|'conditional'|'refusal'} options.level
   * @param {string} [options.detail] Why the model expressed this level.
   * @param {string} [options.refusalReason] Shown for the refusal level.
   * @param {string[]} [options.caveats] Shown for the conditional level.
   */
  constructor(options) {
    this.options = { ...options };
    this.expanded = false;
    this.root = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('ConfidenceIndicator: container not found');
    this.render();
  }

  update(options) {
    this.options = { ...this.options, ...options };
    this.render();
  }

  render() {
    const { level, detail, refusalReason, caveats } = this.options;
    const label = CONFIDENCE_LABELS[level];

    this.root.textContent = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'confidence-indicator';
    wrapper.dataset.level = level;

    const visual = document.createElement('span');
    visual.className = 'confidence-indicator__visual';
    visual.setAttribute('aria-hidden', 'true');
    wrapper.append(visual);

    const labelEl = document.createElement('span');
    labelEl.className = 'confidence-indicator__label';
    labelEl.textContent = label;
    wrapper.append(labelEl);

    if (detail) {
      const detailId = `confidence-detail-${(detailIdCounter += 1)}`;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'confidence-indicator__toggle';
      toggle.textContent = 'Why?';
      toggle.setAttribute('aria-expanded', String(this.expanded));
      toggle.setAttribute('aria-controls', detailId);

      const detailEl = document.createElement('div');
      detailEl.id = detailId;
      detailEl.className = 'confidence-indicator__detail';
      detailEl.hidden = !this.expanded;
      detailEl.textContent = detail;

      toggle.addEventListener('click', () => {
        this.expanded = !this.expanded;
        toggle.setAttribute('aria-expanded', String(this.expanded));
        detailEl.hidden = !this.expanded;
      });

      wrapper.append(toggle, detailEl);
    }

    if (level === 'refusal' && refusalReason) {
      const caveat = document.createElement('p');
      caveat.className = 'confidence-indicator__caveat';
      caveat.textContent = refusalReason;
      wrapper.append(caveat);
    }

    if (level === 'conditional' && Array.isArray(caveats) && caveats.length > 0) {
      const list = document.createElement('ul');
      list.className = 'confidence-indicator__caveat';
      for (const text of caveats) {
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      }
      wrapper.append(list);
    }

    this.root.append(wrapper);
  }
}
