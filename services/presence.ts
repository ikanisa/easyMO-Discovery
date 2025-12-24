
import { PresenceUser, Role, VehicleType, Location } from '../types';
import { formatDistance, calculateETA } from './location';
import { supabase, NetworkService } from './supabase';

const PENDING_UPDATE_KEY = 'easyMO_pending_presence';

export const PresenceService = {
  /**
   * Syncs any locally cached presence updates that failed during offline periods.
   */
  syncPending: async (): Promise<boolean> => {
    if (!NetworkService.isOnline()) return false;
    
    const pending = localStorage.getItem(PENDING_UPDATE_KEY);
    if (!pending) return true;

    try {
      const { role, location, vehicleType, isOnline } = JSON.parse(pending);
      console.debug('Syncing pending presence update...');
      await PresenceService.upsertPresence(role, location, vehicleType, isOnline);
      localStorage.removeItem(PENDING_UPDATE_KEY);
      return true;
    } catch (e) {
      console.error('Failed to sync pending presence', e);
      return false;
    }
  },

  /**
   * Driver/Vendor: Upsert location to Supabase 'presence' table.
   * Includes offline queuing logic.
   */
  upsertPresence: async (
    role: Role, 
    location: Location, 
    vehicleType?: VehicleType, 
    isOnline: boolean = true
  ): Promise<PresenceUser> => {
    
    // OFFLINE QUEUING: Save to local storage if network is down
    if (!NetworkService.isOnline()) {
        localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify({ 
            role, 
            location, 
            vehicleType, 
            isOnline,
            timestamp: Date.now() 
        }));
        
        return {
            sessionId: 'pending-sync',
            role,
            location,
            vehicleType,
            isOnline,
            lastSeen: Date.now(),
            displayName: 'Me (Offline)'
        };
    }

    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return {
            sessionId: 'offline-guest',
            role,
            location,
            vehicleType,
            isOnline,
            lastSeen: Date.now(),
            displayName: 'Guest (Offline)'
        };
    }

    // Update the DB
    const { error } = await supabase
      .from('presence')
      .upsert({
        user_id: user.id,
        role: role,
        vehicle_type: vehicleType || 'other',
        location: `POINT(${location.lng} ${location.lat})`, 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      });

    if (error) {
        console.error("Presence Upsert Error:", error);
        // Queue for retry if it's a network error disguised as a generic error
        localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify({ role, location, vehicleType, isOnline }));
    } else {
        // Clear queue on success
        localStorage.removeItem(PENDING_UPDATE_KEY);
    }

    return {
      sessionId: user.id,
      role,
      location,
      vehicleType,
      isOnline,
      lastSeen: Date.now(),
      displayName: 'Me'
    };
  },

  /**
   * Passenger: Query drivers using PostGIS RPC function 'get_nearby_drivers'.
   */
  getNearby: async (role: Role, location: Location, vehicleTypeFilter?: VehicleType): Promise<PresenceUser[]> => {
    if (!NetworkService.isOnline()) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data, error } = await supabase.rpc('get_nearby_drivers', {
      user_lat: location.lat,
      user_lng: location.lng,
      radius_meters: 5000 
    });

    if (error) {
      console.error("Radar Error:", error);
      return [];
    }

    if (!data) return [];

    const results = (data as any[]).map(d => {
      const distKm = d.dist_meters / 1000;
      const vType = d.vehicle_type || 'moto';
      
      return {
        sessionId: d.user_id,
        role: 'driver' as Role,
        vehicleType: vType,
        location: { lat: d.lat, lng: d.lng },
        lastSeen: new Date(d.last_seen).getTime(),
        isOnline: true,
        displayName: `Driver ${d.user_id.slice(0, 4)}`,
        distance: formatDistance(distKm),
        eta: calculateETA(distKm, vType),
        _distKm: distKm
      };
    });

    const filtered = vehicleTypeFilter 
      ? results.filter(d => d.vehicleType === vehicleTypeFilter)
      : results;

    return filtered;
  },

  goOffline: async () => {
    if (!NetworkService.isOnline()) {
        localStorage.removeItem(PENDING_UPDATE_KEY);
        return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('presence').update({ is_online: false }).eq('user_id', user.id);
    }
  }
};

// Global Listener for Auto-Sync
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        PresenceService.syncPending();
    });
}
