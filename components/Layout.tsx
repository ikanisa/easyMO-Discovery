
import React from 'react';
import { ICONS } from '../constants';
import { AppMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentMode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentMode, onNavigate }) => {
  return (
    <div className="flex flex-col h-full relative">
      {/* Content Area - Scrollable */}
      <main className="flex-1 overflow-auto pb-24 no-scrollbar scroll-smooth">
        {children}
      </main>

      {/* Bottom Navigation - Glassmorphism */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-2 pointer-events-none">
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
    className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${active ? 'text-primary -translate-y-1' : 'text-slate-500 dark:text-slate-400'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/20' : 'bg-transparent'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] font-bold mt-1 tracking-wide">{label}</span>
  </button>
);

export default Layout;
