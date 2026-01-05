/**
 * Policy enforcement utilities
 * - No revealing precise driver/passenger coordinates
 * - Require explicit consent before using location tools
 * - TTL for presence and intents must be enforced
 */

import type { Location } from '@easymo/shared/types';

/**
 * Sanitize location for display (round to ~100m precision)
 * Prevents revealing precise coordinates
 */
export function sanitizeLocationForDisplay(location: Location): Location {
  // Round to ~100m precision (approximately 0.001 degrees)
  return {
    lat: Math.round(location.lat * 1000) / 1000,
    lng: Math.round(location.lng * 1000) / 1000,
  };
}

/**
 * Format location as area/neighborhood instead of precise coordinates
 */
export function formatLocationAsArea(location: Location): string {
  // In production, this would use reverse geocoding
  // For now, return a generic area description
  const sanitized = sanitizeLocationForDisplay(location);
  return `Area near ${sanitized.lat.toFixed(3)}, ${sanitized.lng.toFixed(3)}`;
}

/**
 * Check if user has consented to location usage
 * This should be checked before calling location-based tools
 */
export function hasLocationConsent(messages: any[]): boolean {
  // Look for explicit consent in recent messages
  const consentKeywords = [
    'yes', 'ok', 'okay', 'sure', 'go ahead', 'use my location',
    'find nearby', 'search nearby', 'show me', 'help me find'
  ];
  
  const recentMessages = messages.slice(-5).map((m: any) => 
    m.content?.toLowerCase() || ''
  ).join(' ');
  
  return consentKeywords.some(keyword => recentMessages.includes(keyword));
}

/**
 * Enforce minimum TTL for presence (1 hour minimum)
 */
export function enforcePresenceTTL(requestedTTL?: number): number {
  const MIN_TTL = 3600; // 1 hour
  const MAX_TTL = 86400; // 24 hours
  
  if (!requestedTTL || requestedTTL < MIN_TTL) {
    return MIN_TTL;
  }
  
  return Math.min(requestedTTL, MAX_TTL);
}

/**
 * Enforce minimum TTL for ride intents (30 minutes minimum)
 */
export function enforceIntentTTL(requestedTTL?: number): number {
  const MIN_TTL = 1800; // 30 minutes
  const MAX_TTL = 7200; // 2 hours
  
  if (!requestedTTL || requestedTTL < MIN_TTL) {
    return MIN_TTL;
  }
  
  return Math.min(requestedTTL, MAX_TTL);
}

/**
 * Validate location consent before tool execution
 */
export function validateLocationConsent(
  toolName: string,
  messages: any[],
  userLocation?: Location
): { allowed: boolean; reason?: string } {
  const locationTools = [
    'publish_presence',
    'find_matches',
    'create_ride_intent',
    'geocode',
    'search_offers',
  ];
  
  if (!locationTools.includes(toolName)) {
    return { allowed: true };
  }
  
  // If user_location is provided in request, assume consent
  if (userLocation) {
    return { allowed: true };
  }
  
  // Check for explicit consent in messages
  if (hasLocationConsent(messages)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: 'Location consent required. Please confirm you want to use your location.',
  };
}

