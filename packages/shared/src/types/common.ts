export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
