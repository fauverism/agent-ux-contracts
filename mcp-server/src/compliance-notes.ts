/**
 * Constraint → code anchors for scaffold compliance_notes — DESIGN.md §1/§4.
 *
 * Anchors are literal strings that must appear in the generated component
 * file (exported symbols, attribute literals, guard expressions — never
 * line numbers). The scaffold test suite verifies that every MUST and
 * MUST_NOT constraint of every pattern has an entry here and that each
 * anchor exists in the emitted code; drift between reference
 * implementations and this table fails CI.
 */

export interface ComplianceEntry {
  /** Constraint id from the contract. */
  id: string;
  /** Anchor string per framework; must appear verbatim in the component file. */
  anchor: { react: string; vanilla: string };
  note: string;
}

export const COMPLIANCE_NOTES: Record<string, ComplianceEntry[]> = {
  'streaming-response': [
    {
      id: 'no-focus-steal',
      anchor: { react: 'reclaimFocusFromStop', vanilla: 'document.activeElement === this.stopBtn' },
      note: 'Focus is moved only when the stop control itself holds it; every other focus state is left untouched.',
    },
    {
      id: 'focus-not-lost',
      anchor: { react: 'tabIndex={-1}', vanilla: 'this.output.tabIndex = -1' },
      note: 'The output region is a programmatic focus target; settling while the stop control has focus relocates focus there instead of body.',
    },
    {
      id: 'completion-announced',
      anchor: { react: 'ANNOUNCEMENTS', vanilla: 'this.liveRegion.textContent = announcement' },
      note: 'A persistent polite role="status" region receives the completion text as a change, so assistive technology announces it — including after a restart.',
    },
    {
      id: 'interruptible',
      anchor: { react: 'handleStop', vanilla: "this.#settle('interrupted'" },
      note: 'The stop path settles to interrupted immediately and latches; a host still reporting an active stream cannot overwrite a user stop.',
    },
    {
      id: 'partial-preserved',
      anchor: { react: 'streaming-response__content', vanilla: 'this.contentEl.textContent = this.content' },
      note: 'Content rendering depends only on accumulated content, never on the settled state; nothing hides or removes it on interruption or failure.',
    },
  ],
  'prompt-composer': [
    {
      id: 'composer-labeled',
      anchor: { react: 'htmlFor={inputId}', vanilla: 'labelEl.htmlFor = inputId' },
      note: 'A visible <label> is wired to the textarea id; placeholder is decorative only.',
    },
    {
      id: 'enter-submits',
      anchor: { react: "event.key !== 'Enter' || event.shiftKey", vanilla: "event.key !== 'Enter' || event.shiftKey" },
      note: 'Enter without Shift submits and prevents the newline; Shift+Enter falls through to the native newline.',
    },
    {
      id: 'ime-safe',
      anchor: { react: 'isComposing', vanilla: 'isComposing' },
      note: 'The keydown handler returns before submitting while an IME composition is active.',
    },
    {
      id: 'draft-preserved',
      anchor: { react: 'value={value}', vanilla: "this.setValue('')" },
      note: 'React: fully controlled, the component never mutates the draft. Vanilla: clear() is the only code path that empties the textarea.',
    },
    {
      id: 'no-silent-truncation',
      anchor: { react: 'over-limit', vanilla: 'over-limit' },
      note: 'No native maxLength; overage flips the over-limit state, keeps every character, and gates submission.',
    },
    {
      id: 'typing-never-locked',
      anchor: { react: 'prompt-composer__input', vanilla: 'prompt-composer__input' },
      note: 'No code path sets disabled or readOnly on the textarea in any state, including busy.',
    },
    {
      id: 'submit-state-accessible',
      anchor: { react: 'UNAVAILABLE_REASONS', vanilla: 'UNAVAILABLE_REASONS' },
      note: 'The submit button stays focusable via aria-disabled, with aria-describedby naming why submission is unavailable.',
    },
  ],
  'confidence-indicator': [
    {
      id: 'no-false-confidence',
      anchor: { react: 'data-level={level}', vanilla: 'dataset.level = level' },
      note: 'The level prop renders verbatim and is never re-mapped or inflated; calibration belongs to the data producer.',
    },
    {
      id: 'accessible-confidence',
      anchor: { react: 'CONFIDENCE_LABELS[level]', vanilla: 'CONFIDENCE_LABELS[level]' },
      note: 'The plain-language label always renders as text; the colored visual is aria-hidden decoration, never the only signal.',
    },
    {
      id: 'keyboard-expandable',
      anchor: { react: 'aria-expanded', vanilla: 'aria-expanded' },
      note: 'The detail disclosure is a native <button> with aria-expanded/aria-controls; no hover-only path exists.',
    },
    {
      id: 'consistent-semantics',
      anchor: { react: 'CONFIDENCE_LABELS', vanilla: 'CONFIDENCE_LABELS' },
      note: 'CONFIDENCE_LABELS is the exported single source of truth; a level can never display two different terms.',
    },
  ],
  'source-attribution': [
    {
      id: 'citation-clickable',
      anchor: { react: 'CitationAnchor', vanilla: 'createAnchor' },
      note: 'Citation markers are real <a href> links — focusable, Tab-reachable, Enter-activatable.',
    },
    {
      id: 'source-verifiable',
      anchor: { react: 'source.url', vanilla: 'link.href = source.url' },
      note: 'Anchors and list entries link directly to the source URL; the component never masks or rewrites targets.',
    },
    {
      id: 'citation-distinct',
      anchor: { react: '<sup', vanilla: "createElement('sup')" },
      note: 'Anchors render as superscript bracketed numbers with aria-label "Source N: title" — structural, not color-dependent.',
    },
    {
      id: 'no-citation-spam',
      anchor: { react: 'consolidateSources', vanilla: 'consolidateSources' },
      note: 'consolidateSources dedupes by id; anchors for the same source resolve to one list entry and one index.',
    },
  ],
  'thinking-visibility': [
    {
      id: 'reasoning-distinct',
      anchor: { react: 'thinking-visibility__region', vanilla: 'thinking-visibility__region' },
      note: 'Reasoning renders in its own labeled <section>, separate from the answer container, which is always the primary region.',
    },
    {
      id: 'disclosure-accessible',
      anchor: { react: 'aria-controls', vanilla: 'aria-controls' },
      note: 'The disclosure is a native <button> with aria-expanded and aria-controls wired to the region id.',
    },
    {
      id: 'phase-announced',
      anchor: { react: 'PHASE_MESSAGES', vanilla: 'PHASE_MESSAGES' },
      note: 'Each phase change replaces the polite live region text with PHASE_MESSAGES[phase], producing an announcement.',
    },
    {
      id: 'non-blocking',
      anchor: { react: '<section', vanilla: "createElement('section')" },
      note: 'The component renders inline — no overlay, focus trap, or inert siblings; the page stays interactive during thinking.',
    },
  ],
  'approval-gate': [
    {
      id: 'explicit-consent',
      anchor: { react: "status !== 'proposed'", vanilla: "this.status !== 'proposed'" },
      note: 'onApprove is reachable only through the approve handler, bound solely to the approve button and guarded on the proposed status.',
    },
    {
      id: 'accurate-preview',
      anchor: { react: 'onApprove(payload)', vanilla: 'onApprove(this.options.payload)' },
      note: 'The payload renders verbatim in the detail <pre>, and the approve handler receives that same string — execute the argument you are handed.',
    },
    {
      id: 'no-preselected-approve',
      anchor: { react: 'approval-gate__reject', vanilla: 'approval-gate__reject' },
      note: 'Nothing is auto-focused on mount, and reject precedes approve in DOM and tab order.',
    },
    {
      id: 'irreversible-labeled',
      anchor: { react: 'Cannot be undone', vanilla: 'Cannot be undone' },
      note: 'The irreversible flag renders a <strong> "Cannot be undone." inside the summary.',
    },
    {
      id: 'controls-accessible',
      anchor: { react: 'Approve: ${summary}', vanilla: 'Approve: ${summary}' },
      note: 'Both decisions are native buttons; the approve control’s accessible name carries the action it approves.',
    },
    {
      id: 'gate-announced',
      anchor: { react: 'GATE_ANNOUNCEMENTS', vanilla: 'GATE_ANNOUNCEMENTS' },
      note: 'The polite live region is populated after mount (live regions announce changes) and on every status transition.',
    },
  ],
  'error-recovery': [
    {
      id: 'input-preserved',
      anchor: { react: 'error-recovery__input', vanilla: 'error-recovery__input' },
      note: 'The prompt textarea exists and stays editable in every state; vanilla builds it once and never rebuilds it.',
    },
    {
      id: 'actionable-error',
      anchor: { react: 'FAILURE_COPY', vanilla: 'FAILURE_COPY' },
      note: 'FAILURE_COPY maps every failure kind to a summary and a recovery action; no failure renders without one.',
    },
    {
      id: 'plain-language-summary',
      anchor: { react: 'FAILURE_COPY', vanilla: 'FAILURE_COPY' },
      note: 'Summaries are plain language with a next step; raw provider messages render only inside the technical-details disclosure.',
    },
    {
      id: 'error-announced',
      anchor: { react: 'role="alert"', vanilla: "'role', 'alert'" },
      note: 'One persistent role="alert" element carries the summary; failure text replaces its content, never stacks.',
    },
    {
      id: 'retry-single-flight',
      anchor: { react: 'inFlight', vanilla: 'inFlight' },
      note: 'retry() no-ops while in flight; the button exposes aria-disabled and aria-busy during the attempt.',
    },
  ],
  'generation-control': [
    {
      id: 'no-silent-destruction',
      anchor: { react: '[...variants, output]', vanilla: 'this.variants.push(output)' },
      note: 'The variant history is append-only; regeneration pushes and navigates, never replaces.',
    },
    {
      id: 'variant-position-visible',
      anchor: { react: 'positionLabel', vanilla: 'positionLabel' },
      note: '"Variant N of M" renders in the navigator and updates on every navigation and arrival.',
    },
    {
      id: 'single-flight-regeneration',
      anchor: { react: 'if (busy) return;', vanilla: 'if (this.busy) return;' },
      note: 'regenerate() no-ops while busy; the control exposes aria-disabled and aria-busy.',
    },
    {
      id: 'controls-keyboard-operable',
      anchor: { react: 'Previous variant', vanilla: 'Previous variant' },
      note: 'Regenerate and both navigation controls are native <button>s with accessible names.',
    },
    {
      id: 'variant-change-announced',
      anchor: { react: 'Showing variant', vanilla: 'Showing variant' },
      note: 'The polite role="status" region announces generation progress, arrival, and navigation.',
    },
  ],
  'interruption-cancel': [
    {
      id: 'immediate-acknowledgment',
      anchor: { react: "setPhase('cancel-requested')", vanilla: "this.phase = 'cancel-requested'" },
      note: 'The cancel click flips the UI to cancel-requested synchronously, before the host abort round-trips.',
    },
    {
      id: 'no-silent-continuation',
      anchor: { react: 'wasRunning', vanilla: "this.phase !== 'running' && this.phase !== 'cancel-requested'" },
      note: 'Running is re-entered only on a rising edge of a fresh run; late progress renders without resetting the phase.',
    },
    {
      id: 'partial-work-honesty',
      anchor: { react: 'completedWork', vanilla: 'completedWork' },
      note: 'The settled summary lists side effects that already happened — cancel stops future work, it does not undo past work.',
    },
    {
      id: 'completion-race-honest',
      anchor: { react: 'RACE_DISCLOSURE', vanilla: 'RACE_DISCLOSURE' },
      note: 'If the work finished despite a pending cancel, the summary discloses the race instead of pretending the cancel won.',
    },
    {
      id: 'cancel-not-gated',
      anchor: { react: 'onClick={handleCancel}', vanilla: '() => this.requestCancel()' },
      note: 'The cancel control acts directly — no confirmation dialog stands between the user and stopping side effects.',
    },
    {
      id: 'cancel-control-accessible',
      anchor: { react: 'Cancel: ${workLabel}', vanilla: 'Cancel: ${this.workLabel}' },
      note: 'The cancel control’s accessible name carries the work it governs, not just "Cancel".',
    },
    {
      id: 'cancellation-announced',
      anchor: { react: 'WORK_ANNOUNCEMENTS', vanilla: 'WORK_ANNOUNCEMENTS' },
      note: 'Phase transitions are announced through the polite live region using the exported WORK_ANNOUNCEMENTS vocabulary.',
    },
    {
      id: 'focus-not-lost',
      anchor: { react: 'reclaimFocusFromCancel', vanilla: '#reclaimFocusFromCancel' },
      note: 'Removing the focused cancel control relocates focus to the work region instead of dropping it on body.',
    },
  ],
  'refusal-messaging': [
    {
      id: 'reason-given',
      anchor: { react: 'refusal-messaging__reason', vanilla: 'reason-given requires a reason' },
      note: 'Statement and reason are both required and render as visible text; the vanilla constructor throws without a reason.',
    },
    {
      id: 'alternative-offered',
      anchor: {
        react: 'alternative-offered requires at least one alternative',
        vanilla: 'alternative-offered requires at least one alternative',
      },
      note: 'At least one forward path is enforced loudly — non-empty tuple type in React plus a runtime throw in both implementations.',
    },
    {
      id: 'no-verbatim-retry',
      anchor: { react: 'refusal-messaging__alternatives', vanilla: 'refusal-messaging__alternatives' },
      note: 'Rendered actions are exactly the provided alternatives; no built-in retry control exists anywhere in the component.',
    },
    {
      id: 'partial-honored',
      anchor: { react: 'fulfilledContent', vanilla: 'fulfilledText' },
      note: 'The fulfilled portion of a mixed request renders as its own region; the refusal scopes itself to the remainder.',
    },
    {
      id: 'refusal-distinct-from-error',
      anchor: { react: 'role="status"', vanilla: "'role', 'status'" },
      note: 'Status semantics, never role="alert" — a refusal is a decision, not a malfunction.',
    },
    {
      id: 'refusal-announced',
      anchor: { react: 'REFUSAL_ANNOUNCEMENTS', vanilla: 'REFUSAL_ANNOUNCEMENTS' },
      note: 'The polite live region text is set after mount so the refusal is actually spoken, with distinct copy for partial refusals.',
    },
    {
      id: 'alternatives-accessible',
      anchor: { react: 'refusal-messaging__alternatives', vanilla: 'refusal-messaging__alternatives' },
      note: 'Alternatives are native buttons/links named by their path, keyboard-operable in document order.',
    },
  ],
};
