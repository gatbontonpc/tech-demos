const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const PHOTOS_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export const SCOPES = {
  gmail: GMAIL_SCOPE,
  drive: DRIVE_SCOPE,
  photos: PHOTOS_SCOPE,
} as const;

let accessToken: string | null = null;

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

export function hasGoogleClientId(): boolean {
  return googleClientId().length > 0;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

function waitForGis(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Google Identity Services did not load. Check the network and try the connect button again."));
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

/**
 * Real OAuth token flow. Demo mode must never call this and then pretend it worked.
 * The token stays in memory for this tab. It is not written to localStorage or disk.
 */
export function requestGoogleScope(scope: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = googleClientId();
    if (!clientId) {
      reject(
        new Error(
          "No Google client ID is set. Add VITE_GOOGLE_CLIENT_ID and restart. This did not connect a Google account.",
        ),
      );
      return;
    }

    waitForGis()
      .then(() => {
        const gis = window.google?.accounts?.oauth2;
        if (!gis) {
          reject(new Error("Google Identity Services is unavailable."));
          return;
        }
        const client = gis.initTokenClient({
          client_id: clientId,
          scope,
          include_granted_scopes: true,
          callback: (response) => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error || "Google did not return an access token."));
              return;
            }
            accessToken = response.access_token;
            resolve(response.access_token);
          },
          error_callback: (error) => {
            reject(new Error(error.message || error.type || "Google sign-in was cancelled."));
          },
        });
        client.requestAccessToken({
          scope,
          include_granted_scopes: true,
          prompt: accessToken ? "" : "consent",
        });
      })
      .catch(reject);
  });
}
