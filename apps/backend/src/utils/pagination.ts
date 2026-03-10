export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  return {
    cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
    limit: typeof query.limit === 'string' ? Math.min(parseInt(query.limit, 10), 100) : 20,
  };
}
