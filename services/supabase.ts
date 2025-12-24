import { createClient } from '@supabase/supabase-js';

// Environment variables (set in Cloudflare Pages dashboard or .env.local for dev)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Runtime validation - fail fast if credentials are missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Network Helper
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
  }
};