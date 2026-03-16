/**
 * Google Picker API integration for selecting files from Google Drive.
 *
 * Requires two env vars (set via Vite's import.meta.env):
 *   VITE_GOOGLE_CLIENT_ID  — OAuth 2.0 Client ID (Web application)
 *   VITE_GOOGLE_API_KEY     — API Key (restricted to Picker API)
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
const APP_ID = CLIENT_ID?.split('-')[0] ?? '';

// Scopes needed: read-only access to Drive files
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

// ---------- script loaders ----------

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureGapiLoaded(): Promise<void> {
  if (gapiLoaded) return;
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve) => {
    gapi.load('picker', () => {
      gapiLoaded = true;
      resolve();
    });
  });
}

async function ensureGisLoaded(): Promise<void> {
  if (gisLoaded) return;
  await loadScript('https://accounts.google.com/gsi/client');
  gisLoaded = true;
}

// ---------- token ----------

function getTokenClient(): google.accounts.oauth2.TokenClient {
  if (tokenClient) return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => {
      /* handled via promise wrapper below */
    },
  });
  return tokenClient;
}

function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = getTokenClient();
    // Override callback for this specific request
    (client as any).callback = (resp: google.accounts.oauth2.TokenResponse) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      accessToken = resp.access_token;
      resolve(resp.access_token);
    };
    if (accessToken) {
      // Already have a token — try to reuse
      resolve(accessToken);
    } else {
      client.requestAccessToken({ prompt: '' });
    }
  });
}

// ---------- picker ----------

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
}

/**
 * Opens Google Picker and returns the selected file metadata.
 * Returns null if the user cancelled.
 */
export async function openGooglePicker(): Promise<PickedFile | null> {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('Google Picker не налаштовано (відсутні VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_API_KEY)');
  }

  await Promise.all([ensureGapiLoaded(), ensureGisLoaded()]);

  // Ensure we have a valid token
  let token = accessToken;
  if (!token) {
    token = await requestAccessToken();
  }

  return new Promise((resolve) => {
    const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);

    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setOAuthToken(token!)
      .addView(docsView)
      .addView(new google.picker.DocsUploadView())
      .setCallback((data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc) {
            resolve({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url,
              sizeBytes: doc.sizeBytes,
            });
            return;
          }
        }
        if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .setTitle('Оберіть файл з Google Drive')
      .setLocale('uk')
      .build();

    picker.setVisible(true);
  });
}

/**
 * Downloads a file from Google Drive by its ID and returns it as a File object.
 */
export async function downloadDriveFile(fileId: string, fileName: string): Promise<File> {
  if (!accessToken) {
    throw new Error('No access token — open picker first');
  }

  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!resp.ok) {
    throw new Error(`Failed to download file: ${resp.status} ${resp.statusText}`);
  }

  const blob = await resp.blob();
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Convenience: open picker → download → return File (or null if cancelled).
 */
export async function pickAndDownloadFromDrive(): Promise<File | null> {
  const picked = await openGooglePicker();
  if (!picked) return null;
  return downloadDriveFile(picked.id, picked.name);
}
