
import React, { useState } from 'react';
import { ICONS } from '../../constants';
import { PropertyResultsPayload } from '../../types';
import PropertyCardWidget from './PropertyCardWidget';

interface PropertyResultsMessageProps {
  payload: PropertyResultsPayload;
  onLoadMore?: (page: number) => void;
}

const PropertyResultsMessage: React.FC<PropertyResultsMessageProps> = ({ payload, onLoadMore }) => {
  const [showAll, setShowAll] = useState(false);
  const { matches, filters_applied, disclaimer, pagination, query_summary, market_insight, next_steps } = payload;
  
  const visibleCount = showAll ? matches.length : 3;
  const visibleResults = matches.slice(0, visibleCount);
  const hiddenCount = matches.length - visibleCount;

  if (!matches || matches.length === 0) return null;

  return (
    <div className="w-full mt-2 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary */}
      {query_summary && (
        <div className="px-1 text-xs text-slate-400 font-medium italic">
          {query_summary}
        </div>
      )}

      {market_insight && (
        <div className="px-1 text-xs text-slate-300 leading-relaxed">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-2">Market</span>
          {market_insight}
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 mr-1">
          <ICONS.Filter className="w-3 h-3" /> Filters
        </div>
        
        {filters_applied?.listing_type !== 'unknown' && (
          <button className="shrink-0 text-[10px] font-bold bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-200 capitalize">
             {filters_applied.listing_type}
          </button>
        )}
        
        {filters_applied?.property_type && filters_applied.property_type !== 'unknown' && (
          <button className="shrink-0 text-[10px] font-bold bg-white/10 border border-white/10 rounded-full px-3 py-1 text-slate-200">
             {filters_applied.property_type}
          </button>
        )}

        {typeof filters_applied?.bedrooms === 'number' && filters_applied.bedrooms > 0 && (
          <button className="shrink-0 text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 rounded-full px-3 py-1 text-emerald-300">
            {`${filters_applied.bedrooms} BR`}
          </button>
        )}

        {filters_applied?.radius_km && (
          <button className="shrink-0 text-[10px] font-bold bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 text-blue-300">
             {`< ${filters_applied.radius_km} km`}
          </button>
        )}
      </div>

      {/* Cards Stack */}
      <div className="space-y-3">
        {visibleResults.map((prop, idx) => (
          <div key={prop.id} className="animate-in slide-in-from-bottom-2 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}>
            <PropertyCardWidget property={prop} />
          </div>
        ))}
      </div>

      {/* Show More (Local Expansion) */}
      {matches.length > 3 && !showAll && (
        <button 
          onClick={() => setShowAll(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
        >
           Show {hiddenCount} more <ICONS.ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Collapse (Always allow collapsing for better UX) */}
      {showAll && matches.length > 3 && (
         <button 
           onClick={() => setShowAll(false)}
           className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-all"
         >
           Show Less <ICONS.ChevronUp className="w-4 h-4" />
         </button>
      )}

      {/* Pagination (Load Next Page) */}
      {pagination?.has_more && showAll && (
        <button 
          onClick={() => onLoadMore?.(pagination.next_page || (pagination.page + 1))}
          className="w-full py-4 mt-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
           <ICONS.PlusCircle className="w-5 h-5" />
           Show {pagination.page_size || 20} more results
        </button>
      )}

      {/* Next Steps */}
      {next_steps && next_steps.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Next Steps</div>
          <div className="space-y-1">
            {next_steps.slice(0, 4).map((step, idx) => (
              <div key={idx} className="text-xs text-slate-300 leading-relaxed">
                • {step}
              </div>
            ))}
          </div>
        </div>
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

export default PropertyResultsMessage;
