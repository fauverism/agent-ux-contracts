/**
 * Structured tool errors — DESIGN.md §6. Every failure carries a
 * machine-readable code, a human message, and a suggested next action,
 * plus enough context for the agent to recover without another round trip.
 */
export type ErrorCode =
  | 'PATTERN_NOT_FOUND'
  | 'FRAMEWORK_UNSUPPORTED'
  | 'CONTRACT_INVALID'
  | 'OPTIONS_INVALID'
  | 'INPUT_INVALID';

export class ToolError extends Error {
  readonly code: ErrorCode;
  readonly nextAction: string;
  readonly context: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    nextAction: string,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.nextAction = nextAction;
    this.context = context;
  }

  toPayload(): { error: Record<string, unknown> } {
    return {
      error: {
        code: this.code,
        message: this.message,
        next_action: this.nextAction,
        ...this.context,
      },
    };
  }
}
