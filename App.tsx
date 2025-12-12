
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Discovery from './pages/Discovery';
import Services from './pages/Services';
import Business from './pages/Business';
import WaiterGuest from './pages/WaiterGuest';
import Manager from './pages/Manager';
import ChatSession from './pages/ChatSession';
import MomoGenerator from './pages/MomoGenerator';
import QRScanner from './pages/QRScanner';
import Login from './pages/Login'; // Import Login Page
import { AppMode, ChatSession as ChatSessionType, Role, PresenceUser } from './types';
import { ICONS } from './constants';
import { useTheme } from './context/ThemeContext';
import { sendCategoryRequest } from './services/requestLogger';

// Helper Widget Component for Home Screen
const HomeWidget = ({ 
  icon: Icon, 
  label, 
  subLabel, 
  onClick, 
  gradient, 
  delay = 0,
  className = ""
}: { 
  icon: any, 
  label: string, 
  subLabel?: string, 
  onClick: () => void, 
  gradient: string, 
  delay?: number,
  className?: string
}) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-start justify-between p-5 w-full h-40 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-2xl overflow-hidden transition-all duration-300 active:scale-95 hover:bg-slate-50 dark:hover:bg-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 animate-in zoom-in fill-mode-backwards ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Hover Gradient Overlay */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
    
    {/* Icon Container */}
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white group-hover:scale-110 transition-transform duration-300 z-10`}>
      <Icon className="w-6 h-6" />
    </div>

    {/* Text Content */}
    <div className="text-left z-10 w-full">
      <span className="block font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight mb-1">{label}</span>
      {subLabel && <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">{subLabel}</span>}
    </div>

    {/* Decorative Elements */}
    <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-10 dark:opacity-20 bg-gradient-to-br ${gradient} blur-2xl pointer-events-none group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity`} />
    <div className="absolute top-0 right-0 p-4 opacity-50">
       <div className="w-2 h-2 rounded-full bg-slate-900/10 dark:bg-white/20" />
    </div>
  </button>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSessionType | null>(null);

  // Check login status on mount
  useEffect(() => {
    const storedPhone = localStorage.getItem('easyMO_user_phone');
    if (storedPhone) {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLoginSuccess = (phone: string) => {
    setIsAuthenticated(true);
  };

  const startChat = (type: 'mobility' | 'support' | 'business' | 'real_estate' | 'legal', peer?: PresenceUser, isDemoMode: boolean = false, initialQuery?: string) => {
    let initialText = '';
    if (type === 'support') initialText = 'Hello! How can I help you today?';
    if (type === 'business') initialText = 'Hi! I am "Bob", your Procurement Agent. I can find Hardware, Electronics, Groceries, or any local service. I search Maps & Social Media. What do you need?';
    if (type === 'real_estate') initialText = 'Hello! I am "Keza", your Real Estate Concierge. I search across Agencies, Facebook, and Instagram to find properties. Are you looking for rent or sale?';
    if (type === 'legal') initialText = 'Muraho! Ndi "Gatera". I can help you find the nearest Notary, Lawyer, or Bailiff. (Hello! I am your Legal Assistant. What professional do you need?)';

    setActiveChat({
      id: Date.now().toString(),
      type,
      peerId: peer?.sessionId,
      peerName: peer?.displayName,
      isDemoMode,
      initialInput: initialQuery,
      messages: type === 'mobility' ? [] : [{ 
          id: 'system-1', 
          sender: 'system', 
          text: initialText, 
          timestamp: Date.now() 
      }],
      lastUpdated: Date.now()
    });
  };

  const renderContent = () => {
    // 1. Home / Role Selection
    if (mode === AppMode.HOME && !userRole) {
      return (
        <div className="flex flex-col min-h-full overflow-y-auto no-scrollbar pb-24 relative">
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300 z-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            {theme === 'dark' ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
          </button>

          {/* Header Section */}
          <div className="pt-12 px-6 pb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-blue-600 via-emerald-500 to-purple-600 dark:from-blue-400 dark:via-emerald-400 dark:to-purple-400 drop-shadow-sm mb-3">
              easyMO
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide max-w-xs mx-auto">
              Your AI-Powered City Guide & Tools
            </p>
          </div>
          
          {/* Main Grid Section */}
          <div className="px-6 pb-6 space-y-6">
            
            {/* Section: Mobility (RESTORED) */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-800"></span>
                Mobility
                <span className="flex-1 h-px bg-slate-300 dark:bg-slate-800"></span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <HomeWidget 
                   icon={ICONS.Bike} 
                   label="Find Ride" 
                   subLabel="Moto & Cab"
                   onClick={() => { 
                     sendCategoryRequest('Find Ride - Moto & Cab');
                     setUserRole('passenger'); 
                     setMode(AppMode.DISCOVERY); 
                   }}
                   gradient="from-indigo-500 to-blue-500"
                   delay={0}
                />
                <HomeWidget 
                   icon={ICONS.Car} 
                   label="Driver" 
                   subLabel="Earn Money"
                   onClick={() => { 
                     sendCategoryRequest('Driver Mode');
                     setUserRole('driver'); 
                     setMode(AppMode.DISCOVERY); 
                   }}
                   gradient="from-fuchsia-600 to-pink-600"
                   delay={100}
                />
              </div>
            </div>

            {/* Section: Discovery & Tools */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-800"></span>
                Lifestyle & Tools
                <span className="flex-1 h-px bg-slate-300 dark:bg-slate-800"></span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Feature 3: MoMo Generator (Tool) */}
                <HomeWidget 
                   icon={ICONS.QrCode} 
                   label="MoMo QR" 
                   subLabel="Receive Pay"
                   onClick={() => setMode(AppMode.MOMO_GENERATOR)}
                   gradient="from-emerald-500 to-teal-400"
                   delay={200}
                />
                {/* Feature 4: Scanner (Tool) */}
                <HomeWidget 
                   icon={ICONS.Scan} 
                   label="Scan" 
                   subLabel="Pay & Link"
                   onClick={() => setMode(AppMode.SCANNER)}
                   gradient="from-orange-500 to-amber-500"
                   delay={300}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions / Services */}
          <div className="pl-6 pb-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pr-6 flex items-center gap-2">
               Services
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-6 pb-4">
               {/* Quick Action 1: Notary */}
               <button 
                  onClick={() => startChat('legal')}
                  className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-black/5 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
               >
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                     <ICONS.Scale className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Notary Services</div>
                     <div className="text-[10px] text-slate-500">Notary & Law</div>
                  </div>
               </button>

               {/* Quick Action 2: Insurance */}
               <button 
                  onClick={() => window.open('https://wa.me/250795588248?text=Hello,%20I%20would%20like%20to%20inquire%20about%20insurance%20services.', '_blank')}
                  className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-black/5 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
                  style={{ animationDelay: '100ms' }}
               >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                     <ICONS.ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Insurance</div>
                     <div className="text-[10px] text-slate-500">Get Covered</div>
                  </div>
               </button>

               {/* Quick Action 3: Support */}
               <button 
                  onClick={() => startChat('support')}
                  className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-black/5 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
                  style={{ animationDelay: '200ms' }}
               >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-400">
                     <ICONS.Support className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Support</div>
                     <div className="text-[10px] text-slate-500">Help Center</div>
                  </div>
               </button>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="w-full text-center mt-auto pb-8 opacity-40">
             <div className="text-[9px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">
               Powered by Gemini AI
             </div>
          </div>
        </div>
      );
    }

    // 2. Main Modes
    switch (mode) {
      case AppMode.HOME:
      case AppMode.DISCOVERY:
        return (
          <Discovery 
            role={userRole || 'passenger'} 
            onStartChat={(peer) => startChat('mobility', peer)} 
            onBack={() => { setUserRole(null); setMode(AppMode.HOME); }}
          />
        );
      case AppMode.SERVICES:
        return <Services onStartChat={(type) => startChat(type || 'support')} onNavigate={setMode} />;
      case AppMode.BUSINESS:
        return <Business onStartChat={(isDemo, type, query) => startChat(type || 'business', undefined, isDemo, query)} />;
      case AppMode.WAITER_GUEST:
        return <WaiterGuest onBack={() => setMode(AppMode.SERVICES)} />;
      case AppMode.MANAGER:
        return <Manager onBack={() => setMode(AppMode.SERVICES)} />;
      case AppMode.MOMO_GENERATOR:
        return <MomoGenerator onBack={() => setMode(AppMode.HOME)} />;
      case AppMode.SCANNER:
        return <QRScanner onBack={() => setMode(AppMode.HOME)} />;
      default:
        return null;
    }
  };

  if (isAuthChecking) {
    return <div className="h-screen w-screen bg-slate-50 dark:bg-[#0f172a]" />; // Loading flash
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Layout currentMode={mode} onNavigate={setMode}>
        {renderContent()}
      </Layout>

      {/* Full Screen Chat Overlay */}
      {activeChat && (
        <ChatSession 
          session={activeChat} 
          onClose={() => setActiveChat(null)} 
        />
      )}
    </>
  );
};

export default App;
