# Google AI Studio Integration Guide

## ⚠️ CRITICAL: How to Safely Work with AI Studio

This repository was originally created by Google AI Studio but has been extended with production backend services. This guide explains how to safely integrate AI Studio changes without losing backend code.

---

## 🏗️ Repository Architecture

### Frontend (AI Studio Managed)
AI Studio owns and should manage these files:
- ✅ `App.tsx`
- ✅ `index.html`
- ✅ `index.tsx`
- ✅ `components/**/*.tsx`
- ✅ `pages/**/*.tsx`
- ✅ `services/gemini.ts`
- ✅ `services/location.ts`
- ✅ `services/supabase.ts` (client-side only)
- ✅ `constants.ts`
- ✅ `types.ts`

### Backend (Your Managed - DO NOT LET AI STUDIO TOUCH)
These files MUST be protected from AI Studio:
- ❌ `services/whatsapp-bridge/**` (Node.js WhatsApp service)
- ❌ `.github/workflows/**` (CI/CD pipelines)
- ❌ `supabase/migrations/**` (Database schemas)
- ❌ `supabase/functions/**` (Edge Functions)
- ❌ `*.sql` files
- ❌ Documentation files (except README.md)

### Build Tools (Your Managed)
AI Studio tries to delete these - keep them:
- ❌ `.eslintrc.json`
- ❌ `.prettierrc`
- ❌ `postcss.config.js`
- ❌ `tailwind.config.js`
- ❌ `vitest.config.ts`
- ❌ `tests/**`
- ❌ Test scripts in `package.json`

---

## 🚨 What Happened (Dec 14, 2025)

### The Incident
AI Studio pushed commit `83ce280` which:
- ❌ Deleted 35 files (13,256 lines)
- ❌ Removed entire WhatsApp Bridge service
- ❌ Deleted CI/CD workflows
- ❌ Deleted database migrations
- ❌ Deleted Edge Functions
- ❌ Stripped all testing infrastructure
- ✅ Added BusinessOnboarding.tsx (legitimate)

### Root Cause
1. AI Studio maintains its own version of the codebase
2. You added backend services locally (not in AI Studio)
3. You made UI edits in AI Studio interface
4. AI Studio "synced" = OVERWROTE GitHub with its state
5. Result: Everything not in AI Studio's memory = DELETED

### Resolution
- ✅ Reverted to commit `3b1e58a` (before deletion)
- ✅ Force pushed to remove bad commit
- ✅ Cherry-picked ONLY good changes from AI Studio
- ✅ Revoked AI Studio GitHub access
- ✅ All 35 files restored

---

## 📋 Safe Integration Strategy

### When AI Studio Makes Changes

**Step 1: NEVER Use AI Studio Sync**
- ❌ Don't click "Deploy" in AI Studio
- ❌ Don't click "Sync to GitHub"
- ❌ Don't enable auto-sync

**Step 2: Manual Review Process**
When you make changes in AI Studio UI:

```bash
# 1. Check what AI Studio wants to push
git fetch origin
git log origin/main --oneline -5

# 2. If AI Studio pushed, create backup branch
git branch backup-before-ai-studio

# 3. Pull and review changes
git pull origin main

# 4. Check for deletions (RED FLAG!)
git log -1 --stat | grep "delete\|remove"

# 5. If files deleted, REVERT IMMEDIATELY
git reset --hard HEAD^  # Go back one commit
git push origin main --force
```

**Step 3: Cherry-Pick Good Changes**
```bash
# View AI Studio commit
git show <ai-studio-commit-hash>

# Extract specific files you want
git checkout <ai-studio-commit-hash> -- pages/NewFeature.tsx
git checkout <ai-studio-commit-hash> -- components/UpdatedComponent.tsx

# Commit with clear message
git commit -m "feat: Cherry-pick UI improvements from AI Studio

ADDITIVE CHANGES ONLY:
✅ List what you kept

PRESERVED:
✅ All backend code intact
✅ No deletions"
```

---

## ✅ Approved Changes from AI Studio (Dec 14, 2025)

These changes were cherry-picked and integrated:

### New Files
- ✅ `pages/BusinessOnboarding.tsx` (15,794 bytes)
  - Business registration flow
  - Complete onboarding wizard
  - Role selection (vendor/buyer)

### Updated Files
- ✅ `App.tsx`
  - Added BusinessOnboarding import
  - Added AppMode.ONBOARDING case
  - Updated tagline: "Your Everyday Companion"
  - Changed Driver button gradient
  - Removed Support quick action

- ✅ `types.ts`
  - Added AppMode.ONBOARDING enum value

### UI Improvements
- Better branding
- Cleaner navigation
- Modern gradients

---

## ❌ Rejected Changes from AI Studio

These changes were NOT integrated (dangerous):

### index.html
```html
<!-- AI Studio wanted to add (REJECTED) -->
<script src="https://cdn.tailwindcss.com"></script>
<script type="importmap">
  "react": "https://esm.sh/react@^19.2.1"
</script>

<!-- Reason: Breaks npm build, adds external dependencies -->
```

### package.json
```json
// AI Studio wanted to remove (REJECTED)
"scripts": {
  "lint": "...",
  "format": "...",
  "test": "..."
}
"devDependencies": {
  "eslint": "...",
  "prettier": "...",
  "vitest": "..."
}

// Reason: Kills code quality tooling
```

### File Deletions
- ❌ services/whatsapp-bridge/** (production service)
- ❌ .github/workflows/** (CI/CD)
- ❌ supabase/** (database)
- ❌ All config files
- **Reason: Production code, critical infrastructure**

---

## 🛡️ Protection Measures Implemented

### 1. Revoked AI Studio Access ✅
- GitHub Settings → Applications → AI Studio → Revoked
- AI Studio can no longer push to this repository

### 2. Branch Protection (Recommended - TODO)
```
Repository Settings → Branches → Add rule
✅ Require pull request reviews
✅ Require status checks to pass
❌ Allow force pushes: OFF
```

### 3. Pre-commit Hooks (TODO)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Warn before committing backend deletions

if git diff --cached --name-status | grep -q "^D.*whatsapp-bridge"; then
  echo "❌ ERROR: Attempting to delete WhatsApp Bridge!"
  echo "This might be an AI Studio sync. Aborting."
  exit 1
fi
```

---

## 📚 Future Workflow

### Option A: Stop Using AI Studio (Recommended)
- ✅ Edit code ONLY locally
- ✅ Push from local git
- ✅ Use AI Studio just for viewing (no edits)
- ✅ No risk of deletions

### Option B: Separate Repositories
- Create `easyMO-Frontend` (AI Studio managed)
- Create `easyMO-Backend` (your managed)
- Connect via API
- Clean separation

### Option C: Careful Manual Merges (Current)
- ✅ AI Studio access revoked
- ✅ Manual review of all changes
- ✅ Cherry-pick good changes only
- ⚠️ Requires discipline

---

## 🔄 Integration Checklist

Before accepting AI Studio changes:

```bash
# 1. Create backup
git branch backup-$(date +%Y%m%d-%H%M%S)

# 2. Review changes
git log -1 --stat
git show HEAD --name-status

# 3. Check for deletions
DELETED=$(git log -1 --diff-filter=D --name-only | wc -l)
if [ $DELETED -gt 5 ]; then
  echo "⚠️  WARNING: $DELETED files deleted!"
  echo "This might be an AI Studio overwrite!"
fi

# 4. Verify backend intact
ls services/whatsapp-bridge/index.js || echo "❌ WhatsApp Bridge deleted!"
ls .github/workflows/deploy-whatsapp-bridge.yml || echo "❌ CI/CD deleted!"
ls supabase/migrations/ || echo "❌ Migrations deleted!"

# 5. If anything deleted, revert and cherry-pick
git reset --hard HEAD^
git cherry-pick <commit-hash> --no-commit
# Manually unstage deletions
git restore --staged services/whatsapp-bridge/
git commit -m "feat: Cherry-pick UI improvements from AI Studio"
```

---

## 📊 Current Status

### Repository State
- ✅ All backend code intact
- ✅ BusinessOnboarding integrated
- ✅ UI improvements applied
- ✅ No deletions
- ✅ Production running

### AI Studio Status
- ❌ GitHub access revoked
- ✅ Can't push anymore
- ✅ Safe from future overwrites

### Protection Level
- ✅ Local git safeguards
- ⚠️ Branch protection: TODO
- ⚠️ Pre-commit hooks: TODO

---

## 🎓 Lessons Learned

1. **AI Studio does force overwrites, not merges**
   - It doesn't pull from GitHub first
   - It pushes its entire state
   - Anything not in its memory = deleted

2. **Never mix AI Studio with backend code in same repo**
   - AI Studio is frontend-focused
   - Backend services confuse it
   - Separation is cleaner

3. **Always backup before accepting AI Studio changes**
   - Create branch before pulling
   - Review all deletions
   - Cherry-pick instead of merge

4. **Revoke push access if not actively using AI Studio**
   - Prevents accidental syncs
   - Forces manual review
   - Safer workflow

---

## 📞 Support

If AI Studio causes issues again:

1. **Immediate Recovery**
   ```bash
   # Reset to last good commit
   git reset --hard <good-commit-hash>
   git push origin main --force
   ```

2. **Check this guide** for cherry-picking process

3. **Review** `.git/config` for unwanted remotes

4. **Verify** GitHub Settings → Applications

---

## 🔗 Related Documentation

- [WHATSAPP_BRIDGE_DEPLOYMENT.md](WHATSAPP_BRIDGE_DEPLOYMENT.md) - Backend architecture
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What we built
- [SECURITY.md](SECURITY.md) - Security practices

---

**Last Updated:** Dec 14, 2025
**Status:** AI Studio access revoked, safe integration strategy active
**Next Review:** When considering re-enabling AI Studio access
