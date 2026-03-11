import { Bot, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import { randomBytes } from 'crypto';
import { prisma } from '@jurbot/db';

// ─── Session types ──────────────────────────────────────────
interface OnboardingSession {
  step: 'idle' | 'awaiting_name' | 'awaiting_phone' | 'awaiting_reset_confirm';
  name?: string;
  tokenData?: { tokenId: string; orgId: string; lawyerId: string; caseId?: string };
}

type BotContext = Context & SessionFlavor<OnboardingSession>;

const PLACEHOLDER_TOKEN = 'PLACEHOLDER_PROVIDE_LATER';
const TRIAL_DAYS = 14;

export function isPlaceholderToken(token: string): boolean {
  return token === PLACEHOLDER_TOKEN || token.trim() === '';
}

function initialSession(): OnboardingSession {
  return { step: 'idle' };
}

function generateToken(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) + '-' + randomBytes(3).toString('hex');
}

function generateAccessCode(): string {
  return randomBytes(3).toString('hex');
}

// ─── Shared: delete user cascade ─────────────────────────────
async function deleteUserByTelegramId(telegramId: bigint): Promise<boolean> {
  const identity = await prisma.telegramIdentity.findFirst({
    where: { telegramId },
    include: { user: true },
  });

  if (!identity) return false;

  const userId = identity.userId;

  // Delete in correct order to respect FK constraints
  // 1. Telegram identity
  await prisma.telegramIdentity.deleteMany({ where: { userId } });

  // 2. Lawyer-specific data
  const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (lawyerProfile) {
    // Delete invite tokens created by this lawyer
    await prisma.inviteToken.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    // Delete cases by this lawyer
    await prisma.case.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    // Delete appointments by this lawyer
    await prisma.appointment.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    // Delete time logs
    await prisma.timeLog.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    // Delete lawyer profile
    await prisma.lawyerProfile.delete({ where: { id: lawyerProfile.id } });
  }

  // 3. Client-specific data
  const clientProfile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (clientProfile) {
    await prisma.case.deleteMany({ where: { clientId: clientProfile.id } });
    await prisma.appointment.deleteMany({ where: { clientId: clientProfile.id } });
    await prisma.clientProfile.delete({ where: { id: clientProfile.id } });
  }

  // 4. Org membership & org cleanup
  const memberships = await prisma.organizationMember.findMany({ where: { userId } });
  for (const m of memberships) {
    if (m.role === 'OWNER') {
      // Check if org has other members
      const otherMembers = await prisma.organizationMember.count({
        where: { orgId: m.orgId, userId: { not: userId } },
      });
      if (otherMembers === 0) {
        // Delete org and related data
        await prisma.subscription.deleteMany({ where: { orgId: m.orgId } });
        await prisma.usageCounter.deleteMany({ where: { orgId: m.orgId } });
        await prisma.inviteToken.deleteMany({ where: { orgId: m.orgId } });
        await prisma.organizationMember.deleteMany({ where: { orgId: m.orgId } });
        await prisma.organization.delete({ where: { id: m.orgId } });
      }
    }
  }
  await prisma.organizationMember.deleteMany({ where: { userId } });

  // 5. Notifications & uploads
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.upload.deleteMany({ where: { uploadedById: userId } });

  // 6. Delete user
  await prisma.user.delete({ where: { id: userId } });

  return true;
}

// ─── Lawyer Bot ─────────────────────────────────────────────
export function createLawyerBot(token: string, miniAppUrl?: string): Bot {
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      await ctx.reply(
        '⚖️ Вітаємо повернення, ' + existing.user.name + '!\n\n' +
        'Використовуйте /help для списку команд.',
      );
      return;
    }

    ctx.session.step = 'awaiting_name';
    await ctx.reply(
      '⚖️ Ласкаво просимо до ЮрБот!\n\n' +
      'Я допоможу вам керувати справами, клієнтами та документами.\n\n' +
      "Для початку вкажіть ваше повне ім'я:",
    );
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    // Handle reset confirmation
    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === 'так' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('🗑 Дані видалено. Натисніть /start для нової реєстрації.');
          } else {
            await ctx.reply('❌ Дані не знайдено.');
          }
        } catch (err) {
          console.error('[Lawyer Bot] Reset error:', err);
          ctx.session.step = 'idle';
          await ctx.reply('❌ Помилка при видаленні. Спробуйте ще раз.');
        }
      } else {
        ctx.session.step = 'idle';
        await ctx.reply('Скасовано.');
      }
      return;
    }

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply("Вкажіть коректне ім'я (2–100 символів):");
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        'Дякую, ' + name + '!\n\n' +
        'Тепер вкажіть ваш номер телефону (наприклад, +380991234567):',
      );
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('Некоректний номер. Вкажіть у форматі +380991234567:');
        return;
      }

      const telegramId = BigInt(ctx.from!.id);
      const name = ctx.session.name!;

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { name, phone, role: 'LAWYER', telegramId },
          });

          const orgName = name + ' — Юридична практика';
          const org = await tx.organization.create({
            data: { name: orgName, slug: slugify(orgName) },
          });

          await tx.organizationMember.create({
            data: { orgId: org.id, userId: user.id, role: 'OWNER' },
          });

          const profile = await tx.lawyerProfile.create({
            data: { userId: user.id, orgId: org.id },
          });

          await tx.telegramIdentity.create({
            data: {
              userId: user.id, telegramId, chatId: telegramId, botType: 'lawyer',
              telegramUsername: ctx.from?.username ?? null,
            },
          });

          const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86400000);
          await tx.subscription.create({
            data: { orgId: org.id, plan: 'TRIAL', status: 'TRIAL', expiresAt, trialUsed: true },
          });

          const inviteToken = await tx.inviteToken.create({
            data: {
              orgId: org.id, lawyerId: profile.id,
              token: generateToken('inv'), tokenType: 'PUBLIC_LAWYER',
              expiresAt: new Date(Date.now() + 365 * 86400000),
            },
          });

          return { user, org, profile, inviteToken };
        });

        ctx.session.step = 'idle';

        const botUsername = ctx.me.username;
        const clientBotUsername = botUsername.replace('Pro', 'Client').replace('pro', 'client');
        const inviteLink = 'https://t.me/' + clientBotUsername + '?start=' + result.inviteToken.token;

        await ctx.reply(
          '✅ Реєстрацію завершено!\n\n' +
          '🏛️ Організацію створено\n' +
          '🎁 14-денний пробний період активовано\n\n' +
          '🔗 Посилання для клієнтів:\n' + inviteLink + '\n\n' +
          'Надішліть це посилання клієнтам для підключення.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '💼 ЮрБот', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Lawyer Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Lawyer Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('Помилка при реєстрації. Спробуйте /start ще раз.');
      }
      return;
    }

    await ctx.reply('Використовуйте /help для списку команд.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📋 Доступні команди:\n\n' +
      '/invite — Отримати посилання для клієнтів\n' +
      '/cases — Мої справи\n' +
      '/schedule — Розклад на сьогодні\n' +
      '/admin — Інформація про обліковий запис\n' +
      '/reset — Скинути реєстрацію (для тестування)\n' +
      '/help — Цей список',
    );
  });

  // ── /admin — show account info ──
  bot.command('admin', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity) {
      await ctx.reply('❌ Ви не зареєстровані. Натисніть /start');
      return;
    }

    const user = identity.user;
    const profile = user.lawyerProfile;
    const org = profile?.orgId ? await prisma.organization.findUnique({ where: { id: profile.orgId } }) : null;
    const sub = org ? await prisma.subscription.findUnique({ where: { orgId: org.id } }) : null;

    const lines = [
      '👤 Адмін-панель\n',
      '📌 Telegram ID: ' + ctx.from!.id,
      '📧 Ім\'я: ' + user.name,
      '📱 Телефон: ' + (user.phone || '—'),
      '🏛️ Організація: ' + (org?.name || '—'),
    ];

    if (sub) {
      lines.push('📦 План: ' + sub.plan);
      lines.push('📅 Статус: ' + sub.status);
      if (sub.expiresAt) {
        lines.push('⏰ Дійсний до: ' + sub.expiresAt.toLocaleDateString('uk-UA'));
      }
    }

    // Count tokens
    if (profile) {
      const tokenCount = await prisma.inviteToken.count({
        where: { lawyerId: profile.id, isActive: true },
      });
      lines.push('🔗 Активних токенів: ' + tokenCount);
    }

    await ctx.reply(lines.join('\n'));
  });

  // ── /reset — delete user data for testing ──
  bot.command('reset', async (ctx) => {
    ctx.session.step = 'awaiting_reset_confirm';
    await ctx.reply(
      '⚠️ Ви впевнені що хочете видалити свої дані?\n\n' +
      'Це видалить:\n' +
      '• Ваш обліковий запис\n' +
      '• Організацію (якщо ви власник)\n' +
      '• Всі справи та записи\n' +
      '• Інвайт-токени\n\n' +
      'Напишіть "так" для підтвердження:',
    );
  });

  bot.command('invite', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity?.user.lawyerProfile?.orgId) {
      await ctx.reply('Спочатку пройдіть реєстрацію: /start');
      return;
    }

    const profile = identity.user.lawyerProfile;
    const inviteToken = await prisma.inviteToken.create({
      data: {
        orgId: profile.orgId!, lawyerId: profile.id,
        token: generateToken('inv'), tokenType: 'PUBLIC_LAWYER',
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const botInfo = await bot.api.getMe();
    const clientBotUsername = botInfo.username.replace('Pro', 'Client').replace('pro', 'client');
    const link = 'https://t.me/' + clientBotUsername + '?start=' + inviteToken.token;

    await ctx.reply(
      '🔗 Посилання для клієнтів:\n\n' + link + '\n\n' +
      'Надішліть клієнту для підключення.',
    );
  });

  bot.command('cases', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('Спочатку пройдіть реєстрацію: /start'); return; }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) { await ctx.reply('Профіль адвоката не знайдено.'); return; }

    const cases = await prisma.case.findMany({
      where: { lawyerId: profile.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (cases.length === 0) {
      await ctx.reply('📁 У вас поки немає справ.');
      return;
    }

    const lines = cases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('📁 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.command('schedule', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('Спочатку пройдіть реєстрацію: /start'); return; }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: { lawyerId: profile.id, date: { gte: today, lt: tomorrow } },
      orderBy: { date: 'asc' },
    });

    if (appointments.length === 0) {
      await ctx.reply('📅 На сьогодні немає записів.');
      return;
    }

    const lines = appointments.map((a) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '⏰ ' + time + (a.notes ? ' — ' + a.notes : '');
    });
    await ctx.reply('📅 Розклад на сьогодні:\n\n' + lines.join('\n'));
  });

  bot.catch((err) => {
    console.error('[Lawyer Bot Error]', err);
  });

  return bot as unknown as Bot;
}

// ─── Client Bot ─────────────────────────────────────────────
export function createClientBot(token: string, miniAppUrl?: string): Bot {
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const startParam = ctx.match?.toString().trim();

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      await ctx.reply(
        '👋 Вітаємо повернення, ' + existing.user.name + '!\n\n' +
        'Використовуйте /help для списку команд.',
      );
      return;
    }

    if (!startParam) {
      await ctx.reply(
        '❗ Для реєстрації потрібне посилання від адвоката.\n\n' +
        'Зверніться до вашого адвоката для отримання запрошення.',
      );
      return;
    }

    const tokenRecord = await prisma.inviteToken.findUnique({
      where: { token: startParam },
      include: { org: true, lawyer: { include: { user: true } } },
    });

    if (!tokenRecord || !tokenRecord.isActive) {
      await ctx.reply('❌ Посилання недійсне або протерміноване.\n\nЗверніться до адвоката за новим посиланням.');
      return;
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      await ctx.reply('❌ Посилання протерміноване.');
      return;
    }

    if (tokenRecord.maxUses && tokenRecord.usageCount >= tokenRecord.maxUses) {
      await ctx.reply('❌ Посилання вичерпано.');
      return;
    }

    const lawyerName = tokenRecord.lawyer?.user?.name ?? 'Ваш адвокат';

    ctx.session.step = 'awaiting_name';
    ctx.session.tokenData = {
      tokenId: tokenRecord.id,
      orgId: tokenRecord.orgId,
      lawyerId: tokenRecord.lawyerId,
      caseId: tokenRecord.caseId ?? undefined,
    };

    await ctx.reply(
      '👋 Ласкаво просимо до ЮрБот!\n\n' +
      'Вас запросив адвокат: ' + lawyerName + '\n\n' +
      "Вкажіть ваше повне ім'я:",
    );
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    // Handle reset confirmation
    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === 'так' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('🗑 Дані видалено. Попросіть адвоката надіслати нове посилання.');
          } else {
            await ctx.reply('❌ Дані не знайдено.');
          }
        } catch (err) {
          console.error('[Client Bot] Reset error:', err);
          ctx.session.step = 'idle';
          await ctx.reply('❌ Помилка при видаленні.');
        }
      } else {
        ctx.session.step = 'idle';
        await ctx.reply('Скасовано.');
      }
      return;
    }

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply("Вкажіть коректне ім'я (2–100 символів):");
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply('Дякую, ' + name + '!\n\nТепер вкажіть ваш номер телефону:');
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('Некоректний номер. Вкажіть у форматі +380991234567:');
        return;
      }

      const telegramId = BigInt(ctx.from!.id);
      const name = ctx.session.name!;
      const tokenData = ctx.session.tokenData!;

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { name, phone, role: 'CLIENT', telegramId },
          });

          await tx.clientProfile.create({
            data: {
              userId: user.id,
              orgId: tokenData.orgId,
              accessCode: generateAccessCode(),
              sourceTokenId: tokenData.tokenId,
            },
          });

          await tx.telegramIdentity.create({
            data: {
              userId: user.id, telegramId, chatId: telegramId, botType: 'client',
              telegramUsername: ctx.from?.username ?? null,
            },
          });

          await tx.inviteToken.update({
            where: { id: tokenData.tokenId },
            data: { usageCount: { increment: 1 } },
          });
        });

        ctx.session.step = 'idle';

        await ctx.reply(
          '✅ Реєстрацію завершено!\n\n' +
          'Ваш адвокат отримає сповіщення.\n\n' +
          'Використовуйте /help для списку команд.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '💼 ЮрБот', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Client Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Client Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('Помилка при реєстрації. Спробуйте ще раз.');
      }
      return;
    }

    await ctx.reply('Використовуйте /help для списку команд.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📋 Доступні команди:\n\n' +
      '/status — Статус моєї справи\n' +
      '/appointments — Мої записи\n' +
      '/admin — Інформація про обліковий запис\n' +
      '/reset — Скинути реєстрацію (для тестування)\n' +
      '/help — Цей список',
    );
  });

  // ── /admin — show account info ──
  bot.command('admin', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { clientProfile: true } } },
    });

    if (!identity) {
      await ctx.reply('❌ Ви не зареєстровані.');
      return;
    }

    const user = identity.user;
    const profile = user.clientProfile;
    const org = profile?.orgId ? await prisma.organization.findUnique({ where: { id: profile.orgId } }) : null;

    const lines = [
      '👤 Мій обліковий запис\n',
      '📌 Telegram ID: ' + ctx.from!.id,
      '📧 Ім\'я: ' + user.name,
      '📱 Телефон: ' + (user.phone || '—'),
      '🏛️ Організація: ' + (org?.name || '—'),
      '🔑 Код доступу: ' + (profile?.accessCode || '—'),
    ];

    await ctx.reply(lines.join('\n'));
  });

  // ── /reset — delete user data for testing ──
  bot.command('reset', async (ctx) => {
    ctx.session.step = 'awaiting_reset_confirm';
    await ctx.reply(
      '⚠️ Ви впевнені що хочете видалити свої дані?\n\n' +
      'Напишіть "так" для підтвердження:',
    );
  });

  bot.command('status', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('Спочатку пройдіть реєстрацію.'); return; }

    const profile = await prisma.clientProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const activeCases = await prisma.case.findMany({
      where: { clientId: profile.id, status: { not: 'COMPLETED' } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (activeCases.length === 0) {
      await ctx.reply('📄 У вас поки немає активних справ.');
      return;
    }

    const lines = activeCases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('📊 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.command('appointments', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('Спочатку пройдіть реєстрацію.'); return; }

    const profile = await prisma.clientProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const upcoming = await prisma.appointment.findMany({
      where: { clientId: profile.id, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    });

    if (upcoming.length === 0) {
      await ctx.reply('📅 Немає майбутніх записів.');
      return;
    }

    const lines = upcoming.map((a) => {
      const date = a.date.toLocaleDateString('uk-UA');
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '📅 ' + date + ' ' + time;
    });
    await ctx.reply('📅 Ваші записи:\n\n' + lines.join('\n'));
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
