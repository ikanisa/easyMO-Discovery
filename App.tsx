
import React, { useState, useEffect, Suspense } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import { AppMode, ChatSession as ChatSessionType, Role, PresenceUser } from './types';
import { ICONS } from './constants';
import { useTheme } from './context/ThemeContext';
import { sendCategoryRequest } from './services/requestLogger';
import InstallPrompt from './components/InstallPrompt';
import { supabase } from './services/supabase';

// Lazy Load Pages for Performance Code Splitting
const Discovery = React.lazy(() => import('./pages/Discovery'));
const Services = React.lazy(() => import('./pages/Services'));
const Business = React.lazy(() => import('./pages/Business'));
const ChatSession = React.lazy(() => import('./pages/ChatSession'));
const MomoGenerator = React.lazy(() => import('./pages/MomoGenerator'));
const QRScanner = React.lazy(() => import('./pages/QRScanner'));
const Settings = React.lazy(() => import('./pages/Settings'));
const BusinessOnboarding = React.lazy(() => import('./pages/BusinessOnboarding'));

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
    className={`group relative flex flex-col items-start justify-between p-5 w-full h-40 rounded-widget soft-border glass-panel card-shadow overflow-hidden transition-all duration-300 active:scale-95 hover:bg-slate-50 dark:hover:bg-white/10 animate-in zoom-in fill-mode-backwards ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Hover Gradient Overlay */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
    
    {/* Icon Container */}
    <div className={`w-12 h-12 rounded-button flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white group-hover:scale-110 transition-transform duration-300 z-10`}>
      <Icon className="w-6 h-6" />
    </div>

    {/* Text Content */}
    <div className="text-left z-10 w-full">
      <span className="block font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight mb-1">{label}</span>
      {subLabel && <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">{subLabel}</span>}
    </div>

    {/* Decorative Elements */}
    <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-10 dark:opacity-20 bg-gradient-to-br ${gradient} blur-2xl pointer-events-none group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity`} />
    <div className="absolute top-0 right-0 p-4 opacity-50">
       <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
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
  
  // Home Search State
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Initialize Auth (Anonymous)
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check if we have an active session
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;

        // 2. If no session, try sign in anonymously
        if (!user) {
          console.log("No session found, attempting anonymous sign-in...");
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) {
            console.warn("Anonymous auth failed (likely disabled in Supabase). Proceeding in Offline Guest Mode.", error.message);
            // Do NOT throw. Allow app to load in "Local/Offline" mode.
          } else {
            user = data.user;
          }
        }

        // 3. Ensure a Profile exists in the DB (Only if auth succeeded)
        if (user) {
           const guestName = `Guest ${user.id.slice(0, 4)}`;
           const guestPhone = `Anon-${user.id.slice(0, 6)}`;

           const { error: profileError } = await supabase
             .from('profiles')
             .upsert({
               id: user.id,
               display_name: guestName,
               role: 'passenger',
               phone: guestPhone
             }, { onConflict: 'id' });
            
           if (profileError) {
             console.warn("Profile sync warning:", profileError);
           }
        }

        // Always allow entry, even if auth failed (Offline Mode)
        setIsAuthenticated(true);

      } catch (error) {
        console.error("Initialization Error:", error);
        // Fallback to allow UI rendering even on critical failures
        setIsAuthenticated(true);
      } finally {
        setIsAuthChecking(false);
      }
    };

    initAuth();
  }, []);

  const startChat = (type: 'mobility' | 'support' | 'business' | 'real_estate' | 'legal', peer?: PresenceUser, isDemoMode: boolean = false, initialQuery?: string) => {
    let initialText = '';
    if (type === 'support') initialText = 'Hello! How can I help you today?';
    if (type === 'business') initialText = 'Hi! I am "Bob", your Procurement Agent. I can find Hardware, Electronics, Groceries, or any local service. I search Maps & Social Media. What do you need?';
    if (type === 'real_estate') initialText = 'Hello! I am "Keza", your Real Estate Concierge. I search across Agencies, Facebook, and Instagram to find properties. Are you looking for rent or sale?';
    
    // UPDATED GATERA GREETING
    if (type === 'legal') initialText = 'Muraho! Ndi "Gatera", your Legal Expert. I can draft contracts AND provide legal advice based on Rwandan Law. Ask me a question or tell me what to draft.';

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

  const handleNavigation = (newMode: AppMode) => {
    setMode(newMode);
    if (newMode === AppMode.HOME) {
      setUserRole(null);
    }
  };

  const handleHomeSearch = () => {
    if (!homeSearchQuery.trim()) return;
    sendCategoryRequest(homeSearchQuery);
    startChat('business', undefined, false, homeSearchQuery);
    setHomeSearchQuery('');
  };

  const renderContent = () => {
    // 1. Home / Role Selection
    if (mode === AppMode.HOME && !userRole) {
      return (
        <div className="flex flex-col min-h-full overflow-y-auto no-scrollbar pb-24 relative">
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 z-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            {theme === 'dark' ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
          </button>

          {/* Header Section */}
          <div className="pt-12 px-6 pb-6 text-center animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="app-title text-5xl mb-3 bg-clip-text text-transparent bg-gradient-to-br from-blue-600 via-emerald-500 to-purple-600 dark:from-blue-400 dark:via-emerald-400 dark:to-purple-400 drop-shadow-sm">
              easyMO
            </h1>
            <p className="app-subtitle max-w-xs mx-auto leading-relaxed">
              Your Everyday Companion<br/>
              <span className="text-xs opacity-75 font-bold mt-1 block">Move • Shop • Legal • Business</span>
            </p>
          </div>

          {/* Home Search Bar */}
          <div className="px-6 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
             <div className="relative group w-full">
                <input 
                   type="text" 
                   value={homeSearchQuery}
                   onChange={(e) => setHomeSearchQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleHomeSearch()}
                   placeholder="Search for products, services, or places..."
                   className="w-full glass-panel rounded-card pl-5 pr-12 py-4 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-slate-900/80 transition-all"
                />
                <button 
                   onClick={handleHomeSearch}
                   className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-button transition-colors shadow-md active:scale-95"
                >
                   <ICONS.Search className="w-4 h-4" />
                </button>
             </div>
          </div>
          
          {/* Main Grid Section */}
          <div className="px-6 space-y-6">
            
            {/* Section: Mobility */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
                Mobility
                <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></span>
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
                     setUserRole('driver'); 
                     setMode(AppMode.DISCOVERY); 
                   }}
                   gradient="from-pink-500 to-rose-500"
                   delay={100}
                />
              </div>
            </section>

            {/* Section: Discovery & Tools */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
                Lifestyle & Tools
                <span className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Tool 1: MoMo Generator */}
                <HomeWidget 
                   icon={ICONS.QrCode} 
                   label="MoMo QR" 
                   subLabel="Receive Pay"
                   onClick={() => setMode(AppMode.MOMO_GENERATOR)}
                   gradient="from-emerald-500 to-teal-400"
                   delay={200}
                />
                {/* Tool 2: Scanner */}
                <HomeWidget 
                   icon={ICONS.Scan} 
                   label="Scan" 
                   subLabel="Pay & Link"
                   onClick={() => setMode(AppMode.SCANNER)}
                   gradient="from-orange-500 to-amber-500"
                   delay={300}
                />
              </div>
            </section>
          </div>

          {/* Quick Actions / Services - Horizontal Scroll */}
          <section className="pl-6 pb-8">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 pr-6">
               Services
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-6 pb-4">
               {/* Quick Action 1: Legal Advisor */}
               <button 
                  onClick={() => startChat('legal')}
                  className="min-w-[140px] h-32 rounded-card glass-panel soft-border p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700"
               >
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                     <ICONS.Scale className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Legal Advisor</div>
                     <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Research & Draft</div>
                  </div>
               </button>

               {/* Quick Action 2: Insurance */}
               <button 
                  onClick={() => window.open('https://wa.me/250795588248?text=Hello,%20I%20would%20like%20to%20inquire%20about%20insurance%20services.', '_blank')}
                  className="min-w-[140px] h-32 rounded-card glass-panel soft-border p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700"
                  style={{ animationDelay: '100ms' }}
               >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                     <ICONS.ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Insurance</div>
                     <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Get Covered</div>
                  </div>
               </button>

               {/* Quick Action 3: Support */}
               <button 
                  onClick={() => startChat('support')}
                  className="min-w-[140px] h-32 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 p-4 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-white/10 transition-colors animate-in slide-in-from-right-4 duration-700 shadow-sm"
                  style={{ animationDelay: '200ms' }}
               >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-400">
                     <ICONS.Support className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                     <div className="text-sm font-bold text-slate-900 dark:text-slate-200">Support</div>
                     <div className="text-[10px] text-slate-500 font-medium">Help Center</div>
                  </div>
               </button>
            </div>
          </section>

          {/* Footer Branding */}
          <div className="w-full text-center mt-auto pb-8 opacity-40">
             <div className="text-[9px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">
               Powered by Gemini AI
             </div>
          </div>
        </div>
      );
    }

    // 2. Main Modes - Wrapped in Suspense
    return (
      <Suspense fallback={<LoadingScreen />}>
        {(() => {
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
              return <Services onStartChat={(type) => startChat(type || 'support')} onNavigate={handleNavigation} />;
            case AppMode.BUSINESS:
              return <Business onStartChat={(isDemo, type, query) => startChat(type || 'business', undefined, isDemo, query)} />;
            case AppMode.MOMO_GENERATOR:
              return <MomoGenerator onBack={() => handleNavigation(AppMode.HOME)} />;
            case AppMode.SCANNER:
              return <QRScanner onBack={() => handleNavigation(AppMode.HOME)} />;
            case AppMode.SETTINGS:
              return <Settings onBack={() => handleNavigation(AppMode.SERVICES)} />;
            case AppMode.ONBOARDING:
              return (
                <BusinessOnboarding 
                  onComplete={(newRole) => {
                    setUserRole(newRole);
                    setMode(AppMode.DISCOVERY);
                  }}
                  onCancel={() => setMode(AppMode.SERVICES)}
                />
              );
            default:
              return null;
          }
        })()}
      </Suspense>
    );
  };

  if (isAuthChecking || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Layout currentMode={mode} onNavigate={handleNavigation}>
        {renderContent()}
      </Layout>
      
      {/* Install PWA Prompt */}
      <InstallPrompt />

      {/* Full Screen Chat Overlay - Also Lazy Loaded */}
      {activeChat && (
        <Suspense fallback={<LoadingScreen />}>
          <ChatSession 
            session={activeChat} 
            onClose={() => setActiveChat(null)} 
          />
        </Suspense>
      )}
    </ErrorBoundary>
  );
};

export default App;
