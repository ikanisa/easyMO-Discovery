import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables are injected at build time via Vite
// For local development, create a .env.local file with these values
// See .env.example for required environment variables

// Vite exposes env vars on import.meta.env (prefixed with VITE_)
// Node.js exposes them on process.env (for SSR/build scenarios)
declare const import_meta_env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string } | undefined;

function getEnvVar(key: string): string {
  // Try Vite's import.meta.env first (client-side)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const value = (import.meta as any).env[key];
    if (value) return value;
  }
  // Fallback to process.env (build-time/SSR)
  if (typeof process !== 'undefined' && process.env) {
    const value = (process.env as Record<string, string | undefined>)[key];
    if (value) return value;
  }
  return '';
}

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate credentials - warn in development, but allow app to load
// This enables demo/offline mode scenarios
const hasValidCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasValidCredentials) {
  console.warn(
    '[Supabase] Missing environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file. ' +
    'See .env.example for configuration details.'
  );
}

// Create client - will work in limited capacity without credentials
// The app should handle auth failures gracefully
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// Export helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => hasValidCredentials;
