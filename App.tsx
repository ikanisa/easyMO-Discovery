
import React, { useState } from 'react';
import Layout from './components/Layout';
import Discovery from './pages/Discovery';
import Services from './pages/Services';
import Business from './pages/Business';
import WaiterGuest from './pages/WaiterGuest';
import Manager from './pages/Manager';
import ChatSession from './pages/ChatSession';
import MomoGenerator from './pages/MomoGenerator';
import QRScanner from './pages/QRScanner';
import { AppMode, ChatSession as ChatSessionType, Role, PresenceUser } from './types';
import Button from './components/Button';
import { ICONS } from './constants';

// Helper Widget Component for Home Screen
const HomeWidget = ({ icon: Icon, label, onClick, gradient }: { icon: any, label: string, onClick: () => void, gradient: string }) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col items-center justify-center p-6 gap-3 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 active:scale-95 hover:bg-white/10 shadow-2xl shadow-black/20 overflow-hidden"
  >
    {/* Hover Gradient Overlay */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
    
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="w-7 h-7" />
    </div>
    <span className="font-bold text-sm tracking-wide text-slate-100">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSessionType | null>(null);

  const startChat = (type: 'mobility' | 'support' | 'business' | 'real_estate' | 'legal', peer?: PresenceUser, isDemoMode: boolean = false, initialQuery?: string) => {
    let initialText = '';
    if (type === 'support') initialText = 'Hello! How can I help you today?';
    if (type === 'business') initialText = 'Hi! I am the Super-Discovery Agent. I can find Pharmacies, Mechanics, Shops, or any service nearby. I search both Google Maps and Social Media. What do you need?';
    if (type === 'real_estate') initialText = 'Hello! I am your Real Estate Concierge. I search across Agencies, Facebook, and Instagram to find properties. Are you looking for rent or sale?';
    if (type === 'legal') initialText = 'Muraho! Ndi "Rwanda Document Assistant". Nshobora kubafasha gutegura inyandiko z\'amasezerano cyangwa amabaruwa. Murashaka gukora iyihe nyandiko? (Hello! I am your Document Assistant. What document do you need?)';

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
        <div className="flex flex-col items-center min-h-full py-12 px-6 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-3 mt-auto">
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-blue-400 via-emerald-400 to-purple-400 drop-shadow-sm">
              easyMO
            </h1>
            <p className="text-slate-400 font-medium text-sm tracking-wide">
              Discover rides, shops & places.
            </p>
          </div>
          
          <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-auto">
            <HomeWidget 
               icon={ICONS.Home} 
               label="Find a Ride" 
               onClick={() => { setUserRole('passenger'); setMode(AppMode.DISCOVERY); }}
               gradient="from-blue-500 to-cyan-400"
            />
            <HomeWidget 
               icon={ICONS.Car} 
               label="I am a Driver" 
               onClick={() => { setUserRole('driver'); setMode(AppMode.DISCOVERY); }}
               gradient="from-violet-500 to-purple-500"
            />
            <HomeWidget 
               icon={ICONS.QrCode} 
               label="QR Generator" 
               onClick={() => setMode(AppMode.MOMO_GENERATOR)}
               gradient="from-emerald-500 to-teal-400"
            />
            <HomeWidget 
               icon={ICONS.Scan} 
               label="Smart Scanner" 
               onClick={() => setMode(AppMode.SCANNER)}
               gradient="from-orange-500 to-amber-500"
            />
          </div>

          <div className="w-full text-center pb-8 opacity-50">
             <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
               Chat-First Discovery
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
