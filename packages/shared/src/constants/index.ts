/**
 * Shared constants for easyMO Discovery
 */

export const ICONS = {
  mobility: '🚗',
  marketplace: '🛍️',
  payments: '💳',
  support: '💬',
  legal: '⚖️',
  realEstate: '🏠',
  business: '🏪',
} as const;

export const ROLES = {
  PASSENGER: 'passenger',
  DRIVER: 'driver',
  VENDOR: 'vendor',
} as const;

export const VEHICLE_TYPES = {
  MOTO: 'moto',
  CAB: 'cab',
  LIFFAN: 'liffan',
  TRUCK: 'truck',
  OTHER: 'other',
  SHOP: 'shop',
} as const;

export const AGENT_TYPES = {
  MOBILITY: 'mobility',
  MARKETPLACE: 'marketplace',
  PAYMENTS: 'payments',
  SUPPORT: 'support',
  ROUTER: 'router',
} as const;

export const DEFAULT_LOCATION = {
  lat: -1.9441, // Kigali, Rwanda
  lng: 30.0619,
} as const;

export const DEFAULT_RADIUS_KM = 5;

