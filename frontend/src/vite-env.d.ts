/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GRIEVANCE_OFFICER_NAME?: string;
  readonly VITE_GRIEVANCE_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
