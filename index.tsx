
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringService } from './services/monitoring';

// Initialize Monitoring
MonitoringService.init();

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
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Hardened Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      // Use absolute path relative to current origin to avoid sandbox mismatch
      const swUrl = new URL('./sw.js', window.location.href).href;
      
      navigator.serviceWorker.register(swUrl).then(
        (reg) => console.debug('SW registered successfully'),
        (err) => {
          // Check for origin mismatch errors common in cloud preview environments
          if (err.message?.includes('origin')) {
            console.warn('ServiceWorker registration skipped: Origin mismatch in preview environment.');
          } else {
            MonitoringService.captureException(err, { context: 'SW_Registration_Failure' });
          }
        }
      ).catch(e => {
         console.warn('ServiceWorker registration failed silently:', e.message);
      });
    } catch (e) {
      console.error('ServiceWorker setup error:', e);
    }
  });
}
