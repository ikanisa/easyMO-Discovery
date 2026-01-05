# Migration to OpenAI Agents SDK - Complete Specification

**Date:** 2025-01-27  
**Status:** In Progress  
**Goal:** Replace Gemini as primary chat engine with OpenAI (Responses API + Agents SDK), make product AI-first

---

## Executive Summary

This document outlines the complete migration from Google Gemini to OpenAI as the primary chat engine for easyMO Discovery. The migration preserves ALL existing features while transitioning to OpenAI Agents SDK running on Cloudflare Workers, with Gemini/Google Maps remaining as optional server-side tools.

### Key Principles

1. **Preserve ALL features:** Mobility discovery, marketplace/business discovery, payments/QR, scanner, onboarding, settings, and all existing agent flows
2. **AI-first UX:** Default UX is chat/agent orchestration; screens become "views" opened from AI cards
3. **No secrets in frontend:** Remove any Vite define/env injection that could ship secrets to browser
4. **Production-ready:** Tests, logging, tracing, rate limits, privacy controls (location TTL), deployment guides
5. **Phased migration:** Every change keeps the app runnable with clear migration path
6. **No duplicate infrastructure:** No parallel agent frameworks or duplicate tables

---

## Current State Analysis

### Architecture

**Frontend:**
- React 19 + Vite + TypeScript
- PWA deployed to Cloudflare Pages
- AI-first home screen (`ChatHome`) already implemented
- Chat UI (`ChatSession`) with partial Worker integration

**Backend:**
- Supabase Edge Functions (`chat-gemini`) - Gemini proxy
- Cloudflare Worker (`worker/`) - OpenAI Agents SDK (partially integrated)
- Supabase for auth, DB, RLS, realtime, storage

**Current Chat Flow:**
```
ChatSession
  ├─→ Worker (if ENABLE_WORKER_AGENT && WORKER_URL set)
  │   └─→ OpenAI Agents SDK (router → specialized agents)
  └─→ GeminiService (fallback)
      └─→ Supabase Edge Function (chat-gemini)
          └─→ Google Gemini API
```

### Features Inventory

**Pages (ALL preserved):**
1. Home (ChatHome) - AI-first entry point
2. Discovery - Mobility matching UI
3. Business - Marketplace entry
4. Services - Support & utilities
5. ChatSession - Multi-agent chat (modal overlay)
6. MomoGenerator - Payment QR codes
7. QRScanner - QR code scanner
8. Settings - User preferences
9. BusinessOnboarding - Business registration

**Agents (ALL preserved):**
1. Router Agent - Routes messages to appropriate agent
2. Mobility Agent - Ride requests, driver matching, presence
3. Marketplace Agent (Bob) - Business/product/service searches
4. Payments Agent - MoMo QR generation and parsing
5. Support Agent - General help and FAQ
6. Legal Agent (Gatera) - Legal advice, contracts, find lawyers
7. Real Estate Agent (Keza) - Property searches
8. OnboardBot - Business registration extraction

**Tools (ALL preserved):**
- Presence publishing/matching (Supabase PostGIS)
- Business search (Gemini + Google Maps as optional backend tool)
- Property search (Gemini + Google Maps as optional backend tool)
- Legal services search
- MoMo QR generation/parsing
- Geocoding (Google Maps as optional backend tool)
- Location insights (Google Maps as optional backend tool)

---

## Migration Plan

### Phase 1: Worker as Primary Engine ✅ (Current State)

**Status:** Partially Complete

**Current Implementation:**
- Worker exists with OpenAI integration
- `services/agent.ts` - Client for Worker
- `ChatSession` has conditional logic: tries Worker first, falls back to GeminiService
- Config flag: `ENABLE_WORKER_AGENT: true`

**Required Changes:**
1. ✅ Worker infrastructure exists
2. ✅ AgentService client exists
3. ⚠️ ChatSession still has Gemini fallback (needs update)
4. ⚠️ Worker needs production-ready features (logging, tracing, rate limits)

**Tasks:**
- [ ] Remove or gate GeminiService fallback (make it legacy-only)
- [ ] Ensure Worker is always used when `WORKER_URL` is configured
- [ ] Add comprehensive error handling for Worker failures
- [ ] Update all agent types to use Worker

### Phase 2: Production-Ready Worker

**Status:** In Progress

**Required Features:**

1. **Logging & Tracing**
   - Structured logging (JSON format)
   - Request/response logging
   - Tool call logging
   - Error tracking
   - Performance metrics

2. **Rate Limiting**
   - Per-user rate limits (based on Supabase user_id)
   - Per-IP rate limits (fallback for anonymous users)
   - Rate limit headers in response
   - Configurable limits via environment variables

3. **Error Handling**
   - Graceful degradation
   - Retry logic for transient failures
   - Clear error messages
   - Error codes for different failure types

4. **Privacy Controls**
   - Location TTL enforcement (presence records)
   - User consent tracking
   - Data retention policies
   - GDPR compliance helpers

5. **Authentication & Authorization**
   - Supabase JWT validation
   - User ID extraction
   - Optional: Service role key for admin operations

**Implementation:**
- Add logging middleware to Worker
- Implement rate limiting using Cloudflare KV or Workers Rate Limiting API
- Add error handling wrappers
- Add privacy controls to tools (presence TTL, location retention)

### Phase 3: Complete Agent Coverage

**Status:** Verify Required

**All agents must work via Worker:**

1. **Router Agent** ✅ - Routes to appropriate agent
2. **Mobility Agent** ⚠️ - Needs verification
3. **Marketplace Agent (Bob)** ⚠️ - Needs verification  
4. **Payments Agent** ⚠️ - Needs verification
5. **Support Agent** ⚠️ - Needs verification
6. **Legal Agent (Gatera)** ❌ - Not in Worker (needs implementation)
7. **Real Estate Agent (Keza)** ❌ - Not in Worker (needs implementation)
8. **OnboardBot** ❌ - Not in Worker (needs implementation)

**Tasks:**
- [ ] Verify all existing agents work correctly
- [ ] Implement missing agents (Legal, Real Estate, OnboardBot) or route them appropriately
- [ ] Ensure tool results match GeminiService output format for compatibility

### Phase 4: Frontend Integration

**Status:** Partial

**Required Changes:**

1. **ChatSession.tsx**
   - Make Worker primary (remove Gemini fallback or gate it)
   - Handle all agent types via Worker
   - Ensure streaming works correctly
   - Handle tool results correctly

2. **Agent Service (`services/agent.ts`)**
   - Handle all agent types
   - Proper error handling
   - Fallback strategy (if Worker unavailable, show clear error)

3. **Config (`config.ts`)**
   - `ENABLE_WORKER_AGENT: true` (default)
   - `WORKER_URL` from environment
   - Optional: `ENABLE_GEMINI_FALLBACK: false` (legacy mode)

**Tasks:**
- [ ] Update ChatSession to use Worker as primary
- [ ] Remove or gate GeminiService fallback
- [ ] Update agent type mapping
- [ ] Ensure all message types work (text, images, files)

### Phase 5: Gemini as Optional Backend Tool

**Status:** Not Started

**Goal:** Keep Gemini/Google Maps as optional server-side tools only

**Implementation:**
- Remove Gemini from frontend entirely (no `@google/genai` in bundle)
- Keep Gemini in Worker as optional tool (geocoding, places, routing)
- Gemini API key only in Worker secrets (never in frontend)
- Feature flag to enable/disable Gemini tools

**Tasks:**
- [ ] Remove `@google/genai` from frontend dependencies
- [ ] Remove `GeminiService` from frontend (or make it legacy-only)
- [ ] Implement Gemini tools in Worker (optional)
- [ ] Update tools to use Gemini only when enabled

### Phase 6: Testing & Documentation

**Status:** Not Started

**Required:**

1. **Tests**
   - Unit tests for Worker agents
   - Integration tests for chat flows
   - E2E tests for critical paths
   - Performance tests

2. **Documentation**
   - Deployment guide (Worker + Frontend)
   - Environment variables reference
   - API documentation
   - Migration guide for existing deployments

**Tasks:**
- [ ] Add tests for Worker endpoints
- [ ] Add E2E tests for chat flows
- [ ] Update README with deployment steps
- [ ] Create migration guide

---

## Technical Specifications

### Worker API

**Endpoint:** `POST /` (Worker root)

**Request:**
```typescript
interface AgentRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  agent_type?: 'router' | 'mobility' | 'marketplace' | 'payments' | 'support';
  user_id?: string; // Supabase user ID
  user_location?: { lat: number; lng: number };
  conversation_id?: string;
  stream?: boolean; // Enable SSE streaming
}
```

**Response (non-streaming):**
```typescript
interface AgentResponse {
  message: string;
  agent_type: string;
  conversation_id?: string;
  tool_calls?: any[];
  tool_results?: any[];
}
```

**Response (streaming):**
```
data: {"type":"start","agent_type":"marketplace"}

data: {"type":"token","content":"I"}
data: {"type":"token","content":" found"}
...

data: {"type":"tool_result","tool_call":{...},"content":"..."}

data: {"type":"done","agent_type":"marketplace","conversation_id":"..."}
```

### Environment Variables

**Worker (Cloudflare Secrets):**
- `OPENAI_API_KEY` - Required: OpenAI API key
- `SUPABASE_URL` - Required: Supabase project URL
- `SUPABASE_ANON_KEY` - Required: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Optional: Service role key for admin operations
- `GEMINI_API_KEY` - Optional: Gemini API key (for optional tools)
- `GOOGLE_MAPS_API_KEY` - Optional: Google Maps API key (for optional tools)

**Frontend (Build-time):**
- `VITE_SUPABASE_URL` - Required: Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Required: Supabase anonymous key
- `VITE_WORKER_URL` - Required: Cloudflare Worker URL

**NOT in Frontend:**
- ❌ No OpenAI API keys
- ❌ No Gemini API keys
- ❌ No Google Maps API keys
- ❌ No service role keys

### Agent Type Mapping

| ChatSession Type | Worker Agent Type | Notes |
|-----------------|-------------------|-------|
| `mobility` | `mobility` | Direct mapping |
| `business` | `marketplace` | Bob → Marketplace agent |
| `real_estate` | `marketplace` | Keza → Marketplace agent (or separate agent) |
| `legal` | `support` | Gatera → Support agent (or separate agent) |
| `support` | `support` | Direct mapping |
| `onboarding` | `support` | OnboardBot → Support agent (or separate agent) |
| (default) | `router` | Router decides |

### Tool Result Format

Worker tools must return results in a format compatible with existing UI components:

**Business Results:**
```typescript
{
  businesses: Array<{
    name: string;
    address?: string;
    phone?: string;
    location?: { lat: number; lng: number };
    // ... other fields
  }>
}
```

**Property Results:**
```typescript
{
  properties: Array<{
    title: string;
    address?: string;
    price?: number;
    // ... other fields
  }>
}
```

**Legal Results:**
```typescript
{
  professionals: Array<{
    name: string;
    specialization?: string;
    // ... other fields
  }>
}
```

---

## Migration Steps

### Step 1: Deploy Worker

```bash
cd worker
npm install

# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Optional
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY

# Deploy
npm run deploy
```

**Get Worker URL:**
- Worker URL will be: `https://easymo-agent-worker.<your-subdomain>.workers.dev`
- Or custom domain if configured

### Step 2: Configure Frontend

```bash
# Add to .env.local or production environment
VITE_WORKER_URL=https://easymo-agent-worker.<your-subdomain>.workers.dev
```

### Step 3: Update Config

Ensure `config.ts` has:
```typescript
ENABLE_WORKER_AGENT: true,
WORKER_URL: import.meta.env.VITE_WORKER_URL || '',
```

### Step 4: Verify Integration

1. Start dev server: `npm run dev`
2. Test chat flows:
   - Marketplace agent (Bob)
   - Support agent
   - Mobility agent
   - Payments agent
3. Verify streaming works
4. Verify tool results render correctly

### Step 5: Deploy Frontend

```bash
npm run build
npm run pages:deploy
```

---

## Rollback Plan

If issues occur:

1. **Quick Rollback:**
   - Set `ENABLE_WORKER_AGENT: false` in `config.ts`
   - Redeploy frontend
   - App falls back to GeminiService

2. **Full Rollback:**
   - Revert code changes
   - Redeploy
   - Keep Worker running (doesn't interfere if not used)

---

## Success Criteria

- [ ] All existing features work with OpenAI Worker
- [ ] No secrets in frontend bundle
- [ ] Worker is production-ready (logging, rate limits, error handling)
- [ ] All agent types work correctly
- [ ] Streaming works smoothly
- [ ] Tool results render correctly
- [ ] Tests pass
- [ ] Documentation complete
- [ ] Deployment guide clear

---

## Future Enhancements

- Conversation persistence (save to Supabase)
- Advanced rate limiting (per-tier, per-feature)
- Analytics dashboard
- A/B testing framework
- Custom model fine-tuning
- ChatGPT App integration (MCP server)

---

## References

- [Worker README](../worker/README.md)
- [Agent Service](../services/agent.ts)
- [ChatSession](../pages/ChatSession.tsx)
- [AUDIT.md](../AUDIT.md)

