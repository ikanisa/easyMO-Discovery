
import React, { useState, useEffect } from 'react';
import { ICONS } from '@easymo/shared/constants';
import Button from './Button';

// Interface for the non-standard BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(checkStandalone);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsVisible(false);
      localStorage.setItem('easyMO_install_dismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Show logic - Respect heuristics, don't nag
  useEffect(() => {
    // If already installed, don't show
    if (isStandalone) return;

    // Check if dismissed previously (persist for 7 days)
    const dismissedAt = localStorage.getItem('easyMO_install_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Only show again after 7 days
      if (daysSinceDismissed < 7) return;
    }

    // Heuristic: Only show after user engagement
    // Wait for user interaction (scroll, click, or 30s on page)
    let engagementTimer: NodeJS.Timeout;
    let engagementDetected = false;

    const checkEngagement = () => {
      if (engagementDetected) return;
      engagementDetected = true;
      
      // Additional delay after engagement (don't interrupt user)
      const showTimer = setTimeout(() => {
        if (deferredPrompt || isIOS) {
          setIsVisible(true);
        }
      }, 2000); // 2s after engagement
      
      return () => clearTimeout(showTimer);
    };

    // Track engagement events
    const handleEngagement = () => {
      if (!engagementDetected) {
        checkEngagement();
      }
    };

    // Listen for user engagement
    window.addEventListener('scroll', handleEngagement, { once: true, passive: true });
    window.addEventListener('click', handleEngagement, { once: true, passive: true });
    window.addEventListener('touchstart', handleEngagement, { once: true, passive: true });

    // Fallback: Show after 30s if no engagement (user might be reading)
    engagementTimer = setTimeout(() => {
      if (!engagementDetected) {
        checkEngagement();
      }
    }, 30000);

    return () => {
      clearTimeout(engagementTimer);
      window.removeEventListener('scroll', handleEngagement);
      window.removeEventListener('click', handleEngagement);
      window.removeEventListener('touchstart', handleEngagement);
    };
  }, [deferredPrompt, isIOS, isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android / Desktop
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store timestamp for 7-day cooldown
    localStorage.setItem('easyMO_install_dismissed', String(Date.now()));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-6 duration-700">
      <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-2xl bg-[#0f172a]/95 backdrop-blur-xl flex flex-col gap-4 relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg border border-white/10 overflow-hidden">
             <img src="/icon.svg" alt="App Icon" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-white font-bold text-lg leading-tight">Install easyMO</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isIOS 
                 ? "Install this app on your iPhone for the best experience and offline access."
                 : "Add to Home Screen for the best experience, offline access, and instant discovery."
              }
            </p>
          </div>
          <button 
            onClick={handleDismiss} 
            className="p-2 -mr-2 -mt-2 text-slate-500 hover:text-white transition-colors"
          >
            <ICONS.XMark className="w-5 h-5" />
          </button>
        </div>
        
        {isIOS ? (
           // iOS Instructions
           <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-200">
              <span className="font-bold">1. Tap</span> 
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span className="font-bold">2. Select "Add to Home Screen"</span>
              <span className="text-xl leading-none font-bold text-slate-400 ml-1">+</span>
           </div>
        ) : (
           // Android / Desktop Action
           <div className="flex gap-3 relative z-10">
                <button 
                    onClick={handleDismiss}
                    className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                    Not Now
                </button>
                <Button 
                    variant="primary" 
                    onClick={handleInstall}
                    className="flex-[2] h-auto py-3 text-xs shadow-blue-500/20"
                    icon={<ICONS.Check className="w-4 h-4" />}
                >
                    Install App
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
