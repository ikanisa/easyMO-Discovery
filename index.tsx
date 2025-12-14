
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// Register Service Worker with vite-plugin-pwa
// This handles update prompts automatically via the 'prompt' registerType in vite.config.ts
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event that the UpdatePrompt component can listen to
    window.dispatchEvent(new CustomEvent('swNeedRefresh', { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
    window.dispatchEvent(new CustomEvent('swOfflineReady'));
  },
  onRegisteredSW(swUrl, r) {
    console.log('Service Worker registered:', swUrl);
    // Check for updates periodically (every hour)
    if (r) {
      setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('Service Worker registration error:', error);
  }
});
