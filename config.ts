
/**
 * Global Configuration Strategy
 */

export const CONFIG = {
  // Application
  APP_NAME: 'easyMO Discovery',
  VERSION: '2.2.0-live',

  // Feature Flags
  ENABLE_REAL_PRESENCE: true, 
  ENABLE_DEMO_MODE: false, // DISABLED: Live Mode Active
  ENABLE_WORKER_AGENT: true, // Use Worker agent instead of Gemini

  // Worker Configuration
  WORKER_URL: import.meta.env.VITE_WORKER_URL || '', // Cloudflare Worker URL

  // Monitoring
  SENTRY_DSN: '', // Add your Sentry DSN here for production monitoring
  ENVIRONMENT: 'production'
};
