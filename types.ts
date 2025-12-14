
export type Role = 'passenger' | 'driver' | 'vendor';
export type VehicleType = 'moto' | 'cab' | 'liffan' | 'truck' | 'other' | 'shop';

export interface Location {
  lat: number;
  lng: number;
}

export type AddressLabel = 'Home' | 'Work' | 'School' | 'Other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  customName?: string;
  address: string;
  location?: Location;
}

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface ScheduledTrip {
  id: string;
  date: string; // ISO Date
  time: string; // HH:mm
  recurrence: RecurrenceType;
  origin: string;
  destination: string;
  role: Role; // Who scheduled it
}

export interface PresenceUser {
  sessionId: string;
  role: Role;
  vehicleType?: VehicleType;
  location: Location;
  lastSeen: number; // timestamp
  isOnline: boolean;
  displayName?: string;
  distance?: string; // formatted string for display
  _distKm?: number; // Internal for sorting
}

// --- Shared Pagination Interface ---
export interface PaginationMeta {
  page_size: number;
  page: number;
  has_more: boolean;
  next_page?: number;
}

// --- Buy & Sell Agent Types ---
export interface BusinessListing {
  id: string;
  name: string;
  category: string;
  distance: string; // e.g., "0.8 km"
  approx_distance_km?: number; // Numeric for sorting/logic
  isOpen?: boolean; // true = Open, false = Closed, undefined = Unknown
  confidence: 'High' | 'Medium' | 'Low';
  snippet?: string; // "why_recommended"
  address?: string; // "area"
  phoneNumber?: string;
  whatsappDraft?: string;
}

export interface SearchFilters {
  radius_km?: number;
  sort?: 'distance' | 'best_match';
  price_sensitivity?: 'low' | 'medium' | 'high' | 'unknown';
}

export interface BusinessResultsPayload {
  query_summary?: string;
  need_description?: string; // Extracted user need for broadcast
  user_location_label?: string; // Inferred user location label
  category?: string;
  filters_applied?: SearchFilters;
  pagination?: PaginationMeta;
  matches: BusinessListing[];
  disclaimer?: string;
}

export interface VerifiedBusinessPayload {
  title: string;
  item_found: string;
  matches: BusinessListing[]; // These are specifically the ones who said YES
}
// ------------------------------

// --- Real Estate Agent Types ---
export interface PropertyListing {
  id: string;
  title: string;
  property_type: string; // Apartment, House, etc.
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
// ------------------------------

// --- Legal Agent Types ---
export interface LegalListing {
  id: string;
  name: string;
  category: 'Notary' | 'Lawyer' | 'Bailiff' | 'Agency' | 'Other';
  distance: string;
  approx_distance_km?: number;
  isOpen?: boolean; // true = Open, false = Closed, undefined = Unknown
  confidence: 'High' | 'Medium' | 'Low';
  snippet?: string; // "why_recommended"
  address?: string; // "area"
  phoneNumber?: string;
  whatsappDraft?: string;
}

export interface LegalResultsPayload {
  query_summary?: string;
  pagination?: PaginationMeta;
  matches: LegalListing[];
  disclaimer?: string;
}
// ------------------------------

// --- MEMORY SYSTEM TYPES ---
export interface AgentMemory {
  id: string;
  content: string; // "User prefers Moto taxis", "User lives in Kicukiro"
  category: 'preference' | 'fact' | 'context' | 'legal_context';
  confidence: number; // 0.0 to 1.0
  timestamp: number;
  embedding?: number[]; // For future vector search
}
// ---------------------------

export interface Message {
  id: string;
  sender: 'user' | 'system' | 'ai' | 'peer';
  text: string;
  timestamp: number;
  
  // For AI rich responses
  groundingLinks?: { title: string; uri: string }[];
  
  // New structured data for Buy & Sell Agent
  businessPayload?: BusinessResultsPayload;
  
  // NEW: Confirmed matches from broadcast
  verifiedPayload?: VerifiedBusinessPayload;

  // New structured data for Real Estate Agent
  propertyPayload?: PropertyResultsPayload;
  
  // New structured data for Legal Agent
  legalPayload?: LegalResultsPayload;
  
  // Rich Media
  image?: {
    previewUrl: string;
    caption?: string;
  };
  file?: {
    fileName: string;
    fileSize?: string;
    fileType?: string;
  };
  location?: {
    lat: number;
    lng: number;
    label?: string;
  };
  
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  peerId?: string; // if p2p chat
  peerName?: string;
  type: 'mobility' | 'support' | 'business' | 'real_estate' | 'legal';
  messages: Message[];
  lastUpdated: number;
  
  // Agent State
  isDemoMode?: boolean;
  initialInput?: string;
}

export enum AppMode {
  HOME = 'home',
  DISCOVERY = 'discovery',
  SERVICES = 'services',
  BUSINESS = 'business',
  CHAT = 'chat', // specific active chat
  SETTINGS = 'settings',
  MOMO_GENERATOR = 'momo_generator',
  SCANNER = 'scanner',
  ONBOARDING = 'onboarding' // Business onboarding flow
}
