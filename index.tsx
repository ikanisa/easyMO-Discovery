
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringService } from './services/monitoring';
import { initVitals } from './services/vitals';

// Initialize Monitoring
MonitoringService.init();
initVitals();

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
if (!rootElement) throw new Error("Root not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

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
