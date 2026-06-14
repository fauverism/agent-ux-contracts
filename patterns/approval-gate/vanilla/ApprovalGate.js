/**
 * ApprovalGate — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 */

/** Live-region announcements per status (constraint: gate-announced). */
export const GATE_ANNOUNCEMENTS = {
  proposed: 'Approval required',
  executing: 'Approved — executing…',
  completed: 'Action completed.',
  failed: 'Action failed after approval.',
  rejected: 'Rejected — nothing was executed.',
};

let detailIdCounter = 0;

export class ApprovalGate {
  /**
   * @param {object} options
   * @param {string} options.summary Plain-language action: verb + target + scope.
   * @param {string} options.payload The exact payload that will execute.
   * @param {boolean} [options.irreversible]
   * @param {string} [options.consequence] e.g. "Affects 14 records".
   * @param {() => void | Promise<void>} options.onApprove
   * @param {() => void} [options.onReject]
   */
  constructor(options) {
    this.options = options;
    this.status = 'proposed';
    this.root = null;
    this.statusEl = null;
    this.outcomeEl = null;
    this.decisionsEl = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('ApprovalGate: container not found');

    const { summary, payload, irreversible, consequence } = this.options;
    const detailId = `approval-detail-${(detailIdCounter += 1)}`;

    const gate = document.createElement('div');
    gate.className = 'approval-gate';
    gate.dataset.status = this.status;
    gate.setAttribute('role', 'group');
    gate.setAttribute('aria-label', `Approval required: ${summary}`);
    gate.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.reject();
    });

    this.statusEl = document.createElement('div');
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.className = 'sr-only';

    const summaryEl = document.createElement('p');
    summaryEl.className = 'approval-gate__summary';
    summaryEl.textContent = summary;
    if (irreversible) {
      const warn = document.createElement('strong');
      warn.className = 'approval-gate__irreversible';
      warn.textContent = ' Cannot be undone.';
      summaryEl.append(warn);
    }
    if (consequence) {
      const note = document.createElement('span');
      note.className = 'approval-gate__consequence';
      note.textContent = ` ${consequence}`;
      summaryEl.append(note);
    }

    const detailToggle = document.createElement('button');
    detailToggle.type = 'button';
    detailToggle.className = 'approval-gate__detail-toggle';
    detailToggle.textContent = 'Show exactly what will run';
    detailToggle.setAttribute('aria-expanded', 'false');
    detailToggle.setAttribute('aria-controls', detailId);

    const detail = document.createElement('pre');
    detail.id = detailId;
    detail.className = 'approval-gate__detail';
    detail.hidden = true;
    detail.textContent = payload;

    detailToggle.addEventListener('click', () => {
      detail.hidden = !detail.hidden;
      detailToggle.setAttribute('aria-expanded', String(!detail.hidden));
    });

    // Reject precedes approve in DOM and tab order; nothing is auto-focused
    // (constraint: no-preselected-approve).
    this.decisionsEl = document.createElement('div');
    this.decisionsEl.className = 'approval-gate__decisions';

    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'approval-gate__reject';
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', () => this.reject());

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'approval-gate__approve';
    approveBtn.textContent = 'Approve';
    approveBtn.setAttribute('aria-label', `Approve: ${summary}`);
    // The ONLY path to onApprove (constraint: explicit-consent).
    approveBtn.addEventListener('click', () => this.approve());

    this.decisionsEl.append(rejectBtn, approveBtn);

    this.outcomeEl = document.createElement('p');
    this.outcomeEl.className = 'approval-gate__outcome';
    this.outcomeEl.hidden = true;

    gate.append(this.statusEl, summaryEl, detailToggle, detail, this.decisionsEl, this.outcomeEl);
    this.root.append(gate);

    // Announce arrival as a post-mount *change* so live regions speak it.
    this.statusEl.textContent = `${GATE_ANNOUNCEMENTS.proposed}: ${summary}`;
  }

  setStatus(status) {
    this.status = status;
    this.root.querySelector('.approval-gate').dataset.status = status;
    this.statusEl.textContent = GATE_ANNOUNCEMENTS[status];
    if (status !== 'proposed') {
      this.decisionsEl.hidden = true;
      this.outcomeEl.hidden = false;
      this.outcomeEl.textContent = GATE_ANNOUNCEMENTS[status];
    }
  }

  async approve() {
    if (this.status !== 'proposed') return;
    this.setStatus('executing');
    try {
      await this.options.onApprove();
      this.setStatus('completed');
    } catch {
      this.setStatus('failed');
    }
  }

  reject() {
    if (this.status !== 'proposed') return;
    this.setStatus('rejected');
    this.options.onReject?.();
  }
}
