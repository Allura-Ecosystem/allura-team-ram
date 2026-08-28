export interface ContextFileRef {
  path: string;
  reason: string;
  lines?: string;
}

export interface ContextMemoryRef {
  id?: string;
  summary: string;
  relevance?: number;
}

export interface ContextTokenUsage {
  input: number;
  output: number;
  budget: number;
}

export interface ContextPacket {
  version: "1.0";
  goal: string;
  summary: string;
  files: ContextFileRef[];
  memories: ContextMemoryRef[];
  risks: string[];
  recommended_route: string;
  validation_commands: string[];
  token_usage: ContextTokenUsage;
}

export interface ContextPacketValidation {
  valid: boolean;
  errors: string[];
}

export interface CompactionReceipt {
  before_tokens: number;
  after_tokens: number;
  dropped: Array<{ kind: string; reason: string }>;
  truncated: Array<{ field: string; from_chars: number; to_chars: number }>;
  preserved_required: string[];
}

export type ContextCompactionResult =
  | { status: "compacted"; packet: ContextPacket; receipt: CompactionReceipt }
  | { status: "impossible"; required_tokens: number; budget: number; blockers: string[] };

export const CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT = 700;
export const CONTEXT_PACKET_MAX_FILES = 12;
export const CONTEXT_PACKET_MAX_MEMORIES = 5;
export const CONTEXT_PACKET_MAX_RISKS = 8;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function validateContextPacket(value: unknown): ContextPacketValidation {
  const parsed = parseRawContextPacket(value);
  if (!parsed.packet) return { valid: false, errors: parsed.errors };

  const packet = parsed.packet;
  const errors = [...parsed.errors];
  if (packet.files.length > CONTEXT_PACKET_MAX_FILES) {
    errors.push(`files exceeds ${CONTEXT_PACKET_MAX_FILES}`);
  }
  if (packet.memories.length > CONTEXT_PACKET_MAX_MEMORIES) {
    errors.push(`memories exceeds ${CONTEXT_PACKET_MAX_MEMORIES}`);
  }
  if (packet.risks.length > CONTEXT_PACKET_MAX_RISKS) {
    errors.push(`risks exceeds ${CONTEXT_PACKET_MAX_RISKS}`);
  }
  if (packet.token_usage.input + packet.token_usage.output > packet.token_usage.budget) {
    errors.push("combined token usage exceeds budget");
  }
  const serializedTokens = estimateTokens(JSON.stringify(packet));
  if (serializedTokens > CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT) {
    errors.push(
      `serialized ContextPacket is ${serializedTokens} tokens; limit is ${CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT}`,
    );
  }
  return { valid: errors.length === 0, errors };
}

export function parseContextPacket(value: unknown): ContextPacket | null {
  const result = parseContextPacketWithReceipt(value);
  return result?.status === "compacted" ? result.packet : null;
}

export function parseContextPacketWithReceipt(value: unknown): ContextCompactionResult | null {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const parsed = parseRawContextPacket(candidate);
  if (!parsed.packet || parsed.errors.length > 0) return null;
  return compactContextPacketWithReceipt(parsed.packet);
}

export function compactContextPacketWithReceipt(
  packet: ContextPacket,
  budget: number = CONTEXT_PACKET_OUTPUT_TOKEN_LIMIT,
): ContextCompactionResult {
  const beforeTokens = estimateTokens(JSON.stringify(packet));
  const receipt: CompactionReceipt = {
    before_tokens: beforeTokens,
    after_tokens: beforeTokens,
    dropped: [],
    truncated: [],
    preserved_required: ["version", "goal", "summary", "recommended_route", "token_usage"],
  };
  const compacted: ContextPacket = structuredClone(packet);

  compacted.files = compacted.files.slice(0, CONTEXT_PACKET_MAX_FILES);
  compacted.memories = compacted.memories
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .slice(0, CONTEXT_PACKET_MAX_MEMORIES);
  compacted.risks = compacted.risks.slice(0, CONTEXT_PACKET_MAX_RISKS);
  compacted.validation_commands = compacted.validation_commands.slice(0, 5);

  truncateField(compacted, "goal", 300, receipt);
  truncateField(compacted, "summary", 900, receipt);
  truncateField(compacted, "recommended_route", 100, receipt);
  compacted.files = compacted.files.map((file, index) => ({
    path: truncateValue(file.path, 240, `files[${index}].path`, receipt),
    reason: truncateValue(file.reason, 240, `files[${index}].reason`, receipt),
    ...(file.lines
      ? { lines: truncateValue(file.lines, 60, `files[${index}].lines`, receipt) }
      : {}),
  }));
  compacted.memories = compacted.memories.map((memory, index) => ({
    ...(memory.id ? { id: truncateValue(memory.id, 120, `memories[${index}].id`, receipt) } : {}),
    summary: truncateValue(memory.summary, 300, `memories[${index}].summary`, receipt),
    ...(memory.relevance !== undefined ? { relevance: memory.relevance } : {}),
  }));
  compacted.risks = compacted.risks.map((risk, index) =>
    truncateValue(risk, 240, `risks[${index}]`, receipt),
  );
  compacted.validation_commands = compacted.validation_commands.map((command, index) =>
    truncateValue(command, 240, `validation_commands[${index}]`, receipt),
  );

  dropUntilBudget(compacted, budget, receipt);
  receipt.after_tokens = estimateTokens(JSON.stringify(compacted));
  if (receipt.after_tokens <= budget) return { status: "compacted", packet: compacted, receipt };

  truncateField(compacted, "summary", 240, receipt);
  truncateField(compacted, "goal", 160, receipt);
  receipt.after_tokens = estimateTokens(JSON.stringify(compacted));
  if (receipt.after_tokens <= budget) return { status: "compacted", packet: compacted, receipt };

  return {
    status: "impossible",
    required_tokens: receipt.after_tokens,
    budget,
    blockers: ["required ContextPacket fields exceed the token budget"],
  };
}

function parseRawContextPacket(value: unknown): { packet: ContextPacket | null; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { packet: null, errors: ["packet must be an object"] };
  if (value.version !== "1.0") errors.push("version must be 1.0");
  if (!isNonEmptyString(value.goal)) errors.push("goal is required");
  if (!isNonEmptyString(value.summary)) errors.push("summary is required");
  if (!isNonEmptyString(value.recommended_route)) errors.push("recommended_route is required");
  if (!Array.isArray(value.files)) errors.push("files must be an array");
  if (!Array.isArray(value.memories)) errors.push("memories must be an array");
  if (!Array.isArray(value.risks) || !value.risks.every((risk) => typeof risk === "string")) {
    errors.push("risks must be an array of strings");
  }
  if (
    !Array.isArray(value.validation_commands) ||
    !value.validation_commands.every((command) => typeof command === "string")
  ) {
    errors.push("validation_commands must be an array of strings");
  }
  if (!isRecord(value.token_usage)) errors.push("token_usage must be an object");

  const files = Array.isArray(value.files) ? value.files : [];
  files.forEach((file, index) => {
    if (!isRecord(file) || !isNonEmptyString(file.path) || !isNonEmptyString(file.reason)) {
      errors.push(`files[${index}] must contain string path and reason`);
    } else if (file.lines !== undefined && typeof file.lines !== "string") {
      errors.push(`files[${index}].lines must be a string`);
    }
  });
  const memories = Array.isArray(value.memories) ? value.memories : [];
  memories.forEach((memory, index) => {
    if (!isRecord(memory) || !isNonEmptyString(memory.summary)) {
      errors.push(`memories[${index}] must contain a string summary`);
      return;
    }
    if (memory.id !== undefined && typeof memory.id !== "string") {
      errors.push(`memories[${index}].id must be a string`);
    }
    if (
      memory.relevance !== undefined &&
      (typeof memory.relevance !== "number" || memory.relevance < 0 || memory.relevance > 1)
    ) {
      errors.push(`memories[${index}].relevance must be between 0 and 1`);
    }
  });

  const usage = isRecord(value.token_usage) ? value.token_usage : {};
  for (const field of ["input", "output", "budget"] as const) {
    if (typeof usage[field] !== "number" || !Number.isFinite(usage[field])) {
      errors.push(`token_usage.${field} must be a number`);
    }
  }
  if (typeof usage.input === "number" && usage.input < 0)
    errors.push("token usage cannot be negative");
  if (typeof usage.output === "number" && usage.output < 0)
    errors.push("token usage cannot be negative");
  if (typeof usage.budget === "number" && usage.budget <= 0)
    errors.push("token budget must be positive");

  if (errors.length > 0) return { packet: null, errors };
  return { packet: value as unknown as ContextPacket, errors };
}

function dropUntilBudget(packet: ContextPacket, budget: number, receipt: CompactionReceipt): void {
  while (estimateTokens(JSON.stringify(packet)) > budget && packet.memories.length > 0) {
    packet.memories.pop();
    receipt.dropped.push({ kind: "memory", reason: "lower-priority context" });
  }
  while (estimateTokens(JSON.stringify(packet)) > budget && packet.files.length > 1) {
    packet.files.pop();
    receipt.dropped.push({ kind: "file", reason: "lower-priority context" });
  }
  while (estimateTokens(JSON.stringify(packet)) > budget && packet.risks.length > 0) {
    packet.risks.pop();
    receipt.dropped.push({ kind: "risk", reason: "budget pressure" });
  }
  while (estimateTokens(JSON.stringify(packet)) > budget && packet.validation_commands.length > 1) {
    packet.validation_commands.pop();
    receipt.dropped.push({ kind: "validation-command", reason: "budget pressure" });
  }
}

function truncateField(
  packet: ContextPacket,
  field: "goal" | "summary" | "recommended_route",
  maxChars: number,
  receipt: CompactionReceipt,
): void {
  packet[field] = truncateValue(packet[field], maxChars, field, receipt);
}

function truncateValue(
  value: string,
  maxChars: number,
  field: string,
  receipt: CompactionReceipt,
): string {
  if (value.length <= maxChars) return value;
  receipt.truncated.push({ field, from_chars: value.length, to_chars: maxChars });
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
