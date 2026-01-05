# AI-First UX Design Document

**Date:** 2025-01-27  
**Status:** ✅ Implemented

---

## Overview

The UI has been refactored to be AI-first and chat-native, where chat is the primary interaction method and pages become rich detail views accessible from chat.

---

## Design Principles

1. **Chat-First:** Chat input is the primary entry point for all interactions
2. **Smart Chips:** Quick actions for common intents (Find Ride, Driver Mode, Find Business, MoMo QR, Scan QR)
3. **Tool Cards:** Rich result cards rendered in chat (matches, listings, QR codes)
4. **Preserve All Features:** All existing pages remain accessible (as detail views or via navigation)
5. **Role Flexibility:** Role toggle pill (not a gate) - users can switch between passenger/driver

---

## New Components

### ChatHome (`components/Chat/ChatHome.tsx`)

**Purpose:** AI-first home screen replacing widget grid

**Features:**
- Large chat input field (primary focus)
- Smart chips for quick actions
- Role toggle pill (passenger/driver)
- Legacy access via "More Options" (collapsible)

**Quick Actions:**
- Find Ride → Mobility agent
- I'm a Driver → Mobility agent (driver mode)
- Find Business → Marketplace agent
- MoMo QR → Payments agent
- Scan QR → Payments agent

---

## Updated Components

### App.tsx

**Changes:**
- Default home screen is now `ChatHome` (not widget grid)
- Removed `homeSearchQuery` state (ChatHome handles its own input)
- Updated `startChat` to support new agent types
- Role persistence (doesn't clear when returning to home)

### ChatSession

**Status:** Unchanged (will be updated in Phase 5 to use Worker)

**Current:** Still uses Gemini service
**Future:** Will use Worker SSE streaming

---

## Navigation Flow

### Before (Widget-Based):
```
Home (Widget Grid)
  ├─→ Find Ride → Discovery (role: passenger)
  ├─→ Driver Mode → Discovery (role: driver)
  ├─→ MoMo QR → MomoGenerator
  └─→ Scanner → QRScanner
```

### After (AI-First):
```
Home (ChatHome)
  ├─→ Chat Input → Router Agent → Appropriate Agent → ChatSession
  ├─→ Quick Action Chips → Direct Agent → ChatSession
  ├─→ Role Toggle → Discovery (if passenger/driver)
  └─→ More Options → Legacy Pages (Discovery, Business, Services, etc.)
```

---

## User Journeys

### Journey 1: Find a Ride (AI-First)
1. User opens app → ChatHome
2. User types "I need a ride" or clicks "Find Ride" chip
3. Router agent routes to Mobility agent
4. Mobility agent uses `find_matches` tool
5. Results render as match cards in chat
6. User can tap match to start chat with driver

### Journey 2: Find Business (AI-First)
1. User opens app → ChatHome
2. User types "Find hardware stores" or clicks "Find Business" chip
3. Router agent routes to Marketplace agent
4. Marketplace agent uses `search_offers` tool
5. Results render as business cards in chat
6. User can tap business to call/WhatsApp

### Journey 3: Generate MoMo QR (AI-First)
1. User opens app → ChatHome
2. User types "Generate QR for 5000 RWF" or clicks "MoMo QR" chip
3. Router agent routes to Payments agent
4. Payments agent uses `generate_momo_qr` tool
5. QR code renders as card in chat
6. User can share/scan QR

### Journey 4: Legacy Access (Preserved)
1. User opens app → ChatHome
2. User clicks "More Options" → Legacy pages accessible
3. All existing pages work as before (Discovery, Business, Services, etc.)

---

## Tool Cards (Rendered in Chat)

### Match Cards (Mobility)
- Driver/passenger match list
- Distance, ETA, vehicle type
- Call/WhatsApp buttons

### Business Cards (Marketplace)
- Business listings
- Phone number, address, distance
- Call/WhatsApp buttons
- Broadcast button (mass inquiry)

### Property Cards (Real Estate)
- Property listings
- Price, location, features
- Contact buttons

### QR Cards (Payments)
- MoMo QR code image
- USSD code
- Share button

---

## Role Management

### Before:
- Role selected via widget (passenger or driver)
- Single role per user
- Role cleared when returning to home

### After:
- Role toggle pill on ChatHome
- Multi-role support (user can be passenger + driver)
- Role persists across navigation
- Role can be changed anytime via toggle

---

## Command Palette Pattern

The chat input acts as a "command palette" - a single input that handles all intents:

**Examples:**
- "I need a ride" → Mobility agent
- "Find restaurants" → Marketplace agent
- "Generate QR" → Payments agent
- "I'm a driver" → Mobility agent (driver mode)
- "Help" → Support agent

Router agent automatically determines the right agent based on user intent.

---

## Accessibility

### Preserved:
- ✅ All existing pages accessible
- ✅ All existing features work
- ✅ Navigation still works
- ✅ Bottom nav bar unchanged

### Enhanced:
- ✅ Chat-first reduces navigation depth
- ✅ Quick actions reduce typing
- ✅ Role toggle is more discoverable

---

## Migration Notes

### Breaking Changes:
- None - all existing pages remain accessible

### New Features:
- ChatHome component
- Quick action chips
- Role toggle pill
- Command palette pattern

### Deprecated (but still accessible):
- Widget grid (replaced by ChatHome, but accessible via "More Options")

---

## Future Enhancements (Phase 5)

- Update ChatSession to use Worker SSE streaming
- Add tool card rendering for Worker responses
- Add conversation history
- Add voice input to ChatHome
- Add image upload to ChatHome

---

**END OF UX DESIGN DOCUMENT**

