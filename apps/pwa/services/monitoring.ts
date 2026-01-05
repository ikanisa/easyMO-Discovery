import { CONFIG } from '../config';

// Lightweight monitoring shim: when @sentry/react is not installed (or incompatible),
// this module provides safe no-op wrappers that log to console. If you install
// Sentry later and expose it as window.__SENTRY__, this will call through.
export const MonitoringService = {
  init: () => {
    if (!CONFIG.SENTRY_DSN) {
      console.debug("Monitoring: Sentry DSN not provided, skipping initialization.");
      return;
    }

    console.warn("Monitoring: Sentry DSN provided but @sentry/react not installed or incompatible; skipping Sentry initialization.");
  },

  captureException: (error: any, context?: any) => {
    console.error("Caught Exception:", error, context);
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry?.captureException) Sentry.captureException(error, { extra: context });
    } catch (e) {
      // swallow
    }
  },

  captureMessage: (message: string, level: any = 'info') => {
    console.log(`[${String(level).toUpperCase()}] ${message}`);
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry?.captureMessage) Sentry.captureMessage(message, level);
    } catch (e) {
      // swallow
    }
  }
};
