
export type Role = 'passenger' | 'driver' | 'vendor';
export type VehicleType = 'moto' | 'cab' | 'liffan' | 'truck' | 'other' | 'shop';

export interface Location {
  lat: number;
  lng: number;
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

// --- Waiter AI Types ---
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  description?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  businessId: string;
  guestSessionId: string;
  tableLabel?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: 'submitted' | 'seen';
  createdAt: number;
  notes?: string;
}
// -----------------------

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
  
  // Waiter Agent Payload
  orderSummary?: Order;

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
  type: 'mobility' | 'support' | 'business' | 'waiter' | 'real_estate' | 'legal';
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
  WAITER_GUEST = 'waiter_guest',
  MANAGER = 'manager',
  CHAT = 'chat', // specific active chat
  SETTINGS = 'settings',
  MOMO_GENERATOR = 'momo_generator',
  SCANNER = 'scanner'
}
