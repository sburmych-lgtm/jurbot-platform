const API_BASE = '/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { cursor?: string; hasMore?: boolean; total?: number };
}

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok) throw new Error(json.error ?? 'Помилка сервера');
    return json;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, data: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(data) });
  }

  patch<T>(path: string, data: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
