import type { ComponentType } from 'react';
import { DemoFrame } from './DemoFrame';
import { ApprovalGateDemo } from './ApprovalGateDemo';
import { ConfidenceIndicatorDemo } from './ConfidenceIndicatorDemo';
import { ErrorRecoveryDemo } from './ErrorRecoveryDemo';
import { GenerationControlDemo } from './GenerationControlDemo';
import { InterruptionCancelDemo } from './InterruptionCancelDemo';
import { PromptComposerDemo } from './PromptComposerDemo';
import { RefusalMessagingDemo } from './RefusalMessagingDemo';
import { SourceAttributionDemo } from './SourceAttributionDemo';
import { StreamingResponseDemo } from './StreamingResponseDemo';
import { ThinkingVisibilityDemo } from './ThinkingVisibilityDemo';

/**
 * Pattern id → demo driver. Each driver imports the pattern's actual React
 * reference implementation and plays host: fake streams, fake agent actions,
 * fake failures. The component under demo is the shipped one, unmodified.
 */
const DEMOS: Record<string, ComponentType> = {
  'approval-gate': ApprovalGateDemo,
  'confidence-indicator': ConfidenceIndicatorDemo,
  'error-recovery': ErrorRecoveryDemo,
  'generation-control': GenerationControlDemo,
  'interruption-cancel': InterruptionCancelDemo,
  'prompt-composer': PromptComposerDemo,
  'refusal-messaging': RefusalMessagingDemo,
  'source-attribution': SourceAttributionDemo,
  'streaming-response': StreamingResponseDemo,
  'thinking-visibility': ThinkingVisibilityDemo,
};

export function PatternDemo({ id }: { id: string }) {
  const Demo = DEMOS[id];
  if (!Demo) return null;
  return (
    <DemoFrame>
      <Demo />
    </DemoFrame>
  );
}

export function hasDemo(id: string): boolean {
  return id in DEMOS;
}
