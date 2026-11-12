/**
 * Eval cases: realistic queries an agent would send, asserted on outcomes.
 * Phrasings deliberately use product language ("loading state", "the model
 * refused"), not catalog language — that gap is what the eval measures.
 */
export type Expectation =
  | { kind: 'top1'; id: string }
  | { kind: 'topN'; id: string; n: number }
  | { kind: 'caution'; id: string }
  | { kind: 'no_caution'; id: string }
  /** `id` carries a caution (optionally quoting `quotes`) and no other result does. */
  | { kind: 'caution_only'; id: string; quotes?: string }
  /** No result carries a caution. */
  | { kind: 'no_cautions' }
  | { kind: 'advisory' }
  | { kind: 'fallback' };

export interface EvalCase {
  name: string;
  query: string;
  category?: 'input' | 'output' | 'control' | 'feedback' | 'transparency';
  expect: Expectation;
}

/**
 * Caution regressions (DESIGN.md amendment 17). Every query here failed on
 * 2026-11-12 in a measurement of 100 queries, five that describe an excluded
 * case and five in-scope ones per pattern: the caution was missing, quoted
 * the wrong exclusion, or landed on a pattern the query was not about.
 * `excl-*` queries describe a pattern's dontUseWhen case and must draw that
 * pattern's caution and no other; `clean-*` queries are in scope and must
 * draw none.
 */
const CAUTION_REGRESSIONS: EvalCase[] = [
  { name: 'excl-appr-gate-1', query: 'confirm before the agent toggles a setting the user can undo in one click', expect: { kind: 'caution_only', id: 'approval-gate' } },
  { name: 'excl-appr-gate-2', query: 'approval prompt for every low-stakes reversible action', expect: { kind: 'caution_only', id: 'approval-gate' } },
  { name: 'excl-appr-gate-3', query: 'user already granted standing permission for this kind of action, ask again each time?', expect: { kind: 'caution_only', id: 'approval-gate' } },
  { name: 'excl-appr-gate-4', query: 'ask for consent before the agent reads a file', expect: { kind: 'caution_only', id: 'approval-gate' } },
  { name: 'excl-appr-gate-5', query: 'approval step for read-only operations with no side effects', expect: { kind: 'caution_only', id: 'approval-gate' } },
  { name: 'clean-appr-gate-6', query: 'show the exact command and wait for the user to approve it', expect: { kind: 'no_cautions' } },
  { name: 'excl-conf-indi-1', query: 'the API gives no confidence score or reasoning metadata, show certainty anyway', expect: { kind: 'caution_only', id: 'confidence-indicator' } },
  { name: 'excl-conf-indi-2', query: "showing uncertainty would only make users anxious and they can't do anything about it", expect: { kind: 'caution_only', id: 'confidence-indicator' } },
  { name: 'excl-conf-indi-3', query: 'we have no way to get per-answer certainty from the model', expect: { kind: 'caution_only', id: 'confidence-indicator' } },
  { name: 'clean-conf-indi-4', query: "the answer mixes retrieved facts with the model's own guesses, flag which is which", expect: { kind: 'no_cautions' } },
  { name: 'excl-erro-reco-1', query: 'requests are retried automatically in the background and the user never has to decide anything', expect: { kind: 'caution_only', id: 'error-recovery' } },
  { name: 'excl-erro-reco-2', query: 'the host platform already shows its own error UI for failures', expect: { kind: 'caution_only', id: 'error-recovery' } },
  { name: 'excl-erro-reco-3', query: 'our app shell already owns failure banners, should the component add its own', expect: { kind: 'caution_only', id: 'error-recovery' } },
  { name: 'clean-erro-reco-4', query: 'context window overflow error, tell the user to shorten their input', expect: { kind: 'no_cautions' } },
  { name: 'clean-erro-reco-5', query: 'show a plain-language error instead of a stack trace when generation fails', expect: { kind: 'no_cautions' } },
  { name: 'excl-gene-cont-1', query: 'temperature is zero, the same prompt always returns the same answer, add a regenerate button?', expect: { kind: 'caution_only', id: 'generation-control' } },
  { name: 'excl-gene-cont-2', query: 'each generation is expensive and has side effects, should retry be one click', expect: { kind: 'caution_only', id: 'generation-control' } },
  { name: 'excl-gene-cont-3', query: 'there must be exactly one authoritative result, no alternatives', expect: { kind: 'caution_only', id: 'generation-control' } },
  { name: 'excl-gene-cont-4', query: "every run costs real money so we don't want people re-rolling casually", expect: { kind: 'caution_only', id: 'generation-control' } },
  { name: 'clean-gene-cont-5', query: 're-roll the image without losing the previous one', expect: { kind: 'no_cautions' } },
  { name: 'clean-gene-cont-6', query: 'refine the last answer with a small tweak instead of retyping the prompt', expect: { kind: 'no_cautions' } },
  { name: 'excl-inte-canc-1', query: 'the operation finishes instantly, is a cancel button worth adding', expect: { kind: 'caution_only', id: 'interruption-cancel' } },
  { name: 'excl-inte-canc-2', query: "we can't actually stop the job once it starts, should we show a cancel button anyway", expect: { kind: 'caution_only', id: 'interruption-cancel' } },
  { name: 'excl-inte-canc-3', query: 'cancel button that only hides the spinner while the backend keeps running', expect: { kind: 'caution_only', id: 'interruption-cancel', quotes: 'Cancellation cannot actually stop' } },
  { name: 'clean-inte-canc-4', query: 'add a cancel button that actually stops the in-flight request', expect: { kind: 'no_cautions' } },
  { name: 'clean-inte-canc-5', query: 'stop a multi-step agent run and tell the user what already happened', expect: { kind: 'no_cautions' } },
  { name: 'clean-inte-canc-6', query: 'abort a long-running tool call with AbortController', expect: { kind: 'no_cautions' } },
  { name: 'excl-prom-comp-1', query: 'regular form field where pressing Enter should not submit', expect: { kind: 'caution_only', id: 'prompt-composer' } },
  { name: 'excl-prom-comp-2', query: 'short one-line input, like a search field', expect: { kind: 'caution_only', id: 'prompt-composer' } },
  { name: 'excl-prom-comp-3', query: 'multi-field signup form with validation messages', expect: { kind: 'caution_only', id: 'prompt-composer' } },
  { name: 'clean-prom-comp-4', query: "typing Japanese with an IME shouldn't send the message early", expect: { kind: 'no_cautions' } },
  { name: 'clean-prom-comp-5', query: 'disable the send button while the model is busy but keep the text box usable', expect: { kind: 'no_cautions' } },
  { name: 'excl-refu-mess-1', query: "the model didn't answer because the server was overloaded, is that a refusal", expect: { kind: 'caution_only', id: 'refusal-messaging' } },
  { name: 'excl-refu-mess-2', query: 'we are not allowed to disclose the reason for the block', expect: { kind: 'caution_only', id: 'refusal-messaging' } },
  { name: 'clean-refu-mess-3', query: 'why did the assistant say no', expect: { kind: 'no_cautions' } },
  { name: 'clean-refu-mess-4', query: 'safety refusal with a suggestion for what the user can try instead', expect: { kind: 'no_cautions' } },
  { name: 'clean-refu-mess-5', query: "decline message that doesn't look like an error", expect: { kind: 'no_cautions' } },
  { name: 'excl-sour-attr-1', query: 'sources are internal documents we cannot share with users', expect: { kind: 'caution_only', id: 'source-attribution' } },
  { name: 'excl-sour-attr-2', query: 'no RAG, the model writes from its own knowledge, add source links?', expect: { kind: 'caution_only', id: 'source-attribution' } },
  { name: 'excl-sour-attr-3', query: 'too many source links would clutter and distract from the answer', expect: { kind: 'caution_only', id: 'source-attribution' } },
  { name: 'clean-sour-attr-4', query: 'show which web pages the answer came from', expect: { kind: 'no_cautions' } },
  { name: 'excl-stre-resp-1', query: 'validate and moderate the full output before showing any of it', expect: { kind: 'caution_only', id: 'streaming-response' } },
  { name: 'excl-stre-resp-2', query: 'we have to run the whole reply through a safety filter before the user sees anything', expect: { kind: 'caution_only', id: 'streaming-response' } },
  { name: 'excl-stre-resp-3', query: 'responses are short and come back almost instantly, should I stream them', expect: { kind: 'caution_only', id: 'streaming-response' } },
  { name: 'excl-stre-resp-4', query: 'the output triggers an irreversible action, so it must not run on a partial result', expect: { kind: 'caution_only', id: 'streaming-response' } },
  { name: 'excl-stre-resp-5', query: 'answers are one sentence and take 200ms, is streaming worth it', expect: { kind: 'caution_only', id: 'streaming-response' } },
  { name: 'clean-stre-resp-6', query: 'typewriter effect, tokens appear one by one', expect: { kind: 'no_cautions' } },
  { name: 'clean-stre-resp-7', query: 'keep the partial answer on screen if the stream fails halfway', expect: { kind: 'no_cautions' } },
  { name: 'excl-thin-visi-1', query: "the API doesn't return any intermediate reasoning", expect: { kind: 'caution_only', id: 'thinking-visibility' } },
  { name: 'excl-thin-visi-2', query: 'model gives us only the final answer, no thinking tokens, show a reasoning panel?', expect: { kind: 'caution_only', id: 'thinking-visibility' } },
  { name: 'excl-thin-visi-3', query: 'users would mistake the raw reasoning for the official answer', expect: { kind: 'caution_only', id: 'thinking-visibility', quotes: 'mistake raw reasoning' } },
  { name: 'excl-thin-visi-4', query: "our customers will read the scratch work as the company's actual reply even if it's labelled", expect: { kind: 'caution_only', id: 'thinking-visibility' } },
];

export const CASES: EvalCase[] = [
  // --- product phrasings, one obvious right answer ---
  {
    name: 'loading-state',
    query: 'loading state for AI chat',
    expect: { kind: 'top1', id: 'streaming-response' },
  },
  {
    name: 'stop-generation',
    query: 'user wants to stop generation',
    expect: { kind: 'topN', id: 'interruption-cancel', n: 2 },
  },
  {
    name: 'delete-approval',
    query: 'agent about to delete records, ask the user first',
    expect: { kind: 'top1', id: 'approval-gate' },
  },
  {
    name: 'confidence-display',
    query: 'show how sure the model is about its answer',
    expect: { kind: 'top1', id: 'confidence-indicator' },
  },
  {
    name: 'citations',
    query: 'citations for AI answers users can check',
    expect: { kind: 'top1', id: 'source-attribution' },
  },
  {
    name: 'retry-after-failure',
    query: 'request failed, let the user retry without losing their prompt',
    expect: { kind: 'top1', id: 'error-recovery' },
  },
  {
    name: 'regenerate',
    query: 'regenerate response button with version history',
    expect: { kind: 'top1', id: 'generation-control' },
  },
  {
    name: 'chat-input',
    query: 'chat input box, enter to send, shift enter for newline',
    expect: { kind: 'top1', id: 'prompt-composer' },
  },
  {
    name: 'refusal',
    query: 'the model refused my request, what do I show',
    expect: { kind: 'top1', id: 'refusal-messaging' },
  },
  {
    name: 'typewriter',
    query: 'typewriter effect, tokens appear one by one',
    expect: { kind: 'top1', id: 'streaming-response' },
  },

  // --- vague phrasings ---
  {
    name: 'thinking-indicator',
    query: 'ai thinking indicator',
    expect: { kind: 'topN', id: 'thinking-visibility', n: 2 },
  },
  {
    name: 'why-said-no',
    query: 'why did the assistant say no',
    expect: { kind: 'topN', id: 'refusal-messaging', n: 2 },
  },
  {
    name: 'sr-announce-done',
    query: 'screen reader announces when the response finishes',
    expect: { kind: 'topN', id: 'streaming-response', n: 3 },
  },
  {
    name: 'dangerous-command',
    query: 'confirm before running a dangerous command',
    expect: { kind: 'top1', id: 'approval-gate' },
  },

  // --- misspellings ---
  {
    name: 'misspelled-streaming',
    query: 'streming respone',
    expect: { kind: 'top1', id: 'streaming-response' },
  },
  {
    name: 'misspelled-approval',
    query: 'aproval gate before agent acts',
    expect: { kind: 'top1', id: 'approval-gate' },
  },

  // --- paraphrases with no catalog vocabulary (UX-review findings) ---
  {
    name: 'bail-out',
    query: 'user wants to bail out while the agent is still doing things',
    expect: { kind: 'top1', id: 'interruption-cancel' },
  },
  {
    name: 'cancel-in-flight',
    query: 'add a cancel button that actually stops the in-flight request',
    expect: { kind: 'top1', id: 'interruption-cancel' },
  },

  // --- guardrails ---
  {
    name: 'dont-use-caution',
    query: 'validate and moderate the full output before showing any of it',
    expect: { kind: 'caution', id: 'streaming-response' },
  },
  {
    name: 'off-topic-fallback',
    query: 'kubernetes pod autoscaling configuration',
    expect: { kind: 'fallback' },
  },
  {
    name: 'off-topic-graze',
    // "timeout" grazes error-recovery; the response must say low confidence,
    // not present the graze as a 0.8-score answer (UX-review finding).
    query: 'kubernetes ingress timeout misconfiguration',
    expect: { kind: 'advisory' },
  },
  {
    name: 'no-false-caution',
    // An in-scope cancel query must not draw the "instantaneous work"
    // don't-use-when caution just because it contains the word "cancel"
    // (UX-review finding).
    query: 'add a cancel button that actually stops the in-flight request',
    expect: { kind: 'no_caution', id: 'interruption-cancel' },
  },
  {
    name: 'category-filter',
    query: 'confidence',
    category: 'transparency',
    expect: { kind: 'top1', id: 'confidence-indicator' },
  },

  // --- know-when-not-to journey (docs/journeys/know-when-not-to.journey.json) ---
  {
    name: 'journey-paraphrase',
    query: 'confirm before a low-risk reversible action',
    expect: { kind: 'caution_only', id: 'approval-gate', quotes: 'trivially reversible' },
  },
  {
    name: 'journey-near-verbatim',
    query: 'gate a trivially reversible low-stakes action',
    expect: { kind: 'caution_only', id: 'approval-gate', quotes: 'trivially reversible' },
  },
  {
    name: 'journey-read-only',
    query: 'ask permission before a read-only operation',
    expect: { kind: 'caution_only', id: 'approval-gate', quotes: 'Read-only operations' },
  },
  {
    name: 'journey-read-only-rank',
    // "ask" used to match inside "task" (alias "stop task") and put
    // interruption-cancel first.
    query: 'ask permission before a read-only operation',
    expect: { kind: 'top1', id: 'approval-gate' },
  },

  ...CAUTION_REGRESSIONS,
];
