
import React, { useState } from 'react';
import { ICONS } from '../../constants';
import { BusinessResultsPayload, BusinessListing } from '../../types';
import BusinessCardWidget from './BusinessCardWidget';
import { sendWhatsAppBroadcastRequest, BroadcastPayload, BusinessContact } from '../../services/whatsapp';
import Button from '../Button';

interface BusinessResultsMessageProps {
  payload: BusinessResultsPayload;
  onLoadMore?: (page: number) => void;
  onBroadcastInitiated?: (requestId: string, businesses: BusinessContact[], item: string) => void;
}

const BusinessResultsMessage: React.FC<BusinessResultsMessageProps> = ({ payload, onLoadMore, onBroadcastInitiated }) => {
  const [showAll, setShowAll] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{success: boolean, message?: string, count?: number} | null>(null);
  
  const { matches, category, filters_applied, disclaimer, pagination, need_description, user_location_label } = payload;
  
  // By default show top 3, or all if less than 5
  const visibleCount = showAll ? matches.length : 3;
  const visibleResults = matches.slice(0, visibleCount);
  const hiddenCount = matches.length - visibleCount;

  // Filter businesses valid for broadcast (must have phone)
  const broadcastCandidates = matches.filter(b => !!b.phoneNumber);

  const handleBroadcast = async () => {
    if (!broadcastCandidates.length) return;
    
    setBroadcasting(true);
    setBroadcastResult(null);

    const requestId = `R${Date.now()}`;
    
    // Construct simplified list for API
    const businessesForApi = broadcastCandidates.map(b => ({
      name: b.name,
      phone: b.phoneNumber || ''
    }));

    const reqPayload: BroadcastPayload = {
      requestId,
      userLocationLabel: user_location_label || 'Nearby',
      needDescription: need_description || (category ? `Looking for ${category}` : 'Looking for products/services'),
      businesses: businessesForApi
    };

    // This may take time in simulation mode
    const result = await sendWhatsAppBroadcastRequest(reqPayload);
    
    setBroadcasting(false);
    setBroadcastResult(result);

    if (result.success && onBroadcastInitiated) {
        // Trigger parent polling
        onBroadcastInitiated(requestId, businessesForApi, reqPayload.needDescription);
    }
  };

  if (!matches || matches.length === 0) return null;

  return (
    <div className="w-full mt-2 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Category Header */}
      {category && (
        <div className="flex items-center gap-2 px-1">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Category: <span className="text-emerald-400">{category}</span>
          </span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>
      )}

      {/* Filter Chips - Strict Radius + Sort */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 mr-1">
          <ICONS.Filter className="w-3 h-3" /> Filters
        </div>
        
        {/* Radius Filter */}
        {filters_applied?.radius_km && (
          <button className="shrink-0 text-[10px] font-bold bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-200">
             {`< ${filters_applied.radius_km} km`}
          </button>
        )}
        
        {/* Sort Filter */}
        {filters_applied?.sort && (
          <button className="shrink-0 text-[10px] font-bold bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 text-blue-300 capitalize">
            {filters_applied.sort.replace('_', ' ')}
          </button>
        )}
      </div>

      {/* Broadcast Action Area (Batch) */}
      {broadcastCandidates.length > 0 && !broadcastResult && (
         <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 mb-2 relative overflow-hidden">
            <div className="flex flex-col gap-2 relative z-10">
               <h3 className="font-bold text-emerald-100 flex items-center gap-2">
                 <ICONS.Broadcast className="w-5 h-5 text-emerald-400" />
                 Mass Inquiry
               </h3>
               <p className="text-xs text-slate-300 leading-relaxed">
                 Or ask all {broadcastCandidates.length} businesses at once?
               </p>
               <Button 
                 variant="primary" 
                 onClick={handleBroadcast}
                 disabled={broadcasting}
                 className="mt-2 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 h-10 text-xs"
                 icon={broadcasting ? <span className="animate-spin text-xl">⟳</span> : <ICONS.WhatsApp className="w-4 h-4" />}
               >
                 {broadcasting ? 'Processing Request...' : `Ask All ${broadcastCandidates.length}`}
               </Button>
            </div>
         </div>
      )}

      {/* Broadcast Result Feedback */}
      {broadcastResult && (
         <div className={`p-4 rounded-xl border mb-2 text-sm ${broadcastResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border-red-500/20 text-red-200'} animate-in zoom-in`}>
            <div className="font-bold flex items-center gap-2 mb-1">
               {broadcastResult.success ? <ICONS.Check className="w-5 h-5" /> : <ICONS.XMark className="w-5 h-5" />}
               {broadcastResult.success ? 'Broadcast Sent!' : 'Broadcast Failed'}
            </div>
            <p className="opacity-90 text-xs leading-relaxed">
               {broadcastResult.message || `I've contacted ${broadcastResult.count} nearby businesses. They will reply directly to your WhatsApp number if they have what you need.`}
            </p>
         </div>
      )}

      {/* Cards Stack (Vertical in Chat) */}
      <div className="space-y-3">
        {visibleResults.map((biz, idx) => (
          <div key={biz.id} className="animate-in slide-in-from-bottom-2 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}>
            <BusinessCardWidget 
               biz={biz} 
               compact={false} 
               contextNeed={need_description}
               contextLocation={user_location_label}
            />
          </div>
        ))}
      </div>

      {/* Show More (Local Expansion) */}
      {matches.length > 3 && !showAll && (
        <button 
          onClick={() => setShowAll(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
        >
           Show {hiddenCount} more in this list <ICONS.ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Collapse (Local) */}
      {showAll && matches.length > 3 && !pagination?.has_more && (
         <button 
           onClick={() => setShowAll(false)}
           className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-all"
         >
           Show Less <ICONS.ChevronUp className="w-4 h-4" />
         </button>
      )}

      {/* Pagination: Load Next 20 */}
      {pagination?.has_more && showAll && (
        <button 
          onClick={() => onLoadMore?.(pagination.next_page || (pagination.page + 1))}
          className="w-full py-4 mt-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
           Show 20 more results
        </button>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div className="text-[10px] text-center text-slate-600 pt-2 pb-1 leading-tight">
          {disclaimer}
        </div>
      )}
    </div>
  );
};

export default BusinessResultsMessage;
