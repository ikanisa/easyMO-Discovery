# Full-Stack System Audit - easyMO Discovery

**Date:** 2025-01-27  
**Purpose:** Comprehensive inventory of all routes, features, AI code paths, Supabase usage, security risks, and performance issues  
**Status:** Complete Audit

---

## Executive Summary

**Stack:** React 18.2 + Vite + TypeScript, Supabase (auth, DB, RLS, Edge Functions), Google Gemini (via Edge Functions + Worker fallback), Cloudflare Workers (OpenAI Agents SDK), Cloudflare Pages (PWA)

**Architecture:** Multi-agent chat system (Bob/Marketplace, Keza/Real Estate, Gatera/Legal, Support, Mobility), Mobility matching, MoMo QR payments, QR scanning, Business onboarding

**AI Engine:** Dual system - OpenAI Agents SDK (Cloudflare Worker) as PRIMARY, Gemini (Supabase Edge Functions) as LEGACY fallback

**Critical Findings:**
1. ✅ **SECURITY:** No API keys in frontend (vite.config.ts fixed)
2. ⚠️ **DATA MODEL:** Multi-role support exists but `default_role` still used for backward compatibility
3. ✅ **AI ARCHITECTURE:** Worker is PRIMARY, Gemini is LEGACY fallback
4. ⚠️ **PERFORMANCE:** `@google/genai` still bundled (even if unused when Worker active)

---

## 1. Routes & Pages Inventory

### 1.1 Routing System

**Type:** Client-side routing via `AppMode` enum (no React Router)  
**Location:** `App.tsx`, `types.ts`

**Routing Method:**
- State-based (`mode` state in `App.tsx`)
- URL query params for deep links (`?mode=discovery`, `?mode=business`)
- Bottom navigation bar (Layout component)

### 1.2 All Routes/Pages

| Route/Mode | File Path | Purpose | User Roles | Key Components Used | AI Agents | Entry Points |
|------------|-----------|---------|------------|---------------------|-----------|--------------|
| **HOME** | `App.tsx:236` → `components/Chat/ChatHome.tsx` | AI-first entry screen | All | ChatHome, Button | Router (Worker) | Default entry, Bottom nav |
| **DISCOVERY** | `pages/Discovery.tsx` | Mobility matching (drivers/passengers) | passenger, driver | NearbyListCard, VehicleSelector, ScheduleModal, SmartLocationInput | Mobility (Worker) | Bottom nav, Home → "Find Ride" |
| **BUSINESS** | `pages/Business.tsx` | Marketplace entry (category grid) | All | Button | Bob/Keza/Gatera (Worker or Gemini) | Bottom nav, Home → "Find Business" |
| **SERVICES** | `pages/Services.tsx` | Support & utilities hub | All | Button, AddressBook | Support (Worker) | Bottom nav, Home → Services |
| **SETTINGS** | `pages/Settings.tsx` | User preferences & profile | All | Button, AddressBook | None | Services → Profile header |
| **MOMO_GENERATOR** | `pages/MomoGenerator.tsx` | Payment QR code generator | All | Button | Payments (Worker) | Home → "MoMo QR", Services → MoMo |
| **SCANNER** | `pages/QRScanner.tsx` | QR code scanner | All | Html5Qrcode | Payments (Worker) | Home → "Scan QR", Services → Scanner |
| **ONBOARDING** | `pages/BusinessOnboarding.tsx` | Business registration flow | All (vendor role) | MessageBubble, Button | OnboardBot (Gemini) | Services → "Onboard Business" |
| **CHAT** (Modal) | `pages/ChatSession.tsx` | Multi-agent chat overlay | All | MessageBubble, BusinessResultsMessage, PropertyResultsMessage, LegalResultsMessage | All agents | Triggered from any page |

**Notes:**
- All pages are lazy-loaded (`React.lazy`)
- ChatSession is modal overlay (not a route)
- Login page exists but unused (anonymous auth)
- URL query params: `?mode=discovery`, `?mode=business`, `?mode=services`, `?mode=momo`, `?mode=scanner`

### 1.3 Navigation Flow

```
HOME (ChatHome)
  ├─→ Quick Actions (chips)
  │   ├─→ "Find Ride" → DISCOVERY (role: passenger)
  │   ├─→ "I'm a Driver" → DISCOVERY (role: driver)
  │   ├─→ "Find Business" → CHAT (type: marketplace)
  │   ├─→ "MoMo QR" → CHAT (type: payments) or MOMO_GENERATOR
  │   └─→ "Scan QR" → CHAT (type: payments) or SCANNER
  ├─→ Text Input → CHAT (type: router)
  └─→ "More Options" → Legacy pages access

Bottom Navigation:
  HOME ← → DISCOVERY ← → BUSINESS ← → SERVICES

From SERVICES:
  ├─→ Profile header → SETTINGS
  ├─→ "MoMo QR Generator" → MOMO_GENERATOR
  ├─→ "QR Scanner" → SCANNER
  └─→ "Onboard Business" → ONBOARDING

From DISCOVERY:
  ├─→ Driver toggle → Update role
  └─→ Nearby user card → CHAT (type: mobility, peerId)

From BUSINESS:
  └─→ Category card → CHAT (type: business/real_estate/legal)

CHAT (Modal):
  └─→ Can open from any page
```

---

## 2. Features by Domain

### 2.1 Mobility / Discovery (Drivers/Passengers)

**Files:**
- `pages/Discovery.tsx`
- `services/presence.ts`
- `components/Discovery/NearbyListCard.tsx`
- `components/Discovery/VehicleSelector.tsx`
- `components/Scheduling/ScheduleModal.tsx`
- `worker/src/agents/mobility.ts`
- `worker/src/tools/presence.ts`

**Features:**
1. **Role-based UI** (passenger/driver)
   - Passenger: View nearby drivers, filter by vehicle type
   - Driver: Toggle online/offline, set vehicle type, view nearby passengers

2. **Location-based matching**
   - Real-time location tracking (`LocationService`)
   - Presence publishing (`PresenceService.upsertPresence`)
   - Nearby users query (`PresenceService.getNearby` → `get_nearby_drivers` RPC)
   - PostGIS spatial queries (5km radius)

3. **Vehicle filters**
   - Types: moto, cab, liffan, truck, other
   - UI: `VehicleSelector` component

4. **Schedule trips**
   - `ScheduleModal` component
   - Future: Scheduled trip intents (table exists: `trip_intents`)

5. **Location context**
   - Uses Gemini for location insights (`GeminiService.getLocationInsight`)
   - Displays area description

6. **Offline support**
   - Queues presence updates when offline
   - Syncs when back online

**Database Tables:**
- `presence` (location, role, vehicle_type, is_online, last_seen)
- `user_profiles` (user data)
- `user_roles` (multi-role support)
- `trip_intents` (future: scheduled trips)

**RPC Functions:**
- `get_nearby_drivers(user_lat, user_lng, radius_meters)` - PostGIS proximity query

**RLS Policies:**
- `presence`: Public read, self-upsert only (`auth.uid() = user_id`)

**AI Integration:**
- Mobility Agent (Worker) - Routes ride requests
- Gemini `getLocationInsight` - Area context (still uses Gemini, not Worker)

---

### 2.2 Marketplace / Business Discovery

**Files:**
- `pages/Business.tsx`
- `components/Business/BusinessCardWidget.tsx`
- `components/Business/BusinessResultsMessage.tsx`
- `components/Business/VerifiedBusinessList.tsx`
- `services/gemini.ts` (chatBob, chatKeza, chatGatera)
- `services/whatsapp.ts` (broadcast polling)
- `worker/src/agents/marketplace.ts`
- `worker/src/tools/marketplace.ts`

**Features:**
1. **Category grid** (18 categories)
   - Restaurants, Pharmacies, Groceries, Legal Advisor, Electronics, Fashion, Mechanics, Beauty & Spa, Real Estate, Hotels, Car Rental, Health, Hardware, Cafés, Cleaning, Fitness, Home Decor, Bars, Events, Tourism

2. **Agent routing**
   - **Bob (Marketplace)** → `chatBob()` → Marketplace Agent (Worker)
   - **Keza (Real Estate)** → `chatKeza()` → Marketplace Agent (Worker) 
   - **Gatera (Legal)** → `chatGatera()` → Support Agent (Worker)

3. **Business search**
   - Uses Gemini + Google Maps tools (via Worker or Gemini fallback)
   - Filters by location, category, phone numbers
   - Returns structured results (name, phone, address, distance, snippet)

4. **WhatsApp broadcast**
   - Polls for business responses (`pollBroadcastResponses`)
   - Verifies businesses via broadcast
   - Displays verified matches

5. **Result cards**
   - `BusinessCardWidget` - Individual business card
   - `BusinessResultsMessage` - List of businesses
   - `VerifiedBusinessList` - Verified matches from broadcast

**Database Tables:**
- `broadcasts` (broadcast requests)
- `broadcast_responses` (business responses)
- Future: `marketplace_listings` (if implemented)

**Edge Functions:**
- `whatsapp-broadcast` - Queue broadcast requests
- `whatsapp-status` - Poll broadcast responses

**AI Integration:**
- Marketplace Agent (Worker) - Business/product searches
- Bob/Keza/Gatera (Gemini fallback) - Legacy agent implementations

---

### 2.3 Payments / MoMo QR Generator

**Files:**
- `pages/MomoGenerator.tsx`
- `worker/src/agents/payments.ts`
- `worker/src/tools/payments.ts`

**Features:**
1. **QR code generation**
   - Multi-country support (Rwanda, Kenya, etc.)
   - Transaction types: send, pay
   - USSD code generation
   - QR code image generation (`qrcode` library)

2. **Country-specific formats**
   - Rwanda: `*182*6*1*{p}*{a}#` (send), `*182*6*2*{p}*{a}#` (pay)
   - Kenya: `*234*1*{p}*{a}#` (send), `*234*2*{p}*{a}#` (pay)
   - Extensible for more countries

3. **Parameters**
   - Phone number (optional)
   - Amount (optional)
   - Merchant code (optional)
   - Country selection

**AI Integration:**
- Payments Agent (Worker) - QR generation via `generate_momo_qr` tool

**No Database Tables** (client-side only)

---

### 2.4 QR Scanning

**Files:**
- `pages/QRScanner.tsx`

**Features:**
1. **Camera-based scanning**
   - Uses `html5-qrcode` library
   - Camera permission handling
   - Secure context check (HTTPS required)

2. **QR code parsing**
   - Supports `tel:` URIs (USSD codes)
   - Decodes scanned data
   - Displays parsed content

3. **Error handling**
   - Permission denied
   - Camera not found
   - Camera busy
   - Secure context required

**AI Integration:**
- Payments Agent (Worker) - QR parsing via `parse_qr` tool

**No Database Tables** (client-side only)

---

### 2.5 Onboarding Flows

**Files:**
- `pages/BusinessOnboarding.tsx`
- `services/gemini.ts` (onboardBusiness)

**Features:**
1. **Role selection**
   - Driver: Name, vehicle type, plate number
   - Vendor/Business: AI chat extraction

2. **Driver onboarding**
   - Form-based (step 1 → step 2 → step 3)
   - Validates: name, plate, vehicle type
   - Saves to `profiles` table

3. **Business onboarding**
   - Chat-based with OnboardBot
   - Extracts: name, description, address, location
   - Updates draft profile in real-time
   - Final submission creates profile

**AI Integration:**
- OnboardBot (Gemini) - Extracts business details from chat
- Uses Gemini + Google Maps tools for location resolution

**Database Tables:**
- `user_profiles` (profile data)
- `user_roles` (role assignments)

---

### 2.6 Settings

**Files:**
- `pages/Settings.tsx`
- `components/Address/AddressBook.tsx`
- `services/memory.ts`
- `services/storage.ts`
- `services/push.ts`

**Features:**
1. **Profile management**
   - Display name, phone, role, bio, vehicle plate
   - Saves to `user_profiles` table

2. **Preferences**
   - Theme toggle (dark/light)
   - Location permissions
   - Push notifications
   - Storage persistence

3. **Memory management**
   - View/delete AI-extracted memories
   - LocalStorage-based

4. **Address book**
   - Saved addresses
   - Location autocomplete

**Database Tables:**
- `user_profiles` (profile data)
- `user_roles` (role assignments)

**No AI Integration** (settings only)

---

### 2.7 AI Chat / Session Features

**Files:**
- `pages/ChatSession.tsx`
- `services/agent.ts` (Worker client)
- `services/gemini.ts` (Gemini fallback)
- `components/Chat/MessageBubble.tsx`
- `components/Chat/ChatHome.tsx`

**Features:**
1. **Multi-agent chat**
   - Router Agent (automatic routing)
   - Marketplace Agent (Bob/Keza/Gatera)
   - Mobility Agent
   - Payments Agent
   - Support Agent

2. **Session types**
   - `support` → Support Agent
   - `business` → Marketplace Agent (Bob)
   - `real_estate` → Marketplace Agent (Keza)
   - `legal` → Support Agent (Gatera)
   - `mobility` → Mobility Agent
   - P2P sessions (mock, not implemented)

3. **Input methods**
   - Text input
   - Voice input (Web Speech API)
   - Image upload (attachments)
   - File upload (generic)

4. **Streaming responses**
   - Server-Sent Events (SSE)
   - Token-by-token streaming
   - Tool results streaming

5. **Tool results rendering**
   - Business cards (BusinessResultsMessage)
   - Property cards (PropertyResultsMessage)
   - Legal cards (LegalResultsMessage)
   - QR codes (inline rendering)

6. **Broadcast polling**
   - Polls for business responses
   - Updates verified matches in real-time

**AI Integration:**
- OpenAI Agents SDK (Worker) - PRIMARY
- Gemini (Edge Functions) - LEGACY fallback

**Database Tables:**
- `conversations` (conversation tracking)
- `messages` (message history)
- `broadcasts` (broadcast requests)
- `broadcast_responses` (business responses)

---

## 3. AI-Related Code Paths

### 3.1 OpenAI Agents SDK (Worker) - PRIMARY

**Location:** `worker/` directory

**Architecture:**
```
Frontend (ChatSession)
  ↓ (HTTP POST / SSE)
Cloudflare Worker (worker/src/index.ts)
  ├─→ Router Agent (worker/src/agents/router.ts)
  ├─→ Marketplace Agent (worker/src/agents/marketplace.ts)
  ├─→ Mobility Agent (worker/src/agents/mobility.ts)
  ├─→ Payments Agent (worker/src/agents/payments.ts)
  └─→ Support Agent (worker/src/agents/support.ts)
  ↓
OpenAI API (gpt-4o-mini)
  ↓
Tool Execution (worker/src/tools/)
  ├─→ presence.ts (publish_presence, find_matches)
  ├─→ marketplace.ts (search_offers, create_listing)
  ├─→ payments.ts (generate_momo_qr, parse_qr)
  └─→ geocoding.ts (geocode, estimate_eta)
```

**Client:** `services/agent.ts`
- `AgentService.chat()` - Non-streaming
- `AgentService.chatStream()` - Streaming (SSE)

**Configuration:**
- `config.ts`: `ENABLE_WORKER_AGENT: true`, `WORKER_URL: import.meta.env.VITE_WORKER_URL`
- `ChatSession.tsx`: Uses Worker when `CONFIG.ENABLE_WORKER_AGENT && CONFIG.WORKER_URL`

**Tools:**
1. **presence.ts**
   - `publish_presence(user_id, role, location, vehicle_type?, ttl?)`
   - `find_matches(user_id, role, location, radius_km?, vehicle_type?)`

2. **marketplace.ts**
   - `search_offers(query, location?, filters?)` - Placeholder (full implementation would use Gemini/Google Maps)
   - `create_listing(user_id, title, description, category, price?, currency?, location?)` - Placeholder

3. **payments.ts**
   - `generate_momo_qr(country_id?, tx_type?, phone_number?, amount?, merchant_code?)`
   - `parse_qr(qr_data)`

4. **geocoding.ts**
   - `geocode(query, user_location?)`
   - `estimate_eta(origin, destination, mode?)`

**Model:** `gpt-4o-mini` (OpenAI)

**Streaming:** Server-Sent Events (SSE)

**Error Handling:** Falls back to GeminiService if Worker unavailable (when `ENABLE_WORKER_AGENT: false`)

---

### 3.2 Gemini (Edge Functions) - LEGACY FALLBACK

**Location:** `services/gemini.ts`, `supabase/functions/chat-gemini/index.ts`

**Architecture:**
```
Frontend (GeminiService)
  ↓ (HTTP POST)
services/gemini.ts (askGemini)
  ↓
services/api.ts (callBackend)
  ↓
Supabase Edge Function (chat-gemini)
  ↓
Google Gemini API (gemini-2.5-flash)
```

**Edge Function:** `supabase/functions/chat-gemini/index.ts`
- Model: `gemini-2.5-flash`
- Tools: Google Search, Google Maps (grounding)
- Security: Optional `EDGE_AUTH_SECRET` header

**Agents:**
1. **chatSupport()** - Support Agent
   - System prompt: App knowledge base
   - No tools

2. **chatBob()** - Marketplace Agent (Bob)
   - System prompt: Business search with phone numbers
   - Tools: Google Search, Google Maps
   - Output: `BusinessResultsPayload`

3. **chatKeza()** - Real Estate Agent (Keza)
   - System prompt: Property search
   - Tools: Google Search, Google Maps
   - Output: `PropertyResultsPayload`

4. **chatGatera()** - Legal Agent (Gatera)
   - System prompt: Legal advice, contracts, find lawyers
   - Tools: Google Search
   - Output: `LegalResultsPayload`

5. **onboardBusiness()** - OnboardBot
   - System prompt: Extract business details
   - Tools: Google Search, Google Maps
   - Output: Extracted data (name, description, address, location)

6. **resolveLocation()** - Location Resolver
   - System prompt: Geocode text to coordinates
   - Tools: Google Search, Google Maps
   - Output: Address + lat/lng

7. **getLocationInsight()** - Location Insight
   - System prompt: Describe area context
   - Tools: Google Maps
   - Output: Text description

**Tool-Calling Patterns:**
- Gemini uses function calling with Google Search/Google Maps tools
- Tools are passed as array: `[{googleSearch: {}}, {googleMaps: {}}]`
- Tool config includes location grounding (lat/lng)

**Prompts:**
- System prompts are domain-specific
- Include memory context (`MemoryService.getContextBlock()`)
- Include user location
- Include recent history (last 10 messages)

**Memory Extraction:**
- Background extraction after each response
- Extracts preferences/facts from conversation
- Stores in LocalStorage (`MemoryService`)

**Status:** LEGACY - Only used when Worker unavailable (`ENABLE_WORKER_AGENT: false`)

---

### 3.3 Agent Selection Logic

**Location:** `services/agent.ts` (`mapSessionTypeToAgentType`), `pages/ChatSession.tsx`

**Mapping:**
| ChatSession Type | Worker Agent Type | Gemini Service |
|------------------|-------------------|----------------|
| `mobility` | `mobility` | None |
| `business` | `marketplace` | `chatBob()` |
| `real_estate` | `marketplace` | `chatKeza()` |
| `legal` | `support` | `chatGatera()` |
| `support` | `support` | `chatSupport()` |
| (default) | `router` | None |

**Flow:**
1. Check if Worker enabled and configured
2. If yes → Use Worker (PRIMARY)
3. If no → Use GeminiService (LEGACY fallback)
4. If Worker fails → Show error (if `ENABLE_WORKER_AGENT: true`), else fallback to Gemini

---

### 3.4 Memory System

**Location:** `services/memory.ts`

**Features:**
1. **Storage:** LocalStorage (IndexedDB-compatible API)
2. **Extraction:** Background async extraction after each response
3. **Context:** Injected into prompts via `getContextBlock()`

**Memory Types:**
- `preference` - User preferences
- `fact` - User facts
- `context` - Contextual information

**Usage:**
- GeminiService: Uses memory in all prompts
- Worker: Not currently using memory (future enhancement)

---

## 4. Supabase Usage

### 4.1 Database Tables

| Table | Purpose | Key Columns | RLS Policies | Used By |
|-------|---------|-------------|--------------|---------|
| **user_profiles** | User identity, roles, preferences | user_id (PK), display_name, phone_number, default_role, vehicle_type, settings (JSONB) | Self-read/update/insert | App.tsx, Settings.tsx, BusinessOnboarding.tsx, services/roles.ts |
| **user_roles** | Multi-role support (many-to-many) | user_id, role (PK), is_active | Self-read/update/insert/delete | services/roles.ts |
| **presence** | Real-time location matching | user_id (PK), role, vehicle_type, location (GEOGRAPHY), is_online, last_seen | Public read, self-upsert only | services/presence.ts, worker/src/tools/presence.ts |
| **profiles** | View shim for user_profiles | (view) | Inherited from user_profiles | Services.tsx, Settings.tsx (legacy code) |
| **conversations** | Conversation tracking | id (PK), user_id, agent_type, title | Self-read/insert/update | Future: conversation persistence |
| **messages** | Message history | id (PK), conversation_id, role, content, tool_calls (JSONB), tool_results (JSONB) | Self-read/insert | Future: message persistence |
| **trip_intents** | Scheduled trip intents | id (PK), user_id, role, origin, destination, origin_location (GEOGRAPHY), destination_location (GEOGRAPHY), status | Self-read/insert/update | Future: trip scheduling |
| **broadcasts** | Broadcast requests | id (PK), request_id (UNIQUE), need_description, location_label, status | Service role only | services/whatsapp.ts, supabase/functions/whatsapp-broadcast |
| **broadcast_responses** | Business responses | id (PK), request_id, business_name, business_phone, item_found, response_type | Service role only | services/whatsapp.ts, supabase/functions/whatsapp-status |

**Notes:**
- Multi-role support: `user_roles` table exists, but `default_role` still used for backward compatibility
- Presence table: Public read (for matching), self-upsert only (for privacy)
- Broadcast tables: Service role only (RLS enabled, anon/authenticated revoked)

---

### 4.2 Edge Functions

| Function | Purpose | Input | Output | Invoked By | Status |
|----------|---------|-------|--------|------------|--------|
| **chat-gemini** | Secure Gemini proxy | `{ action: "secure_gemini", prompt, tools, toolConfig }` | `{ status: "success", text }` | services/gemini.ts (askGemini) | ✅ Deployed (LEGACY) |
| **log-request** | Analytics logging | `{ action: "create_request", category, query, location }` | `{ status: "success" }` | services/requestLogger.ts | ✅ Deployed |
| **whatsapp-broadcast** | Broadcast to vendors | `{ action: "queue_broadcast" | "batch_broadcast", request_id, businesses, message }` | `{ status: "success" }` | services/whatsapp.ts | ✅ Deployed (stubbed) |
| **whatsapp-status** | Poll broadcast responses | `{ action: "check_broadcast_status", request_id }` | `{ status: "success", responses }` | services/whatsapp.ts | ✅ Deployed |

**Location:** `supabase/functions/`

**Invocation:** `services/api.ts` (`callBackend()`)
- Maps actions to function names
- Handles offline queueing
- Error handling and fallbacks

**Security:**
- `chat-gemini`: Optional `EDGE_AUTH_SECRET` header (env var)
- All functions: CORS headers
- API keys: Server-side only (env vars in Supabase Dashboard)

---

### 4.3 Auth / Session Handling

**Location:** `App.tsx`, `services/supabase.ts`

**Method:** Anonymous authentication
- `supabase.auth.signInAnonymously()` on app init
- Creates user session automatically
- No login page (Login.tsx exists but unused)

**Session Management:**
- Auto-creates user profile if missing
- Initializes default role (passenger) in `user_roles` table
- Stores user ID in session

**RLS Policies:**
- All tables use RLS
- Policies use `auth.uid()` for user isolation
- Broadcast tables: Service role only

---

### 4.4 Realtime Usage

**Status:** Not explicitly used

**Current Implementation:**
- Presence matching: Polling (every 5 seconds in Discovery.tsx)
- Broadcast polling: Polling (every 3 seconds in ChatSession.tsx)
- No Supabase Realtime subscriptions

**Future Enhancement:**
- Could use Supabase Realtime for presence updates
- Could use Supabase Realtime for broadcast responses

---

### 4.5 RPC Functions

| Function | Purpose | Parameters | Returns | Used By |
|----------|---------|------------|---------|---------|
| **get_nearby_drivers** | PostGIS proximity query | user_lat, user_lng, radius_meters | Array of { user_id, vehicle_type, lat, lng, dist_meters, last_seen } | services/presence.ts, worker/src/tools/presence.ts |

**Location:** `supabase/migrations/20240522_init.sql` (likely)

**RLS:** Public (for matching purposes)

---

## 5. Security Risks

### 5.1 ✅ FIXED: API Key Exposure

**Location:** `vite.config.ts`  
**Status:** ✅ FIXED

**Previous Issue:**
- `GEMINI_API_KEY` was bundled into client bundle via `define`
- Fixed: Removed `define` entries for API keys

**Current State:**
- ✅ No API keys in `vite.config.ts`
- ✅ All API keys server-side only (Edge Functions, Worker secrets)
- ✅ Only `VITE_*` env vars in frontend (safe)

---

### 5.2 ⚠️ Data Model: Multi-Role Support

**Location:** `App.tsx:137`, `supabase/migrations/20250127_multi_role_support.sql`

**Status:** ⚠️ Partially Fixed

**Issue:**
- `default_role: 'passenger'` hard-coded in `App.tsx:137`
- Multi-role support exists (`user_roles` table) but `default_role` still used for backward compatibility

**Impact:**
- Low risk (multi-role works, but `default_role` still used)
- Code could be cleaned up to use `user_roles` exclusively

**Recommendation:**
- Remove `default_role` usage (keep for backward compatibility but prefer `user_roles`)
- Update all role checks to use `user_roles` table

---

### 5.3 ⚠️ Location Privacy

**Location:** `services/presence.ts`, `pages/Discovery.tsx`

**Status:** ⚠️ Moderate Risk

**Issues:**
1. **Public read on presence table**
   - Any user can query all nearby users
   - Mitigation: Only returns location, no personal info
   - Risk: Location tracking possible

2. **No TTL enforcement**
   - Presence records persist until `is_online: false`
   - Risk: Stale location data

3. **Location updates every 30 seconds**
   - Frequent updates can be tracked
   - Risk: Continuous location tracking

**Recommendations:**
1. Add TTL to presence records (auto-cleanup after 5 minutes)
2. Add "go offline" button (exists but could be more prominent)
3. Clear presence on app close
4. Add location consent flow (PermissionModal exists but could be enhanced)

---

### 5.4 ✅ RLS Policies

**Status:** ✅ Generally Secure

**Tables with RLS:**
- ✅ `user_profiles`: Self-read/update/insert
- ✅ `user_roles`: Self-read/update/insert/delete
- ✅ `presence`: Public read (by design), self-upsert only
- ✅ `broadcasts`: Service role only
- ✅ `broadcast_responses`: Service role only
- ✅ `conversations`: Self-read/insert/update (future)
- ✅ `messages`: Self-read/insert (future)

**Gaps:**
- None identified (RLS is enabled and policies are correct)

---

### 5.5 ⚠️ Unsafe Location Handling

**Location:** `services/location.ts`, `pages/Discovery.tsx`

**Status:** ⚠️ Low Risk

**Issues:**
1. **Default location fallback**
   - Uses Kigali coordinates if location unavailable
   - Risk: Could match users incorrectly

2. **No location validation**
   - No bounds checking (could accept invalid coordinates)
   - Risk: Database errors or incorrect matches

**Recommendations:**
1. Add location bounds validation (Rwanda/Kenya bounds)
2. Better error handling for location failures
3. Clear user feedback when location unavailable

---

## 6. Performance Issues

### 6.1 Bundle Size Offenders

**Location:** `package.json`, `vite.config.ts`

**Large Dependencies:**
1. **@google/genai** (~500KB)
   - Still bundled even when Worker is PRIMARY
   - Only used in LEGACY fallback
   - **Recommendation:** Tree-shake or lazy-load when Worker active

2. **@supabase/supabase-js** (~200KB)
   - Required for all Supabase operations
   - **Status:** Necessary

3. **html5-qrcode** (~100KB)
   - Only used in QRScanner page
   - **Status:** Already lazy-loaded (page is lazy)

4. **qrcode** (~50KB)
   - Only used in MomoGenerator page
   - **Status:** Already lazy-loaded (page is lazy)

5. **framer-motion** (~100KB)
   - Used throughout app
   - **Status:** Acceptable (UX benefits)

**Bundle Optimization:**
- ✅ Code splitting via `manualChunks` in `vite.config.ts`
- ✅ Lazy loading for pages (`React.lazy`)
- ⚠️ `@google/genai` still bundled (even if unused)

**Recommendation:**
- Tree-shake `@google/genai` when Worker is PRIMARY
- Or lazy-load GeminiService only when needed

---

### 6.2 Unnecessary Renders

**Location:** Various components

**Potential Issues:**
1. **Discovery.tsx**
   - Location updates every 30 seconds
   - Nearby users polling every 5 seconds
   - **Status:** Necessary for real-time matching

2. **ChatSession.tsx**
   - Streaming updates (token-by-token)
   - **Status:** Necessary for UX

3. **Services.tsx**
   - Broadcast history polling
   - **Status:** Could be optimized with Realtime

**Recommendations:**
- Use React.memo for expensive components
- Use useMemo for computed values
- Consider Supabase Realtime for presence/broadcasts

---

### 6.3 Caching / Query Patterns

**Location:** Various services

**Current State:**
1. **No query caching**
   - Supabase queries not cached
   - Could benefit from React Query (already installed but not used for Supabase)

2. **LocalStorage caching**
   - Memories cached in LocalStorage
   - Profile data cached in LocalStorage (phone)
   - **Status:** Acceptable

3. **Offline queue**
   - Queues requests when offline
   - Syncs when back online
   - **Status:** Good pattern

**Recommendations:**
1. Use React Query for Supabase queries
2. Add query caching for presence data
3. Add query caching for profile data

---

### 6.4 Network Requests

**Current Patterns:**
1. **Polling**
   - Presence: Every 5 seconds
   - Broadcast: Every 3 seconds
   - **Status:** Necessary but could be optimized

2. **Edge Function calls**
   - Gemini: On-demand (chat requests)
   - Broadcast: On-demand
   - **Status:** Acceptable

3. **Worker calls**
   - Streaming (SSE) for chat
   - **Status:** Efficient

**Recommendations:**
1. Use Supabase Realtime for presence (reduce polling)
2. Use Supabase Realtime for broadcasts (reduce polling)
3. Add request debouncing where appropriate

---

## 7. File Path References

### 7.1 Pages

```
pages/
├── Discovery.tsx          # Mobility matching (drivers/passengers)
├── Business.tsx           # Marketplace entry (category grid)
├── Services.tsx           # Support & utilities hub
├── Settings.tsx           # User preferences & profile
├── MomoGenerator.tsx      # Payment QR code generator
├── QRScanner.tsx          # QR code scanner
├── BusinessOnboarding.tsx # Business registration flow
├── ChatSession.tsx        # Multi-agent chat overlay
└── Login.tsx              # Unused (anonymous auth)
```

### 7.2 Services

```
services/
├── agent.ts               # OpenAI Worker client
├── gemini.ts              # Gemini service (LEGACY)
├── api.ts                 # Edge Function client
├── supabase.ts            # Supabase client
├── presence.ts            # Location matching
├── location.ts            # Geolocation wrapper
├── whatsapp.ts            # Broadcast polling
├── memory.ts              # User preferences/context
├── roles.ts               # Multi-role management
├── offlineQueue.ts        # Offline request queuing
├── monitoring.ts          # Error tracking
├── storage.ts             # LocalStorage helpers
├── vitals.ts              # Performance monitoring
├── waiter.ts              # Debounce/throttle utilities
├── requestLogger.ts       # Analytics
└── push.ts                # Push notifications
```

### 7.3 Components

```
components/
├── Chat/
│   ├── ChatHome.tsx       # AI-first home screen
│   └── MessageBubble.tsx  # Chat message component
├── Business/
│   ├── BusinessCardWidget.tsx
│   ├── BusinessResultsMessage.tsx
│   └── VerifiedBusinessList.tsx
├── Discovery/
│   ├── NearbyListCard.tsx
│   └── VehicleSelector.tsx
├── RealEstate/
│   ├── PropertyCardWidget.tsx
│   └── PropertyResultsMessage.tsx
├── Legal/
│   └── LegalResultsMessage.tsx
├── Location/
│   ├── PermissionModal.tsx
│   └── SmartLocationInput.tsx
├── Scheduling/
│   └── ScheduleModal.tsx
├── Address/
│   └── AddressBook.tsx
└── UI/
    └── MobileSheet.tsx
```

### 7.4 Worker

```
worker/
├── src/
│   ├── index.ts           # Worker entry point
│   ├── agents/
│   │   ├── router.ts      # Router agent
│   │   ├── marketplace.ts # Marketplace agent
│   │   ├── mobility.ts    # Mobility agent
│   │   ├── payments.ts    # Payments agent
│   │   └── support.ts     # Support agent
│   ├── tools/
│   │   ├── presence.ts    # Presence tools
│   │   ├── marketplace.ts # Marketplace tools
│   │   ├── payments.ts    # Payments tools
│   │   └── geocoding.ts   # Geocoding tools
│   └── utils/
│       ├── supabase.ts    # Supabase client
│       └── tools.ts       # Tool execution
└── wrangler.toml          # Worker config
```

### 7.5 Supabase

```
supabase/
├── functions/
│   ├── chat-gemini/       # Gemini proxy (LEGACY)
│   ├── log-request/       # Analytics logging
│   ├── whatsapp-broadcast/ # Broadcast to vendors
│   └── whatsapp-status/   # Poll broadcast responses
└── migrations/
    ├── 20240522_init.sql
    ├── 20241219_broadcast_tables.sql
    ├── 20250127_multi_role_support.sql
    ├── 20250127_conversations_messages.sql
    ├── 20250305_secure_rds_and_profiles.sql
    └── 20251222_fix_presence_rls.sql
```

---

## 8. Summary Statistics

**Total Files:**
- Pages: 9 (8 active, 1 unused)
- Services: 17
- Components: 20+
- Worker agents: 5
- Worker tools: 4
- Edge Functions: 4
- Database tables: 9 (5 core, 4 future/broadcast)

**Code Size:**
- Frontend: ~15,000+ lines (estimated)
- Worker: ~2,000+ lines (estimated)
- Edge Functions: ~500 lines (estimated)

**Dependencies:**
- Frontend: 16 dependencies
- Worker: 3 dependencies
- Large bundles: @google/genai, @supabase/supabase-js, framer-motion

---

## 9. Critical Findings Summary

### ✅ Security (Fixed)
1. ✅ No API keys in frontend (vite.config.ts fixed)
2. ✅ RLS policies correct
3. ✅ Edge Functions secured

### ⚠️ Security (Issues)
1. ⚠️ Location privacy (public read on presence)
2. ⚠️ No TTL on presence records
3. ⚠️ Multi-role support partially implemented (default_role still used)

### ⚠️ Performance
1. ⚠️ @google/genai still bundled (even if unused)
2. ⚠️ Polling instead of Realtime
3. ⚠️ No query caching (React Query installed but not used)

### ✅ Architecture
1. ✅ Worker is PRIMARY (OpenAI Agents SDK)
2. ✅ Gemini is LEGACY fallback
3. ✅ All features preserved
4. ✅ AI-first UX implemented (ChatHome)

---

## 10. Next Steps

See `REFACTOR_PLAN_AI_FIRST.md` for detailed refactor plan with phases, acceptance criteria, and "no feature loss" checklist.

