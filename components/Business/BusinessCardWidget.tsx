
import React, { useState } from 'react';
import { ICONS } from '../../constants';
import { BusinessListing } from '../../types';

interface BusinessCardWidgetProps {
  biz: BusinessListing;
  compact?: boolean;
}

const getCategoryIcon = (category: string): string => {
  const c = category.toLowerCase();
  if (c.includes('pharmacy') || c.includes('medicine') || c.includes('drug')) return '💊';
  if (c.includes('electronic') || c.includes('phone') || c.includes('mobile') || c.includes('gadget')) return '📱';
  if (c.includes('hardware') || c.includes('tool') || c.includes('construction material')) return '🔨';
  if (c.includes('notar') || c.includes('legal') || c.includes('law')) return '⚖️';
  if (c.includes('liquor') || c.includes('wine') || c.includes('alcohol') || c.includes('beverage')) return '🍾';
  if (c.includes('auto') || c.includes('car') || c.includes('mechanic') || c.includes('spare')) return '🚗';
  if (c.includes('grocer') || c.includes('supermarket') || c.includes('market')) return '🛒';
  if (c.includes('fashion') || c.includes('cloth') || c.includes('boutique') || c.includes('tailor')) return '👗';
  if (c.includes('restaurant') || c.includes('cafe') || c.includes('bar') || c.includes('food') || c.includes('lunch')) return '🍽️';
  if (c.includes('hospital') || c.includes('clinic') || c.includes('doctor') || c.includes('health')) return '🏥';
  if (c.includes('school') || c.includes('educat') || c.includes('class')) return '🎓';
  if (c.includes('bank') || c.includes('financ') || c.includes('money')) return '🏦';
  if (c.includes('real estate') || c.includes('construct')) return '🏗️';
  if (c.includes('salon') || c.includes('barber') || c.includes('hair') || c.includes('beauty')) return '✂️';
  if (c.includes('transport') || c.includes('logistic') || c.includes('move') || c.includes('truck')) return '🚚';
  if (c.includes('hotel') || c.includes('lodg')) return '🏨';
  return '🏢';
};

const BusinessCardWidget: React.FC<BusinessCardWidgetProps> = ({ biz, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize data (handle potentially missing fields from AI)
  const isOpen = biz.isOpen === true;
  const isClosed = biz.isOpen === false;
  const isUnknown = biz.isOpen === undefined;
  
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const draft = biz.whatsappDraft || `Hello ${biz.name}, do you have [item] available?`;
    const phone = biz.phoneNumber?.replace(/\D/g, '') || '';
    
    // Fallback to generic WhatsApp link if no phone, but prefer phone if available
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(draft)}`
      : `https://wa.me/?text=${encodeURIComponent(draft)}`;
      
    window.open(url, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (biz.phoneNumber) {
      window.open(`tel:${biz.phoneNumber}`, '_self');
    }
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (biz.phoneNumber) {
      navigator.clipboard.writeText(biz.phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExpand = () => setExpanded(!expanded);
  const categoryIcon = getCategoryIcon(biz.category);

  return (
    <div 
      className={`
        glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-slate-900/40 transition-all duration-300
        ${compact ? 'min-w-[280px] w-[280px]' : 'w-full'}
      `}
      onClick={handleExpand}
    >
      <div className="p-4 flex flex-col h-full relative">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-2">
            <h3 className="font-bold text-white leading-tight line-clamp-2 flex items-baseline gap-2">
              <span className="text-lg filter drop-shadow-lg">{categoryIcon}</span>
              <span>{biz.name}</span>
            </h3>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide opacity-90 mt-1 pl-7">
              {biz.category}
            </div>
          </div>
          
          <div className={`
             shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1
             ${isOpen ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
               isClosed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-700/50 border-slate-600/50 text-slate-400'}
          `}>
            {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            {isOpen ? 'OPEN' : (isClosed ? 'CLOSED' : 'UNKNOWN')}
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-4 pl-1">
          <div className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-900/20 px-1.5 py-0.5 rounded">
            <ICONS.MapPin className="w-3 h-3" />
            {biz.distance}
          </div>
          {biz.address && <span className="opacity-60 truncate max-w-[140px]">• {biz.address}</span>}
        </div>

        {/* Collapsible Details */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${expanded || !compact ? 'max-h-40 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}
        `}>
           {biz.snippet && (
             <div className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg border-l-2 border-slate-600 italic">
               "{biz.snippet}"
             </div>
           )}
           {biz.phoneNumber && (
             <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
               <ICONS.Phone className="w-3 h-3 opacity-50" />
               <span className="font-mono">{biz.phoneNumber}</span>
               <button 
                 onClick={handleCopyPhone}
                 className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
               >
                 {copied ? <ICONS.Check className="w-3 h-3" /> : <ICONS.Copy className="w-3 h-3" />}
                 {copied ? 'Copied' : 'Copy'}
               </button>
             </div>
           )}
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-[1.5fr_1fr] gap-2 mt-auto">
          <button 
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <ICONS.WhatsApp className="w-4 h-4" />
            Msg
          </button>
          
          <button 
            onClick={handleCall}
            disabled={!biz.phoneNumber}
            className={`
              flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95
              ${biz.phoneNumber 
                ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10' 
                : 'bg-slate-800/50 text-slate-600 border-transparent cursor-not-allowed opacity-60'}
            `}
          >
            <ICONS.Phone className="w-4 h-4" />
            {biz.phoneNumber ? 'Call' : 'No #'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-3 flex justify-between items-center">
           <div className="flex items-center gap-1">
             <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${
                biz.confidence === 'High' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 
                biz.confidence === 'Medium' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' :
                'border-slate-700 text-slate-500'
             }`}>
               {biz.confidence} Match
             </span>
           </div>
           
           {compact && (
             <div className="text-slate-600">
               {expanded ? <ICONS.ChevronUp className="w-4 h-4" /> : <ICONS.ChevronDown className="w-4 h-4" />}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default BusinessCardWidget;
