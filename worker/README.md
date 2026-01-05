# easyMO Agent Worker

Cloudflare Worker with OpenAI Agents SDK for easyMO Discovery.

## Overview

This Worker provides:
- **Router Agent** - Routes messages to appropriate specialized agents
- **Mobility Agent** - Handles ride requests, driver matching, presence
- **Marketplace Agent** - Handles business/product/service searches
- **Payments Agent** - Handles MoMo QR generation and parsing
- **Support Agent** - Handles general help and FAQ

## Architecture

```
PWA Frontend
  ↓ (HTTP POST / SSE)
Cloudflare Worker (index.ts)
  ├─→ RouterAgent (routeMessage)
  │   ↓
  ├─→ MobilityAgent (publish_presence, find_matches, geocode, estimate_eta)
  ├─→ MarketplaceAgent (search_offers, create_listing, geocode)
  ├─→ PaymentsAgent (generate_momo_qr, parse_qr)
  └─→ SupportAgent (general help)
```

## Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Environment Variables

Set in Cloudflare Dashboard or via `wrangler secret`:

```bash
# Required
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Optional
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY
```

### 3. Deploy

```bash
npm run deploy
```

Or for development:

```bash
npm run dev
```

## API

### POST `/`

Chat endpoint with streaming support.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I need a ride" }
  ],
  "agent_type": "router", // optional: "mobility" | "marketplace" | "payments" | "support" | "router"
  "user_id": "uuid", // optional
  "user_location": { "lat": -1.9441, "lng": 30.0619 }, // optional
  "conversation_id": "uuid", // optional
  "stream": true // optional: enable SSE streaming
}
```

**Response (non-streaming):**
```json
{
  "message": "I found 3 nearby drivers...",
  "agent_type": "mobility",
  "conversation_id": "uuid",
  "tool_calls": [...],
  "tool_results": [...]
}
```

**Response (streaming):**
```
data: {"type":"start","agent_type":"mobility"}

data: {"type":"token","content":"I"}
data: {"type":"token","content":" found"}
...

data: {"type":"done","agent_type":"mobility","conversation_id":"uuid"}
```

## Tools

### Mobility Agent Tools

- `publish_presence(user_id, role, location, vehicle_type?, ttl?)` - Publish user presence
- `find_matches(user_id, role, location, radius_km?, vehicle_type?)` - Find nearby drivers/passengers
- `geocode(query, user_location?)` - Geocode location query
- `estimate_eta(origin, destination, mode?)` - Estimate travel time

### Marketplace Agent Tools

- `search_offers(query, location?, filters?)` - Search businesses/products/services
- `create_listing(user_id, title, description, category, price?, currency?, location?)` - Create listing
- `geocode(query, user_location?)` - Geocode location query

### Payments Agent Tools

- `generate_momo_qr(country_id?, tx_type?, phone_number?, amount?, merchant_code?)` - Generate MoMo QR
- `parse_qr(qr_data)` - Parse QR code data

### Support Agent

No tools - provides general help via OpenAI chat.

## Development

### Local Development

```bash
npm run dev
```

Worker will run on `http://localhost:8787` (or port specified by wrangler).

### Type Checking

```bash
npm run typecheck
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Service role key (for admin operations) |
| `GEMINI_API_KEY` | ❌ | Gemini API key (for optional geocoding) |
| `GOOGLE_MAPS_API_KEY` | ❌ | Google Maps API key (for ETA calculations) |

## Notes

- All tools are executed server-side (secure)
- Streaming responses use Server-Sent Events (SSE)
- Router agent automatically routes messages to appropriate agent
- Tools can be extended by adding new functions in `src/tools/`

## Future Enhancements

- Conversation tracking (save to Supabase)
- Tool tracing/logging
- Rate limiting
- Authentication/authorization
- MCP server endpoint (for ChatGPT Apps)

