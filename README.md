# easyMO Discovery

A chat-first PWA for mobility, shopping, and payments in Rwanda. Built with React 19, Vite, and Supabase.

## Architecture

This is a monorepo with the following structure:

```
├── apps/
│   ├── pwa/              # Vite+React PWA (main app)
│   └── chatgpt-ui/       # Minimal embedded UI bundle for ChatGPT
├── services/
│   ├── agent-runtime/    # OpenAI Agents SDK orchestration (Cloudflare Worker)
│   └── mcp-server/       # MCP server endpoints (can be part of agent-runtime)
├── packages/
│   └── shared/           # Shared types, schemas (zod), constants, tool contracts
└── supabase/             # Edge functions & migrations
```

## Quick Start

**Prerequisites:** Node.js 20+

```bash
# Install dependencies (workspace-aware)
npm install

# Run PWA locally
npm run dev

# Run agent-runtime worker locally
npm run worker:dev

# Build PWA
npm run build

# Deploy PWA to Cloudflare Pages
npm run pages:deploy

# Deploy worker to Cloudflare Workers
npm run worker:deploy
```

## Deployment

For complete deployment instructions, see **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**

**Quick Deploy Commands:**

```bash
# 1. Deploy Worker (Agent Runtime + MCP)
cd services/agent-runtime
npm install
wrangler login  # First time only
wrangler secret put OPENAI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
npm run deploy

# 2. Deploy PWA to Cloudflare Pages
cd apps/pwa
npm install
npm run build
npx wrangler pages deploy dist --project-name discovery

# 3. Deploy Supabase Migrations
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 4. Deploy Supabase Edge Functions
supabase functions deploy cleanup-presence
supabase functions deploy cleanup-ride-intents
supabase functions deploy cleanup-rate-limits
```

**Required Environment Variables:**

See [docs/DEPLOYMENT_GUIDE.md#step-1-environment-variables](docs/DEPLOYMENT_GUIDE.md#step-1-environment-variables) for complete list.

## Development Commands

### PWA (apps/pwa)

```bash
# Development server
npm run dev

# Build
npm run build

# Preview build
npm run preview

# E2E tests
npm run test:e2e

# Deploy to Cloudflare Pages
npm run pages:deploy
```

### Agent Runtime (services/agent-runtime)

```bash
# Development server
npm run worker:dev

# Deploy to Cloudflare Workers
npm run worker:deploy

# Run tests
npm run worker:test
```

### ChatGPT UI (apps/chatgpt-ui)

```bash
cd apps/chatgpt-ui
npm run dev
npm run build
```

## Supabase Local Setup

This project uses Supabase for authentication, database, and edge functions. To run Supabase locally:

### Prerequisites

- [Docker](https://www.docker.com/get-started) (for Supabase CLI)
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`

### Initial Setup

```bash
# Login to Supabase (if using hosted project)
supabase login

# Link to your project (optional - for hosted projects)
supabase link --project-ref your-project-ref

# Start local Supabase (requires Docker)
supabase start

# This will output:
# - API URL: http://localhost:54321
# - anon key: (your local anon key)
# - service_role key: (your local service_role key)
```

### Running Migrations

```bash
# Apply all migrations
supabase db reset

# Or apply migrations incrementally
supabase migration up

# Create a new migration
supabase migration new your_migration_name
```

### Local Development

1. **Update `.env.local`** in `apps/pwa/`:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your_local_anon_key
   VITE_WORKER_URL=http://localhost:8787
   ```

2. **Start Supabase** (if not already running):
   ```bash
   supabase start
   ```

3. **Run the PWA**:
   ```bash
   npm run dev
   ```

### Database Schema

The database schema is defined in `supabase/migrations/`. Key tables:

- `user_profiles` - User identity
- `user_roles` - Multi-role support
- `presence` - Real-time location tracking
- `ride_intents` - Mobility ride requests
- `matches` - Driver-passenger matching
- `marketplace_listings` - Vendor listings
- `payment_requests` - Payment tracking
- `conversations` - AI conversation tracking
- `messages` - Conversation messages
- `tool_traces` - AI tool execution tracking

See [DB_SCHEMA_AI_FIRST.md](./docs/DB_SCHEMA_AI_FIRST.md) for complete schema documentation.

### RPC Functions

Key RPC functions for secure queries:

- `get_nearby_presence(role, lat, lng, radius_m, limit)` - Get nearby presence entries
- `create_or_refresh_presence(...)` - Update presence with TTL
- `expire_stale_presence()` - Cleanup expired presence
- `create_match_candidates(intent_id, limit)` - Create driver-passenger matches

### Edge Functions

Edge functions are in `supabase/functions/`:

- `chat-gemini` - Secure Gemini API proxy
- `whatsapp-broadcast` - WhatsApp broadcast handling
- `whatsapp-status` - Broadcast status polling
- `log-request` - Analytics logging

To run edge functions locally:

```bash
# Start edge functions dev server
supabase functions serve

# Deploy edge function
supabase functions deploy function-name
```

### Stopping Supabase

```bash
# Stop local Supabase
supabase stop

# Stop and remove all data
supabase stop --no-backup
```

## Environment Variables

Create `.env.local` in the root or in `apps/pwa/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_WORKER_URL=https://your-worker.workers.dev
```

For local development, use:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
VITE_WORKER_URL=http://localhost:8787
```

Worker secrets are configured in Cloudflare Dashboard (not in .env files).

## Deploy to Cloudflare Pages

### Option 1: Via Dashboard (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
3. Create new project → Connect to Git
4. Configure build settings:
   - **Root directory:** `apps/pwa`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WORKER_URL`

### Option 2: Via CLI

```bash
npm run pages:deploy
```

## Project Structure

### apps/pwa
- Main PWA application
- Vite + React + TypeScript
- Deployed to Cloudflare Pages

### services/agent-runtime
- OpenAI Agents SDK orchestration
- Cloudflare Worker
- Streaming endpoint `/api/chat` (SSE)
- Tool invocation framework
- Logging + trace IDs

### packages/shared
- Shared TypeScript types
- Zod schemas for tool inputs/outputs
- Constants
- Tool contracts

### apps/chatgpt-ui
- Minimal embedded UI bundle for ChatGPT
- iframe-safe components
- Renders "cards" + key views

## AI Architecture

The app uses **OpenAI Agents SDK** as the primary chat engine, running on Cloudflare Workers:

```
Frontend (ChatSession)
  ↓ (HTTP POST / SSE)
Cloudflare Worker (services/agent-runtime)
  ├─→ Router Agent (routes to appropriate agent)
  ├─→ Marketplace Agent (business/product searches)
  ├─→ Mobility Agent (ride requests, matching)
  ├─→ Payments Agent (MoMo QR generation)
  └─→ Support Agent (general help)
```

**Legacy Support:** Gemini/Google Maps remain as optional server-side tools only (never in frontend).

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **State:** Zustand + React Query
- **AI Engine:** OpenAI Agents SDK (Cloudflare Worker) - Primary
- **Backend Tools:** Gemini/Google Maps (optional, server-side only)
- **Database:** Supabase (auth, DB, RLS, realtime, storage)
- **Deployment:** Cloudflare Pages (frontend), Cloudflare Workers (agents)

## Documentation

- [Quick Deploy Guide](./docs/QUICK_DEPLOY.md) - ⚡ Fast deployment reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Detailed deployment instructions
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist
- [Migration Guide](./docs/MIGRATION_TO_OPENAI.md) - Complete migration specification
- [Database Schema](./docs/DB_SCHEMA_AI_FIRST.md) - Complete database schema and RLS documentation
- [RPC Migration Guide](./docs/MIGRATION_GUIDE_RPC.md) - How to use new RPC functions
- [Next Steps: Migration](./docs/NEXT_STEPS_MIGRATION.md) - Database migration execution guide
- [Worker README](./services/agent-runtime/README.md) - Agent runtime architecture and API

## License

Private
