/**
 * Shared constants for easyMO Discovery
 */

// Icon emojis (for fallback)
export const ICON_EMOJIS = {
  mobility: '🚗',
  marketplace: '🛍️',
  payments: '💳',
  support: '💬',
  legal: '⚖️',
  realEstate: '🏠',
  business: '🏪',
} as const;

// Note: ICONS object is defined in apps/pwa/constants.ts as React components
// This is just for type compatibility
export const ICONS = ICON_EMOJIS as any;

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

