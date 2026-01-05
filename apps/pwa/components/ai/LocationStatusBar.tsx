/**
 * LocationStatusBar - Shows location status in header
 * Displays online/offline status, last updated time, and go offline toggle
 */

import React, { useEffect, useState } from 'react';
import { ICONS } from '../../constants';
import { LocationService } from '../../services/location';

interface LocationStatusBarProps {
  isOnline?: boolean;
  lastUpdated?: Date;
  onToggleOffline?: (isOffline: boolean) => void;
}

const LocationStatusBar: React.FC<LocationStatusBarProps> = ({
  isOnline = false,
  lastUpdated,
  onToggleOffline,
}) => {
  const [minutesAgo, setMinutesAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastUpdated) {
      setMinutesAgo(null);
      return;
    }

    const updateMinutes = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    };

    updateMinutes();
    const interval = setInterval(updateMinutes, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleToggle = () => {
    if (onToggleOffline) {
      onToggleOffline(isOnline);
    }
  };

  if (!isOnline && !lastUpdated) {
    return null; // Don't show if never online
  }

  return (
    <div className="
      flex items-center gap-2
      px-3 py-2
      rounded-xl
      bg-slate-100 dark:bg-slate-800
      border border-slate-200 dark:border-slate-700
    ">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-slate-400'
          }`}
        />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Last Updated */}
      {lastUpdated && minutesAgo !== null && (
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <ICONS.Clock className="w-3 h-3" />
          <span>
            {minutesAgo === 0
              ? 'Just now'
              : minutesAgo === 1
              ? '1 min ago'
              : `${minutesAgo} min ago`}
          </span>
        </div>
      )}

      {/* Toggle Button */}
      {onToggleOffline && (
        <button
          onClick={handleToggle}
          className="
            ml-auto
            px-3 py-1
            rounded-lg
            text-xs font-semibold
            bg-white dark:bg-slate-700
            border border-slate-200 dark:border-slate-600
            text-slate-700 dark:text-slate-300
            hover:bg-slate-50 dark:hover:bg-slate-600
            transition-colors
          "
        >
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      )}
    </div>
  );
};

export default LocationStatusBar;

