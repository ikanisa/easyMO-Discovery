# Tools Catalog

**Last Updated:** 2025-01-28  
**Status:** Production-Ready

## Overview

This document catalogs all tools available to the OpenAI Agents SDK system. All tools are **server-side only** - Gemini and Google Maps APIs are never exposed to the client.

## Tool Categories

1. **Mobility Tools** - Ride matching, presence, intents
2. **Marketplace Tools** - Business search, listings, vendor onboarding
3. **Payments Tools** - MoMo QR generation, parsing, receipts
4. **Geo Tools** - Geocoding, reverse geocoding, ETA estimation
5. **Gemini Tools** (Optional) - Location normalization, summarization

---

## Mobility Tools

### `set_presence`

**Purpose:** Set user presence (location and online status) for mobility matching.

**Input:**
```typescript
{
  user_id: string (UUID),
  role: 'passenger' | 'driver' | 'vendor',
  lat: number,
  lng: number,
  is_online: boolean (default: true),
  radius_m?: number, // Display only
  meta?: { vehicle_type?: string, ... } // Additional metadata
}
```

**Output:**
```typescript
{
  success: boolean,
  message: string,
  location: { lat: number, lng: number }, // Sanitized
  is_online: boolean,
  expires_in: number // TTL in seconds
}
```

**Safety Notes:**
- Location coordinates are sanitized before returning (rounded to ~100m precision)
- TTL is enforced (minimum 1 hour, maximum 24 hours)
- Requires location consent

**Rate Limiting:** None (uses Supabase RPC)

---

### `create_ride_intent`

**Purpose:** Create a ride request with pickup and optional dropoff locations.

**Input:**
```typescript
{
  user_id: string (UUID),
  pickup_lat: number,
  pickup_lng: number,
  dropoff_lat?: number,
  dropoff_lng?: number,
  notes?: string
}
```

**Output:**
```typescript
{
  success: boolean,
  intent_id: string (UUID),
  status: 'pending' | 'matched' | 'completed' | 'cancelled',
  expires_at: string (ISO timestamp),
  pickup: { location: { lat, lng } }, // Sanitized
  dropoff?: { location: { lat, lng } } // Sanitized
}
```

**Safety Notes:**
- TTL enforced (minimum 30 minutes, maximum 2 hours)
- Locations sanitized in response
- Requires location consent

**Rate Limiting:** None (uses Supabase)

---

### `find_driver_matches`

**Purpose:** Find nearby drivers for a ride intent or pickup location.

**Input:**
```typescript
{
  intent_id?: string (UUID), // OR
  pickup_lat?: number,
  pickup_lng?: number,
  radius_km?: number (default: 5),
  limit?: number (default: 10)
}
```

**Output:**
```typescript
{
  success: boolean,
  matches: Array<{
    driver_id: string (UUID),
    vehicle_type: string,
    location: { lat, lng }, // Sanitized
    distance_km: string,
    distance_m: number,
    is_online: boolean,
    last_seen_at: string
  }>,
  count: number,
  radius_km: number
}
```

**Safety Notes:**
- Driver locations are sanitized (rounded to ~100m)
- Only returns online drivers within radius
- Automatically creates match candidates if `intent_id` provided

**Rate Limiting:** None (uses Supabase RPC)

---

### `find_passenger_requests`

**Purpose:** Find nearby passenger ride requests for a driver.

**Input:**
```typescript
{
  driver_lat: number,
  driver_lng: number,
  radius_km?: number (default: 5),
  limit?: number (default: 10)
}
```

**Output:**
```typescript
{
  success: boolean,
  requests: Array<{
    intent_id: string (UUID),
    pickup: { location: { lat, lng } }, // Sanitized
    dropoff?: { location: { lat, lng } }, // Sanitized
    distance_km: string,
    notes?: string,
    created_at: string
  }>,
  count: number,
  radius_km: number
}
```

**Safety Notes:**
- Pickup/dropoff locations sanitized
- Only returns pending, non-expired intents
- Sorted by distance

**Rate Limiting:** None (uses Supabase)

---

### `reveal_contact`

**Purpose:** Reveal contact information for a match (with explicit consent).

**Input:**
```typescript
{
  match_id: string (UUID),
  user_id: string (UUID),
  confirmed: boolean // MUST be explicitly true
}
```

**Output:**
```typescript
{
  success: boolean,
  contact: {
    display_name: string,
    phone_masked: string, // e.g., "***1234"
    phone_full: string, // Only if confirmed=true
    message: string
  }
}
```

**Safety Notes:**
- **Requires explicit confirmation** (`confirmed: true`)
- Verifies user is part of the match (passenger or driver)
- Phone number masked by default
- Full phone number only returned if explicitly confirmed

**Rate Limiting:** None (uses Supabase)

---

## Marketplace Tools

### `search_listings`

**Purpose:** Search marketplace listings by query, category, price range, and location.

**Input:**
```typescript
{
  query: string,
  lat?: number, // For distance sorting
  lng?: number,
  category?: string,
  min_price?: number,
  max_price?: number,
  limit?: number (default: 20)
}
```

**Output:**
```typescript
{
  success: boolean,
  listings: Array<{
    id: string (UUID),
    title: string,
    description: string,
    category: string,
    price?: number,
    currency: string,
    images: string[],
    vendor_id: string (UUID),
    location?: { lat, lng }, // Sanitized
    distance_km?: string, // If user location provided
    created_at: string
  }>,
  count: number,
  query: string,
  filters: { category?, min_price?, max_price? }
}
```

**Safety Notes:**
- Locations sanitized if present
- Sorted by distance if user location provided
- Only returns active listings

**Rate Limiting:** None (uses Supabase)

---

### `create_listing`

**Purpose:** Create a marketplace listing. User must have vendor role.

**Input:**
```typescript
{
  user_id: string (UUID),
  title: string,
  description: string,
  price?: number,
  currency?: string (default: 'RWF'),
  category: string,
  images?: string[],
  lat?: number,
  lng?: number
}
```

**Output:**
```typescript
{
  success: boolean,
  listing_id: string (UUID),
  title: string,
  category: string,
  price?: number,
  currency: string,
  location?: { lat, lng }, // Sanitized
  message: string
}
```

**Safety Notes:**
- Verifies user has vendor role
- Location sanitized if provided
- Returns error if user not a vendor

**Rate Limiting:** None (uses Supabase)

---

### `vendor_onboarding_status`

**Purpose:** Check vendor onboarding status and completion steps.

**Input:**
```typescript
{
  user_id: string (UUID)
}
```

**Output:**
```typescript
{
  success: boolean,
  is_vendor: boolean,
  profile_complete: boolean,
  has_listings: boolean,
  onboarding_complete: boolean,
  listings_count: number,
  next_steps: string[]
}
```

**Safety Notes:**
- No sensitive data exposed
- Provides actionable next steps

**Rate Limiting:** None (uses Supabase)

---

## Payments Tools

### `generate_momo_qr`

**Purpose:** Generate Mobile Money (MoMo) payment QR code and USSD code.

**Input:**
```typescript
{
  amount?: number, // Optional (any amount)
  currency?: string (default: 'RWF'),
  reference: string, // Required
  merchant_id?: string // For payment requests
}
```

**Output:**
```typescript
{
  success: boolean,
  ussd_code: string, // e.g., "*182*6*2*{merchant}*{amount}#"
  qr_value: string, // tel: URI format
  qr_data_url: string, // Base64 SVG (simplified)
  amount?: number,
  currency: string,
  reference: string,
  country: string, // 'rw', 'ke', etc.
  message: string
}
```

**Safety Notes:**
- Supports Rwanda, Kenya, and other countries
- USSD code format varies by country
- QR code uses tel: URI format

**Rate Limiting:** None (local computation)

---

### `parse_qr`

**Purpose:** Parse QR code data (supports tel: URI, JSON, text).

**Input:**
```typescript
{
  payload: string // QR code text or scanned data
}
```

**Output:**
```typescript
{
  success: boolean,
  type: 'ussd' | 'json' | 'text',
  code?: string, // For USSD
  parsed: {
    tx_type?: 'send' | 'pay' | 'unknown',
    amount?: number,
    phone?: string,
    merchant?: string,
    currency?: string,
    raw?: string // For text type
  },
  message: string
}
```

**Safety Notes:**
- Handles multiple QR formats
- Parses USSD codes (Rwanda/Kenya formats)
- Falls back to text if parsing fails

**Rate Limiting:** None (local computation)

---

## Geo Tools

### `geocode`

**Purpose:** Geocode a location text query to coordinates using Google Maps.

**Input:**
```typescript
{
  text: string, // e.g., "Kigali, Rwanda"
  user_location?: { lat: number, lng: number } // For bias
}
```

**Output:**
```typescript
{
  success: boolean,
  address: string, // Formatted address
  location: { lat: number, lng: number },
  place_id?: string,
  types?: string[],
  source: 'google_maps' | 'fallback'
}
```

**Safety Notes:**
- **Server-side only** - Google Maps API key never exposed
- Uses location bias if user location provided
- Falls back gracefully if API unavailable
- **Cached** for 1 hour (reduces API calls)

**Rate Limiting:**
- Per-user: 100 requests/hour
- Per-IP: 100 requests/hour (fallback)
- Uses Cloudflare KV for tracking

**Caching:** Yes (1 hour TTL)

---

### `reverse_geocode`

**Purpose:** Reverse geocode coordinates to address using Google Maps.

**Input:**
```typescript
{
  lat: number,
  lng: number
}
```

**Output:**
```typescript
{
  success: boolean,
  address: string, // Formatted address
  place_id?: string,
  types?: string[],
  source: 'google_maps' | 'fallback'
}
```

**Safety Notes:**
- **Server-side only**
- Falls back to formatted coordinates if API unavailable
- **Cached** for 1 hour

**Rate Limiting:**
- Per-user: 100 requests/hour
- Per-IP: 100 requests/hour

**Caching:** Yes (1 hour TTL)

---

### `estimate_eta`

**Purpose:** Estimate travel time and distance using Google Routes/Distance Matrix.

**Input:**
```typescript
{
  origin: { lat: number, lng: number },
  destination: { lat: number, lng: number },
  mode?: 'driving' | 'walking' | 'transit' (default: 'driving')
}
```

**Output:**
```typescript
{
  success: boolean,
  distance_m: number,
  distance_text: string, // e.g., "5.2km"
  duration_s: number,
  duration_text: string, // e.g., "12m"
  eta_seconds: number,
  eta_minutes: number,
  mode: string,
  source: 'google_maps' | 'estimate'
}
```

**Safety Notes:**
- **Server-side only**
- Falls back to Haversine distance calculation if API unavailable
- **Cached** for 30 minutes (ETAs change more frequently)

**Rate Limiting:**
- Per-user: 100 requests/hour
- Per-IP: 100 requests/hour

**Caching:** Yes (30 minutes TTL)

---

## Gemini Tools (Optional Enhancers)

**⚠️ IMPORTANT:** Gemini is **NEVER** the chat engine. These tools are optional enhancements only, called inside other tools when needed.

### `gemini_normalize_location_text`

**Purpose:** Normalize ambiguous location text using Gemini AI (optional enhancement).

**Input:**
```typescript
{
  text: string, // Ambiguous location query
  country?: string (default: 'Rwanda'),
  city?: string (default: 'Kigali'),
  user_location?: { lat: number, lng: number }
}
```

**Output:**
```typescript
{
  success: boolean,
  normalized: string, // Clear, unambiguous location name
  confidence: number, // 0.0-1.0
  source: 'gemini' | 'fallback',
  original: string
}
```

**Safety Notes:**
- **Server-side only** - Gemini API key never exposed
- Falls back to original text if unavailable
- Used internally by geocoding tools when needed

**Rate Limiting:**
- Per-user: 50 requests/hour
- Per-IP: 50 requests/hour

**Caching:** No (text normalization is context-dependent)

---

### `gemini_summarize_for_driver`

**Purpose:** Create a short, actionable message for drivers about a ride request (optional enhancement).

**Input:**
```typescript
{
  intent: {
    pickup_address: string,
    dropoff_address?: string,
    notes?: string,
    distance_km?: number,
    eta_minutes?: number
  }
}
```

**Output:**
```typescript
{
  success: boolean,
  summary: string, // Max 100 characters
  source: 'gemini' | 'fallback'
}
```

**Safety Notes:**
- **Server-side only**
- Falls back to simple template if unavailable
- Used for driver notifications

**Rate Limiting:**
- Per-user: 50 requests/hour
- Per-IP: 50 requests/hour

**Caching:** No (summaries are context-dependent)

---

## Implementation Details

### Rate Limiting

**Tool-Specific Rate Limits:**
- **Google Maps:** 100 requests/hour per user/IP
- **Gemini:** 50 requests/hour per user/IP
- **Other tools:** No rate limiting (use Supabase RPC or local computation)

**Implementation:**
- Uses Cloudflare KV for distributed rate limiting
- Per-user limits (if `user_id` provided)
- Per-IP limits (fallback for anonymous users)
- Fail-open policy (allows requests if KV unavailable)

### Caching

**Cached Tools:**
- `geocode` - 1 hour TTL
- `reverse_geocode` - 1 hour TTL
- `estimate_eta` - 30 minutes TTL

**Cache Keys:**
- Geocode: `cache:geocode:{query}:{lat}:{lng}`
- Reverse Geocode: `cache:reverse_geocode:{lat}:{lng}` (rounded to ~100m)
- ETA: `cache:eta:{origin}:{destination}:{mode}` (rounded to ~100m)

**Implementation:**
- Uses Cloudflare KV for distributed caching
- Cache keys include rounded coordinates for better hit rates
- Fail-open policy (continues without cache if KV unavailable)

### Error Handling

**Fallback Strategy:**
1. **Google Maps unavailable:**
   - Geocode: Returns error with helpful message
   - Reverse Geocode: Returns formatted coordinates
   - ETA: Falls back to Haversine distance calculation

2. **Gemini unavailable:**
   - Normalize: Returns original text with low confidence
   - Summarize: Returns simple template

3. **Supabase unavailable:**
   - All database tools return error (no fallback)

**Error Response Format:**
```typescript
{
  success: false,
  error: string,
  message?: string, // User-friendly message
  code?: string // Error code
}
```

### Secrets Management

**Environment Variables (Server-Side Only):**
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `GEMINI_API_KEY` - Gemini API key (optional)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

**Security:**
- All API keys stored in Cloudflare Worker secrets
- Never exposed to client
- Never logged or returned in responses
- Tools fail gracefully if keys not configured

---

## Tool Execution Flow

```
1. OpenAI decides to call tool
   ↓
2. Policy Enforcement
   ├─→ Check location consent
   ├─→ Enforce TTL (presence/intents)
   └─→ Sanitize location data
   ↓
3. Rate Limiting (if applicable)
   ├─→ Check tool-specific limits
   └─→ Return error if exceeded
   ↓
4. Cache Check (if applicable)
   ├─→ Check KV cache
   └─→ Return cached result if found
   ↓
5. Execute Tool
   ├─→ Call external API (Maps/Gemini) or Supabase
   ├─→ Handle errors with fallbacks
   └─→ Return structured JSON
   ↓
6. Cache Result (if applicable)
   └─→ Store in KV with TTL
   ↓
7. Persistence
   ├─→ Save tool_trace (latency, ok/error)
   └─→ Update conversation if needed
   ↓
8. Return Result
   └─→ Structured JSON for UI cards
```

---

## Testing

### Local Development

```bash
# Test geocoding
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Geocode Kigali"}],
    "agent_type": "mobility",
    "stream": false
  }'
```

### Production

- Deploy to Cloudflare Workers
- Set secrets in Cloudflare Dashboard:
  - `GOOGLE_MAPS_API_KEY`
  - `GEMINI_API_KEY` (optional)
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Configure KV namespace for caching/rate limiting

---

## References

- [Agent Architecture](./AGENT_ARCHITECTURE.md)
- [Database Schema](./DB_SCHEMA_AI_FIRST.md)
- [Worker README](../services/agent-runtime/README.md)

