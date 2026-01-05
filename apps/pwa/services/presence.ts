
import { PresenceUser, Role, VehicleType, Location } from '@easymo/shared/types';
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

    // Update the DB using RPC function (with TTL and metadata)
    const { error } = await supabase.rpc('create_or_refresh_presence', {
      p_user_id: user.id,
      p_role: role,
      p_lat: location.lat,
      p_lng: location.lng,
      p_is_online: isOnline,
      p_ttl_seconds: 3600, // 1 hour TTL
      p_meta: vehicleType ? { vehicle_type: vehicleType } : {}
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
   * Passenger/Driver: Query nearby presence using RPC function 'get_nearby_presence'.
   * This replaces the old get_nearby_drivers function and supports all roles.
   */
  getNearby: async (role: Role, location: Location, vehicleTypeFilter?: VehicleType): Promise<PresenceUser[]> => {
    if (!NetworkService.isOnline()) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    // Use the new get_nearby_presence RPC function
    const { data, error } = await supabase.rpc('get_nearby_presence', {
      p_role: role,
      p_lat: location.lat,
      p_lng: location.lng,
      p_radius_m: 5000, // 5km default radius
      p_limit: 50
    });

    if (error) {
      console.error("Radar Error:", error);
      return [];
    }

    if (!data) return [];

    const results = (data as any[]).map(d => {
      const distKm = d.distance_m / 1000;
      // Extract vehicle_type from meta JSONB if available
      const vType = (d.meta?.vehicle_type || 'moto') as VehicleType;
      
      return {
        sessionId: d.user_id,
        role: d.role as Role,
        vehicleType: vType,
        location: { lat: d.lat, lng: d.lng },
        lastSeen: new Date(d.last_seen_at).getTime(),
        isOnline: d.is_online,
        displayName: `${d.role} ${d.user_id.slice(0, 4)}`,
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
      // Use RPC function to update presence (sets is_online to false)
      // We'll update with a very short TTL to mark as offline
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get current presence to preserve role and location
        const { data: currentPresence } = await supabase
          .from('presence')
          .select('role, lat, lng')
          .eq('user_id', user.id)
          .single();
        
        if (currentPresence) {
          await supabase.rpc('create_or_refresh_presence', {
            p_user_id: user.id,
            p_role: currentPresence.role,
            p_lat: currentPresence.lat,
            p_lng: currentPresence.lng,
            p_is_online: false,
            p_ttl_seconds: 60, // Short TTL for offline status
            p_meta: {}
          });
        }
      }
    }
  }
};

// Global Listener for Auto-Sync
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        PresenceService.syncPending();
    });
}
