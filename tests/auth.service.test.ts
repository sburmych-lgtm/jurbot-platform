import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@jurbot/db', () => ({
  prisma: mockPrisma,
}));

describe('auth service', () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
  });

  it('returns a JSON-serializable profile for Telegram users', async () => {
    const { getMe } = await import('../apps/backend/src/services/auth.service.ts');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: null,
      password: null,
      role: 'LAWYER',
      name: 'Юрій Бурмич',
      phone: '+380991112233',
      city: 'Київ',
      avatarUrl: null,
      telegramId: BigInt(963610407),
      isActive: true,
      createdAt: new Date('2026-03-12T10:00:00.000Z'),
      updatedAt: new Date('2026-03-12T10:00:00.000Z'),
      deletedAt: null,
      lawyerProfile: null,
      clientProfile: null,
    });

    const profile = await getMe('user-1');

    expect(profile).toMatchObject({
      id: 'user-1',
      role: 'LAWYER',
      name: 'Юрій Бурмич',
      telegramId: '963610407',
    });
    expect(() => JSON.stringify(profile)).not.toThrow();
  });
});
