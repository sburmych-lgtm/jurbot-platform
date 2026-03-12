import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TelegramApiCall = {
  method: string;
  body: Record<string, unknown>;
  url: string;
};

const { mockPrisma, telegramApiCalls } = vi.hoisted(() => {
  const createFn = <T = unknown>() => vi.fn<(...args: any[]) => T>();

  return {
    telegramApiCalls: [] as TelegramApiCall[],
    mockPrisma: {
      $transaction: createFn(),
      appointment: {
        count: createFn(),
        deleteMany: createFn(),
        findMany: createFn(),
      },
      case: {
        count: createFn(),
        deleteMany: createFn(),
        findMany: createFn(),
      },
      clientProfile: {
        count: createFn(),
        create: createFn(),
        delete: createFn(),
        findUnique: createFn(),
      },
      inviteToken: {
        count: createFn(),
        create: createFn(),
        deleteMany: createFn(),
        findUnique: createFn(),
        update: createFn(),
      },
      lawyerProfile: {
        create: createFn(),
        delete: createFn(),
        findFirst: createFn(),
        findUnique: createFn(),
      },
      notification: {
        create: createFn(),
        deleteMany: createFn(),
      },
      organization: {
        count: createFn(),
        create: createFn(),
        delete: createFn(),
        findUnique: createFn(),
      },
      organizationMember: {
        count: createFn(),
        create: createFn(),
        deleteMany: createFn(),
        findMany: createFn(),
      },
      subscription: {
        count: createFn(),
        create: createFn(),
        deleteMany: createFn(),
        findUnique: createFn(),
      },
      telegramIdentity: {
        create: createFn(),
        deleteMany: createFn(),
        findFirst: createFn(),
        findUnique: createFn(),
      },
      timeLog: {
        deleteMany: createFn(),
      },
      upload: {
        deleteMany: createFn(),
      },
      usageCounter: {
        deleteMany: createFn(),
      },
      user: {
        count: createFn(),
        create: createFn(),
        delete: createFn(),
      },
    },
  };
});

vi.mock('@jurbot/db', () => ({
  prisma: mockPrisma,
}));

function jsonResponse(result: unknown) {
  return new Response(JSON.stringify({ ok: true, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const body =
    typeof init?.body === 'string' && init.body.length > 0
      ? (JSON.parse(init.body) as Record<string, unknown>)
      : {};
  const method = url.split('/').pop() ?? 'unknown';
  telegramApiCalls.push({ method, body, url });

  if (method === 'getMe') {
    const username = url.includes('client-token') ? 'YurBotClientBot' : 'YurBotProBot';
    return jsonResponse({
      id: username === 'YurBotClientBot' ? 2 : 1,
      is_bot: true,
      first_name: username,
      username,
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    });
  }

  if (method === 'sendMessage' || method === 'editMessageText') {
    return jsonResponse({
      message_id: 1,
      date: 0,
      chat: { id: body.chat_id ?? 0, type: 'private' },
      text: body.text ?? '',
    });
  }

  return jsonResponse(true);
});

function telegramUser(id: number, username = 'tester') {
  return {
    id,
    is_bot: false,
    first_name: 'Test',
    username,
    language_code: 'uk',
  };
}

let updateId = 1;
let messageId = 1;

function nextUpdateId() {
  const value = updateId;
  updateId += 1;
  return value;
}

function nextMessageId() {
  const value = messageId;
  messageId += 1;
  return value;
}

function commandUpdate(text: string, userId: number, username = 'tester') {
  const command = text.startsWith('/') ? text.split(' ')[0] ?? text : null;
  return {
    update_id: nextUpdateId(),
    message: {
      message_id: nextMessageId(),
      date: 0,
      chat: { id: userId, type: 'private' as const },
      from: telegramUser(userId, username),
      text,
      ...(command
        ? {
            entities: [
              {
                offset: 0,
                length: command.length,
                type: 'bot_command' as const,
              },
            ],
          }
        : {}),
    },
  };
}

function callbackUpdate(data: string, userId: number, username = 'tester') {
  return {
    update_id: nextUpdateId(),
    callback_query: {
      id: `cb_${nextUpdateId()}`,
      from: telegramUser(userId, username),
      chat_instance: 'test-chat-instance',
      data,
      message: {
        message_id: nextMessageId(),
        date: 0,
        chat: { id: userId, type: 'private' as const },
        text: 'callback source',
      },
    },
  };
}

async function importTelegramConfig() {
  return import('../packages/telegram/src/config.ts');
}

function primeBot(bot: any, username: string) {
  bot.botInfo = {
    id: username === 'YurBotClientBot' ? 2 : 1,
    is_bot: true,
    first_name: username,
    username,
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  };

  bot.api.config.use(async (_prev: unknown, method: string, payload: Record<string, unknown>) => {
    telegramApiCalls.push({
      method,
      body: payload,
      url: `mock://telegram/${method}`,
    });

    if (method === 'getMe') {
      return { ok: true, result: bot.botInfo };
    }

    if (method === 'sendMessage' || method === 'editMessageText') {
      return {
        ok: true,
        result: {
          message_id: 1,
          date: 0,
          chat: { id: payload.chat_id ?? payload.chatId ?? 0, type: 'private' },
          text: payload.text ?? '',
        },
      };
    }

    return { ok: true, result: true };
  });

  return bot;
}

function resetPrismaMocks() {
  const objects = Object.values(mockPrisma) as Array<Record<string, ReturnType<typeof vi.fn>>>;
  for (const entry of objects) {
    if (typeof entry === 'function') {
      (entry as unknown as ReturnType<typeof vi.fn>).mockReset();
      continue;
    }
    for (const fn of Object.values(entry)) {
      fn.mockReset();
    }
  }

  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));
  mockPrisma.case.count.mockResolvedValue(0);
  mockPrisma.case.findMany.mockResolvedValue([]);
  mockPrisma.clientProfile.count.mockResolvedValue(0);
  mockPrisma.notification.create.mockResolvedValue({});
  mockPrisma.organization.count.mockResolvedValue(0);
  mockPrisma.subscription.count.mockResolvedValue(0);
  mockPrisma.appointment.count.mockResolvedValue(0);
  mockPrisma.appointment.findMany.mockResolvedValue([]);
  mockPrisma.telegramIdentity.findUnique.mockResolvedValue(null);
  mockPrisma.inviteToken.count.mockResolvedValue(0);
  mockPrisma.organizationMember.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  updateId = 1;
  messageId = 1;
  telegramApiCalls.length = 0;
  resetPrismaMocks();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Telegram bot flows', () => {
  it('registers a lawyer via friendly onboarding and returns an invite link', async () => {
    const { createLawyerBot } = await importTelegramConfig();

    mockPrisma.telegramIdentity.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'law-user-1',
      name: 'Олена Адвокат',
      phone: '+380991112233',
      role: 'LAWYER',
    });
    mockPrisma.organization.create.mockResolvedValue({
      id: 'org-1',
      name: 'Олена Адвокат — Юридична практика',
    });
    mockPrisma.organizationMember.create.mockResolvedValue({});
    mockPrisma.lawyerProfile.create.mockResolvedValue({
      id: 'lawyer-profile-1',
      userId: 'law-user-1',
      orgId: 'org-1',
      specialties: ['FAMILY'],
    });
    mockPrisma.telegramIdentity.create.mockResolvedValue({});
    mockPrisma.subscription.create.mockResolvedValue({});
    mockPrisma.inviteToken.create.mockResolvedValue({
      id: 'invite-1',
      token: 'inv_testtoken',
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lawyer-profile-1',
      userId: 'law-user-1',
      orgId: 'org-1',
    });

    const bot = primeBot(
      createLawyerBot({
        token: 'lawyer-token',
        miniAppUrl: 'https://app.example.com',
      }),
      'YurBotProBot',
    );

    await bot.handleUpdate(commandUpdate('/start', 1001, 'lawyer_user'));
    await bot.handleUpdate(callbackUpdate('onboard:start', 1001, 'lawyer_user'));
    await bot.handleUpdate(callbackUpdate('onboard:register', 1001, 'lawyer_user'));
    await bot.handleUpdate(commandUpdate('Олена Адвокат', 1001, 'lawyer_user'));
    await bot.handleUpdate(commandUpdate('+380991112233', 1001, 'lawyer_user'));
    await bot.handleUpdate(callbackUpdate('spec:FAMILY', 1001, 'lawyer_user'));
    await bot.handleUpdate(callbackUpdate('spec:done', 1001, 'lawyer_user'));

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Олена Адвокат',
          phone: '+380991112233',
          role: 'LAWYER',
          telegramId: BigInt(1001),
        }),
      }),
    );
    expect(mockPrisma.inviteToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lawyerId: 'lawyer-profile-1',
          orgId: 'org-1',
          tokenType: 'PUBLIC_LAWYER',
        }),
      }),
    );

    const inviteMessage = telegramApiCalls.find(
      (call) => call.method === 'editMessageText' && String(call.body.text).includes('Посилання для клієнтів'),
    );
    expect(inviteMessage?.body.text).toContain('https://t.me/YurBotClientBot?start=inv_testtoken');

    const lawyerMiniAppMessage = telegramApiCalls.find(
      (call) =>
        call.method === 'sendMessage' &&
        JSON.stringify(call.body.reply_markup ?? {}).includes('https://app.example.com'),
    );
    expect(JSON.stringify(lawyerMiniAppMessage?.body.reply_markup ?? {})).toContain('startapp=lawyer');

    const lawyerMenuButton = telegramApiCalls.find((call) => call.method === 'setChatMenuButton');
    expect(JSON.stringify(lawyerMenuButton?.body ?? {})).toContain('startapp=lawyer');
  });

  it('binds a client to the inviting lawyer and notifies the lawyer after registration', async () => {
    const { createClientBot } = await importTelegramConfig();

    mockPrisma.telegramIdentity.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        userId: 'law-user-1',
        chatId: BigInt(9001),
      });
    mockPrisma.inviteToken.findUnique.mockResolvedValue({
      id: 'invite-1',
      token: 'inv_abc123',
      orgId: 'org-1',
      lawyerId: 'lawyer-profile-1',
      caseId: null,
      isActive: true,
      usageCount: 0,
      maxUses: null,
      expiresAt: null,
      lawyer: { user: { name: 'Олена Адвокат' } },
      org: { name: 'Практика Олени' },
    });
    mockPrisma.user.create.mockResolvedValue({
      id: 'client-user-1',
      name: 'Марія Клієнт',
      phone: '+380671112233',
      role: 'CLIENT',
    });
    mockPrisma.organizationMember.create.mockResolvedValue({});
    mockPrisma.clientProfile.create.mockResolvedValue({});
    mockPrisma.inviteToken.update.mockResolvedValue({});
    mockPrisma.telegramIdentity.create.mockResolvedValue({});
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lawyer-profile-1',
      userId: 'law-user-1',
      orgId: 'org-1',
      user: { id: 'law-user-1', name: 'Олена Адвокат' },
    });

    const bot = primeBot(
      createClientBot({
        token: 'client-token',
        lawyerBotToken: 'lawyer-token',
        miniAppUrl: 'https://app.example.com',
      }),
      'YurBotClientBot',
    );

    await bot.handleUpdate(commandUpdate('/start inv_abc123', 2002, 'client_user'));
    await bot.handleUpdate(callbackUpdate('onboard:start', 2002, 'client_user'));
    await bot.handleUpdate(callbackUpdate('onboard:register', 2002, 'client_user'));
    await bot.handleUpdate(commandUpdate('Марія Клієнт', 2002, 'client_user'));
    await bot.handleUpdate(commandUpdate('+380671112233', 2002, 'client_user'));

    expect(mockPrisma.clientProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          sourceTokenId: 'invite-1',
          userId: 'client-user-1',
        }),
      }),
    );
    expect(mockPrisma.inviteToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invite-1' },
        data: { usageCount: { increment: 1 } },
      }),
    );

    const lawyerNotification = telegramApiCalls.find(
      (call) => call.method === 'sendMessage' && call.body.chat_id === '9001',
    );
    expect(lawyerNotification?.body.text).toContain('Новий клієнт зареєструвався');
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'NEW_CLIENT',
          userId: 'law-user-1',
        }),
      }),
    );

    const clientMiniAppMessage = telegramApiCalls.find(
      (call) =>
        call.method === 'sendMessage' &&
        JSON.stringify(call.body.reply_markup ?? {}).includes('https://app.example.com'),
    );
    expect(JSON.stringify(clientMiniAppMessage?.body.reply_markup ?? {})).toContain('startapp=client');

    const clientMenuButton = telegramApiCalls.find((call) => call.method === 'setChatMenuButton');
    expect(JSON.stringify(clientMenuButton?.body ?? {})).toContain('startapp=client');
  });

  it('forwards a client message to the linked lawyer after pressing the message button', async () => {
    const { createClientBot } = await importTelegramConfig();

    mockPrisma.telegramIdentity.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.telegramId === BigInt(3003)) {
        return {
          userId: 'client-user-1',
          user: { name: 'Марія Клієнт' },
        };
      }

      if (where.userId === 'law-user-1') {
        return {
          userId: 'law-user-1',
          chatId: BigInt(9001),
        };
      }

      return null;
    });
    mockPrisma.clientProfile.findUnique.mockResolvedValue({
      userId: 'client-user-1',
      orgId: 'org-1',
      sourceToken: {
        lawyer: {
          id: 'lawyer-profile-1',
          userId: 'law-user-1',
          orgId: 'org-1',
          user: { id: 'law-user-1', name: 'Олена Адвокат' },
        },
      },
    });
    mockPrisma.lawyerProfile.findUnique.mockResolvedValue({
      id: 'lawyer-profile-1',
      userId: 'law-user-1',
      orgId: 'org-1',
      user: { id: 'law-user-1', name: 'Олена Адвокат' },
    });

    const bot = primeBot(
      createClientBot({
        token: 'client-token',
        lawyerBotToken: 'lawyer-token',
      }),
      'YurBotClientBot',
    );

    await bot.handleUpdate(callbackUpdate('c:msg', 3003, 'client_user'));
    await bot.handleUpdate(commandUpdate('У мене є новий документ для справи.', 3003, 'client_user'));

    const lawyerMessage = telegramApiCalls.find(
      (call) => call.method === 'sendMessage' && call.body.chat_id === '9001',
    );
    expect(lawyerMessage?.body.text).toContain('Нове повідомлення від клієнта');
    expect(lawyerMessage?.body.text).toContain('У мене є новий документ для справи.');
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'MESSAGE',
          userId: 'law-user-1',
        }),
      }),
    );
  });
});
