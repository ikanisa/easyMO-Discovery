
import React, { useState } from 'react';
import Button from '../components/Button';
import { ICONS } from '../constants';

interface BusinessProps {
  onStartChat: (isDemo: boolean, type?: 'business' | 'real_estate', initialQuery?: string) => void;
}

const Business: React.FC<BusinessProps> = ({ onStartChat }) => {
  const [isDemo, setIsDemo] = useState(false);

  const categories = [
    { id: 'restaurant', label: 'Restaurants', icon: <ICONS.Utensils className="w-6 h-6" />, query: 'Restaurants for lunch', color: 'bg-orange-500/20 text-orange-400' },
    { id: 'pharmacy', label: 'Pharmacies', icon: <span className="text-2xl">💊</span>, query: 'Pharmacies nearby', color: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'groceries', label: 'Groceries', icon: <span className="text-2xl">🛒</span>, query: 'Supermarkets and grocery stores', color: 'bg-lime-500/20 text-lime-400' },
    { id: 'electronics', label: 'Electronics', icon: <span className="text-2xl">📱</span>, query: 'Electronics shops', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'fashion', label: 'Fashion', icon: <ICONS.Store className="w-6 h-6" />, query: 'Fashion boutiques', color: 'bg-pink-500/20 text-pink-400' },
    { id: 'mechanic', label: 'Mechanics', icon: <ICONS.Car className="w-6 h-6" />, query: 'Car mechanics', color: 'bg-slate-500/20 text-slate-300' },
    { id: 'salons', label: 'Beauty & Spa', icon: <span className="text-2xl">💇‍♀️</span>, query: 'Hair salons and spas', color: 'bg-rose-500/20 text-rose-400' },
    { id: 'real_estate', label: 'Real Estate', icon: <ICONS.Home className="w-6 h-6" />, query: 'Apartments for rent', color: 'bg-indigo-500/20 text-indigo-400' },
    { id: 'hotels', label: 'Hotels', icon: <ICONS.Bed className="w-6 h-6" />, query: 'Hotels and guest houses', color: 'bg-cyan-500/20 text-cyan-400' },
    { id: 'car_rental', label: 'Car Rental', icon: <span className="text-2xl">🚗</span>, query: 'Car rental agencies', color: 'bg-violet-600/20 text-violet-400' },
    { id: 'hospitals', label: 'Health', icon: <span className="text-2xl">🏥</span>, query: 'Hospitals and clinics', color: 'bg-red-500/20 text-red-400' },
    { id: 'hardware', label: 'Hardware', icon: <span className="text-2xl">🔨</span>, query: 'Hardware and construction stores', color: 'bg-amber-600/20 text-amber-500' },
    { id: 'cafe', label: 'Cafés', icon: <span className="text-2xl">☕</span>, query: 'Coffee shops and cafes', color: 'bg-amber-800/20 text-amber-600' },
    { id: 'cleaning', label: 'Cleaning', icon: <span className="text-2xl">🧹</span>, query: 'Cleaning and laundry services', color: 'bg-sky-600/20 text-sky-300' },
    { id: 'gym', label: 'Fitness', icon: <span className="text-2xl">💪</span>, query: 'Gyms and fitness centers', color: 'bg-teal-500/20 text-teal-400' },
    { id: 'decor', label: 'Home Decor', icon: <span className="text-2xl">🛋️</span>, query: 'Furniture and home decor shops', color: 'bg-stone-500/20 text-stone-400' },
    { id: 'transport', label: 'Logistics', icon: <ICONS.Truck className="w-6 h-6" />, query: 'Transport and moving companies', color: 'bg-slate-600/20 text-slate-300' },
    { id: 'legal', label: 'Legal', icon: <ICONS.Scale className="w-6 h-6" />, query: 'Lawyers and notaries', color: 'bg-yellow-700/20 text-yellow-600' },
    { id: 'events', label: 'Events', icon: <span className="text-2xl">🎉</span>, query: 'Event planners and venues', color: 'bg-fuchsia-500/20 text-fuchsia-400' },
    { id: 'tours', label: 'Tourism', icon: <ICONS.Globe className="w-6 h-6" />, query: 'Tour operators and travel agencies', color: 'bg-sky-500/20 text-sky-400' },
  ];

  return (
    <div className="px-4 pt-16 flex flex-col min-h-full pb-20">
      {/* Hero Section */}
      <div className="text-center mb-8 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/20 ring-1 ring-white/10 animate-in zoom-in duration-500">
          <ICONS.Business className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
          Super Discovery
        </h1>
        <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
          The exhaustive AI search for Kigali. Finds what others miss using Maps + Social Search.
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-8">
        
        {/* Category Grid */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
            <span className="w-8 h-px bg-slate-700"></span>
            Browse Categories
            <span className="flex-1 h-px bg-slate-700"></span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => onStartChat(isDemo, cat.id === 'real_estate' ? 'real_estate' : 'business', cat.query)}
                className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-[0.98] transition-all border border-white/5 shadow-lg group animate-in slide-in-from-bottom-2 fill-mode-backwards"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${cat.color || 'bg-slate-800/50 text-slate-300'}`}>
                  {cat.icon}
                </div>
                <span className="font-semibold text-xs text-slate-200">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Any Business Finder Card */}
        <div className="glass-panel p-6 rounded-3xl w-full text-center border border-white/10 shadow-xl backdrop-blur-xl relative overflow-hidden group mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
          
          <h3 className="font-semibold mb-2 text-lg relative z-10 text-white">Search Anything Else</h3>
          <p className="text-xs text-slate-400 mb-4 px-4 relative z-10">
            Can't find it above? Use the universal finder.
          </p>

          <Button 
            fullWidth 
            variant="primary"
            onClick={() => onStartChat(isDemo, 'business')}
            icon={<ICONS.Chat className="w-5 h-5" />}
            className="shadow-lg shadow-blue-500/25 h-12 text-sm relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 border-none"
          >
            Ask AI Assistant
          </Button>
        </div>

      </div>

      {/* Demo Mode Toggle */}
      <div className="mt-auto pt-8 pb-4 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-3 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
          <span className={`text-[10px] font-bold px-2 ${!isDemo ? 'text-white' : 'text-slate-500'}`}>Real AI</span>
          <button 
            onClick={() => setIsDemo(!isDemo)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${isDemo ? 'bg-purple-500' : 'bg-slate-700'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isDemo ? 'translate-x-5' : ''}`} />
          </button>
          <span className={`text-[10px] font-bold px-2 ${isDemo ? 'text-purple-400' : 'text-slate-500'}`}>Demo</span>
        </div>
        <p className="text-[9px] text-center text-slate-600 leading-tight">
           {isDemo ? 'Using offline mock data' : 'Using Live Gemini API'}
        </p>
      </div>
    </div>
  );
};

export default Business;
