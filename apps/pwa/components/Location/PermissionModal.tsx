
import React, { useState } from 'react';
import { ICONS } from '../../constants';
import Button from '../Button';
import { LocationService } from '../../services/location';

interface PermissionModalProps {
  onGranted: () => void;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ onGranted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Trigger native browser prompt
      await LocationService.getCurrentPosition();
      LocationService.setSetupComplete(true);
      onGranted();
    } catch (e: any) {
      console.error(e);
      setError("Permission denied. Please enable Location in browser settings.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-[340px] rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl border border-white/10 relative overflow-hidden bg-slate-900/80">
        
        {/* Radial Glow Layer */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-600/40 relative z-10 border-4 border-white/10">
           <ICONS.MapPin className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white mb-3 relative z-10 tracking-tight">Enable Location</h2>
        <p className="text-slate-300 text-sm mb-10 leading-relaxed relative z-10 font-medium px-2">
          To automatically find the nearest drivers and passengers around you, easyMO needs access to your location.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 w-full text-red-400 text-xs font-bold relative z-10">
            {error}
          </div>
        )}

        <Button 
          variant="primary" 
          fullWidth 
          onClick={handleEnable}
          disabled={isLoading}
          className="relative z-10 h-14 text-sm font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 border-none"
          icon={isLoading ? <span className="animate-spin text-lg">⟳</span> : <ICONS.Check className="w-5 h-5"/>}
        >
          {isLoading ? 'Connecting...' : 'Allow Access'}
        </Button>
        
        <p className="text-[11px] text-slate-500 mt-6 relative z-10 font-bold opacity-70">
          We only share your location when you are active.
        </p>
      </div>
    </div>
  );
};

export default PermissionModal;
