
import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { ICONS } from '../constants';
import { sendCategoryRequest } from '../services/requestLogger';

interface BusinessProps {
  onStartChat: (isDemo: boolean, type?: 'business' | 'real_estate' | 'legal', initialQuery?: string) => void;
}

const Business: React.FC<BusinessProps> = ({ onStartChat }) => {
  const [isRwanda, setIsRwanda] = useState(false);

  useEffect(() => {
    const phone = localStorage.getItem('easyMO_user_phone');
    // Check if phone exists and starts with +250
    setIsRwanda(!!phone && phone.startsWith('+250'));
  }, []);

  const categories = [
    { id: 'restaurant', label: 'Restaurants', icon: <ICONS.Utensils className="w-6 h-6" />, query: 'Restaurants for lunch', color: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' },
    { id: 'pharmacy', label: 'Pharmacies', icon: <span className="text-2xl">💊</span>, query: 'Pharmacies nearby', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
    { id: 'groceries', label: 'Groceries', icon: <span className="text-2xl">🛒</span>, query: 'Supermarkets and grocery stores', color: 'bg-lime-100 dark:bg-lime-500/20 text-lime-600 dark:text-lime-400' },
    { id: 'legal_drafter', label: 'Legal Advisor', icon: <ICONS.Scale className="w-6 h-6" />, query: 'I need legal advice or a contract', color: 'bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-500' },
    { id: 'electronics', label: 'Electronics', icon: <span className="text-2xl">📱</span>, query: 'Electronics shops', color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
    { id: 'fashion', label: 'Fashion', icon: <ICONS.Store className="w-6 h-6" />, query: 'Fashion boutiques', color: 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400' },
    { id: 'mechanic', label: 'Mechanics', icon: <ICONS.Car className="w-6 h-6" />, query: 'Car mechanics', color: 'bg-slate-200 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300' },
    { id: 'salons', label: 'Beauty & Spa', icon: <span className="text-2xl">💇‍♀️</span>, query: 'Hair salons and spas', color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' },
    { id: 'real_estate', label: 'Real Estate', icon: <ICONS.Home className="w-6 h-6" />, query: 'Apartments for rent', color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' },
    { id: 'hotels', label: 'Hotels', icon: <ICONS.Bed className="w-6 h-6" />, query: 'Hotels and guest houses', color: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' },
    { id: 'car_rental', label: 'Car Rental', icon: <span className="text-2xl">🚗</span>, query: 'Car rental agencies', color: 'bg-violet-100 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400' },
    { id: 'hospitals', label: 'Health', icon: <span className="text-2xl">🏥</span>, query: 'Hospitals and clinics', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
    { id: 'hardware', label: 'Hardware', icon: <span className="text-2xl">🔨</span>, query: 'Hardware and construction stores', color: 'bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-500' },
    { id: 'cafe', label: 'Cafés', icon: <span className="text-2xl">☕</span>, query: 'Coffee shops and cafes', color: 'bg-amber-100 dark:bg-amber-800/20 text-amber-700 dark:text-amber-600' },
    { id: 'cleaning', label: 'Cleaning', icon: <span className="text-2xl">🧹</span>, query: 'Cleaning and laundry services', color: 'bg-sky-100 dark:bg-sky-600/20 text-sky-600 dark:text-sky-300' },
    { id: 'gym', label: 'Fitness', icon: <span className="text-2xl">💪</span>, query: 'Gyms and fitness centers', color: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' },
    { id: 'decor', label: 'Home Decor', icon: <span className="text-2xl">🛋️</span>, query: 'Furniture and home decor shops', color: 'bg-stone-200 dark:bg-stone-500/20 text-stone-600 dark:text-stone-400' },
    { id: 'bars', label: 'Bars', icon: <span className="text-2xl">🥂</span>, query: 'Bars, nightclubs, lounges, and restaurants', color: 'bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400' },
    { id: 'events', label: 'Events', icon: <span className="text-2xl">🎉</span>, query: 'Event planners and venues', color: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400' },
    { id: 'tours', label: 'Tourism', icon: <ICONS.Globe className="w-6 h-6" />, query: 'Tour operators and travel agencies', color: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' },
  ];

  const visibleCategories = categories.filter(cat => {
    if (cat.id === 'legal_drafter') return isRwanda;
    return true;
  });

  return (
    <div className="px-4 pt-16 flex flex-col min-h-full pb-20">
      {/* Minimalist Header Section - Replaces old Hero */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Discover anything
        </h1>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-8">
        
        {/* Category Grid */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
            <span className="w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
            Browse Categories
            <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visibleCategories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => {
                  sendCategoryRequest(cat.label);
                  
                  // ROUTING LOGIC:
                  if (cat.id === 'legal_drafter') {
                      // Gatera (Legal Advisor & Drafter)
                      onStartChat(false, 'legal', cat.query);
                  } else if (cat.id === 'real_estate') {
                      // Keza (Real Estate)
                      onStartChat(false, 'real_estate', cat.query);
                  } else {
                      // Bob (Business Finder)
                      onStartChat(false, 'business', cat.query);
                  }
                }}
                className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.98] transition-all border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md group animate-in slide-in-from-bottom-2 fill-mode-backwards"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${cat.color || 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}>
                  {cat.icon}
                </div>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Any Business Finder Card */}
        <div className="glass-panel p-6 rounded-3xl w-full text-center border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl relative overflow-hidden group mb-8 bg-white/50 dark:bg-white/5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          
          <h3 className="font-black mb-2 text-lg relative z-10 text-slate-900 dark:text-white">Search Anything Else</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-4 relative z-10 font-medium">
            Can't find it above? Use the universal finder.
          </p>

          <Button 
            fullWidth 
            variant="primary"
            onClick={() => onStartChat(false, 'business')}
            icon={<ICONS.Chat className="w-5 h-5" />}
            className="shadow-lg shadow-blue-500/25 h-12 text-xs relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 border-none"
          >
            Ask Bob (Procurement AI)
          </Button>
        </div>

      </div>

    </div>
  );
};

export default Business;
