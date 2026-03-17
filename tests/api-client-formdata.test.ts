import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../apps/web/src/lib/telegram.ts', () => ({
  getInitData: () => '',
  isTelegramWebApp: () => false,
}));

describe('ApiClient postForm headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not force JSON content-type for FormData payloads', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

    const { api } = await import('../apps/web/src/lib/api.ts');
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'doc.txt');

    await api.postForm('/v1/documents/upload', formData);

    const [, requestInit] = fetchSpy.mock.calls[0];
    const headers = (requestInit?.headers ?? {}) as Record<string, string>;

    expect(Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')).toBe(false);
  });
});
