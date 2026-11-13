declare module "mcp:allura-memory" {
  export interface MemorySearchInput {
    group_id: string;
    query: string;
    limit?: number;
  }

  export interface MemoryAddInput {
    group_id: string;
    /** Omit by default: authenticated transport supplies the principal. */
    user_id?: string;
    content: string;
    /** Canonical public schema. Extra telemetry fields are not persisted metadata. */
    metadata?: {
      source?: "conversation" | "manual";
      conversation_id?: string;
      /** Authenticated attribution only, never an invented role/persona identifier. */
      agent_id?: string;
    };
  }

  /**
   * Host-provided capability, not a transport installed by these declarations.
   * Boundary is untrusted: legacy adapters may return an array; canonical search
   * returns { results, count, meta }; raw MCP CallToolResult may carry that JSON
   * in structuredContent or a text content block, including isError responses.
   * Consumers must normalize and validate before claiming retrieval success.
   */
  export function memory_search(input: MemorySearchInput): Promise<unknown>;
  /** Existing host adapter must reject failed writes; this is not a raw MCP client. */
  export function memory_add(input: MemoryAddInput): Promise<void>;
}
