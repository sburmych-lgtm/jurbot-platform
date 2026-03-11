import { prisma } from '@jurbot/db';

/**
 * Check if a phone number has already used a trial.
 * Prevents abuse by ensuring one trial per unique phone.
 */
export async function hasPhoneUsedTrial(phone: string): Promise<boolean> {
  // Find any user with this phone who owns an org with trialUsed = true
  const existing = await prisma.subscription.findFirst({
    where: {
      trialUsed: true,
      org: {
        members: {
          some: {
            role: 'OWNER',
            user: {
              phone,
            },
          },
        },
      },
    },
  });
  return existing !== null;
}

/**
 * Check if a Telegram ID has already used a trial.
 */
export async function hasTelegramIdUsedTrial(telegramId: bigint): Promise<boolean> {
  const existing = await prisma.subscription.findFirst({
    where: {
      trialUsed: true,
      org: {
        members: {
          some: {
            role: 'OWNER',
            user: {
              telegramId,
            },
          },
        },
      },
    },
  });
  return existing !== null;
}
