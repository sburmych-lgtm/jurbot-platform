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

  // Delete in correct order to respect FK constraints
  // 1. Telegram identity
  await prisma.telegramIdentity.deleteMany({ where: { userId } });

  // 2. Lawyer-specific data
  const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (lawyerProfile) {
    await prisma.inviteToken.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.case.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.appointment.deleteMany({ where: { lawyerId: lawyerProfile.id } });
    await prisma.timeLog.deleteMany({ where: { lawyerId: lawyerProfile.id } });
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

  // 5. Notifications & uploads
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.upload.deleteMany({ where: { uploadedById: userId } });

  // 6. Delete user
  await prisma.user.delete({ where: { id: userId } });

  return true;
}

// ─── Lawyer Bot ─────────────────────────────────────────────
export function createLawyerBot(opts: BotOptions): Bot {
  const { token, miniAppUrl, superadminTelegramId } = opts;
  const bot = new Bot<BotContext>(token);
  bot.use(session({ initial: initialSession }));

  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from!.id);
    const sa = isSuperadmin(telegramId, superadminTelegramId);

    const existing = await prisma.telegramIdentity.findFirst({
      where: { telegramId },
      include: { user: true },
    });

    if (existing) {
      const badge = sa ? ' [SUPERADMIN]' : '';
      await ctx.reply(
        '\u2696\uFE0F \u0412\u0456\u0442\u0430\u0454\u043C\u043E \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F, ' + existing.user.name + '!' + badge + '\n\n' +
        '\u0412\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0443 \u043A\u043E\u043C\u0430\u043D\u0434.',
      );
      return;
    }

    ctx.session.step = 'awaiting_name';
    await ctx.reply(
      '\u2696\uFE0F \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!\n\n' +
      '\u042F \u0434\u043E\u043F\u043E\u043C\u043E\u0436\u0443 \u0432\u0430\u043C \u043A\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0441\u043F\u0440\u0430\u0432\u0430\u043C\u0438, \u043A\u043B\u0456\u0454\u043D\u0442\u0430\u043C\u0438 \u0442\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438.\n\n' +
      '\u0414\u043B\u044F \u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0432\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
    );
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    // Handle reset confirmation
    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === '\u0442\u0430\u043A' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('\uD83D\uDDD1 \u0414\u0430\u043D\u0456 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E. \u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C /start \u0434\u043B\u044F \u043D\u043E\u0432\u043E\u0457 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457.');
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

          // Superadmin gets BUREAU plan with no expiry; others get TRIAL
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
          ? '\uD83D\uDC51 SUPERADMIN \u2014 \u043F\u043B\u0430\u043D BUREAU (\u0431\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C)'
          : '\uD83C\uDF81 14-\u0434\u0435\u043D\u043D\u0438\u0439 \u043F\u0440\u043E\u0431\u043D\u0438\u0439 \u043F\u0435\u0440\u0456\u043E\u0434 \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E';

        await ctx.reply(
          '\u2705 \u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E!\n\n' +
          '\uD83C\uDFDB\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044E \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E\n' +
          planMsg + '\n\n' +
          '\uD83D\uDD17 \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432:\n' + inviteLink + '\n\n' +
          '\u041D\u0430\u0434\u0456\u0448\u043B\u0456\u0442\u044C \u0446\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0430\u043C \u0434\u043B\u044F \u043F\u0456\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044F.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\uD83D\uDCBC \u042E\u0440\u0411\u043E\u0442', web_app: { url: miniAppUrl } },
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
      '\uD83D\uDCCB \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043A\u043E\u043C\u0430\u043D\u0434\u0438:\n\n' +
      '/invite \u2014 \u041E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432\n' +
      '/cases \u2014 \u041C\u043E\u0457 \u0441\u043F\u0440\u0430\u0432\u0438\n' +
      '/schedule \u2014 \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456\n' +
      '/admin \u2014 \u0406\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u043F\u0440\u043E \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441\n' +
      '/reset \u2014 \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E (\u0434\u043B\u044F \u0442\u0435\u0441\u0442\u0443\u0432\u0430\u043D\u043D\u044F)\n' +
      '/help \u2014 \u0426\u0435\u0439 \u0441\u043F\u0438\u0441\u043E\u043A';

    if (sa) {
      text += '\n\n\uD83D\uDC51 Superadmin:\n/stats \u2014 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430';
    }

    await ctx.reply(text);
  });

  // ── /admin — show account info ──
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
      '\uD83D\uDC64 \u0410\u0434\u043C\u0456\u043D-\u043F\u0430\u043D\u0435\u043B\u044C' + (sa ? ' \uD83D\uDC51 SUPERADMIN' : '') + '\n',
      '\uD83D\uDCCC Telegram ID: ' + ctx.from!.id,
      '\uD83D\uDCE7 \u0406\u043C\'\u044F: ' + user.name,
      '\uD83D\uDCF1 \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ' + (user.phone || '\u2014'),
      '\uD83C\uDFDB\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044F: ' + (org?.name || '\u2014'),
    ];

    if (sub) {
      lines.push('\uD83D\uDCE6 \u041F\u043B\u0430\u043D: ' + sub.plan + (sa ? ' (superadmin)' : ''));
      lines.push('\uD83D\uDCC5 \u0421\u0442\u0430\u0442\u0443\u0441: ' + sub.status);
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
      lines.push('\uD83D\uDD17 \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u043E\u043A\u0435\u043D\u0456\u0432: ' + tokenCount);
    }

    await ctx.reply(lines.join('\n'));
  });

  // ── /stats — superadmin system stats ──
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
      '\uD83D\uDC51 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:\n\n' +
      '\uD83D\uDC64 \u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432: ' + userCount + '\n' +
      '\uD83C\uDFDB\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u0439: ' + orgCount + '\n' +
      '\uD83D\uDCC1 \u0421\u043F\u0440\u0430\u0432: ' + caseCount + '\n' +
      '\uD83D\uDCE6 \u041F\u0456\u0434\u043F\u0438\u0441\u043E\u043A: ' + subCount + '\n' +
      '\uD83C\uDF81 \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u0440\u0456\u0430\u043B\u0456\u0432: ' + activeTrials,
    );
  });

  // ── /reset — delete user data for testing ──
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
      '\uD83D\uDD17 \u041F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043B\u0456\u0454\u043D\u0442\u0456\u0432:\n\n' + link + '\n\n' +
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
      await ctx.reply('\uD83D\uDCC1 \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = cases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('\uD83D\uDCC1 \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
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
      await ctx.reply('\uD83D\uDCC5 \u041D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043D\u0435\u043C\u0430\u0454 \u0437\u0430\u043F\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = appointments.map((a) => {
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\u23F0 ' + time + (a.notes ? ' \u2014 ' + a.notes : '');
    });
    await ctx.reply('\uD83D\uDCC5 \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043D\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456:\n\n' + lines.join('\n'));
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
      const badge = sa ? ' [SUPERADMIN]' : '';
      await ctx.reply(
        '\uD83D\uDC4B \u0412\u0456\u0442\u0430\u0454\u043C\u043E \u043F\u043E\u0432\u0435\u0440\u043D\u0435\u043D\u043D\u044F, ' + existing.user.name + '!' + badge + '\n\n' +
        '\u0412\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0443 \u043A\u043E\u043C\u0430\u043D\u0434.',
      );
      return;
    }

    // Superadmin can register without invite token
    if (!startParam && !sa) {
      await ctx.reply(
        '\u2757 \u0414\u043B\u044F \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u043F\u043E\u0442\u0440\u0456\u0431\u043D\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F \u0432\u0456\u0434 \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430.\n\n' +
        '\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0432\u0430\u0448\u043E\u0433\u043E \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u0434\u043B\u044F \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043D\u044F \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043D\u044F.',
      );
      return;
    }

    // If superadmin with no token — direct registration
    if (sa && !startParam) {
      ctx.session.step = 'awaiting_name';
      ctx.session.tokenData = undefined;
      await ctx.reply(
        '\uD83D\uDC51 SUPERADMIN \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044F \u0431\u0435\u0437 \u0456\u043D\u0432\u0430\u0439\u0442\u0443.\n\n' +
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
        '\uD83D\uDC4B \u041B\u0430\u0441\u043A\u0430\u0432\u043E \u043F\u0440\u043E\u0441\u0438\u043C\u043E \u0434\u043E \u042E\u0440\u0411\u043E\u0442!\n\n' +
        '\u0412\u0430\u0441 \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0432 \u0430\u0434\u0432\u043E\u043A\u0430\u0442: ' + lawyerName + '\n\n' +
        '\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0432\u0430\u0448\u0435 \u043F\u043E\u0432\u043D\u0435 \u0456\u043C\'\u044F:',
      );
    }
  });

  bot.on('message:text', async (ctx) => {
    const { step } = ctx.session;

    // Handle reset confirmation
    if (step === 'awaiting_reset_confirm') {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === '\u0442\u0430\u043A' || text === 'yes') {
        const telegramId = BigInt(ctx.from!.id);
        try {
          const deleted = await deleteUserByTelegramId(telegramId);
          ctx.session.step = 'idle';
          if (deleted) {
            await ctx.reply('\uD83D\uDDD1 \u0414\u0430\u043D\u0456 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E. \u041F\u043E\u043F\u0440\u043E\u0441\u0456\u0442\u044C \u0430\u0434\u0432\u043E\u043A\u0430\u0442\u0430 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u043D\u043E\u0432\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F.');
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

          // Superadmin without token — create own org or just client profile
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
          (sa ? '\uD83D\uDC51 SUPERADMIN \u0434\u043E\u0441\u0442\u0443\u043F \u0430\u043A\u0442\u0438\u0432\u043E\u0432\u0430\u043D\u043E.\n\n' : '\u0412\u0430\u0448 \u0430\u0434\u0432\u043E\u043A\u0430\u0442 \u043E\u0442\u0440\u0438\u043C\u0430\u0454 \u0441\u043F\u043E\u0432\u0456\u0449\u0435\u043D\u043D\u044F.\n\n') +
          '\u0412\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0439\u0442\u0435 /help \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u043A\u0443 \u043A\u043E\u043C\u0430\u043D\u0434.',
        );

        if (miniAppUrl) {
          try {
            await bot.api.setChatMenuButton({
              chat_id: Number(telegramId),
              menu_button: { type: 'web_app', text: '\uD83D\uDCBC \u042E\u0440\u0411\u043E\u0442', web_app: { url: miniAppUrl } },
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
      '\uD83D\uDCCB \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0456 \u043A\u043E\u043C\u0430\u043D\u0434\u0438:\n\n' +
      '/status \u2014 \u0421\u0442\u0430\u0442\u0443\u0441 \u043C\u043E\u0454\u0457 \u0441\u043F\u0440\u0430\u0432\u0438\n' +
      '/appointments \u2014 \u041C\u043E\u0457 \u0437\u0430\u043F\u0438\u0441\u0438\n' +
      '/admin \u2014 \u0406\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0456\u044F \u043F\u0440\u043E \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441\n' +
      '/reset \u2014 \u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044E (\u0434\u043B\u044F \u0442\u0435\u0441\u0442\u0443\u0432\u0430\u043D\u043D\u044F)\n' +
      '/help \u2014 \u0426\u0435\u0439 \u0441\u043F\u0438\u0441\u043E\u043A';

    if (sa) {
      text += '\n\n\uD83D\uDC51 Superadmin:\n/stats \u2014 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430';
    }

    await ctx.reply(text);
  });

  // ── /admin — show account info ──
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
      '\uD83D\uDC64 \u041C\u0456\u0439 \u043E\u0431\u043B\u0456\u043A\u043E\u0432\u0438\u0439 \u0437\u0430\u043F\u0438\u0441' + (sa ? ' \uD83D\uDC51 SUPERADMIN' : '') + '\n',
      '\uD83D\uDCCC Telegram ID: ' + ctx.from!.id,
      '\uD83D\uDCE7 \u0406\u043C\'\u044F: ' + user.name,
      '\uD83D\uDCF1 \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ' + (user.phone || '\u2014'),
      '\uD83C\uDFDB\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u044F: ' + (org?.name || '\u2014'),
      '\uD83D\uDD11 \u041A\u043E\u0434 \u0434\u043E\u0441\u0442\u0443\u043F\u0443: ' + (profile?.accessCode || '\u2014'),
    ];

    if (sa) {
      lines.push('\u267E\uFE0F \u041F\u043E\u0432\u043D\u0438\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u0431\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u044C');
    }

    await ctx.reply(lines.join('\n'));
  });

  // ── /stats — superadmin system stats ──
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
      '\uD83D\uDC51 \u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430:\n\n' +
      '\uD83D\uDC64 \u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432: ' + userCount + '\n' +
      '\uD83C\uDFDB\uFE0F \u041E\u0440\u0433\u0430\u043D\u0456\u0437\u0430\u0446\u0456\u0439: ' + orgCount + '\n' +
      '\uD83D\uDCC1 \u0421\u043F\u0440\u0430\u0432: ' + caseCount + '\n' +
      '\uD83D\uDCE6 \u041F\u0456\u0434\u043F\u0438\u0441\u043E\u043A: ' + subCount + '\n' +
      '\uD83C\uDF81 \u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0442\u0440\u0456\u0430\u043B\u0456\u0432: ' + activeTrials,
    );
  });

  // ── /reset — delete user data for testing ──
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
      await ctx.reply('\uD83D\uDCC4 \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u0430\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0441\u043F\u0440\u0430\u0432.');
      return;
    }

    const lines = activeCases.map((c, i) => (i + 1) + '. ' + c.title + ' [' + c.status + ']');
    await ctx.reply('\uD83D\uDCCA \u0412\u0430\u0448\u0456 \u0441\u043F\u0440\u0430\u0432\u0438:\n\n' + lines.join('\n'));
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
      await ctx.reply('\uD83D\uDCC5 \u041D\u0435\u043C\u0430\u0454 \u043C\u0430\u0439\u0431\u0443\u0442\u043D\u0456\u0445 \u0437\u0430\u043F\u0438\u0441\u0456\u0432.');
      return;
    }

    const lines = upcoming.map((a) => {
      const date = a.date.toLocaleDateString('uk-UA');
      const time = a.date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      return '\uD83D\uDCC5 ' + date + ' ' + time;
    });
    await ctx.reply('\uD83D\uDCC5 \u0412\u0430\u0448\u0456 \u0437\u0430\u043F\u0438\u0441\u0438:\n\n' + lines.join('\n'));
  });

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot as unknown as Bot;
}
