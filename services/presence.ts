import { PresenceUser, Role, VehicleType, Location } from '../types';
import { formatDistance, calculateDistance } from './location';

// Mock DB in memory - shared state
// Using a Map to easily handle upserts and removals by sessionId
const worldState = new Map<string, PresenceUser>();

let currentUserSessionId: string | null = null;

// Mock data generation
const generateMockUsers = (center: Location, type: 'drivers' | 'vendors' | 'passengers') => {
  if (type === 'drivers') {
    const types: VehicleType[] = ['moto', 'moto', 'moto', 'cab', 'truck'];
    for (let i = 0; i < 5; i++) {
      const id = `mock-driver-${i}`;
      if (!worldState.has(id)) {
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lngOffset = (Math.random() - 0.5) * 0.01;
        worldState.set(id, {
          sessionId: id,
          role: 'driver',
          vehicleType: types[i % types.length],
          location: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
          lastSeen: Date.now(),
          isOnline: true,
          displayName: `Driver ${i + 1}`
        });
      }
    }
  } else if (type === 'vendors') {
    const shopNames = ['Kiosk 1', 'Fresh Market', 'Mobile Money', 'Tech Fix'];
    for (let i = 0; i < 4; i++) {
      const id = `mock-vendor-${i}`;
      if (!worldState.has(id)) {
        const latOffset = (Math.random() - 0.5) * 0.008;
        const lngOffset = (Math.random() - 0.5) * 0.008;
        worldState.set(id, {
          sessionId: id,
          role: 'vendor',
          vehicleType: 'shop',
          location: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
          lastSeen: Date.now(),
          isOnline: true,
          displayName: shopNames[i]
        });
      }
    }
  } else if (type === 'passengers') {
    // Generate some mock passengers for drivers/vendors to see
    for (let i = 0; i < 3; i++) {
      const id = `mock-pax-${i}`;
      if (!worldState.has(id)) {
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lngOffset = (Math.random() - 0.5) * 0.01;
        worldState.set(id, {
          sessionId: id,
          role: 'passenger',
          location: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
          lastSeen: Date.now(),
          isOnline: true,
          displayName: `Passenger ${i + 1}`
        });
      }
    }
  }
};

export const PresenceService = {
  upsertPresence: async (
    role: Role, 
    location: Location, 
    vehicleType?: VehicleType, 
    isOnline: boolean = true
  ): Promise<PresenceUser> => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 200));

    if (!currentUserSessionId) {
      currentUserSessionId = `user-${Date.now()}`;
    }

    const user: PresenceUser = {
      sessionId: currentUserSessionId,
      role,
      location,
      vehicleType,
      isOnline,
      lastSeen: Date.now(),
      displayName: 'Me'
    };
    
    // Update world state
    if (isOnline) {
      worldState.set(user.sessionId, user);
    } else {
      worldState.delete(user.sessionId);
    }

    return user;
  },

  getNearby: async (role: Role, location: Location, vehicleTypeFilter?: VehicleType): Promise<PresenceUser[]> => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 500));

    // Ensure we have some mocks around to make the app feel alive
    const hasDrivers = Array.from(worldState.values()).some(u => u.role === 'driver' && !u.sessionId.startsWith('user-'));
    const hasVendors = Array.from(worldState.values()).some(u => u.role === 'vendor' && !u.sessionId.startsWith('user-'));
    const hasPax = Array.from(worldState.values()).some(u => u.role === 'passenger' && !u.sessionId.startsWith('user-'));

    if (!hasDrivers) generateMockUsers(location, 'drivers');
    if (!hasVendors) generateMockUsers(location, 'vendors');
    if (!hasPax) generateMockUsers(location, 'passengers');

    // Filtering Logic
    let results = Array.from(worldState.values());

    // Filter out self
    if (currentUserSessionId) {
      results = results.filter(u => u.sessionId !== currentUserSessionId);
    }

    if (role === 'passenger') {
      // Passengers look for: Vendors (if shop) OR Drivers (if transport)
      if (vehicleTypeFilter === 'shop') {
        results = results.filter(u => u.role === 'vendor' && u.isOnline);
      } else {
        results = results.filter(u => u.role === 'driver' && u.isOnline);
        if (vehicleTypeFilter) {
          results = results.filter(u => u.vehicleType === vehicleTypeFilter);
        }
      }
    } else {
      // Drivers/Vendors look for Passengers
      results = results.filter(u => u.role === 'passenger');
    }
    
    // Calculate distances and sort
    return results
      .map(u => {
        const distKm = calculateDistance(location, u.location);
        return {
          ...u,
          distance: formatDistance(distKm),
          _distKm: distKm
        };
      })
      .sort((a, b) => a._distKm - b._distKm);
  },

  goOffline: async () => {
    if (currentUserSessionId) {
       worldState.delete(currentUserSessionId);
    }
  }
};