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
 * This layout enforces mobile-first design with desktop containment:
 * - All content is constrained to a phone-width frame (max 420px)
 * - On desktop, the app appears centered with a backdrop
 * - On mobile, the app fills the screen naturally
 * 
 * IMPORTANT: Any fixed-position elements MUST use the "frame-fixed" class
 * instead of standard Tailwind "fixed" to stay constrained within the frame.
 * Avoid using w-screen, w-full with left-0 on fixed elements.
 * 
 * Examples:
 * ✅ <nav className="frame-fixed bottom-0 ...">
 * ❌ <nav className="fixed inset-x-0 bottom-0 w-full ...">
 */
const Layout: React.FC<LayoutProps> = ({ children, currentMode, onNavigate }) => {
  return (
    // App Frame - Constrained phone canvas with desktop backdrop
    <div className="app-frame">
      {/* Content Area - Scrollable */}
      <main className="min-h-screen overflow-auto pb-24 no-scrollbar scroll-smooth liquid-bg">
        {children}
      </main>

      {/* Bottom Navigation - Fixed within app frame */}
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
