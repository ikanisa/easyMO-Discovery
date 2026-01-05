/**
 * ChatHome - AI-First Home Screen
 * Replaces widget grid with chat composer + smart chips
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '../../constants';
import { Role } from '../../types';
import { hapticFeedback } from '../../utils/ui';

interface ChatHomeProps {
  onStartChat: (type: 'mobility' | 'marketplace' | 'payments' | 'support', query?: string) => void;
  onNavigate: (mode: string) => void;
  currentRole?: Role | null;
  onRoleChange?: (role: Role | null) => void;
}

const QUICK_ACTIONS = [
  {
    id: 'find-ride',
    label: 'Find Ride',
    icon: ICONS.Bike,
    gradient: 'from-indigo-500 to-blue-500',
    type: 'mobility' as const,
    query: 'I need a ride',
  },
  {
    id: 'driver-online',
    label: 'I\'m a Driver',
    icon: ICONS.Car,
    gradient: 'from-pink-500 to-rose-500',
    type: 'mobility' as const,
    query: 'I\'m a driver, I\'m available',
  },
  {
    id: 'find-business',
    label: 'Find Business',
    icon: ICONS.Store,
    gradient: 'from-emerald-500 to-teal-400',
    type: 'marketplace' as const,
    query: 'Find nearby businesses',
  },
  {
    id: 'momo-qr',
    label: 'MoMo QR',
    icon: ICONS.QrCode,
    gradient: 'from-orange-500 to-amber-500',
    type: 'payments' as const,
    query: 'Generate MoMo QR code',
  },
  {
    id: 'scan-qr',
    label: 'Scan QR',
    icon: ICONS.Scan,
    gradient: 'from-purple-500 to-pink-500',
    type: 'payments' as const,
    query: 'Scan QR code',
  },
];

const ChatHome: React.FC<ChatHomeProps> = ({
  onStartChat,
  onNavigate,
  currentRole,
  onRoleChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    
    hapticFeedback('medium');
    // Router agent will determine the right agent type
    onStartChat('support', inputValue.trim());
    setInputValue('');
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    hapticFeedback('light');
    onStartChat(action.type, action.query);
  };

  const handleRoleToggle = () => {
    hapticFeedback('light');
    if (currentRole === 'passenger') {
      onRoleChange?.('driver');
    } else if (currentRole === 'driver') {
      onRoleChange?.(null);
    } else {
      onRoleChange?.('passenger');
    }
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto no-scrollbar pb-24 relative bg-slate-50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="relative pt-12 pb-6 px-6 shrink-0">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-purple-600 mb-2">
            easyMO
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide">
            Your AI-Powered Companion
          </p>
        </div>

        {/* Role Toggle Pill */}
        {currentRole && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleRoleToggle}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/15 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {currentRole === 'passenger' ? 'Passenger Mode' : 'Driver Mode'}
              <ICONS.ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="relative group w-full max-w-2xl mx-auto">
          <div
            className={`
              relative w-full bg-white dark:bg-white/5 border rounded-3xl transition-all duration-200
              ${isFocused 
                ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20' 
                : 'border-slate-200 dark:border-white/10 shadow-xl'
              }
            `}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask me anything... Find rides, businesses, generate QR codes..."
              inputMode="text"
              enterKeyHint="send"
              className="w-full bg-transparent rounded-3xl pl-6 pr-14 py-4.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="absolute right-2 top-2 p-2.5 bg-blue-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            >
              <ICONS.Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Quick Actions (Smart Chips) */}
      <div className="px-6 pb-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action, idx) => (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction(action)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  group relative flex items-center gap-2 px-4 py-2.5 rounded-full
                  bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10
                  hover:border-blue-300 dark:hover:border-blue-400
                  transition-all shadow-sm hover:shadow-md
                `}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.gradient} text-white`}>
                  <action.icon className="w-3 h-3" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Legacy Access (Hidden but accessible) */}
      <div className="px-6 pb-6 max-w-2xl mx-auto">
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-500">More Options</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('discovery')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 text-xs"
            >
              Discovery
            </button>
            <button
              onClick={() => onNavigate('business')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 text-xs"
            >
              Business
            </button>
            <button
              onClick={() => onNavigate('services')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 text-xs"
            >
              Services
            </button>
            <button
              onClick={() => onNavigate('momo_generator')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 text-xs"
            >
              MoMo Generator
            </button>
            <button
              onClick={() => onNavigate('scanner')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 text-xs"
            >
              QR Scanner
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ChatHome;

