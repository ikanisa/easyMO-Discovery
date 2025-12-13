
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
    { id: 'other', label: 'Bus', icon: ICONS.Bus }, // Renaming label 'Other' to 'Bus' visually, id stays 'other' for logic compatibility, or we keep label 'Other' but use Bus Icon. Let's keep label 'Other' for now or maybe 'Bus/Van'.
  ];

  return (
    <div className="flex gap-3 overflow-x-auto py-4 px-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
      {vehicles.map((v) => {
        const isSelected = selected === v.id;
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`
              relative flex flex-col items-center justify-center min-w-[80px] h-[80px] rounded-2xl border transition-all duration-300 group shrink-0 backdrop-blur-md overflow-hidden
              ${isSelected 
                ? 'border-blue-500/50 shadow-[0_8px_30px_-10px_rgba(59,130,246,0.5)] translate-y-[-4px]' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }
            `}
          >
            {/* Fluid Background for Selected State */}
            {isSelected && (
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 opacity-90" />
            )}
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-2">
               <Icon className={`w-8 h-8 transition-all duration-300 ${isSelected ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
               <span className={`text-[10px] font-bold tracking-wider uppercase ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                 {v.label}
               </span>
            </div>

            {/* Gloss Reflection */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </button>
        );
      })}
    </div>
  );
};

export default VehicleSelector;
    