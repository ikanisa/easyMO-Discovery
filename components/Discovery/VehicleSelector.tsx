
import React from 'react';
import { VehicleType } from '../../types';
import { ICONS } from '../../constants';

interface VehicleSelectorProps {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({ selected, onSelect }) => {
  const vehicles: { id: VehicleType; label: string; icon: any }[] = [
    { id: 'moto', label: 'Moto', icon: ICONS.Bike },
    { id: 'cab', label: 'Cab', icon: ICONS.Car },
    { id: 'liffan', label: 'Liffan', icon: ICONS.Car },
    { id: 'truck', label: 'Truck', icon: ICONS.Truck },
    { id: 'other', label: 'Other', icon: ICONS.More },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto py-2 px-1 no-scrollbar">
      {vehicles.map((v) => {
        const isSelected = selected === v.id;
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`
              flex flex-col items-center justify-center min-w-[80px] p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group backdrop-blur-md
              ${isSelected 
                ? 'bg-blue-600 border-blue-500/50 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10 hover:text-slate-200'
              }
            `}
          >
            {/* Gloss effect for selected */}
            {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
            
            <Icon className={`w-6 h-6 mb-2 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} />
            <span className="text-xs font-bold tracking-wide">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default VehicleSelector;
