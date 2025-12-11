
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
  const TypeIcon = getVehicleIcon(user.vehicleType);
  
  return (
    <div 
      className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shrink-0
            ${user.role === 'vendor' ? 'bg-gradient-to-br from-orange-500 to-pink-600 shadow-orange-500/20' : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/20'}
        `}>
           {user.role === 'vendor' ? <ICONS.Store className="w-6 h-6 text-white" /> : <span className="text-lg">{user.displayName?.[0]}</span>}
        </div>
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            {user.displayName || 'Unknown'}
            
            {/* Vehicle Type Icon for Drivers/Vendors */}
            {user.role !== 'passenger' && (
               <div className="bg-white/5 p-1 rounded-md flex items-center justify-center border border-white/5" title={user.vehicleType}>
                 <TypeIcon className="w-3.5 h-3.5 text-blue-400" />
               </div>
            )}
            
            {/* Pulsing Dot Indicator for Active Location Sharing */}
            {user.isOnline && (
              <span className="relative flex h-2.5 w-2.5 ml-1" title="Live Location">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[#0f172a]"></span>
              </span>
            )}
          </div>
          
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span className="font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                {user.distance}
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-slate-300">
                {user.role === 'passenger' ? (
                    <ICONS.Chat className="w-3.5 h-3.5 opacity-70" />
                ) : (
                    <TypeIcon className="w-3.5 h-3.5 opacity-70" />
                )}
                <span className="capitalize">{user.role === 'vendor' ? 'Shop' : (user.role === 'passenger' ? 'Passenger' : user.vehicleType)}</span>
            </div>
          </div>
        </div>
      </div>
      <Button 
        variant="primary" 
        className="!py-2.5 !px-4 !text-xs !rounded-xl !font-bold tracking-wide shadow-blue-500/20"
        onClick={() => onChat(user)}
        icon={<ICONS.Chat className="w-3.5 h-3.5"/>}
      >
        Chat
      </Button>
    </div>
  );
};

export default NearbyListCard;
