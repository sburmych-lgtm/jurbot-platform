import type { InlineKeyboardMarkup } from 'grammy/types';
import { getLawyerBot, getClientBot } from '../lib/telegram.js';
import { prisma } from '@jurbot/db';

interface NotifyOptions {
  text: string;
  keyboard?: InlineKeyboardMarkup;
  parseMode?: 'HTML' | 'MarkdownV2';
}

export async function notifyLawyer(
  lawyerChatId: bigint,
  options: NotifyOptions,
): Promise<boolean> {
  const bot = getLawyerBot();
  if (!bot) {
    console.warn('[CrossBot] Lawyer bot not initialized');
    return false;
  }

  try {
    await bot.api.sendMessage(Number(lawyerChatId), options.text, {
      parse_mode: options.parseMode ?? 'HTML',
      reply_markup: options.keyboard,
    });
    return true;
  } catch (err) {
    console.error('[CrossBot] Failed to notify lawyer:', err);
    return false;
  }
}

export async function notifyClient(
  clientChatId: bigint,
  options: NotifyOptions,
): Promise<boolean> {
  const bot = getClientBot();
  if (!bot) {
    console.warn('[CrossBot] Client bot not initialized');
    return false;
  }

  try {
    await bot.api.sendMessage(Number(clientChatId), options.text, {
      parse_mode: options.parseMode ?? 'HTML',
      reply_markup: options.keyboard,
    });
    return true;
  } catch (err) {
    console.error('[CrossBot] Failed to notify client:', err);
    return false;
  }
}

export async function notifyLawyerByUserId(
  lawyerUserId: string,
  options: NotifyOptions,
): Promise<boolean> {
  const identity = await prisma.telegramIdentity.findFirst({
    where: { userId: lawyerUserId, botType: 'lawyer' },
  });
  if (!identity) return false;
  return notifyLawyer(identity.chatId, options);
}

export async function notifyClientByUserId(
  clientUserId: string,
  options: NotifyOptions,
): Promise<boolean> {
  const identity = await prisma.telegramIdentity.findFirst({
    where: { userId: clientUserId, botType: 'client' },
  });
  if (!identity) return false;
  return notifyClient(identity.chatId, options);
}
