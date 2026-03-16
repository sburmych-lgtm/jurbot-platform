import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const fn = <T = unknown>() => vi.fn<(...args: any[]) => T>();
  return {
    mockPrisma: {
      lawyerProfile: { findUnique: fn(), findFirst: fn() },
      clientProfile: { findUnique: fn() },
      lawyerAvailability: { findUnique: fn(), upsert: fn() },
      appointment: { findMany: fn(), create: fn(), findUnique: fn(), findFirst: fn(), update: fn() },
      notification: { create: fn() },
    },
  };
});

vi.mock('@jurbot/db', () => ({ prisma: mockPrisma }));

vi.mock('../apps/backend/src/services/crossbot.service.ts', () => ({
  notifyLawyerByUserId: vi.fn(async () => false),
}));

vi.mock('../apps/backend/src/utils/refNumber.ts', () => ({
  generateBookingRef: vi.fn(() => 'BK-2026-0001'),
}));

async function importService() {
  return import('../apps/backend/src/services/appointment.service.ts');
}

function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
}

beforeEach(() => {
  resetMocks();
  mockPrisma.notification.create.mockResolvedValue({});
});

describe('appointment service', () => {
  it('getAvailability returns configured slots minus booked', async () => {
    const { getAvailability } = await importService();

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lp-1',
      userId: 'lu-1',
      orgId: 'org-1',
    });
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue({
      slots: ['09:00', '10:00', '14:00'],
    });
    mockPrisma.appointment.findMany.mockResolvedValue([
      { date: new Date('2026-04-15T10:00:00.000Z'), duration: 30 },
    ]);

    const result = await getAvailability('2026-04-15', {
      userId: 'lu-1',
      role: 'LAWYER',
    });

    expect(result.configuredSlots).toEqual(['09:00', '10:00', '14:00']);
    expect(result.bookedSlots).toEqual(['10:00']);
    expect(result.availableSlots).toEqual(['09:00', '14:00']);
    expect(result.date).toBe('2026-04-15');
  });

  it('getAvailability uses default slots when none configured', async () => {
    const { getAvailability } = await importService();

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lp-1',
      userId: 'lu-1',
      orgId: 'org-1',
    });
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue(null);
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const result = await getAvailability('2026-04-15', {
      userId: 'lu-1',
      role: 'LAWYER',
    });

    expect(result.configuredSlots.length).toBeGreaterThan(0);
    expect(result.configuredSlots).toContain('09:00');
    expect(result.configuredSlots).toContain('16:30');
    expect(result.bookedSlots).toEqual([]);
    expect(result.availableSlots).toEqual(result.configuredSlots);
  });

  it('resolves lawyer from client sourceToken when no lawyerId given', async () => {
    const { getAvailability } = await importService();

    mockPrisma.clientProfile.findUnique.mockResolvedValue({
      id: 'cp-1',
      userId: 'cu-1',
      orgId: 'org-1',
      sourceToken: { lawyerId: 'lp-1' },
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lp-1',
      userId: 'lu-1',
      orgId: 'org-1',
    });
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue(null);
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const result = await getAvailability('2026-04-15', {
      userId: 'cu-1',
      role: 'CLIENT',
    });

    expect(result.lawyerId).toBe('lp-1');
    expect(result.availableSlots.length).toBeGreaterThan(0);
  });

  it('blocks booking on a busy slot with 409', async () => {
    const { create } = await importService();

    // Resolve lawyer for CLIENT
    mockPrisma.clientProfile.findUnique.mockResolvedValue({
      id: 'cp-1',
      userId: 'cu-1',
      orgId: 'org-1',
      sourceToken: { lawyerId: 'lp-1' },
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lp-1',
      userId: 'lu-1',
      orgId: 'org-1',
    });
    // Slot 10:00 is configured
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue({
      slots: ['10:00'],
    });
    // Existing appointment at 10:00 — conflict
    mockPrisma.appointment.findMany.mockResolvedValue([
      { date: new Date('2026-04-15T10:00:00.000Z'), duration: 30 },
    ]);

    await expect(
      create(
        {
          type: 'FREE',
          date: '2026-04-15T10:00:00.000Z',
          notes: 'test',
        },
        'cu-1',
        'CLIENT',
      ),
    ).rejects.toThrow('Цей час вже зайнятий');
  });

  it('setAvailability upserts lawyer slots', async () => {
    const { setAvailability } = await importService();

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lp-1',
      userId: 'lu-1',
      orgId: 'org-1',
    });
    mockPrisma.lawyerAvailability.upsert.mockResolvedValue({
      lawyerId: 'lp-1',
      date: new Date('2026-04-15T00:00:00.000Z'),
      slots: ['09:00', '10:00', '14:00'],
    });
    // For the subsequent getAvailability call
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue({
      slots: ['09:00', '10:00', '14:00'],
    });
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const result = await setAvailability(
      '2026-04-15',
      ['09:00', '10:00', '14:00'],
      'lu-1',
    );

    expect(mockPrisma.lawyerAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          lawyerId_date: {
            lawyerId: 'lp-1',
            date: new Date('2026-04-15T00:00:00.000Z'),
          },
        },
      }),
    );
    expect(result.configuredSlots).toEqual(['09:00', '10:00', '14:00']);
  });

  it('allows client to cancel own appointment', async () => {
    const { remove } = await importService();

    mockPrisma.clientProfile.findUnique.mockResolvedValue({
      id: 'cp-1',
      userId: 'cu-1',
    });
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: 'a-1',
      status: 'PENDING',
      clientId: 'cp-1',
    });
    mockPrisma.appointment.update.mockResolvedValue({ id: 'a-1', status: 'CANCELLED' });

    await remove('a-1', 'cu-1', 'CLIENT');

    expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
      where: { id: 'a-1', clientId: 'cp-1' },
    });
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'a-1' },
      data: { status: 'CANCELLED' },
    });
  });
});
