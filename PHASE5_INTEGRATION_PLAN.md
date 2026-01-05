# Phase 5: Frontend Integration Plan

**Date:** 2025-01-27  
**Status:** In Progress

---

## Overview

Connect ChatSession to the Worker backend for streaming responses, while maintaining backward compatibility with GeminiService as a fallback.

---

## Implementation Steps

### 1. Agent Service (`services/agent.ts`) ✅

- ✅ Created AgentService with `chat()` and `chatStream()` methods
- ✅ SSE streaming support
- ✅ Map session types to agent types
- ✅ Error handling

### 2. Update ChatSession (`pages/ChatSession.tsx`)

**Changes needed:**

1. **Import AgentService and mapSessionTypeToAgentType**
2. **Update handleAIResponse to use Worker with fallback**
3. **Handle streaming responses**
4. **Map tool results to Message payloads**

**Session Type → Agent Type Mapping:**
- `'mobility'` → `'mobility'`
- `'support'` → `'support'`
- `'business'` → `'marketplace'`
- `'real_estate'` → `'marketplace'`
- `'legal'` → `'support'` (or `'marketplace'` if legal listings tool exists)
- P2P (mobility with peerId) → Keep as P2P (not using Worker)

**Streaming Flow:**

1. Create streaming AI message placeholder
2. Stream tokens and update message text
3. On tool_result chunks, parse JSON and update payloads
4. On done chunk, finalize message

**Tool Result → Payload Mapping:**

- `search_offers` (marketplace) → `businessPayload` or `propertyPayload` (based on session type)
- `generate_momo_qr` (payments) → Need new `paymentPayload` in Message type
- `find_matches` (mobility) → Need new `matchPayload` in Message type
- `publish_presence` (mobility) → No payload (status update)

**Fallback Logic:**

- If `VITE_WORKER_URL` not set → Use GeminiService
- If Worker request fails → Fall back to GeminiService
- P2P sessions → Keep as mock (not using Worker)

### 3. Message Type Updates (`types.ts`)

**May need to add:**
- `paymentPayload?: PaymentQRPayload`
- `matchPayload?: MatchResultsPayload`

**OR:** Keep tool results as JSON in message text and parse in UI components.

---

## Tool Result Parsing

The Worker tools return JSON strings. Need to parse and map:

```typescript
// Example: search_offers result
{
  "tool_call": { "function": { "name": "search_offers", ... } },
  "content": '{"matches": [...], "query_summary": "..."}'
}

// Parse content as JSON
const result = JSON.parse(chunk.tool_result.content);
// Map to businessPayload or propertyPayload
```

---

## Testing Checklist

- [ ] Worker streaming works for support agent
- [ ] Worker streaming works for business/marketplace agent
- [ ] Worker streaming works for real_estate agent
- [ ] Worker streaming works for legal agent
- [ ] Worker streaming works for mobility agent
- [ ] Fallback to GeminiService when Worker URL not set
- [ ] Fallback to GeminiService when Worker request fails
- [ ] P2P sessions still work (mock)
- [ ] Tool results parsed correctly
- [ ] Message payloads set correctly
- [ ] UI components render tool cards correctly

---

## Notes

- Keep GeminiService as fallback for now (gradual migration)
- P2P sessions can stay as mock (future: real-time presence)
- Tool results are JSON strings from Worker, need parsing
- Streaming improves UX (tokens appear as they arrive)

---

**END OF PHASE 5 PLAN**

