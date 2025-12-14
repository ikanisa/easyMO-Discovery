import React from 'react';
import { ICONS } from '../constants';
import { AppMode } from '../types';
import AppFrame from './AppFrame';

interface LayoutProps {
  children: React.ReactNode;
  currentMode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

/**
 * Layout Component - Frame-First UI System
 *
 * - Desktop: centered phone-width frame (prototype parity)
 * - Mobile: natural full-width device rendering
 *
 * Rule: any fixed-position element must use .frame-fixed (not left-0/right-0 w-full).
 */
const Layout: React.FC<LayoutProps> = ({ children, currentMode, onNavigate }) => {
  return (
    // AppFrame: Center the whole app on large screens so desktop looks like the mobile prototype
    // Uses a phone canvas width (~420px / max-w-md) centered with backdrop
    <div className="app-frame-backdrop min-h-screen w-full flex justify-center bg-slate-100 dark:bg-slate-950">
      <div className="app-frame w-full max-w-md min-h-screen relative bg-slate-50 dark:bg-[#0f172a] shadow-2xl shadow-black/5 dark:shadow-black/50">
        {/* Content Area - Scrollable */}
        <main className="min-h-screen overflow-auto pb-24 no-scrollbar scroll-smooth">
          {children}
        </main>

        {/* Bottom Navigation - Glassmorphism (constrained to app frame width) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4 pb-6 pt-2 pointer-events-none">
          <div className="glass-panel rounded-2xl flex justify-around items-center h-16 shadow-2xl shadow-black/10 dark:shadow-black/50 pointer-events-auto bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
    <AppFrame>
      {/* Content Area - Scrollable */}
      <main className="min-h-screen overflow-auto pb-24 no-scrollbar scroll-smooth">
        {children}
      </main>

      {/* Bottom Navigation - Positioned within the frame */}
      <nav className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-2 pointer-events-none">
        <div className="glass-panel rounded-2xl flex justify-around items-center h-16 shadow-2xl shadow-black/10 dark:shadow-black/50 pointer-events-auto bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
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
    </AppFrame>
    <div className="app-frame">
      <div className="app-frame-inner">
        <main className="min-h-[100dvh] overflow-auto pb-24 no-scrollbar scroll-smooth liquid-bg">
          {children}
        </main>

        <nav className="frame-fixed bottom-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
          <div className="glass-panel rounded-pill flex justify-around items-center h-16 shadow-glass pointer-events-auto">
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
    className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${
      active ? 'text-primary -translate-y-1' : 'text-slate-500 dark:text-slate-400'
    }`}
  >
    <div className={`p-1.5 rounded-button transition-all ${active ? 'bg-primary/20' : 'bg-transparent'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] font-bold mt-1 tracking-wide">{label}</span>
  </button>
);

export default Layout;
