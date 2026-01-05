import { CONFIG } from '../config';

// Enhanced monitoring service with Sentry integration
// Falls back to console logging if Sentry is not available

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  beforeSend?: (event: any) => any;
}

let sentryInitialized = false;

/**
 * Initialize Sentry if DSN is provided
 */
export const MonitoringService = {
  init: (sentryConfig?: SentryConfig) => {
    const dsn = sentryConfig?.dsn || CONFIG.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;
    
    if (!dsn) {
      console.debug("Monitoring: Sentry DSN not provided, using console logging only.");
      return;
    }

    // Try to initialize Sentry
    // Check if Sentry is available via window (loaded separately or via CDN)
    // Or if @sentry/react is installed, it will be available at runtime
    if (typeof window !== 'undefined') {
      // Check for Sentry on window (if loaded via CDN or script tag)
      const windowSentry = (window as any).Sentry;
      if (windowSentry) {
        try {
          windowSentry.init({
            dsn,
            environment: sentryConfig?.environment || CONFIG.ENVIRONMENT || import.meta.env.MODE || 'development',
            release: sentryConfig?.release || CONFIG.VERSION,
            tracesSampleRate: sentryConfig?.tracesSampleRate || 0.1,
            beforeSend: sentryConfig?.beforeSend || ((event: any) => {
              // Filter out known non-critical errors
              if (event.exception) {
                const error = event.exception.values?.[0];
                if (error?.type === 'ChunkLoadError' || error?.type === 'Loading chunk') {
                  // Ignore chunk load errors (likely due to cache invalidation)
                  return null;
                }
              }
              return event;
            }),
          });
          
          sentryInitialized = true;
          console.debug("Monitoring: Sentry initialized successfully.");
        } catch (error) {
          console.warn("Monitoring: Sentry initialization failed, using console logging only.", error);
        }
      } else {
        // Sentry not available - will use console logging only
        // To enable Sentry, either:
        // 1. Install @sentry/react and import it in index.tsx
        // 2. Load Sentry via CDN script tag
        console.debug("Monitoring: Sentry not available, using console logging only. Install @sentry/react to enable error tracking.");
      }
    }
  },

  captureException: (error: any, context?: any) => {
    const errorInfo = {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      ...context,
    };

    console.error("Caught Exception:", errorInfo);

    if (sentryInitialized) {
      try {
        const Sentry = (window as any).__SENTRY__;
        if (Sentry?.captureException) {
          Sentry.captureException(error, {
            extra: context,
            tags: {
              component: context?.component || 'unknown',
            },
          });
        }
      } catch (e) {
        console.error("Failed to send exception to Sentry:", e);
      }
    }
  },

  captureMessage: (message: string, level: 'info' | 'warning' | 'error' | 'debug' = 'info', context?: any) => {
    console.log(`[${level.toUpperCase()}] ${message}`, context || '');

    if (sentryInitialized) {
      try {
        const Sentry = (window as any).__SENTRY__;
        if (Sentry?.captureMessage) {
          Sentry.captureMessage(message, {
            level: level === 'info' ? 'info' : level === 'warning' ? 'warning' : 'error',
            extra: context,
          });
        }
      } catch (e) {
        console.error("Failed to send message to Sentry:", e);
      }
    }
  },

  setUser: (user: { id: string; email?: string; username?: string }) => {
    if (sentryInitialized) {
      try {
        const Sentry = (window as any).__SENTRY__;
        if (Sentry?.setUser) {
          Sentry.setUser(user);
        }
      } catch (e) {
        console.error("Failed to set Sentry user:", e);
      }
    }
  },

  addBreadcrumb: (breadcrumb: { message: string; category?: string; level?: string; data?: any }) => {
    if (sentryInitialized) {
      try {
        const Sentry = (window as any).__SENTRY__;
        if (Sentry?.addBreadcrumb) {
          Sentry.addBreadcrumb(breadcrumb);
        }
      } catch (e) {
        // Ignore breadcrumb errors
      }
    }
  },
};
