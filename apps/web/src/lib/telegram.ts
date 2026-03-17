import WebApp from '@twa-dev/sdk';

type BotSource = 'lawyer' | 'client';

type UiRole = 'LAWYER' | 'CLIENT';

const BOT_SOURCE_STORAGE_KEY = 'jurbot_bot_launch_source_v1';

interface StoredBotSource {
  source: BotSource;
  userId: number | null;
}

const modeLogSignatures = new Set<string>();

export function parseBotSourceCandidate(value: string | null | undefined): BotSource | null {
  if (!value) return null;

  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  const normalized = decoded.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'lawyer' || normalized.startsWith('lawyer_') || normalized.startsWith('lawyer-')) return 'lawyer';
  if (normalized === 'client' || normalized.startsWith('client_') || normalized.startsWith('client-')) return 'client';

  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
  if (tokens.includes('lawyer')) return 'lawyer';
  if (tokens.includes('client')) return 'client';
  return null;
}

function getStartParamFromInitData(): string | null {
  try {
    const raw = WebApp.initData;
    if (!raw) return null;
    return new URLSearchParams(raw).get('start_param');
  } catch {
    return null;
  }
}

function readStoredBotSource(): StoredBotSource | null {
  try {
    const raw = localStorage.getItem(BOT_SOURCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBotSource;
    if (!parsed || (parsed.source !== 'lawyer' && parsed.source !== 'client')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistBotSource(source: BotSource): void {
  try {
    const userId = WebApp.initDataUnsafe?.user?.id ?? null;
    localStorage.setItem(BOT_SOURCE_STORAGE_KEY, JSON.stringify({ source, userId } satisfies StoredBotSource));
  } catch {
    // ignore storage failures
  }
}

/** Whether we're running inside Telegram Mini App */
export function isTelegramWebApp(): boolean {
  try {
    return Boolean(WebApp.initData && WebApp.initData.length > 0);
  } catch {
    return false;
  }
}

/** Get the raw initData string for API auth */
export function getInitData(): string {
  return WebApp.initData;
}

/** Get Telegram user info */
export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user ?? null;
}

/** Initialize Telegram Mini App settings */
export function initTelegramApp() {
  if (!isTelegramWebApp()) return;

  try {
    WebApp.ready();
    WebApp.expand();

    // Set theme colors
    WebApp.setHeaderColor('#050810');
    WebApp.setBackgroundColor('#050810');
  } catch (e) {
    console.warn('[Telegram] Failed to init WebApp:', e);
  }
}

/**
 * Detect which bot opened the Mini App.
 * Accepts explicit start params like `lawyer`/`client` and prefixed variants.
 */
export function getBotSource(): BotSource | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const candidates = [
    WebApp.initDataUnsafe?.start_param,
    getStartParamFromInitData(),
    searchParams.get('tgWebAppStartParam'),
    searchParams.get('startapp'),
    hashParams.get('tgWebAppStartParam'),
    hashParams.get('startapp'),
  ];

  for (const candidate of candidates) {
    const source = parseBotSourceCandidate(candidate);
    if (source) {
      persistBotSource(source);
      return source;
    }
  }

  const stored = readStoredBotSource();
  const currentUserId = WebApp.initDataUnsafe?.user?.id ?? null;
  if (stored && stored.userId === currentUserId) {
    return stored.source;
  }

  return null;
}

export function resolveUiRoleFromSource(botSource: BotSource | null, userRole: UiRole | undefined): {
  role: UiRole;
  botSource: BotSource | null;
  fallback: 'botSource' | 'userRole' | 'defaultClient';
} {
  if (botSource === 'client') {
    return { role: 'CLIENT', botSource, fallback: 'botSource' };
  }

  if (botSource === 'lawyer') {
    return { role: 'LAWYER', botSource, fallback: 'botSource' };
  }

  if (userRole) {
    return { role: userRole, botSource: null, fallback: 'userRole' };
  }

  return { role: 'CLIENT', botSource: null, fallback: 'defaultClient' };
}

export function resolveUiRole(userRole: UiRole | undefined) {
  return resolveUiRoleFromSource(getBotSource(), userRole);
}

export function logModeResolution(context: { pathname?: string; userRole?: UiRole; reason: string }): void {
  const userId = getTelegramUser()?.id ?? null;
  const resolved = resolveUiRole(context.userRole);
  const signature = `${context.reason}|${context.pathname ?? ''}|${userId ?? 'na'}|${resolved.botSource ?? 'none'}|${resolved.role}|${resolved.fallback}`;

  if (modeLogSignatures.has(signature)) return;
  modeLogSignatures.add(signature);

  console.info('[ModeResolution]', {
    reason: context.reason,
    pathname: context.pathname,
    telegramUserId: userId,
    userRole: context.userRole ?? null,
    botSource: resolved.botSource,
    resolvedRole: resolved.role,
    fallback: resolved.fallback,
  });
}

/** Close the Mini App */
export function closeMiniApp() {
  if (isTelegramWebApp()) {
    WebApp.close();
  }
}

/** Show back button and handle navigation */
export function showBackButton(callback: () => void) {
  if (!isTelegramWebApp()) return;
  try {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(callback);
  } catch {
    // ignore
  }
}

export function hideBackButton() {
  if (!isTelegramWebApp()) return;
  try {
    WebApp.BackButton.hide();
  } catch {
    // ignore
  }
}
