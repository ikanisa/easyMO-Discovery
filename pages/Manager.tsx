
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { MenuItem, Order } from '../types';
import { WaiterService } from '../services/waiter';
import OrderCard from '../components/Waiter/OrderCard';
import Button from '../components/Button';

interface ManagerProps {
  onBack: () => void;
}

const Manager: React.FC<ManagerProps> = ({ onBack }) => {
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    const m = await WaiterService.getMenu('biz-1');
    const o = await WaiterService.getOrders('biz-1');
    setMenu(m);
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); // Polling for new orders
    return () => clearInterval(interval);
  }, []);

  const handleToggleItem = async (id: string) => {
    await WaiterService.toggleAvailability(id);
    refreshData();
  };

  const handleOrderSeen = async (id: string) => {
    await WaiterService.markOrderSeen(id);
    refreshData();
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] absolute inset-0 z-50 overflow-hidden">
      {/* Header */}
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-white/5 bg-[#0f172a]/95 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white">
           <ICONS.Home className="w-6 h-6" />
        </button>
        <div className="font-bold text-lg">Manager Dashboard</div>
        <div className="w-8" />
      </div>

      {/* Tabs */}
      <div className="p-4 flex gap-4 shrink-0">
        <button 
          onClick={() => setTab('orders')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${tab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400'}`}
        >
          <ICONS.Clipboard className="w-5 h-5" />
          Inbox
        </button>
        <button 
          onClick={() => setTab('menu')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${tab === 'menu' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400'}`}
        >
          <ICONS.Utensils className="w-5 h-5" />
          Menu
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading && orders.length === 0 && menu.length === 0 && (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        )}

        {tab === 'orders' ? (
          <div className="space-y-4">
             {orders.length === 0 ? (
               <div className="text-center py-20 text-slate-500">
                 <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                   <ICONS.Clipboard className="w-8 h-8 opacity-20" />
                 </div>
                 No orders yet
               </div>
             ) : (
               orders.map(order => (
                 <OrderCard key={order.id} order={order} onSeen={handleOrderSeen} />
               ))
             )}
          </div>
        ) : (
          <div className="space-y-2">
            {menu.map(item => (
              <div key={item.id} className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/5">
                <div>
                   <div className="font-bold text-slate-200">{item.name}</div>
                   <div className="text-xs text-slate-400">{item.category} • {item.price} {item.currency}</div>
                </div>
                <button 
                  onClick={() => handleToggleItem(item.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${item.isAvailable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}
                  `}
                >
                  {item.isAvailable ? 'Available' : 'Sold Out'}
                </button>
              </div>
            ))}
            <Button variant="glass" fullWidth icon={<ICONS.Plus className="w-5 h-5" />}>
               Add Menu Item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Manager;
