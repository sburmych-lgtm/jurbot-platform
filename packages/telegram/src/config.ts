import { Bot, session, InlineKeyboard } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import { randomBytes } from 'crypto';
import { prisma } from '@jurbot/db';

// ─── Session types ──────────────────────────────────────────
interface OnboardingSession {
  step:
    | 'idle'
    | 'awaiting_name'
    | 'awaiting_phone'
    | 'awaiting_specialization'
    | 'awaiting_reset_confirm';
  name?: string;
  specialties?: string[];
  tokenData?: { tokenId: string; orgId: string; lawyerId: string; caseId?: string };
}

type BotContext = Context & SessionFlavor<OnboardingSession>;

interface BotOptions {
  token: string;
  miniAppUrl?: string;
  superadminTelegramId?: bigint | null;
  clientBotToken?: string;
  lawyerBotToken?: string;
}

const PLACEHOLDER_TOKEN = 'PLACEHOLDER_PROVIDE_LATER';
const TRIAL_DAYS = 14;

// Category labels for specialization picker
const SPECIALIZATION_MAP: Record<string, string> = {
  FAMILY: '👨‍👩‍👧 Сімейне',
  CIVIL: '⚖️ Цивільне',
  COMMERCIAL: '🏢 Господарське',
  CRIMINAL: '🔒 Кримінальне',
  MIGRATION: '✈️ Міграційне',
  REALESTATE: '🏠 Нерухомість',
  LABOR: '👷 Трудове',
  OTHER: '📋 Інше',
};

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

function isSuperadmin(telegramId: bigint, superadminId?: bigint | null): boolean {
  return superadminId != null && telegramId === superadminId;
}

// ─── Shared: delete user cascade ─────────────────────────────
async function deleteUserByTelegramId(telegramId: bigint): Promise<boolean> {
  const identity = await prisma.telegramIdentity.findFirst({
    where: { telegramId },
    include: { user: true },
  });

  if (!identity) return false;

  const userId = identity.userId;

  await prisma.telegramIdentity.deleteMany({ where: { userId } });

  const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (lawyerProfile) {
    await prisma.inviteToken.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.case.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.appointment.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.timeLog.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.lawyerProfile.delete({ where: { id: lawyerProfile.id } });
  }

  const clientProfile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (clientProfile) {
    await prisma.case.deleteMany({ where: { clientId: clientProfile.id } });
    await prisma.appointment.deleteMany({ where: { clientId: clientProfile.id } });
    await prisma.clientProfile.delete({ where: { id: clientProfile.id } });
  }

  const memberships = await prisma.organizationMember.findMany({ where: { userId } });
  for (const m of memberships) {
    if (m.role === 'OWNER') {
      const otherMembers = await prisma.organizationMember.count({
        where: { orgId: m.orgId, userId: { not: userId } },
      });
      if (otherMembers === 0) {
        await prisma.subscription.deleteMany({ where: { orgId: m.orgId } });
        await prisma.usageCounter.deleteMany({ where: { orgId: m.orgId } });
        await prisma.inviteToken.deleteMany({ where: { orgId: m.orgId } });
        await prisma.organizationMember.deleteMany({ where: { orgId: m.orgId } });
        await prisma.organization.delete({ where: { id: m.orgId } });
      }
    }
  }
  await prisma.organizationMember.deleteMany({ where: { userId } });

  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.upload.deleteMany({ where: { uploadedById: userId } });

  await prisma.user.delete({ where: { id: userId } });

  return true;
}

// ─── Notify lawyer when client registers ─────────────────────
async function notifyLawyerAboutClient(
  lawyerBotToken: string | undefined,
  lawyerId: string,
  clientName: string,
  clientPhone: string,
): Promise<void> {
  if (!lawyerBotToken || isPlaceholderToken(lawyerBotToken)) return;

  try {
    const lawyerProfile = await prisma.lawyerProfile.findUnique({
      where: { id: lawyerId },
      include: { user: true },
    });
    if (!lawyerProfile) return;

    const lawyerIdentity = await prisma.telegramIdentity.findFirst({
      where: { userId: lawyerProfile.userId, botType: 'lawyer' },
    });
    if (!lawyerIdentity) return;

    const text =
      '🔔 <b>Новий клієнт зареєструвався!</b>\n\n' +
      `👤 Ім'я: ${clientName}\n` +
      `📱 Телефон: ${clientPhone}\n\n` +
      '📱 Відкрийте Mini App для деталей.';

    const url = `https://api.telegram.org/bot${lawyerBotToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: lawyerIdentity.chatId.toString(),
        text,
        parse_mode: 'HTML',
      }),
    });

    // Create notification in DB
    await prisma.notification.create({
      data: {
        userId: lawyerProfile.userId,
        orgId: lawyerProfile.orgId ?? undefined,
        type: 'NEW_CLIENT',
        title: 'Новий клієнт',
        body: `${clientName} зареєструвався через ваше запрошення.`,
        telegramSent: true,
      },
    });
  } catch (err) {
    console.error('[Notify] Failed to notify lawyer:', err);
  }
}

// ─── Specialization keyboard builder ─────────────────────────
function buildSpecializationKeyboard(selected: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const entries = Object.entries(SPECIALIZATION_MAP);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const key = entry[0];
    const label = entry[1];
    const check = selected.includes(key) ? '✅ ' : '';
    kb.text(`${check}${label}`, `spec:${key}`);
    if (i % 2 === 1) kb.row();
  }

  if (selected.length > 0) {
    kb.row().text('✅ Підтвердити вибір', 'spec:done');
  }

  return kb;
}

// ─── Lawyer Dashboard Builder ────────────────────────────────
async function buildLawyerDashboard(userId: string, sa: boolean) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  let caseCount = 0, clientCount = 0, todayCount = 0;

  if (profile) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [caseCount, clientCount, todayCount] = await Promise.all([
      prisma.case.count({ where: { lawyerId: profile.id } }),
      prisma.clientProfile.count({ where: { orgId: profile.orgId! } }),
      prisma.appointment.count({ where: { lawyerId: profile.id, date: { gte: today, lt: tomorrow } } }),
    ]);
  }

  const keyboard = new InlineKeyboard()
    .text('📝 Нові заявки', 'l:intake')
    .text('📋 Мої справи', 'l:cases').row()
    .text('📅 Розклад', 'l:schedule')
    .text('📄 AI Документи', 'l:docs').row()
    .text('👥 Клієнти', 'l:clients')
    .text('⚙️ Налаштування', 'l:settings').row();

  if (sa) {
    keyboard.text('🔧 Адмін панель', 'l:admin');
  }

  const badge = sa ? ' 👑' : '';
  const text =
    `<b>⚖️ ЮрБот PRO</b>${badge}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Ваш операційний кабінет адвоката\n\n` +
    `📊 Справ: ${caseCount} | 👥 Клієнтів: ${clientCount}\n` +
    `📅 Сьогодні: ${todayCount} | 📝 Заявок: 0`;

  return { text, keyboard };
}

// ─── Mini App keyboard builder ───────────────────────────────
function buildMiniAppKeyboard(miniAppUrl: string, label: string): InlineKeyboard {
  return new InlineKeyboard().webApp(`📱 ${label}`, miniAppUrl);
}

// ═══════════════════════════════════════════════════════════════
// ─── Lawyer Bot ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function createLawyerBot(opts: BotOptions): Bot {
  const { token, miniAppUrl, superadminTelegramId } = opts;
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  // ── /start ──
  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
    console.log(`[Lawyer Bot] /start from ${telegramId}, superadmin=${sa}`);

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      // Already registered — show dashboard + Mini App
      const { text, keyboard } = await buildLawyerDashboard(existing.userId, sa);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });

      if (miniAppUrl) {
        await ctx.reply('📱 Відкрийте Mini App для повного доступу:', {
          reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот'),
        });
      }
      return;
    }

    // New user — show welcome with "Почати" button
    const badge = sa ? '\n\n👑 <i>SUPERADMIN розпізнано</i>' : '';

    await ctx.reply(
      `<b>⚖️ Ласкаво просимо до ЮрБот PRO!</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `🏛️ Платформа для сучасного адвоката:\n\n` +
      `📋 Управління справами та клієнтами\n` +
      `📅 Розклад та записи\n` +
      `📄 AI-генерація документів\n` +
      `🔗 Зв'язок з клієнтами через бот\n` +
      `📊 Аналітика та звітність\n` +
      badge,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('▶️ Почати', 'onboard:start'),
      },
    );
  });

  // ── Onboarding step 1: "Почати" pressed ──
  bot.callbackQuery('onboard:start', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    const planMsg = sa
      ? '👑 Як SUPERADMIN, ви отримаєте план <b>BUREAU</b> без обмежень.'
      : '🎁 Безкоштовний 14-денний пробний період після реєстрації.';

    await ctx.editMessageText(
      `<b>⚖️ ЮрБот PRO — Реєстрація</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `Реєстрація займе лише 2 хвилини.\n\n` +
      `Ви отримаєте:\n` +
      `✅ Особистий кабінет адвоката\n` +
      `✅ Посилання для підключення клієнтів\n` +
      `✅ Доступ до Mini App\n\n` +
      planMsg,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('📝 Зареєструватися', 'onboard:register'),
      },
    );
  });

  // ── Onboarding step 2: "Зареєструватися" pressed ──
  bot.callbackQuery('onboard:register', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = 'awaiting_name';

    await ctx.editMessageText(
      `<b>📝 Крок 1 з 3 — Ваше ім'я</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `Введіть ваше повне ім'я:`,
      { parse_mode: 'HTML' },
    );
  });

  // ── Specialization selection callbacks ──
  bot.callbackQuery(/^spec:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const value = ctx.match![1] ?? '';

    if (value === 'done') {
      // Finalize registration with selected specialties
      const telegramId = BigInt(ctx.from!.id);
      const name = ctx.session.name!;
      const sa = isSuperadmin(telegramId, superadminTelegramId);
      const specialties = (ctx.session.specialties ?? []) as Array<'FAMILY' | 'CIVIL' | 'COMMERCIAL' | 'CRIMINAL' | 'MIGRATION' | 'REALESTATE' | 'LABOR' | 'OTHER'>;

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Phone was already saved to session at step awaiting_phone
          // We stored it in ctx.session.name as "name" but phone is separate
          // Actually we need to get phone from somewhere — let me check
          // Phone should have been passed along. Let me use a different approach:
          // We'll store phone in tokenData temporarily
          const phone = (ctx.session.tokenData as unknown as { phone?: string })?.phone ?? '';

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
            data: { userId: user.id, orgId: org.id, specialties },
          });

          await tx.telegramIdentity.create({
            data: {
              userId: user.id, telegramId, chatId: telegramId, botType: 'lawyer',
              telegramUsername: ctx.from?.username ?? null,
            },
          });

          const subData = sa
            ? { orgId: org.id, plan: 'BUREAU' as const, status: 'ACTIVE' as const, trialUsed: false }
            : {
                orgId: org.id,
                plan: 'TRIAL' as const,
                status: 'TRIAL' as const,
                expiresAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
                trialUsed: true,
              };
          await tx.subscription.create({ data: subData });

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

        const specialtiesText = specialties.map(s => SPECIALIZATION_MAP[s] ?? s).join(', ');
        const planMsg = sa
          ? '👑 SUPERADMIN — план BUREAU (без обмежень)'
          : '🎁 14-денний пробний період активовано';

        const clientBotLink = `https://t.me/YurBotClientBot?start=${result.inviteToken.token}`;

        await ctx.editMessageText(
          `<b>✅ Реєстрацію завершено!</b>\n` +
          `━━━━━━━━━━━━━━━━━\n\n` +
          `👤 ${name}\n` +
          `📋 ${specialtiesText}\n` +
          `🏛️ ${result.org.name}\n` +
          `${planMsg}\n\n` +
          `🔗 <b>Посилання для клієнтів:</b>\n` +
          `<code>${clientBotLink}</code>\n\n` +
          `Надішліть це посилання клієнту для підключення.`,
          { parse_mode: 'HTML' },
        );

        // Show dashboard
        const { text: dashText, keyboard } = await buildLawyerDashboard(result.user.id, sa);
        await ctx.reply(dashText, { parse_mode: 'HTML', reply_markup: keyboard });

        // Open Mini App
        if (miniAppUrl) {
          await ctx.reply('📱 Ваш кабінет готовий! Відкрийте Mini App:', {
            reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот'),
          });

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
        console.error('[Lawyer Bot] Registration error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('❌ Помилка при реєстрації. Спробуйте /start ще раз.');
      }
      return;
    }

    // Toggle specialization
    const selected = ctx.session.specialties ?? [];
    const idx = selected.indexOf(value);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(value);
    }
    ctx.session.specialties = selected;

    const selectedText = selected.length > 0
      ? `\n\nОбрано: ${selected.map(s => SPECIALIZATION_MAP[s] ?? s).join(', ')}`
      : '';

    await ctx.editMessageText(
      `<b>📝 Крок 3 з 3 — Спеціалізація</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `Оберіть вашу спеціалізацію (можна кілька):${selectedText}`,
      {
        parse_mode: 'HTML',
        reply_markup: buildSpecializationKeyboard(selected),
      },
    );
  });

  // ── Text message handler (name, phone) ──
  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

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
        await ctx.reply('Вкажіть коректне ім\'я (2–100 символів):');
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        `<b>📝 Крок 2 з 3 — Телефон</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `Дякую, ${name}!\n\n` +
        `Вкажіть ваш номер телефону\n(наприклад, +380991234567):`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('Некоректний номер. Вкажіть у форматі +380991234567:');
        return;
      }

      // Store phone for later use in spec:done callback
      ctx.session.tokenData = { phone } as unknown as OnboardingSession['tokenData'];
      ctx.session.step = 'awaiting_specialization';
      ctx.session.specialties = [];

      await ctx.reply(
        `<b>📝 Крок 3 з 3 — Спеціалізація</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `Оберіть вашу спеціалізацію (можна кілька):`,
        {
          parse_mode: 'HTML',
          reply_markup: buildSpecializationKeyboard([]),
        },
      );
      return;
    }

    await ctx.reply('Використовуйте /help для списку команд.');
  });

  // ── Commands ──
  bot.command('help', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    let text =
      '📋 Доступні команди:\n\n' +
      '/start — Головне меню\n' +
      '/invite — Отримати посилання для клієнтів\n' +
      '/cases — Мої справи\n' +
      '/schedule — Розклад на сьогодні\n' +
      '/admin — Інформація про обліковий запис\n' +
      '/reset — Скинути реєстрацію';

    if (sa) {
      text += '\n\n👑 Superadmin:\n/stats — Системна статистика';
    }

    await ctx.reply(text);
  });

  bot.command('admin', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
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
      '👤 Адмін-панель' + (sa ? ' 👑 SUPERADMIN' : '') + '\n',
      '📌 Telegram ID: ' + ctx.from!.id,
      '📧 Ім\'я: ' + user.name,
      '📱 Телефон: ' + (user.phone || '—'),
      '🏛️ Організація: ' + (org?.name || '—'),
    ];

    if (profile?.specialties && profile.specialties.length > 0) {
      const specText = profile.specialties.map(s => SPECIALIZATION_MAP[s] ?? s).join(', ');
      lines.push('📋 Спеціалізація: ' + specText);
    }

    if (sub) {
      lines.push('📦 План: ' + sub.plan + (sa ? ' (superadmin)' : ''));
      lines.push('📅 Статус: ' + sub.status);
      if (sub.expiresAt && !sa) {
        lines.push('⏰ Дійсний до: ' + sub.expiresAt.toLocaleDateString('uk-UA'));
      }
      if (sa) {
        lines.push('♾️ Без обмежень терміну');
      }
    }

    if (profile) {
      const tokenCount = await prisma.inviteToken.count({
        where: { lawyerId: profile.id, isActive: true },
      });
      lines.push('🔗 Активних токенів: ' + tokenCount);
    }

    await ctx.reply(lines.join('\n'));
  });

  bot.command('stats', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('❌ Доступ заборонено.');
      return;
    }

    const [userCount, orgCount, caseCount, subCount, activeTrials] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.case.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
    ]);

    await ctx.reply(
      '👑 Системна статистика:\n\n' +
      '👤 Користувачів: ' + userCount + '\n' +
      '🏛️ Організацій: ' + orgCount + '\n' +
      '📁 Справ: ' + caseCount + '\n' +
      '📦 Підписок: ' + subCount + '\n' +
      '🎁 Активних тріалів: ' + activeTrials,
    );
  });

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

    const link = `https://t.me/YurBotClientBot?start=${inviteToken.token}`;

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

  // ── Callback query handlers ──
  bot.callbackQuery('l:intake', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📝 Нових заявок поки немає.\n\nЗаявки від клієнтів з\'являться тут автоматично.');
  });

  bot.callbackQuery('l:cases', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) return;
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const cases = await prisma.case.findMany({
      where: { lawyerId: profile.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (cases.length === 0) {
      await ctx.reply('📁 У вас поки немає справ.');
      return;
    }

    const lines = cases.map((c, i) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('📁 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('l:schedule', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) return;
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
      return `⏰ ${time}${a.notes ? ' — ' + a.notes : ''}`;
    });
    await ctx.reply('📅 Розклад на сьогодні:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('l:docs', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (miniAppUrl) {
      await ctx.reply('📄 AI Документи доступні через Mini App:', {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Генерація документів'),
      });
    } else {
      await ctx.reply('📄 AI Документи\n\nГенерація документів доступна через Mini App.');
    }
  });

  bot.callbackQuery('l:clients', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) return;
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile?.orgId) return;

    const clientCount = await prisma.clientProfile.count({ where: { orgId: profile.orgId } });

    if (miniAppUrl) {
      await ctx.reply(`👥 Клієнтів: ${clientCount}\n\nДетальний список:`, {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Список клієнтів'),
      });
    } else {
      await ctx.reply(`👥 Клієнтів: ${clientCount}\n\nДетальний список доступний через Mini App.`);
    }
  });

  bot.callbackQuery('l:settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { lawyerProfile: true } } },
    });
    if (!identity) return;

    const user = identity.user;
    const profile = user.lawyerProfile;
    const org = profile?.orgId ? await prisma.organization.findUnique({ where: { id: profile.orgId } }) : null;
    const sub = org ? await prisma.subscription.findUnique({ where: { orgId: org.id } }) : null;

    let text = `⚙️ Налаштування${sa ? ' 👑' : ''}\n\n`;
    text += `📌 ID: ${ctx.from!.id}\n`;
    text += `📧 Ім'я: ${user.name}\n`;
    text += `📱 Телефон: ${user.phone || '—'}\n`;
    if (org) text += `🏛️ Організація: ${org.name}\n`;
    if (sub) text += `📦 План: ${sub.plan}\n`;

    await ctx.reply(text);
  });

  bot.callbackQuery('l:admin', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('❌ Доступ заборонено.');
      return;
    }

    const [userCount, orgCount, caseCount, subCount, activeTrials] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.case.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
    ]);

    await ctx.reply(
      '🔧 Адмін панель\n\n' +
      `👤 Користувачів: ${userCount}\n` +
      `🏛️ Організацій: ${orgCount}\n` +
      `📁 Справ: ${caseCount}\n` +
      `📦 Підписок: ${subCount}\n` +
      `🎁 Активних тріалів: ${activeTrials}`,
    );
  });

  bot.catch((err) => {
    console.error('[Lawyer Bot Error]', err);
  });

  return bot as unknown as Bot;
}

// ═══════════════════════════════════════════════════════════════
// ─── Client Bot ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function createClientBot(opts: BotOptions): Bot {
  const { token, miniAppUrl, superadminTelegramId, lawyerBotToken } = opts;
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  // ── /start ──
  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
    const startParam = ctx.match?.toString().trim();

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      // Already registered — show client menu + Mini App
      const keyboard = new InlineKeyboard()
        .text('📝 Залишити заявку', 'c:intake')
        .text('📅 Записатись', 'c:book').row()
        .text('📋 Мої справи', 'c:cases')
        .text('📎 Завантажити файл', 'c:upload').row()
        .text('💬 Написати адвокату', 'c:msg')
        .text('ℹ️ Про нас', 'c:about');

      await ctx.reply(
        `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `Ваш цифровий юридичний асистент`,
        { parse_mode: 'HTML', reply_markup: keyboard },
      );

      if (miniAppUrl) {
        await ctx.reply('📱 Відкрийте Mini App для повного доступу:', {
          reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот'),
        });
      }
      return;
    }

    // Not registered
    if (!startParam && !sa) {
      // No invite token — show welcome with explanation
      await ctx.reply(
        `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `🔒 Для реєстрації потрібне посилання від адвоката.\n\n` +
        `Зверніться до вашого адвоката для отримання запрошення.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (sa && !startParam) {
      // Superadmin without token — show "Почати" button
      await ctx.reply(
        `<b>👋 ЮрБот — Клієнтський бот</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `👑 <i>SUPERADMIN розпізнано</i>\n\n` +
        `Реєстрація без запрошення.`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('▶️ Почати', 'onboard:start'),
        },
      );
      return;
    }

    // Has invite token
    if (startParam) {
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

      // Store token data in session
      ctx.session.tokenData = {
        tokenId: tokenRecord.id,
        orgId: tokenRecord.orgId,
        lawyerId: tokenRecord.lawyerId,
        caseId: tokenRecord.caseId ?? undefined,
      };

      // Show welcome with "Почати" button
      await ctx.reply(
        `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `Вас запросив адвокат: <b>${lawyerName}</b>\n\n` +
        `🔐 Безпечна платформа для:\n` +
        `• Відстеження справ\n` +
        `• Запис на консультації\n` +
        `• Обмін документами\n` +
        `• Зв'язок з адвокатом`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().text('▶️ Почати', 'onboard:start'),
        },
      );
    }
  });

  // ── Onboarding step 1: "Почати" pressed ──
  bot.callbackQuery('onboard:start', async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      `<b>📝 Реєстрація клієнта</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `Реєстрація займе менше хвилини.\n\n` +
      `Ви отримаєте:\n` +
      `✅ Особистий кабінет\n` +
      `✅ Зв'язок з адвокатом\n` +
      `✅ Доступ до Mini App`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('📝 Зареєструватися', 'onboard:register'),
      },
    );
  });

  // ── Onboarding step 2: "Зареєструватися" pressed ──
  bot.callbackQuery('onboard:register', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = 'awaiting_name';

    await ctx.editMessageText(
      `<b>📝 Крок 1 з 2 — Ваше ім'я</b>\n` +
      `━━━━━━━━━━━━━━━━━\n\n` +
      `Введіть ваше повне ім'я:`,
      { parse_mode: 'HTML' },
    );
  });

  // ── Text message handler (name, phone) ──
  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

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
        await ctx.reply('Вкажіть коректне ім\'я (2–100 символів):');
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        `<b>📝 Крок 2 з 2 — Телефон</b>\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `Дякую, ${name}!\n\n` +
        `Вкажіть ваш номер телефону:`,
        { parse_mode: 'HTML' },
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
      const tokenData = ctx.session.tokenData;
      const sa = isSuperadmin(telegramId, superadminTelegramId);

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { name, phone, role: 'CLIENT', telegramId },
          });

          if (sa && !tokenData) {
            const orgName = name + ' — Клієнтський аккаунт';
            const org = await tx.organization.create({
              data: { name: orgName, slug: slugify(orgName) },
            });
            await tx.organizationMember.create({
              data: { orgId: org.id, userId: user.id, role: 'OWNER' },
            });
            await tx.clientProfile.create({
              data: { userId: user.id, orgId: org.id, accessCode: generateAccessCode() },
            });
          } else if (tokenData) {
            await tx.clientProfile.create({
              data: {
                userId: user.id,
                orgId: tokenData.orgId,
                accessCode: generateAccessCode(),
                sourceTokenId: tokenData.tokenId,
              },
            });
            await tx.inviteToken.update({
              where: { id: tokenData.tokenId },
              data: { usageCount: { increment: 1 } },
            });
          }

          await tx.telegramIdentity.create({
            data: {
              userId: user.id, telegramId, chatId: telegramId, botType: 'client',
              telegramUsername: ctx.from?.username ?? null,
            },
          });
        });

        ctx.session.step = 'idle';

        await ctx.reply(
          `<b>✅ Реєстрацію завершено!</b>\n` +
          `━━━━━━━━━━━━━━━━━\n\n` +
          `👤 ${name}\n` +
          (sa ? '👑 SUPERADMIN доступ активовано.\n\n' : 'Ваш адвокат отримає сповіщення.\n\n'),
          { parse_mode: 'HTML' },
        );

        // Show client menu
        const clientKeyboard = new InlineKeyboard()
          .text('📝 Залишити заявку', 'c:intake')
          .text('📅 Записатись', 'c:book').row()
          .text('📋 Мої справи', 'c:cases')
          .text('📎 Завантажити файл', 'c:upload').row()
          .text('💬 Написати адвокату', 'c:msg')
          .text('ℹ️ Про нас', 'c:about');

        await ctx.reply(
          `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `Ваш цифровий юридичний асистент`,
          { parse_mode: 'HTML', reply_markup: clientKeyboard },
        );

        // Open Mini App
        if (miniAppUrl) {
          await ctx.reply('📱 Відкрийте Mini App для повного доступу:', {
            reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот'),
          });

          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '💼 ЮрБот', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Client Bot] Failed to set menu button:', e);
          }
        }

        // Notify lawyer about new client
        if (tokenData) {
          notifyLawyerAboutClient(lawyerBotToken, tokenData.lawyerId, name, phone).catch(() => {});
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

  // ── Commands ──
  bot.command('help', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    let text =
      '📋 Доступні команди:\n\n' +
      '/start — Головне меню\n' +
      '/status — Статус моєї справи\n' +
      '/appointments — Мої записи\n' +
      '/admin — Інформація про обліковий запис\n' +
      '/reset — Скинути реєстрацію';

    if (sa) {
      text += '\n\n👑 Superadmin:\n/stats — Системна статистика';
    }

    await ctx.reply(text);
  });

  bot.command('admin', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
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
      '👤 Мій обліковий запис' + (sa ? ' 👑 SUPERADMIN' : '') + '\n',
      '📌 Telegram ID: ' + ctx.from!.id,
      '📧 Ім\'я: ' + user.name,
      '📱 Телефон: ' + (user.phone || '—'),
      '🏛️ Організація: ' + (org?.name || '—'),
      '🔑 Код доступу: ' + (profile?.accessCode || '—'),
    ];

    if (sa) {
      lines.push('♾️ Повний доступ без обмежень');
    }

    await ctx.reply(lines.join('\n'));
  });

  bot.command('stats', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('❌ Доступ заборонено.');
      return;
    }

    const [userCount, orgCount, caseCount, subCount, activeTrials] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.case.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
    ]);

    await ctx.reply(
      '👑 Системна статистика:\n\n' +
      '👤 Користувачів: ' + userCount + '\n' +
      '🏛️ Організацій: ' + orgCount + '\n' +
      '📁 Справ: ' + caseCount + '\n' +
      '📦 Підписок: ' + subCount + '\n' +
      '🎁 Активних тріалів: ' + activeTrials,
    );
  });

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

  // ── Callback query handlers ──
  bot.callbackQuery('c:intake', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (miniAppUrl) {
      await ctx.reply('📝 Залишіть заявку через Mini App:', {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Нова заявка'),
      });
    } else {
      await ctx.reply('📝 Щоб залишити заявку, опишіть вашу юридичну ситуацію у повідомленні нижче.');
    }
  });

  bot.callbackQuery('c:book', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (miniAppUrl) {
      await ctx.reply('📅 Запишіться через Mini App:', {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Записатись'),
      });
    } else {
      await ctx.reply('📅 Запис на консультацію доступний через Mini App.\n\nЗверніться до адвоката для узгодження часу.');
    }
  });

  bot.callbackQuery('c:cases', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) return;
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

    const lines = activeCases.map((c, i) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('📊 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('c:upload', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📎 Надішліть файл у цей чат — він буде прикріплений до вашої справи.');
  });

  bot.callbackQuery('c:msg', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('💬 Напишіть повідомлення у цей чат — адвокат отримає сповіщення.');
  });

  bot.callbackQuery('c:about', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      'ℹ️ ЮрБот — цифровий юридичний асистент\n\n' +
      'Платформа для зв\'язку з адвокатом:\n' +
      '• Відстеження справ\n' +
      '• Запис на консультації\n' +
      '• Обмін документами\n' +
      '• Повідомлення\n\n' +
      '© DYVO digital studio · 2026',
    );
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
