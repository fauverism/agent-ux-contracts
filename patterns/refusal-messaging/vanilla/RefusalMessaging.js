/**
 * RefusalMessaging — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 *
 * Build-once DOM, mutated in place (see patterns/TEMPLATE.md conventions).
 */

/** Announcement copy per refusal kind (constraint: refusal-announced). */
export const REFUSAL_ANNOUNCEMENTS = {
  full: 'Request declined.',
  partial: 'Request partially completed; the rest was declined.',
};

let policyIdCounter = 0;

export class RefusalMessaging {
  /**
   * @param {object} options
   * @param {string} options.statement What was declined, scoped precisely.
   * @param {string} options.reason Why, in plain language for this request.
   * @param {Array<{label: string, onSelect?: () => void, href?: string}>} options.alternatives
   *   At least one forward path (constraint: alternative-offered).
   * @param {string} [options.fulfilledText] Delivered portion of a partial
   *   refusal (constraint: partial-honored).
   * @param {string} [options.policyDetail] Expandable policy reference.
   */
  constructor({ statement, reason, alternatives, fulfilledText, policyDetail }) {
    if (!reason) {
      throw new Error('refusal-messaging: reason-given requires a reason');
    }
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      throw new Error(
        'refusal-messaging: alternative-offered requires at least one alternative',
      );
    }
    this.statement = statement;
    this.reason = reason;
    this.alternatives = alternatives;
    this.fulfilledText = fulfilledText;
    this.policyDetail = policyDetail;
    this.policyOpen = false;

    this.root = null;
    this.wrapper = null;
    this.liveRegion = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('RefusalMessaging: container not found');

    const kind = this.fulfilledText ? 'partial' : 'full';

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'refusal-messaging';
    this.wrapper.dataset.kind = kind;

    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.wrapper.append(this.liveRegion);

    if (this.fulfilledText) {
      const fulfilled = document.createElement('div');
      fulfilled.className = 'refusal-messaging__fulfilled';
      fulfilled.textContent = this.fulfilledText;
      this.wrapper.append(fulfilled);
    }

    // Status semantics, never role="alert" — a refusal is a decision, not a
    // malfunction (constraint: refusal-distinct-from-error).
    const refusal = document.createElement('div');
    refusal.className = 'refusal-messaging__refusal';

    const statementEl = document.createElement('p');
    statementEl.className = 'refusal-messaging__statement';
    statementEl.textContent = this.statement;

    const reasonEl = document.createElement('p');
    reasonEl.className = 'refusal-messaging__reason';
    reasonEl.textContent = this.reason;

    // Exactly the provided alternatives; no built-in retry
    // (constraint: no-verbatim-retry).
    const list = document.createElement('ul');
    list.className = 'refusal-messaging__alternatives';
    for (const alternative of this.alternatives) {
      const item = document.createElement('li');
      if (alternative.href) {
        const link = document.createElement('a');
        link.href = alternative.href;
        link.textContent = alternative.label;
        item.append(link);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = alternative.label;
        if (alternative.onSelect) button.addEventListener('click', alternative.onSelect);
        item.append(button);
      }
      list.append(item);
    }

    refusal.append(statementEl, reasonEl, list);

    if (this.policyDetail) {
      const policyId = `refusal-policy-${(policyIdCounter += 1)}`;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'refusal-messaging__policy-toggle';
      toggle.textContent = 'Why this is declined';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', policyId);

      const detail = document.createElement('div');
      detail.id = policyId;
      detail.className = 'refusal-messaging__policy';
      detail.textContent = this.policyDetail;
      detail.hidden = true;

      toggle.addEventListener('click', () => {
        this.policyOpen = !this.policyOpen;
        toggle.setAttribute('aria-expanded', String(this.policyOpen));
        detail.hidden = !this.policyOpen;
      });

      refusal.append(toggle, detail);
    }

    this.wrapper.append(refusal);
    this.root.append(this.wrapper);

    // Live regions announce changes, not initial content — set the text after
    // the region is in the document (constraint: refusal-announced).
    this.liveRegion.textContent = REFUSAL_ANNOUNCEMENTS[kind];
  }

  destroy() {
    this.wrapper?.remove();
    this.wrapper = null;
    this.root = null;
  }
}
