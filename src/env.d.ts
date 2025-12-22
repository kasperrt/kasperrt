/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_SENTRY_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
