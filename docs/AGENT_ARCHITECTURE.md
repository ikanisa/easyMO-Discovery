# Agent Architecture: OpenAI Agents SDK

**Last Updated:** 2025-01-28  
**Status:** Production-Ready

## Overview

The easyMO Discovery app uses **OpenAI Agents SDK** as the primary AI brain, replacing Gemini as the chat engine. The system is built on Cloudflare Workers with a router-based agent orchestration pattern.

## Architecture

```
┌─────────────────┐
│   PWA Client    │
│  (ChatSession)   │
└────────┬────────┘
         │ HTTP POST / SSE
         ▼
┌─────────────────────────┐
│  Cloudflare Worker       │
│  (agent-runtime)         │
│  /api/chat endpoint     │
└────────┬─────────────────┘
         │
         ├─→ Router Agent (orchestrator)
         │   └─→ Determines agent type
         │
         ├─→ Mobility Agent
         │   ├─→ publish_presence
         │   ├─→ find_matches
         │   ├─→ create_ride_intent
         │   ├─→ create_match_candidates
         │   └─→ explain_matching
         │
         ├─→ Marketplace Agent
         │   ├─→ search_offers
         │   ├─→ onboard_vendor
         │   ├─→ rank_listings
         │   └─→ create_listing
         │
         ├─→ Payments Agent
         │   ├─→ generate_momo_qr
         │   ├─→ parse_qr
         │   ├─→ save_receipt
         │   └─→ get_payment_status
         │
         └─→ Support Agent
             └─→ (no tools, conversational only)
```

## Router Agent (Orchestrator)

**Purpose:** Analyze user messages and route to appropriate specialized agent.

**Routing Rules:**

| Intent | Keywords | Routes To |
|--------|----------|-----------|
| **Mobility** | "ride", "driver", "passenger", "moto", "cab", "going to", "pickup", "dropoff" | `mobility` |
| **Marketplace** | "find", "buy", "shop", "restaurant", "pharmacy", "store", "business", "vendor" | `marketplace` |
| **Payments** | "payment", "QR", "MoMo", "mobile money", "receipt", "pay" | `payments` |
| **Support** | "help", "how", "what", "explain", "guide" | `support` |

**Default Behavior:**
- Ambiguous product/service queries → `marketplace`
- General questions → `support`
- Returns ONE agent type per message

**Implementation:** `services/agent-runtime/src/agents/router.ts`

---

## Domain Agents

### 1. Mobility Agent

**Purpose:** Handle ride requests, driver matching, presence management.

**Tools:**
- `publish_presence` - Driver/vendor goes online (with TTL)
- `find_matches` - Find nearby drivers/passengers
- `create_ride_intent` - Create ride request with pickup/dropoff
- `create_match_candidates` - Generate matches for a ride intent
- `explain_matching` - Explain matching process
- `geocode` - Resolve location queries
- `estimate_eta` - Calculate travel time

**System Prompt:**
```
You are the Mobility Agent for easyMO, helping users find rides and match drivers with passengers in Rwanda.

**Privacy & Security:**
- NEVER reveal precise coordinates to users - use area descriptions instead
- Always require explicit location consent before using location tools
- Enforce TTL (time-to-live) for presence and ride intents
- Sanitize location data in responses
```

**Response Format:**
- Structured JSON from tools (for UI cards)
- Natural language explanations
- Location consent prompts when needed

**Example Flow:**
1. User: "I need a ride to Kigali"
2. Agent: "I can help you find a ride. May I use your location to find nearby drivers?"
3. User: "Yes"
4. Agent: Calls `create_ride_intent` → `create_match_candidates`
5. Agent: Returns structured matches with ETA, distance, driver info

**Implementation:** `services/agent-runtime/src/agents/mobility.ts`

---

### 2. Marketplace Agent

**Purpose:** Business/product/service searches, vendor onboarding.

**Tools:**
- `search_offers` - Search businesses/products/services
- `onboard_vendor` - Assist with vendor (business) registration
- `rank_listings` - Rank listings by relevance
- `create_listing` - Create marketplace listing
- `geocode` - Resolve location queries

**System Prompt:**
```
You are the Marketplace Agent (Bob) for easyMO, helping users find businesses, products, and services in Rwanda.

**Privacy & Security:**
- NEVER reveal precise business coordinates - use area descriptions instead
- Always require explicit location consent before using location tools
- Sanitize location data in responses
```

**Vendor Onboarding:**
- Creates `vendor` role in `user_roles` table
- Optionally creates `marketplace_listings` entry
- Returns structured response with vendor_id, listing_id

**Ranking Algorithm:**
- Distance scoring (closer = higher score)
- Query relevance (keyword matching)
- Price sensitivity (if user prefers lower prices)
- Returns ranked list with relevance scores

**Implementation:** `services/agent-runtime/src/agents/marketplace.ts`

---

### 3. Payments Agent

**Purpose:** MoMo QR generation, QR parsing, receipt handling.

**Tools:**
- `generate_momo_qr` - Generate USSD code and QR for MoMo payments
- `parse_qr` - Parse QR code data
- `save_receipt` - Save payment receipt (records payment completion)
- `get_payment_status` - Get status of a payment request

**System Prompt:**
```
You are the Payments Agent for easyMO, helping users generate Mobile Money (MoMo) payment QR codes and manage payments.

**Response Format:**
- Return structured JSON from tools (for UI cards)
- Display QR codes clearly
- Confirm receipt saving
```

**Receipt Handling:**
- Creates/updates `payment_requests` record
- Sets status to `paid`
- Records `paid_at` timestamp
- Returns structured response with payment_id, amount, currency

**Implementation:** `services/agent-runtime/src/agents/payments.ts`

---

### 4. Support Agent

**Purpose:** General help, FAQ, app usage questions.

**Tools:** None (conversational only)

**System Prompt:**
```
You are the Support Agent for easyMO, the discovery app for mobility, marketplace, and payments in Rwanda.

You help users understand how to use the app:
- Mobility: Find rides, driver mode, matching
- Marketplace: Search businesses, products, services
- Payments: Generate MoMo QR codes, scan QR codes

If the user's question is about a specific feature, you can suggest they try that feature directly.
```

**Implementation:** `services/agent-runtime/src/agents/support.ts`

---

## Tool System

### Tool Execution Flow

```
1. OpenAI decides to call tool
   ↓
2. Policy Enforcement
   ├─→ Check location consent
   ├─→ Enforce TTL (presence/intents)
   └─→ Sanitize location data
   ↓
3. Execute Tool
   ├─→ Parse arguments (Zod validation)
   ├─→ Call agent.executeTool()
   └─→ Return structured JSON
   ↓
4. Persistence
   ├─→ Save tool_trace (latency, ok/error)
   └─→ Update conversation if needed
   ↓
5. Return Result
   └─→ Structured JSON for UI cards
```

### Tool Validation

All tools use **Zod schemas** from `packages/shared/src/schemas/index.ts`:

- `publishPresenceSchema` - Presence updates
- `findMatchesSchema` - Match queries
- `createRideIntentSchema` - Ride intents
- `onboardVendorSchema` - Vendor onboarding
- `saveReceiptSchema` - Receipt handling
- `generateMomoQRSchema` - QR generation
- `searchOffersSchema` - Business search

### Tool Response Format

All tools return **structured JSON** for UI cards:

```typescript
{
  success: boolean,
  // Tool-specific data
  matches?: Array<{...}>,
  intent_id?: string,
  payment_id?: string,
  vendor_id?: string,
  // Human-readable message
  message?: string,
  // Error (if failed)
  error?: string
}
```

---

## Policy Enforcement

### 1. Location Privacy

**Rule:** Never reveal precise driver/passenger coordinates.

**Implementation:**
- `sanitizeLocationForDisplay()` - Rounds to ~100m precision
- `formatLocationAsArea()` - Returns area description instead of coordinates
- All location responses are sanitized before returning to user

**Example:**
```typescript
// Input: { lat: -1.9441234, lng: 30.0619123 }
// Output: { lat: -1.944, lng: 30.062 } // Rounded to ~100m
// Display: "Area near -1.944, 30.062"
```

### 2. Location Consent

**Rule:** Require explicit consent before using location tools.

**Implementation:**
- `validateLocationConsent()` - Checks for consent keywords in messages
- If `user_location` provided in request → assume consent
- Otherwise, check recent messages for consent keywords

**Consent Keywords:**
- "yes", "ok", "okay", "sure", "go ahead", "use my location"
- "find nearby", "search nearby", "show me", "help me find"

**Example Flow:**
1. User: "Find drivers"
2. Agent: "I can help you find nearby drivers. May I use your location?"
3. User: "Yes" → Consent granted
4. Agent: Calls `find_matches` tool

### 3. TTL Enforcement

**Rule:** TTL for presence and intents must be enforced.

**Implementation:**
- `enforcePresenceTTL()` - Minimum 1 hour, maximum 24 hours
- `enforceIntentTTL()` - Minimum 30 minutes, maximum 2 hours
- Applied automatically in `executeToolCall()`

**Default TTLs:**
- Presence: 3600 seconds (1 hour)
- Ride Intents: 1800 seconds (30 minutes)

---

## Persistence

### Conversations & Messages

**Tables:**
- `conversations` - Conversation metadata
- `messages` - Individual messages with tool_call data
- `tool_traces` - Tool execution tracking

**Flow:**
1. **Create/Get Conversation:**
   ```typescript
   conversation_id = await getOrCreateConversation({
     user_id,
     agent_type,
     title,
     channel: 'chat'
   }, existing_id, env);
   ```

2. **Save User Message:**
   ```typescript
   await saveMessage({
     conversation_id,
     role: 'user',
     content: userText
   }, env);
   ```

3. **Save Assistant Message:**
   ```typescript
   await saveMessage({
     conversation_id,
     role: 'assistant',
     content: responseText,
     tool_call: toolCalls[0] || null
   }, env);
   ```

4. **Save Tool Trace:**
   ```typescript
   await saveToolTrace({
     conversation_id,
     tool_name,
     input: args,
     output: result,
     latency_ms,
     ok: true/false,
     error_message
   }, env);
   ```

**Implementation:** `services/agent-runtime/src/utils/persistence.ts`

---

## Streaming (SSE)

### Event Types

| Type | Description | Payload |
|------|-------------|---------|
| `start` | Stream started | `{ agent_type, request_id }` |
| `token` | Text token | `{ content }` |
| `tool_call` | Tool call started | `{ tool_call }` |
| `tool_result` | Tool result received | `{ tool_call, content }` |
| `done` | Stream complete | `{ agent_type, conversation_id, structured_output }` |
| `error` | Error occurred | `{ error, code }` |

### Structured Output

The `done` event includes `structured_output` - an array of parsed tool results:

```typescript
{
  type: 'done',
  agent_type: 'mobility',
  conversation_id: '...',
  structured_output: [
    {
      success: true,
      matches: [...],
      count: 5
    },
    {
      success: true,
      intent_id: '...',
      status: 'matched'
    }
  ]
}
```

**UI Integration:**
- Parse `structured_output` to create UI cards
- Display matches, intents, payments as interactive cards
- Update message payloads with structured data

**Implementation:** `services/agent-runtime/src/api/chat.ts` (streaming handler)

---

## API Endpoint

### POST `/api/chat`

**Request:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  agent_type?: 'mobility' | 'marketplace' | 'payments' | 'support' | 'router',
  user_id?: string, // UUID
  user_location?: { lat: number, lng: number },
  conversation_id?: string, // UUID
  stream?: boolean // Default: false
}
```

**Response (Non-Streaming):**
```typescript
{
  message: string,
  agent_type: string,
  conversation_id?: string,
  tool_calls?: Array<{...}>,
  tool_results?: Array<{...}>,
  request_id: string
}
```

**Response (Streaming):**
Server-Sent Events (SSE) with chunks:
- `data: {"type": "start", ...}`
- `data: {"type": "token", "content": "..."}`
- `data: {"type": "tool_result", ...}`
- `data: {"type": "done", "structured_output": [...]}`

---

## Error Handling

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `LOCATION_CONSENT_REQUIRED` | Location consent needed | 400 |
| `TOOL_ERROR` | Tool execution failed | 500 |
| `OPENAI_ERROR` | OpenAI API error | 502 |
| `INTERNAL_ERROR` | Internal server error | 500 |

### Error Response Format

```typescript
{
  error: string,
  code: string,
  request_id: string,
  retry_after?: number // For rate limits
}
```

---

## Security

### 1. Rate Limiting

- Per-user limits (if `user_id` provided)
- Per-IP limits (fallback)
- Configurable via environment variables
- Uses Cloudflare KV for storage

### 2. RLS (Row Level Security)

- Conversations: Users can only access their own
- Messages: Inherited from conversation ownership
- Tool Traces: Users see own traces, admins see all

### 3. API Key Security

- OpenAI API key stored in Cloudflare Worker secrets
- Never exposed to frontend
- Supabase keys stored in Worker secrets

### 4. Location Privacy

- Coordinates sanitized before display
- TTL enforced for presence/intents
- Location consent required

---

## Observability

### Logging

- Request/response logging
- Tool call/result logging
- Error logging with stack traces
- Request ID for tracing

**Implementation:** `services/agent-runtime/src/utils/logging.ts`

### Tracing

- Span-based tracing
- OpenAI API call tracing
- Tool execution tracing
- Latency tracking

**Implementation:** `services/agent-runtime/src/utils/tracing.ts`

### Tool Traces

All tool executions are logged to `tool_traces` table:
- Tool name
- Input/output (JSONB)
- Latency (ms)
- Success/failure
- Error messages

---

## Migration from Gemini

### Before (Gemini)

```typescript
// Direct Gemini API calls
const response = await GeminiService.chatBob(history, message, location);
```

### After (OpenAI)

```typescript
// Worker-based streaming
for await (const chunk of AgentService.chatStream(
  messages,
  'marketplace',
  userId,
  location,
  conversationId
)) {
  // Handle streaming chunks
}
```

### Benefits

1. **Consistent API** - Single endpoint for all agents
2. **Streaming** - Real-time response streaming
3. **Structured Output** - Tool results as JSON for UI cards
4. **Persistence** - Conversations and tool traces stored
5. **Policy Enforcement** - Built-in privacy and security
6. **Observability** - Comprehensive logging and tracing

---

## Testing

### Local Development

```bash
# Start Worker locally
npm run worker:dev

# Test endpoint
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need a ride"}],
    "stream": true
  }'
```

### Production

- Deploy to Cloudflare Workers
- Set secrets in Cloudflare Dashboard
- Configure `VITE_WORKER_URL` in PWA

---

## Future Enhancements

- [ ] Vector embeddings for semantic search
- [ ] Multi-turn tool calling (parallel execution)
- [ ] Agent-to-agent handoff
- [ ] Real-time presence updates via WebSockets
- [ ] Advanced matching algorithms (ML-based scoring)
- [ ] Voice input/output support
- [ ] Multi-language support

---

## References

- [Worker README](../services/agent-runtime/README.md)
- [Database Schema](./DB_SCHEMA_AI_FIRST.md)
- [Migration Guide](./MIGRATION_GUIDE_RPC.md)

