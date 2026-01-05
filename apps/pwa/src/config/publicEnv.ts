/**
 * publicEnv.ts
 * 
 * Centralized public environment configuration.
 * Provides runtime fallback via window.__APP_ENV__ (from env.js)
 * with Vite build-time injection as primary source.
 */

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __APP_ENV__?: {
            VITE_SUPABASE_URL?: string;
            VITE_SUPABASE_ANON_KEY?: string;
        };
    }
}

// Runtime config from env.js (generated at build time, loaded before app)
const runtime = typeof window !== 'undefined' ? (window.__APP_ENV__ ?? {}) : {};

// Vite build-time config (injected via import.meta.env)
// Cast to Record to avoid TypeScript errors - Vite types may not include custom env vars
const vite = (import.meta.env ?? {}) as Record<string, string | undefined>;

/**
 * Supabase Project URL
 * Priority: runtime (env.js) > vite (build-time) 
 */
export const SUPABASE_URL: string | undefined =
    runtime.VITE_SUPABASE_URL ?? vite.VITE_SUPABASE_URL;

/**
 * Supabase Anon (public) Key
 * Priority: runtime (env.js) > vite (build-time)
 */
export const SUPABASE_ANON_KEY: string | undefined =
    runtime.VITE_SUPABASE_ANON_KEY ?? vite.VITE_SUPABASE_ANON_KEY;

/**
 * Required public environment variables
 */
const REQUIRED_VARS = [
    { key: 'VITE_SUPABASE_URL', value: SUPABASE_URL },
    { key: 'VITE_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
] as const;

/**
 * Validate that all required public environment variables are set.
 * @returns Array of missing variable names (empty if all set)
 */
export function validatePublicEnv(): string[] {
    return REQUIRED_VARS
        .filter(({ value }) => !value || value.trim() === '')
        .map(({ key }) => key);
}

/**
 * Check if all required env vars are configured
 */
export function isPublicEnvValid(): boolean {
    return validatePublicEnv().length === 0;
}
