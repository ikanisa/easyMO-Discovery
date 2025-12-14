
import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';
import { AppMode } from '../types';
import { supabase } from '../services/supabase';
import { getBroadcastHistory } from '../services/whatsapp';

interface ServicesProps {
  onStartChat: (type?: 'support' | 'legal') => void;
  onNavigate: (mode: AppMode) => void;
}

const Services: React.FC<ServicesProps> = ({ onStartChat, onNavigate }) => {
  const [profile, setProfile] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Profile
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try DB first
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
        } else {
          // Fallback to local
          const phone = localStorage.getItem('easyMO_user_phone');
          setProfile({
             display_name: `Guest ${user.id.slice(0, 4)}`,
             phone: phone || 'Unknown',
             role: 'User'
          });
        }
      }
    };
    fetchProfile();

    // 2. Fetch Broadcast History
    const loadHistory = () => {
       const history = getBroadcastHistory();
       setBroadcasts(history);
    };
    loadHistory();

    // Listen for updates
    window.addEventListener('broadcast_history_updated', loadHistory);
    return () => window.removeEventListener('broadcast_history_updated', loadHistory);
  }, []);

  return (
    <div className="px-4 pt-16 flex flex-col min-h-full animate-in fade-in zoom-in duration-300">
      
      {/* Profile Header - Clickable for Settings */}
      <div className="mb-8 cursor-pointer group" onClick={() => onNavigate(AppMode.SETTINGS)}>
         <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden border border-white/10 shadow-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 group-hover:bg-slate-800/60 transition-colors">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
               {/* Avatar */}
               <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-blue-500/30">
                  {profile?.display_name ? profile.display_name[0].toUpperCase() : <ICONS.User className="w-6 h-6" />}
               </div>
               
               {/* Info */}
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-white truncate">{profile?.display_name || 'Loading...'}</h2>
                     <div className="p-1.5 bg-white/5 rounded-full text-slate-400 group-hover:text-white transition-colors border border-white/5">
                        <ICONS.ChevronDown className="w-4 h-4 -rotate-90" />
                     </div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mb-1">{profile?.phone}</div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold uppercase tracking-wider border border-white/5">
                        {profile?.role || 'Passenger'}
                     </span>
                  </div>
               </div>
            </div>
         </div>
         <div className="text-[10px] text-center text-slate-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Tap to edit profile & settings
         </div>
      </div>

      {/* WhatsApp Broadcasts History */}
      {broadcasts.length > 0 && (
        <div className="mb-8">
           <div className="flex justify-between items-end mb-3 px-1">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Broadcasts</h2>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                 {broadcasts.length} Active
              </span>
           </div>
           
           <div className="space-y-3">
              {broadcasts.map((req, idx) => (
                 <div key={req.requestId || idx} className="glass-panel p-3 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors border border-emerald-500/10">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                             <ICONS.Broadcast className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-200">
                             Looking for "{req.needDescription}"
                          </span>
                       </div>
                       <span className="text-[10px] text-slate-500">
                          {req.timestamp ? new Date(req.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                       </span>
                    </div>
                    
                    <div className="pl-9 text-[10px] text-slate-400 flex items-center gap-2">
                       <ICONS.MapPin className="w-3 h-3 text-slate-600" />
                       {req.userLocationLabel}
                       <span className="w-1 h-1 bg-slate-600 rounded-full" />
                       <span className="text-blue-400">{req.businesses?.length || 0} Businesses</span> contacted
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Services Section */}
      <div className="flex-1 space-y-6 max-w-md mx-auto w-full pb-24">
        
        {/* Section 1: Professional Services */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Legal & Admin</h2>
          
          <div className="space-y-3">
            {/* Notary Services AI - Explicitly Drafting */}
            <button 
              onClick={() => onStartChat('legal')}
              className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 active:scale-[0.98] transition-all group border-amber-500/20"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <ICONS.Clipboard className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold">Notary AI (Gatera)</div>
                <div className="text-xs text-slate-400 mt-0.5">Generate Contracts & Letters</div>
              </div>
              <div className="px-2 py-1 bg-amber-500/10 rounded text-[10px] font-bold text-amber-400 border border-amber-500/20">
                 AI
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
             <span>Version 2.2.1-drafter-fix</span>
             <span>Terms & Privacy</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Services;
