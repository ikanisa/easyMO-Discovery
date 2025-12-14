# 🔒 Security & Credential Management Guide

## ⚠️ CRITICAL: Git History Contains Exposed Credentials

Your repository's git history contains hardcoded Supabase credentials that were committed in previous versions. While we've fixed the current code, **old commits still expose these credentials**.

### Exposed Credentials
- Supabase URL: `https://rghmxgutlbvzrfztxvaq.supabase.co`
- Supabase Anon Key: `eyJhbG...` (in git history)

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Rotate Supabase Keys (URGENT)
Since credentials were committed to git, they should be considered compromised:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to: Settings → API → Project API keys
3. Click "Rotate" on the `anon` public key
4. Update `.env.local` with the new key:
   ```bash
   VITE_SUPABASE_ANON_KEY=your_new_key_here
   ```

### 2. Clean Git History (Recommended)
To permanently remove credentials from git history:

```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# or
pip install git-filter-repo   # Other systems

# Backup your repo first!
git clone --mirror . ../easyMO-Discovery-backup

# Remove the file containing credentials from history
git filter-repo --path services/supabase.ts --invert-paths

# Force push (⚠️ COORDINATE WITH TEAM FIRST)
git push origin --force --all
```

**WARNING:** This rewrites git history. All team members must re-clone the repo.

### 3. Alternative: Make Repository Private
If cleaning history is too disruptive:
1. Go to GitHub repo Settings
2. Scroll to "Danger Zone"
3. Click "Change repository visibility" → "Make private"
4. Still rotate the Supabase keys as a precaution

## ✅ SECURITY IMPROVEMENTS APPLIED

### Environment Variables
All sensitive credentials now use environment variables:

**File: `.env.local` (gitignored)**
```env
GEMINI_API_KEY=your_key_here
VITE_SUPABASE_URL=https://rghmxgutlbvzrfztxvaq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**File: `services/supabase.ts`**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
```

### Protected Files
`.gitignore` includes:
- `*.local` (covers `.env.local`)
- `node_modules`
- `dist`

## 📋 DEPLOYMENT CHECKLIST

### Local Development
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local with your keys
nano .env.local

# 3. Install dependencies
npm install

# 4. Run development server
npm run dev
```

### Production Deployment (Vercel/Netlify/etc.)

#### Environment Variables to Set:
```
GEMINI_API_KEY=your_production_gemini_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Vercel:
```bash
vercel env add GEMINI_API_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

#### Netlify:
1. Site Settings → Environment Variables
2. Add each variable with production scope

#### GitHub Actions (CI/CD):
```yaml
# .github/workflows/deploy.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## 🔐 BEST PRACTICES GOING FORWARD

### ✅ DO
- Store all secrets in `.env.local` or environment variables
- Use `.env.example` as a template (without real values)
- Rotate credentials immediately if exposed
- Use different keys for development and production
- Enable Supabase RLS (Row Level Security) policies
- Review code before committing: `git diff --staged`

### ❌ DON'T
- Commit `.env.local` or any file with secrets
- Share API keys via chat/email
- Use production credentials in development
- Store secrets in source code
- Push sensitive data to public repositories

## 🛡️ ADDITIONAL SECURITY MEASURES

### Supabase RLS Policies
Ensure Row Level Security is enabled:
```sql
-- Example: Restrict access to authenticated users
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own data"
ON your_table FOR SELECT
USING (auth.uid() = user_id);
```

### Gemini API Key Restrictions
1. Go to Google AI Studio: https://aistudio.google.com/apikey
2. Click on your API key → "Edit"
3. Add "Application restrictions":
   - HTTP referrers for web: `https://yourdomain.com/*`
   - Or API restrictions: Enable only Gemini API

### Content Security Policy (CSP)
Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
               connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co;">
```

## 📞 INCIDENT RESPONSE

If credentials are leaked:

1. **Immediately rotate all keys**
2. **Review access logs** in Supabase Dashboard
3. **Check for unauthorized usage** in Gemini API Console
4. **Notify team members**
5. **Update all deployment environments**
6. **Clean git history** (if applicable)

## 📚 RESOURCES

- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)

---

**Last Updated:** 2024-12-14  
**Status:** Credentials moved to environment variables ✅  
**Action Required:** Rotate Supabase keys 🔴
