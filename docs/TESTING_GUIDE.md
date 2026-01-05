# Testing Guide - Phase 1 & Phase 2 Features

**Date:** 2025-01-27  
**Purpose:** Comprehensive testing guide for all new features

---

## Prerequisites

- ✅ Database migrations applied
- ✅ Worker deployed
- ✅ Frontend running (or use API directly)

---

## Test 1: Web Search Tool

### Test Case
**User Query:** "What's the weather in Kigali today?"

### Expected Behavior
- Agent uses `web_search` tool
- Returns real-time weather information
- Response includes current conditions

### How to Test

**Via Chat Interface:**
1. Open chat
2. Type: "What's the weather in Kigali today?"
3. Verify agent responds with weather info

**Via API:**
```bash
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Kigali today?"}],
    "agent_type": "support"
  }'
```

### Success Criteria
- ✅ Agent responds with weather information
- ✅ Response is current/real-time
- ✅ No errors in logs

---

## Test 2: Enhanced Form Widgets

### Test Case
**User Query:** "I want to register my business"

### Expected Behavior
- Agent shows business onboarding form
- Form includes validation
- Phone number format validation works

### How to Test

**Via Chat Interface:**
1. Type: "I want to register my business"
2. Form should appear with:
   - Business Name (required)
   - Phone Number (required, format: +250XXXXXXXXX)
   - Category (select dropdown)
   - Description (textarea)
3. Test validation:
   - Submit empty form → errors shown
   - Enter invalid phone → format error
   - Enter valid data → submits

### Success Criteria
- ✅ Form renders correctly
- ✅ Validation rules work
- ✅ Select dropdown works
- ✅ Textarea works
- ✅ Error messages are helpful

---

## Test 3: Agent Handoff

### Test Case
**User Query:** "I need a ride to Kigali" (to support agent)

### Expected Behavior
- Support agent recognizes mobility intent
- Agent calls `handoff_to_agent` tool
- Conversation transfers to mobility agent
- Context preserved

### How to Test

**Via Chat Interface:**
1. Start conversation with support agent
2. Type: "I need a ride to Kigali"
3. Verify:
   - Support agent acknowledges handoff
   - Mobility agent takes over
   - Conversation continues seamlessly

**Check Database:**
```sql
SELECT * FROM agent_handoffs 
ORDER BY created_at DESC 
LIMIT 1;
```

### Success Criteria
- ✅ Handoff occurs automatically
- ✅ `agent_handoffs` record created
- ✅ Conversation `agent_type` updated
- ✅ System message added with context
- ✅ New agent has conversation history

---

## Test 4: File Search (After Vector Store Setup)

### Test Case
**User Query:** "Find restaurants near me"

### Expected Behavior
- Marketplace agent uses `file_search` tool
- Semantic search through business listings
- Returns relevant restaurants

### How to Test

**Prerequisites:**
- Vector store must be set up first
- `businesses` table must have data

**Via Chat Interface:**
1. Type: "Find restaurants near me"
2. Verify:
   - Agent uses file_search tool
   - Results are semantically relevant
   - Not just keyword matches

**Check Logs:**
- Look for `file_search` tool call
- Verify vector store ID is used

### Success Criteria
- ✅ File search tool is called
- ✅ Results are semantically relevant
- ✅ Faster than keyword search
- ✅ Works with natural language queries

---

## Test 5: Parallel Tool Execution

### Test Case
**User Query:** Multiple independent tools called simultaneously

### Expected Behavior
- Independent tools execute in parallel
- Dependent tools wait for dependencies
- Overall latency is reduced

### How to Test

**Create Test Scenario:**
1. Trigger multiple independent tools:
   - `geocode` (location A)
   - `geocode` (location B)
   - `search_listings` (query)
2. Check logs for execution timing

**Expected Log Pattern:**
```
[Tool 1] Start: 100ms
[Tool 2] Start: 105ms  ← Started in parallel
[Tool 3] Start: 110ms  ← Started in parallel
[Tool 1] End: 1100ms
[Tool 2] End: 1150ms
[Tool 3] End: 1200ms
Total: ~1200ms (not 3300ms)
```

### Success Criteria
- ✅ Independent tools start simultaneously
- ✅ Total time is max(latencies), not sum
- ✅ Dependent tools wait correctly
- ✅ 3-5x speedup for multiple tools

---

## Test 6: Agent Memory System

### Test Case
**Scenario:** Store and retrieve user preferences

### Expected Behavior
- Memory stored in database
- Memory retrieved and injected into prompts
- Preferences remembered across conversations

### How to Test

**Step 1: Store Memory**
```bash
# Via API or tool
POST /api/chat
{
  "messages": [{"role": "user", "content": "I prefer moto taxis"}],
  "agent_type": "mobility",
  "user_id": "user-uuid"
}
```

**Step 2: Verify Storage**
```sql
SELECT * FROM agent_memory 
WHERE user_id = 'user-uuid' 
AND agent_type = 'mobility';
```

**Step 3: Test Retrieval**
```bash
# New conversation
POST /api/chat
{
  "messages": [{"role": "user", "content": "Find me a ride"}],
  "agent_type": "mobility",
  "user_id": "user-uuid"
}
```

**Step 4: Check System Prompt**
- Look at agent system prompt
- Should include: "**User Preferences (from previous conversations):**"
- Should show: "Preferred Vehicle Type: {type: 'moto'}"

### Success Criteria
- ✅ Memory stored in database
- ✅ Memory retrieved correctly
- ✅ Memory appears in system prompt
- ✅ Agent uses preference in response
- ✅ Memory persists across conversations

---

## Test 7: Real-time Widget Updates

### Test Case
**Scenario:** Broadcast progress widget updates in real-time

### Expected Behavior
- Widget subscribes to Supabase Realtime
- Updates automatically when database changes
- No page refresh needed

### How to Test

**Prerequisites:**
- Frontend `RealtimeWidget` component integrated
- Broadcast widget with realtime metadata

**Steps:**
1. Start a broadcast
2. Widget should show progress
3. Update `broadcast_targets` status in database
4. Widget should update automatically

**Check Database:**
```sql
-- Update a target status
UPDATE broadcast_targets 
SET status = 'sent' 
WHERE id = 'target-id';

-- Widget should update automatically
```

### Success Criteria
- ✅ Widget subscribes to Supabase Realtime
- ✅ Updates occur automatically
- ✅ No page refresh needed
- ✅ Updates are fast (< 1 second)

---

## Comprehensive Test Script

### Run All Tests

```bash
# 1. Web Search
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in Kigali?"}], "agent_type": "support"}'

# 2. Agent Handoff
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "I need a ride"}], "agent_type": "support", "user_id": "test-user"}'

# 3. File Search (after vector store setup)
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Find restaurants"}], "agent_type": "marketplace"}'
```

---

## Verification Checklist

### Database
- [ ] `agent_handoffs` table exists
- [ ] `agent_memory` table exists
- [ ] Indexes created
- [ ] RLS policies active

### Worker
- [ ] Worker deployed successfully
- [ ] All endpoints accessible
- [ ] No errors in logs

### Features
- [ ] Web search works
- [ ] Enhanced forms render
- [ ] Agent handoff works
- [ ] File search works (if vector store set up)
- [ ] Parallel tools execute correctly
- [ ] Agent memory stores/retrieves

---

## Troubleshooting

### Feature Not Working?
1. Check worker logs
2. Verify database migrations applied
3. Check environment variables
4. Verify Supabase connection
5. Check browser console (for frontend features)

### Common Issues

**Web Search Not Working:**
- Check OpenAI API key
- Verify tool is in agent tools array
- Check model supports web_search

**Agent Handoff Failing:**
- Verify `agent_handoffs` table exists
- Check conversation_id is provided
- Verify RLS policies allow access

**File Search Not Working:**
- Vector store must be set up
- Check KV for `business_vector_store_id`
- Verify businesses table has data

**Memory Not Working:**
- Verify `agent_memory` table exists
- Check user_id is provided
- Verify RLS policies allow access

---

## Success Metrics

- ✅ All 6 test cases pass
- ✅ No errors in logs
- ✅ Database queries succeed
- ✅ Features work as expected
- ✅ Performance improvements visible

---

## Next Steps After Testing

1. **Monitor Performance**
   - Track tool execution times
   - Monitor parallel execution benefits
   - Check memory usage

2. **Collect Feedback**
   - User experience with new features
   - Any issues or improvements needed

3. **Optimize**
   - Fine-tune vector store updates
   - Adjust memory confidence thresholds
   - Optimize parallel execution

---

**Ready to test! Follow the test cases above to verify all features work correctly.**

