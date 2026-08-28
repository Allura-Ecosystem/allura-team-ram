declare module "mcp:allura-memory" {
  export interface MemorySearchInput {
    group_id: string;
    query: string;
    limit?: number;
  }

  export interface MemoryAddInput {
    group_id: string;
    user_id: string;
    content: string;
    metadata?: Record<string, unknown>;
  }

  export function memory_search(input: MemorySearchInput): Promise<unknown[]>;
  export function memory_add(input: MemoryAddInput): Promise<void>;
}
