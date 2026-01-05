
import React from 'react';
import { AppMode } from '@easymo/shared/types';
import Button from './Button';
import { ICONS } from '../constants';

interface OfflineFallbackProps {
  mode?: AppMode;
  onRetry?: () => void;
}

/**
 * Route-specific offline fallback component
 * Provides meaningful offline state for each route
 */
const OfflineFallback: React.FC<OfflineFallbackProps> = ({ mode, onRetry }) => {
  const getContent = () => {
    switch (mode) {
      case AppMode.DISCOVERY:
        return {
          icon: ICONS.Bike,
          title: 'Offline - Discovery',
          message: 'You\'re offline. Discovery features require an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to find rides and drivers.',
        };
      case AppMode.BUSINESS:
        return {
          icon: ICONS.Store,
          title: 'Offline - Marketplace',
          message: 'You\'re offline. Marketplace listings require an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to browse businesses.',
        };
      case AppMode.SERVICES:
        return {
          icon: ICONS.Grid,
          title: 'Offline - Services',
          message: 'You\'re offline. Some services require an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to access all services.',
        };
      case AppMode.MOMO_GENERATOR:
        return {
          icon: ICONS.QRCode,
          title: 'Offline - MoMo QR',
          message: 'You\'re offline. QR code generation requires an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to generate payment QR codes.',
        };
      case AppMode.SCANNER:
        return {
          icon: ICONS.QRCode,
          title: 'Offline - QR Scanner',
          message: 'You\'re offline. QR scanning requires an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to scan QR codes.',
        };
      default:
        return {
          icon: ICONS.Home,
          title: 'You\'re Offline',
          message: 'This feature requires an internet connection.',
          suggestion: 'Connect to Wi‑Fi or mobile data to continue.',
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
        <Icon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
        {content.title}
      </h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {content.message}
      </p>
      <p className="mb-6 text-xs text-slate-500 dark:text-slate-500">
        {content.suggestion}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary">
          Try Again
        </Button>
      )}
    </div>
  );
};

export default OfflineFallback;

