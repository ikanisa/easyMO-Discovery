/**
 * LocationConsentModal - Enhanced location permission modal
 * Low-literacy friendly with big buttons and manual fallback
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '../../constants';
import { LocationService } from '../../services/location';
import { toast } from 'sonner';

interface LocationConsentModalProps {
  onGranted: () => void;
  onManualInput?: () => void;
  onDismiss?: () => void;
}

const LocationConsentModal: React.FC<LocationConsentModalProps> = ({
  onGranted,
  onManualInput,
  onDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const handleEnable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await LocationService.getCurrentPosition();
      LocationService.setSetupComplete(true);
      onGranted();
    } catch (e: any) {
      console.error(e);
      setError('Permission denied. Please enable Location in browser settings.');
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualAddress.trim()) {
      toast.error('Please enter an address');
      return;
    }
    // Store manual address (could be geocoded later)
    localStorage.setItem('easymo_manual_location', manualAddress);
    LocationService.setSetupComplete(true);
    onGranted();
  };

  if (showManualInput) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel w-full max-w-[400px] rounded-[2.5rem] p-8 flex flex-col shadow-2xl border border-white/10 relative overflow-hidden bg-slate-900/80"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-600/40 relative z-10 border-4 border-white/10">
            <ICONS.MapPin className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-white mb-3 relative z-10 tracking-tight">
            Enter Your Location
          </h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed relative z-10 font-medium">
            Type your address or a landmark (e.g., "Kigali, Nyarugenge" or "Near Kigali Convention Centre")
          </p>

          <input
            type="text"
            inputMode="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="Enter address or landmark..."
            className="
              w-full px-4 py-4 rounded-2xl
              bg-white/10 border border-white/20
              text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-blue-500
              text-base font-medium
              mb-4
            "
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualSubmit();
              }
            }}
          />

          <div className="flex gap-3">
            <button
              onClick={() => setShowManualInput(false)}
              className="
                flex-1 px-4 py-4 rounded-2xl
                bg-white/10 border border-white/20
                text-white font-bold
                hover:bg-white/20 transition-colors
              "
            >
              Back
            </button>
            <button
              onClick={handleManualSubmit}
              className="
                flex-1 px-4 py-4 rounded-2xl
                bg-blue-600 text-white font-bold
                hover:bg-blue-500 transition-colors
                shadow-lg shadow-blue-500/25
              "
            >
              Continue
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel w-full max-w-[400px] rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl border border-white/10 relative overflow-hidden bg-slate-900/80"
      >
        {/* Radial Glow Layer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-600/40 relative z-10 border-4 border-white/10">
          <ICONS.MapPin className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-white mb-3 relative z-10 tracking-tight">
          We Need Your Location
        </h2>
        <p className="text-slate-300 text-base mb-8 leading-relaxed relative z-10 font-medium px-2">
          We need your location to find nearby drivers and businesses.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 w-full text-red-400 text-sm font-bold relative z-10">
            {error}
          </div>
        )}

        {/* Primary Action - Big Button */}
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="
            w-full
            h-16
            rounded-2xl
            bg-blue-600 hover:bg-blue-500
            text-white font-bold text-lg
            shadow-lg shadow-blue-500/25
            border-none
            transition-all duration-200
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            relative z-10
            flex items-center justify-center gap-2
          "
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-xl">⟳</span>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <ICONS.Check className="w-6 h-6" />
              <span>Allow Location Access</span>
            </>
          )}
        </button>

        {/* Secondary Action - Manual Input */}
        <button
          onClick={() => setShowManualInput(true)}
          className="
            w-full mt-3
            h-14
            rounded-2xl
            bg-white/10 border border-white/20
            text-white font-bold text-base
            hover:bg-white/20
            transition-all duration-200
            active:scale-95
            relative z-10
          "
        >
          Enter Address Manually
        </button>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="
              mt-4
              text-slate-400 text-sm font-semibold
              hover:text-slate-300
              transition-colors
              relative z-10
            "
          >
            Not Now
          </button>
        )}

        <p className="text-[11px] text-slate-500 mt-6 relative z-10 font-bold opacity-70">
          We only share your location when you are active.
        </p>
      </motion.div>
    </div>
  );
};

export default LocationConsentModal;

