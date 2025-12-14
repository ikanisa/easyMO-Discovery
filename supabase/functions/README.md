# Supabase Edge Functions

This directory contains Supabase Edge Functions that power the easyMO Discovery backend.

## Overview

Edge Functions are serverless functions that run on Supabase's infrastructure, providing secure backend logic without exposing API keys to the client.

## Functions

### `chat-gemini`
Proxies requests to Google's Gemini AI API.

**Purpose:** Securely calls Gemini API without exposing the API key to the frontend.

**Request:**
```json
{
  "prompt": "User's message to the AI"
}
```

**Response:**
```json
{
  "text": "AI response text"
}
```

### `whatsapp-broadcast`
Sends broadcast messages to multiple WhatsApp numbers via Twilio.

**Purpose:** Sends discovery results to vendors for availability checks.

**Request:**
```json
{
  "phones": ["+250788123456", "+250792345678"],
  "message": "Customer looking for: 2 bags of cement",
  "query_id": "unique-query-id"
}
```

### `whatsapp-status`
Checks the delivery status of WhatsApp messages.

**Purpose:** Track which vendors have received/read broadcast messages.

**Request:**
```json
{
  "query_id": "unique-query-id"
}
```

### `log-request`
Logs user requests for analytics and debugging.

**Purpose:** Track usage patterns and debug issues.

**Request:**
```json
{
  "action": "search",
  "metadata": {
    "category": "hardware",
    "query": "cement"
  }
}
```

## Deployment

Edge Functions are deployed separately to Supabase. To deploy:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy all functions:
   ```bash
   supabase functions deploy
   ```

5. Set secrets:
   ```bash
   supabase secrets set GEMINI_API_KEY=your_key
   supabase secrets set TWILIO_ACCOUNT_SID=your_sid
   supabase secrets set TWILIO_AUTH_TOKEN=your_token
   ```

## Environment Variables

Edge functions require the following secrets:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number |

## Local Development

To run Edge Functions locally:

```bash
supabase start
supabase functions serve
```

This starts a local development server for testing functions.

## Notes

- Edge Functions have a 2MB request/response limit
- Maximum execution time is 50 seconds
- Functions are stateless and should not store data in memory
- Use Supabase client library to interact with the database
