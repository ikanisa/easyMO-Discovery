import React from 'react';
import { ICONS } from '../constants';

interface SupportProps {
  onStartChat: () => void;
}

const Support: React.FC<SupportProps> = ({ onStartChat }) => {
  return (
    <div className="px-4 pt-20 flex flex-col h-full">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
          <ICONS.Support className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">How can we help?</h1>
        <p className="text-slate-400 max-w-xs mx-auto">
          Our smart support assistant can help with common questions immediately.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto w-full">
        <div 
          onClick={onStartChat}
          className="glass-panel p-5 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-white/10"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
            <ICONS.Chat className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Chat with Support</h3>
            <p className="text-xs text-slate-400">Instant answers, 24/7</p>
          </div>
          <ICONS.Check className="w-5 h-5 text-slate-500" />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0f172a] px-2 text-slate-500">Or escalation</span>
          </div>
        </div>

        <a 
          href="mailto:info@ikanisa.com"
          className="glass-panel p-5 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-white/10 border-emerald-500/30"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            {/* Established support email while WhatsApp recovery is unresolved. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="w-5 h-5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Email IKANISA Support</h3>
            <p className="text-xs text-slate-400">info@ikanisa.com</p>
          </div>
        </a>
      </div>
    </div>
  );
};

export default Support;