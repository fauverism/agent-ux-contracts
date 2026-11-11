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
  | { kind: 'advisory' }
  | { kind: 'fallback' };

export interface EvalCase {
  name: string;
  query: string;
  category?: 'input' | 'output' | 'control' | 'feedback' | 'transparency';
  expect: Expectation;
}

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
  // --- caution precision (real misses observed 2026-11-11, DESIGN.md §14) ---
  {
    name: 'low-risk-caution',
    // The paraphrase of approval-gate's first exclusion must draw its caution.
    query: 'confirm before a low-risk reversible action',
    expect: { kind: 'caution', id: 'approval-gate' },
  },
  {
    name: 'low-risk-no-noise',
    // "reversible" is not "irreversible": streaming-response's exclusion
    // about irreversible actions is the opposite case, not a match.
    query: 'confirm before a low-risk reversible action',
    expect: { kind: 'no_caution', id: 'streaming-response' },
  },
  {
    name: 'low-risk-paraphrase',
    // "low-risk" is how people say "low-stakes"; without "reversible" in
    // the query the exclusion must still be found.
    query: 'confirm before a low-risk action',
    expect: { kind: 'caution', id: 'approval-gate' },
  },
  {
    name: 'reversible-caution',
    query: 'reversible action',
    expect: { kind: 'caution', id: 'approval-gate' },
  },
  {
    name: 'reversible-no-noise',
    query: 'reversible action',
    expect: { kind: 'no_caution', id: 'streaming-response' },
  },
  {
    name: 'read-only-top',
    // "ask" is not "task": the alias "stop task" must not outrank the
    // pattern the query is actually about.
    query: 'ask permission before a read-only operation',
    expect: { kind: 'top1', id: 'approval-gate' },
  },
  {
    name: 'read-only-caution',
    query: 'ask permission before a read-only operation',
    expect: { kind: 'caution', id: 'approval-gate' },
  },
  {
    name: 'trivial-gate-caution',
    query: 'gate a trivially reversible low-stakes action',
    expect: { kind: 'caution', id: 'approval-gate' },
  },
  {
    name: 'trivial-gate-no-noise',
    // "gate" grazing "gated on complex validation" is one shared word, not
    // a match for prompt-composer's exclusion.
    query: 'gate a trivially reversible low-stakes action',
    expect: { kind: 'no_caution', id: 'prompt-composer' },
  },
  {
    name: 'category-filter',
    query: 'confidence',
    category: 'transparency',
    expect: { kind: 'top1', id: 'confidence-indicator' },
  },
];
