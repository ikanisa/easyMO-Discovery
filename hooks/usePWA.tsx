import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform?: string;
  }>;
  prompt: () => Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  needsUpdate: boolean;
  isUpdating: boolean;
  isOfflineReady: boolean;
  showOfflineReadyToast: boolean;
}

interface PWAContextValue extends PWAState {
  installApp: () => Promise<void>;
  updateApp: () => void;
  dismissInstall: () => void;
}

const PWA_INSTALL_DISMISSED_KEY = 'pwa_install_dismissed';
const PWA_INSTALL_DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const PWAContext = createContext<PWAContextValue | null>(null);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    needsUpdate: false,
    isUpdating: false,
    isOfflineReady: false,
    showOfflineReadyToast: false,
  });

  useEffect(() => {
    const legacy = localStorage.getItem('easyMO_install_dismissed');
    if (legacy && !localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)) {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, Date.now().toString());
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setState((prev) => ({ ...prev, isInstalled: isStandalone }));

    let updateIntervalId: number | undefined;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // registration.update() is handled via the closure created in onRegisteredSW
      }
    };

    const updateServiceWorker = registerSW({
      onNeedRefresh() {
        setState((prev) => ({ ...prev, needsUpdate: true }));
      },
      onOfflineReady() {
        setState((prev) => ({ ...prev, isOfflineReady: true, showOfflineReadyToast: true }));
        window.setTimeout(() => {
          setState((prev) => ({ ...prev, showOfflineReadyToast: false }));
        }, 4000);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        const checkUpdate = () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        };

        updateIntervalId = window.setInterval(checkUpdate, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', checkUpdate);
      },
      onRegisterError(error) {
        console.error('❌ Service worker registration error:', error);
      },
    });

    setUpdateSW(() => updateServiceWorker);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();

      const dismissedAt = Number(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) || 0);
      const dismissedRecently =
        dismissedAt > 0 && Date.now() - dismissedAt < PWA_INSTALL_DISMISS_WINDOW_MS;
      if (dismissedRecently) return;

      setInstallPrompt(e as BeforeInstallPromptEvent);
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setState((prev) => ({ ...prev, isInstallable: false, isInstalled: true }));
    };

    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (updateIntervalId) window.clearInterval(updateIntervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      setState((prev) => ({ ...prev, isInstallable: false }));
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  }, [installPrompt]);

  const updateApp = useCallback(() => {
    if (!updateSW) return;
    setState((prev) => ({ ...prev, isUpdating: true }));
    updateSW(true).catch((error) => {
      console.error('Failed to update service worker:', error);
      setState((prev) => ({ ...prev, isUpdating: false }));
    });
  }, [updateSW]);

  const dismissInstall = useCallback(() => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, Date.now().toString());
    setState((prev) => ({ ...prev, isInstallable: false }));
  }, []);

  const value = useMemo<PWAContextValue>(
    () => ({
      ...state,
      installApp,
      updateApp,
      dismissInstall,
    }),
    [dismissInstall, installApp, state, updateApp]
  );

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
};

export function usePWA(): PWAContextValue {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWA must be used within <PWAProvider>');
  return ctx;
}

