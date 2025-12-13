
import React, { useState } from 'react';
import { ICONS } from '../constants';
import Button from '../components/Button';
import { ALL_COUNTRIES } from '../data/allCountries';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLoginSuccess: (phone: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('rw'); // default to Rwanda
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === selectedCountryCode) || ALL_COUNTRIES[0];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);

    const cleanLocalPhone = phone.startsWith('0') ? phone.substring(1) : phone;
    const fullPhoneNumber = `${selectedCountry.dial_code}${cleanLocalPhone}`;

    try {
      // 1. Authenticate Anonymously (Supabase)
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) throw error;
      if (!data.user) throw new Error("No user created");

      // 2. Create Profile in DB
      // We upsert the phone number so we can identify them later
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          phone: fullPhoneNumber,
          display_name: `User ${cleanLocalPhone.slice(-4)}`,
          role: 'passenger'
        });

      if (profileError) throw profileError;

      // 3. Success
      localStorage.setItem('easyMO_user_phone', fullPhoneNumber);
      onLoginSuccess(fullPhoneNumber);

    } catch (error: any) {
      console.error("Login Error", error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      const guestId = `Guest-${data.user?.id.slice(0,4)}`;
      localStorage.setItem('easyMO_user_phone', guestId);
      onLoginSuccess(guestId);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center p-6 bg-slate-50 dark:bg-[#0f172a] relative overflow-hidden transition-colors duration-300">
      
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all shadow-lg"
        >
          {theme === 'dark' ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="glass-panel w-full max-w-sm p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl relative z-10 animate-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 mb-2">
            easyMO
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Supabase Powered</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Select Country & Phone
            </label>
            
            <div className="flex gap-2">
              <div className="relative w-[120px] shrink-0">
                <select 
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="w-full appearance-none bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 pl-3 pr-8 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {ALL_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code} className="bg-white dark:bg-slate-900 text-base">
                      {country.flag} {country.dial_code}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ICONS.ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Phone number"
                  className="w-full bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-bold text-lg"
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            variant="primary"
            disabled={loading || !phone}
            className="h-14 text-base shadow-lg shadow-blue-500/20"
            icon={loading ? <span className="animate-spin text-xl">⟳</span> : undefined}
          >
            {loading ? 'Connecting...' : 'Start Now'}
          </Button>
        </form>

        <div className="relative flex py-2 items-center my-6">
            <div className="flex-grow border-t border-black/5 dark:border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-black/5 dark:border-white/10"></div>
        </div>

        <Button
          onClick={handleGuestLogin}
          fullWidth
          variant="glass"
          className="h-12 text-sm text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
        >
          Continue as Guest
        </Button>
      </div>
    </div>
  );
};

export default Login;
