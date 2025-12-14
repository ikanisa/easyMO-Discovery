
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../../constants';
import VehicleSelector from '../components/Discovery/VehicleSelector';
import NearbyListCard from '../components/Discovery/NearbyListCard';
import ScheduleModal from '../components/Scheduling/ScheduleModal';
import SmartLocationInput from '../components/Location/SmartLocationInput';
import { PresenceUser, VehicleType, Role, Location } from '../types';
import { PresenceService } from '../services/presence';
import { LocationService } from '../services/location';
import { CONFIG } from '../config';

interface DiscoveryProps {
  role: Role;
  onStartChat: (peer: PresenceUser) => void;
  onBack: () => void;
}

const RadarView = ({ active, text }: { active: boolean, text: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-8 animate-in fade-in zoom-in duration-700 relative">
     {/* Ambient Glow */}
     <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-0'}`} />

     <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Ripples */}
        {active && (
          <>
            <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-16 border border-cyan-500/30 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
            <div className="absolute inset-32 border border-cyan-500/40 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1.5s]" />
          </>
        )}
        
        {/* Static Rings */}
        <div className="absolute inset-0 border border-slate-200 dark:border-white/5 rounded-full" />
        <div className="absolute inset-20 border border-slate-200 dark:border-white/5 rounded-full border-dashed" />
        <div className="absolute inset-36 border border-slate-200 dark:border-white/5 rounded-full" />

        {/* Center Node */}
        <div className={`
           w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl z-10 border transition-all duration-500
           ${active 
             ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-white/20 shadow-cyan-500/40 scale-110' 
             : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400'}
        `}>
           <ICONS.Map className={`w-8 h-8 transition-colors duration-500 ${active ? 'text-white' : 'text-slate-400'}`} />
        </div>
        
        {/* Radar Sweep Gradient */}
        {active && (
           <div className="absolute inset-0 rounded-full overflow-hidden animate-[spin_4s_linear_infinite]">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/10 to-transparent absolute top-0 left-0 origin-bottom-right rounded-tl-full blur-sm" />
           </div>
        )}
     </div>
     
     <div className="text-center space-y-3 z-10">
       <p className="text-sm font-bold tracking-[0.2em] uppercase text-slate-600 dark:text-slate-400">
         {text}
       </p>
       {active && (
         <div className="flex gap-1 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
         </div>
       )}
     </div>
  </div>
);

const Discovery: React.FC<DiscoveryProps> = ({ role, onStartChat, onBack }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(role === 'vendor' ? 'shop' : 'moto');
  const [nearbyUsers, setNearbyUsers] = useState<PresenceUser[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  
  // Connection Status
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Driver/Vendor specific state
  const [isOnline, setIsOnline] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const privacyModeRef = useRef(false);

  // Update privacy mode ref
  useEffect(() => {
    privacyModeRef.current = privacyMode;
  }, [privacyMode]);

  // Handle Driver/Vendor Toggle
  const toggleOnline = async () => {
    const newState = !isOnline;
    setIsOnline(newState);
    
    if (newState) {
      // GOING ONLINE: Start Wake Lock & Watcher
      await LocationService.requestWakeLock();
    } else {
      // GOING OFFLINE: Stop Wake Lock & Watcher
      await LocationService.releaseWakeLock();
      await PresenceService.goOffline();
      setNearbyUsers([]);
      // Stop watcher handled in useEffect cleanup
    }
  };

  // Effect 1: Handle Location Watching (Sending my location)
  useEffect(() => {
    const shouldWatch = role === 'passenger' || ((role === 'driver' || role === 'vendor') && isOnline);
    
    if (shouldWatch) {
      LocationService.startWatching(
        async (loc) => {
          setCurrentLocation(loc);
          setLocationError(null);

          const now = Date.now();
          // BROADCAST THROTTLE: Only update backend every 60 seconds (60000ms)
          if (now - lastUpdateRef.current > 60000) {
            lastUpdateRef.current = now;
            
            let broadcastLoc = loc;
            if (role === 'passenger' && privacyModeRef.current) {
               broadcastLoc = {
                  lat: Math.round(loc.lat * 100) / 100 + 0.005,
                  lng: Math.round(loc.lng * 100) / 100 + 0.005
               };
            }

            const myType = role === 'vendor' ? 'shop' : (role === 'driver' ? selectedVehicle : undefined);
            await PresenceService.upsertPresence(role, broadcastLoc, myType, true);
          }
        },
        (err) => setLocationError(err)
      );
    } else {
      LocationService.stopWatching();
    }

    return () => {
      LocationService.stopWatching();
    };
  }, [role, isOnline, selectedVehicle]);

  // Effect 2: Polling Nearby Users (Receiving others)
  useEffect(() => {
    let timer: any;
    let isActive = true;

    const fetchNearby = async () => {
      if (!currentLocation) {
          if (isActive) timer = setTimeout(fetchNearby, 2000);
          return;
      }
      
      setIsUpdating(true);
      try {
         const typeFilter = role === 'passenger' ? selectedVehicle : undefined;
         const nearby = await PresenceService.getNearby(role, currentLocation, typeFilter);
         if (isActive) setNearbyUsers(nearby);
      } catch (err) {
        console.error(err);
      } finally {
        if (isActive) setIsUpdating(false);
        if (isActive) timer = setTimeout(fetchNearby, 15000); // Poll every 15s to save quota
      }
    };

    const shouldPoll = role === 'passenger' || ((role === 'driver' || role === 'vendor') && isOnline);

    if (shouldPoll) {
      fetchNearby(); 
    } else {
      setNearbyUsers([]);
    }

    return () => {
        isActive = false;
        clearTimeout(timer);
    };
  }, [role, isOnline, selectedVehicle, currentLocation]); 

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      LocationService.releaseWakeLock();
      LocationService.stopWatching();
    };
  }, []);

  const handleScheduleConfirm = (details: any) => {
      // Mock Scheduling Logic
      console.log("Trip Scheduled:", details);
      alert(`Trip scheduled for ${details.date} at ${details.time} (${details.recurrence}).`);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-500">
      
      {showScheduleModal && (
          <ScheduleModal 
            onClose={() => setShowScheduleModal(false)}
            onSchedule={handleScheduleConfirm}
          />
      )}

      {/* Liquid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-400/10 dark:bg-purple-600/10 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite_1s]" />
      </div>

      {/* Header */}
      <div className="relative z-30 px-6 pt-8 pb-2 flex justify-between items-center">
        <button 
           onClick={onBack}
           className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-95 group shadow-sm hover:bg-white dark:hover:bg-white/10"
        >
           <ICONS.ChevronDown className="w-5 h-5 rotate-90 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white" />
        </button>
        
        {role === 'passenger' && (
           <div className="px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300">Live Map</span>
           </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 px-4 pb-32 relative z-10 overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Page Title */}
        <div className="mt-4 mb-8 px-2 flex justify-between items-end">
           <div>
               <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 tracking-tight leading-tight">
                 {role === 'passenger' ? 'Find a Ride' : (role === 'vendor' ? 'Vendor Portal' : 'Driver Portal')}
               </h1>
               <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                 {role === 'passenger' ? 'Tap a driver to start chatting.' : 'Manage your status below.'}
               </p>
           </div>
           
           <button 
             onClick={() => setShowScheduleModal(true)}
             className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
           >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-blue-500 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                  <ICONS.Calendar className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">Plan</span>
           </button>
        </div>

        {/* Destination Input (Passenger) */}
        {role === 'passenger' && (
           <div className="mb-8 animate-in slide-in-from-bottom-2 fade-in">
              <SmartLocationInput 
                 label="Where to?"
                 value={destinationQuery}
                 onChange={setDestinationQuery}
                 placeholder="Search destination..."
              />
           </div>
        )}

        {/* DRIVER: Status Toggle */}
        {(role === 'driver' || role === 'vendor') && (
          <div className="mb-10 animate-in slide-in-from-bottom-4 duration-700">
            <div className={`
              relative p-1 rounded-[2.5rem] transition-all duration-500 group
              ${isOnline 
                ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_20px_50px_-10px_rgba(16,185,129,0.3)]' 
                : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'}
            `}>
              <div className={`
                 w-full rounded-[2.4rem] p-8 flex flex-col items-center text-center backdrop-blur-xl transition-all duration-500 relative overflow-hidden
                 ${isOnline ? 'bg-white/90 dark:bg-slate-900/90' : 'bg-slate-50/90 dark:bg-[#0f172a]/90'}
              `}>
                 <div className="mb-6 relative">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-4 ring-emerald-500/20 scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-4 ring-slate-200 dark:ring-white/5'}`}>
                       {isOnline ? <ICONS.Broadcast className="w-10 h-10 animate-pulse" /> : <ICONS.Moon className="w-10 h-10" />}
                    </div>
                 </div>

                 <h2 className={`text-2xl font-black mb-2 transition-colors duration-500 ${isOnline ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {isOnline ? 'You are Online' : 'You are Offline'}
                 </h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-[200px] leading-relaxed">
                    {isOnline ? 'Broadcasting location to nearby passengers.' : 'Go online to start receiving requests.'}
                 </p>

                 <button 
                   onClick={toggleOnline}
                   className={`
                     w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl
                     ${isOnline 
                        ? 'bg-white dark:bg-white/10 hover:bg-slate-50 text-red-500 border border-red-500/10' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'}
                   `}
                 >
                    {isOnline ? 'Stop Sharing' : 'Go Online Now'}
                 </button>
              </div>
            </div>
            
            {role === 'driver' && (
               <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-end mb-4 px-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        My Vehicle
                      </label>
                  </div>
                  <VehicleSelector selected={selectedVehicle} onSelect={setSelectedVehicle} />
               </div>
            )}
          </div>
        )}

        {/* PASSENGER: Vehicle Selector */}
        {role !== 'vendor' && role !== 'driver' && (
          <div className="mb-10 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex justify-between items-center mb-4 px-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  Vehicle Type
                </label>
                
                <button 
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                    ${privacyMode 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}
                  `}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${privacyMode ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
                  {privacyMode ? 'Fuzzy Loc' : 'Exact Loc'}
                </button>
            </div>
            
            <VehicleSelector selected={selectedVehicle} onSelect={setSelectedVehicle} />
          </div>
        )}

        {/* Error State */}
        {locationError && (
          <div className="mb-6 mx-2 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-4 animate-in fade-in backdrop-blur-md">
             <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-500">
                <ICONS.MapPin className="w-5 h-5" />
             </div>
             <div className="flex-1">
                <h3 className="font-bold text-red-600 dark:text-red-400 text-xs uppercase tracking-wide mb-1">GPS Error</h3>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 leading-relaxed">{locationError}</p>
             </div>
             <button onClick={() => window.location.reload()} className="p-2 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                <ICONS.Check className="w-4 h-4" />
             </button>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 min-h-[300px]">
          <div className="flex justify-between items-end mb-4 px-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {(role === 'driver' || role === 'vendor') ? 'Live Requests' : 'Nearby Drivers'}
                {isUpdating && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping ml-1" />}
              </h2>
              {nearbyUsers.length > 0 && (
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                  {nearbyUsers.length} FOUND
                </span>
              )}
          </div>
          
          {nearbyUsers.length === 0 ? (
            <RadarView 
               active={role === 'passenger' || isOnline} 
               text={role === 'passenger' 
                 ? `Scanning for ${selectedVehicle}...` 
                 : isOnline ? 'Waiting for requests...' : 'Go online to start'}
            />
          ) : (
            <div className="space-y-4 pb-20">
              {nearbyUsers.map((user, idx) => (
                <NearbyListCard 
                  key={user.sessionId} 
                  user={user} 
                  index={idx} 
                  onChat={onStartChat} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* FAB: Schedule (Passenger) */}
      {role === 'passenger' && (
        <button
            onClick={() => setShowScheduleModal(true)}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-in zoom-in duration-500 border border-white/20"
            aria-label="Schedule a Trip"
        >
            <ICONS.Calendar className="w-6 h-6" />
        </button>
      )}

    </div>
  );
};

export default Discovery;
