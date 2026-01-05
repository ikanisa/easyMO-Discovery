
import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { AppMode, ChatSession as ChatSessionType, Role, PresenceUser } from './types';
import { ICONS } from './constants';
import { useTheme } from './context/ThemeContext';
import { sendCategoryRequest } from './services/requestLogger';
import InstallPrompt from './components/InstallPrompt';
import { supabase, NetworkService, isSupabaseConfigured } from './services/supabase';
import { LocationService } from './services/location';
import PermissionModal from './components/Location/PermissionModal';
import OfflineBanner from './components/OfflineBanner';
import { hapticFeedback } from './utils/ui';
import { OfflineQueue } from './services/offlineQueue';
import { flushQueuedRequests } from './services/api';
import { RolesService } from './services/roles';

// Lazy Load Pages
const Discovery = React.lazy(() => import('./pages/Discovery'));
const Services = React.lazy(() => import('./pages/Services'));
const Business = React.lazy(() => import('./pages/Business'));
const ChatSession = React.lazy(() => import('./pages/ChatSession'));
const MomoGenerator = React.lazy(() => import('./pages/MomoGenerator'));
const QRScanner = React.lazy(() => import('./pages/QRScanner'));
const Settings = React.lazy(() => import('./pages/Settings'));
const BusinessOnboarding = React.lazy(() => import('./pages/BusinessOnboarding'));
const ChatHome = React.lazy(() => import('./components/Chat/ChatHome'));

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
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSessionType | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');

    if (modeParam) {
      switch (modeParam) {
        case 'discovery':
        case 'ride':
          setMode(AppMode.DISCOVERY);
          break;
        case 'services':
          setMode(AppMode.SERVICES);
          break;
        case 'business':
          setMode(AppMode.BUSINESS);
          break;
        case 'momo':
          setMode(AppMode.MOMO_GENERATOR);
          break;
        case 'scanner':
          setMode(AppMode.SCANNER);
          break;
        default:
          break;
      }

      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setIsOnline(NetworkService.isOnline());
    NetworkService.addListener((status) => {
        setIsOnline(status);
        if (!status) toast.error("You are offline", { description: "Discovery features may be limited." });
        else toast.success("Back online");
    });

    if (!isSupabaseConfigured) {
      setIsAuthenticated(true);
      setIsAuthChecking(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;
        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error) user = data.user;
        }

        // Create lightweight profile if missing
        if (user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: user.id,
                display_name: user.email || `Guest ${user.id.slice(0, 4)}`,
                phone_number: user.phone || `Anon-${user.id.slice(0, 6)}`,
                default_role: 'passenger', // Keep for backward compatibility
              },
              { onConflict: 'user_id' }
            );
          if (profileError) {
            console.warn('Profile sync warning', profileError.message);
          } else {
            // Initialize default passenger role in user_roles table
            // This is idempotent - won't create duplicate if already exists
            await RolesService.initializeDefaultRole(user.id);
          }
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
    let isMounted = true;

    const syncQueue = async () => {
      if (!isOnline) return;
      const result = await flushQueuedRequests();
      if (result.flushed > 0 && isMounted) {
        setLastSyncedAt(Date.now());
      }
      const count = await OfflineQueue.getCount();
      if (isMounted) setQueuedCount(count);
    };

    syncQueue();

    return () => {
      isMounted = false;
    };
  }, [isOnline]);

  useEffect(() => {
    let isMounted = true;

    const refreshCount = async () => {
      const count = await OfflineQueue.getCount();
      if (isMounted) setQueuedCount(count);
    };

    refreshCount();

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setQueuedCount(customEvent.detail || 0);
    };

    window.addEventListener('offline-queue-updated', handler);
    return () => {
      isMounted = false;
      window.removeEventListener('offline-queue-updated', handler);
    };
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

  // Removed handleHomeSearch - ChatHome handles search directly

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
                    if (mode === AppMode.HOME) {
                        return (
                          <Suspense fallback={<LoadingScreen />}>
                            <ChatHome
                              onStartChat={(type, query) => startChat(type, undefined, false, query)}
                              onNavigate={(m) => {
                                const modeMap: Record<string, AppMode> = {
                                  'discovery': AppMode.DISCOVERY,
                                  'business': AppMode.BUSINESS,
                                  'services': AppMode.SERVICES,
                                  'momo_generator': AppMode.MOMO_GENERATOR,
                                  'scanner': AppMode.SCANNER,
                                };
                                const targetMode = modeMap[m] || AppMode.HOME;
                                setMode(targetMode);
                                if (targetMode === AppMode.DISCOVERY && !userRole) {
                                  setUserRole('passenger');
                                }
                              }}
                              currentRole={userRole}
                              onRoleChange={(role) => {
                                setUserRole(role);
                                if (role === 'driver' || role === 'passenger') {
                                  setMode(AppMode.DISCOVERY);
                                }
                              }}
                            />
                          </Suspense>
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
    <>
      <Toaster position="top-center" expand visibleToasts={3} closeButton richColors theme={theme as any} />
      {!isSupabaseConfigured && (
        <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 shadow-sm">
          Missing Supabase configuration. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable live features.
        </div>
      )}
      <OfflineBanner
        isOnline={isOnline}
        queuedCount={queuedCount}
        lastSyncedAt={lastSyncedAt}
        onSync={async () => {
          const result = await flushQueuedRequests();
          if (result.flushed > 0) setLastSyncedAt(Date.now());
          const count = await OfflineQueue.getCount();
          setQueuedCount(count);
        }}
      />
      {showPermissionModal && <PermissionModal onGranted={() => setShowPermissionModal(false)} />}
      <Layout currentMode={mode} onNavigate={(m) => { 
        hapticFeedback('light'); 
        setMode(m); 
        // Keep role when returning to home (user can toggle via ChatHome)
        // setUserRole(null); // Removed - allow role persistence
      }}>
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
    </>
  );
};

export default App;
