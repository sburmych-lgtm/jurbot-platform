import { Bot, session, InlineKeyboard } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import { randomBytes } from 'crypto';
import { prisma } from '@jurbot/db';
import type { Prisma } from '@jurbot/db';

// ─── Session types ──────────────────────────────────────────
interface OnboardingSession {
  step:
    | 'idle'
    | 'awaiting_name'
    | 'awaiting_phone'
    | 'awaiting_specialization'
    | 'awaiting_client_message'
    | 'awaiting_reset_confirm';
  name?: string;
  phone?: string;
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

type MiniAppRole = 'lawyer' | 'client';

const PLACEHOLDER_TOKEN = 'PLACEHOLDER_PROVIDE_LATER';
const TRIAL_DAYS = 14;
const CLIENT_BOT_USERNAME = 'YurBotClientBot';
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

// Category labels for specialization picker
const SPECIALIZATION_MAP: Record<string, string> = {
  FAMILY: '👨‍👩‍👧 Сімейне',
  CIVIL: '⚖️ Цивільне',
  COMMERCIAL: '🏢 Господарське',
  CRIMINAL: '🔒 Кримінальне',
  MILITARY: '🪖 Військове право',
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

function resetSession(session: OnboardingSession): void {
  session.step = 'idle';
  delete session.name;
  delete session.phone;
  delete session.specialties;
  delete session.tokenData;
}

function generateToken(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
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

    const safeName = escapeHtml(clientName);
    const safePhone = escapeHtml(clientPhone || '—');
  const text =
    '🔔 <b>Новий клієнт зареєструвався!</b>\n\n' +
    `👤 Ім'я: ${safeName}\n` +
    `📱 Телефон: ${safePhone}\n\n` +
    '📱 Відкрийте Mini App для деталей 👇';

    const telegramSent = await sendTelegramHtmlMessage(lawyerBotToken, lawyerIdentity.chatId, text);

    // Create notification in DB
    await prisma.notification.create({
      data: {
        userId: lawyerProfile.userId,
        orgId: lawyerProfile.orgId ?? undefined,
        type: 'NEW_CLIENT',
        title: 'Новий клієнт',
        body: `${clientName} зареєструвався через ваше запрошення.`,
        telegramSent,
      },
    });
  } catch (err) {
    console.error('[Notify] Failed to notify lawyer:', err);
  }
}

async function notifyLawyerAboutClientMessage(
  lawyerBotToken: string | undefined,
  lawyerId: string,
  clientName: string,
  messageText: string,
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

    const safeName = escapeHtml(clientName);
    const safeMessage = escapeHtml(messageText);
    const text =
      '💬 <b>Нове повідомлення від клієнта</b>\n\n' +
      `👤 ${safeName}\n` +
      `📝 ${safeMessage}`;

    const telegramSent = await sendTelegramHtmlMessage(lawyerBotToken, lawyerIdentity.chatId, text);

    await prisma.notification.create({
      data: {
        userId: lawyerProfile.userId,
        orgId: lawyerProfile.orgId ?? undefined,
        type: 'MESSAGE',
        title: 'Нове повідомлення від клієнта',
        body: `${clientName}: ${messageText}`,
        telegramSent,
      },
    });
  } catch (err) {
    console.error('[Notify] Failed to forward client message:', err);
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

function buildLawyerActionKeyboard(sa: boolean): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('📝 Нові заявки', 'l:intake')
    .text('📋 Мої справи', 'l:cases').row()
    .text('📅 Розклад', 'l:schedule')
    .text('🔗 Запросити клієнта', 'l:invite').row()
    .text('👥 Клієнти', 'l:clients')
    .text('📄 AI Документи', 'l:docs').row()
    .text('⚙️ Налаштування', 'l:settings');

  if (sa) {
    keyboard.row().text('🔧 Адмін панель', 'l:admin');
  }

  return keyboard;
}

function buildClientActionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📝 Залишити заявку', 'c:intake')
    .text('📅 Записатись', 'c:book').row()
    .text('📋 Мої справи', 'c:cases')
    .text('📎 Завантажити файл', 'c:upload').row()
    .text('💬 Написати адвокату', 'c:msg')
    .text('ℹ️ Про нас', 'c:about');
}

function buildClientInviteLink(token: string): string {
  void buildLawyerActionKeyboard;
  void buildClientActionKeyboard;
  return `https://t.me/${CLIENT_BOT_USERNAME}?start=${token}`;
}

async function createClientInviteLink(lawyerId: string, orgId: string): Promise<string> {
  const inviteToken = await prisma.inviteToken.create({
    data: {
      orgId,
      lawyerId,
      token: generateToken('inv'),
      tokenType: 'PUBLIC_LAWYER',
      expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  });

  return buildClientInviteLink(inviteToken.token);
}

async function sendTelegramHtmlMessage(
  botToken: string | undefined,
  chatId: bigint,
  text: string,
): Promise<boolean> {
  if (!botToken || isPlaceholderToken(botToken)) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('[Telegram Notify] Failed to send Telegram message:', err);
    return false;
  }
}

async function resolveLawyerForClient(userId: string) {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId },
    include: {
      sourceToken: {
        include: {
          lawyer: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (clientProfile?.sourceToken?.lawyer) {
    return clientProfile.sourceToken.lawyer;
  }

  if (!clientProfile?.orgId) {
    return null;
  }

  return prisma.lawyerProfile.findFirst({
    where: { orgId: clientProfile.orgId },
    include: { user: true },
  });
}

// ─── Lawyer Dashboard Builder ────────────────────────────────
async function buildLawyerDashboard(_userId: string, sa: boolean) {
  const profile = await prisma.lawyerProfile.findUnique({ where: { userId: _userId } });
  let _caseCount = 0, _clientCount = 0, _todayCount = 0;

  if (profile) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [_caseCount, _clientCount, _todayCount] = await Promise.all([
      prisma.case.count({ where: { lawyerId: profile.id } }),
      prisma.clientProfile.count({ where: { orgId: profile.orgId! } }),
      prisma.appointment.count({ where: { lawyerId: profile.id, date: { gte: today, lt: tomorrow } } }),
    ]);
  }

  void _caseCount;
  void _clientCount;
  void _todayCount;
  const keyboard = undefined;

  const badge = sa ? ' 👑' : '';
  const text =
    `<b>⚖️ ЮрБот PRO</b>${badge}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `Ваш операційний кабінет адвоката 👇`;

  return { text, keyboard };
}

// ─── Mini App keyboard builder ───────────────────────────────
function buildRoleAwareMiniAppUrl(miniAppUrl: string, role: MiniAppRole): string {
  try {
    const url = new URL(miniAppUrl);
    url.searchParams.set('startapp', role);
    return url.toString();
  } catch {
    const separator = miniAppUrl.includes('?') ? '&' : '?';
    return `${miniAppUrl}${separator}startapp=${role}`;
  }
}

function buildMiniAppKeyboard(miniAppUrl: string, label: string, role: MiniAppRole): InlineKeyboard {
  return new InlineKeyboard().webApp(`📱 ${label}`, buildRoleAwareMiniAppUrl(miniAppUrl, role));
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
      where: { telegramId, botType: 'lawyer' },
      include: { user: true },
    });

    if (existing) {
      // Already registered — show dashboard + Mini App
      const { text, keyboard } = await buildLawyerDashboard(existing.userId, sa);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });

      if (miniAppUrl) {
      await ctx.reply('📱 Відкрити ЮрБот можна тут 👇', {
          reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот', 'lawyer'),
        });

        // Ensure menu button is set
        try {
          await bot.api.setChatMenuButton({
            chat_id: Number(telegramId),
            menu_button: {
              type: 'web_app',
              text: '💼 ЮрБот',
              web_app: { url: buildRoleAwareMiniAppUrl(miniAppUrl, 'lawyer') },
            },
          });
        } catch { /* ignore */ }
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
      const specialties = (ctx.session.specialties ?? []) as Array<'FAMILY' | 'CIVIL' | 'COMMERCIAL' | 'CRIMINAL' | 'MILITARY' | 'MIGRATION' | 'REALESTATE' | 'LABOR' | 'OTHER'>;

      try {
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const phone = ctx.session.phone ?? '';

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

        resetSession(ctx.session);

        const specialtiesText = specialties.map(s => SPECIALIZATION_MAP[s] ?? s).join(', ');
        const planMsg = sa
          ? '👑 SUPERADMIN — план BUREAU (без обмежень)'
          : '🎁 14-денний пробний період активовано';

        const clientBotLink = buildClientInviteLink(result.inviteToken.token);

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
        await ctx.reply('📱 Ваш кабінет готовий. Відкрити ЮрБот можна тут 👇', {
            reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот', 'lawyer'),
          });

          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: {
                type: 'web_app',
                text: '💼 ЮрБот',
                web_app: { url: buildRoleAwareMiniAppUrl(miniAppUrl, 'lawyer') },
              },
            });
          } catch (e) {
            console.warn('[Lawyer Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Lawyer Bot] Registration error:', err);
        resetSession(ctx.session);
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

    if (ctx.message.text.startsWith('/')) {
      return;
    }

    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === 'так' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          resetSession(ctx.session);
          if (deleted) {
            await ctx.reply('🗑 Дані видалено. Натисніть /start для нової реєстрації.');
          } else {
            await ctx.reply('❌ Дані не знайдено.');
          }
        } catch (err) {
          console.error('[Lawyer Bot] Reset error:', err);
          resetSession(ctx.session);
          await ctx.reply('❌ Помилка при видаленні. Спробуйте ще раз.');
        }
      } else {
        resetSession(ctx.session);
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
      ctx.session.phone = phone;
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
      where: { telegramId, botType: 'lawyer' },
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
      const specText = profile.specialties.map((s: keyof typeof SPECIALIZATION_MAP) => SPECIALIZATION_MAP[s] ?? s).join(', ');
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
      where: { telegramId, botType: 'lawyer' },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity?.user.lawyerProfile?.orgId) {
      await ctx.reply('Спочатку пройдіть реєстрацію: /start');
      return;
    }

    const profile = identity.user.lawyerProfile;
    const link = await createClientInviteLink(profile.id, profile.orgId!);

    await ctx.reply(
      '🔗 Посилання для клієнтів:\n\n' + link + '\n\n' +
      'Надішліть клієнту для підключення.',
    );
  });

  bot.command('cases', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'lawyer' } });
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

    const lines = cases.map((c: { title: string; status: string }, i: number) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('📁 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.command('schedule', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'lawyer' } });
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

    const lines = appointments.map((a: { date: Date; notes: string | null }) => {
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
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'lawyer' } });
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

    const lines = cases.map((c: { title: string; status: string }, i: number) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('📁 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('l:schedule', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'lawyer' } });
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

    const lines = appointments.map((a: { date: Date; notes?: string | null }) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return `⏰ ${time}${a.notes ? ' — ' + a.notes : ''}`;
    });
    await ctx.reply('📅 Розклад на сьогодні:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('l:invite', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId, botType: 'lawyer' },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity?.user.lawyerProfile?.orgId) {
      await ctx.reply('Спочатку завершіть реєстрацію, щоб запросити клієнта.');
      return;
    }

    const profile = identity.user.lawyerProfile;
    const link = await createClientInviteLink(profile.id, profile.orgId!);
    await ctx.reply(
      '🔗 Готово! Надішліть це посилання клієнту:\n\n' +
      link +
      '\n\nПісля реєстрації клієнт автоматично прив’яжеться до вашого акаунта.',
    );
  });

  bot.callbackQuery('l:docs', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (miniAppUrl) {
      await ctx.reply('📄 Генерація документа доступна через Mini App:', {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Генерація документів', 'lawyer'),
      });
    } else {
      await ctx.reply('📄 Генерація документа\n\nГенерація документів доступна через Mini App.');
    }
  });

  bot.callbackQuery('l:clients', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'lawyer' } });
    if (!identity) return;
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile?.orgId) return;

    const clientCount = await prisma.clientProfile.count({ where: { orgId: profile.orgId } });

    if (miniAppUrl) {
      await ctx.reply(`👥 Клієнтів: ${clientCount}\n\nДетальний список:`, {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Список клієнтів', 'lawyer'),
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
      where: { telegramId, botType: 'lawyer' },
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
      where: { telegramId, botType: 'client' },
      include: { user: true },
    });

    if (existing) {
      // Already registered — show client menu + Mini App
      await ctx.reply(
      `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `Ваш цифровий юридичний асистент\n\n` +
        `📅 Запис доступний через miniapp 👇`,
      { parse_mode: 'HTML' },
      );

      if (miniAppUrl) {
      await ctx.reply('📱 Відкрити ЮрБот можна тут 👇', {
          reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот', 'client'),
        });

        // Ensure menu button is set
        try {
          await bot.api.setChatMenuButton({
            chat_id: Number(telegramId),
            menu_button: {
              type: 'web_app',
              text: '💼 ЮрБот',
              web_app: { url: buildRoleAwareMiniAppUrl(miniAppUrl, 'client') },
            },
          });
        } catch { /* ignore */ }
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

    if (ctx.message.text.startsWith('/')) {
      return;
    }

    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === 'так' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          resetSession(ctx.session);
          if (deleted) {
            await ctx.reply('🗑 Дані видалено. Попросіть адвоката надіслати нове посилання.');
          } else {
            await ctx.reply('❌ Дані не знайдено.');
          }
        } catch (err) {
          console.error('[Client Bot] Reset error:', err);
          resetSession(ctx.session);
          await ctx.reply('❌ Помилка при видаленні.');
        }
      } else {
        resetSession(ctx.session);
        await ctx.reply('Скасовано.');
      }
      return;
    }

    if (step === 'awaiting_client_message') {
      const messageText = ctx.message.text.trim();
      if (messageText.length < 2) {
        await ctx.reply('Напишіть, будь ласка, трохи детальніше, щоб я передав це адвокату.');
        return;
      }

      const telegramId = BigInt(ctx.from!.id);
      const identity = await prisma.telegramIdentity.findFirst({
        where: { telegramId, botType: 'client' },
        include: { user: true },
      });

      if (!identity) {
        resetSession(ctx.session);
        await ctx.reply('Спочатку завершіть реєстрацію через кнопку "Почати".');
        return;
      }

      const lawyer = await resolveLawyerForClient(identity.userId);
      if (!lawyer) {
        resetSession(ctx.session);
        await ctx.reply('Не вдалося знайти вашого адвоката. Спробуйте ще раз трохи пізніше.');
        return;
      }

      await notifyLawyerAboutClientMessage(
        lawyerBotToken,
        lawyer.id,
        identity.user.name,
        messageText,
      );

      resetSession(ctx.session);
      await ctx.reply('✅ Повідомлення передано адвокату. Якщо потрібно, натисніть "💬 Написати адвокату" ще раз.');
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
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

        resetSession(ctx.session);

        await ctx.reply(
          `<b>✅ Реєстрацію завершено!</b>\n` +
          `━━━━━━━━━━━━━━━━━\n\n` +
          `👤 ${name}\n` +
          (sa ? '👑 SUPERADMIN доступ активовано.\n\n' : 'Ваш адвокат отримає сповіщення.\n\n'),
          { parse_mode: 'HTML' },
        );

        // Show client menu
        await ctx.reply(
        `<b>👋 Ласкаво просимо до ЮрБот!</b>\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `Ваш цифровий юридичний асистент\n\n` +
          `📅 Запис доступний через miniapp 👇`,
        { parse_mode: 'HTML' },
        );

        // Open Mini App
        if (miniAppUrl) {
        await ctx.reply('📱 Відкрити ЮрБот можна тут 👇', {
            reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Відкрити ЮрБот', 'client'),
          });

          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: {
                type: 'web_app',
                text: '💼 ЮрБот',
                web_app: { url: buildRoleAwareMiniAppUrl(miniAppUrl, 'client') },
              },
            });
          } catch (e) {
            console.warn('[Client Bot] Failed to set menu button:', e);
          }
        }

        // Notify lawyer about new client
        if (tokenData) {
          await notifyLawyerAboutClient(lawyerBotToken, tokenData.lawyerId, name, phone);
        }
      } catch (err) {
        console.error('[Client Bot] Onboarding error:', err);
        resetSession(ctx.session);
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
      where: { telegramId, botType: 'client' },
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
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'client' } });
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

    const lines = activeCases.map((c: { title: string; status: string }, i: number) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('📊 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.command('appointments', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'client' } });
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

    const lines = upcoming.map((a: { date: Date }) => {
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
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Нова заявка', 'client'),
      });
    } else {
      await ctx.reply('📝 Щоб залишити заявку, опишіть вашу юридичну ситуацію у повідомленні нижче.');
    }
  });

  bot.callbackQuery('c:book', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (miniAppUrl) {
      await ctx.reply('📅 Запишіться через Mini App:', {
        reply_markup: buildMiniAppKeyboard(miniAppUrl, 'Записатись', 'client'),
      });
    } else {
      await ctx.reply('📅 Запис на консультацію доступний через Mini App.\n\nЗверніться до адвоката для узгодження часу.');
    }
  });

  bot.callbackQuery('c:cases', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId, botType: 'client' } });
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

    const lines = activeCases.map((c: { title: string; status: string }, i: number) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('📊 Ваші справи:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('c:upload', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📎 Надішліть файл у цей чат — він буде прикріплений до вашої справи.');
  });

  bot.callbackQuery('c:msg', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = 'awaiting_client_message';
    await ctx.reply('💬 Напишіть повідомлення у цей чат — я одразу передам його адвокату.');
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

  // ── Document & photo upload handler (Bug 12 fix) ──
  bot.on(['message:document', 'message:photo'], async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId, botType: 'client' },
      include: { user: { include: { clientProfile: true } } },
    });

    if (!identity?.user?.clientProfile) {
      await ctx.reply('Спочатку завершіть реєстрацію через кнопку "Почати".');
      return;
    }

    const clientProfile = identity.user.clientProfile;
    const activeCase = await prisma.case.findFirst({
      where: { clientId: clientProfile.id, status: { not: 'COMPLETED' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCase) {
      await ctx.reply('У вас немає активної справи, до якої можна прикріпити файл.');
      return;
    }

    const doc = ctx.message.document;
    const photo = ctx.message.photo;
    const fileName = doc?.file_name ?? `photo_${Date.now()}.jpg`;
    const fileSize = doc?.file_size ?? photo?.[photo.length - 1]?.file_size ?? 0;
    const mimeType = doc?.mime_type ?? 'image/jpeg';
    const fileId = doc?.file_id ?? photo?.[photo.length - 1]?.file_id;

    if (!fileId) {
      await ctx.reply('❌ Не вдалося отримати файл. Спробуйте ще раз.');
      return;
    }

    try {
      // Store as Document record linked to the case
      await prisma.document.create({
        data: {
          name: fileName,
          type: mimeType,
          size: String(fileSize),
          content: `telegram:${fileId}`,
          status: 'DRAFT',
          caseId: activeCase.id,
          orgId: clientProfile.orgId,
        },
      });

      // Notify the lawyer
      const lawyer = await resolveLawyerForClient(identity.userId);
      if (lawyer && lawyerBotToken) {
        const lawyerIdentity = await prisma.telegramIdentity.findFirst({
          where: { userId: lawyer.userId, botType: 'lawyer' },
        });
        if (lawyerIdentity) {
          const safeName = escapeHtml(identity.user.name);
          const safeFile = escapeHtml(fileName);
          const notifyBot = new Bot(lawyerBotToken);
          await notifyBot.api.sendMessage(
            lawyerIdentity.telegramId.toString(),
            `📎 <b>Клієнт ${safeName}</b> завантажив файл:\n<i>${safeFile}</i>\n\nСправа: ${escapeHtml(activeCase.title)}`,
            { parse_mode: 'HTML' },
          );
        }
      }

      await ctx.reply(`✅ Файл "${fileName}" прикріплено до справи "${activeCase.title}".`);
    } catch (err) {
      console.error('[Client Bot] Upload error:', err);
      await ctx.reply('❌ Помилка при збереженні файлу. Спробуйте пізніше.');
    }
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
