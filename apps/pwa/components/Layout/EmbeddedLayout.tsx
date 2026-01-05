
import React from 'react';
import { AppMode } from '@easymo/shared/types';

/**
 * Embedded Layout Variant for ChatGPT Apps SDK
 * 
 * Optimized for iframe rendering in ChatGPT with:
 * - Tighter spacing (no bottom nav needed)
 * - Compact header
 * - Optimized for widget-based interactions
 */
interface EmbeddedLayoutProps {
  children: React.ReactNode;
  currentMode: AppMode;
  onNavigate?: (mode: AppMode) => void;
}

const EmbeddedLayout: React.FC<EmbeddedLayoutProps> = ({ 
  children, 
  currentMode,
  onNavigate 
}) => {
  return (
    <div className="flex flex-col h-full relative">
      {/* Compact Header - Only if not in fullscreen widget mode */}
      <header className="
        shrink-0
        px-3 py-2
        bg-white dark:bg-slate-900
        border-b border-slate-200 dark:border-slate-700
        flex items-center justify-between
      ">
        <h1 className="text-base font-bold text-slate-900 dark:text-white">
          easyMO
        </h1>
      </header>

      {/* Content Area - Compact spacing for embedded context */}
      <main
        className="flex-1 overflow-auto px-3 py-2 no-scrollbar scroll-smooth"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default EmbeddedLayout;

