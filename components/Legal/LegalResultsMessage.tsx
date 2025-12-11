
import React, { useState } from 'react';
import { ICONS } from '../../constants';
import { LegalResultsPayload } from '../../types';
import BusinessCardWidget from '../Business/BusinessCardWidget'; // Reuse BusinessCard for now as structure is compatible

interface LegalResultsMessageProps {
  payload: LegalResultsPayload;
  onLoadMore?: (page: number) => void;
}

const LegalResultsMessage: React.FC<LegalResultsMessageProps> = ({ payload, onLoadMore }) => {
  const [showAll, setShowAll] = useState(false);
  const { matches, disclaimer, pagination, query_summary } = payload;
  
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

      {/* Cards Stack */}
      <div className="space-y-3">
        {visibleResults.map((item, idx) => (
          <div key={item.id} className="animate-in slide-in-from-bottom-2 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}>
            {/* Reuse BusinessCardWidget since properties align nicely for Notaries/Lawyers */}
            <BusinessCardWidget biz={item as any} compact={false} />
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

      {/* Collapse */}
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

      {/* Disclaimer */}
      {disclaimer && (
        <div className="text-[10px] text-center text-slate-600 pt-2 pb-1 leading-tight">
          {disclaimer}
        </div>
      )}
    </div>
  );
};

export default LegalResultsMessage;
