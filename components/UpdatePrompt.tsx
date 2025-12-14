import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import Button from './Button';

interface UpdateSWFunction {
  (reloadPage?: boolean): Promise<void>;
}

const UpdatePrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateSWFunction | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleNeedRefresh = (event: CustomEvent<{ updateSW: UpdateSWFunction }>) => {
      setUpdateSW(() => event.detail.updateSW);
      setIsVisible(true);
    };

    window.addEventListener('swNeedRefresh', handleNeedRefresh as EventListener);

    return () => {
      window.removeEventListener('swNeedRefresh', handleNeedRefresh as EventListener);
    };
  }, []);

  const handleUpdate = async () => {
    if (updateSW) {
      setIsUpdating(true);
      try {
        await updateSW(true);
      } catch (error) {
        console.error('Failed to update:', error);
        setIsUpdating(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[70] animate-in slide-in-from-top-6 duration-500">
      <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl bg-[#0f172a]/95 backdrop-blur-xl flex items-center gap-4 relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shrink-0 shadow-lg border border-white/10">
          <ICONS.Refresh className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0 relative z-10">
          <h3 className="text-white font-bold text-sm leading-tight">Update Available</h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed truncate">
            A new version is ready. Refresh to update.
          </p>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={handleDismiss}
            className="p-2 text-slate-500 hover:text-white transition-colors"
            disabled={isUpdating}
          >
            <ICONS.XMark className="w-4 h-4" />
          </button>
          <Button 
            variant="primary" 
            onClick={handleUpdate}
            disabled={isUpdating}
            className="h-auto py-2 px-4 text-xs shadow-emerald-500/20"
          >
            {isUpdating ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
