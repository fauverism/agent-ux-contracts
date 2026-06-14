/**
 * SourceAttribution — vanilla JavaScript implementation.
 * Contract compliance: see COMPLIANCE.md.
 *
 * A kit, not a single widget: citation anchors weave through host content,
 * and the consolidated source list renders wherever the host mounts it.
 */

/**
 * Removes duplicate sources by id, preserving first-seen order.
 * Constraint `no-citation-spam`: identical claims share one entry.
 * @param {Array<{id: string}>} sources
 */
export function consolidateSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

export class SourceAttribution {
  /**
   * @param {object} options
   * @param {Array<{id: string, title: string, url: string, publisher?: string, publishedAt?: string, note?: string}>} options.sources
   * @param {string} [options.label] Accessible heading for the source list.
   */
  constructor({ sources, label = 'Sources' }) {
    this.sources = consolidateSources(sources);
    this.label = label;
  }

  /** 1-based index of a source in the consolidated list, or -1. */
  indexOf(sourceId) {
    return this.sources.findIndex((s) => s.id === sourceId) + 1;
  }

  /**
   * Builds an inline citation anchor: a real link (keyboard-operable),
   * superscript bracketed number, not color-dependent
   * (constraints: citation-clickable, citation-distinct).
   * @returns {HTMLElement}
   */
  createAnchor(sourceId) {
    const index = this.indexOf(sourceId);
    const source = this.sources[index - 1];
    if (!source) throw new Error(`SourceAttribution: unknown source "${sourceId}"`);

    const sup = document.createElement('sup');
    sup.className = 'source-attribution__anchor';

    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Source ${index}: ${source.title}`);
    link.textContent = `[${index}]`;

    sup.append(link);
    return sup;
  }

  /**
   * Renders the consolidated bibliography into a container. Metadata is
   * on-page so users judge credibility without leaving
   * (constraint: metadata-available).
   */
  renderList(container) {
    const root =
      typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) throw new Error('SourceAttribution: container not found');

    root.textContent = '';
    if (this.sources.length === 0) return;

    const section = document.createElement('section');
    section.className = 'source-attribution__list';
    section.setAttribute('aria-label', this.label);

    const heading = document.createElement('h2');
    heading.className = 'source-attribution__heading';
    heading.textContent = this.label;
    section.append(heading);

    const list = document.createElement('ol');
    for (const source of this.sources) {
      const item = document.createElement('li');
      item.id = `source-${source.id}`;

      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source.title;
      item.append(link);

      const meta = document.createElement('span');
      meta.className = 'source-attribution__meta';
      const parts = [];
      if (source.publisher) parts.push(` — ${source.publisher}`);
      meta.textContent = parts.join('');
      if (source.publishedAt) {
        const time = document.createElement('time');
        time.dateTime = source.publishedAt;
        time.textContent = ` (${source.publishedAt})`;
        meta.append(time);
      }
      item.append(meta);

      if (source.note) {
        const note = document.createElement('p');
        note.className = 'source-attribution__note';
        note.textContent = source.note;
        item.append(note);
      }

      list.append(item);
    }

    section.append(list);
    root.append(section);
  }

  /**
   * Marks a passage as reasoning/generation with no retrieval grounding
   * (constraint: uncited-labeled).
   */
  static markUncited(element, label = 'Model reasoning — no source') {
    element.classList.add('source-attribution__uncited');
    element.dataset.cited = 'false';

    const labelEl = document.createElement('span');
    labelEl.className = 'source-attribution__uncited-label';
    labelEl.textContent = label;
    element.append(labelEl);
    return element;
  }
}
