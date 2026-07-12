/*
 * Non-technical overviews, kept separate from the contracts on purpose.
 * pattern.contract.json is the machine-readable spec (RFC-2119, ajv-validated
 * in CI); this file is presentation-only prose for readers who will never
 * open a JSON file. Edits here don't touch the contract hash.
 */

export interface PlainLanguageEntry {
  /** One sentence, no jargon — used in index lists. */
  oneLiner: string;
  /** An everyday analogy plus the stakes, 1-2 sentences. */
  explanation: string;
}

export const PLAIN_LANGUAGE: Record<string, PlainLanguageEntry> = {
  'approval-gate': {
    oneLiner:
      "The agent asks before doing anything you can't easily undo — like sending an email or deleting a file.",
    explanation:
      "Think of a contractor showing you the exact quote and getting your signature before touching your wall — not swinging a hammer first and explaining later. If the agent wants to do something risky or hard to reverse, it shows you exactly what will happen and waits for a real yes.",
  },
  'confidence-indicator': {
    oneLiner: 'The agent tells you how sure it is, in plain words — not just a bare answer.',
    explanation:
      "It's the difference between a forecast that says “90% chance of rain” and one that just says “it will rain.” When the agent is guessing or unsure, it says so instead of sounding equally confident about everything.",
  },
  'error-recovery': {
    oneLiner: "When something breaks, you don't lose your work and you're told what to do next.",
    explanation:
      'Like a web form that keeps everything you typed even when one field has a typo, instead of wiping the whole page. A failure explains what happened and gives you a way forward, rather than a dead end.',
  },
  'generation-control': {
    oneLiner:
      'You can ask for another try or a different version without losing the one you already have.',
    explanation:
      "Like asking a chef for a second plate to compare, instead of the first one getting thrown out the moment you ask. Trying a variation never silently deletes what you already had.",
  },
  'interruption-cancel': {
    oneLiner: "The stop button actually stops things right away and tells you what did and didn't happen.",
    explanation:
      "Like a washing machine's cancel button confirming the cycle stopped and telling you the load is half-rinsed — not a button that spins for ten more seconds and never says what got done.",
  },
  'prompt-composer': {
    oneLiner: "The text box behaves the way you already expect: Enter sends, and your draft is never lost.",
    explanation:
      'It works like every messaging app you already use — Enter sends, Shift+Enter starts a new line, and if you accidentally click away, what you typed is still there when you come back.',
  },
  'refusal-messaging': {
    oneLiner: "When the agent won't do something, it explains why and suggests what you could do instead.",
    explanation:
      "Instead of a scary red error, a refusal reads like a person declining politely: here's why, and here's another way to get what you need. It's a normal response, not a system crash.",
  },
  'source-attribution': {
    oneLiner: 'Claims come with a source you can check, like a footnote in a research paper.',
    explanation:
      "If the agent tells you a fact, you can see where it came from and follow the link to verify it yourself — the same trust-but-verify habit a good footnote gives you in an article or textbook.",
  },
  'streaming-response': {
    oneLiner: "The answer appears as it's being written, not all at once after a long wait.",
    explanation:
      "It's like watching someone write a letter in real time instead of staring at a blank page and then getting the whole thing dumped on you at once. You can read along, and stop it early if you've seen enough.",
  },
  'thinking-visibility': {
    oneLiner: "You can peek at the agent's scratch work, clearly separated from its actual answer.",
    explanation:
      "Like a math teacher showing their work in the margin, next to — never inside — the boxed final answer. Look if you're curious how it got there; it's never mistaken for the answer itself.",
  },
};

export function getPlainLanguage(id: string): PlainLanguageEntry | undefined {
  return PLAIN_LANGUAGE[id];
}
