import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, notifyLawyerByUserIdMock, createNotificationMock } = vi.hoisted(() => {
  const fn = <T = unknown>() => vi.fn<(...args: any[]) => T>();

  return {
    mockPrisma: {
      clientProfile: { findUnique: fn() },
      case: { findFirst: fn(), findUnique: fn() },
      document: { findFirstOrThrow: fn(), findUnique: fn(), findMany: fn(), create: fn(), update: fn() },
      lawyerProfile: { findUnique: fn() },
      $transaction: fn(),
    },
    notifyLawyerByUserIdMock: fn<Promise<boolean>>(),
    createNotificationMock: fn<Promise<unknown>>(),
  };
});

vi.mock('@jurbot/db', () => ({ prisma: mockPrisma }));

vi.mock('../apps/backend/src/services/crossbot.service.ts', () => ({
  notifyLawyerByUserId: notifyLawyerByUserIdMock,
  notifyClientByUserId: vi.fn(),
}));

vi.mock('../apps/backend/src/services/notification.service.ts', () => ({
  createNotification: createNotificationMock,
}));

async function importService() {
  return import('../apps/backend/src/services/document.service.ts');
}

function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === 'function') {
      (model as ReturnType<typeof vi.fn>).mockReset();
      continue;
    }

    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }

  notifyLawyerByUserIdMock.mockReset();
  createNotificationMock.mockReset();
}

beforeEach(() => {
  resetMocks();

  mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      upload: { create: vi.fn(async () => ({ id: 'u-1' })) },
      document: { create: vi.fn(async () => ({ id: 'd-created' })) },
    };

    return callback(tx);
  });

  notifyLawyerByUserIdMock.mockResolvedValue(false);
  createNotificationMock.mockResolvedValue({});
});

describe('document service upload flow', () => {
  it('creates document for client upload and returns persisted record', async () => {
    const { clientUpload } = await importService();

    mockPrisma.clientProfile.findUnique.mockResolvedValue({
      id: 'cp-1',
      userId: 'cu-1',
      orgId: 'org-1',
      user: { name: 'Тестовий Клієнт' },
    });

    mockPrisma.case.findFirst.mockResolvedValue({
      id: 'case-1',
      caseNumber: 'CASE-001',
      title: 'Спір',
      lawyer: { userId: 'lawyer-user-1', orgId: 'org-1' },
    });

    mockPrisma.document.findFirstOrThrow.mockResolvedValue({
      id: 'doc-1',
      name: 'evidence.pdf',
      case: { id: 'case-1', caseNumber: 'CASE-001', title: 'Спір' },
    });

    const result = await clientUpload(
      {
        originalName: 'evidence.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        buffer: Buffer.from('file-bytes'),
      },
      'cu-1',
    );

    expect(result.id).toBe('doc-1');
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'lawyer-user-1',
        type: 'DOCUMENT_READY',
      }),
    );
  });

  it('returns explicit validation error for empty file payload', async () => {
    const { clientUpload } = await importService();

    await expect(
      clientUpload(
        {
          originalName: 'empty.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 0,
          buffer: Buffer.alloc(0),
        },
        'cu-1',
      ),
    ).rejects.toThrow('Файл порожній або пошкоджений');
  });
});
