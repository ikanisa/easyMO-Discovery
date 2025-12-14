/**
 * Sentry Error Monitoring Configuration
 * 
 * This module initializes Sentry for production error tracking and monitoring.
 * 
 * Setup:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new React project in Sentry
 * 3. Copy your DSN from Project Settings > Client Keys (DSN)
 * 4. Add VITE_SENTRY_DSN to your .env.local file
 */

import * as Sentry from '@sentry/react';

// Only initialize Sentry if DSN is provided (production)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment based on mode
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions
    
    // Session Replay (optional - can be removed to reduce bundle size)
    replaysSessionSampleRate: 0.01, // Capture 1% of sessions
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    
    // Filter out development errors
    beforeSend(event) {
      // Don't send errors in development
      if (import.meta.env.DEV) {
        return null;
      }
      return event;
    },
    
    // Ignore specific errors that are not actionable
    ignoreErrors: [
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors that users can't control
      'NetworkError',
      'Failed to fetch',
      // User cancelled actions
      'AbortError',
    ],
  });
};

/**
 * Capture a custom error with additional context
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
};

/**
 * Capture a custom message for logging
 */
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUser = (userId: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    email,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

// Re-export Sentry's ErrorBoundary for use in components
export const SentryErrorBoundary = Sentry.ErrorBoundary;
