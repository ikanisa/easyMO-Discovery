import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [showOfflineReadyToast, setShowOfflineReadyToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleOfflineReady = () => {
      setIsOfflineReady(true);
      setShowOfflineReadyToast(true);
      // Auto-hide the toast after 4 seconds
      setTimeout(() => setShowOfflineReadyToast(false), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('swOfflineReady', handleOfflineReady);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('swOfflineReady', handleOfflineReady);
    };
  }, []);

  // Show offline ready toast briefly when service worker caches everything
  if (showOfflineReadyToast) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[50] animate-in slide-in-from-bottom-4 duration-500">
        <div className="glass-panel p-3 rounded-xl border border-emerald-500/20 shadow-lg bg-emerald-950/90 backdrop-blur-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <ICONS.Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-emerald-100 font-medium">Ready to work offline</p>
            <p className="text-xs text-emerald-400/70">App cached for offline use</p>
          </div>
        </div>
      </div>
    );
  }

  // Show offline indicator when not connected
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[80] animate-in slide-in-from-top-2 duration-300">
        <div className="bg-amber-600 px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
          <div className="w-4 h-4 rounded-full bg-amber-400/30 flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 rounded-full bg-amber-200" />
          </div>
          <span className="text-white text-xs font-medium">
            You're offline {isOfflineReady && '— using cached data'}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
