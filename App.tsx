
import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import { AppMode, ChatSession as ChatSessionType, Role, PresenceUser } from './types';
import { ICONS } from './constants';
import { useTheme } from './context/ThemeContext';
import { sendCategoryRequest } from './services/requestLogger';
import InstallPrompt from './components/InstallPrompt';
import { supabase, NetworkService } from './services/supabase';
import { LocationService } from './services/location';
import PermissionModal from './components/Location/PermissionModal';
import { hapticFeedback } from './utils/ui';

// Lazy Load Pages
const Discovery = React.lazy(() => import('./pages/Discovery'));
const Services = React.lazy(() => import('./pages/Services'));
const Business = React.lazy(() => import('./pages/Business'));
const ChatSession = React.lazy(() => import('./pages/ChatSession'));
const MomoGenerator = React.lazy(() => import('./pages/MomoGenerator'));
const QRScanner = React.lazy(() => import('./pages/QRScanner'));
const Settings = React.lazy(() => import('./pages/Settings'));
const BusinessOnboarding = React.lazy(() => import('./pages/BusinessOnboarding'));

const HomeWidget = ({ icon: Icon, label, subLabel, onClick, gradient, delay = 0 }: any) => (
  <motion.button
    whileTap={{ scale: 0.94 }}
    onClick={() => { hapticFeedback('light'); onClick(); }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.001, type: 'spring', stiffness: 260, damping: 20 }}
    className={`group relative flex flex-col items-start justify-between p-4 min-w-[136px] w-[136px] h-[154px] rounded-[1.75rem] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl overflow-hidden transition-all shadow-lg shrink-0 snap-start`}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${gradient}`} />
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-md text-white group-hover:scale-110 transition-transform z-10`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-left z-10 w-full mt-auto pt-2">
      <span className="block font-bold text-sm text-slate-900 dark:text-slate-100 mb-0.5">{label}</span>
      {subLabel && <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{subLabel}</span>}
    </div>
  </motion.button>
);

const SectionRow = ({ title, children }: any) => (
  <div className="pb-2">
    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-6 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>{title}
    </h2>
    <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-6 snap-x snap-mandatory">
      {children}
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSessionType | null>(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    setIsOnline(NetworkService.isOnline());
    NetworkService.addListener((status) => {
        setIsOnline(status);
        if (!status) toast.error("You are offline", { description: "Discovery features may be limited." });
        else toast.success("Back online");
    });

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;
        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error) user = data.user;
        }
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(true);
      } finally {
        setIsAuthChecking(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!isAuthChecking) {
        if (!LocationService.isSetupComplete()) setShowPermissionModal(true);
        else if (LocationService.isEnabled()) LocationService.startWatching(() => {}, (err) => console.debug(err));
    }
  }, [isAuthChecking]);

  const startChat = (type: any, peer?: any, isDemo = false, query?: string) => {
    setActiveChat({
      id: Date.now().toString(),
      type,
      peerId: peer?.sessionId,
      peerName: peer?.displayName,
      isDemoMode: isDemo,
      initialInput: query,
      messages: type === 'mobility' ? [] : [{ id: 'sys', sender: 'system', text: 'Connecting to agent...', timestamp: Date.now() }],
      lastUpdated: Date.now()
    });
  };

  const handleHomeSearch = () => {
    if (!homeSearchQuery.trim()) return;
    hapticFeedback('medium');
    sendCategoryRequest(homeSearchQuery);
    startChat('business', undefined, false, homeSearchQuery);
    setHomeSearchQuery('');
  };

  const renderContent = () => {
    return (
        <AnimatePresence mode="wait">
            <motion.div 
                key={mode + (userRole || 'home')}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
            >
                {(() => {
                    if (mode === AppMode.HOME && !userRole) {
                        return (
                          <div className="flex flex-col min-h-full overflow-y-auto no-scrollbar pb-24 relative bg-slate-50 dark:bg-[#0f172a]">
                            <div className="relative pt-12 pb-6 px-6">
                               <div className="absolute top-6 right-6">
                                 <button onClick={() => { hapticFeedback('light'); toggleTheme(); }} className="p-2.5 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm">
                                   {theme === 'dark' ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
                                 </button>
                               </div>
                               <div className="text-center mb-8">
                                 <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-purple-600 mb-3">easyMO</h1>
                                 <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide">Your Everyday Companion</p>
                               </div>
                               <div className="relative group w-full max-w-md mx-auto">
                                  <input 
                                     type="text" 
                                     value={homeSearchQuery}
                                     onChange={(e) => setHomeSearchQuery(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && handleHomeSearch()}
                                     placeholder="Find products, services, or places..."
                                     className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl pl-6 pr-14 py-4.5 text-sm font-bold text-slate-900 dark:text-white shadow-xl"
                                  />
                                  <button onClick={handleHomeSearch} className="absolute right-2 top-2 p-2.5 bg-blue-600 text-white rounded-2xl">
                                     <ICONS.Search className="w-5 h-5" />
                                  </button>
                               </div>
                            </div>
                            <div className="space-y-4">
                              <SectionRow title="Mobility">
                                 <HomeWidget icon={ICONS.Bike} label="Find Ride" subLabel="Moto & Cab" gradient="from-indigo-500 to-blue-500" onClick={() => { setUserRole('passenger'); setMode(AppMode.DISCOVERY); }} delay={0} />
                                 <HomeWidget icon={ICONS.Car} label="Driver Mode" subLabel="Earn Money" gradient="from-pink-500 to-rose-500" onClick={() => { setUserRole('driver'); setMode(AppMode.DISCOVERY); }} delay={100} />
                              </SectionRow>
                              <SectionRow title="Tools">
                                 <HomeWidget icon={ICONS.QrCode} label="MoMo QR" subLabel="Receive Pay" gradient="from-emerald-500 to-teal-400" onClick={() => setMode(AppMode.MOMO_GENERATOR)} delay={200} />
                                 <HomeWidget icon={ICONS.Scan} label="Scanner" subLabel="Pay & Link" gradient="from-orange-500 to-amber-500" onClick={() => setMode(AppMode.SCANNER)} delay={300} />
                              </SectionRow>
                            </div>
                          </div>
                        );
                    }
                    switch (mode) {
                        case AppMode.DISCOVERY: return <Discovery role={userRole || 'passenger'} onStartChat={(peer) => startChat('mobility', peer)} onBack={() => { setUserRole(null); setMode(AppMode.HOME); }} />;
                        case AppMode.SERVICES: return <Services onStartChat={(type) => startChat(type || 'support')} onNavigate={setMode} />;
                        case AppMode.BUSINESS: return <Business onStartChat={(isDemo, type, query) => startChat(type || 'business', undefined, isDemo, query)} />;
                        case AppMode.MOMO_GENERATOR: return <MomoGenerator onBack={() => setMode(AppMode.HOME)} />;
                        case AppMode.SCANNER: return <QRScanner onBack={() => setMode(AppMode.HOME)} />;
                        case AppMode.SETTINGS: return <Settings onBack={() => setMode(AppMode.SERVICES)} />;
                        case AppMode.ONBOARDING: return <BusinessOnboarding onComplete={(newRole) => { setUserRole(newRole); setMode(AppMode.DISCOVERY); }} onCancel={() => setMode(AppMode.SERVICES)} />;
                        default: return null;
                    }
                })()}
            </motion.div>
        </AnimatePresence>
    );
  };

  if (isAuthChecking || !isAuthenticated) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <Toaster position="top-center" expand visibleToasts={3} closeButton richColors theme={theme as any} />
      {showPermissionModal && <PermissionModal onGranted={() => setShowPermissionModal(false)} />}
      <Layout currentMode={mode} onNavigate={(m) => { hapticFeedback('light'); setMode(m); if (m === AppMode.HOME) setUserRole(null); }}>
        {renderContent()}
      </Layout>
      <InstallPrompt />
      {activeChat && (
        <Suspense fallback={<LoadingScreen />}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-50">
            <ChatSession session={activeChat} onClose={() => setActiveChat(null)} />
          </motion.div>
        </Suspense>
      )}
    </ErrorBoundary>
  );
};

export default App;
