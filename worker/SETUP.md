# Worker Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Set Environment Variables

Set these via Cloudflare Dashboard or CLI:

#### Via Cloudflare Dashboard:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your Workers & Pages → Workers
3. Create or select your worker
4. Go to Settings → Variables and Secrets
5. Add each secret below

#### Via CLI (Recommended):

```bash
cd worker

# Required: OpenAI API Key
wrangler secret put OPENAI_API_KEY

# Required: Supabase Configuration
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Optional: Service Role Key (for admin operations)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Optional: Gemini API Key (for geocoding)
wrangler secret put GEMINI_API_KEY

# Optional: Google Maps API Key (for ETA calculations)
wrangler secret put GOOGLE_MAPS_API_KEY
```

When prompted, paste the corresponding value.

### 3. Update wrangler.toml

Update `wrangler.toml` with your worker name:

```toml
name = "easymo-agent-worker"  # Change to your preferred name
```

### 4. Deploy

```bash
npm run deploy
```

Or for local development:

```bash
npm run dev
```

## Local Development with .dev.vars

For local development, create a `.dev.vars` file (git-ignored):

```bash
# worker/.dev.vars (DO NOT COMMIT THIS FILE)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

Then run:

```bash
npm run dev
```

## Testing

### Test the Worker Locally

```bash
npm run dev
# Worker runs on http://localhost:8787
```

### Test with curl

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need a ride"}],
    "stream": false
  }'
```

### Test Streaming

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Find nearby drivers"}],
    "stream": true
  }'
```

## Production Deployment

1. **Set all secrets in Cloudflare Dashboard** (recommended) or via CLI
2. **Deploy:**

```bash
npm run deploy
```

3. **Get your worker URL** from Cloudflare Dashboard

## Security Notes

- ✅ **Never commit `.dev.vars` or actual API keys to git**
- ✅ **Use Cloudflare secrets for production**
- ✅ **Service role key is optional** (only needed for admin operations)
- ✅ **Anon key is sufficient** for most operations

## Troubleshooting

### "Missing API_KEY" error
- Ensure `OPENAI_API_KEY` is set as a secret
- Check it starts with `sk-`

### "Supabase query failed"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase project is active

### CORS errors
- Worker includes CORS headers
- Ensure frontend is calling the correct worker URL

