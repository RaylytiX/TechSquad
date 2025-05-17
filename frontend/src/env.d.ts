interface ImportMetaEnv {
  VITE_CLIENT_API_URL: string;
  VITE_AUTH_API_URL: string;
  VITE_MODEL_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
