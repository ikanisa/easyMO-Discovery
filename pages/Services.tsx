
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

  const isRwanda = profile?.phone?.startsWith('+250');

  return (
    <div className="px-4 pt-16 flex flex-col min-h-full animate-in fade-in zoom-in duration-300">
      
      {/* Profile Header - Clickable for Settings */}
      <div className="mb-8 cursor-pointer group" onClick={() => onNavigate(AppMode.SETTINGS)}>
         <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden border border-white/10 shadow-xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 dark:from-slate-900/50 dark:to-slate-800/50 group-hover:scale-[1.02] transition-transform">
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
                     <div className="p-1.5 bg-white/10 rounded-full text-slate-300 group-hover:text-white transition-colors border border-white/5">
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
         <div className="text-[10px] text-center text-slate-500 dark:text-slate-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Tap to edit profile & settings
         </div>
      </div>

      {/* WhatsApp Broadcasts History */}
      {broadcasts.length > 0 && (
        <div className="mb-8">
           <div className="flex justify-between items-end mb-3 px-1">
              <h2 className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">Recent Broadcasts</h2>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                 {broadcasts.length} Active
              </span>
           </div>
           
           <div className="space-y-3">
              {broadcasts.map((req, idx) => (
                 <div key={req.requestId || idx} className="glass-panel p-3 rounded-2xl flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-emerald-500/10 bg-white dark:bg-white/5 shadow-sm">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                             <ICONS.Broadcast className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                             Looking for "{req.needDescription}"
                          </span>
                       </div>
                       <span className="text-[10px] text-slate-500">
                          {req.timestamp ? new Date(req.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                       </span>
                    </div>
                    
                    <div className="pl-9 text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
                       <ICONS.MapPin className="w-3 h-3 text-slate-600 dark:text-slate-500" />
                       {req.userLocationLabel}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Quick Actions / Services */}
      <div className="pl-6 pb-8">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pr-6 flex items-center gap-2">
           Services
        </h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pr-6 pb-4">
           {/* Quick Action 1: Notary - Updated Label - RWANDA ONLY */}
           {isRwanda && (
             <button 
                onClick={() => onStartChat('legal')}
                className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
             >
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                   <ICONS.Scale className="w-4 h-4" />
                </div>
                <div className="text-left">
                   <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Legal Advisor</div>
                   <div className="text-[10px] text-slate-500 font-medium">Research & Draft</div>
                </div>
             </button>
           )}

           {/* Quick Action 2: Insurance - RWANDA ONLY */}
           {isRwanda && (
             <button 
                onClick={() => window.open('https://wa.me/250795588248?text=Hello,%20I%20would%20like%20to%20inquire%20about%20insurance%20services.', '_blank')}
                className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
                style={{ animationDelay: '100ms' }}
             >
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                   <ICONS.ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                   <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Insurance</div>
                   <div className="text-[10px] text-slate-500 font-medium">Get Covered</div>
                </div>
             </button>
           )}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="mb-8">
         <h2 className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest mb-4 px-1">Utilities</h2>
         <div className="grid grid-cols-2 gap-4">
            <button 
               onClick={() => onNavigate(AppMode.MOMO_GENERATOR)}
               className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-slate-200 dark:border-white/5 shadow-sm"
            >
               <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <ICONS.QrCode className="w-5 h-5" />
               </div>
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200">MoMo QR</span>
            </button>

            <button 
               onClick={() => onNavigate(AppMode.SCANNER)}
               className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-slate-200 dark:border-white/5 shadow-sm"
            >
               <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ICONS.Scan className="w-5 h-5" />
               </div>
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Scanner</span>
            </button>
         </div>
      </div>

      {/* Agents List */}
      <div>
         <h2 className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest mb-4 px-1">AI Agents</h2>
         <div className="space-y-3">
            {/* Gatera (Legal AI) - RWANDA ONLY */}
            {isRwanda && (
              <button 
                 onClick={() => onStartChat('legal')}
                 className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-slate-200 dark:border-white/5 shadow-sm"
              >
                 <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <ICONS.Scale className="w-5 h-5" />
                 </div>
                 <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Gatera (Legal AI)</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Contracts & Legal Advice</div>
                 </div>
                 <ICONS.ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" />
              </button>
            )}
            
            <button 
               onClick={() => onNavigate(AppMode.ONBOARDING)}
               className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-slate-200 dark:border-white/5 shadow-sm"
            >
               <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ICONS.Store className="w-5 h-5" />
               </div>
               <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Become a Partner</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Register Business or Driver</div>
               </div>
               <ICONS.ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" />
            </button>
         </div>
      </div>

    </div>
  );
};

export default Services;
