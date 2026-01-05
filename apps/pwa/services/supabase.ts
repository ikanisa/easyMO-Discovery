import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isPublicEnvValid } from '../src/config/publicEnv';

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = isPublicEnvValid();

// Log warning if not configured (helpful for debugging)
if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
    '\nCheck window.__APP_ENV__ and import.meta.env for values.'
  );
}

/**
 * Supabase client instance
 * Note: createClient requires valid strings, so we pass empty strings if not configured.
 * The app should check isSupabaseConfigured before making Supabase calls.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Network Helper for online/offline detection
 */
export const NetworkService = {
  isOnline: (): boolean => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  addListener: (callback: (online: boolean) => void) => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => callback(true));
      window.addEventListener('offline', () => callback(false));
    }
  },

  removeListener: (callback: (online: boolean) => void) => {
    // Basic cleanup placeholder (actual removeEventListener requires ref equality)
  },
};
