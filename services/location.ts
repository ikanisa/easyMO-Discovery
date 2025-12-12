
import { Location } from '../types';

const getFriendlyError = (err: GeolocationPositionError): string => {
  switch(err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Please enable location access in your browser settings or address bar permissions.";
    case err.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Please check your device GPS settings and signal.";
    case err.TIMEOUT:
      return "Location request timed out. Please ensure you have a clear signal and try again.";
    default:
      return err.message || "An unknown location error occurred. Please try again.";
  }
};

export const getCurrentPosition = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => reject(new Error(getFriendlyError(err))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  });
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(loc2.lat - loc1.lat);
  const dLon = deg2rad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

// State for watcher and wake lock
let watchId: number | null = null;
let wakeLock: WakeLockSentinel | null = null;

async function handleVisibilityChange() {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    // Re-request lock if we come back to foreground and lost it
    await LocationService.requestWakeLock();
  }
}

export const LocationService = {
  /**
   * Starts watching the user's location with high accuracy.
   * optimized for driving (updates as you move).
   */
  startWatching: (
    onUpdate: (loc: Location) => void,
    onError: (err: string) => void
  ) => {
    if (!navigator.geolocation) {
      onError('Geolocation not supported');
      return;
    }

    if (watchId !== null) return; // Already watching

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.error('Location Watch Error:', err);
        onError(getFriendlyError(err));
      },
      {
        enableHighAccuracy: true, // Essential for drivers
        timeout: 15000,
        maximumAge: 0, // Force fresh location
      }
    );
  },

  /**
   * Stops watching location.
   */
  stopWatching: () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  },

  /**
   * Requests a Screen Wake Lock to keep the app running in the foreground.
   * This mimics "Background Mode" by preventing the phone from sleeping.
   */
  requestWakeLock: async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Screen Wake Lock active');
        
        // Re-acquire lock if visibility changes (tab switching)
        document.addEventListener('visibilitychange', handleVisibilityChange);
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  },

  /**
   * Releases the Screen Wake Lock.
   */
  releaseWakeLock: async () => {
    if (wakeLock !== null) {
      await wakeLock.release();
      wakeLock = null;
      console.log('Screen Wake Lock released');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  },

  calculateDistance,
  formatDistance
};
