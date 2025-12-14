import React from 'react';
import { usePWA } from '../../hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installApp, dismissInstall } = usePWA();

  // Don't show if already installed or not installable
  if (!isInstallable || isInstalled) return null;

  // Check if user dismissed recently (within 7 days)
  const dismissedAt = localStorage.getItem('pwa_install_dismissed');
  if (dismissedAt) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 shadow-2xl border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">Install easyMO</h3>
            <p className="text-white/80 text-sm mt-0.5">Add to home screen for the best experience</p>
          </div>
          <button
            onClick={dismissInstall}
            className="text-white/60 hover:text-white p-1 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={dismissInstall}
            className="flex-1 px-4 py-2.5 text-white/80 text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={installApp}
            className="flex-1 px-4 py-2.5 bg-white text-blue-600 text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};
