# Worker Setup Complete ✅

## Local Development Setup

✅ **Dependencies installed** - `npm install` completed  
✅ **Environment variables configured** - `.dev.vars` file created with credentials

### Run Local Development

```bash
cd worker
npm run dev
```

The worker will start on `http://localhost:8787` (or the port shown by wrangler).

---

## Production Secrets Setup

### Option 1: Use Helper Script (Recommended)

```bash
cd worker
./setup-secrets.sh production
```

This will set all required secrets for production.

### Option 2: Manual Setup

```bash
cd worker

# Set production secrets (replace YOUR_SECRET_VALUE with actual values)
echo -n "YOUR_OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY --env production
echo -n "YOUR_SUPABASE_URL" | wrangler secret put SUPABASE_URL --env production
echo -n "YOUR_SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env production
echo -n "YOUR_SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

### Set Development Environment Secrets

```bash
cd worker
./setup-secrets.sh development
```

---

## Deploy to Production

After secrets are set, deploy the worker:

```bash
cd worker
npm run deploy
```

Or deploy to a specific environment:

```bash
wrangler deploy --env production
wrangler deploy --env development
```

---

## Verify Deployment

After deployment, test the worker:

```bash
# Get worker URL from deployment output, then test:
curl -X POST https://your-worker.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

---

## Credentials Summary

- **Supabase URL**: Your Supabase project URL
- **OpenAI API Key**: Your OpenAI API key (see environment variables)
- **Worker Name**: `easymo-agent-worker` (production) / `easymo-agent-worker-dev` (development)

---

**Setup completed:** $(date)

