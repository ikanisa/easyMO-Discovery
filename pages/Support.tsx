import React from 'react';
import Button from '../components/Button';
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
          Our AI support agent can help with common questions immediately.
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
            <h3 className="font-semibold text-lg">Chat with Support AI</h3>
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
          href="https://wa.me/1234567890" // Replace with real number
          target="_blank"
          rel="noopener noreferrer"
          className="glass-panel p-5 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-white/10 border-emerald-500/30"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            {/* Simple WhatsApp-like icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">WhatsApp Admin</h3>
            <p className="text-xs text-slate-400">For complex issues</p>
          </div>
        </a>
      </div>
    </div>
  );
};

export default Support;
