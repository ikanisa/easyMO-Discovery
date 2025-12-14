import React from 'react';
import { usePWA } from '../../hooks/usePWA';

export const UpdatePrompt: React.FC = () => {
  const { needsUpdate, isUpdating, updateApp } = usePWA();

  if (!needsUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-emerald-600 rounded-2xl p-4 shadow-2xl border border-emerald-400/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Update Available</h3>
            <p className="text-white/80 text-xs mt-0.5">A new version is ready to install</p>
          </div>
          <button
            onClick={updateApp}
            disabled={isUpdating}
            className="px-4 py-2 bg-white text-emerald-600 text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating
              </span>
            ) : (
              'Update'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
