
import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-50 dark:bg-[#0f172a] absolute inset-0 z-50">
      <div className="px-6 pt-10 space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded-full bg-slate-200 dark:bg-slate-700/50" />
        <div className="h-12 w-full rounded-3xl bg-slate-200 dark:bg-slate-700/40" />
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700/40" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 w-36 rounded-[1.75rem] bg-slate-200 dark:bg-slate-700/40"
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700/40" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-36 w-36 rounded-[1.75rem] bg-slate-200 dark:bg-slate-700/40"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
