
import React from 'react';
import { ICONS } from '../constants';
import { AppMode } from '../types';

interface ServicesProps {
  onStartChat: (type?: 'support' | 'legal') => void;
  onNavigate: (mode: AppMode) => void;
}

const Services: React.FC<ServicesProps> = ({ onStartChat, onNavigate }) => {
  return (
    <div className="px-4 pt-16 flex flex-col min-h-full animate-in fade-in zoom-in duration-300">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Services</h1>
        <p className="text-slate-400 text-sm">Professional Tools & Assistance</p>
      </div>

      <div className="flex-1 space-y-6 max-w-md mx-auto w-full pb-24">
        
        {/* Section 1: Professional Services */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Professional Services</h2>
          
          <div className="space-y-3">
            {/* Notary Services AI */}
            <button 
              onClick={() => onStartChat('legal')}
              className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 active:scale-[0.98] transition-all group border-amber-500/20"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <ICONS.Scale className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold">Notary Services AI</div>
                <div className="text-xs text-slate-400 mt-0.5">Draft contracts & documents</div>
              </div>
              <div className="px-2 py-1 bg-amber-500/10 rounded text-[10px] font-bold text-amber-400 border border-amber-500/20">
                 NEW
              </div>
            </button>

            {/* Insurance - WhatsApp Deep Link */}
            <a 
              href="https://wa.me/250795588248?text=Hello,%20I%20would%20like%20to%20inquire%20about%20insurance%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 active:scale-[0.98] transition-all group border-indigo-500/20"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <ICONS.ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold">Insurance</div>
                <div className="text-xs text-slate-400 mt-0.5">Get quotes & coverage</div>
              </div>
              <div className="px-2 py-1 bg-indigo-500/10 rounded text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                 RW
              </div>
            </a>
          </div>
        </div>

        {/* Section 2: Human Contact */}
        <div>
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Human Contact</h2>
           <a 
            href="https://wa.me/250796884076?text=Hello,%20I%20need%20assistance%20with%20easyMO." 
            target="_blank"
            rel="noopener noreferrer"
            className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 active:scale-[0.98] transition-all group border-emerald-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <ICONS.WhatsApp className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold">Customer Support</div>
              <div className="text-xs text-slate-400 mt-0.5">Chat with a human agent</div>
            </div>
            <ICONS.ChevronDown className="w-5 h-5 text-slate-500 -rotate-90" />
          </a>
        </div>
        
         {/* Footer */}
        <div>
           <div className="glass-panel p-4 rounded-2xl flex items-center justify-between text-xs text-slate-400">
             <span>Version 1.4.0</span>
             <span>Terms & Privacy</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Services;
