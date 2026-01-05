
import React, { useState } from 'react';
import Button from '../Button';
import { ICONS } from '@easymo/shared/constants';
import { requestCameraPermission } from '../../services/camera';

interface CameraPermissionModalProps {
  isOpen: boolean;
  onGranted: () => void;
  onDenied: () => void;
  onCancel: () => void;
  purpose?: string; // Explain why camera is needed
}

/**
 * Camera Permission Modal
 * 
 * Just-in-time permission request with clear explanation
 * Explains benefits in human language
 */
const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({
  isOpen,
  onGranted,
  onDenied,
  onCancel,
  purpose = 'scan QR codes',
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequest = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const result = await requestCameraPermission();
      
      if (result.granted) {
        onGranted();
      } else {
        setError(result.error || 'Permission denied');
        onDenied();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request permission');
      onDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <ICONS.Camera className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Camera Access Needed
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            We need camera access to {purpose}.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Your camera is only used when you actively scan. We never record or store video.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={handleRequest}
            disabled={isRequesting}
            fullWidth
            icon={isRequesting ? undefined : <ICONS.Camera className="w-5 h-5" />}
          >
            {isRequesting ? 'Requesting...' : 'Allow Camera Access'}
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isRequesting}
            fullWidth
          >
            Not Now
          </Button>
        </div>

        <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 text-center">
          You can change this later in your browser settings
        </p>
      </div>
    </div>
  );
};

export default CameraPermissionModal;

