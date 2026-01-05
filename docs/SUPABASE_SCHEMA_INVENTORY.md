# Supabase Schema Inventory

**Date:** 2025-01-27  
**Purpose:** Complete inventory of existing Supabase tables, functions, triggers, and realtime usage to avoid duplicates when implementing WhatsApp broadcast.

---

## 1. Existing Tables

### 1.1 User & Profile Tables

#### `user_profiles`
- **Primary Key:** `user_id` (UUID, FK to `auth.users`)
- **Columns:**
  - `user_id` UUID PRIMARY KEY
  - `display_name` TEXT
  - `phone` TEXT (also exists as `phone_number` in some migrations)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
  - `default_role` TEXT (legacy, for backward compatibility)
  - `vehicle_type` TEXT
  - `verified` BOOLEAN
  - `rating` NUMERIC
  - `total_trips` INTEGER
  - `total_earnings` NUMERIC
  - `settings` JSONB
- **Indexes:**
  - `idx_user_profiles_phone` ON `phone` WHERE `phone IS NOT NULL`
- **RLS Policies:**
  - "Users can read own profile" (SELECT, `auth.uid() = user_id`)
  - "Users can update own profile" (UPDATE, `auth.uid() = user_id`)
  - "Users can insert own profile" (INSERT, `auth.uid() = user_id`)
- **Triggers:**
  - `update_user_profiles_updated_at` (BEFORE UPDATE, calls `update_updated_at_column()`)
- **Source:** `20250128_ai_first_schema.sql:23-64`

#### `user_roles`
- **Primary Key:** `(user_id, role)` composite
- **Columns:**
  - `user_id` UUID NOT NULL (FK to `auth.users`)
  - `role` TEXT NOT NULL CHECK (`role IN ('passenger', 'driver', 'vendor', 'admin', 'staff')`)
  - `is_active` BOOLEAN DEFAULT true
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_user_roles_user_id` ON `user_id`
  - `idx_user_roles_role` ON `role`
  - `idx_user_roles_active` ON `(user_id, is_active)` WHERE `is_active = true`
- **RLS Policies:**
  - "Users can read own roles" (SELECT)
  - "Users can insert own roles" (INSERT, except admin/staff)
  - "Users can update own roles" (UPDATE, except admin/staff)
  - "Users can delete own roles" (DELETE, except admin/staff)
  - "Admins can manage all roles" (ALL)
  - "Staff can manage roles" (ALL, except admin role)
- **Triggers:**
  - `user_roles_updated_at_trigger` (BEFORE UPDATE, calls `update_user_roles_updated_at()`)
- **Source:** `20250127_multi_role_support.sql:8-172`, `20250128_ai_first_schema.sql:90-182`

#### `profiles` (VIEW)
- **Type:** View (shim for frontend compatibility)
- **Definition:** SELECT from `user_profiles` with column aliases (`user_id AS id`, `phone_number AS phone`, etc.)
- **Trigger:** `profiles_upsert_trigger` (INSTEAD OF INSERT/UPDATE, calls `profiles_upsert_fn()`)
- **Source:** `20250127_multi_role_support.sql:86-103`, `20250305_secure_rds_and_profiles.sql:45-92`

### 1.2 Presence & Location Tables

#### `presence`
- **Primary Key:** `user_id` (UUID, FK to `auth.users`)
- **Columns:**
  - `user_id` UUID PRIMARY KEY
  - `role` TEXT NOT NULL CHECK (`role IN ('passenger', 'driver', 'vendor')`)
  - `lat` DOUBLE PRECISION NOT NULL
  - `lng` DOUBLE PRECISION NOT NULL
  - `location` GEOGRAPHY(POINT, 4326) NOT NULL
  - `geohash` TEXT
  - `is_online` BOOLEAN DEFAULT true
  - `last_seen_at` TIMESTAMPTZ DEFAULT NOW()
  - `expires_at` TIMESTAMPTZ NOT NULL
  - `meta` JSONB DEFAULT '{}'
- **Indexes:**
  - `idx_presence_location` USING GIST(`location`)
  - `idx_presence_geohash` ON `geohash` WHERE `geohash IS NOT NULL`
  - `idx_presence_role_online` ON `(role, is_online)` WHERE `is_online = true`
  - `idx_presence_expires_at` ON `expires_at`
- **RLS Policies:**
  - "Users can write own presence" (ALL, `auth.uid() = user_id`)
  - Note: Reads are restricted to RPC functions only (no direct SELECT policy)
- **Source:** `20250128_ai_first_schema.sql:188-272`, `20251222_fix_presence_rls.sql`

#### `presence_realtime` (VIEW)
- **Type:** View (sanitized coordinates for realtime)
- **Definition:** SELECT from `presence` with rounded coordinates (`ROUND(lat::numeric, 3) AS lat_approx`)
- **Purpose:** Realtime subscription with privacy (coordinates rounded to ~100m)
- **Source:** `20250129_realtime_presence_ttl.sql:442-458`

### 1.3 Mobility Tables

#### `ride_intents` (formerly `trip_intents`)
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `passenger_id` UUID NOT NULL (FK to `auth.users`, was `user_id` in older migrations)
  - `pickup_lat` DOUBLE PRECISION NOT NULL
  - `pickup_lng` DOUBLE PRECISION NOT NULL
  - `pickup_location` GEOGRAPHY(POINT, 4326) NOT NULL
  - `pickup_address` TEXT
  - `dropoff_lat` DOUBLE PRECISION
  - `dropoff_lng` DOUBLE PRECISION
  - `dropoff_location` GEOGRAPHY(POINT, 4326)
  - `dropoff_address` TEXT
  - `notes` TEXT
  - `status` TEXT DEFAULT 'pending' CHECK (`status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
  - `expires_at` TIMESTAMPTZ NOT NULL
- **Indexes:**
  - `idx_ride_intents_passenger_id` ON `passenger_id`
  - `idx_ride_intents_status` ON `status`
  - `idx_ride_intents_pickup_location` USING GIST(`pickup_location`)
  - `idx_ride_intents_expires_at` ON `expires_at`
  - `idx_ride_intents_created_at` ON `created_at DESC`
- **RLS Policies:**
  - "Passengers can manage own intents" (ALL, `auth.uid() = passenger_id`)
- **Triggers:**
  - `update_ride_intents_updated_at` (BEFORE UPDATE, calls `update_updated_at_column()`)
- **Source:** `20250127_conversations_messages.sql:37-48` (as `trip_intents`), `20250128_ai_first_schema.sql:277-396` (renamed to `ride_intents`)

#### `ride_intents_realtime` (VIEW)
- **Type:** View (sanitized coordinates for realtime)
- **Definition:** SELECT from `ride_intents` with rounded coordinates, filtered to `status = 'pending' AND expires_at > NOW()`
- **Purpose:** Realtime subscription for drivers to see nearby ride requests
- **Source:** `20250129_realtime_presence_ttl.sql:461-482`

#### `matches`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `intent_id` UUID NOT NULL (FK to `ride_intents`)
  - `driver_id` UUID NOT NULL (FK to `auth.users`)
  - `score` DOUBLE PRECISION DEFAULT 0.0
  - `eta_seconds` INTEGER
  - `distance_m` DOUBLE PRECISION
  - `status` TEXT DEFAULT 'pending' CHECK (`status IN ('pending', 'accepted', 'rejected', 'expired')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `expires_at` TIMESTAMPTZ NOT NULL
  - UNIQUE(`intent_id`, `driver_id`)
- **Indexes:**
  - `idx_matches_intent_id` ON `intent_id`
  - `idx_matches_driver_id` ON `driver_id`
  - `idx_matches_status` ON `status`
  - `idx_matches_score` ON `score DESC`
  - `idx_matches_expires_at` ON `expires_at`
- **RLS Policies:**
  - "Passengers can view matches for own intents" (SELECT)
  - "Drivers can view own matches" (SELECT, `auth.uid() = driver_id`)
  - "Passengers can update matches for own intents" (UPDATE)
  - "Drivers can update own matches" (UPDATE, `auth.uid() = driver_id`)
- **Source:** `20250128_ai_first_schema.sql:403-460`

### 1.4 Marketplace Tables

#### `marketplace_listings`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL (FK to `auth.users`)
  - `title` TEXT NOT NULL
  - `description` TEXT
  - `category` TEXT
  - `price` NUMERIC
  - `currency` TEXT DEFAULT 'RWF'
  - `location` GEOGRAPHY(POINT, 4326)
  - `phone_number` TEXT
  - `images` TEXT[] DEFAULT '{}'
  - `status` TEXT DEFAULT 'active' CHECK (`status IN ('active', 'sold', 'removed', 'pending')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_marketplace_listings_location` USING GIST(`location`)
  - `idx_marketplace_listings_user_id` ON `user_id`
  - `idx_marketplace_listings_category` ON `category`
  - `idx_marketplace_listings_status` ON `status`
- **RLS Policies:**
  - "Public can view active listings" (SELECT, `status = 'active'`)
  - "Vendors can manage own listings" (ALL, `auth.uid() = user_id`)
- **Triggers:**
  - `update_marketplace_listings_updated_at` (BEFORE UPDATE, calls `update_updated_at_column()`)
- **Source:** `20250127_conversations_messages.sql:56-75`, `20250128_ai_first_schema.sql:465-497`

### 1.5 Broadcast Tables (EXISTING)

#### `broadcasts`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `request_id` TEXT UNIQUE NOT NULL
  - `need_description` TEXT
  - `location_label` TEXT
  - `target_count` INTEGER DEFAULT 0
  - `status` TEXT DEFAULT 'queued' CHECK (`status IN ('queued', 'sending', 'completed', 'failed')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_broadcasts_request_id` ON `request_id`
  - `idx_broadcasts_status` ON `status`
- **RLS Policies:**
  - "service_role_broadcasts_all" (ALL, TO service_role)
  - "authenticated_broadcasts_select" (SELECT, TO authenticated)
  - Note: anon role has REVOKE ALL
- **Source:** `20241219_broadcast_tables.sql:8-21`

#### `broadcast_responses`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `request_id` TEXT NOT NULL (FK to `broadcasts.request_id`)
  - `business_name` TEXT NOT NULL
  - `business_phone` TEXT NOT NULL
  - `item_found` TEXT
  - `response_type` TEXT DEFAULT 'available' CHECK (`response_type IN ('available', 'unavailable', 'pending')`)
  - `responded_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_broadcast_responses_request_id` ON `request_id`
- **RLS Policies:**
  - "service_role_broadcast_responses_all" (ALL, TO service_role)
  - "authenticated_broadcast_responses_select" (SELECT, TO authenticated)
  - Note: anon role has REVOKE ALL
- **Source:** `20241219_broadcast_tables.sql:24-35`

### 1.6 Conversation & Message Tables

#### `conversations`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL (FK to `auth.users`)
  - `agent_type` TEXT NOT NULL CHECK (`agent_type IN ('mobility', 'marketplace', 'payments', 'support', 'router')`)
  - `title` TEXT
  - `channel` TEXT DEFAULT 'chat' CHECK (`channel IN ('chat', 'voice', 'whatsapp')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_conversations_user_id` ON `user_id`
  - `idx_conversations_updated_at` ON `updated_at DESC`
- **RLS Policies:**
  - "Users can view own conversations" (SELECT)
  - "Users can insert own conversations" (INSERT)
  - "Users can update own conversations" (UPDATE)
  - "Users can delete own conversations" (DELETE)
- **Triggers:**
  - `update_conversations_updated_at` (BEFORE UPDATE, calls `update_updated_at_column()`)
- **Source:** `20250127_conversations_messages.sql:8-19`, `20250128_ai_first_schema.sql:540-550`

#### `messages`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `conversation_id` UUID NOT NULL (FK to `conversations`)
  - `role` TEXT NOT NULL CHECK (`role IN ('user', 'assistant', 'system')`)
  - `content` TEXT NOT NULL
  - `tool_call` JSONB (was `tool_calls` in older migrations)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_messages_conversation_id` ON `conversation_id`
  - `idx_messages_created_at` ON `created_at`
- **RLS Policies:**
  - "Users can view own messages" (SELECT, via conversation ownership)
  - "Users can insert own messages" (INSERT, via conversation ownership)
- **Source:** `20250127_conversations_messages.sql:22-34`, `20250128_ai_first_schema.sql:556-581`

### 1.7 Payment Tables

#### `payment_requests`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `created_by` UUID NOT NULL (FK to `auth.users`)
  - `amount` NUMERIC(12, 2) NOT NULL
  - `currency` TEXT DEFAULT 'RWF'
  - `reference` TEXT UNIQUE
  - `qr_payload` JSONB
  - `status` TEXT DEFAULT 'pending' CHECK (`status IN ('pending', 'paid', 'expired', 'cancelled')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `expires_at` TIMESTAMPTZ
  - `paid_at` TIMESTAMPTZ
- **Indexes:**
  - `idx_payment_requests_created_by` ON `created_by`
  - `idx_payment_requests_reference` ON `reference` WHERE `reference IS NOT NULL`
  - `idx_payment_requests_status` ON `status`
  - `idx_payment_requests_expires_at` ON `expires_at`
- **RLS Policies:**
  - "Users can view own payment requests" (SELECT)
  - "Users can create payment requests" (INSERT)
  - "Users can update own payment requests" (UPDATE)
- **Source:** `20250128_ai_first_schema.sql:502-538`

### 1.8 Tool Tracking Tables

#### `tool_traces`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `conversation_id` UUID (FK to `conversations`)
  - `tool_name` TEXT NOT NULL
  - `input` JSONB NOT NULL
  - `output` JSONB
  - `latency_ms` INTEGER
  - `ok` BOOLEAN DEFAULT true
  - `error_message` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
- **Indexes:**
  - `idx_tool_traces_conversation_id` ON `conversation_id`
  - `idx_tool_traces_tool_name` ON `tool_name`
  - `idx_tool_traces_created_at` ON `created_at DESC`
  - `idx_tool_traces_ok` ON `ok`
- **RLS Policies:**
  - "Users can view own tool traces" (SELECT, via conversation ownership)
  - "Admins can view all tool traces" (SELECT, admin role check)
- **Source:** `20250128_ai_first_schema.sql:587-633`

### 1.9 Rate Limiting & Abuse Tables

#### `rate_limits`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` UUID NOT NULL (FK to `auth.users`)
  - `resource_type` TEXT NOT NULL
  - `count` INTEGER DEFAULT 1
  - `window_start` TIMESTAMPTZ DEFAULT NOW()
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - UNIQUE(`user_id`, `resource_type`, `window_start`)
- **Indexes:**
  - `idx_rate_limits_user_resource` ON `(user_id, resource_type)`
  - `idx_rate_limits_window_start` ON `window_start`
- **RLS Policies:**
  - "Users can view own rate limits" (SELECT)
  - Note: INSERT/UPDATE via SECURITY DEFINER functions only
- **Source:** `20250129_realtime_presence_ttl.sql:146-173`

#### `abuse_reports`
- **Primary Key:** `id` (UUID)
- **Columns:**
  - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `reporter_id` UUID NOT NULL (FK to `auth.users`)
  - `reported_user_id` UUID (FK to `auth.users`)
  - `resource_type` TEXT NOT NULL
  - `resource_id` UUID
  - `reason` TEXT NOT NULL
  - `details` TEXT
  - `status` TEXT DEFAULT 'pending' CHECK (`status IN ('pending', 'reviewed', 'resolved', 'dismissed')`)
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `reviewed_at` TIMESTAMPTZ
  - `reviewed_by` UUID (FK to `auth.users`)
- **Indexes:**
  - `idx_abuse_reports_reporter` ON `reporter_id`
  - `idx_abuse_reports_reported_user` ON `reported_user_id`
  - `idx_abuse_reports_status` ON `status`
  - `idx_abuse_reports_created_at` ON `created_at DESC`
- **RLS Policies:**
  - "Users can create abuse reports" (INSERT)
  - "Users can view own reports" (SELECT)
  - "Admins can view all reports" (SELECT)
- **Source:** `20250129_realtime_presence_ttl.sql:238-284`

### 1.10 Legacy/Unused Tables (Referenced in Code but May Not Exist)

The following tables are referenced in `20250305_secure_rds_and_profiles.sql` but may not exist in all environments:
- `whatsapp_webhook_events`
- `whatsapp_messages`
- `whatsapp_threads`
- `leads`
- `lead_state_events`
- `vendor_responses`
- `vendors`

**Note:** These tables are secured with service_role-only access in the migration, but their schemas are not defined in the migrations reviewed. They may be legacy or created elsewhere.

---

## 2. Existing RLS Policies Summary

### Policies by Table

| Table | Policy Name | Operation | Role | Condition |
|-------|-------------|-----------|------|-----------|
| `user_profiles` | "Users can read own profile" | SELECT | authenticated | `auth.uid() = user_id` |
| `user_profiles` | "Users can update own profile" | UPDATE | authenticated | `auth.uid() = user_id` |
| `user_profiles` | "Users can insert own profile" | INSERT | authenticated | `auth.uid() = user_id` |
| `user_roles` | "Users can read own roles" | SELECT | authenticated | `auth.uid() = user_id` |
| `user_roles` | "Users can insert own roles" | INSERT | authenticated | `auth.uid() = user_id AND role NOT IN ('admin', 'staff')` |
| `user_roles` | "Users can update own roles" | UPDATE | authenticated | `auth.uid() = user_id AND role NOT IN ('admin', 'staff')` |
| `user_roles` | "Users can delete own roles" | DELETE | authenticated | `auth.uid() = user_id AND role NOT IN ('admin', 'staff')` |
| `user_roles` | "Admins can manage all roles" | ALL | authenticated | Admin role check |
| `user_roles` | "Staff can manage roles" | ALL | authenticated | Staff role check, except admin |
| `presence` | "Users can write own presence" | ALL | authenticated | `auth.uid() = user_id` |
| `ride_intents` | "Passengers can manage own intents" | ALL | authenticated | `auth.uid() = passenger_id` |
| `matches` | "Passengers can view matches for own intents" | SELECT | authenticated | Via intent ownership |
| `matches` | "Drivers can view own matches" | SELECT | authenticated | `auth.uid() = driver_id` |
| `matches` | "Passengers can update matches for own intents" | UPDATE | authenticated | Via intent ownership |
| `matches` | "Drivers can update own matches" | UPDATE | authenticated | `auth.uid() = driver_id` |
| `marketplace_listings` | "Public can view active listings" | SELECT | authenticated | `status = 'active'` |
| `marketplace_listings` | "Vendors can manage own listings" | ALL | authenticated | `auth.uid() = user_id` |
| `broadcasts` | "service_role_broadcasts_all" | ALL | service_role | `true` |
| `broadcasts` | "authenticated_broadcasts_select" | SELECT | authenticated | `true` |
| `broadcast_responses` | "service_role_broadcast_responses_all" | ALL | service_role | `true` |
| `broadcast_responses` | "authenticated_broadcast_responses_select" | SELECT | authenticated | `true` |
| `conversations` | "Users can view own conversations" | SELECT | authenticated | `auth.uid() = user_id` |
| `conversations` | "Users can insert own conversations" | INSERT | authenticated | `auth.uid() = user_id` |
| `conversations` | "Users can update own conversations" | UPDATE | authenticated | `auth.uid() = user_id` |
| `conversations` | "Users can delete own conversations" | DELETE | authenticated | `auth.uid() = user_id` |
| `messages` | "Users can view own messages" | SELECT | authenticated | Via conversation ownership |
| `messages` | "Users can insert own messages" | INSERT | authenticated | Via conversation ownership |
| `payment_requests` | "Users can view own payment requests" | SELECT | authenticated | `auth.uid() = created_by` |
| `payment_requests` | "Users can create payment requests" | INSERT | authenticated | `auth.uid() = created_by` |
| `payment_requests` | "Users can update own payment requests" | UPDATE | authenticated | `auth.uid() = created_by` |
| `tool_traces` | "Users can view own tool traces" | SELECT | authenticated | Via conversation ownership |
| `tool_traces` | "Admins can view all tool traces" | SELECT | authenticated | Admin role check |
| `rate_limits` | "Users can view own rate limits" | SELECT | authenticated | `auth.uid() = user_id` |
| `abuse_reports` | "Users can create abuse reports" | INSERT | authenticated | `auth.uid() = reporter_id` |
| `abuse_reports` | "Users can view own reports" | SELECT | authenticated | `auth.uid() = reporter_id` |
| `abuse_reports` | "Admins can view all reports" | SELECT | authenticated | Admin role check |

---

## 3. Existing Postgres Functions

### 3.1 User & Profile Functions

#### `get_user_roles(p_user_id UUID)`
- **Returns:** `TEXT[]`
- **Purpose:** Get active roles for a user
- **Security:** SECURITY DEFINER
- **Source:** `20250127_multi_role_support.sql:65-70`

#### `user_has_role(p_user_id UUID, p_role TEXT)`
- **Returns:** `BOOLEAN`
- **Purpose:** Check if user has a specific role
- **Security:** SECURITY DEFINER
- **Source:** `20250127_multi_role_support.sql:73-81`

#### `profiles_upsert_fn()`
- **Returns:** `TRIGGER`
- **Purpose:** Handle INSERT/UPDATE on `profiles` view, syncs to `user_profiles` and `user_roles`
- **Security:** SECURITY DEFINER
- **Source:** `20250127_multi_role_support.sql:107-149`, `20250305_secure_rds_and_profiles.sql:62-83`

#### `update_updated_at_column()`
- **Returns:** `TRIGGER`
- **Purpose:** Generic function to update `updated_at` timestamp
- **Security:** Standard
- **Source:** `20250127_conversations_messages.sql:161-167`, `20250128_ai_first_schema.sql:639-645`

#### `update_user_roles_updated_at()`
- **Returns:** `TRIGGER`
- **Purpose:** Update `updated_at` for `user_roles`
- **Security:** Standard
- **Source:** `20250127_multi_role_support.sql:152-158`

### 3.2 Presence Functions

#### `get_nearby_presence(p_role TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_radius_m DOUBLE PRECISION DEFAULT 5000, p_limit INTEGER DEFAULT 50)`
- **Returns:** TABLE (user_id, role, lat, lng, distance_m, is_online, last_seen_at, meta)
- **Purpose:** Find nearby presence entries within radius
- **Security:** SECURITY DEFINER
- **Tables Used:** `presence`
- **Source:** `20250128_ai_first_schema.sql:679-725`

#### `create_or_refresh_presence(p_user_id UUID, p_role TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_is_online BOOLEAN DEFAULT true, p_ttl_seconds INTEGER DEFAULT 900, p_meta JSONB DEFAULT '{}')`
- **Returns:** `UUID`
- **Purpose:** Create or update presence with rate limiting (10s minimum interval) and TTL
- **Security:** SECURITY DEFINER
- **Tables Used:** `presence`
- **Source:** `20250128_ai_first_schema.sql:729-781`, `20250129_realtime_presence_ttl.sql:12-76`

#### `expire_stale_presence()`
- **Returns:** `INTEGER` (count of expired entries)
- **Purpose:** Mark expired presence as offline, delete entries older than 24h
- **Security:** SECURITY DEFINER
- **Tables Used:** `presence`
- **Source:** `20250128_ai_first_schema.sql:785-801`, `20250129_realtime_presence_ttl.sql:83-105`

### 3.3 Mobility Functions

#### `create_match_candidates(p_intent_id UUID, p_limit_candidates INTEGER DEFAULT 10)`
- **Returns:** TABLE (match_id, driver_id, score, eta_seconds, distance_m)
- **Purpose:** Create match candidates for a ride intent
- **Security:** SECURITY DEFINER
- **Tables Used:** `ride_intents`, `presence`, `matches`
- **Source:** `20250128_ai_first_schema.sql:805-892`

#### `create_ride_intent_safe(p_passenger_id UUID, p_pickup_lat DOUBLE PRECISION, p_pickup_lng DOUBLE PRECISION, p_pickup_address TEXT DEFAULT NULL, p_dropoff_lat DOUBLE PRECISION DEFAULT NULL, p_dropoff_lng DOUBLE PRECISION DEFAULT NULL, p_dropoff_address TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL, p_ttl_seconds INTEGER DEFAULT 900)`
- **Returns:** `UUID` (intent_id)
- **Purpose:** Create ride intent with rate limiting (max 5 per 10 minutes)
- **Security:** SECURITY DEFINER
- **Tables Used:** `ride_intents`, `rate_limits`
- **Source:** `20250129_realtime_presence_ttl.sql:290-351`

#### `get_nearby_ride_intents(p_driver_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_radius_m DOUBLE PRECISION DEFAULT 10000, p_limit INTEGER DEFAULT 20)`
- **Returns:** TABLE (intent_id, passenger_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, notes, distance_m, created_at, expires_at)
- **Purpose:** Get nearby ride intents for drivers with throttling (max 20 queries per minute)
- **Security:** SECURITY DEFINER
- **Tables Used:** `ride_intents`, `rate_limits`
- **Source:** `20250129_realtime_presence_ttl.sql:361-432`

#### `expire_stale_ride_intents()`
- **Returns:** `INTEGER` (count of expired intents)
- **Purpose:** Mark expired intents as cancelled, delete old cancelled/completed (older than 7 days)
- **Security:** SECURITY DEFINER
- **Tables Used:** `ride_intents`
- **Source:** `20250129_realtime_presence_ttl.sql:112-136`

### 3.4 Rate Limiting Functions

#### `check_rate_limit(p_user_id UUID, p_resource_type TEXT, p_max_count INTEGER, p_window_seconds INTEGER)`
- **Returns:** `BOOLEAN`
- **Purpose:** Check and increment rate limit, returns false if exceeded
- **Security:** SECURITY DEFINER
- **Tables Used:** `rate_limits`
- **Source:** `20250129_realtime_presence_ttl.sql:179-210`

#### `cleanup_rate_limits()`
- **Returns:** `INTEGER` (count of deleted entries)
- **Purpose:** Delete rate limit entries older than 1 hour
- **Security:** SECURITY DEFINER
- **Tables Used:** `rate_limits`
- **Source:** `20250129_realtime_presence_ttl.sql:213-228`

---

## 4. Existing Triggers

| Trigger Name | Table | Event | Function | Source |
|--------------|-------|-------|----------|--------|
| `update_user_profiles_updated_at` | `user_profiles` | BEFORE UPDATE | `update_updated_at_column()` | `20250128_ai_first_schema.sql:648-651` |
| `update_user_roles_updated_at` | `user_roles` | BEFORE UPDATE | `update_user_roles_updated_at()` | `20250127_multi_role_support.sql:161-164`, `20250128_ai_first_schema.sql:653-656` |
| `update_ride_intents_updated_at` | `ride_intents` | BEFORE UPDATE | `update_updated_at_column()` | `20250128_ai_first_schema.sql:658-661` |
| `update_conversations_updated_at` | `conversations` | BEFORE UPDATE | `update_updated_at_column()` | `20250127_conversations_messages.sql:171-174`, `20250128_ai_first_schema.sql:663-666` |
| `update_marketplace_listings_updated_at` | `marketplace_listings` | BEFORE UPDATE | `update_updated_at_column()` | `20250127_conversations_messages.sql:183-186`, `20250128_ai_first_schema.sql:668-671` |
| `profiles_upsert_trigger` | `profiles` (VIEW) | INSTEAD OF INSERT/UPDATE | `profiles_upsert_fn()` | `20250305_secure_rds_and_profiles.sql:86-88` |

---

## 5. Existing Edge Functions

| Function Name | File | Tables Used | Purpose |
|---------------|------|-------------|---------|
| `whatsapp-broadcast` | `supabase/functions/whatsapp-broadcast/index.ts` | `broadcasts`, `broadcast_responses` | Send WhatsApp broadcast to businesses, log responses |
| `whatsapp-status` | `supabase/functions/whatsapp-status/index.ts` | (unknown, file not reviewed) | Handle WhatsApp status webhooks |
| `cleanup-presence` | `supabase/functions/cleanup-presence/index.ts` | `presence` | Cleanup expired presence entries |
| `cleanup-ride-intents` | `supabase/functions/cleanup-ride-intents/index.ts` | `ride_intents` | Cleanup expired ride intents |
| `cleanup-rate-limits` | `supabase/functions/cleanup-rate-limits/index.ts` | `rate_limits` | Cleanup old rate limit entries |
| `log-request` | `supabase/functions/log-request/index.ts` | `request_logs` | Log API requests (table may not exist) |
| `chat-gemini` | `supabase/functions/chat-gemini/index.ts` | (unknown, file not reviewed) | Legacy Gemini chat integration |

---

## 6. Existing Realtime Usage

### 6.1 Realtime Views

#### `presence_realtime`
- **Base Table:** `presence`
- **Purpose:** Sanitized presence data for realtime subscriptions (coordinates rounded to ~100m)
- **Columns:** `user_id`, `role`, `lat_approx`, `lng_approx`, `geohash`, `is_online`, `last_seen_at`, `expires_at`, `meta`
- **Filter:** `expires_at > NOW()`
- **Source:** `20250129_realtime_presence_ttl.sql:442-458`

#### `ride_intents_realtime`
- **Base Table:** `ride_intents`
- **Purpose:** Sanitized ride intents for drivers (coordinates rounded to ~100m)
- **Columns:** `id`, `passenger_id`, `pickup_lat_approx`, `pickup_lng_approx`, `pickup_address`, `dropoff_lat_approx`, `dropoff_lng_approx`, `dropoff_address`, `notes`, `status`, `created_at`, `expires_at`
- **Filter:** `status = 'pending' AND expires_at > NOW()`
- **Source:** `20250129_realtime_presence_ttl.sql:461-482`

### 6.2 Realtime Channels (from Code)

Based on codebase search, the following channels are used:

| Channel Name | Table/View | Purpose | Source |
|--------------|------------|---------|--------|
| `presence-updates` | `presence_realtime` | Live presence updates | `docs/PRESENCE_REALTIME_TTL.md:143-154` |
| `ride-intents-updates` | `ride_intents_realtime` | Live ride intent updates for drivers | `docs/PRESENCE_REALTIME_TTL.md:175-186` |

### 6.3 Realtime Subscription Pattern

From `docs/PRESENCE_REALTIME_TTL.md`:

```typescript
// Presence updates
const channel = supabase
  .channel('presence-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'presence_realtime',
  })
  .subscribe();

// Ride intents (for drivers)
const channel = supabase
  .channel('ride-intents-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ride_intents_realtime',
  })
  .subscribe();
```

---

## 7. Existing "Business Directory" Model

### Current State

**There is NO dedicated business directory table in the reviewed migrations.**

However, the following tables may serve as business/vendor data sources:

1. **`user_profiles` + `user_roles`**: Users with `role = 'vendor'` could represent businesses
   - **Location:** Not stored in `user_profiles` (only in `presence` table)
   - **Business Info:** No dedicated business fields (name, category, phone, etc.)

2. **`marketplace_listings`**: Represents listings created by vendors
   - **Location:** `location` GEOGRAPHY(POINT)
   - **Business Info:** `user_id` (vendor), `category`, `phone_number`, `title`, `description`
   - **Limitation:** Only active listings, not a directory of all businesses

3. **Legacy Tables (may not exist):**
   - `vendors` (referenced in `20250305_secure_rds_and_profiles.sql:18`)
   - `vendor_responses` (referenced in `20250305_secure_rds_and_profiles.sql:17`)

### Conclusion

**For WhatsApp broadcast, we need a business directory table.** The existing `marketplace_listings` is for listings, not a directory. `user_profiles` with `role = 'vendor'` lacks business-specific fields and location.

---

## 8. Existing "Messages / Chat / Notifications" Model

### Current State

1. **`messages`**: Chat messages within conversations
   - **Purpose:** Conversation history with AI agents
   - **Not suitable for:** WhatsApp messages, broadcast messages, notifications

2. **`broadcast_responses`**: Business responses to broadcasts
   - **Purpose:** Store responses from businesses via WhatsApp
   - **Columns:** `request_id`, `business_name`, `business_phone`, `item_found`, `response_type`, `responded_at`
   - **Limitation:** Only stores responses, not outbound messages or full message history

3. **Legacy Tables (may not exist):**
   - `whatsapp_messages` (referenced in `20250305_secure_rds_and_profiles.sql:13`)
   - `whatsapp_threads` (referenced in `20250305_secure_rds_and_profiles.sql:14`)
   - `whatsapp_webhook_events` (referenced in `20250305_secure_rds_and_profiles.sql:12`)

### Conclusion

**For WhatsApp broadcast, we need tables to track:**
- Outbound WhatsApp messages (sent to businesses)
- Inbound WhatsApp messages (replies from businesses)
- Message delivery status (sent, delivered, read, failed)

The existing `broadcast_responses` only stores response summaries, not full message logs.

---

## 9. Code References

### 9.1 Frontend Supabase Usage

From `grep` results:

| File | Table | Operation |
|------|-------|-----------|
| `apps/pwa/pages/Settings.tsx` | `profiles` | SELECT, UPSERT |
| `apps/pwa/pages/BusinessOnboarding.tsx` | `profiles` | UPSERT |
| `apps/pwa/pages/Services.tsx` | `profiles` | SELECT |
| `services/presence.ts` | `presence` | UPDATE |

### 9.2 Edge Function Usage

| Function | Table | Operation |
|----------|-------|-----------|
| `whatsapp-broadcast` | `broadcasts` | INSERT |
| `whatsapp-broadcast` | `broadcast_responses` | INSERT |
| `log-request` | `request_logs` | INSERT (table may not exist) |

---

## 10. Summary

### Tables Summary

- **Total Tables:** 18+ (including views and legacy tables)
- **Core Tables:** 15 (user_profiles, user_roles, presence, ride_intents, matches, marketplace_listings, broadcasts, broadcast_responses, conversations, messages, payment_requests, tool_traces, rate_limits, abuse_reports, plus views)
- **Broadcast Tables:** 2 (`broadcasts`, `broadcast_responses`) - **EXISTING**
- **Business Directory:** **NONE** (need to create or use marketplace_listings)
- **WhatsApp Message Logs:** **NONE** (legacy tables may exist but not in migrations)

### Key Findings

1. ✅ **Broadcast tables exist** (`broadcasts`, `broadcast_responses`)
2. ❌ **No business directory table** (need to create or extend existing)
3. ❌ **No WhatsApp message logs** (need to create for outbound/inbound tracking)
4. ✅ **Realtime infrastructure exists** (views, channels, subscriptions)
5. ✅ **RLS policies are comprehensive** (user-owned data, service_role for system operations)

### Next Steps

See `BROADCAST_DEDUP_MAPPING.md` for mapping broadcast entities to existing tables and required changes.

