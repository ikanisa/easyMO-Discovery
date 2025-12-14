
import { PresenceUser, Role, VehicleType, Location } from '../types';
import { formatDistance } from './location';
import { supabase } from './supabase';

export const PresenceService = {
  /**
   * Driver/Vendor: Upsert location to Supabase 'presence' table.
   * Supabase Auth user_id is handled automatically.
   */
  upsertPresence: async (
    role: Role, 
    location: Location, 
    vehicleType?: VehicleType, 
    isOnline: boolean = true
  ): Promise<PresenceUser> => {
    
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    // GRACEFUL FALLBACK: If auth is broken/disabled (Offline Mode), don't crash
    if (!user) {
        // Return dummy data so the UI thinks it succeeded
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
        location: `POINT(${location.lng} ${location.lat})`, // PostGIS format
        is_online: isOnline,
        last_seen: new Date().toISOString()
      });

    if (error) console.error("Presence Upsert Error:", error);

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
    
    // Check auth before query to avoid RLS errors being noisy
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    // Call the SQL Function we defined
    const { data, error } = await supabase.rpc('get_nearby_drivers', {
      lat: location.lat,
      lng: location.lng,
      radius_meters: 5000 // 5km radius
    });

    if (error) {
      console.error("Radar Error:", error);
      return [];
    }

    if (!data) return [];

    // Transform DB result to App Type
    const results = (data as any[]).map(d => ({
      sessionId: d.user_id,
      role: 'driver' as Role,
      vehicleType: d.vehicle_type || 'moto',
      location: { lat: d.lat, lng: d.lng },
      lastSeen: new Date(d.last_seen).getTime(),
      isOnline: true,
      displayName: `Driver ${d.user_id.slice(0, 4)}`,
      distance: formatDistance(d.dist_meters / 1000),
      _distKm: d.dist_meters / 1000
    }));

    // Filter by type if requested
    const filtered = vehicleTypeFilter 
      ? results.filter(d => d.vehicleType === vehicleTypeFilter)
      : results;

    return filtered;
  },

  goOffline: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('presence').update({ is_online: false }).eq('user_id', user.id);
    }
  }
};
