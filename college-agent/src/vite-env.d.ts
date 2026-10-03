/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleTokenResponse {
  access_token: string;
  error?: string;
  scope?: string;
  expires_in?: number;
}

interface GoogleTokenClient {
  requestAccessToken: (override?: {
    prompt?: string;
    scope?: string;
    include_granted_scopes?: boolean;
  }) => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          include_granted_scopes?: boolean;
          callback: (response: GoogleTokenResponse) => void;
          error_callback?: (error: { type?: string; message?: string }) => void;
        }) => GoogleTokenClient;
      };
    };
  };
}
