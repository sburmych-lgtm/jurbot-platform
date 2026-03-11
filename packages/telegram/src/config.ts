import { Bot, session } from 'grammy';
import type { Context, SessionFlavor } from 'grammy';
import { randomBytes } from 'crypto';
import { prisma } from '@jurbot/db';

// ─── Session types ──────────────────────────────────────────
interface OnboardingSession {
  step: 'idle' | 'awaiting_name' | 'awaiting_phone';
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
  return randomBytes(3).toString('hex'); // 6-char hex code
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
        '\u2696\ufe0f \u0412\u0456\u0442\u0430\u0454\u043c\u043e \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f, ' + existing.user.name + '!\n\n' +
        '\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434.',
      );
      return;
    }

    ctx.session.step = 'awaiting_name';
    await ctx.reply(
      '\u2696\ufe0f \u041b\u0430\u0441\u043a\u0430\u0432\u043e \u043f\u0440\u043e\u0441\u0438\u043c\u043e \u0434\u043e \u042e\u0440\u0411\u043e\u0442!\n\n' +
      '\u042f \u0434\u043e\u043f\u043e\u043c\u043e\u0436\u0443 \u0432\u0430\u043c \u043a\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0441\u043f\u0440\u0430\u0432\u0430\u043c\u0438, \u043a\u043b\u0456\u0454\u043d\u0442\u0430\u043c\u0438 \u0442\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c\u0438.\n\n' +
      "\u0414\u043b\u044f \u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0432\u043a\u0430\u0436\u0456\u0442\u044c \u0432\u0430\u0448\u0435 \u043f\u043e\u0432\u043d\u0435 \u0456\u043c'\u044f:",
    );
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply("\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0435 \u0456\u043c'\u044f (2\u2013100 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432):");
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        '\u0414\u044f\u043a\u0443\u044e, ' + name + '!\n\n' +
        '\u0422\u0435\u043f\u0435\u0440 \u0432\u043a\u0430\u0436\u0456\u0442\u044c \u0432\u0430\u0448 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443 (\u043d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434, +380991234567):',
      );
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u043d\u043e\u043c\u0435\u0440. \u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0443 \u0444\u043e\u0440\u043c\u0430\u0442\u0456 +380991234567:');
        return;
      }

      const telegramId = BigInt(ctx.from!.id);
      const name = ctx.session.name!;

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { name, phone, role: 'LAWYER', telegramId },
          });

          const orgName = name + ' \u2014 \u042e\u0440\u0438\u0434\u0438\u0447\u043d\u0430 \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430';
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
          '\u2705 \u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e!\n\n' +
          '\ud83c\udfdb\ufe0f \u041e\u0440\u0433\u0430\u043d\u0456\u0437\u0430\u0446\u0456\u044e \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e\n' +
          '\ud83c\udf81 14-\u0434\u0435\u043d\u043d\u0438\u0439 \u043f\u0440\u043e\u0431\u043d\u0438\u0439 \u043f\u0435\u0440\u0456\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u043e\u0432\u0430\u043d\u043e\n\n' +
          '\ud83d\udd17 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0434\u043b\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432:\n' + inviteLink + '\n\n' +
          '\u041d\u0430\u0434\u0456\u0448\u043b\u0456\u0442\u044c \u0446\u0435 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0430\u043c \u0434\u043b\u044f \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\ud83d\udcbc \u042e\u0440\u0411\u043e\u0442', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Lawyer Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Lawyer Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u043f\u0440\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 /start \u0449\u0435 \u0440\u0430\u0437.');
      }
      return;
    }

    await ctx.reply('\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '\ud83d\udccb \u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u043a\u043e\u043c\u0430\u043d\u0434\u0438:\n\n' +
      '/invite \u2014 \u041e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0434\u043b\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432\n' +
      '/cases \u2014 \u041c\u043e\u0457 \u0441\u043f\u0440\u0430\u0432\u0438\n' +
      '/schedule \u2014 \u0420\u043e\u0437\u043a\u043b\u0430\u0434 \u043d\u0430 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456\n' +
      '/help \u2014 \u0426\u0435\u0439 \u0441\u043f\u0438\u0441\u043e\u043a',
    );
  });

  bot.command('invite', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: { include: { lawyerProfile: true } } },
    });

    if (!identity?.user.lawyerProfile?.orgId) {
      await ctx.reply('\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u043e\u0439\u0434\u0456\u0442\u044c \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e: /start');
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
      '\ud83d\udd17 \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0434\u043b\u044f \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432:\n\n' + link + '\n\n' +
      '\u041d\u0430\u0434\u0456\u0448\u043b\u0456\u0442\u044c \u043a\u043b\u0456\u0454\u043d\u0442\u0443 \u0434\u043b\u044f \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f.',
    );
  });

  bot.command('cases', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
    });
    if (!identity) {
      await ctx.reply('\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u043e\u0439\u0434\u0456\u0442\u044c \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e: /start');
      return;
    }

    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: identity.userId },
    });
    if (!profile) {
      await ctx.reply('\u041f\u0440\u043e\u0444\u0456\u043b\u044c \u0430\u0434\u0432\u043e\u043a\u0430\u0442\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.');
      return;
    }

    const cases = await prisma.case.findMany({
      where: { lawyerId: profile.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    if (cases.length === 0) {
      await ctx.reply('\ud83d\udcc1 \u0423 \u0432\u0430\u0441 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0441\u043f\u0440\u0430\u0432.');
      return;
    }

    const lines = cases.map((c, i) =>
      (i + 1) + '. ' + c.title + ' [' + c.status + ']',
    );

    await ctx.reply('\ud83d\udcc1 \u0412\u0430\u0448\u0456 \u0441\u043f\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
  });

  bot.command('schedule', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
    });
    if (!identity) {
      await ctx.reply('\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u043e\u0439\u0434\u0456\u0442\u044c \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e: /start');
      return;
    }

    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: identity.userId },
    });
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
      await ctx.reply('\ud83d\udcc5 \u041d\u0430 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456 \u043d\u0435\u043c\u0430\u0454 \u0437\u0430\u043f\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = appointments.map((a) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\u23f0 ' + time + (a.notes ? ' \u2014 ' + a.notes : '');
    });

    await ctx.reply('\ud83d\udcc5 \u0420\u043e\u0437\u043a\u043b\u0430\u0434 \u043d\u0430 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456:\n\n' + lines.join('\n'));
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
        '\ud83d\udc4b \u0412\u0456\u0442\u0430\u0454\u043c\u043e \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f, ' + existing.user.name + '!\n\n' +
        '\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434.',
      );
      return;
    }

    if (!startParam) {
      await ctx.reply(
        '\u2757 \u0414\u043b\u044f \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0435 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0432\u0456\u0434 \u0430\u0434\u0432\u043e\u043a\u0430\u0442\u0430.\n\n' +
        '\u0417\u0432\u0435\u0440\u043d\u0456\u0442\u044c\u0441\u044f \u0434\u043e \u0432\u0430\u0448\u043e\u0433\u043e \u0430\u0434\u0432\u043e\u043a\u0430\u0442\u0430 \u0434\u043b\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u043d\u043d\u044f \u0437\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u043d\u044f.',
      );
      return;
    }

    const tokenRecord = await prisma.inviteToken.findUnique({
      where: { token: startParam },
      include: { org: true, lawyer: { include: { user: true } } },
    });

    if (!tokenRecord || !tokenRecord.isActive) {
      await ctx.reply(
        '\u274c \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u043d\u0435\u0434\u0456\u0439\u0441\u043d\u0435 \u0430\u0431\u043e \u043f\u0440\u043e\u0442\u0435\u0440\u043c\u0456\u043d\u043e\u0432\u0430\u043d\u0435.\n\n' +
        '\u0417\u0432\u0435\u0440\u043d\u0456\u0442\u044c\u0441\u044f \u0434\u043e \u0430\u0434\u0432\u043e\u043a\u0430\u0442\u0430 \u0437\u0430 \u043d\u043e\u0432\u0438\u043c \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c.',
      );
      return;
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      await ctx.reply('\u274c \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u043f\u0440\u043e\u0442\u0435\u0440\u043c\u0456\u043d\u043e\u0432\u0430\u043d\u0435.');
      return;
    }

    if (tokenRecord.maxUses && tokenRecord.usageCount >= tokenRecord.maxUses) {
      await ctx.reply('\u274c \u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0432\u0438\u0447\u0435\u0440\u043f\u0430\u043d\u043e.');
      return;
    }

    const lawyerName = tokenRecord.lawyer?.user?.name ?? '\u0412\u0430\u0448 \u0430\u0434\u0432\u043e\u043a\u0430\u0442';

    ctx.session.step = 'awaiting_name';
    ctx.session.tokenData = {
      tokenId: tokenRecord.id,
      orgId: tokenRecord.orgId,
      lawyerId: tokenRecord.lawyerId,
      caseId: tokenRecord.caseId ?? undefined,
    };

    await ctx.reply(
      '\ud83d\udc4b \u041b\u0430\u0441\u043a\u0430\u0432\u043e \u043f\u0440\u043e\u0441\u0438\u043c\u043e \u0434\u043e \u042e\u0440\u0411\u043e\u0442!\n\n' +
      '\u0412\u0430\u0441 \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0432 \u0430\u0434\u0432\u043e\u043a\u0430\u0442: ' + lawyerName + '\n\n' +
      "\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0432\u0430\u0448\u0435 \u043f\u043e\u0432\u043d\u0435 \u0456\u043c'\u044f:",
    );
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    if (step === 'awaiting_name') {
      const name = ctx.message.text.trim();
      if (name.length < 2 || name.length > 100) {
        await ctx.reply("\u0412\u043a\u0430\u0436\u0456\u0442\u044c \u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0435 \u0456\u043c'\u044f (2\u2013100 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432):");
        return;
      }
      ctx.session.name = name;
      ctx.session.step = 'awaiting_phone';
      await ctx.reply(
        '\u0414\u044f\u043a\u0443\u044e, ' + name + '!\n\n' +
        '\u0422\u0435\u043f\u0435\u0440 \u0432\u043a\u0430\u0436\u0456\u0442\u044c \u0432\u0430\u0448 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443:',
      );
      return;
    }

    if (step === 'awaiting_phone') {
      const phone = ctx.message.text.trim().replace(/[\s\-()]/g, '');
      if (!/^\+?\d{10,15}$/.test(phone)) {
        await ctx.reply('\u041d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u043d\u043e\u043c\u0435\u0440. \u0412\u043a\u0430\u0436\u0456\u0442\u044c \u0443 \u0444\u043e\u0440\u043c\u0430\u0442\u0456 +380991234567:');
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
          '\u2705 \u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e!\n\n' +
          '\u0412\u0430\u0448 \u0430\u0434\u0432\u043e\u043a\u0430\u0442 \u043e\u0442\u0440\u0438\u043c\u0430\u0454 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f.\n\n' +
          '\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\ud83d\udcbc \u042e\u0440\u0411\u043e\u0442', web_app: { url: miniAppUrl } },
            });
          } catch (e) {
            console.warn('[Client Bot] Failed to set menu button:', e);
          }
        }
      } catch (err) {
        console.error('[Client Bot] Onboarding error:', err);
        ctx.session.step = 'idle';
        await ctx.reply('\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u043f\u0440\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437.');
      }
      return;
    }

    await ctx.reply('\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0443 \u043a\u043e\u043c\u0430\u043d\u0434.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '\ud83d\udccb \u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u043a\u043e\u043c\u0430\u043d\u0434\u0438:\n\n' +
      '/status \u2014 \u0421\u0442\u0430\u0442\u0443\u0441 \u043c\u043e\u0454\u0457 \u0441\u043f\u0440\u0430\u0432\u0438\n' +
      '/appointments \u2014 \u041c\u043e\u0457 \u0437\u0430\u043f\u0438\u0441\u0438\n' +
      '/help \u2014 \u0426\u0435\u0439 \u0441\u043f\u0438\u0441\u043e\u043a',
    );
  });

  bot.command('status', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
    });
    if (!identity) {
      await ctx.reply('\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u043e\u0439\u0434\u0456\u0442\u044c \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e.');
      return;
    }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: identity.userId },
    });
    if (!profile) return;

    const activeCases = await prisma.case.findMany({
      where: { clientId: profile.id, status: { not: 'COMPLETED' } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (activeCases.length === 0) {
      await ctx.reply('\ud83d\udcc4 \u0423 \u0432\u0430\u0441 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0430\u043a\u0442\u0438\u0432\u043d\u0438\u0445 \u0441\u043f\u0440\u0430\u0432.');
      return;
    }

    const lines = activeCases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('\ud83d\udcca \u0412\u0430\u0448\u0456 \u0441\u043f\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
  });

  bot.command('appointments', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const identity = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
    });
    if (!identity) {
      await ctx.reply('\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043f\u0440\u043e\u0439\u0434\u0456\u0442\u044c \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044e.');
      return;
    }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: identity.userId },
    });
    if (!profile) return;

    const upcoming = await prisma.appointment.findMany({
      where: { clientId: profile.id, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    });

    if (upcoming.length === 0) {
      await ctx.reply('\ud83d\udcc5 \u041d\u0435\u043c\u0430\u0454 \u043c\u0430\u0439\u0431\u0443\u0442\u043d\u0456\u0445 \u0437\u0430\u043f\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = upcoming.map((a) => {
      const date = a.date.toLocaleDateString('uk-UA');
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\ud83d\udcc5 ' + date + ' ' + time;
    });

    await ctx.reply('\ud83d\udcc5 \u0412\u0430\u0448\u0456 \u0437\u0430\u043f\u0438\u0441\u0438:\n\n' + lines.join('\n'));
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
