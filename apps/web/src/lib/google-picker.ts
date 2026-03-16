/**
 * Google Drive integration for Telegram Mini App.
 *
 * Google Picker API doesn't work inside Telegram WebView (popups blocked,
 * third-party cookies restricted). Instead we use Telegram.WebApp.openLink()
 * to open Google Drive, and the user picks files via the native file input.
 *
 * For a seamless experience, this module provides:
 * 1. openGoogleDrive() — opens Drive in Telegram's external browser
 * 2. Guidance to user to download file and then pick it locally
 */

declare const Telegram: {
  WebApp: {
    openLink: (url: string) => void;
    version: string;
  };
} | undefined;

const isTelegramWebApp = (): boolean => {
  try {
    return typeof Telegram !== 'undefined' && !!Telegram?.WebApp?.version;
  } catch {
    return false;
  }
};

/**
 * Opens Google Drive in the appropriate way depending on the environment:
 * - In Telegram Mini App: uses Telegram.WebApp.openLink() which opens
 *   an in-app browser that can handle Google login
 * - In regular browser: window.open()
 */
export function openGoogleDrive(): void {
  const url = 'https://drive.google.com/drive/my-drive';

  if (isTelegramWebApp()) {
    try {
      Telegram!.WebApp.openLink(url);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * Opens a file picker that accepts documents and images.
 * On mobile devices this shows options: file system, gallery, camera.
 *
 * Returns a promise that resolves with the selected File, or null if cancelled.
 */
export function pickFileFromDevice(accept?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept ?? '*/*';
    // Don't set capture — let the OS show all options (files, gallery, camera)
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file);
      // Cleanup
      document.body.removeChild(input);
    };

    // Handle cancel (user closes picker without selecting)
    input.addEventListener('cancel', () => {
      resolve(null);
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  });
}
