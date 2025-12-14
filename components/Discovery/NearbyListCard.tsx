
import React from 'react';
import { PresenceUser, VehicleType } from '../../types';
import { ICONS } from '../../constants';
import Button from '../Button';

interface NearbyListCardProps {
  user: PresenceUser;
  onChat: (user: PresenceUser) => void;
  index: number;
}

const NearbyListCard: React.FC<NearbyListCardProps> = ({ user, onChat, index }) => {
  
  return (
    <div 
      className="glass-panel p-4 rounded-[1.5rem] flex items-center justify-between border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/60 transition-all shadow-sm hover:shadow-md dark:shadow-black/20 animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards backdrop-blur-md group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
            <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg shrink-0 border border-white/20
                ${user.role === 'vendor' 
                    ? 'bg-gradient-to-br from-orange-400 to-pink-500 text-white' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}
            `}>
               {user.role === 'vendor' ? <ICONS.Store className="w-5 h-5" /> : user.displayName?.[0]}
            </div>
            
            {/* Online Status Badge */}
            {user.isOnline && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                </div>
            )}
        </div>
        
        <div>
          <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            {user.displayName || 'Unknown'}
            {user.role !== 'passenger' && (
               <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-full text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">
                 {user.vehicleType}
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                <ICONS.MapPin className="w-3 h-3" />
                {user.distance}
            </span>
            
            {user.eta && (
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg">
                    <ICONS.Clock className="w-3 h-3" />
                    {user.eta}
                </span>
            )}

            {!user.eta && (
                <span className="text-slate-400 dark:text-slate-500 capitalize text-[10px]">
                    {user.role === 'vendor' ? 'Shop' : (user.role === 'passenger' ? 'Passenger' : 'Driver')}
                </span>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        variant="primary" 
        className="!py-2.5 !px-5 !text-xs !rounded-xl !font-bold tracking-wide shadow-lg shadow-blue-500/20 active:scale-95 transition-transform bg-blue-600 hover:bg-blue-500 border-none text-white group-hover:scale-105"
        onClick={() => onChat(user)}
        icon={<ICONS.Chat className="w-3.5 h-3.5"/>}
      >
        Chat
      </Button>
    </div>
  );
};

export default NearbyListCard;