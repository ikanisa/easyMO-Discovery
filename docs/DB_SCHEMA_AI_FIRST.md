# Database Schema: AI-First Multi-Domain App

**Last Updated:** 2025-01-28  
**Migration:** `20250128_ai_first_schema.sql`

## Overview

This document describes the Supabase database schema for the easyMO Discovery app, designed for an AI-first architecture with support for mobility, marketplace, payments, and conversation tracking.

## Architecture Principles

1. **PostGIS for Location Data**: All geographical data uses PostGIS `GEOGRAPHY(POINT, 4326)` for accurate spatial queries
2. **Row Level Security (RLS)**: All tables have RLS enabled with granular policies
3. **Multi-Role Support**: Users can have multiple roles (passenger, driver, vendor, admin, staff)
4. **TTL-Based Expiration**: Presence and intents use `expires_at` for automatic cleanup
5. **RPC Functions for Security**: Sensitive queries (like nearby presence) are exposed via RPC functions only

## Entity Relationship Diagram

```
┌─────────────┐
│ auth.users  │
└──────┬──────┘
       │
       ├─────────────────────────────────────────────┐
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│user_profiles │                            │ user_roles  │
│              │                            │             │
│ user_id (PK) │                            │ user_id (FK) │
│ display_name │                            │ role         │
│ phone        │                            │ is_active    │
└──────────────┘                            └──────────────┘
       │                                             │
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│  presence    │                            │conversations │
│              │                            │              │
│ user_id (PK) │                            │ id (PK)      │
│ role         │                            │ user_id (FK) │
│ location     │                            │ agent_type   │
│ expires_at   │                            │ channel      │
└──────────────┘                            └──────┬───────┘
       │                                             │
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│ride_intents  │                            │   messages   │
│              │                            │              │
│ id (PK)      │                            │ id (PK)      │
│ passenger_id │                            │ conversation │
│ pickup_loc   │                            │ role         │
│ dropoff_loc  │                            │ content      │
│ status       │                            │ tool_call    │
└──────┬───────┘                            └──────────────┘
       │                                             │
       │                                             │
       ▼                                             ▼
┌──────────────┐                            ┌──────────────┐
│   matches    │                            │ tool_traces  │
│              │                            │              │
│ id (PK)      │                            │ id (PK)      │
│ intent_id    │                            │ conversation │
│ driver_id    │                            │ tool_name    │
│ score        │                            │ input/output │
│ status       │                            │ latency_ms   │
└──────────────┘                            └──────────────┘

┌──────────────┐                            ┌──────────────┐
│marketplace_ │                            │payment_      │
│listings     │                            │requests      │
│             │                            │              │
│ id (PK)     │                            │ id (PK)      │
│ vendor_id   │                            │ created_by   │
│ title       │                            │ amount       │
│ location    │                            │ qr_payload   │
│ status      │                            │ status       │
└──────────────┘                            └──────────────┘
```

## Tables

### 1. `user_profiles`

**Purpose:** Core user identity and profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → auth.users | User identifier |
| `display_name` | TEXT | | User's display name |
| `phone` | TEXT | | Phone number |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**RLS Policies:**
- ✅ Users can read their own profile
- ✅ Users can update their own profile
- ✅ Users can insert their own profile

**Indexes:**
- `idx_user_profiles_phone` (partial, WHERE phone IS NOT NULL)

---

### 2. `user_roles`

**Purpose:** Multi-role support (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → auth.users | User identifier |
| `role` | TEXT | PK, CHECK | Role: 'passenger', 'driver', 'vendor', 'admin', 'staff' |
| `is_active` | BOOLEAN | DEFAULT true | Whether role is active |
| `created_at` | TIMESTAMPTZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**RLS Policies:**
- ✅ Users can read their own roles
- ✅ Users can insert their own roles (except admin/staff)
- ✅ Users can update their own roles (except admin/staff)
- ✅ Users can delete their own roles (except admin/staff)
- ✅ Admins can manage all roles
- ✅ Staff can manage non-admin roles

**Indexes:**
- `idx_user_roles_user_id`
- `idx_user_roles_role`
- `idx_user_roles_active` (partial, WHERE is_active = true)

---

### 3. `presence`

**Purpose:** Real-time location tracking for matching.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → auth.users | User identifier |
| `role` | TEXT | NOT NULL, CHECK | Role: 'passenger', 'driver', 'vendor' |
| `lat` | DOUBLE PRECISION | NOT NULL | Latitude |
| `lng` | DOUBLE PRECISION | NOT NULL | Longitude |
| `location` | GEOGRAPHY(POINT, 4326) | NOT NULL | PostGIS point |
| `geohash` | TEXT | | Geohash for quick filtering |
| `is_online` | BOOLEAN | DEFAULT true, NOT NULL | Online status |
| `last_seen_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last activity |
| `expires_at` | TIMESTAMPTZ | NOT NULL | TTL expiration |
| `meta` | JSONB | DEFAULT '{}' | Additional metadata |

**RLS Policies:**
- ✅ Users can write their own presence
- ❌ **No direct SELECT policy** - Reads are restricted to RPC functions only

**Indexes:**
- `idx_presence_location` (GIST spatial index)
- `idx_presence_geohash` (partial, WHERE geohash IS NOT NULL)
- `idx_presence_role_online` (partial, WHERE is_online = true)
- `idx_presence_expires_at`

**Security Note:** Direct SELECT queries are blocked. Use `get_nearby_presence()` RPC function instead.

---

### 4. `ride_intents`

**Purpose:** Passenger ride requests for mobility matching.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Intent identifier |
| `passenger_id` | UUID | NOT NULL, FK → auth.users | Passenger user ID |
| `pickup_lat` | DOUBLE PRECISION | NOT NULL | Pickup latitude |
| `pickup_lng` | DOUBLE PRECISION | NOT NULL | Pickup longitude |
| `pickup_location` | GEOGRAPHY(POINT, 4326) | NOT NULL | Pickup PostGIS point |
| `pickup_address` | TEXT | | Pickup address text |
| `dropoff_lat` | DOUBLE PRECISION | | Dropoff latitude (nullable) |
| `dropoff_lng` | DOUBLE PRECISION | | Dropoff longitude (nullable) |
| `dropoff_location` | GEOGRAPHY(POINT, 4326) | | Dropoff PostGIS point |
| `dropoff_address` | TEXT | | Dropoff address text |
| `notes` | TEXT | | Additional notes |
| `status` | TEXT | DEFAULT 'pending', CHECK | Status: 'pending', 'matched', 'in_progress', 'completed', 'cancelled' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last update timestamp |
| `expires_at` | TIMESTAMPTZ | NOT NULL | TTL expiration |

**RLS Policies:**
- ✅ Passengers can manage their own intents
- ❌ **Drivers cannot directly read intents** - Use `create_match_candidates()` RPC function

**Indexes:**
- `idx_ride_intents_passenger_id`
- `idx_ride_intents_status`
- `idx_ride_intents_pickup_location` (GIST spatial index)
- `idx_ride_intents_expires_at`
- `idx_ride_intents_created_at` (DESC)

---

### 5. `matches`

**Purpose:** Driver-passenger matching results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Match identifier |
| `intent_id` | UUID | NOT NULL, FK → ride_intents | Related intent |
| `driver_id` | UUID | NOT NULL, FK → auth.users | Driver user ID |
| `score` | DOUBLE PRECISION | DEFAULT 0.0, NOT NULL | Match score (higher = better) |
| `eta_seconds` | INTEGER | | Estimated time of arrival |
| `distance_m` | DOUBLE PRECISION | | Distance in meters |
| `status` | TEXT | DEFAULT 'pending', CHECK | Status: 'pending', 'accepted', 'rejected', 'expired' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `expires_at` | TIMESTAMPTZ | NOT NULL | TTL expiration |
| UNIQUE(`intent_id`, `driver_id`) | | | One match per intent-driver pair |

**RLS Policies:**
- ✅ Passengers can view matches for their intents
- ✅ Drivers can view their own matches
- ✅ Passengers can update matches for their intents
- ✅ Drivers can update their own matches

**Indexes:**
- `idx_matches_intent_id`
- `idx_matches_driver_id`
- `idx_matches_status`
- `idx_matches_score` (DESC)
- `idx_matches_expires_at`

---

### 6. `marketplace_listings`

**Purpose:** Vendor product/service listings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Listing identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Vendor user ID |
| `title` | TEXT | NOT NULL | Listing title |
| `description` | TEXT | | Listing description |
| `category` | TEXT | | Category |
| `price` | NUMERIC | | Price |
| `currency` | TEXT | DEFAULT 'RWF' | Currency code |
| `images` | TEXT[] | DEFAULT '{}' | Array of image URLs |
| `location` | GEOGRAPHY(POINT, 4326) | | Location (optional) |
| `phone_number` | TEXT | | Contact phone |
| `status` | TEXT | DEFAULT 'active', CHECK | Status: 'active', 'sold', 'removed', 'pending' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last update timestamp |

**RLS Policies:**
- ✅ Public can view active listings
- ✅ Vendors can manage their own listings

**Indexes:**
- `idx_marketplace_listings_location` (GIST spatial index)
- `idx_marketplace_listings_user_id`
- `idx_marketplace_listings_category`
- `idx_marketplace_listings_status`

---

### 7. `payment_requests`

**Purpose:** Payment request tracking (MoMo QR codes, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Request identifier |
| `created_by` | UUID | NOT NULL, FK → auth.users | Creator user ID |
| `amount` | NUMERIC(12, 2) | NOT NULL | Payment amount |
| `currency` | TEXT | NOT NULL, DEFAULT 'RWF' | Currency code |
| `reference` | TEXT | UNIQUE | Payment reference |
| `qr_payload` | JSONB | | QR code payload |
| `status` | TEXT | DEFAULT 'pending', CHECK | Status: 'pending', 'paid', 'expired', 'cancelled' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `expires_at` | TIMESTAMPTZ | | Expiration timestamp |
| `paid_at` | TIMESTAMPTZ | | Payment timestamp |

**RLS Policies:**
- ✅ Users can view their own payment requests
- ✅ Users can create payment requests
- ✅ Users can update their own payment requests

**Indexes:**
- `idx_payment_requests_created_by`
- `idx_payment_requests_reference` (partial, WHERE reference IS NOT NULL)
- `idx_payment_requests_status`
- `idx_payment_requests_expires_at`

---

### 8. `conversations`

**Purpose:** AI conversation tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Conversation identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | User identifier |
| `agent_type` | TEXT | NOT NULL, CHECK | Agent: 'mobility', 'marketplace', 'payments', 'support', 'router' |
| `title` | TEXT | | Conversation title |
| `channel` | TEXT | DEFAULT 'chat', CHECK | Channel: 'chat', 'voice', 'whatsapp' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Last update timestamp |

**RLS Policies:**
- ✅ Users can view their own conversations
- ✅ Users can insert their own conversations
- ✅ Users can update their own conversations
- ✅ Users can delete their own conversations

**Indexes:**
- `idx_conversations_user_id`
- `idx_conversations_updated_at` (DESC)

---

### 9. `messages`

**Purpose:** Messages within conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Message identifier |
| `conversation_id` | UUID | NOT NULL, FK → conversations | Conversation identifier |
| `role` | TEXT | NOT NULL, CHECK | Role: 'user', 'assistant', 'system' |
| `content` | TEXT | NOT NULL | Message content |
| `tool_call` | JSONB | | Tool call data (if applicable) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |

**RLS Policies:**
- ✅ Users can view messages in their conversations
- ✅ Users can insert messages in their conversations

**Indexes:**
- `idx_messages_conversation_id`
- `idx_messages_created_at`

---

### 10. `tool_traces`

**Purpose:** AI tool execution tracking for observability.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Trace identifier |
| `conversation_id` | UUID | FK → conversations | Related conversation |
| `tool_name` | TEXT | NOT NULL | Tool name |
| `input` | JSONB | NOT NULL | Tool input |
| `output` | JSONB | | Tool output |
| `latency_ms` | INTEGER | | Execution latency |
| `ok` | BOOLEAN | DEFAULT true | Success status |
| `error_message` | TEXT | | Error message (if failed) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Creation timestamp |

**RLS Policies:**
- ✅ Users can view traces for their conversations
- ✅ Admins can view all traces

**Indexes:**
- `idx_tool_traces_conversation_id`
- `idx_tool_traces_tool_name`
- `idx_tool_traces_created_at` (DESC)
- `idx_tool_traces_ok`

---

## RPC Functions

### `get_nearby_presence(role, lat, lng, radius_m, limit)`

**Purpose:** Get nearby presence entries for matching (replaces direct SELECT queries).

**Parameters:**
- `p_role` (TEXT): Role filter ('passenger', 'driver', 'vendor')
- `p_lat` (DOUBLE PRECISION): Center latitude
- `p_lng` (DOUBLE PRECISION): Center longitude
- `p_radius_m` (DOUBLE PRECISION, DEFAULT 5000): Search radius in meters
- `p_limit` (INTEGER, DEFAULT 50): Maximum results

**Returns:** Table with `user_id`, `role`, `lat`, `lng`, `distance_m`, `is_online`, `last_seen_at`, `meta`

**Security:** `SECURITY DEFINER` - Executes with function creator's privileges, but RLS still applies.

**Usage:**
```sql
SELECT * FROM get_nearby_presence('driver', -1.9441, 30.0619, 5000, 10);
```

---

### `create_or_refresh_presence(user_id, role, lat, lng, is_online, ttl_seconds, meta)`

**Purpose:** Create or update presence entry with automatic expiration.

**Parameters:**
- `p_user_id` (UUID): User identifier
- `p_role` (TEXT): Role
- `p_lat` (DOUBLE PRECISION): Latitude
- `p_lng` (DOUBLE PRECISION): Longitude
- `p_is_online` (BOOLEAN, DEFAULT true): Online status
- `p_ttl_seconds` (INTEGER, DEFAULT 3600): Time-to-live in seconds
- `p_meta` (JSONB, DEFAULT '{}'): Additional metadata

**Returns:** UUID (user_id)

**Security:** `SECURITY DEFINER` - Validates that `p_user_id` matches `auth.uid()`.

**Usage:**
```sql
SELECT create_or_refresh_presence(
  auth.uid(),
  'driver',
  -1.9441,
  30.0619,
  true,
  3600,
  '{"vehicle_type": "moto"}'::jsonb
);
```

---

### `expire_stale_presence()`

**Purpose:** Mark expired presence entries as offline (cleanup function).

**Returns:** INTEGER (number of rows updated)

**Security:** `SECURITY DEFINER` - Safe to call from scheduled tasks.

**Usage:**
```sql
SELECT expire_stale_presence();
```

**Note:** Can be scheduled via `pg_cron` (requires superuser):
```sql
SELECT cron.schedule('expire-stale-presence', '*/5 * * * *', 'SELECT expire_stale_presence();');
```

---

### `create_match_candidates(intent_id, limit_candidates)`

**Purpose:** Create match candidates for a ride intent (driver-passenger matching).

**Parameters:**
- `p_intent_id` (UUID): Ride intent identifier
- `p_limit_candidates` (INTEGER, DEFAULT 10): Maximum candidates to create

**Returns:** Table with `match_id`, `driver_id`, `score`, `eta_seconds`, `distance_m`

**Security:** `SECURITY DEFINER` - Validates that the intent belongs to `auth.uid()`.

**Usage:**
```sql
SELECT * FROM create_match_candidates('...intent-id...', 10);
```

**Algorithm:**
1. Finds nearby drivers via `get_nearby_presence()`
2. Calculates score based on distance (inverse distance)
3. Estimates ETA (assumes 30 km/h average speed)
4. Creates match entries with 5-minute expiration
5. Updates intent status to 'matched'

---

## Row Level Security (RLS) Summary

| Table | Read Policy | Write Policy | Notes |
|-------|-------------|--------------|-------|
| `user_profiles` | Own records | Own records | Standard user ownership |
| `user_roles` | Own roles | Own roles (except admin/staff) | Admins/staff can manage all |
| `presence` | **RPC only** | Own presence | No direct SELECT - use `get_nearby_presence()` |
| `ride_intents` | Own intents | Own intents | Drivers see via `create_match_candidates()` |
| `matches` | Own matches + intent owner | Own matches | Both passenger and driver can view |
| `marketplace_listings` | Active listings (public) | Own listings | Public read for active only |
| `payment_requests` | Own requests | Own requests | Standard user ownership |
| `conversations` | Own conversations | Own conversations | Standard user ownership |
| `messages` | Own conversations | Own conversations | Via conversation ownership |
| `tool_traces` | Own traces + admin | None (insert only) | Admins can view all |

## Migration Notes

### Existing Tables

The migration handles existing tables gracefully:

- **`trip_intents`** → Renamed to `ride_intents` (if exists)
- **`user_profiles`** → Columns added if missing (no data loss)
- **`presence`** → Columns added if missing (lat/lng extracted from location)
- **`conversations`/`messages`** → Updated with new columns

### PostGIS Extension

PostGIS is required for spatial queries. The migration enables it automatically:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Geohash

The `presence` table includes a `geohash` column for quick filtering. Currently uses a simple grid-based hash. Can be enhanced with a proper geohash library if needed.

### TTL Expiration

Several tables use `expires_at` for automatic cleanup:
- `presence` - Default 1 hour
- `ride_intents` - Default 1 hour
- `matches` - Default 5 minutes

Use `expire_stale_presence()` function or scheduled tasks to clean up expired entries.

## Best Practices

1. **Always use RPC functions** for presence queries (never direct SELECT)
2. **Set appropriate TTLs** when creating presence/intents
3. **Use spatial indexes** for location-based queries
4. **Monitor tool_traces** for AI observability
5. **Schedule cleanup tasks** for expired entries

## Future Enhancements

- [ ] Proper geohash implementation (library-based)
- [ ] Vector embeddings for semantic search
- [ ] Full-text search indexes for listings
- [ ] Realtime subscriptions for presence/matches
- [ ] Audit logging table
- [ ] Rate limiting table

