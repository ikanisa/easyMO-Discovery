import React from 'react';
import { ICONS } from '../constants';
import { AppMode } from '../types';

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
