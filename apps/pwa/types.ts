/**
 * PWA-specific types
 * Most types are now in @easymo/shared
 */

// Re-export shared types
export * from '@easymo/shared/types';

// PWA-specific extensions
export type AddressLabel = 'Home' | 'Work' | 'School' | 'Other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  customName?: string;
  address: string;
  location?: { lat: number; lng: number };
}

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface ScheduledTrip {
  id: string;
  date: string; // ISO Date
  time: string; // HH:mm
  recurrence: RecurrenceType;
  origin: string;
  destination: string;
  role: 'passenger' | 'driver' | 'vendor';
}

export interface PresenceUser {
  sessionId: string;
  role: 'passenger' | 'driver' | 'vendor';
  vehicleType?: 'moto' | 'cab' | 'liffan' | 'truck' | 'other' | 'shop';
  location: { lat: number; lng: number };
  lastSeen: number; // timestamp
  isOnline: boolean;
  displayName?: string;
  distance?: string; // formatted string for display
  eta?: string; // Estimated Time of Arrival
  _distKm?: number; // Internal for sorting
}

export interface PaginationMeta {
  page_size: number;
  page: number;
  has_more: boolean;
  next_page?: number;
}

export interface BusinessListing {
  id: string;
  name: string;
  category: string; // e.g., 'pharmacy', 'restaurant'
  description?: string;

  // Location
  city?: string;
  country?: string;
  address?: string; // "area" or full address
  location?: string; // PostGIS Point string or lat/lng object if parsed
  distance?: string; // e.g., "0.8 km"
  approx_distance_km?: number; // Numeric for sorting/logic

  // Contact
  phone: string;
  website?: string;
  email?: string;
  owner_whatsapp?: string;

  // Status & Metadata
  isOpen?: boolean; // true = Open, false = Closed, undefined = Unknown
  operating_hours?: string;
  rating?: number;
  review_count?: number;
  tags?: string[];

  // App Specific
  confidence: 'High' | 'Medium' | 'Low';
  snippet?: string; // "why_recommended"
  whatsappDraft?: string;
}

export interface Business extends BusinessListing {
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  external_id?: string;
  is_active: boolean;
}

export interface SearchFilters {
  radius_km?: number;
  sort?: 'distance' | 'best_match';
  price_sensitivity?: 'low' | 'medium' | 'high' | 'unknown';
}

export interface BusinessResultsPayload {
  query_summary?: string;
  need_description?: string;
  user_location_label?: string;
  category?: string;
  filters_applied?: SearchFilters;
  pagination?: PaginationMeta;
  matches: BusinessListing[];
  disclaimer?: string;
}

export interface VerifiedBusinessPayload {
  title: string;
  item_found: string;
  matches: BusinessListing[];
}

export interface PropertyListing {
  id: string;
  title: string;
  property_type: string;
  listing_type: 'rent' | 'sale' | 'unknown';
  price: number | null;
  currency: string;
  bedroom_count: number | null;
  bathroom_count: number | null;
  area_label: string;
  approx_distance_km: number | null;
  contact_phone: string | null;
  confidence: 'high' | 'medium' | 'low';
  why_recommended: string;
  whatsapp_draft: string;
}

export interface PropertyResultsPayload {
  query_summary: string;
  filters_applied: {
    listing_type: string;
    property_type: string;
    budget_min: number;
    budget_max: number;
    area: string;
    radius_km: number;
    sort: string;
  };
  pagination: PaginationMeta;
  matches: PropertyListing[];
  disclaimer: string;
}

export interface LegalListing {
  id: string;
  name: string;
  category: 'Notary' | 'Lawyer' | 'Bailiff' | 'Agency' | 'Other';
  distance: string;
  approx_distance_km?: number;
  isOpen?: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  snippet?: string;
  address?: string;
  phoneNumber?: string;
  whatsappDraft?: string;
}

export interface LegalResultsPayload {
  query_summary?: string;
  pagination?: PaginationMeta;
  matches: LegalListing[];
  disclaimer?: string;
}

export interface AgentMemory {
  id: string;
  content: string;
  category: 'preference' | 'fact' | 'context' | 'legal_context';
  confidence: number; // 0.0 to 1.0
  timestamp: number;
  embedding?: number[];
}

export enum AppMode {
  HOME = 'home',
  DISCOVERY = 'discovery',
  SERVICES = 'services',
  BUSINESS = 'business',
  CHAT = 'chat',
  SETTINGS = 'settings',
  MOMO_GENERATOR = 'momo_generator',
  SCANNER = 'scanner',
  ONBOARDING = 'onboarding'
}
