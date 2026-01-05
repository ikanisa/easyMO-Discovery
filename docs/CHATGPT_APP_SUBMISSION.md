# ChatGPT App Submission Guide

**Date:** 2025-01-29  
**Status:** Ready for Submission

---

## Overview

This guide provides step-by-step instructions for submitting easyMO Discovery as a ChatGPT App using the Apps SDK.

---

## Prerequisites

- [x] MCP server implemented and deployed
- [x] ChatGPT UI bundle created and deployed
- [x] Privacy policy page published
- [x] Data minimization statement published
- [x] HTTPS endpoints configured
- [x] App manifest/metadata prepared

---

## Step 1: Deploy Infrastructure

### 1.1 Deploy MCP Server

**Location:** `services/agent-runtime`

```bash
cd services/agent-runtime
npm run deploy
```

**Verify:**
- MCP server accessible at: `https://your-worker.workers.dev/mcp`
- Test endpoints:
  - `GET /mcp/capabilities` - Should return capabilities
  - `GET /mcp/tools` - Should return tool list
  - `POST /mcp/tools/call` - Should execute tools

### 1.2 Deploy ChatGPT UI

**Location:** `apps/chatgpt-ui`

```bash
cd apps/chatgpt-ui
npm install
npm run build
# Deploy dist/ to static hosting (Cloudflare Pages, Vercel, etc.)
```

**Verify:**
- UI accessible at: `https://your-domain.com/chatgpt-ui`
- Works in iframe
- Uses `window.openai` APIs

---

## Step 2: Prepare Submission Materials

### 2.1 App Manifest

**File:** `apps/chatgpt-ui/public/manifest.json`

Update with your actual URLs:
- `mcp_server_url`: Your MCP server endpoint
- `ui_bundle_url`: Your UI bundle URL
- `privacy_policy_url`: Your privacy policy URL
- `data_minimization_url`: Your data minimization statement URL

### 2.2 Privacy Policy

**File:** `apps/pwa/public/privacy.html`

**Requirements:**
- ✅ Explains data collection
- ✅ Describes data usage
- ✅ Details data minimization practices
- ✅ Provides contact information
- ✅ Accessible via HTTPS

**Deploy:** Upload to your static hosting at `/privacy`

### 2.3 Data Minimization Statement

**File:** `apps/pwa/public/data-minimization.html`

**Requirements:**
- ✅ Details TTL policies
- ✅ Explains location precision
- ✅ Describes automatic deletion
- ✅ Accessible via HTTPS

**Deploy:** Upload to your static hosting at `/data-minimization`

---

## Step 3: Test Locally

### 3.1 Local MCP Server

```bash
cd services/agent-runtime
npm run dev
# Server runs on http://localhost:8787
```

**Test:**
```bash
# Test capabilities
curl http://localhost:8787/mcp/capabilities

# Test tools list
curl http://localhost:8787/mcp/tools

# Test tool call
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-id" \
  -d '{
    "name": "set_presence",
    "arguments": {
      "user_id": "test-user-id",
      "role": "driver",
      "lat": -1.9441,
      "lng": 30.0619,
      "is_online": true
    }
  }'
```

### 3.2 Local ChatGPT UI

```bash
cd apps/chatgpt-ui
npm install
npm run dev
# UI runs on http://localhost:3001
```

**Test:**
- Open in browser
- Check console for errors
- Verify `window.openai` APIs are available (mock them if needed)

### 3.3 Combined Local Dev Mode

**Quick Start Script:**
```bash
./scripts/dev-chatgpt-app.sh
```

This starts both MCP server and ChatGPT UI simultaneously.

---

## Step 4: Submission Checklist

### 4.1 Technical Requirements

- [ ] **MCP Server**
  - [ ] Deployed to HTTPS endpoint
  - [ ] Returns proper MCP format
  - [ ] Handles tool execution correctly
  - [ ] Includes proper error handling
  - [ ] Supports CORS

- [ ] **ChatGPT UI**
  - [ ] Deployed to HTTPS endpoint
  - [ ] Works in iframe
  - [ ] Uses `window.openai` APIs
  - [ ] Renders tool cards correctly
  - [ ] Handles errors gracefully

- [ ] **Tool Metadata**
  - [ ] All tools have descriptions
  - [ ] Input schemas are correct
  - [ ] Safe annotations included
  - [ ] Tool categories defined

### 4.2 Privacy & Compliance

- [ ] **Privacy Policy**
  - [ ] Published and accessible
  - [ ] Explains data collection
  - [ ] Details data usage
  - [ ] Includes contact information

- [ ] **Data Minimization**
  - [ ] Statement published
  - [ ] TTL policies documented
  - [ ] Location precision explained
  - [ ] Automatic deletion described

- [ ] **Security**
  - [ ] HTTPS endpoints only
  - [ ] Input validation implemented
  - [ ] Rate limiting enabled
  - [ ] Error handling secure

### 4.3 Documentation

- [ ] **App Description**
  - [ ] Clear and concise
  - [ ] Explains key features
  - [ ] Includes use cases

- [ ] **Screenshots**
  - [ ] At least 2 screenshots
  - [ ] Show key features
  - [ ] High quality (PNG format)

- [ ] **Icon**
  - [ ] 512x512 PNG
  - [ ] Transparent background
  - [ ] Represents app clearly

---

## Step 5: Submit to ChatGPT

### 5.1 Access Submission Portal

1. Go to ChatGPT Apps submission portal
2. Sign in with your OpenAI account
3. Click "Create New App"

### 5.2 Fill Submission Form

**Basic Information:**
- **App Name:** easyMO Discovery
- **Short Description:** Discover mobility, marketplace, and payments in Rwanda
- **Long Description:** 
  ```
  easyMO Discovery helps you find rides, search businesses, and generate 
  Mobile Money QR codes in Rwanda. Features include:
  - Driver/passenger matching with real-time presence
  - Marketplace search for businesses and services
  - MoMo QR code generation and scanning
  - Location-based services with privacy protection
  ```

**Technical Configuration:**
- **MCP Server URL:** `https://your-worker.workers.dev/mcp`
- **UI Bundle URL:** `https://your-domain.com/chatgpt-ui`
- **Protocol Version:** `2024-11-05`

**Privacy & Compliance:**
- **Privacy Policy URL:** `https://your-domain.com/privacy`
- **Data Minimization URL:** `https://your-domain.com/data-minimization`
- **Categories:** Mobility, Marketplace, Payments
- **Tags:** rwanda, mobility, marketplace, mobile-money, ride-sharing

**Media:**
- **Icon:** Upload 512x512 PNG icon
- **Screenshots:** Upload at least 2 screenshots (PNG format)

### 5.3 Review & Submit

1. Review all information
2. Test app in preview mode
3. Submit for review

---

## Step 6: Post-Submission

### 6.1 Monitor Status

- Check submission status regularly
- Respond to any review feedback promptly
- Make requested changes if needed

### 6.2 Testing

Once approved:
- Test app in ChatGPT interface
- Verify all tools work correctly
- Check UI rendering
- Test error handling

### 6.3 Updates

For future updates:
- Update version number
- Test thoroughly before resubmitting
- Document changes in changelog

---

## Troubleshooting

### MCP Server Issues

**Problem:** Tools not appearing in ChatGPT
- **Solution:** Verify `/mcp/tools` endpoint returns correct format
- **Check:** Tool names match exactly (case-sensitive)

**Problem:** Tool execution fails
- **Solution:** Check error logs in Cloudflare Workers dashboard
- **Check:** Verify user context headers are passed correctly

### UI Issues

**Problem:** UI not rendering in iframe
- **Solution:** Check iframe permissions and CSP headers
- **Check:** Verify `window.openai` APIs are available

**Problem:** Tool cards not displaying
- **Solution:** Check browser console for errors
- **Check:** Verify tool result format matches expected structure

### Privacy Issues

**Problem:** Privacy policy not accessible
- **Solution:** Verify HTTPS and correct URL
- **Check:** Ensure page is publicly accessible

---

## Local Development

### Quick Start

```bash
# Start both MCP server and UI
./scripts/dev-chatgpt-app.sh
```

### Manual Start

```bash
# Terminal 1: MCP Server
cd services/agent-runtime
npm run dev

# Terminal 2: ChatGPT UI
cd apps/chatgpt-ui
npm install
npm run dev
```

### Testing MCP Server

```bash
# Test capabilities
curl http://localhost:8787/mcp/capabilities

# Test tools
curl http://localhost:8787/mcp/tools | jq

# Test tool call
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{
    "name": "set_presence",
    "arguments": {
      "user_id": "test-user",
      "role": "driver",
      "lat": -1.9441,
      "lng": 30.0619,
      "is_online": true
    }
  }' | jq
```

---

## Resources

- [ChatGPT Apps SDK Documentation](https://platform.openai.com/docs/guides/apps)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Privacy Best Practices](https://platform.openai.com/docs/guides/apps/privacy)

---

## Support

For submission questions:
- Review ChatGPT Apps documentation
- Contact OpenAI support
- Check submission portal FAQ

---

## Checklist Summary

**Before Submission:**
- [ ] MCP server deployed and tested
- [ ] ChatGPT UI deployed and tested
- [ ] Privacy policy published
- [ ] Data minimization statement published
- [ ] App manifest updated with correct URLs
- [ ] Screenshots prepared
- [ ] Icon prepared
- [ ] All tools tested and working
- [ ] Error handling verified
- [ ] HTTPS endpoints confirmed

**Ready to Submit!** ✅
