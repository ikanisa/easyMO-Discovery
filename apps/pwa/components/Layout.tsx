import React, { useEffect, useRef, useState } from 'react';
import { ICONS } from '@easymo/shared/constants';
import { AppMode } from '@easymo/shared/types';
import Drawer from './ai/Drawer';

interface LayoutProps {
  children: React.ReactNode;
  currentMode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentMode, onNavigate }) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    const stored = sessionStorage.getItem(`easymo-scroll-${currentMode}`);
    if (stored) {
      node.scrollTop = Number(stored);
    } else {
      node.scrollTop = 0;
    }
  }, [currentMode]);

  const handleScroll = () => {
    const node = mainRef.current;
    if (!node) return;
    sessionStorage.setItem(`easymo-scroll-${currentMode}`, String(node.scrollTop));
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with Drawer Toggle */}
      <header className="
        shrink-0
        px-4 py-3
        bg-white dark:bg-slate-900
        border-b border-slate-200 dark:border-slate-700
        flex items-center justify-between
      ">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <ICONS.Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          easyMO
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentMode={currentMode}
        onNavigate={onNavigate}
      />

      {/* Content Area - Scrollable with Safe Area padding at bottom */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto pb-24 no-scrollbar scroll-smooth"
        style={{
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {children}
      </main>

      {/* Bottom Navigation - Glassmorphism with Safe Area Handling */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-4 pb-4 pt-2 pointer-events-none" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="glass-panel rounded-2xl flex justify-around items-center h-16 shadow-2xl shadow-black/10 dark:shadow-black/50 pointer-events-auto bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl">
          <NavButton 
            active={currentMode === AppMode.HOME} 
            onClick={() => onNavigate(AppMode.HOME)}
            icon={ICONS.Home}
            label="Home"
          />
          <NavButton 
            active={currentMode === AppMode.DISCOVERY} 
            onClick={() => onNavigate(AppMode.DISCOVERY)}
            icon={ICONS.Bike}
            label="Ride"
          />
          <NavButton 
            active={currentMode === AppMode.BUSINESS} 
            onClick={() => onNavigate(AppMode.BUSINESS)}
            icon={ICONS.Store}
            label="Market"
          />
          <NavButton 
            active={currentMode === AppMode.SERVICES} 
            onClick={() => onNavigate(AppMode.SERVICES)}
            icon={ICONS.Grid}
            label="Services"
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${active ? 'text-blue-600 dark:text-blue-400 -translate-y-1' : 'text-slate-500 dark:text-slate-400'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-600/10 dark:bg-blue-500/20' : 'bg-transparent'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className={`text-[10px] font-bold mt-1 tracking-wide ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default Layout;
