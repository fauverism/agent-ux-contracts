/**
 * GenerationControl — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 */

export class GenerationControl {
  /**
   * @param {object} options
   * @param {string} options.initialOutput First generated output; variant 1.
   * @param {(refinement?: string) => Promise<string>} options.onGenerate
   *   Produces a new variant. Hosts append the refinement to the original
   *   context, never replace it (constraint: refine-carries-context).
   * @param {boolean} [options.withRefine] Shows the refine instruction field.
   */
  constructor({ initialOutput, onGenerate, withRefine = false }) {
    // Full history — appended, never replaced (constraint: no-silent-destruction).
    this.variants = [initialOutput];
    this.index = 0;
    this.busy = false;
    this.onGenerate = onGenerate;
    this.withRefine = withRefine;

    this.root = null;
    this.statusEl = null;
    this.outputEl = null;
    this.regenerateBtn = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.positionEl = null;
    this.refineEl = null;
  }

  mount(container) {
    this.root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.root) throw new Error('GenerationControl: container not found');

    const wrapper = document.createElement('div');
    wrapper.className = 'generation-control';
    wrapper.dataset.state = 'generated';

    this.statusEl = document.createElement('div');
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.statusEl.className = 'sr-only';

    this.outputEl = document.createElement('div');
    this.outputEl.className = 'generation-control__output';

    const bar = document.createElement('div');
    bar.className = 'generation-control__bar';

    this.regenerateBtn = document.createElement('button');
    this.regenerateBtn.type = 'button';
    this.regenerateBtn.className = 'generation-control__regenerate';
    this.regenerateBtn.textContent = 'New version';
    this.regenerateBtn.addEventListener('click', () => this.regenerate());

    const nav = document.createElement('nav');
    nav.className = 'generation-control__navigator';
    nav.setAttribute('aria-label', 'Variants');

    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.setAttribute('aria-label', 'Previous variant');
    this.prevBtn.textContent = '‹';
    this.prevBtn.addEventListener('click', () => this.show(this.index - 1));

    this.positionEl = document.createElement('span');
    this.positionEl.className = 'generation-control__position';

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.setAttribute('aria-label', 'Next variant');
    this.nextBtn.textContent = '›';
    this.nextBtn.addEventListener('click', () => this.show(this.index + 1));

    nav.append(this.prevBtn, this.positionEl, this.nextBtn);
    bar.append(this.regenerateBtn, nav);
    wrapper.append(this.statusEl, this.outputEl, bar);

    if (this.withRefine) {
      // The instruction persists across generations; it is never reset.
      this.refineEl = document.createElement('input');
      this.refineEl.type = 'text';
      this.refineEl.className = 'generation-control__refine';
      this.refineEl.placeholder = 'e.g. shorter, more formal';
      this.refineEl.setAttribute('aria-label', 'Adjustment for the next version');
      wrapper.append(this.refineEl);
    }

    this.root.append(wrapper);
    this.renderCurrent();
  }

  positionLabel() {
    return `Variant ${this.index + 1} of ${this.variants.length}`;
  }

  renderCurrent() {
    this.outputEl.textContent = this.variants[this.index];
    this.positionEl.textContent = this.positionLabel();
    // Navigation disables at the ends rather than wrapping silently.
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index === this.variants.length - 1;
  }

  show(nextIndex) {
    if (nextIndex < 0 || nextIndex >= this.variants.length) return;
    this.index = nextIndex;
    this.renderCurrent();
    this.statusEl.textContent = `Showing variant ${this.index + 1} of ${this.variants.length}.`;
  }

  /** Single-flight: repeat activations while busy are no-ops
   *  (constraint: single-flight-regeneration). */
  async regenerate() {
    if (this.busy) return;
    this.busy = true;
    this.root.querySelector('.generation-control').dataset.state = 'regenerating';
    this.regenerateBtn.setAttribute('aria-disabled', 'true');
    this.regenerateBtn.setAttribute('aria-busy', 'true');
    this.regenerateBtn.textContent = 'Generating…';
    this.statusEl.textContent = 'Generating a new variant…';

    try {
      const refinement = this.refineEl?.value.trim() || undefined;
      const output = await this.onGenerate(refinement);
      this.variants.push(output);
      this.index = this.variants.length - 1;
      this.renderCurrent();
      this.statusEl.textContent = `Variant ${this.variants.length} of ${this.variants.length} ready.`;
    } catch {
      // Failed: the displayed variant remains intact and usable.
      this.statusEl.textContent = `Generation failed — still showing ${this.positionLabel().toLowerCase()}.`;
    } finally {
      this.busy = false;
      this.root.querySelector('.generation-control').dataset.state = 'generated';
      this.regenerateBtn.removeAttribute('aria-disabled');
      this.regenerateBtn.removeAttribute('aria-busy');
      this.regenerateBtn.textContent = 'New version';
    }
  }
}
