/**
 * ErrorRecovery — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 *
 * The DOM is built once at mount; failures swap text in place. The textarea
 * is never rebuilt, so user edits genuinely survive every failure.
 */

/**
 * The error taxonomy. Every kind maps to a plain-language summary and at
 * least one recovery action (constraints: actionable-error,
 * plain-language-summary, refusal-distinguished).
 */
export const FAILURE_COPY = {
  network: {
    summary: "Couldn't reach the service. Your prompt is saved — try again.",
    action: 'Try again',
  },
  timeout: {
    summary: 'The request timed out. Your prompt is saved — try again.',
    action: 'Try again',
  },
  overloaded: {
    summary: 'The service is overloaded right now. Wait a moment, then try again.',
    action: 'Try again',
  },
  refusal: {
    summary: 'The model declined this request. Rewording often helps — edit your prompt and resend.',
    action: 'Edit and resend',
  },
  tool: {
    summary: 'A tool the model used failed. Retry, or rephrase to avoid that step.',
    action: 'Try again',
  },
  unknown: {
    summary: 'Something went wrong. Your prompt is saved — try again.',
    action: 'Try again',
  },
};

let detailIdCounter = 0;

export class ErrorRecovery {
  /**
   * @param {object} options
   * @param {string} [options.input] Initial prompt text.
   * @param {() => void | Promise<void>} options.onRetry Re-submits the (possibly edited) input.
   */
  constructor({ input = '', onRetry }) {
    this.initialInput = input;
    this.onRetry = onRetry;
    this.failure = null;
    this.inFlight = false;

    this.root = null;
    this.alertEl = null;
    this.retryStatusEl = null;
    this.inputEl = null;
    this.actionsEl = null;
    this.retryBtn = null;
    this.detailToggle = null;
    this.detailEl = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('ErrorRecovery: container not found');

    const detailId = `error-detail-${(detailIdCounter += 1)}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'error-recovery';
    wrapper.dataset.state = 'idle';

    // One persistent alert region; text is replaced, never stacked.
    this.alertEl = document.createElement('div');
    this.alertEl.setAttribute('role', 'alert');
    this.alertEl.className = 'error-recovery__summary';

    this.retryStatusEl = document.createElement('div');
    this.retryStatusEl.setAttribute('role', 'status');
    this.retryStatusEl.setAttribute('aria-live', 'polite');
    this.retryStatusEl.className = 'sr-only';

    // Built once, never rebuilt (constraint: input-preserved).
    this.inputEl = document.createElement('textarea');
    this.inputEl.className = 'error-recovery__input';
    this.inputEl.setAttribute('aria-label', 'Your prompt');
    this.inputEl.value = this.initialInput;

    this.actionsEl = document.createElement('div');
    this.actionsEl.className = 'error-recovery__actions';
    this.actionsEl.hidden = true;

    this.retryBtn = document.createElement('button');
    this.retryBtn.type = 'button';
    this.retryBtn.className = 'error-recovery__retry';
    this.retryBtn.addEventListener('click', () => this.retry());

    this.detailToggle = document.createElement('button');
    this.detailToggle.type = 'button';
    this.detailToggle.className = 'error-recovery__detail-toggle';
    this.detailToggle.textContent = 'Technical details';
    this.detailToggle.setAttribute('aria-expanded', 'false');
    this.detailToggle.setAttribute('aria-controls', detailId);

    this.detailEl = document.createElement('pre');
    this.detailEl.id = detailId;
    this.detailEl.className = 'error-recovery__detail';
    this.detailEl.hidden = true;

    this.detailToggle.addEventListener('click', () => {
      this.detailEl.hidden = !this.detailEl.hidden;
      this.detailToggle.setAttribute('aria-expanded', String(!this.detailEl.hidden));
    });

    this.actionsEl.append(this.retryBtn, this.detailToggle, this.detailEl);
    wrapper.append(this.alertEl, this.retryStatusEl, this.inputEl, this.actionsEl);
    this.root.append(wrapper);
  }

  /**
   * @param {{kind: keyof typeof FAILURE_COPY, message?: string, detail?: string}} failure
   */
  showFailure(failure) {
    this.failure = failure;
    const copy = FAILURE_COPY[failure.kind] ?? FAILURE_COPY.unknown;

    this.root.querySelector('.error-recovery').dataset.state = 'errored';
    this.alertEl.textContent = copy.summary;
    this.retryBtn.textContent = copy.action;
    this.actionsEl.hidden = false;

    const technical = [failure.message, failure.detail].filter(Boolean).join('\n');
    this.detailEl.textContent = technical;
    this.detailToggle.hidden = technical.length === 0;
  }

  clearFailure() {
    this.failure = null;
    this.root.querySelector('.error-recovery').dataset.state = 'idle';
    this.alertEl.textContent = '';
    this.actionsEl.hidden = true;
  }

  /** Single-flight: repeat activations while busy are no-ops
   *  (constraint: retry-single-flight). */
  async retry() {
    if (this.inFlight) return;
    this.inFlight = true;
    this.retryBtn.setAttribute('aria-disabled', 'true');
    this.retryBtn.setAttribute('aria-busy', 'true');
    this.retryStatusEl.textContent = 'Retrying…';
    this.root.querySelector('.error-recovery').dataset.state = 'retrying';
    try {
      await this.onRetry();
    } finally {
      this.inFlight = false;
      this.retryBtn.removeAttribute('aria-disabled');
      this.retryBtn.removeAttribute('aria-busy');
      this.retryStatusEl.textContent = '';
      if (this.failure) {
        this.root.querySelector('.error-recovery').dataset.state = 'errored';
      }
    }
  }

  getInput() {
    return this.inputEl.value;
  }
}
