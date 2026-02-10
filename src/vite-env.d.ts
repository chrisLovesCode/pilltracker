/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  glob<T = any>(pattern: string, options?: { as?: string; eager?: boolean; query?: string; import?: string }): Record<string, T>
}
