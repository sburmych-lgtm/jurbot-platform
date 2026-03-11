export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { cursor?: string; hasMore?: boolean; total?: number };
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  isSuperadmin?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
