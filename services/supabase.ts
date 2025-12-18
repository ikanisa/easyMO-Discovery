import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kczghhipbyykluuiiunp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjemdoaGlwYnl5a2x1dWlpdW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2Njg2MTEsImV4cCI6MjA3ODI0NDYxMX0.Elpg1MLyYfRhWszGESPEe_cGZo6E0StWnQuM_dVH3qc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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