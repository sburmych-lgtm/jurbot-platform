import { Bot } from 'grammy';

const PLACEHOLDER_TOKEN = 'PLACEHOLDER_PROVIDE_LATER';

export function isPlaceholderToken(token: string): boolean {
  return token === PLACEHOLDER_TOKEN || token.trim() === '';
}

export function createLawyerBot(token: string): Bot {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      '⚖️ Ласкаво просимо до ЮрБот.Адвокат!\n\n' +
        'Я допоможу вам керувати справами, розкладом та сповіщеннями.\n' +
        'Використовуйте /help для списку команд.',
    ),
  );

  bot.command('help', (ctx) =>
    ctx.reply(
      '📋 Доступні команди:\n\n' +
        '/cases — Мої справи (список активних)\n' +
        '/schedule — Розклад на сьогодні\n' +
        '/notifications — Сповіщення\n' +
        '/help — Цей список команд',
    ),
  );

  bot.command('cases', (ctx) =>
    ctx.reply(
      '📁 Завантаження списку справ...\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до адміністратора для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.command('schedule', (ctx) =>
    ctx.reply(
      '📅 Розклад на сьогодні:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до адміністратора для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.command('notifications', (ctx) =>
    ctx.reply(
      '🔔 Сповіщення:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до адміністратора для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.on('message:text', (ctx) =>
    ctx.reply(
      'Невідома команда. Використовуйте /help для списку доступних команд.',
    ),
  );

  bot.catch((err) => {
    console.error('[Lawyer Bot Error]', err);
  });

  return bot;
}

export function createClientBot(token: string): Bot {
  const bot = new Bot(token);

  bot.command('start', (ctx) =>
    ctx.reply(
      '👋 Ласкаво просимо до ЮрБот.Клієнт!\n\n' +
        'Я допоможу вам відстежувати справи, записуватись на консультації ' +
        'та завантажувати документи.\n' +
        'Використовуйте /help для списку команд.',
    ),
  );

  bot.command('help', (ctx) =>
    ctx.reply(
      '📋 Доступні команди:\n\n' +
        '/status — Статус моєї справи\n' +
        '/appointments — Мої записи на консультації\n' +
        '/book — Записатись на консультацію\n' +
        '/upload — Завантажити документ\n' +
        '/help — Цей список команд',
    ),
  );

  bot.command('status', (ctx) =>
    ctx.reply(
      '📊 Статус справи:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до вашого адвоката для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.command('appointments', (ctx) =>
    ctx.reply(
      '📅 Мої записи:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до вашого адвоката для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.command('book', (ctx) =>
    ctx.reply(
      '📝 Запис на консультацію:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до вашого адвоката для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.command('upload', (ctx) =>
    ctx.reply(
      '📎 Завантаження документів:\n\n' +
        'Ця функція буде доступна після підключення до системи. ' +
        'Зверніться до вашого адвоката для прив\'язки Telegram-акаунту.',
    ),
  );

  bot.on('message:text', (ctx) =>
    ctx.reply(
      'Невідома команда. Використовуйте /help для списку доступних команд.',
    ),
  );

  bot.catch((err) => {
    console.error('[Client Bot Error]', err);
  });

  return bot;
}
