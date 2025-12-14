
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../services/supabase';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { ALL_COUNTRIES, CountryData } from '../data/allCountries';
import { normalizePhoneNumber } from '../utils/phone';
import AddressBook from '../components/Address/AddressBook';
import { MemoryService } from '../services/memory';
import { AgentMemory } from '../types';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  
  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('passenger');
  const [bio, setBio] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  
  // Phone State
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(ALL_COUNTRIES.find(c => c.code === 'rw') || ALL_COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  
  // Country Picker State
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Memory State
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [showMemory, setShowMemory] = useState(false);

  const parsePhone = (fullPhone: string) => {
    if (!fullPhone) return { country: ALL_COUNTRIES.find(c => c.code === 'rw')!, local: '' };
    const match = ALL_COUNTRIES.slice().sort((a, b) => b.dial_code.length - a.dial_code.length)
        .find(c => fullPhone.startsWith(c.dial_code));
    if (match) {
        return { country: match, local: fullPhone.slice(match.dial_code.length) };
    }
    return { country: ALL_COUNTRIES.find(c => c.code === 'rw')!, local: fullPhone };
  };

  useEffect(() => {
    loadProfile();
    // Load Memories
    setMemories(MemoryService.getLocalMemories());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setDisplayName(data.display_name || '');
        setRole(data.role || 'passenger');
        setBio(data.bio || '');
        setVehiclePlate(data.vehicle_plate || '');
        if (data.whatsapp_consent !== undefined) {
            setNotificationEnabled(data.whatsapp_consent);
        }
        const { country, local } = parsePhone(data.phone || '');
        setSelectedCountry(country);
        setLocalPhone(local);
      } else {
        const localP = localStorage.getItem('easyMO_user_phone') || '';
        const { country, local } = parsePhone(localP);
        setSelectedCountry(country);
        setLocalPhone(local);
        setDisplayName(`Guest ${user.id.slice(0,4)}`);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const rawFullPhone = `${selectedCountry.dial_code}${localPhone}`;
      const defaultCode = selectedCountry.dial_code.replace('+', '');
      const normalizedPhone = normalizePhoneNumber(rawFullPhone, defaultCode);

      if (!normalizedPhone) {
        alert("Please enter a valid phone number.");
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName,
        phone: normalizedPhone,
        role: role,
        bio: bio,
        vehicle_plate: role === 'driver' ? vehiclePlate.toUpperCase() : null,
        whatsapp_consent: notificationEnabled,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error("Error saving profile:", error);
      }
      localStorage.setItem('easyMO_user_phone', normalizedPhone);
    }
    setLoading(false);
    onBack();
  };

  const handleDeleteMemory = (id: string) => {
    MemoryService.forgetMemory(id);
    setMemories(MemoryService.getLocalMemories());
  };

  const handleWipeMemory = () => {
    if (confirm("Are you sure? The AI will forget everything it learned about you.")) {
        MemoryService.wipeMemory();
        setMemories([]);
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out? This will clear your session.")) {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.reload();
    }
  };

  const renderCountryModal = () => {
    if (!showCountryModal) return null;
    const filtered = ALL_COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.dial_code.includes(countrySearch)
    );

    return (
        <>
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

          <div className="frame-fixed top-0 bottom-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-slate-900 border border-white/10 w-full max-w-[420px] max-h-[80vh] rounded-3xl flex flex-col shadow-2xl pointer-events-auto">
              <div className="p-4 border-b border-white/5 flex gap-2 items-center">
                <ICONS.Search className="w-5 h-5 text-slate-500" />
                <input 
                  className="bg-transparent w-full outline-none text-white placeholder-slate-500 font-bold"
                  placeholder="Search country or code..."
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  autoFocus
                />
                <button onClick={() => setShowCountryModal(false)} className="p-2 bg-white/10 rounded-full">
                  <ICONS.XMark className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="overflow-y-auto p-2 space-y-1">
                {filtered.map(c => (
                  <button 
                    key={c.code}
                    onClick={() => {
                      setSelectedCountry(c);
                      setShowCountryModal(false);
                      setCountrySearch('');
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.dial_code}</div>
                    </div>
                    {selectedCountry.code === c.code && <ICONS.Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
    );
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-slate-50 dark:bg-[#0f172a] overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-300">
      {renderCountryModal()}
      
      {/* Header */}
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/95 sticky top-0 z-20 backdrop-blur-xl">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
           <ICONS.ChevronDown className="w-6 h-6 rotate-90" />
        </button>
        <div className="font-bold text-lg text-slate-900 dark:text-white">Profile & Settings</div>
        <div className="w-8" />
      </div>

      <div className="p-6 pb-32 max-w-lg mx-auto w-full space-y-8">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
           <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue-500/20 mb-4 ring-4 ring-white dark:ring-white/10 relative">
              {displayName?.[0]?.toUpperCase() || <ICONS.User className="w-12 h-12" />}
              <button className="absolute bottom-0 right-0 p-2 bg-slate-800 rounded-full border border-white/20 text-white hover:scale-110 transition-transform shadow-lg">
                <ICONS.Camera className="w-4 h-4" />
              </button>
           </div>
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {role === 'driver' ? 'Driver Account' : (role === 'vendor' ? 'Business Account' : 'Passenger Account')}
           </p>
        </div>

        {/* Form Section */}
        <div className="space-y-5">
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                  placeholder="Your Name"
                />
                <ICONS.User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</label>
              <div className="flex gap-2">
                <button 
                    onClick={() => setShowCountryModal(true)}
                    className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-4 text-slate-900 dark:text-white font-bold transition-colors hover:bg-slate-50 dark:hover:bg-white/10 shrink-0"
                >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="text-sm">{selectedCountry.dial_code}</span>
                    <ICONS.ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="relative flex-1">
                    <input 
                        type="tel" 
                        value={localPhone}
                        onChange={e => setLocalPhone(e.target.value.replace(/\D/g,''))}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm font-mono tracking-wide"
                        placeholder="788 123 456"
                    />
                </div>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Account Type</label>
              <div className="relative">
                <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none shadow-sm"
                >
                    <option value="passenger">Passenger</option>
                    <option value="driver">Driver</option>
                    <option value="vendor">Business Vendor</option>
                </select>
                <ICONS.Briefcase className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ICONS.ChevronDown className="w-4 h-4" />
                </div>
              </div>
           </div>

           {role === 'driver' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <ICONS.Car className="w-3 h-3" /> Vehicle Plate
                 </label>
                 <div className="relative">
                   <input 
                     type="text" 
                     value={vehiclePlate}
                     onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                     className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-center font-black text-xl text-yellow-500 focus:outline-none focus:border-yellow-500/50 placeholder-slate-700 uppercase tracking-widest font-mono"
                     placeholder="RAA 123 A"
                   />
                 </div>
              </div>
           )}

           <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <AddressBook />
           </div>

        </div>

        {/* AI Memory Control */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
           <h3 className="text-sm font-bold text-slate-900 dark:text-white px-1 flex items-center justify-between">
              <span>Agent Memory</span>
              <span className="text-[10px] text-slate-400 font-normal">{memories.length} facts learned</span>
           </h3>
           
           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                        <ICONS.Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">Long-Term Recall</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Agent remembers your preferences</div>
                    </div>
                 </div>
                 <button 
                   onClick={() => setShowMemory(!showMemory)}
                   className="text-xs font-bold text-blue-500 hover:text-blue-400"
                 >
                   {showMemory ? 'Hide' : 'View'}
                 </button>
              </div>

              {showMemory && (
                 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-2 animate-in slide-in-from-top-2">
                    {memories.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">No memories yet. Chat more!</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                            {memories.map(m => (
                                <div key={m.id} className="flex justify-between items-start text-xs bg-slate-50 dark:bg-black/20 p-2 rounded-lg">
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">{m.category}</span>
                                        <span className="text-slate-700 dark:text-slate-300">{m.content}</span>
                                    </div>
                                    <button onClick={() => handleDeleteMemory(m.id)} className="text-slate-400 hover:text-red-500 p-1">
                                        <ICONS.XMark className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {memories.length > 0 && (
                        <button onClick={handleWipeMemory} className="w-full text-center text-[10px] text-red-500 hover:text-red-400 font-bold mt-2 pt-2">
                            Delete All Memory
                        </button>
                    )}
                 </div>
              )}
           </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
           <h3 className="text-sm font-bold text-slate-900 dark:text-white px-1">App Settings</h3>
           
           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-600 dark:text-slate-300">
                    {theme === 'dark' ? <ICONS.Moon className="w-5 h-5" /> : <ICONS.Sun className="w-5 h-5" />}
                 </div>
                 <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Dark Mode</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Adjust app appearance</div>
                 </div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                 <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
           </div>
        </div>

        {/* Actions */}
        <div className="pt-6 space-y-4">
           <Button 
             variant="primary" 
             fullWidth 
             onClick={handleSave}
             disabled={loading}
             className="h-14 text-sm font-bold shadow-xl shadow-blue-500/20"
             icon={loading ? <span className="animate-spin text-lg">⟳</span> : <ICONS.Check className="w-5 h-5" />}
           >
             {loading ? 'Saving Changes...' : 'Save Profile'}
           </Button>

           <button 
             onClick={handleSignOut}
             className="w-full py-4 text-xs font-bold text-red-500 hover:text-red-400 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-2xl border border-red-500/10"
           >
             Sign Out
           </button>
           
           <div className="text-center text-[10px] text-slate-400 pt-4">
              v2.2.0-memory • {selectedCountry.dial_code}{localPhone || 'Anonymous'}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
