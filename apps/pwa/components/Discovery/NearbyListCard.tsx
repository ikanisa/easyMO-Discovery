
import React from 'react';
import { motion } from 'framer-motion';
import { PresenceUser, VehicleType } from '../../types';
import { ICONS } from '../../constants';
import { calculateETA } from '../../services/location';
import { cn } from '../../utils/ui';

interface NearbyListCardProps {
  user: PresenceUser;
  onChat: (user: PresenceUser) => void;
  index: number;
}

const VEHICLE_ICON_MAP: Record<string, any> = {
  moto: ICONS.Moto,
  cab: ICONS.Taxi,
  liffan: ICONS.Sedan,
  truck: ICONS.Pickup,
  other: ICONS.Bus,
};

const NearbyListCard: React.FC<NearbyListCardProps> = ({ user, onChat, index }) => {
  const etaString = user.eta || (user._distKm ? calculateETA(user._distKm, user.vehicleType) : undefined);
  
  const isMinutes = etaString?.includes('min');
  const minutesVal = isMinutes ? parseInt(etaString || '99') : 99;
  const isFast = isMinutes && minutesVal <= 10;
  const isImmediate = isMinutes && minutesVal <= 3;

  const VehicleIcon = user.vehicleType ? (VEHICLE_ICON_MAP[user.vehicleType] || ICONS.Car) : ICONS.User;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.05, 
        type: "spring", 
        stiffness: 260, 
        damping: 20 
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden group mb-3",
        "bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl",
        "border border-white/60 dark:border-white/10",
        "rounded-[2rem] p-4 flex items-center justify-between",
        "shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "transition-all duration-300"
      )}
    >
      {/* Background Liquid Gradient Glow */}
      <div className="absolute -inset-24 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center gap-4 relative z-10">
        {/* Avatar Section */}
        <div className="relative shrink-0">
            <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/40",
                "bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700",
                user.role === 'driver' && "from-blue-600 to-indigo-700",
                user.role === 'vendor' && "from-orange-500 to-pink-600"
            )}>
               <VehicleIcon className={cn(
                 "w-7 h-7",
                 user.role === 'passenger' ? "text-slate-600 dark:text-slate-400" : "text-white"
               )} />
            </div>
            
            {/* Online Indicator Badge */}
            <div className="absolute -bottom-1 -right-1">
                <div className="relative flex h-4 w-4">
                  {user.isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-900",
                    user.isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                  )}></span>
                </div>
            </div>
        </div>
        
        {/* Info Section */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-base text-slate-900 dark:text-white truncate max-w-[120px]">
              {user.displayName || 'Unknown'}
            </h3>
            {user.role !== 'passenger' && user.vehicleType && (
               <span className="text-[9px] px-2 py-0.5 bg-blue-600/10 dark:bg-blue-400/10 text-blue-800 dark:text-blue-300 rounded-full font-black uppercase tracking-tighter border border-blue-200 dark:border-blue-400/20">
                 {user.vehicleType}
               </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Distance Pill */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-xl border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-400">
                <ICONS.MapPin className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold tracking-tight">{user.distance || 'Near'}</span>
            </div>
            
            {/* ETA Pill */}
            {etaString && (
                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-black text-[10px] transition-colors duration-500",
                    isImmediate
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : isFast 
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" 
                        : "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                )}>
                    {isImmediate ? (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    ) : (
                      <ICONS.Clock className="w-3 h-3" />
                    )}
                    {isImmediate ? 'ARRIVING NOW' : `IN ${etaString.toUpperCase()}`}
                </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Interaction Button */}
      <button 
        onClick={() => onChat(user)}
        className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
          "bg-blue-600 text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)]",
          "hover:bg-blue-500 hover:scale-105 active:scale-90",
          "border border-white/20"
        )}
      >
        <ICONS.Chat className="w-5 h-5" />
      </button>
    </motion.div>
  );
};

export default NearbyListCard;
