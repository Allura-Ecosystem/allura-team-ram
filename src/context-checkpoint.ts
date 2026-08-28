import { estimateTokens } from "./context-packet";

export interface ContextCheckpoint {
  version: "1.0";
  goal: string;
  decisions: string[];
  changed_files: string[];
  evidence: string[];
  blocker: string | null;
  next_action: string | null;
  source_tokens: number;
  checkpoint_tokens: number;
}

export const DEFAULT_COMPACTION_THRESHOLD = 8_000;
export const CHECKPOINT_TOKEN_LIMIT = 900;

export function shouldCompactContext(
  currentTokens: number,
  threshold: number = DEFAULT_COMPACTION_THRESHOLD,
): boolean {
  return currentTokens >= threshold;
}

export function createContextCheckpoint(
  input: Omit<ContextCheckpoint, "version" | "checkpoint_tokens">,
): ContextCheckpoint {
  const checkpoint: ContextCheckpoint = {
    version: "1.0",
    ...input,
    decisions: input.decisions.slice(0, 8),
    changed_files: input.changed_files.slice(0, 20),
    evidence: input.evidence.slice(0, 12),
    checkpoint_tokens: 0,
  };

  checkpoint.checkpoint_tokens = estimateTokens(JSON.stringify(checkpoint));
  while (checkpoint.checkpoint_tokens > CHECKPOINT_TOKEN_LIMIT && checkpoint.evidence.length > 1) {
    checkpoint.evidence.pop();
    checkpoint.checkpoint_tokens = estimateTokens(JSON.stringify(checkpoint));
  }
  while (
    checkpoint.checkpoint_tokens > CHECKPOINT_TOKEN_LIMIT &&
    checkpoint.changed_files.length > 1
  ) {
    checkpoint.changed_files.pop();
    checkpoint.checkpoint_tokens = estimateTokens(JSON.stringify(checkpoint));
  }
  while (checkpoint.checkpoint_tokens > CHECKPOINT_TOKEN_LIMIT && checkpoint.decisions.length > 1) {
    checkpoint.decisions.pop();
    checkpoint.checkpoint_tokens = estimateTokens(JSON.stringify(checkpoint));
  }

  return checkpoint;
}
