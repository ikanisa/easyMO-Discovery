
import * as Sentry from '@sentry/react';
import { CONFIG } from '../config';

export const MonitoringService = {
  init: () => {
    if (!CONFIG.SENTRY_DSN) {
      console.debug("Monitoring: Sentry DSN not provided, skipping initialization.");
      return;
    }

    Sentry.init({
      dsn: CONFIG.SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: CONFIG.ENVIRONMENT,
      release: CONFIG.VERSION
    });
  },

  captureException: (error: any, context?: any) => {
    console.error("Caught Exception:", error, context);
    if (CONFIG.SENTRY_DSN) {
      Sentry.captureException(error, { extra: context });
    }
  },

  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    console.log(`[${level.toUpperCase()}] ${message}`);
    if (CONFIG.SENTRY_DSN) {
      Sentry.captureMessage(message, level);
    }
  }
};
