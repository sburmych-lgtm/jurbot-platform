import { describe, expect, it, vi } from 'vitest';

vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: '',
    initDataUnsafe: {},
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn() },
    close: vi.fn(),
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
  },
}));

const telegram = await import('../apps/web/src/lib/telegram');

describe('telegram mode resolution helpers', () => {
  it('parses explicit and prefixed bot source values', () => {
    expect(telegram.parseBotSourceCandidate('client')).toBe('client');
    expect(telegram.parseBotSourceCandidate('lawyer')).toBe('lawyer');
    expect(telegram.parseBotSourceCandidate('client_owner')).toBe('client');
    expect(telegram.parseBotSourceCandidate('lawyer-beta')).toBe('lawyer');
    expect(telegram.parseBotSourceCandidate('START_CLIENT_FLOW')).toBe('client');
    expect(telegram.parseBotSourceCandidate('x-lawyer-y')).toBe('lawyer');
    expect(telegram.parseBotSourceCandidate('unknown')).toBeNull();
  });

  it('prioritizes bot source over persisted db role', () => {
    expect(telegram.resolveUiRoleFromSource('client', 'LAWYER')).toEqual({
      role: 'CLIENT',
      botSource: 'client',
      fallback: 'botSource',
    });

    expect(telegram.resolveUiRoleFromSource('lawyer', 'CLIENT')).toEqual({
      role: 'LAWYER',
      botSource: 'lawyer',
      fallback: 'botSource',
    });
  });

  it('falls back to user role or default client when source is missing', () => {
    expect(telegram.resolveUiRoleFromSource(null, 'LAWYER')).toEqual({
      role: 'LAWYER',
      botSource: null,
      fallback: 'userRole',
    });

    expect(telegram.resolveUiRoleFromSource(null, undefined)).toEqual({
      role: 'CLIENT',
      botSource: null,
      fallback: 'defaultClient',
    });
  });
});
