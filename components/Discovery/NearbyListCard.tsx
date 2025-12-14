
import React from 'react';
import { PresenceUser, VehicleType } from '../../types';
import { ICONS } from '../../constants';
import Button from '../Button';

interface NearbyListCardProps {
  user: PresenceUser;
  onChat: (user: PresenceUser) => void;
  index: number;
}

const getVehicleIcon = (type?: VehicleType) => {
  switch (type) {
    case 'moto': return ICONS.Bike;
    case 'shop': return ICONS.Store;
    case 'cab': 
    case 'liffan':
    case 'truck':
    case 'other':
      return ICONS.Car;
    default: return ICONS.Car;
  }
};

const NearbyListCard: React.FC<NearbyListCardProps> = ({ user, onChat, index }) => {
  
  return (
    <div 
      className="glass-panel p-3 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-sm dark:shadow-lg animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards backdrop-blur-md"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-3.5">
        <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg shrink-0 relative border border-white/20
            ${user.role === 'vendor' ? 'bg-gradient-to-br from-orange-500 to-pink-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}
        `}>
           {user.role === 'vendor' ? <ICONS.Store className="w-4 h-4 text-white" /> : <span className="text-sm text-white">{user.displayName?.[0]}</span>}
           
           {/* Online Status Dot (Avatar Corner) */}
           {user.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white dark:bg-[#0f172a] rounded-full flex items-center justify-center">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              </div>
           )}
        </div>
        
        <div>
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            {user.displayName || 'Unknown'}
            
            {/* Active Sharing Pulsing Dot */}
            {user.isOnline && (
                <span className="relative flex h-2 w-2 ml-0.5" title="Live Location">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            )}

            {user.role !== 'passenger' && (
               <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">
                 {user.vehicleType}
               </span>
            )}
          </div>
          
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ICONS.MapPin className="w-3 h-3" />
                {user.distance}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></span>
            <span className="capitalize">{user.role === 'vendor' ? 'Shop' : (user.role === 'passenger' ? 'Passenger' : 'Driver')}</span>
          </div>
        </div>
      </div>
      
      <Button 
        variant="primary" 
        className="!py-2 !px-4 !text-xs !rounded-xl !font-bold tracking-wide shadow-lg shadow-blue-500/20 active:scale-95 transition-transform bg-blue-600 hover:bg-blue-500 border-none text-white"
        onClick={() => onChat(user)}
        icon={<ICONS.Chat className="w-3.5 h-3.5"/>}
      >
        Chat
      </Button>
    </div>
  );
};

export default NearbyListCard;
