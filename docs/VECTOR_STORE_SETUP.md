# Vector Store Setup Guide

**Date:** 2025-01-27  
**Purpose:** Setup OpenAI Vector Store for business listings semantic search

---

## Overview

The vector store enables semantic search through business listings. This is a one-time setup that can be updated periodically via cron job.

---

## Prerequisites

- ✅ Worker deployed
- ✅ Supabase `businesses` table populated
- ✅ OpenAI API key configured in worker
- ✅ Cloudflare KV namespace (optional, for storing vector store ID)

---

## Setup Methods

### Method 1: HTTP Request (Quick)

```bash
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/cron/update-vector-store \
  -H "X-Cron-Secret: your-secret-here" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "vector_store_id": "vs_abc123...",
  "duration_ms": 5000
}
```

### Method 2: Cloudflare Cron (Automated)

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Triggers → Cron Triggers

2. **Add Cron Trigger**
   - **Cron Expression:** `0 2 * * *` (Daily at 2 AM)
   - **Route:** `/cron/update-vector-store`

3. **Set Environment Variable**
   - **Key:** `CRON_SECRET`
   - **Value:** Your secret (e.g., generate with `openssl rand -hex 32`)

4. **Update Worker Code** (if needed)
   - The cron handler is already in `src/index.ts`
   - Just needs the route configured

### Method 3: Manual Setup (Development)

```typescript
// In worker code or via API
import { setupBusinessVectorStore } from './tools/file-search';

const vectorStoreId = await setupBusinessVectorStore(env);
console.log('Vector store ID:', vectorStoreId);
```

---

## How It Works

1. **Creates Vector Store** (if doesn't exist)
   - Name: `easyMO-businesses`
   - Stores ID in KV: `business_vector_store_id`

2. **Fetches Businesses**
   - Queries `businesses` table where `active = true`
   - Limits to 10,000 businesses (to prevent timeout)

3. **Uploads as Files**
   - Batches businesses (100 per file)
   - Formats as JSONL (one JSON per line)
   - Uploads to OpenAI Files API

4. **Adds to Vector Store**
   - Links files to vector store
   - Enables semantic search

---

## Verification

### Check Vector Store ID in KV

```bash
# Via Cloudflare Dashboard
# Workers & Pages → KV → View namespace → Get key: business_vector_store_id
```

### Test File Search

In chat interface:
```
User: "Find restaurants near me"
Expected: Agent uses file_search tool
```

### Check Worker Logs

Look for:
- "Uploaded X businesses in Y files to vector store"
- File search tool being used in marketplace agent

---

## Updating Vector Store

### Manual Update

```bash
# Same as initial setup
curl -X POST https://easymo-agent-worker.ikanisa.workers.dev/cron/update-vector-store \
  -H "X-Cron-Secret: your-secret"
```

### Automatic Update (Recommended)

Set up Cloudflare Cron to run daily:
- **Schedule:** Daily at 2 AM
- **Route:** `/cron/update-vector-store`
- **Secret:** Set `CRON_SECRET` env var

---

## Troubleshooting

### Error: "Vector store not found"
- Vector store not created yet
- Run setup first

### Error: "No businesses found"
- Check `businesses` table has data
- Verify `active = true` filter

### Error: "KV not configured"
- Optional - vector store ID won't be cached
- Will be recreated each time (slower but works)

### Error: "Unauthorized"
- Check `X-Cron-Secret` header matches `CRON_SECRET` env var
- Or set `CRON_SECRET` in Cloudflare Dashboard

---

## Performance

- **Initial Setup:** ~5-10 seconds per 1000 businesses
- **File Upload:** ~1-2 seconds per file (100 businesses)
- **Total Time:** ~30-60 seconds for 10,000 businesses

---

## Cost Considerations

- **OpenAI Files API:** Free tier includes some storage
- **Vector Store:** Pay per search (very low cost)
- **Storage:** Minimal (JSONL files are small)

---

## Next Steps

After vector store is set up:
1. ✅ Test file search in marketplace agent
2. ✅ Verify semantic search works
3. ✅ Set up cron job for automatic updates
4. ✅ Monitor usage and costs

