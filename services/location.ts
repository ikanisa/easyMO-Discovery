
import { Location, VehicleType } from '../types';

const PERMISSION_KEY = 'easyMO_location_setup_complete';
const ENABLED_KEY = 'easyMO_location_enabled';

const getFriendlyError = (err: GeolocationPositionError): string => {
  switch(err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Please enable it in browser settings.";
    case err.POSITION_UNAVAILABLE:
      return "Location unavailable. Check GPS.";
    case err.TIMEOUT:
      return "Location request timed out.";
    default:
      return err.message || "Unknown location error.";
  }
};

export const LocationService = {
  /**
   * Checks if the initial onboarding setup for location was completed.
   */
  isSetupComplete: (): boolean => {
    return localStorage.getItem(PERMISSION_KEY) === 'true';
  },

  setSetupComplete: (complete: boolean = true) => {
    localStorage.setItem(PERMISSION_KEY, String(complete));
  },

  /**
   * App-level toggle state.
   */
  isEnabled: (): boolean => {
    return localStorage.getItem(ENABLED_KEY) !== 'false'; // Default to true
  },

  setEnabled: (enabled: boolean) => {
    localStorage.setItem(ENABLED_KEY, String(enabled));
    if (!enabled) {
      LocationService.stopWatching();
    }
  },

  getCurrentPosition: (retries = 2): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported.'));
        return;
      }

      const attempt = (remainingRetries: number) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            LocationService.setSetupComplete();
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => {
            if (remainingRetries > 0) {
                const delay = Math.pow(2, 2 - remainingRetries) * 1000;
                setTimeout(() => attempt(remainingRetries - 1), delay);
            } else {
                reject(new Error(getFriendlyError(err)));
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      };

      attempt(retries);
    });
  },

  calculateDistance: (loc1: Location, loc2: Location): number => {
    const R = 6371;
    const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
    const dLon = (loc2.lng - loc1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  formatDistance: (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  },

  /**
   * Calculates ETA based on distance and vehicle type.
   * Speeds adapted for Rwanda urban conditions (e.g. Moto filters through traffic).
   */
  calculateETA: (distanceKm: number, vehicleType: VehicleType | string = 'moto'): string => {
    let averageSpeedKmH = 25; 
    switch(vehicleType) {
        case 'moto': averageSpeedKmH = 35; break; // Fast in traffic
        case 'cab':
        case 'liffan':
        case 'car': averageSpeedKmH = 20; break; // Urban traffic
        case 'truck': averageSpeedKmH = 15; break;
        case 'bicycle': averageSpeedKmH = 12; break;
        default: averageSpeedKmH = 25;
    }
    
    const timeHours = distanceKm / averageSpeedKmH;
    const timeMinutes = Math.round(timeHours * 60) + 1; // +1 min buffer for stops
    
    if (timeMinutes < 2) return '2 min';
    if (timeMinutes > 60) {
        const h = Math.floor(timeMinutes / 60);
        const m = timeMinutes % 60;
        return h > 1 ? `${h}h ${m}m` : `1h ${m}m`;
    }
    return `${timeMinutes} min`;
  },

  watchId: null as number | null,
  wakeLock: null as WakeLockSentinel | null,

  startWatching: (
    onUpdate: (loc: Location) => void,
    onError: (err: string) => void
  ) => {
    if (!navigator.geolocation || !LocationService.isEnabled()) {
      return;
    }

    if (LocationService.watchId !== null) {
        navigator.geolocation.clearWatch(LocationService.watchId);
    }

    LocationService.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
             onError(getFriendlyError(err));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0, 
      }
    );
  },

  stopWatching: () => {
    if (LocationService.watchId !== null) {
      navigator.geolocation.clearWatch(LocationService.watchId);
      LocationService.watchId = null;
    }
  },

  requestWakeLock: async () => {
    if ('wakeLock' in navigator) {
      try {
        LocationService.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (err: any) {
        console.warn(`Wake Lock Error: ${err.name}, ${err.message}`);
      }
    }
  },

  releaseWakeLock: async () => {
    if (LocationService.wakeLock !== null) {
      try {
        await LocationService.wakeLock.release();
        LocationService.wakeLock = null;
      } catch (e) {
        console.warn('Error releasing wake lock', e);
      }
    }
  },
};

export const getCurrentPosition = LocationService.getCurrentPosition;
export const calculateDistance = LocationService.calculateDistance;
export const formatDistance = LocationService.formatDistance;
export const calculateETA = LocationService.calculateETA;
