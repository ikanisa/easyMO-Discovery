
import React from 'react';
import { VehicleType } from '../../types';
import { ICONS } from '../../constants';

interface VehicleSelectorProps {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({ selected, onSelect }) => {
  const vehicles: { id: VehicleType; label: string; icon: any }[] = [
    { id: 'moto', label: 'Moto', icon: ICONS.Moto },
    { id: 'cab', label: 'Cab', icon: ICONS.Taxi },
    { id: 'liffan', label: 'Liffan', icon: ICONS.Sedan },
    { id: 'truck', label: 'Truck', icon: ICONS.Pickup },
    { id: 'other', label: 'Other', icon: ICONS.Bus }, // Updated to Bus icon for variety
  ];

  return (
    <div className="flex gap-4 overflow-x-auto py-2 px-1 no-scrollbar scroll-smooth snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
      {vehicles.map((v) => {
        const isSelected = selected === v.id;
        const Icon = v.icon;
        
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`
              relative flex flex-col items-center justify-center min-w-[90px] h-[96px] rounded-3xl transition-all duration-300 group shrink-0 snap-start overflow-hidden
              ${isSelected 
                ? 'scale-105 shadow-xl shadow-blue-600/20 translate-y-[-4px]' 
                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
              }
            `}
          >
            {/* Liquid Background for Selected */}
            {isSelected && (
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 animate-[pulse_4s_ease-in-out_infinite]" />
            )}
            
            {/* Content Layer */}
            <div className="relative z-10 flex flex-col items-center gap-3">
               <div className={`p-1 rounded-full transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Icon className={`w-8 h-8 ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`} />
               </div>
               <span className={`text-[10px] font-bold tracking-widest uppercase ${isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-500'}`}>
                 {v.label}
               </span>
            </div>

            {/* Glass Shine */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </button>
        );
      })}
    </div>
  );
};

export default VehicleSelector;
