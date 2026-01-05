# easyMO Discovery - AI-First Refactor Plan

**Date:** 2025-01-27  
**Goal:** Transform to AI-first, chat-native PWA using OpenAI Agents SDK, while preserving ALL existing features

---

## Overview

### Current State
- Multi-agent chat system (Bob/Keza/Gatera/Support) powered by Gemini
- Multi-vertical PWA (Mobility, Marketplace, Payments, Services)
- Client-side Gemini fallback (security risk)
- Single-role user model (needs multi-role support)

### Target State
- AI-first chat interface (chat as primary UI, pages as detail views)
- OpenAI Agents SDK backend (Cloudflare Worker)
- Multi-role user model (user can be passenger + driver + vendor)
- ChatGPT App ready (MCP server + UI bundle)
- Gemini/Google Maps as optional backend tools (geocoding, places, routing)

---

## Phases

### Phase 1: Critical Security Fixes (Non-Breaking) ✅ PRIORITY
**Goal:** Fix security vulnerabilities without breaking existing functionality

**Tasks:**
1. Remove `GEMINI_API_KEY` from `vite.config.ts` `define` block
2. Align React/React-DOM versions (verify actual versions, pin if needed)
3. Remove client-side Gemini fallback (or guard strictly with build-time env)
4. Verify all Gemini calls go through Edge Functions only

**Deliverables:**
- ✅ Updated `vite.config.ts` (no API key defines)
- ✅ Updated `package.json` (aligned React versions)
- ✅ Updated `services/gemini.ts` (removed/guarded fallback)
- ✅ Verification: No API keys in bundle

**Testing:**
- Build bundle, verify no keys in source
- Test all agent flows (Bob, Keza, Gatera, Support)
- Verify Edge Functions handle all requests

**Time Estimate:** 1-2 hours

---

### Phase 2: Multi-Role Data Model (Breaking, Migratable)
**Goal:** Support users with multiple roles (passenger + driver + vendor)

**Tasks:**
1. Create `user_roles` join table (many-to-many)
2. Migrate existing `default_role` → `user_roles`
3. Update all role queries to use `user_roles`
4. Remove `default_role` hard-coding from `App.tsx`
5. Update `PresenceService` to support multi-role presence
6. Update UI to allow role switching

**Supabase Migration:**
```sql
-- Create user_roles table
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'vendor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- Migrate existing default_role
INSERT INTO user_roles (user_id, role, is_active)
SELECT user_id, default_role, true
FROM user_profiles
WHERE default_role IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own roles" ON user_roles FOR ALL USING (auth.uid() = user_id);

-- Keep default_role column for backward compat (remove later)
-- Optionally: Add function to get active roles
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(role) FROM user_roles WHERE user_id = p_user_id AND is_active = true;
$$ LANGUAGE sql STABLE;
```

**Code Changes:**
- Update `App.tsx:136` - Remove `default_role: 'passenger'`, query `user_roles` instead
- Update `types.ts` - Add `Role[]` type for multi-role
- Update `services/presence.ts` - Support multi-role presence publishing
- Update `pages/Discovery.tsx` - Role toggle UI
- Add service: `services/roles.ts` - Role management helpers

**Deliverables:**
- ✅ Migration SQL file
- ✅ Updated `App.tsx` (no hard-coded role)
- ✅ Updated `services/presence.ts` (multi-role support)
- ✅ Updated UI (role switching)

**Testing:**
- Test role creation/deletion
- Test multi-role presence publishing
- Test role-based queries
- Verify migration doesn't break existing users

**Time Estimate:** 4-6 hours

---

### Phase 3: OpenAI Agents SDK Backend (New Layer)
**Goal:** Create Cloudflare Worker with OpenAI Agents SDK, replacing Gemini as primary brain

**Architecture:**
```
PWA Frontend (React)
  ↓ (SSE stream)
Cloudflare Worker (OpenAI Agents SDK)
  ├─→ RouterAgent (orchestrator)
  │   ├─→ MobilityAgent
  │   ├─→ MarketplaceAgent
  │   ├─→ PaymentsAgent
  │   └─→ SupportAgent
  └─→ Tools Layer
      ├─→ Supabase (presence, matching, listings)
      ├─→ Gemini (optional: geocoding, places, routing)
      └─→ Google Maps APIs (optional: ETA, directions)
```

**Tasks:**
1. Create Cloudflare Worker project (`/worker` directory)
2. Install OpenAI Agents SDK (TypeScript)
3. Implement RouterAgent (orchestrator)
4. Implement sub-agents:
   - MobilityAgent (presence, matching, ETA)
   - MarketplaceAgent (search listings, create listings)
   - PaymentsAgent (MoMo QR generation, QR parsing)
   - SupportAgent (help/FAQ)
5. Implement tools:
   - `publish_presence(role, location, vehicle_type?, ttl?)`
   - `find_matches(role, location, radius_km, vehicle_type?)`
   - `search_offers(query, location, filters?)`
   - `create_listing(...)`
   - `generate_momo_qr(amount, currency, reference)`
   - `parse_qr(image_or_text)`
   - `geocode(text, user_location?)` (Gemini/Google Maps)
   - `estimate_eta(origin, destination)` (Google Maps)
   - `gemini_enhance_text(prompt)` (optional Gemini tool)
6. Add streaming support (SSE)
7. Add tool tracing/logging (Supabase)

**Worker Structure:**
```
worker/
├── src/
│   ├── index.ts (entry point)
│   ├── agents/
│   │   ├── router.ts (RouterAgent)
│   │   ├── mobility.ts (MobilityAgent)
│   │   ├── marketplace.ts (MarketplaceAgent)
│   │   ├── payments.ts (PaymentsAgent)
│   │   └── support.ts (SupportAgent)
│   ├── tools/
│   │   ├── presence.ts
│   │   ├── matching.ts
│   │   ├── marketplace.ts
│   │   ├── payments.ts
│   │   ├── geocoding.ts
│   │   └── gemini.ts (optional)
│   ├── types.ts
│   └── utils.ts
├── wrangler.toml
└── package.json
```

**Deliverables:**
- ✅ Cloudflare Worker project
- ✅ RouterAgent + sub-agents
- ✅ Tools implementation
- ✅ SSE streaming endpoint
- ✅ Tool tracing in Supabase

**Testing:**
- Test agent routing
- Test all tools
- Test streaming responses
- Test error handling

**Time Estimate:** 12-16 hours

---

### Phase 4: UI Refactor to AI-First (Preserve Functionality)
**Goal:** Make chat the primary interface, pages become detail views

**UI Changes:**
- **Home Screen:** Chat composer + smart chips (replaces widget tiles)
- **Chat Interface:** Tool cards for results (matches, listings, QR)
- **Pages:** Become "detail views" accessible from chat
- **Navigation:** Command palette pattern (single input handles all intents)

**Tasks:**
1. Create new `ChatHome` component (replaces home widget grid)
2. Update `ChatSession` to render tool cards (matches, listings, QR)
3. Keep all existing pages but make them openable from chat
4. Add "Command Palette" pattern (single input → intent routing)
5. Add role toggle pill (replaces role selection gates)
6. Update navigation (chat-first, pages as secondary)

**Component Changes:**
- New: `components/Chat/ChatHome.tsx` - Chat-first home screen
- New: `components/Chat/ToolCards.tsx` - Match/listing/QR cards
- Update: `App.tsx` - Default to chat home
- Update: `pages/Discovery.tsx` - Openable from chat (detail view)
- Update: `pages/Business.tsx` - Openable from chat (detail view)
- Update: `pages/MomoGenerator.tsx` - Openable from chat (detail view)
- Keep: All other pages (accessible via chat or nav)

**Deliverables:**
- ✅ `ChatHome` component
- ✅ Tool cards component
- ✅ Updated `App.tsx` (chat-first)
- ✅ Updated `ChatSession` (tool cards)
- ✅ All pages remain accessible

**Testing:**
- Test chat-first flow
- Test all pages still accessible
- Test tool cards render correctly
- Test command palette routing

**Time Estimate:** 10-14 hours

---

### Phase 5: Frontend Integration (Connect UI to Worker)
**Goal:** Connect PWA frontend to OpenAI Agents SDK Worker

**Tasks:**
1. Create service: `services/agent.ts` - Worker client
2. Update `ChatSession` to use Worker SSE endpoint
3. Replace Gemini service calls with Worker calls
4. Handle streaming responses (tokens + tool calls)
5. Render tool cards from tool responses
6. Maintain backward compat (graceful fallback if Worker unavailable)

**Service Changes:**
- New: `services/agent.ts` - SSE client for Worker
- Update: `services/gemini.ts` - Mark as deprecated, or keep for fallback
- Update: `pages/ChatSession.tsx` - Use `services/agent.ts`

**Deliverables:**
- ✅ `services/agent.ts` (SSE client)
- ✅ Updated `ChatSession` (Worker integration)
- ✅ Streaming support
- ✅ Tool card rendering

**Testing:**
- Test streaming responses
- Test tool calls
- Test error handling
- Test offline fallback

**Time Estimate:** 6-8 hours

---

### Phase 6: Supabase Schema Updates (Conversation Tracking)
**Goal:** Add conversation tracking, tool traces, multi-role support

**Tasks:**
1. Create `conversations` table
2. Create `messages` table
3. Create `tool_traces` table
4. Update RLS policies
5. Add Realtime subscriptions (optional)

**Migration:**
```sql
-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'mobility' | 'marketplace' | 'payments' | 'support'
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool Traces
CREATE TABLE tool_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  latency_ms INTEGER,
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
);

ALTER TABLE tool_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own tool traces" ON tool_traces FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = tool_traces.conversation_id AND user_id = auth.uid())
);
```

**Deliverables:**
- ✅ Migration SQL
- ✅ Updated Worker (save conversations/tools)
- ✅ Updated UI (optional: conversation history)

**Testing:**
- Test conversation creation
- Test message storage
- Test tool trace logging
- Test RLS policies

**Time Estimate:** 4-6 hours

---

### Phase 7: ChatGPT App Packaging (MCP Server + UI)
**Goal:** Package as ChatGPT App (Apps SDK compliant)

**Tasks:**
1. Expose MCP server from Worker (`/mcp` endpoint)
2. Implement MCP tools (same as Worker tools, but MCP format)
3. Create minimal UI bundle for ChatGPT iframe
4. Add app metadata (name, description, privacy policy URL)
5. Create submission docs

**MCP Server:**
- Endpoint: `https://your-worker.workers.dev/mcp`
- Tools: Same tools as Worker, but MCP-compliant schema
- Format: OpenAI Apps SDK MCP spec

**UI Bundle:**
- Minimal React component bundle
- Renders tool cards (matches, listings, QR)
- Iframe-friendly (no navigation, embedded in ChatGPT)

**Structure:**
```
apps-sdk/
├── mcp/
│   └── index.ts (MCP server endpoint in Worker)
├── web/
│   ├── index.tsx (React entry)
│   ├── App.tsx (minimal UI)
│   └── components/
│       ├── MatchCard.tsx
│       ├── ListingCard.tsx
│       └── QRCard.tsx
└── docs/
    ├── CHATGPT_APP_SUBMISSION.md
    └── PRIVACY_POLICY.md
```

**Deliverables:**
- ✅ MCP server endpoint
- ✅ UI bundle
- ✅ Submission docs
- ✅ Privacy policy

**Testing:**
- Test MCP server (tools accessible)
- Test UI bundle (renders in iframe)
- Test end-to-end (ChatGPT → MCP → Tools → UI)

**Time Estimate:** 8-10 hours

---

### Phase 8: Privacy & Safety (App Store Readiness)
**Goal:** Meet OpenAI App Directory requirements

**Tasks:**
1. Create privacy policy page (`/privacy` or `/public/privacy.html`)
2. Add location consent UX (explicit opt-in, TTL, "go offline")
3. Add safety constraints (no doxxing, minimal retention)
4. Create submission checklist
5. Prepare verification docs

**Privacy Policy Requirements:**
- Data categories collected
- Purpose of collection
- Third-party services (Gemini, Google Maps, Supabase)
- User controls (delete data, opt-out)
- Contact information

**Safety Constraints:**
- No revealing exact locations publicly
- Minimal retention (presence TTL, conversation cleanup)
- Explicit consent for location sharing
- "Go offline" button

**Deliverables:**
- ✅ Privacy policy page
- ✅ Location consent UX
- ✅ Safety docs
- ✅ Submission checklist

**Testing:**
- Test privacy policy accessibility
- Test location consent flow
- Test "go offline" button
- Review checklist completeness

**Time Estimate:** 4-6 hours

---

## Implementation Order

**Week 1:**
- Phase 1 (Security Fixes) - 1-2 hours
- Phase 2 (Multi-Role) - 4-6 hours

**Week 2:**
- Phase 3 (OpenAI Agents SDK) - 12-16 hours
- Phase 4 (UI Refactor) - 10-14 hours

**Week 3:**
- Phase 5 (Frontend Integration) - 6-8 hours
- Phase 6 (Supabase Schema) - 4-6 hours

**Week 4:**
- Phase 7 (ChatGPT App) - 8-10 hours
- Phase 8 (Privacy & Safety) - 4-6 hours

**Total Estimate:** 49-68 hours (~6-8 weeks part-time)

---

## Risk Mitigation

### Breaking Changes
- **Phase 2:** Multi-role migration - keep `default_role` column for backward compat initially
- **Phase 3-5:** Run Worker in parallel with existing Gemini backend, gradual migration
- **Phase 4:** Keep all pages accessible, just change entry point

### Rollback Plan
- Each phase is independently deployable
- Keep old code paths until new paths are fully tested
- Feature flags for gradual rollout

### Testing Strategy
- Unit tests for tools
- Integration tests for agents
- E2E tests for UI flows
- Manual testing for ChatGPT App

---

## Dependencies

### External Services
- OpenAI API (Agents SDK)
- Supabase (DB, Realtime, Edge Functions)
- Google Maps APIs (optional: ETA, directions)
- Gemini API (optional: geocoding, places, routing)

### Libraries
- OpenAI Agents SDK (TypeScript)
- React 19 (verify actual version)
- Vite 6
- Supabase JS
- Zustand
- TanStack Query

---

## Success Criteria

1. ✅ All existing features work (preservation requirement)
2. ✅ No API keys in client bundle (security)
3. ✅ Multi-role support (user can be passenger + driver + vendor)
4. ✅ AI-first UI (chat is primary interface)
5. ✅ OpenAI Agents SDK backend (Worker with orchestrator + sub-agents)
6. ✅ Streaming responses (SSE)
7. ✅ Tool cards render correctly
8. ✅ ChatGPT App ready (MCP server + UI bundle)
9. ✅ Privacy policy published
10. ✅ Submission checklist complete

---

## Notes

- **Preservation is key:** All existing pages/features must remain accessible
- **Gradual migration:** Run old and new systems in parallel during transition
- **Security first:** Fix API key exposure before any other changes
- **Testing:** Test each phase before moving to next
- **Documentation:** Update README as we go

---

**END OF REFACTOR PLAN**

