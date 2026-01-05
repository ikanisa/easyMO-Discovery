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
 * Enforce TTL for presence (max 15 minutes)
 * Updates are automatically throttled to minimum 10s interval in database
 */
export function enforcePresenceTTL(requestedTTL?: number): number {
  const DEFAULT_TTL = 900; // 15 minutes
  const MAX_TTL = 900; // 15 minutes max
  
  if (!requestedTTL || requestedTTL <= 0) {
    return DEFAULT_TTL;
  }
  
  return Math.min(requestedTTL, MAX_TTL);
}

/**
 * Enforce TTL for ride intents (10-15 minutes)
 * Ride intents expire after 10-15 minutes for safety
 */
export function enforceIntentTTL(requestedTTL?: number): number {
  const DEFAULT_TTL = 900; // 15 minutes
  const MIN_TTL = 600; // 10 minutes minimum
  const MAX_TTL = 900; // 15 minutes maximum
  
  if (!requestedTTL || requestedTTL <= 0) {
    return DEFAULT_TTL;
  }
  
  // Clamp between 10 minutes (600s) and 15 minutes (900s)
  return Math.max(MIN_TTL, Math.min(requestedTTL, MAX_TTL));
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

