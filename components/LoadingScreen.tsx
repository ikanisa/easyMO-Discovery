
import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0f172a] absolute inset-0 z-50">
      <div className="relative">
        {/* Pulsing Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
        {/* Spinning Inner Ring */}
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-emerald-500 border-l-transparent animate-spin"></div>
      </div>
      <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">
        Loading
      </div>
    </div>
  );
};

export default LoadingScreen;
