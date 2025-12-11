
import React from 'react';
import { Order } from '../../types';
import { ICONS } from '../../constants';

interface OrderSummaryBubbleProps {
  order: Order;
}

const OrderSummaryBubble: React.FC<OrderSummaryBubbleProps> = ({ order }) => {
  return (
    <div className="bg-slate-800 rounded-2xl border border-emerald-500/30 overflow-hidden w-full max-w-sm mt-2 shadow-lg shadow-black/40">
      <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/10 flex justify-between items-center">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ICONS.Check className="w-5 h-5" />
          <span>Order Sent</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">#{order.id.slice(-4)}</span>
      </div>
      
      <div className="p-4 space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-start text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-slate-200">{item.qty}x</span>
              <span className="text-slate-300">{item.name}</span>
              {item.notes && <span className="text-xs text-slate-500 italic">({item.notes})</span>}
            </div>
            <div className="font-mono text-slate-400">
              {(item.price * item.qty).toLocaleString()} {order.currency}
            </div>
          </div>
        ))}

        <div className="border-t border-white/10 pt-3 flex justify-between items-center font-bold">
          <span className="text-slate-400">Total Estimate</span>
          <span className="text-emerald-400 text-lg">
            {order.total.toLocaleString()} {order.currency}
          </span>
        </div>
      </div>

      <div className="p-2 bg-black/20 text-center">
         <p className="text-[10px] text-slate-500">
           Sent to Bar Manager • Payment is optional now
         </p>
      </div>
    </div>
  );
};

export default OrderSummaryBubble;
