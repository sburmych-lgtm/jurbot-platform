import WebApp from '@twa-dev/sdk';

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
