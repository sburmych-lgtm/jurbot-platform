import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const fn = <T = unknown>() => vi.fn<(...args: any[]) => T>();
  return {
    mockPrisma: {
      user: { findUnique: fn() },
      lawyerProfile: { findUnique: fn(), findFirst: fn() },
      clientProfile: { findUnique: fn() },
      case: { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn() },
      document: { findUnique: fn(), findMany: fn(), create: fn(), update: fn() },
      appointment: { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn() },
      intakeSubmission: { findUnique: fn(), findMany: fn() },
      inviteToken: { findFirst: fn(), update: fn() },
      timeLog: { findFirst: fn(), findUnique: fn(), create: fn(), update: fn(), delete: fn() },
      notification: { create: fn() },
      lawyerAvailability: { findUnique: fn() },
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

function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
}

const LAWYER_A = { id: 'lp-a', userId: 'user-a', orgId: 'org-1' };
const LAWYER_B = { id: 'lp-b', userId: 'user-b', orgId: 'org-2' };

beforeEach(() => {
  resetMocks();
  mockPrisma.notification.create.mockResolvedValue({});
});

// ─── Bug 1: Cross-lawyer case IDOR ───

describe('Bug 1: cases - cross-lawyer IDOR', () => {
  it('should deny getById when case belongs to another lawyer', async () => {
    const { getById } = await import('../apps/backend/src/services/case.service.ts');

    mockPrisma.case.findUnique.mockResolvedValue({
      id: 'case-1', lawyerId: LAWYER_B.id, deletedAt: null,
      client: { user: { id: 'u', name: 'n', email: 'e', phone: 'p' } },
      lawyer: { user: { id: 'u', name: 'n' } },
      _count: { documents: 0, messages: 0, checklist: 0 },
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);

    await expect(getById('case-1', 'user-a', 'LAWYER')).rejects.toThrow('доступу');
  });

  it('should allow getById for own case', async () => {
    const { getById } = await import('../apps/backend/src/services/case.service.ts');

    const caseData = {
      id: 'case-1', lawyerId: LAWYER_A.id, deletedAt: null,
      client: { user: { id: 'u', name: 'n', email: 'e', phone: 'p' } },
      lawyer: { user: { id: 'u', name: 'n' } },
      _count: { documents: 0, messages: 0, checklist: 0 },
    };
    mockPrisma.case.findUnique.mockResolvedValue(caseData);
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);

    const result = await getById('case-1', 'user-a', 'LAWYER');
    expect(result.id).toBe('case-1');
  });

  it('should deny update for cross-lawyer case', async () => {
    const { update } = await import('../apps/backend/src/services/case.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.case.findFirst.mockResolvedValue(null); // no match for lawyerA + caseId

    await expect(update('case-1', { title: 'new' } as any, 'user-a')).rejects.toThrow('не знайдено');
  });

  it('should deny softDelete for cross-lawyer case', async () => {
    const { softDelete } = await import('../apps/backend/src/services/case.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.case.findFirst.mockResolvedValue(null);

    await expect(softDelete('case-1', 'user-a')).rejects.toThrow('не знайдено');
  });
});

// ─── Bug 2: Cross-org case creation ───

describe('Bug 2: cases - cross-org creation', () => {
  it('should deny creating case with client from another org', async () => {
    const { create } = await import('../apps/backend/src/services/case.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.clientProfile.findUnique.mockResolvedValue({ id: 'cp-1', orgId: 'org-2' });

    await expect(
      create({ title: 'test', clientId: 'cp-1', category: 'CIVIL' } as any, 'user-a'),
    ).rejects.toThrow('іншої організації');
  });

  it('should allow creating case with same-org client', async () => {
    const { create } = await import('../apps/backend/src/services/case.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.clientProfile.findUnique.mockResolvedValue({ id: 'cp-1', orgId: 'org-1' });
    mockPrisma.case.create.mockResolvedValue({ id: 'new-case' });

    const result = await create({ title: 'test', clientId: 'cp-1', category: 'CIVIL' } as any, 'user-a');
    expect(result.id).toBe('new-case');
  });
});

// ─── Bug 3: Cross-lawyer document IDOR ───

describe('Bug 3: documents - cross-lawyer IDOR', () => {
  it('should deny getById for document belonging to another lawyer', async () => {
    const { getById } = await import('../apps/backend/src/services/document.service.ts');

    mockPrisma.document.findUnique.mockResolvedValue({
      id: 'doc-1', deletedAt: null,
      case: { id: 'c', caseNumber: 'CN', title: 't', clientId: 'cp', lawyerId: LAWYER_B.id },
      upload: null,
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);

    await expect(getById('doc-1', 'user-a', 'LAWYER')).rejects.toThrow('доступу');
  });

  it('should allow getById for own document', async () => {
    const { getById } = await import('../apps/backend/src/services/document.service.ts');

    mockPrisma.document.findUnique.mockResolvedValue({
      id: 'doc-1', deletedAt: null,
      case: { id: 'c', caseNumber: 'CN', title: 't', clientId: 'cp', lawyerId: LAWYER_A.id },
      upload: null,
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);

    const result = await getById('doc-1', 'user-a', 'LAWYER');
    expect(result.id).toBe('doc-1');
  });
});

// ─── Bug 4: Cross-lawyer appointment IDOR ───

describe('Bug 4: appointments - cross-lawyer IDOR', () => {
  it('should deny getById for appointment belonging to another lawyer', async () => {
    const { getById } = await import('../apps/backend/src/services/appointment.service.ts');

    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1', lawyerId: LAWYER_B.id,
      client: { user: { id: 'u', name: 'n', email: 'e', phone: 'p' } },
      lawyer: { user: { id: 'u', name: 'n' } },
      case: { id: 'c', caseNumber: 'CN', title: 't' },
      reminders: [],
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);

    await expect(getById('apt-1', 'user-a', 'LAWYER')).rejects.toThrow('доступу');
  });

  it('should deny update for cross-lawyer appointment', async () => {
    const { update } = await import('../apps/backend/src/services/appointment.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await expect(update('apt-1', { status: 'CONFIRMED' } as any, 'user-a')).rejects.toThrow('не знайдено');
  });

  it('should deny remove for cross-lawyer appointment', async () => {
    const { remove } = await import('../apps/backend/src/services/appointment.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await expect(remove('apt-1', 'user-a', 'LAWYER')).rejects.toThrow('не знайдено');
  });
});

// ─── Bug 5: Intake cross-org ───

describe('Bug 5: intake - cross-org leakage', () => {
  it('should deny getById for intake from another org', async () => {
    const { getById } = await import('../apps/backend/src/services/intake.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({ orgId: 'org-1' });
    mockPrisma.intakeSubmission.findUnique.mockResolvedValue({
      id: 'is-1',
      client: { orgId: 'org-2', user: { id: 'u', name: 'n', email: 'e', phone: 'p', city: 'c' } },
    });

    await expect(getById('is-1', 'user-a')).rejects.toThrow('доступу');
  });

  it('should allow getById for same-org intake', async () => {
    const { getById } = await import('../apps/backend/src/services/intake.service.ts');

    const submission = {
      id: 'is-1',
      client: { orgId: 'org-1', user: { id: 'u', name: 'n', email: 'e', phone: 'p', city: 'c' } },
    };
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({ orgId: 'org-1' });
    mockPrisma.intakeSubmission.findUnique.mockResolvedValue(submission);

    const result = await getById('is-1', 'user-a');
    expect(result.id).toBe('is-1');
  });
});

// ─── Bug 7: Client appointment impersonation ───

describe('Bug 7: appointments - client impersonation', () => {
  it('should force clientId from auth context for CLIENT role', async () => {
    const { create } = await import('../apps/backend/src/services/appointment.service.ts');

    const clientProfile = { id: 'cp-real', userId: 'cu-1', orgId: 'org-1', sourceToken: { lawyerId: 'lp-a' } };
    mockPrisma.clientProfile.findUnique.mockResolvedValue(clientProfile);
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.lawyerAvailability.findUnique.mockResolvedValue({ slots: ['09:00'] });
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.create.mockResolvedValue({
      id: 'apt-new', clientId: 'cp-real', refNumber: 'BK-2026-0001',
      date: new Date('2026-04-15T09:00:00.000Z'), type: 'FREE',
      client: { user: { name: 'Test', email: 'test@test.com', id: 'cu-1' } },
      lawyer: { userId: 'user-a', orgId: 'org-1', user: { id: 'user-a', name: 'Lawyer' } },
    });

    const result = await create(
      { type: 'FREE', date: '2026-04-15T09:00:00.000Z', clientId: 'cp-impostor' },
      'cu-1',
      'CLIENT',
    );

    // clientId in the create call should be the authenticated user's profile, not 'cp-impostor'
    const createCall = mockPrisma.appointment.create.mock.calls[0][0];
    expect(createCall.data.clientId).toBe('cp-real');
  });
});

// ─── Bug 8: Invite token deactivation IDOR ───

describe('Bug 8: tokens - deactivation IDOR', () => {
  it('should deny deactivation of token belonging to another lawyer', async () => {
    const { deactivateToken } = await import('../apps/backend/src/services/token.service.ts');

    mockPrisma.inviteToken.findFirst.mockResolvedValue(null); // no match for lawyerA + tokenId

    await expect(deactivateToken('token-1', 'lp-a')).rejects.toThrow();
  });

  it('should allow deactivation of own token', async () => {
    const { deactivateToken } = await import('../apps/backend/src/services/token.service.ts');

    mockPrisma.inviteToken.findFirst.mockResolvedValue({ id: 'token-1', lawyerId: 'lp-a' });
    mockPrisma.inviteToken.update.mockResolvedValue({ id: 'token-1', isActive: false });

    const result = await deactivateToken('token-1', 'lp-a');
    expect(result.isActive).toBe(false);
  });
});

// ─── Bug 10: Timelog IDOR ───

describe('Bug 10: timelogs - update/delete IDOR', () => {
  it('should deny update for cross-lawyer timelog', async () => {
    const { update } = await import('../apps/backend/src/services/timelog.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.timeLog.findFirst.mockResolvedValue(null);

    await expect(update('tl-1', { description: 'new' } as any, 'user-a')).rejects.toThrow('не знайдено');
  });

  it('should deny delete for cross-lawyer timelog', async () => {
    const { remove } = await import('../apps/backend/src/services/timelog.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.timeLog.findFirst.mockResolvedValue(null);

    await expect(remove('tl-1', 'user-a')).rejects.toThrow('не знайдено');
  });

  it('should allow update for own timelog', async () => {
    const { update } = await import('../apps/backend/src/services/timelog.service.ts');

    mockPrisma.lawyerProfile.findUnique.mockResolvedValue(LAWYER_A);
    mockPrisma.timeLog.findFirst.mockResolvedValue({ id: 'tl-1', lawyerId: LAWYER_A.id });
    mockPrisma.timeLog.update.mockResolvedValue({ id: 'tl-1', description: 'updated' });

    const result = await update('tl-1', { description: 'updated' } as any, 'user-a');
    expect(result.description).toBe('updated');
  });
});
