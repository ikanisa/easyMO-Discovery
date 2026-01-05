# Quick Start - Setting Secrets

## Option 1: Via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Workers
3. Create or select your worker (`easymo-agent-worker`)
4. Settings → Variables and Secrets
5. Add each secret:

### Required Secrets:

- **OPENAI_API_KEY**: `sk-proj-...` (your OpenAI API key)
- **SUPABASE_URL**: `https://your-project.supabase.co` (your Supabase project URL)
- **SUPABASE_ANON_KEY**: Your Supabase anon/public key

### Optional Secrets:

- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (for admin operations)
- **GEMINI_API_KEY**: (for optional geocoding)
- **GOOGLE_MAPS_API_KEY**: (for optional ETA calculations)

## Option 2: Via CLI

```bash
cd worker

# Install wrangler CLI if needed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets (paste values when prompted)
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted (starts with sk-proj-)

wrangler secret put SUPABASE_URL
# Paste your Supabase URL when prompted (e.g., https://xxxxx.supabase.co)

wrangler secret put SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service role key when prompted (optional)
```

## Option 3: Local Development (.dev.vars)

For local testing only (file is git-ignored):

```bash
cd worker
cat > .dev.vars << 'EOF'
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
EOF
```

Then run:

```bash
npm run dev
```

## Deploy

After secrets are set:

```bash
cd worker
npm install
npm run deploy
```

## Important Security Notes

⚠️ **NEVER commit `.dev.vars` or actual API keys to git**

✅ The `.dev.vars` file is already in `.gitignore`
✅ Use Cloudflare secrets for production
✅ Keep your keys secure

