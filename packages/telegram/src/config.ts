import { Bot, session, InlineKeyboard } from 'grammy';
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

interface BotOptions {
  token: string;
  miniAppUrl?: string;
  superadminTelegramId?: bigint | null;
}

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
    .text('\u{1F4DD} \u041D\u043E\u0432\u0456 \u0437\u0430\u044F\u0432\u043A\u0438', 'l:intake')
    .text('\u{1F4CB} \u041C\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438', 'l:cases').row()
    .text('\u{1F4C5} \u0420\u043E\u0437\u043A\u043B\u0430\u0434', 'l:schedule')
    .text('\u{1F4C4} AI \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0438', 'l:docs').row()
    .text('\u{1F465} \u041A\u043B\u0456\u0454\u043D\u0442\u0438', 'l:clients')
    .text('\u2699\uFE0F \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F', 'l:settings').row();

  if (sa) {
    keyboard.text('\u{1F527} \u0410\u0434\u043C\u0456\u043D \u043F\u0430\u043D\u0435\u043B\u044C', 'l:admin');
  }

  const badge = sa ? ' \u{1F451}' : '';
  const text =
    `<b>\u2696\uFE0F \u042E\u0440\u0411\u043E\u0442 PRO</b>${badge}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\u0412\u0430\u0448 \u043E\u043F\u0435\u0440\u0430\u0446\u0456\u0439\u043D\u0438\u0439 \u043A\u0430\u0431\u0456\u043D\u0435\u0442 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430\n\n` +
    `\u{1F4CA} \u0421\u043F\u0440\u0430\u0432: ${caseCount} | \u{1F465} \u041A\u043B\u0456\u0454\u043D\u0442\u0456\u0432: ${clientCount}\n` +
    `\u{1F4C5} \u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456: ${todayCount} | \u{1F4DD} \u0417\u0430\u044F\u0432\u043E\u043A: 0`;

  return { text, keyboard };
}

// ─── Lawyer Bot ─────────────────────────────────────────────
export function createLawyerBot(opts: BotOptions): Bot {
  const { token, miniAppUrl, superadminTelegramId } = opts;
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
    console.log(`[Lawyer Bot] /start from ${telegramId}, superadmin=${sa}`);

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      const { text, keyboard } = await buildLawyerDashboard(existing.userId, sa);
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
      return;
    }

    ctx.session.step = 'awaiting_name';

    if (sa) {
      await ctx.reply(
        '\u{1F451} SUPERADMIN \u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u043E!\n\n' +
        '\u2696\uFE0F \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!\n' +
        '\u042F \u0434\u043E\u043F\u043E\u043C\u043E\u0436\u0443 \u0432\u0430\u043C \u043A\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0441\u043F\u0440\u0430\u0432\u0430\u043C\u0438, \u043A\u043B\u0456\u0454\u043D\u0442\u0430\u043C\u0438 \u0442\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438.\n\n' +
        '\u{1F4E6} \u041F\u0456\u0441\u043B\u044F \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u0432\u0438 \u043E\u0442\u0440\u0438\u043C\u0430\u0454\u0442\u0435 \u043F\u043B\u0430\u043D BUREAU \u0431\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C.\n\n' +
        '\u0414\u043B\u044F \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
      );
    } else {
      await ctx.reply(
        '\u2696\uFE0F \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!\n\n' +
        '\u042F \u0434\u043E\u043F\u043E\u043C\u043E\u0436\u0443 \u0432\u0430\u043C \u043A\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0441\u043F\u0440\u0430\u0432\u0430\u043C\u0438, \u043A\u043B\u0456\u0454\u043D\u0442\u0430\u043C\u0438 \u0442\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438.\n\n' +
        '\u0414\u043B\u044F \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
      );
    }
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === '\u0442\u0430\u043A' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('\u{1F5D1} \u0414\u0430\u043D\u0456 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C /start \u0434\u043B\u044F \u043D\u043E\u0432\u043E\u0457 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457.');
          } else {
            await ctx.reply('\u274C \u0414\u0430\u043D\u0456 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.');
          }
        } catch (err) {
          console.error('[Lawyer Bot] Reset error:', err);
          ctx.session.step = 'idle';
          await ctx.reply('\u274C \u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u0440\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u0456. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.');
        }
      } else {
        ctx.session.step = 'idle';
        await ctx.reply('\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E.');
      }
      return;
    }

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply('\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0435 \u0456\u043C\'\u044F (2\u2013100 \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432):');
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        '\u0414\u044F\u043A\u0443\u044E, ' + name + '!\n\n' +
        '\u0422\u0435\u043F\u0435\u0440 \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443 (\u043D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434, +380991234567):',
      );
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('\u041D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0438\u0439 \u043D\u043E\u043C\u0435\u0440. \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0443 \u0444\u043E\u0440\u043C\u0430\u0442\u0456 +380991234567:');
        return;
      }

      const telegramId = BigInt(ctx.from!.id);
      const name = ctx.session.name!;
      const sa = isSuperadmin(telegramId, superadminTelegramId);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { name, phone, role: 'LAWYER', telegramId },
          });

          const orgName = name + ' \u2014 \u042E\u0440\u0438\u0434\u0438\u0447\u043D\u0430 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430';
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

        const botUsername = ctx.me.username;
        const clientBotUsername = botUsername.replace('Pro', 'Client').replace('pro', 'client');
        const inviteLink = 'https://t.me/' + clientBotUsername + '?start=' + result.inviteToken.token;

        const planMsg = sa
          ? '\u{1F451} SUPERADMIN \u2014 \u043F\u043B\u0430\u043D BUREAU (\u0431\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C)'
          : '\u{1F381} 14-\u0434\u0435\u043D\u043D\u0438\u0439 \u043F\u0440\u043E\u0431\u043D\u0438\u0439 \u043F\u0435\u0440\u0456\u043E\u0434 \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E';

        await ctx.reply(
          '\u2705 \u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E!\n\n' +
          '\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044E \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E\n' +
          planMsg + '\n\n' +
          '\u{1F517} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432:\n' + inviteLink,
        );

        // Show the dashboard right after registration
        const { text: dashText, keyboard } = await buildLawyerDashboard(result.user.id, sa);
        await ctx.reply(dashText, { parse_mode: 'HTML', reply_markup: keyboard });

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\u{1F4BC} \u042E\u0440\u0411\u043E\u0442', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Lawyer Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Lawyer Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u0440\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 /start \u0449\u0435 \u0440\u0430\u0437.');
      }
      return;
    }

    await ctx.reply('\u0412\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0443 \u043A\u043E\u043C\u0430\u043D\u0434.');
  });

  bot.command('help', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    let text =
      '\u{1F4CB} \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043A\u043E\u043C\u0430\u043D\u0434\u0438:\n\n' +
      '/start \u2014 \u0413\u043E\u043B\u043E\u0432\u043D\u0435 \u043C\u0435\u043D\u044E\n' +
      '/invite \u2014 \u041E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432\n' +
      '/cases \u2014 \u041C\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438\n' +
      '/schedule \u2014 \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456\n' +
      '/admin \u2014 \u0406\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u043F\u0440\u043E \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441\n' +
      '/reset \u2014 \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E';

    if (sa) {
      text += '\n\n\u{1F451} Superadmin:\n/stats \u2014 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430';
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
      await ctx.reply('\u274C \u0412\u0438 \u043D\u0435 \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u043E\u0432\u0430\u043D\u0456. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C /start');
      return;
    }

    const user = identity.user;
    const profile = user.lawyerProfile;
    const org = profile?.orgId ? await prisma.organization.findUnique({ where: { id: profile.orgId } }) : null;
    const sub = org ? await prisma.subscription.findUnique({ where: { orgId: org.id } }) : null;

    const lines = [
      '\u{1F464} \u0410\u0434\u043C\u0456\u043D-\u043F\u0430\u043D\u0435\u043B\u044C' + (sa ? ' \u{1F451} SUPERADMIN' : '') + '\n',
      '\u{1F4CC} Telegram ID: ' + ctx.from!.id,
      '\u{1F4E7} \u0406\u043C\'\u044F: ' + user.name,
      '\u{1F4F1} \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ' + (user.phone || '\u2014'),
      '\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044F: ' + (org?.name || '\u2014'),
    ];

    if (sub) {
      lines.push('\u{1F4E6} \u041F\u043B\u0430\u043D: ' + sub.plan + (sa ? ' (superadmin)' : ''));
      lines.push('\u{1F4C5} \u0421\u0442\u0430\u0442\u0443\u0441: ' + sub.status);
      if (sub.expiresAt && !sa) {
        lines.push('\u23F0 \u0414\u0456\u0439\u0441\u043D\u0438\u0439 \u0434\u043E: ' + sub.expiresAt.toLocaleDateString('uk-UA'));
      }
      if (sa) {
        lines.push('\u267E\uFE0F \u0411\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C \u0442\u0435\u0440\u043C\u0456\u043D\u0443');
      }
    }

    if (profile) {
      const tokenCount = await prisma.inviteToken.count({
        where: { lawyerId: profile.id, isActive: true },
      });
      lines.push('\u{1F517} \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u043E\u043A\u0435\u043D\u0456\u0432: ' + tokenCount);
    }

    await ctx.reply(lines.join('\n'));
  });

  bot.command('stats', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('\u274C \u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u043E.');
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
      '\u{1F451} \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:\n\n' +
      '\u{1F464} \u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432: ' + userCount + '\n' +
      '\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u0439: ' + orgCount + '\n' +
      '\u{1F4C1} \u0421\u043F\u0440\u0430\u0432: ' + caseCount + '\n' +
      '\u{1F4E6} \u041F\u0456\u0434\u043F\u0438\u0441\u043E\u043A: ' + subCount + '\n' +
      '\u{1F381} \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u0440\u0456\u0430\u043B\u0456\u0432: ' + activeTrials,
    );
  });

  bot.command('reset', async (ctx) => {
    ctx.session.step = 'awaiting_reset_confirm';
    await ctx.reply(
      '\u26A0\uFE0F \u0412\u0438 \u0432\u043F\u0435\u0432\u043D\u0435\u043D\u0456 \u0449\u043E \u0445\u043E\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0432\u043E\u0457 \u0434\u0430\u043D\u0456?\n\n' +
      '\u0426\u0435 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u044C:\n' +
      '\u2022 \u0412\u0430\u0448 \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441\n' +
      '\u2022 \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044E (\u044F\u043A\u0449\u043E \u0432\u0438 \u0432\u043B\u0430\u0441\u043D\u0438\u043A)\n' +
      '\u2022 \u0412\u0441\u0456 \u0441\u043F\u0440\u0430\u0432\u0438 \u0442\u0430 \u0437\u0430\u043F\u0438\u0441\u0438\n' +
      '\u2022 \u0406\u043D\u0432\u0430\u0439\u0442-\u0442\u043E\u043A\u0435\u043D\u0438\n\n' +
      '\u041D\u0430\u043F\u0438\u0448\u0456\u0442\u044C "\u0442\u0430\u043A" \u0434\u043B\u044F \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F:',
    );
  });

  bot.command('invite', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity?.user.lawyerProfile?.orgId) {
      await ctx.reply('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u043E\u0439\u0434\u0456\u0442\u044C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E: /start');
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
      '\u{1F517} \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432:\n\n' + link + '\n\n' +
      '\u041D\u0430\u0434\u0456\u0448\u043B\u0456\u0442\u044C \u043A\u043B\u0456\u0454\u043D\u0442\u0443 \u0434\u043B\u044F \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044F.',
    );
  });

  bot.command('cases', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u043E\u0439\u0434\u0456\u0442\u044C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E: /start'); return; }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) { await ctx.reply('\u041F\u0440\u043E\u0444\u0456\u043B\u044C \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.'); return; }

    const cases = await prisma.case.findMany({
      where: { lawyerId: profile.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (cases.length === 0) {
      await ctx.reply('\u{1F4C1} \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = cases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('\u{1F4C1} \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
  });

  bot.command('schedule', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u043E\u0439\u0434\u0456\u0442\u044C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E: /start'); return; }

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
      await ctx.reply('\u{1F4C5} \u041D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043D\u0435\u043C\u0430\u0454 \u0437\u0430\u043F\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = appointments.map((a) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\u23F0 ' + time + (a.notes ? ' \u2014 ' + a.notes : '');
    });
    await ctx.reply('\u{1F4C5} \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456:\n\n' + lines.join('\n'));
  });

  // ── Callback query handlers ──
  bot.callbackQuery('l:intake', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4DD} \u041D\u043E\u0432\u0438\u0445 \u0437\u0430\u044F\u0432\u043E\u043A \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454.\n\n\u0417\u0430\u044F\u0432\u043A\u0438 \u0432\u0456\u0434 \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432 \u0437\'\u044F\u0432\u043B\u044F\u0442\u044C\u0441\u044F \u0442\u0443\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E.');
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
      await ctx.reply('\u{1F4C1} \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = cases.map((c, i) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('\u{1F4C1} \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
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
      await ctx.reply('\u{1F4C5} \u041D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043D\u0435\u043C\u0430\u0454 \u0437\u0430\u043F\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = appointments.map((a) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return `\u23F0 ${time}${a.notes ? ' \u2014 ' + a.notes : ''}`;
    });
    await ctx.reply('\u{1F4C5} \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('l:docs', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4C4} AI \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0438\n\n\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0456\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0456\u0432 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0447\u0435\u0440\u0435\u0437 Mini App.');
  });

  bot.callbackQuery('l:clients', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) return;
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile?.orgId) return;

    const clientCount = await prisma.clientProfile.count({ where: { orgId: profile.orgId } });
    await ctx.reply(`\u{1F465} \u041A\u043B\u0456\u0454\u043D\u0442\u0456\u0432: ${clientCount}\n\n\u0414\u0435\u0442\u0430\u043B\u044C\u043D\u0438\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0447\u0435\u0440\u0435\u0437 Mini App.`);
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

    let text = `\u2699\uFE0F \u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F${sa ? ' \u{1F451}' : ''}\n\n`;
    text += `\u{1F4CC} ID: ${ctx.from!.id}\n`;
    text += `\u{1F4E7} \u0406\u043C'\u044F: ${user.name}\n`;
    text += `\u{1F4F1} \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ${user.phone || '\u2014'}\n`;
    if (org) text += `\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044F: ${org.name}\n`;
    if (sub) text += `\u{1F4E6} \u041F\u043B\u0430\u043D: ${sub.plan}\n`;

    await ctx.reply(text);
  });

  bot.callbackQuery('l:admin', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('\u274C \u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u043E.');
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
      '\u{1F527} \u0410\u0434\u043C\u0456\u043D \u043F\u0430\u043D\u0435\u043B\u044C\n\n' +
      `\u{1F464} \u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432: ${userCount}\n` +
      `\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u0439: ${orgCount}\n` +
      `\u{1F4C1} \u0421\u043F\u0440\u0430\u0432: ${caseCount}\n` +
      `\u{1F4E6} \u041F\u0456\u0434\u043F\u0438\u0441\u043E\u043A: ${subCount}\n` +
      `\u{1F381} \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u0440\u0456\u0430\u043B\u0456\u0432: ${activeTrials}`,
    );
  });

  bot.catch((err) => {
    console.error('[Lawyer Bot Error]', err);
  });

  return bot as unknown as Bot;
}

// ─── Client Bot ─────────────────────────────────────────────
export function createClientBot(opts: BotOptions): Bot {
  const { token, miniAppUrl, superadminTelegramId } = opts;
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);
    const startParam = ctx.match?.toString().trim();

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      const keyboard = new InlineKeyboard()
        .text('\u{1F4DD} \u0417\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0437\u0430\u044F\u0432\u043A\u0443', 'c:intake')
        .text('\u{1F4C5} \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438\u0441\u044C', 'c:book').row()
        .text('\u{1F4CB} \u041C\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438', 'c:cases')
        .text('\u{1F4CE} \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0444\u0430\u0439\u043B', 'c:upload').row()
        .text('\u{1F4AC} \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0443', 'c:msg')
        .text('\u2139\uFE0F \u041F\u0440\u043E \u043D\u0430\u0441', 'c:about');

      await ctx.reply(
        `<b>\u{1F44B} \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!</b>\n` +
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
        `\u0412\u0430\u0448 \u0446\u0438\u0444\u0440\u043E\u0432\u0438\u0439 \u044E\u0440\u0438\u0434\u0438\u0447\u043D\u0438\u0439 \u0430\u0441\u0438\u0441\u0442\u0435\u043D\u0442`,
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
      return;
    }

    if (!startParam && !sa) {
      await ctx.reply(
        '\u2757 \u0414\u043B\u044F \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0432\u0456\u0434 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430.\n\n' +
        '\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0432\u0430\u0448\u043E\u0433\u043E \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u0434\u043B\u044F \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043D\u044F \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043D\u044F.',
      );
      return;
    }

    if (sa && !startParam) {
      ctx.session.step = 'awaiting_name';
      ctx.session.tokenData = undefined;
      await ctx.reply(
        '\u{1F451} SUPERADMIN \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u0431\u0435\u0437 \u0456\u043D\u0432\u0430\u0439\u0442\u0443.\n\n' +
        '\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
      );
      return;
    }

    if (startParam) {
      const tokenRecord = await prisma.inviteToken.findUnique({
        where: { token: startParam },
        include: { org: true, lawyer: { include: { user: true } } },
      });

      if (!tokenRecord || !tokenRecord.isActive) {
        await ctx.reply('\u274C \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043D\u0435\u0434\u0456\u0439\u0441\u043D\u0435 \u0430\u0431\u043E \u043F\u0440\u043E\u0442\u0435\u0440\u043C\u0456\u043D\u043E\u0432\u0430\u043D\u0435.\n\n\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u0437\u0430 \u043D\u043E\u0432\u0438\u043C \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F\u043C.');
        return;
      }

      if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
        await ctx.reply('\u274C \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043F\u0440\u043E\u0442\u0435\u0440\u043C\u0456\u043D\u043E\u0432\u0430\u043D\u0435.');
        return;
      }

      if (tokenRecord.maxUses && tokenRecord.usageCount >= tokenRecord.maxUses) {
        await ctx.reply('\u274C \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0432\u0438\u0447\u0435\u0440\u043F\u0430\u043D\u043E.');
        return;
      }

      const lawyerName = tokenRecord.lawyer?.user?.name ?? '\u0412\u0430\u0448 \u0430\u0434\u0432\u043E\u043A\u0430\u0442';

      ctx.session.step = 'awaiting_name';
      ctx.session.tokenData = {
        tokenId: tokenRecord.id,
        orgId: tokenRecord.orgId,
        lawyerId: tokenRecord.lawyerId,
        caseId: tokenRecord.caseId ?? undefined,
      };

      await ctx.reply(
        '\u{1F44B} \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!\n\n' +
        '\u0412\u0430\u0441 \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0432 \u0430\u0434\u0432\u043E\u043A\u0430\u0442: ' + lawyerName + '\n\n' +
        '\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
      );
    }
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === '\u0442\u0430\u043A' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('\u{1F5D1} \u0414\u0430\u043D\u0456 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E. \u041F\u043E\u043F\u0440\u043E\u0441\u0456\u0442\u044C \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u043D\u043E\u0432\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F.');
          } else {
            await ctx.reply('\u274C \u0414\u0430\u043D\u0456 \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.');
          }
        } catch (err) {
          console.error('[Client Bot] Reset error:', err);
          ctx.session.step = 'idle';
          await ctx.reply('\u274C \u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u0440\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u0456.');
        }
      } else {
        ctx.session.step = 'idle';
        await ctx.reply('\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E.');
      }
      return;
    }

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply('\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0435 \u0456\u043C\'\u044F (2\u2013100 \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432):');
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply('\u0414\u044F\u043A\u0443\u044E, ' + name + '!\n\n\u0422\u0435\u043F\u0435\u0440 \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443:');
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('\u041D\u0435\u043A\u043E\u0440\u0435\u043A\u0442\u043D\u0438\u0439 \u043D\u043E\u043C\u0435\u0440. \u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0443 \u0444\u043E\u0440\u043C\u0430\u0442\u0456 +380991234567:');
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
            const orgName = name + ' \u2014 \u041A\u043B\u0456\u0454\u043D\u0442\u0441\u044C\u043A\u0438\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442';
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
          '\u2705 \u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E!\n\n' +
          (sa ? '\u{1F451} SUPERADMIN \u0434\u043E\u0441\u0442\u0443\u043F \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E.\n\n' : '\u0412\u0430\u0448 \u0430\u0434\u0432\u043E\u043A\u0430\u0442 \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F.\n\n'),
        );

        // Show the client interface after registration
        const clientKeyboard = new InlineKeyboard()
          .text('\u{1F4DD} \u0417\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0437\u0430\u044F\u0432\u043A\u0443', 'c:intake')
          .text('\u{1F4C5} \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438\u0441\u044C', 'c:book').row()
          .text('\u{1F4CB} \u041C\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438', 'c:cases')
          .text('\u{1F4CE} \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0444\u0430\u0439\u043B', 'c:upload').row()
          .text('\u{1F4AC} \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0443', 'c:msg')
          .text('\u2139\uFE0F \u041F\u0440\u043E \u043D\u0430\u0441', 'c:about');

        await ctx.reply(
          `<b>\u{1F44B} \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!</b>\n` +
          `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
          `\u0412\u0430\u0448 \u0446\u0438\u0444\u0440\u043E\u0432\u0438\u0439 \u044E\u0440\u0438\u0434\u0438\u0447\u043D\u0438\u0439 \u0430\u0441\u0438\u0441\u0442\u0435\u043D\u0442`,
          { parse_mode: 'HTML', reply_markup: clientKeyboard },
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\u{1F4BC} \u042E\u0440\u0411\u043E\u0442', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Client Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Client Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043F\u0440\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.');
      }
      return;
    }

    await ctx.reply('\u0412\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0443 \u043A\u043E\u043C\u0430\u043D\u0434.');
  });

  bot.command('help', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    let text =
      '\u{1F4CB} \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043A\u043E\u043C\u0430\u043D\u0434\u0438:\n\n' +
      '/start \u2014 \u0413\u043E\u043B\u043E\u0432\u043D\u0435 \u043C\u0435\u043D\u044E\n' +
      '/status \u2014 \u0421\u0442\u0430\u0442\u0443\u0441 \u043C\u043E\u0454\u0457 \u0441\u043F\u0440\u0430\u0432\u0438\n' +
      '/appointments \u2014 \u041C\u043E\u0457 \u0437\u0430\u043F\u0438\u0441\u0438\n' +
      '/admin \u2014 \u0406\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u043F\u0440\u043E \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441\n' +
      '/reset \u2014 \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E';

    if (sa) {
      text += '\n\n\u{1F451} Superadmin:\n/stats \u2014 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430';
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
      await ctx.reply('\u274C \u0412\u0438 \u043D\u0435 \u0437\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u043E\u0432\u0430\u043D\u0456.');
      return;
    }

    const user = identity.user;
    const profile = user.clientProfile;
    const org = profile?.orgId ? await prisma.organization.findUnique({ where: { id: profile.orgId } }) : null;

    const lines = [
      '\u{1F464} \u041C\u0456\u0439 \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441' + (sa ? ' \u{1F451} SUPERADMIN' : '') + '\n',
      '\u{1F4CC} Telegram ID: ' + ctx.from!.id,
      '\u{1F4E7} \u0406\u043C\'\u044F: ' + user.name,
      '\u{1F4F1} \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ' + (user.phone || '\u2014'),
      '\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044F: ' + (org?.name || '\u2014'),
      '\u{1F511} \u041A\u043E\u0434 \u0434\u043E\u0441\u0442\u0443\u043F\u0443: ' + (profile?.accessCode || '\u2014'),
    ];

    if (sa) {
      lines.push('\u267E\uFE0F \u041F\u043E\u0432\u043D\u0438\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u0431\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C');
    }

    await ctx.reply(lines.join('\n'));
  });

  bot.command('stats', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    if (!isSuperadmin(telegramId, superadminTelegramId)) {
      await ctx.reply('\u274C \u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u043E.');
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
      '\u{1F451} \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:\n\n' +
      '\u{1F464} \u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432: ' + userCount + '\n' +
      '\u{1F3DB}\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u0439: ' + orgCount + '\n' +
      '\u{1F4C1} \u0421\u043F\u0440\u0430\u0432: ' + caseCount + '\n' +
      '\u{1F4E6} \u041F\u0456\u0434\u043F\u0438\u0441\u043E\u043A: ' + subCount + '\n' +
      '\u{1F381} \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u0440\u0456\u0430\u043B\u0456\u0432: ' + activeTrials,
    );
  });

  bot.command('reset', async (ctx) => {
    ctx.session.step = 'awaiting_reset_confirm';
    await ctx.reply(
      '\u26A0\uFE0F \u0412\u0438 \u0432\u043F\u0435\u0432\u043D\u0435\u043D\u0456 \u0449\u043E \u0445\u043E\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0441\u0432\u043E\u0457 \u0434\u0430\u043D\u0456?\n\n' +
      '\u041D\u0430\u043F\u0438\u0448\u0456\u0442\u044C "\u0442\u0430\u043A" \u0434\u043B\u044F \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F:',
    );
  });

  bot.command('status', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u043E\u0439\u0434\u0456\u0442\u044C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E.'); return; }

    const profile = await prisma.clientProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const activeCases = await prisma.case.findMany({
      where: { clientId: profile.id, status: { not: 'COMPLETED' } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (activeCases.length === 0) {
      await ctx.reply('\u{1F4C4} \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = activeCases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('\u{1F4CA} \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
  });

  bot.command('appointments', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({ where: { telegramId } });
    if (!identity) { await ctx.reply('\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u043E\u0439\u0434\u0456\u0442\u044C \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E.'); return; }

    const profile = await prisma.clientProfile.findUnique({ where: { userId: identity.userId } });
    if (!profile) return;

    const upcoming = await prisma.appointment.findMany({
      where: { clientId: profile.id, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    });

    if (upcoming.length === 0) {
      await ctx.reply('\u{1F4C5} \u041D\u0435\u043C\u0430\u0454 \u043C\u0430\u0439\u0431\u0443\u0442\u043D\u0456\u0445 \u0437\u0430\u043F\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = upcoming.map((a) => {
      const date = a.date.toLocaleDateString('uk-UA');
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\u{1F4C5} ' + date + ' ' + time;
    });
    await ctx.reply('\u{1F4C5} \u0412\u0430\u0448\u0456 \u0437\u0430\u043F\u0438\u0441\u0438:\n\n' + lines.join('\n'));
  });

  // ── Callback query handlers ──
  bot.callbackQuery('c:intake', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4DD} \u0429\u043E\u0431 \u0437\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0437\u0430\u044F\u0432\u043A\u0443, \u043E\u043F\u0438\u0448\u0456\u0442\u044C \u0432\u0430\u0448\u0443 \u044E\u0440\u0438\u0434\u0438\u0447\u043D\u0443 \u0441\u0438\u0442\u0443\u0430\u0446\u0456\u044E \u0443 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u0456 \u043D\u0438\u0436\u0447\u0435.\n\n\u0410\u0431\u043E \u0441\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044C Mini App.');
  });

  bot.callbackQuery('c:book', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4C5} \u0417\u0430\u043F\u0438\u0441 \u043D\u0430 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0456\u044E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0447\u0435\u0440\u0435\u0437 Mini App.\n\n\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u0434\u043B\u044F \u0443\u0437\u0433\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u0447\u0430\u0441\u0443.');
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
      await ctx.reply('\u{1F4C4} \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = activeCases.map((c, i) => `${i + 1}. ${c.title} [${c.status}]`);
    await ctx.reply('\u{1F4CA} \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
  });

  bot.callbackQuery('c:upload', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4CE} \u041D\u0430\u0434\u0456\u0448\u043B\u0456\u0442\u044C \u0444\u0430\u0439\u043B \u0443 \u0446\u0435\u0439 \u0447\u0430\u0442 \u2014 \u0432\u0456\u043D \u0431\u0443\u0434\u0435 \u043F\u0440\u0438\u043A\u0440\u0456\u043F\u043B\u0435\u043D\u0438\u0439 \u0434\u043E \u0432\u0430\u0448\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438.');
  });

  bot.callbackQuery('c:msg', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('\u{1F4AC} \u041D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0443 \u0446\u0435\u0439 \u0447\u0430\u0442 \u2014 \u0430\u0434\u0432\u043E\u043A\u0430\u0442 \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F.');
  });

  bot.callbackQuery('c:about', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      '\u2139\uFE0F \u042E\u0440\u0411\u043E\u0442 \u2014 \u0446\u0438\u0444\u0440\u043E\u0432\u0438\u0439 \u044E\u0440\u0438\u0434\u0438\u0447\u043D\u0438\u0439 \u0430\u0441\u0438\u0441\u0442\u0435\u043D\u0442\n\n' +
      '\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0434\u043B\u044F \u0437\u0432\'\u044F\u0437\u043A\u0443 \u0437 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u043E\u043C:\n' +
      '\u2022 \u0412\u0456\u0434\u0441\u0442\u0435\u0436\u0435\u043D\u043D\u044F \u0441\u043F\u0440\u0430\u0432\n' +
      '\u2022 \u0417\u0430\u043F\u0438\u0441 \u043D\u0430 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0456\u0457\n' +
      '\u2022 \u041E\u0431\u043C\u0456\u043D \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438\n' +
      '\u2022 \u041F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F\n\n' +
      '\u00A9 DYVO digital studio \u00B7 2026',
    );
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
