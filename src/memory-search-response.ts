/** Pure validation boundary for existing host memory adapters; no transport or I/O. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectError(value: Record<string, unknown>): void {
  if ((value.isError !== undefined && value.isError !== false) || value.error != null) {
    throw new Error("Retrieval failed");
  }
}

function unwrapResponse(value: unknown): unknown {
  if (!isRecord(value)) return value;
  rejectError(value);
  if ("structuredContent" in value) return value.structuredContent;
  if (!("content" in value)) return value;
  const content = value.content;
  if (!Array.isArray(content) || content.length !== 1) {
    throw new Error("Ambiguous retrieval response");
  }
  const block: unknown = content[0];
  if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") {
    throw new Error("Unsupported retrieval response");
  }
  return JSON.parse(block.text);
}

/**
 * Normalize one host adapter / raw MCP result boundary. structuredContent is
 * authoritative when supplied; do not rescue malformed data with alternate text.
 * An empty successful search is valid. Degraded results do not prove healthy retrieval.
 */
export function normalizeMemorySearch(response: unknown): unknown[] {
  const value = unwrapResponse(response);
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) throw new Error("Malformed retrieval response");
  rejectError(value);
  if (
    !Array.isArray(value.results) ||
    value.count !== value.results.length ||
    !isRecord(value.meta) ||
    value.meta.degraded !== false
  ) {
    throw new Error("Unverified retrieval response");
  }
  return value.results;
}
