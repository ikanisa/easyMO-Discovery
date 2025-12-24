<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# easyMO Discovery

A chat-first PWA for mobility, shopping, and payments in Rwanda. Built with React 19, Vite, and Supabase.

## Quick Start

**Prerequisites:** Node.js 20+

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Supabase credentials to .env.local
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Run locally
npm run dev
```

## Deploy to Cloudflare Pages

### Option 1: Via Dashboard (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
3. Create new project → Connect to Git
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Option 2: Via CLI

```bash
# First time: authenticate with Cloudflare
npx wrangler login

# Deploy
npm run pages:deploy
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `GEMINI_API_KEY` | ❌ | Only for local dev fallback |

> **Note:** AI features are handled by Supabase Edge Functions which have their own secrets configured in the Supabase dashboard.

## Project Structure

```
├── pages/          # Route components
├── components/     # Reusable UI components
├── services/       # API & business logic
├── supabase/       # Edge functions & migrations
├── public/         # Static assets + Cloudflare config
└── dist/           # Build output (git-ignored)
```

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **State:** Zustand + React Query
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI:** Google Gemini (via Edge Functions)
- **Deployment:** Cloudflare Pages

## License

Private
