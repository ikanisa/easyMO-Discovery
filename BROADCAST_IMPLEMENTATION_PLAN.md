# AI Agent + Broadcast System Implementation Plan

## Overview
Build complete buyer → AI → vendor broadcast → quote collection workflow

## System Flow

```
User WhatsApp Message
        ↓
   AI Agent (Gemini)
   • Parse intent
   • Extract: item, location, budget
   • Create lead
        ↓
   Find 30 Nearest Vendors
   • Query by category
   • Filter by distance
   • Rank by relevance
        ↓
   Broadcast WhatsApp Template
   • Send to each vendor
   • Include: item, location, buyer info
   • Track sent count
        ↓
   Collect Vendor Responses
   • "I have it" button
   • "No stock" button
   • "Stop messages" button
        ↓
   Present Quotes to Buyer
   • Show interested vendors
   • Facilitate connection
```

## Implementation Phases

### Phase 1: Vendor Database Schema (30 min)

**Create vendors table:**
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  categories TEXT[] NOT NULL,
  location_text TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  successful_quotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vendors_categories ON vendors USING GIN (categories);
CREATE INDEX idx_vendors_location ON vendors (location_lat, location_lng);
CREATE INDEX idx_vendors_active ON vendors (is_active, verified);
```

**Update leads table:**
```sql
ALTER TABLE leads ADD COLUMN vendor_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN broadcast_sent_at TIMESTAMPTZ;
```

### Phase 2: AI Agent Integration (1-2 hours)

**Update services/whatsapp-bridge/index.js:**

1. Add Gemini integration function
2. Parse buyer message for intent
3. Extract structured data (item, location, budget)
4. Create lead in database
5. Return AI-generated response

**Key Functions:**
- `callGeminiAgent(message, context)` - Get AI response
- `extractLeadData(aiResponse)` - Parse structured data
- `createLead(data)` - Insert lead to database
- `shouldTriggerBroadcast(lead)` - Check if ready to broadcast

### Phase 3: Vendor Matching Logic (1 hour)

**Create vendor matching function:**
```javascript
async function findNearestVendors(item, location, limit = 30) {
  // 1. Determine category from item
  // 2. Query vendors by category
  // 3. Calculate distance (if lat/lng available)
  // 4. Rank by: distance, rating, response rate
  // 5. Return top 30
}
```

**Matching criteria:**
- Category match (exact or related)
- Geographic proximity (if location known)
- Vendor rating & reliability
- Active and verified status

### Phase 4: Broadcast Implementation (2-3 hours)

**Broadcast function:**
```javascript
async function broadcastToVendors(lead_id, vendors) {
  const lead = await getLeadById(lead_id);
  
  for (const vendor of vendors) {
    await sendTwilioTemplate({
      to: vendor.phone_number,
      contentSid: process.env.TWILIO_CONTENT_SID_EASYMO_BUSINESS,
      variables: {
        item: lead.item_requested,
        location: lead.location_text,
        quantity: lead.quantity || 'Not specified',
        budget: lead.budget || 'Not specified'
      }
    });
  }
  
  // Update lead
  await updateLead(lead_id, {
    status: 'broadcasted',
    broadcast_count: vendors.length,
    broadcast_sent_at: new Date()
  });
}
```

### Phase 5: Quote Collection (1 hour)

**Already working! Just enhance:**
- Vendor quick replies already captured
- Add logic to aggregate responses
- Present top vendors to buyer
- Facilitate connection

## Files to Create/Modify

### New Files:
1. `services/whatsapp-bridge/gemini-integration.js` - AI agent logic
2. `services/whatsapp-bridge/vendor-matching.js` - Find vendors
3. `services/whatsapp-bridge/broadcast.js` - Send templates
4. `supabase/migrations/002_vendors_table.sql` - Vendor schema

### Modified Files:
1. `services/whatsapp-bridge/index.js` - Main webhook handler
2. `services/whatsapp-bridge/package.json` - Add dependencies

## Environment Variables Needed

Already have:
- ✅ TWILIO_ACCOUNT_SID
- ✅ TWILIO_AUTH_TOKEN
- ✅ TWILIO_WHATSAPP_FROM
- ✅ TWILIO_CONTENT_SID_EASYMO_BUSINESS
- ✅ SUPABASE_SERVICE_ROLE_KEY

Need to add:
- GEMINI_API_KEY (for AI agent)
- BROADCAST_LIMIT (default: 30)

## Twilio Template Variables

Your template should have these variables:
- `{{item}}` - What the buyer needs
- `{{location}}` - Where the buyer is
- `{{quantity}}` - How much they need (optional)
- `{{budget}}` - Budget range (optional)

Template should include quick reply buttons:
1. "I have it ✅"
2. "No stock ❌"
3. "Stop messages 🛑"

## Testing Plan

### Test 1: AI Agent
- Send: "I need a laptop in Kicukiro"
- Expected: AI understands and extracts data

### Test 2: Vendor Matching
- Query: Find vendors for "laptop" near "Kicukiro"
- Expected: Return 30 nearest tech vendors

### Test 3: Broadcast
- Trigger: Send template to 30 vendors
- Expected: All receive WhatsApp message

### Test 4: Response Collection
- Vendors: Click "I have it"
- Expected: Logged to vendor_responses table

### Test 5: Quote Presentation
- Aggregate: 5 vendors responded "I have it"
- Expected: Buyer receives list of interested vendors

## Timeline Estimate

- Phase 1 (Vendor DB): 30 min
- Phase 2 (AI Agent): 1-2 hours
- Phase 3 (Matching): 1 hour
- Phase 4 (Broadcast): 2-3 hours
- Phase 5 (Quotes): 1 hour
- Testing: 1 hour

**Total: 6-8 hours**

## Cost Considerations

- Gemini API: Free tier 15 requests/min
- Twilio Templates: ~$0.005 per message
- 30 vendors per lead: ~$0.15 per broadcast
- 100 leads/day: ~$15/day (~$450/month)

## Next Steps

1. Create vendor database schema
2. Seed initial vendors
3. Integrate Gemini AI
4. Build vendor matching
5. Implement broadcast
6. Test end-to-end
7. Deploy to production

Ready to implement? Say the word! 🚀
