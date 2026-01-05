/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_WORKER_URL?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_PUSH_ENDPOINT?: string
  readonly VITE_RUM_ENDPOINT?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_LOG_ENDPOINT?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

