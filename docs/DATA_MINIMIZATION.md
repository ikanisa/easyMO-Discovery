# Data Minimization Notes - easyMO Discovery

**Date:** January 27, 2025

---

## Overview

easyMO Discovery follows data minimization principles: we only collect and store data necessary for core functionality.

---

## Data Collection Principles

### 1. Location Data

**Collected:** Only when user explicitly shares location  
**Stored:** Not stored beyond active session  
**Purpose:** Mobility matching, business search (geocoding)  
**Retention:** Cleared when user closes app or goes offline

**Implementation:**
- Location shared via browser Geolocation API (requires user permission)
- Used only for matching/search during active session
- Presence table stores location when driver online, cleared when offline
- No historical location tracking

---

### 2. Phone Numbers

**Collected:** Only if user chooses to share (optional)  
**Stored:** In user_profiles (if provided), marketplace_listings (if creating listing)  
**Purpose:** Contact matching users/businesses  
**Retention:** Until user removes or deletes account

**Implementation:**
- Phone numbers normalized to E.164 format
- Only displayed to matched users (mobility) or in public listings (marketplace)
- User can remove phone number from profile at any time

---

### 3. Conversations

**Collected:** Messages sent to AI agents  
**Stored:** In conversations and messages tables (encrypted, user-scoped)  
**Purpose:** Conversation continuity, AI context  
**Retention:** Until user deletes conversation or account

**Implementation:**
- Messages stored in Supabase (Row-Level Security ensures user isolation)
- User can delete conversations at any time
- No third-party access to conversations (except AI service for processing)

---

### 4. Roles

**Collected:** User-selected roles (passenger, driver, vendor)  
**Stored:** In user_roles table (many-to-many)  
**Purpose:** Multi-role support (user can be passenger + driver + vendor)  
**Retention:** Until user removes role or deletes account

**Implementation:**
- Users can activate/deactivate roles at any time
- No default roles (user chooses roles explicitly)
- Roles stored in user_roles table (flexible, no hard-coding)

---

### 5. Business Listings

**Collected:** Only if user creates marketplace listing  
**Stored:** In marketplace_listings table  
**Purpose:** Public marketplace display  
**Retention:** Until user removes listing or deletes account

**Implementation:**
- Listings are public (visible to all users when active)
- User controls listing visibility (status: active, sold, removed)
- User can edit/delete listings at any time

---

## Data Not Collected

- **Tracking Cookies:** We do not use tracking cookies or analytics for advertising
- **Browsing History:** We do not track browsing behavior
- **Device Identifiers:** We do not use device identifiers for tracking
- **Biometric Data:** We do not collect biometric data
- **Payment Information:** Payment QR codes are USSD format (no card/payment data stored)

---

## Data Sharing

### With Other Users

- **Mobility Matching:** Location shared only during active match (not stored)
- **Marketplace:** Public listings (user controls visibility)
- **Contact:** Phone numbers shared only when user chooses to contact

### With Third-Party Services

- **Google Maps/Gemini:** Used for geocoding/business search (API calls, no data storage)
- **Cloudflare:** Hosting (standard platform data)
- **Supabase:** Database (encrypted, user-scoped)

### No Data Sales

We do not sell user data to third parties.

---

## User Control

Users have full control over their data:

- **Delete Conversations:** User can delete conversations at any time
- **Remove Listings:** User can remove marketplace listings at any time
- **Deactivate Roles:** User can deactivate roles at any time
- **Revoke Location:** User can revoke location permission (device settings)
- **Delete Account:** User can delete account (all data removed)

---

## Security Measures

- **Encryption:** All data encrypted in transit (HTTPS) and at rest (Supabase)
- **Authentication:** Supabase Auth (industry-standard)
- **API Keys:** Never exposed to client (all AI calls go through secure backend)
- **Row-Level Security:** Database policies ensure user isolation

---

## Compliance

- **GDPR:** Data minimization, user rights, encryption
- **CCPA:** No sale of data, user rights
- **Regional Laws:** Compliance with Rwanda, Kenya, East Africa data protection laws

---

**END OF DATA MINIMIZATION NOTES**

