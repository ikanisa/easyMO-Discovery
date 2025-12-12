
import React from 'react';
import { BusinessListing } from '../../types';
import { ICONS } from '../../constants';

interface VerifiedBusinessListProps {
  matches: BusinessListing[];
  itemFound: string;
}

const VerifiedBusinessList: React.FC<VerifiedBusinessListProps> = ({ matches, itemFound }) => {
  if (matches.length === 0) return null;

  const handleWhatsApp = (phone: string, name: string) => {
    // Direct order draft
    const draft = `Hello ${name}, I saw you confirmed availability of: "${itemFound}". I would like to order/pickup now.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(draft)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Header Banner */}
      <div className="bg-emerald-500 rounded-t-2xl p-4 shadow-lg shadow-emerald-500/20 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <ICONS.Check className="w-24 h-24 text-white" />
         </div>
         <div className="relative z-10">
            <h2 className="text-white font-black text-lg flex items-center gap-2">
               <span className="bg-white text-emerald-600 rounded-full p-1"><ICONS.Check className="w-4 h-4" /></span>
               Stock Confirmed!
            </h2>
            <p className="text-emerald-50 text-xs mt-1 font-medium max-w-[85%]">
               {matches.length} businesses just replied "YES" on WhatsApp. They have <strong>{itemFound}</strong>.
            </p>
         </div>
      </div>

      {/* List */}
      <div className="bg-slate-900 border-x border-b border-emerald-500/30 rounded-b-2xl p-2 space-y-2 shadow-2xl">
         {matches.map((biz) => (
            <div key={biz.id} className="bg-slate-800 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 group hover:bg-slate-700 transition-colors">
               <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{biz.name}</div>
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     Replied just now
                  </div>
               </div>
               
               <button 
                 onClick={() => handleWhatsApp(biz.phoneNumber || '', biz.name)}
                 className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
               >
                 <ICONS.WhatsApp className="w-4 h-4" />
                 Order
               </button>
            </div>
         ))}
      </div>

      <div className="text-center mt-2">
         <p className="text-[10px] text-slate-500">
            Tap "Order" to open WhatsApp chat directly with the verified seller.
         </p>
      </div>

    </div>
  );
};

export default VerifiedBusinessList;
