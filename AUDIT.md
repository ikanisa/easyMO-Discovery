# easyMO Discovery - Comprehensive Codebase Audit

**Date:** 2025-01-27  
**Purpose:** Deep audit before AI-first refactor to OpenAI Agents SDK + ChatGPT App readiness

---

## 1. Executive Summary

### Current State
- **Stack:** React 19 + Vite + TypeScript, Supabase, Google Gemini (via Edge Functions)
- **Deployment:** Cloudflare Pages (PWA), Supabase Edge Functions
- **Architecture:** Multi-agent chat system (Bob/Marketplace, Keza/Real Estate, Gatera/Legal, Support), Mobility matching, MoMo QR payments
- **AI Engine:** Gemini 2.5-flash / 3.0-flash-preview via Edge Functions (fallback to client-side in dev)

### Critical Issues
1. **🔴 CRITICAL SECURITY:** `vite.config.ts` bundles `GEMINI_API_KEY` into client bundle via `define`
2. **🔴 CRITICAL DATA MODEL:** Hard-coded `default_role: 'passenger'` in `App.tsx:136` - clashes with multi-role requirement
3. **🟡 VERSION MISMATCH:** `package.json` shows React 18.2.0 (not 19.0.0 as mentioned in user query - need verification)
4. **🟡 AI ARCHITECTURE:** Gemini runs client-side as fallback (dev-only guard, but still risky pattern)

### Preservation Requirements
- **ALL** existing pages must remain accessible (even if hidden behind chat)
- **ALL** agent types must be preserved (Bob, Keza, Gatera, Support, Mobility)
- **ALL** features must work (Discovery, Business, Services, Momo, QR, Settings, Onboarding)

---

## 2. Complete Feature Inventory

### 2.1 Pages / Routes (`pages/`)

| Page | Route/Mode | Purpose | Key Features | AI Agents Used |
|------|-----------|---------|--------------|----------------|
| **Home** | `AppMode.HOME` | Landing screen | Search bar, widget tiles (Mobility, Tools), theme toggle | None (entry point) |
| **Discovery** | `AppMode.DISCOVERY` | Mobility matching | Presence publishing, nearby drivers/passengers, vehicle filters, schedule trips | None (UI only) |
| **Business** | `AppMode.BUSINESS` | Marketplace entry | Category grid (Restaurants, Pharmacies, etc.), launches Bob/Keza/Gatera | Bob, Keza, Gatera |
| **Services** | `AppMode.SERVICES` | Support & utilities | Support chat, Settings link, Business Onboarding | Support Agent |
| **ChatSession** | Modal overlay | Multi-agent chat | Text/voice/image input, streaming responses, result cards (business/property/legal), broadcast polling | All agents |
| **MomoGenerator** | `AppMode.MOMO_GENERATOR` | Payment QR codes | Generate MoMo QR for multiple countries (Rwanda, Kenya, etc.), USSD codes | None |
| **QRScanner** | `AppMode.SCANNER` | QR code scanner | Scan QR codes, parse payment data | None |
| **Settings** | `AppMode.SETTINGS` | User preferences | Theme, location permissions, profile | None |
| **BusinessOnboarding** | `AppMode.ONBOARDING` | Business registration | OnboardBot agent, extract business details | OnboardBot (Gemini) |
| **Login** | Unused? | Authentication | Phone login (appears unused - app uses anonymous auth) | None |

### 2.2 AI Agents (`services/gemini.ts`)

| Agent | Function | Purpose | Inputs | Outputs | Tools |
|-------|----------|---------|--------|---------|-------|
| **Support Agent** | `chatSupport()` | Help/FAQ | History, message, attachment | Text response | None |
| **Bob (Marketplace)** | `chatBob()` | Find businesses/products | History, message, location, attachment | Text + `BusinessResultsPayload` | Google Search, Google Maps |
| **Keza (Real Estate)** | `chatKeza()` | Find properties | History, message, location, attachment | Text + `PropertyResultsPayload` | Google Search, Google Maps |
| **Gatera (Legal)** | `chatGatera()` | Legal advice, contracts, find lawyers | History, message, location, attachment | Text + `LegalResultsPayload` | Google Search |
| **OnboardBot** | `onboardBusiness()` | Extract business registration details | History, message, location | Text + extracted data (name, description, address, location) | Google Search, Google Maps |
| **Location Resolver** | `resolveLocation()` | Geocode text to coordinates | Query, user location (optional) | Address + lat/lng | Google Search, Google Maps |
| **Location Insight** | `getLocationInsight()` | Describe area context | lat/lng | Text description | Google Maps |

### 2.3 Core Services (`services/`)

| Service | File | Purpose | Key Functions |
|---------|------|---------|---------------|
| **Gemini** | `gemini.ts` | AI agent orchestration | All agent functions, `askGemini()` (backend proxy + fallback) |
| **API** | `api.ts` | Edge Function client | `callBackend()`, `flushQueuedRequests()` |
| **Supabase** | `supabase.ts` | DB client | Supabase client, `NetworkService` |
| **Presence** | `presence.ts` | Real-time location matching | `upsertPresence()`, `getNearby()`, `goOffline()`, `syncPending()` |
| **Location** | `location.ts` | Geolocation wrapper | `getCurrentPosition()`, `startWatching()`, `requestWakeLock()` |
| **WhatsApp** | `whatsapp.ts` | Broadcast polling | `pollBroadcastResponses()`, `BusinessContact` type |
| **Memory** | `memory.ts` | User preferences/context | `addMemory()`, `getContextBlock()` |
| **Offline Queue** | `offlineQueue.ts` | Offline request queuing | `enqueue()`, `flush()`, `getCount()` |
| **Monitoring** | `monitoring.ts` | Error tracking | `captureException()`, `captureMessage()` |
| **Storage** | `storage.ts` | LocalStorage helpers | Various |
| **Vitals** | `vitals.ts` | Performance monitoring | Web Vitals tracking |
| **Waiter** | `waiter.ts` | Debounce/throttle utilities | Various |
| **Request Logger** | `requestLogger.ts` | Analytics | `sendCategoryRequest()` |

### 2.4 UI Components (`components/`)

**Discovery:**
- `NearbyListCard.tsx` - Driver/passenger match card
- `VehicleSelector.tsx` - Vehicle type picker

**Business:**
- `BusinessCardWidget.tsx` - Business listing card
- `BusinessResultsMessage.tsx` - Business search results renderer
- `VerifiedBusinessList.tsx` - Verified matches from broadcast

**Real Estate:**
- `PropertyCardWidget.tsx` - Property listing card
- `PropertyResultsMessage.tsx` - Property search results renderer

**Legal:**
- `LegalResultsMessage.tsx` - Legal professional results renderer

**Chat:**
- `MessageBubble.tsx` - Chat message component

**Location:**
- `PermissionModal.tsx` - Location permission request
- `SmartLocationInput.tsx` - Location input with autocomplete

**Scheduling:**
- `ScheduleModal.tsx` - Trip scheduling interface

**UI:**
- `MobileSheet.tsx` - Bottom sheet component
- `Button.tsx` - Button component
- `Layout.tsx` - App layout with bottom nav
- `LoadingScreen.tsx` - Loading state
- `ErrorBoundary.tsx` - Error handling
- `InstallPrompt.tsx` - PWA install prompt
- `OfflineBanner.tsx` - Offline status banner

**Address:**
- `AddressBook.tsx` - Saved addresses

---

## 3. Backend Architecture

### 3.1 Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose | Input | Output | Status |
|----------|---------|-------|--------|--------|
| **chat-gemini** | Secure Gemini proxy | `{ action: "secure_gemini", prompt, tools, toolConfig }` | `{ status: "success", text }` | ✅ Deployed |
| **log-request** | Analytics logging | `{ action: "create_request", ... }` | `{ status: "success" }` | ✅ Deployed |
| **whatsapp-broadcast** | Broadcast to vendors | `{ action: "queue_broadcast" | "batch_broadcast", ... }` | `{ status: "success" }` | ✅ Deployed (stubbed) |
| **whatsapp-status** | Poll broadcast responses | `{ action: "check_broadcast_status", ... }` | `{ status: "success", responses }` | ✅ Deployed |

### 3.2 Database Schema (from migrations)

**Tables:**
1. **`user_profiles`** - User identity, roles, preferences
   - `user_id` (PK, UUID, references auth.users)
   - `display_name`, `phone_number`
   - `default_role` (TEXT, constraint: 'passenger' | 'driver' | 'vendor') ⚠️ **SINGLE ROLE**
   - `vehicle_type`, `verified`, `rating`, `total_trips`, `total_earnings`
   - `settings` (JSONB), `created_at`, `updated_at`

2. **`presence`** - Real-time location matching
   - `user_id` (PK, UUID)
   - `role` (TEXT, NOT NULL)
   - `vehicle_type` (TEXT)
   - `location` (GEOGRAPHY(POINT), NOT NULL) - PostGIS required
   - `is_online` (BOOLEAN), `last_seen` (TIMESTAMPTZ)

3. **`profiles`** - View shim for `user_profiles` (legacy compatibility)

4. **WhatsApp/Broadcast tables** (secured, service_role only):
   - `whatsapp_webhook_events`, `whatsapp_messages`, `whatsapp_threads`
   - `leads`, `lead_state_events`, `vendor_responses`, `vendors`

**RPC Functions:**
- `get_nearby_drivers(user_lat, user_lng, radius_meters)` - PostGIS proximity query

**RLS Policies:**
- `presence`: Public read, self-upsert only
- `user_profiles`: Self-read/update/insert
- Broadcast tables: Service role only (RLS enabled, anon/authenticated revoked)

### 3.3 External APIs / Services

- **Google Gemini** - Via Edge Function (secure) + client fallback (dev only)
- **Google Maps** - Used via Gemini tools (geocoding, places, routing)
- **Supabase Realtime** - Not explicitly used (presence uses polling)
- **Cloudflare Pages** - Static hosting
- **WhatsApp API** - Stubbed in broadcast function

---

## 4. Current AI Flow

### 4.1 Request Flow

```
User Input (ChatSession)
  ↓
GeminiService.[agent]()
  ↓
askGemini()
  ├─→ callBackend({ action: "secure_gemini", ... })  [PREFERRED]
  │     ↓
  │   Supabase Edge Function: chat-gemini
  │     ↓
  │   GoogleGenAI.generateContent()
  │     ↓
  │   Response → Frontend
  │
  └─→ [FALLBACK: Dev Only]
        ↓
      Direct GoogleGenAI (client-side) ⚠️ EXPOSES KEY
        ↓
      Response → Frontend
```

### 4.2 Agent Selection Logic

- **Support:** `ChatSession` with `type: 'support'` → `chatSupport()`
- **Bob (Marketplace):** `ChatSession` with `type: 'business'` → `chatBob()`
- **Keza (Real Estate):** `ChatSession` with `type: 'real_estate'` → `chatKeza()`
- **Gatera (Legal):** `ChatSession` with `type: 'legal'` → `chatGatera()`
- **OnboardBot:** `BusinessOnboarding` page → `onboardBusiness()`
- **Mobility:** No AI agent (UI-only matching via `PresenceService`)

### 4.3 Memory System

- **Storage:** LocalStorage (IndexedDB-compatible API)
- **Extraction:** Background async extraction after each response
- **Usage:** Injected into prompt context via `getContextBlock()`

---

## 5. Security & Risk Analysis

### 5.1 🔴 CRITICAL: API Key Exposure

**Location:** `vite.config.ts:30-31`
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

**Risk:** API keys bundled into client JavaScript bundle. Anyone can extract keys from source.

**Impact:** 
- Keys can be extracted from deployed bundle
- Rate limits can be exhausted
- Costs can be incurred by attackers
- Violates Google API terms

**Fix Required:**
- Remove `define` entries for API keys
- Ensure all Gemini calls go through Edge Functions only
- Remove client-side fallback (or make it truly dev-only with explicit check)

### 5.2 🔴 CRITICAL: Hard-coded Role Model

**Location:** `App.tsx:136`
```typescript
default_role: 'passenger',
```

**Risk:** Users cannot have multiple roles. Schema enforces single role.

**Impact:**
- Cannot be passenger + driver simultaneously
- Cannot add new role types without migration
- Clashes with requirement: "users can have multiple roles"

**Fix Required:**
- Create `user_roles` join table (many-to-many)
- Remove `default_role` from `user_profiles`
- Update all role checks to query `user_roles`
- Migrate existing data

### 5.3 🟡 MEDIUM: Version Mismatch Risk

**Location:** `package.json:24-25`
```json
"react": "18.2.0",
"react-dom": "18.2.0",
```

**Note:** User query mentioned React 19, but package.json shows 18.2.0. Need to verify actual installed version.

**Risk:** If versions diverge, runtime errors can occur.

**Fix Required:**
- Align React and React-DOM to exact same version
- Pin (no caret) if necessary

### 5.4 🟡 MEDIUM: Client-Side Gemini Fallback

**Location:** `services/gemini.ts:56-106`

**Risk:** Dev guard can be bypassed, or accidentally enabled in production builds.

**Current Guard:**
```typescript
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
```

**Risk:** If Edge Function fails in production, user gets error (good), but fallback code is still in bundle.

**Fix Required:**
- Remove fallback entirely, OR
- Use build-time env check to exclude fallback code from production bundle

### 5.5 🟢 LOW: Location Privacy

**Current State:**
- Location shared via `presence` table (public read)
- No TTL enforcement
- No explicit consent flow (only permission modal)

**Risk:** Users' locations can be tracked indefinitely.

**Recommendation:**
- Add TTL to presence records
- Add "go offline" button
- Clear presence on app close (if desired)

### 5.6 🟢 LOW: CORS Headers

**Location:** `supabase/functions/chat-gemini/index.ts:8-11`
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  ...
};
```

**Risk:** Allows any origin (acceptable for public API, but document intent).

---

## 6. Build & Deployment

### 6.1 Build Configuration

- **Build Tool:** Vite 6.2.0
- **Build Command:** `npm run build` → `vite build`
- **Output:** `dist/`
- **PWA:** `vite-plugin-pwa` with `injectManifest` strategy
- **Service Worker:** `pwa/service-worker.ts`

### 6.2 Environment Variables

| Variable | Required | Used By | Location |
|----------|----------|---------|----------|
| `VITE_SUPABASE_URL` | ✅ | Frontend | `services/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Frontend | `services/supabase.ts` |
| `GEMINI_API_KEY` | ⚠️ | Vite define (REMOVE), Edge Function | `vite.config.ts` (REMOVE), `supabase/functions/chat-gemini/index.ts` |
| `EDGE_AUTH_SECRET` | ❌ | Edge Function (optional) | `supabase/functions/chat-gemini/index.ts` |

### 6.3 Deployment

- **Frontend:** Cloudflare Pages (`npm run pages:deploy` → `wrangler pages deploy dist`)
- **Edge Functions:** Supabase Dashboard (manual deploy or CLI)
- **Database:** Supabase (migrations via dashboard or CLI)

---

## 7. Performance & PWA Gaps

### 7.1 PWA Features
- ✅ Service Worker (`injectManifest`)
- ✅ Manifest (`pwa/manifest.webmanifest`)
- ✅ Offline page (`pwa/offline.html`)
- ✅ Install prompt component
- ✅ Offline queue system
- ⚠️ Realtime: Not using Supabase Realtime (uses polling for presence)

### 7.2 Performance
- ✅ Code splitting (manual chunks in Vite config)
- ✅ Lazy loading (React.lazy for pages)
- ✅ Image optimization (implicit via Vite)
- ⚠️ Bundle size: Gemini client bundled (even if unused in prod)

---

## 8. Preservation List (Must Keep)

### 8.1 Pages (ALL must remain accessible)
1. ✅ Home - Entry screen with search + widgets
2. ✅ Discovery - Mobility matching UI
3. ✅ Business - Marketplace entry
4. ✅ Services - Support & utilities
5. ✅ ChatSession - Multi-agent chat (modal)
6. ✅ MomoGenerator - Payment QR generator
7. ✅ QRScanner - QR code scanner
8. ✅ Settings - User preferences
9. ✅ BusinessOnboarding - Business registration

### 8.2 Agents (ALL must be preserved)
1. ✅ Bob (Marketplace) - `chatBob()`
2. ✅ Keza (Real Estate) - `chatKeza()`
3. ✅ Gatera (Legal) - `chatGatera()`
4. ✅ Support Agent - `chatSupport()`
5. ✅ OnboardBot - `onboardBusiness()`
6. ✅ Location Resolver - `resolveLocation()`
7. ✅ Location Insight - `getLocationInsight()`

### 8.3 Features (ALL must work)
1. ✅ Presence/Matching - Real-time location-based matching
2. ✅ Business Search - Find businesses with phone numbers
3. ✅ Property Search - Find properties for rent/sale
4. ✅ Legal Services - Advice, contracts, find lawyers
5. ✅ MoMo QR Generation - Multi-country payment QR codes
6. ✅ QR Scanning - Scan and parse QR codes
7. ✅ Broadcast Polling - WhatsApp vendor responses
8. ✅ Offline Queue - Queue requests when offline
9. ✅ Location Services - Geolocation, permissions, wake lock
10. ✅ Memory System - User preference extraction
11. ✅ Voice Input - Speech recognition
12. ✅ Image Upload - Attachment support in chat
13. ✅ Scheduled Trips - Trip scheduling modal

### 8.4 UI Components (ALL must render)
- All component files listed in section 2.4

---

## 9. Migration Strategy Notes

### Phase 1: Security Fixes (Non-Breaking)
- Remove `GEMINI_API_KEY` from `vite.config.ts` define
- Align React versions
- Remove client-side Gemini fallback (or guard better)

### Phase 2: Data Model (Breaking, but Migratable)
- Create `user_roles` table
- Migrate `default_role` → `user_roles`
- Update all role queries
- Remove `default_role` column (optional, keep for backward compat initially)

### Phase 3: Agent Backend (New Layer)
- Create Cloudflare Worker with OpenAI Agents SDK
- Implement orchestrator + sub-agents
- Migrate Gemini tools to OpenAI tools
- Add streaming support

### Phase 4: UI Refactor (Preserve Functionality)
- Add chat-first home screen
- Keep existing pages as "detail views"
- Add tool cards for results
- Maintain all navigation paths

### Phase 5: ChatGPT App (New Surface)
- Expose MCP server from Worker
- Create minimal UI bundle for ChatGPT iframe
- Add privacy policy
- Prepare submission docs

---

## 10. References

- **Main App:** `App.tsx`
- **Routing:** `AppMode` enum in `types.ts`
- **Agents:** `services/gemini.ts`
- **API:** `services/api.ts`
- **Presence:** `services/presence.ts`
- **Schema:** `supabase/migrations/`
- **Config:** `vite.config.ts`, `config.ts`
- **Types:** `types.ts`

---

**END OF AUDIT**

