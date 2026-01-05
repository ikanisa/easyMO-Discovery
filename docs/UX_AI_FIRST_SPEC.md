# UX AI-First Specification

**Last Updated:** 2025-01-28  
**Status:** Implementation Ready

## Overview

This document specifies the AI-first UI/UX refactor for the easyMO PWA. The primary interface becomes a chat shell where users interact with AI agents, with all features accessible through natural language or quick action chips.

---

## Design Principles

1. **Chat-First:** The default and primary interface is a chat conversation
2. **Low-Literacy Friendly:** Big buttons, minimal text, visual icons, localized labels
3. **Card-Based Results:** All agent responses render as interactive cards
4. **Progressive Disclosure:** Advanced features accessible via drawer/views
5. **Realtime Updates:** Live presence and match updates via Supabase Realtime
6. **Explicit Consent:** Clear location permission flow with manual fallback

---

## User Journeys

### Journey 1: Finding a Ride (Passenger)

1. **Entry:** User opens app → ChatShell appears
2. **Quick Action:** User taps "Nearby Drivers" chip OR types "I need a ride"
3. **Location Consent:** If not granted, modal appears with:
   - Clear explanation: "We need your location to find nearby drivers"
   - Big "Allow Location" button
   - "Enter Address Manually" fallback
4. **Agent Response:** Agent calls `find_driver_matches` tool
5. **Card Display:** `MobilityMatchCard` list appears showing:
   - Driver avatar/icon
   - Distance (e.g., "2.3 km away")
   - Vehicle type icon (moto/cab)
   - "Request Ride" button
6. **Action:** User taps "Request Ride" → Creates ride intent
7. **Realtime Update:** Card updates when driver accepts/declines

### Journey 2: Going Online (Driver)

1. **Entry:** User opens app → ChatShell
2. **Quick Action:** User taps "Go Online" chip OR types "I'm a driver"
3. **Location Consent:** Same modal as Journey 1
4. **Agent Response:** Agent calls `set_presence` tool
5. **Status Display:** Header shows:
   - "🟢 Online" indicator
   - "Location: Updated 2 min ago"
   - "Go Offline" toggle
6. **Realtime Match:** When passenger creates intent, card appears automatically
7. **Action:** User taps match card → Opens ride details → "Accept" button

### Journey 3: Searching Marketplace

1. **Entry:** User opens app → ChatShell
2. **Quick Action:** User taps "Buy/Sell" chip OR types "Find restaurants"
3. **Agent Response:** Agent calls `search_listings` tool
4. **Card Display:** `ListingResultsCard` list appears showing:
   - Business image/icon
   - Name and category
   - Price range
   - Distance (if location available)
   - "View Details" button
5. **Action:** User taps card → Opens Business view (full page)
6. **Navigation:** User can return to chat via back button or drawer

### Journey 4: Generating Payment QR

1. **Entry:** User opens app → ChatShell
2. **Quick Action:** User taps "Generate MoMo QR" chip OR types "I need to receive payment"
3. **Agent Response:** Agent calls `generate_momo_qr` tool
4. **Card Display:** `PaymentQRCard` appears showing:
   - QR code image
   - Amount (if specified)
   - USSD code (copyable)
   - "Share QR" button
5. **Action:** User taps "Share QR" → Native share sheet

### Journey 5: Scanning QR

1. **Entry:** User opens app → ChatShell
2. **Quick Action:** User taps "Scan QR" chip OR types "scan qr code"
3. **Agent Response:** Agent calls `parse_qr` tool
4. **Card Display:** `ScannerResultCard` appears showing:
   - Parsed QR data
   - Payment amount (if MoMo QR)
   - "Pay" or "Copy" action button
5. **Action:** User taps action → Proceeds with payment or copies data

### Journey 6: Business Onboarding

1. **Entry:** User opens app → ChatShell
2. **Quick Action:** User taps "Onboard Business" chip OR types "I want to sell on easyMO"
3. **Agent Response:** Agent calls `vendor_onboarding_status` tool
4. **Card Display:** Shows onboarding progress:
   - Steps completed (checkmarks)
   - Next step highlighted
   - "Continue" button
5. **Action:** User taps "Continue" → Opens BusinessOnboarding view

---

## Wireframe Description

### ChatShell (Default View)

```
┌─────────────────────────────────────┐
│ [☰] easyMO        [📍] [⚙️]         │ ← Header (drawer, location, settings)
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Quick Actions:              │   │
│  │ [🚗 Nearby Drivers]          │   │
│  │ [👥 Nearby Passengers]      │   │
│  │ [🛒 Buy/Sell]                │   │
│  │ [💳 Generate MoMo QR]       │   │
│  │ [📷 Scan QR]                 │   │
│  │ [🏢 Onboard Business]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Agent: Hi! How can I help?  │   │ ← Welcome message
│  └─────────────────────────────┘   │
│                                     │
│  [Tool Card Example]                │
│  ┌─────────────────────────────┐   │
│  │ 🚗 Driver Match             │   │
│  │ 2.3 km away                  │   │
│  │ [Request Ride]              │   │
│  └─────────────────────────────┘   │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🎤] [📎] Type a message... [➤]   │ ← Input (voice, attach, send)
└─────────────────────────────────────┘
```

### Location Permission Modal

```
┌─────────────────────────────────────┐
│                                     │
│         📍                          │
│                                     │
│  We need your location to           │
│  find nearby drivers and            │
│  businesses.                        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Allow Location Access      │   │ ← Big button (primary)
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Enter Address Manually     │   │ ← Fallback (secondary)
│  └─────────────────────────────┘   │
│                                     │
│  [Not Now]                          │ ← Dismiss
└─────────────────────────────────────┘
```

### Left Drawer (Navigation)

```
┌─────────────────────────────────────┐
│ [×]                                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Chat                        │   │ ← Current (highlighted)
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Discovery                   │   │ ← Opens Discovery view
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Business                    │   │ ← Opens Business view
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Services                    │   │ ← Opens Services view
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Settings                     │   │ ← Opens Settings view
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Tool Card Examples

#### MobilityMatchCard
```
┌─────────────────────────────────────┐
│ 🚗 Driver Available                │
│                                     │
│ 👤 John                            │
│ 📍 2.3 km away                     │
│ 🏍️ Moto                            │
│                                     │
│ [Request Ride]                     │
└─────────────────────────────────────┘
```

#### ListingResultsCard
```
┌─────────────────────────────────────┐
│ [Image] Restaurant Name             │
│                                     │
│ 🍽️ Restaurant                      │
│ 💰 5,000 - 15,000 RWF              │
│ 📍 1.2 km away                     │
│                                     │
│ [View Details]                     │
└─────────────────────────────────────┘
```

#### PaymentQRCard
```
┌─────────────────────────────────────┐
│         [QR Code Image]             │
│                                     │
│ Amount: 10,000 RWF                  │
│                                     │
│ USSD: *182*6*2*...                 │
│ [Copy Code]                         │
│                                     │
│ [Share QR]                          │
└─────────────────────────────────────┘
```

---

## Component Architecture

### New Components (`apps/pwa/src/components/ai/`)

1. **ChatShell.tsx** - Main chat interface (default route)
   - Chat composer
   - Quick action chips
   - Message list with tool cards
   - Input with voice/attach buttons

2. **QuickActionChip.tsx** - Reusable chip component
   - Icon + label
   - Tap handler
   - Visual feedback

3. **ToolCard.tsx** - Base card component
   - Common styling
   - Action buttons
   - Expandable content

4. **MobilityMatchCard.tsx** - Driver/passenger match card
   - Avatar/icon
   - Distance display
   - Vehicle type
   - Action button (Request/Accept)

5. **ListingResultsCard.tsx** - Marketplace listing card
   - Image/icon
   - Title, category, price
   - Distance
   - View Details button

6. **PaymentQRCard.tsx** - MoMo QR code card
   - QR image
   - Amount display
   - USSD code (copyable)
   - Share button

7. **ScannerResultCard.tsx** - QR scan result card
   - Parsed data display
   - Action buttons (Pay/Copy)

8. **LocationStatusBar.tsx** - Location status in header
   - Online/offline indicator
   - "Location updated X min ago"
   - "Go Offline" toggle

9. **LocationConsentModal.tsx** - Enhanced permission modal
   - Clear explanation
   - Big primary button
   - Manual address input fallback
   - Dismiss option

### Modified Components

1. **Layout.tsx** - Add left drawer navigation
2. **MessageBubble.tsx** - Support tool card rendering
3. **ChatSession.tsx** - Integrate with ChatShell (or merge)

---

## Routing Changes

### New Route Structure

```
/ (default) → ChatShell
/chat → ChatShell (explicit)
/discovery → Discovery view (from drawer/card)
/business → Business view (from drawer/card)
/services → Services view (from drawer/card)
/momo → MomoGenerator view (from drawer/card)
/scanner → QRScanner view (from drawer/card)
/onboarding → BusinessOnboarding view (from drawer/card)
/settings → Settings view (from drawer/card)
```

### Navigation Flow

- **Default:** Always start at ChatShell
- **From Cards:** Tap card → Opens full view (Discovery, Business, etc.)
- **From Drawer:** Tap menu item → Opens view
- **Back Button:** Returns to ChatShell
- **Deep Links:** Preserved for existing shortcuts

---

## Localization Scaffold

### Label Structure

```typescript
const labels = {
  en: {
    quickActions: {
      nearbyDrivers: 'Nearby Drivers',
      nearbyPassengers: 'Nearby Passengers',
      buySell: 'Buy/Sell',
      generateQR: 'Generate MoMo QR',
      scanQR: 'Scan QR',
      onboardBusiness: 'Onboard Business',
    },
    location: {
      permissionTitle: 'We need your location',
      permissionMessage: 'We need your location to find nearby drivers and businesses.',
      allowLocation: 'Allow Location Access',
      enterManually: 'Enter Address Manually',
      notNow: 'Not Now',
      lastUpdated: 'Location updated {minutes} min ago',
      goOffline: 'Go Offline',
      goOnline: 'Go Online',
    },
    // ... more labels
  },
  rw: {
    // Kinyarwanda translations
  },
  fr: {
    // French translations
  },
};
```

### Implementation

- Create `apps/pwa/services/i18n.ts`
- Use context provider for language selection
- Store preference in localStorage
- Default to system language or 'en'

---

## Realtime Updates

### Supabase Realtime Integration

1. **Presence Updates:**
   - Subscribe to `presence` table changes
   - Update location status bar
   - Refresh match cards when drivers come online/offline

2. **Match Updates:**
   - Subscribe to `matches` table changes
   - Show new match cards automatically
   - Update match status (pending → accepted → completed)

3. **Ride Intent Updates:**
   - Subscribe to `ride_intents` table changes
   - Show new passenger requests to drivers
   - Update intent status in cards

### Implementation

```typescript
// Subscribe to presence changes
supabase
  .channel('presence-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Update UI
  })
  .subscribe();
```

---

## Low-Literacy Design Guidelines

1. **Button Sizes:**
   - Minimum 44x44px touch target
   - Primary actions: 56x56px
   - Quick action chips: 120x48px minimum

2. **Text:**
   - Headings: 18-24px, bold
   - Body: 16px minimum
   - Labels: 14px minimum
   - Avoid long sentences

3. **Icons:**
   - Use universally recognized icons
   - Accompany with text labels
   - Minimum 24x24px size

4. **Colors:**
   - High contrast (WCAG AA minimum)
   - Use color + shape for meaning
   - Don't rely on color alone

5. **Spacing:**
   - Generous padding (16px minimum)
   - Clear visual hierarchy
   - Group related items

---

## PWA Requirements

### Lighthouse Checklist

- ✅ Service Worker registered
- ✅ Manifest configured
- ✅ Offline fallback page
- ✅ Installable (icons, start_url, display)
- ✅ Fast load time (< 3s)
- ✅ Responsive design
- ✅ Accessible (ARIA labels, keyboard navigation)

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

---

## Implementation Checklist

- [ ] Create UX spec document (this file)
- [ ] Create ChatShell component
- [ ] Create QuickActionChip component
- [ ] Create ToolCard base component
- [ ] Create MobilityMatchCard component
- [ ] Create ListingResultsCard component
- [ ] Create PaymentQRCard component
- [ ] Create ScannerResultCard component
- [ ] Create LocationStatusBar component
- [ ] Enhance LocationConsentModal component
- [ ] Update routing (default to ChatShell)
- [ ] Add left drawer navigation
- [ ] Implement localization scaffold
- [ ] Integrate Supabase Realtime
- [ ] Update MessageBubble for tool cards
- [ ] Test all user journeys
- [ ] Verify Lighthouse PWA score
- [ ] Test low-literacy design guidelines
- [ ] Test on various screen sizes

---

## References

- [Agent Architecture](./AGENT_ARCHITECTURE.md)
- [Tools Catalog](./TOOLS_CATALOG.md)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

