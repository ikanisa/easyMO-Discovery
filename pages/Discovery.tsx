
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import NearbyListCard from '../components/Discovery/NearbyListCard';
import ScheduleModal from '../components/Scheduling/ScheduleModal';
import SmartLocationInput from '../components/Location/SmartLocationInput';
import { PresenceUser, VehicleType, Role, Location } from '../types';
import { PresenceService } from '../services/presence';
import { LocationService } from '../services/location';
import { GeminiService } from '../services/gemini';
import { NetworkService } from '../services/supabase';
import { useUIStore } from '../state/uiStore';

interface DiscoveryProps {
  role: Role;
  onStartChat: (peer: PresenceUser) => void;
  onBack: () => void;
}

const VEHICLE_FILTERS: { id: VehicleType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'moto', label: 'Moto' },
  { id: 'cab', label: 'Cab' },
  { id: 'liffan', label: 'Liffan' },
  { id: 'truck', label: 'Truck' },
  { id: 'other', label: 'Bus/Other' }
];

const Discovery: React.FC<DiscoveryProps> = ({ role, onStartChat, onBack }) => {
  const [activeFilter, setActiveFilter] = useState<VehicleType | 'all'>('all');
  const [nearbyUsers, setNearbyUsers] = useState<PresenceUser[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationContext, setLocationContext] = useState<string>("Locating...");
  const [isOnline, setIsOnline] = useState(NetworkService.isOnline());
  
  // Driver Specific
  const [isDrivingOnline, setIsDrivingOnline] = useState(false);
  const [myVehicleType, setMyVehicleType] = useState<VehicleType>('moto'); 

  // State
  const { isScheduleSheetOpen, openScheduleSheet, closeScheduleSheet } = useUIStore();
  const lastUpdateRef = useRef<number>(0);

  // 1. Connectivity Listener
  useEffect(() => {
    const handleConnectivity = (status: boolean) => {
        setIsOnline(status);
        if (status) {
            // Force a sync and refresh when coming back online
            PresenceService.syncPending();
            if (currentLocation) fetchNearbyNow();
        }
    };
    NetworkService.addListener(handleConnectivity);
    return () => NetworkService.removeListener(handleConnectivity);
  }, [currentLocation]);

  // 2. Initial Load & Location Watch
  useEffect(() => {
    LocationService.startWatching(
      async (loc) => {
        setCurrentLocation(loc);
        setLocationError(null);

        // Get Gemini Context once (debounced)
        if (locationContext === "Locating..." && isOnline) {
            try {
                const insight = await GeminiService.getLocationInsight(loc.lat, loc.lng);
                setLocationContext(insight);
            } catch(e) {
                setLocationContext("Unknown Area");
            }
        }

        // Broadcast presence if driver/online or passenger
        const now = Date.now();
        if (now - lastUpdateRef.current > 30000) {
            lastUpdateRef.current = now;
            if (role === 'passenger' || (role === 'driver' && isDrivingOnline)) {
                await PresenceService.upsertPresence(
                    role, 
                    loc, 
                    role === 'driver' ? myVehicleType : undefined, 
                    true
                );
            }
        }
      },
      (err) => setLocationError(err)
    );

    return () => LocationService.stopWatching();
  }, [role, isDrivingOnline, myVehicleType, isOnline]);

  const fetchNearbyNow = async () => {
      if (!currentLocation || !isOnline) return;
      try {
         const targetRole: Role = role === 'passenger' ? 'driver' : 'passenger';
         const users = await PresenceService.getNearby(targetRole, currentLocation);
         setNearbyUsers(users);
      } catch (err) {
        console.error(err);
      }
  };

  // 3. Fetch Nearby Users (Polling)
  useEffect(() => {
    let timer: any;
    let isActive = true;

    const fetchLoop = async () => {
      if (!currentLocation || !isOnline) {
          if (isActive) timer = setTimeout(fetchLoop, 2000);
          return;
      }
      
      await fetchNearbyNow();
      if (isActive) timer = setTimeout(fetchLoop, 10000);
    };

    fetchLoop();
    return () => clearTimeout(timer);
  }, [currentLocation, role, isOnline]);

  // Filter Logic
  const filteredUsers = nearbyUsers.filter(u => {
      if (activeFilter === 'all') return true;
      return u.vehicleType === activeFilter;
  });

  const toggleOnline = async () => {
      if (!isOnline) return; // Prevent toggle when network is down
      
      const newState = !isDrivingOnline;
      setIsDrivingOnline(newState);
      if (newState) {
          await LocationService.requestWakeLock();
          // Force immediate update
          if (currentLocation) {
              await PresenceService.upsertPresence(role, currentLocation, myVehicleType, true);
          }
      } else {
          await LocationService.releaseWakeLock();
          await PresenceService.goOffline();
      }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-[#0f172a] relative overflow-hidden transition-colors duration-500">
      <ScheduleModal open={isScheduleSheetOpen} onClose={closeScheduleSheet} onSchedule={() => {}} />

      {/* Offline Banner */}
      {!isOnline && (
          <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1.5 text-center animate-in slide-in-from-top duration-300 z-50">
              Offline Mode • Limited Discovery
          </div>
      )}

      {/* Header */}
      <div className="relative z-30 px-6 pt-6 pb-4 flex justify-between items-start bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
               <ICONS.ChevronDown className="w-5 h-5 rotate-90 text-slate-700 dark:text-slate-300" />
            </button>
            <div>
               <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                 {role === 'passenger' ? 'Find Ride' : 'Passengers'}
               </h1>
               <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  <ICONS.MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[150px] animate-in fade-in">{locationContext}</span>
               </div>
            </div>
        </div>
        
        {role === 'driver' && (
            <button 
                onClick={toggleOnline}
                disabled={!isOnline}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg ${
                    !isOnline ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed' :
                    isDrivingOnline ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 
                    'bg-slate-200 dark:bg-slate-800 text-slate-600'
                }`}
            >
                {isDrivingOnline ? 'Online' : 'Go Online'}
            </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4 pb-32 overflow-y-auto no-scrollbar">
        
        {/* Error State */}
        {locationError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
             <ICONS.MapPin className="w-4 h-4" /> {locationError}
          </div>
        )}

        {/* Offline Warning */}
        {!isOnline && (
            <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <ICONS.XMark className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">No Connection</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
                        Showing results from your last session. Location tracking will resume and sync once you are back online.
                    </p>
                </div>
            </div>
        )}

        {/* Filters (Passenger Only) */}
        {role === 'passenger' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                {VEHICLE_FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`
                            px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all
                            ${activeFilter === f.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/10'}
                        `}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        )}

        {/* Results List */}
        {currentLocation && (
            <div className="space-y-3">
                <div className="flex justify-between items-end px-1 mb-2">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {role === 'passenger' ? 'Nearest Drivers' : 'Nearby Requests'}
                    </h3>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md font-black">
                        {filteredUsers.length} Found
                    </span>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-inner">
                            <ICONS.Search className="w-8 h-8" />
                        </div>
                        <p className="text-slate-600 text-sm font-bold text-center mb-6 px-8">
                            {isOnline 
                                ? `No active ${role === 'passenger' ? 'drivers' : 'passengers'} found nearby.` 
                                : `Reconnect to see live ${role === 'passenger' ? 'drivers' : 'passengers'}.`}
                        </p>
                    </div>
                ) : (
                    filteredUsers.map((user, idx) => (
                        <NearbyListCard 
                            key={user.sessionId} 
                            user={user} 
                            index={idx} 
                            onChat={onStartChat} 
                        />
                    ))
                )}
            </div>
        )}
      </div>

      {/* FAB */}
      {role === 'passenger' && isOnline && (
        <button
            onClick={openScheduleSheet}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-in zoom-in border border-white/20"
        >
            <ICONS.Calendar className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Discovery;
