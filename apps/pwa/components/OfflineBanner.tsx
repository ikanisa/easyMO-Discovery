import React from 'react';

interface OfflineBannerProps {
  isOnline: boolean;
  queuedCount: number;
  lastSyncedAt: number | null;
  failedCount?: number;
  conflictCount?: number;
  onSync?: () => void;
  onClearFailed?: () => void;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  queuedCount,
  lastSyncedAt,
  failedCount = 0,
  conflictCount = 0,
  onSync,
  onClearFailed,
}) => {
  // Don't show if online and nothing to sync
  if (isOnline && queuedCount === 0 && failedCount === 0 && conflictCount === 0) {
    return null;
  }

  const statusText = isOnline
    ? queuedCount > 0
      ? `Syncing ${queuedCount} queued action${queuedCount === 1 ? '' : 's'}`
      : failedCount > 0
      ? `${failedCount} action${failedCount === 1 ? '' : 's'} failed to sync`
      : conflictCount > 0
      ? `${conflictCount} conflict${conflictCount === 1 ? '' : 's'} detected`
      : 'All synced'
    : 'Offline mode — actions will sync when online';

  const lastSyncedLabel =
    lastSyncedAt && isOnline
      ? new Date(lastSyncedAt).toLocaleTimeString()
      : null;

  const hasIssues = failedCount > 0 || conflictCount > 0;

  return (
    <div className={`mx-4 mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm ${
      hasIssues
        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
        : 'border-slate-200 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-400">
            {isOnline ? (hasIssues ? 'Sync Issues' : 'Sync') : 'Offline'}
          </div>
          <div className="mt-1">{statusText}</div>
          {lastSyncedLabel && (
            <div className="mt-1 text-[10px] text-slate-400">
              Last sync: {lastSyncedLabel}
            </div>
          )}
          {conflictCount > 0 && (
            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
              Conflicts need manual resolution
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isOnline && queuedCount > 0 && (
            <button
              onClick={onSync}
              className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white min-h-tap"
              aria-label="Sync now"
            >
              Sync now
            </button>
          )}
          {failedCount > 0 && onClearFailed && (
            <button
              onClick={onClearFailed}
              className="rounded-xl bg-slate-600 px-3 py-2 text-[11px] font-bold text-white min-h-tap"
              aria-label="Clear failed"
            >
              Clear failed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
