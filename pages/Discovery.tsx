
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import Button from '../components/Button';
import VehicleSelector from '../components/Discovery/VehicleSelector';
import NearbyListCard from '../components/Discovery/NearbyListCard';
import { PresenceUser, VehicleType, Role, Location } from '../types';
import { PresenceService } from '../services/presence';
import { LocationService, getCurrentPosition } from '../services/location';

interface DiscoveryProps {
  role: Role;
  onStartChat: (peer: PresenceUser) => void;
  onBack: () => void;
}

const Discovery: React.FC<DiscoveryProps> = ({ role, onStartChat, onBack }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(role === 'vendor' ? 'shop' : 'moto');
  const [nearbyUsers, setNearbyUsers] = useState<PresenceUser[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

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
  // This runs when I am a Driver/Vendor AND Online, OR if I am a passenger (always watching)
  useEffect(() => {
    const shouldWatch = role === 'passenger' || ((role === 'driver' || role === 'vendor') && isOnline);
    
    if (shouldWatch) {
      LocationService.startWatching(
        async (loc) => {
          setCurrentLocation(loc);
          setLocationError(null);

          // Throttle updates to backend to every 5 seconds to save battery/bandwidth
          const now = Date.now();
          if (now - lastUpdateRef.current > 5000) {
            lastUpdateRef.current = now;
            
            // Prepare Broadcast Location
            let broadcastLoc = loc;
            
            // Apply privacy fuzzing if enabled and user is passenger
            if (role === 'passenger' && privacyModeRef.current) {
               // Snap to grid (~1.1km precision) to stabilize location while obscuring exact point
               // Adding a small offset to center in the "grid cell"
               broadcastLoc = {
                  lat: Math.round(loc.lat * 100) / 100 + 0.005,
                  lng: Math.round(loc.lng * 100) / 100 + 0.005
               };
            }

            // Upsert my presence
            const myType = role === 'vendor' ? 'shop' : (role === 'driver' ? selectedVehicle : undefined);
            // Passengers are always "online" when looking, Drivers only when toggled
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
  // We keep this separate so we don't spam 'getNearby' every time our own GPS moves 1 meter
  useEffect(() => {
    let interval: any;

    const fetchNearby = async () => {
      if (!currentLocation) return;
      
      try {
         // Get nearby using precise local location for correct sorting, 
         // even if we are broadcasting a fuzzed location to others.
         const typeFilter = role === 'passenger' ? selectedVehicle : undefined;
         const nearby = await PresenceService.getNearby(role, currentLocation, typeFilter);
         setNearbyUsers(nearby);
      } catch (err) {
        console.error(err);
      }
    };

    const shouldPoll = role === 'passenger' || ((role === 'driver' || role === 'vendor') && isOnline);

    if (shouldPoll) {
      // Poll every 10 seconds for others
      interval = setInterval(fetchNearby, 10000);
      fetchNearby(); // Initial fetch immediately if we have location
    } else {
      setNearbyUsers([]);
    }

    return () => clearInterval(interval);
  }, [role, isOnline, selectedVehicle, currentLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      LocationService.releaseWakeLock();
      LocationService.stopWatching();
    };
  }, []);


  return (
    <div className="flex flex-col min-h-full px-4 pt-4">
      
      {/* Header */}
      <div className="mb-4 mt-8">
        {/* Back Button */}
        <button 
           onClick={onBack}
           className="mb-4 p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1 group w-fit"
           aria-label="Go back"
        >
           <ICONS.ChevronDown className="w-5 h-5 rotate-90 group-hover:-translate-x-1 transition-transform" />
           <span className="text-sm font-semibold">Back</span>
        </button>

        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {role === 'passenger' ? 'Find Nearby' : (role === 'vendor' ? 'Vendor Mode' : 'Driver Mode')}
        </h1>
        <p className="text-sm text-slate-400">
          {role === 'passenger' 
            ? 'Select a category to see who is nearby.' 
            : 'Go online to be seen by customers.'}
        </p>
      </div>

      {/* Driver/Vendor Controls - Prominent Sticky Toggle */}
      {(role === 'driver' || role === 'vendor') && (
        <div className="sticky top-0 z-30 pb-4 bg-[#0f172a]/95 backdrop-blur-md transition-all pt-2 -mx-4 px-4 border-b border-white/5 shadow-2xl shadow-[#0f172a]">
          <div className={`
            p-5 rounded-3xl flex items-center justify-between transition-all duration-500 border relative overflow-hidden
            ${isOnline 
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]' 
              : 'bg-slate-800 border-white/5'}
          `}>
            {/* Background Gradient Mesh for Online State */}
            {isOnline && (
              <div className="absolute inset-0 bg-emerald-500/10 blur-xl pointer-events-none" />
            )}

            <div className="flex flex-col gap-1 relative z-10">
              <div className={`text-lg font-bold flex items-center gap-2 ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isOnline ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    You are Online
                  </>
                ) : (
                  'You are Offline'
                )}
              </div>
              <div className="text-xs text-slate-400 font-medium max-w-[180px]">
                {isOnline ? 'Screen awake • Sharing location' : 'Go online to start receiving requests'}
              </div>
            </div>
            
            <button 
              onClick={toggleOnline}
              className={`
                w-16 h-9 rounded-full transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] z-10
                ${isOnline ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-600 focus:ring-slate-500'}
              `}
              aria-label={isOnline ? "Go Offline" : "Go Online"}
            >
              <span className={`
                absolute top-1 w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform duration-300 flex items-center justify-center
                ${isOnline ? 'translate-x-8' : 'translate-x-1'}
              `}>
                 {isOnline && <ICONS.Check className="w-4 h-4 text-emerald-600" />}
              </span>
            </button>
          </div>
          
          {isOnline && (
             <div className="mt-2 text-[10px] text-center text-emerald-500/60 font-medium uppercase tracking-widest animate-pulse">
                High Accuracy GPS Active
             </div>
          )}
        </div>
      )}

      {/* Vehicle Selector (Only for Passenger or Driver to set their type) */}
      {role !== 'vendor' && (
        <div className="mb-6 mt-2">
          {/* Header Row for Selector */}
          <div className="flex justify-between items-end mb-2 px-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {role === 'passenger' ? 'Looking for' : 'My Vehicle'}
              </label>
              
              {/* Privacy Toggle for Passengers */}
              {role === 'passenger' && (
                <button 
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    privacyMode 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {privacyMode ? <ICONS.ShieldCheck className="w-3.5 h-3.5" /> : <ICONS.Shield className="w-3.5 h-3.5" />}
                  {privacyMode ? 'Privacy On' : 'Precise GPS'}
                </button>
              )}
          </div>
          <VehicleSelector selected={selectedVehicle} onSelect={setSelectedVehicle} />
          {role === 'passenger' && privacyMode && (
             <div className="text-[10px] text-emerald-500/70 mt-2 px-2 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               Approximate location sharing active. Drivers see you within ~1km.
             </div>
           )}
        </div>
      )}

      {/* Permission/Location Error Banner */}
      {locationError && (
        <div className="mx-0 mb-6 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 text-red-400">
                <ICONS.MapPin className="w-5 h-5" />
             </div>
             <div>
                <h3 className="font-bold text-red-200 text-sm">Location Access Required</h3>
                <p className="text-xs text-red-200/70 mt-1 leading-relaxed">
                  {locationError}
                </p>
             </div>
          </div>
          <button 
             onClick={() => window.location.reload()} 
             className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
             <ICONS.Check className="w-4 h-4" /> Reload to Retry
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 space-y-3 pb-8">
        <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-semibold">
              {(role === 'driver' || role === 'vendor') ? 'Nearby Customers' : 'Nearby Results'}
            </h2>
            {nearbyUsers.length > 0 && <span className="text-xs text-emerald-400 animate-pulse font-medium">Live Updates</span>}
        </div>
        
        {nearbyUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
             <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                <ICONS.Map className="w-8 h-8 opacity-20" />
             </div>
             <p className="text-sm">
             {role === 'passenger' 
               ? 'Searching nearby...' 
               : isOnline ? 'Scanning for customers nearby...' : 'Go online to see demand.'}
             </p>
          </div>
        ) : (
          nearbyUsers.map((user, idx) => (
            <NearbyListCard 
              key={user.sessionId} 
              user={user} 
              index={idx} 
              onChat={onStartChat} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Discovery;
