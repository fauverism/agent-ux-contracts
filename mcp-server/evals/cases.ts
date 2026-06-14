/**
 * Eval cases: realistic queries an agent would send, asserted on outcomes.
 * Phrasings deliberately use product language ("loading state", "the model
 * refused"), not catalog language — that gap is what the eval measures.
 */
export type Expectation =
  | { kind: 'top1'; id: string }
  | { kind: 'topN'; id: string; n: number }
  | { kind: 'caution'; id: string }
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
    name: 'category-filter',
    query: 'confidence',
    category: 'transparency',
    expect: { kind: 'top1', id: 'confidence-indicator' },
  },
];
