import { getInitData, isTelegramWebApp } from './telegram';

const API_BASE = '/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

class ApiClient {
  private accessToken: string | null = null;

  private buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      ...(extra ?? {}),
    };

    if (isTelegramWebApp()) {
      headers['X-Telegram-Init-Data'] = getInitData();
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const optionHeaders = (options.headers as Record<string, string> | undefined) ?? {};
    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const shouldSetJsonContentType = !isFormDataBody
      && !Object.keys(optionHeaders).some((header) => header.toLowerCase() === 'content-type');

    const headers: Record<string, string> = this.buildAuthHeaders({
      ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...optionHeaders,
    });

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const json = (await response.json()) as ApiResponse<T>;
    if (!response.ok) {
      throw new Error(json.error ?? 'Помилка сервера');
    }

    return json;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  postForm<T>(path: string, formData: FormData) {
    return this.request<T>(path, {
      method: 'POST',
      body: formData,
      headers: this.buildAuthHeaders(),
    });
  }

  async download(path: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: this.buildAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      let message = 'Помилка завантаження';
      try {
        const json = (await response.json()) as ApiResponse;
        message = json.error ?? message;
      } catch {
        // ignore JSON parse failures
      }
      throw new Error(message);
    }

    return response.blob();
  }
}

export const api = new ApiClient();
