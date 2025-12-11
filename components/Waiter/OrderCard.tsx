
import React, { useState } from 'react';
import { Order } from '../../types';
import { ICONS } from '../../constants';
import Button from '../Button';

interface OrderCardProps {
  order: Order;
  onSeen: (id: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onSeen }) => {
  const [isSeen, setIsSeen] = useState(order.status === 'seen');

  const handleSeen = () => {
    setIsSeen(true);
    onSeen(order.id);
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return 'Just now';
    return `${diff}m ago`;
  };

  return (
    <div className={`
      relative rounded-xl border p-4 transition-all duration-300
      ${isSeen ? 'bg-slate-800/40 border-slate-700 opacity-80' : 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10'}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-slate-200">
              {order.tableLabel || 'No Table'}
            </span>
            {!isSeen && (
              <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                NEW
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <ICONS.Clock className="w-3 h-3" />
            {timeAgo(order.createdAt)}
            <span className="opacity-50">#{order.id.slice(-4)}</span>
          </div>
        </div>
        
        {!isSeen && (
           <Button 
             variant="primary" 
             className="!py-1.5 !px-3 !text-xs !rounded-lg" 
             onClick={handleSeen}
             icon={<ICONS.Check className="w-4 h-4" />}
           >
             Seen
           </Button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
             <div className="flex gap-3">
               <span className="bg-slate-700/50 text-slate-200 font-bold px-2 rounded h-fit text-sm">
                 {item.qty}
               </span>
               <div>
                 <div className="text-sm font-medium text-slate-200">{item.name}</div>
                 {item.notes && <div className="text-xs text-red-300 italic">{item.notes}</div>}
               </div>
             </div>
             <div className="text-xs font-mono text-slate-500 mt-1">
               {item.price * item.qty}
             </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-3">
          <p className="text-xs text-yellow-200 font-medium">⚠️ {order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-slate-500 border-t border-white/10 pt-2">
        <span>Total Estimate</span>
        <span className="font-bold text-slate-300 text-sm">
          {order.total.toLocaleString()} {order.currency}
        </span>
      </div>
    </div>
  );
};

export default OrderCard;
