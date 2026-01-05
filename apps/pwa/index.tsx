
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ConfigurationMissing from './components/ConfigurationMissing';
import { ThemeProvider } from './context/ThemeContext';
import { DataSaverProvider } from './src/context/DataSaverContext';
import { MonitoringService } from './services/monitoring';
import { LoggingService } from './services/logging';
import { initVitals } from './services/vitals';
import { initRoutePrefetching } from './utils/prefetch';
import { validatePublicEnv } from './src/config/publicEnv';

// Initialize Monitoring
MonitoringService.init();
LoggingService.init();
initVitals();

// Initialize route prefetching (on good connections)
initRoutePrefetching();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: system-ui;">Error: Root element not found. Check if index.html has &lt;div id="root"&gt;&lt;/div&gt;</div>';
  throw new Error("Root not found");
}

// Add error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  if (rootElement && !rootElement.innerHTML.includes('Error')) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: system-ui;">
        <h1>Application Error</h1>
        <p><strong>${event.error?.message || 'Unknown error'}</strong></p>
        <p>Check browser console (F12) for details</p>
        <p>If this persists, check environment variables in Cloudflare Pages settings</p>
      </div>
    `;
  }
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Check for missing environment variables BEFORE rendering the app
const missingEnvVars = validatePublicEnv();

const root = ReactDOM.createRoot(rootElement);

// If env vars are missing, show configuration error screen instead of crashing
if (missingEnvVars.length > 0) {
  console.error('[Config] Missing required environment variables:', missingEnvVars);
  root.render(
    <React.StrictMode>
      <ConfigurationMissing missingVars={missingEnvVars} />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DataSaverProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </DataSaverProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Ensure dev sessions are not affected by stale service workers or caches.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.startsWith('easymo-cache-')) {
          caches.delete(key);
        }
      });
    });
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Update available', {
        description: 'A new version is ready. Reload to update.',
        action: {
          label: 'Reload',
          onClick: () => updateSW(true),
        },
      });
    },
    onOfflineReady() {
      toast('Ready for offline use', {
        description: 'The app shell is cached.',
      });
    },
    onRegisterError(error) {
      MonitoringService.captureException(error, { context: 'SW_Register_Error' });
    },
  });
}
