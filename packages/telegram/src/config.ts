import { Bot } from 'grammy';

export function createLawyerBot(token: string): Bot {
  const bot = new Bot(token);
  bot.command('start', (ctx) => ctx.reply('Ласкаво просимо до ЮрБот.Адвокат! Використовуйте /help для списку команд.'));
  bot.command('help', (ctx) => ctx.reply('Доступні команди:\n/cases — Мої справи\n/schedule — Розклад на сьогодні\n/intakes — Нові звернення\n/help — Цей список'));
  bot.catch((err) => console.error('[Lawyer Bot Error]', err));
  return bot;
}

export function createClientBot(token: string): Bot {
  const bot = new Bot(token);
  bot.command('start', (ctx) => ctx.reply('Ласкаво просимо до ЮрБот.Клієнт! Використовуйте /help для списку команд.'));
  bot.command('help', (ctx) => ctx.reply('Доступні команди:\n/status — Статус справи\n/book — Записатись на консультацію\n/docs — Мої документи\n/help — Цей список'));
  bot.catch((err) => console.error('[Client Bot Error]', err));
  return bot;
}
