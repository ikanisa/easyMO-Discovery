import React from 'react';

interface OfflineBannerProps {
  isOnline: boolean;
  queuedCount: number;
  lastSyncedAt: number | null;
  onSync?: () => void;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  queuedCount,
  lastSyncedAt,
  onSync,
}) => {
  if (isOnline && queuedCount === 0) return null;

  const statusText = isOnline
    ? `Syncing ${queuedCount} queued action${queuedCount === 1 ? '' : 's'}`
    : 'Offline mode — actions will sync when online';

  const lastSyncedLabel =
    lastSyncedAt && isOnline
      ? new Date(lastSyncedAt).toLocaleTimeString()
      : null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-400">
            {isOnline ? 'Sync' : 'Offline'}
          </div>
          <div className="mt-1">{statusText}</div>
          {lastSyncedLabel && (
            <div className="mt-1 text-[10px] text-slate-400">
              Last sync: {lastSyncedLabel}
            </div>
          )}
        </div>
        {isOnline && queuedCount > 0 && (
          <button
            onClick={onSync}
            className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white"
          >
            Sync now
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
