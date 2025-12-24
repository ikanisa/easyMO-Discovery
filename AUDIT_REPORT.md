# Full-Stack Audit & Implementation Plan

**Date:** 2024-05-22  
**System:** easyMO Discovery PWA  
**Status:** Pre-Production / Beta  

---

## 1. Executive Summary
The frontend is in a robust state with a high-quality "Liquid Glass" UI and solid mobile-first principles. However, the application currently relies on "Simulation Mode" or "Client-Side Fallbacks" for several critical features (AI, Location). To achieve **Production Readiness**, the Backend (Supabase) must be rigorously configured to match the frontend's expectations.

**Critical Blocker:** Usage of Client-Side API Keys for Gemini/Maps in `services/gemini.ts` and `components/SmartLocationInput.tsx` is a security risk. These must be proxied via Supabase Edge Functions.

---

## 2. Frontend Audit (PWA & UX)

| Category | Status | Finding | Action Item |
| :--- | :--- | :--- | :--- |
| **Performance** | 🟢 Good | Lazy loading implemented. CSS animations used effectively. | Ensure images are WebP/AVIF. |
| **PWA** | 🟡 Partial | Manifest exists but lacks screenshots/shortcuts. | **Implemented:** Updated `manifest.json` & `index.html`. |
| **Mobile Native** | 🟡 Partial | Safe areas (Notch/Home Bar) not fully respected. | **Implemented:** Updated `Layout.tsx` with `env(safe-area-inset)`. |
| **Offline** | 🔴 Missing | No visual feedback when network drops. | **Implemented:** Added Offline Indicator in `App.tsx`. |
| **Security** | 🔴 Critical | `process.env.API_KEY` exposed in client bundle. | **Required:** Move Logic to Edge Functions. |

---

## 3. Backend Audit (Supabase Schema & Functions)

The frontend expects the following Postgres Schema and RPC functions. **These must be applied to the Supabase Instance immediately.**

### 3.1 Database Schema (`public`)

#### Table: `profiles`
*Stores user identity, roles, and preferences.*
```sql
create table profiles (
  id uuid references auth.users not null primary key,
  phone text unique,
  display_name text,
  role text check (role in ('passenger', 'driver', 'vendor')),
  vehicle_plate text,
  bio text,
  whatsapp_consent boolean default true,
  updated_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
create policy "Public Read" on profiles for select using (true);
create policy "Self Update" on profiles for update using (auth.uid() = id);
create policy "Self Insert" on profiles for insert with check (auth.uid() = id);
```

#### Table: `presence`
*Stores real-time location. Requires PostGIS extension.*
```sql
-- Enable PostGIS
create extension if not exists postgis;

create table presence (
  user_id uuid references auth.users not null primary key,
  role text not null,
  vehicle_type text,
  location geography(POINT) not null,
  is_online boolean default false,
  last_seen timestamptz default now()
);

-- RLS
alter table presence enable row level security;
create policy "Public Read" on presence for select using (true);
create policy "Self Upsert" on presence for insert with check (auth.uid() = user_id);
create policy "Self Update" on presence for update using (auth.uid() = user_id);
```

### 3.2 RPC Functions

#### Function: `get_nearby_drivers`
*Used by `services/presence.ts` for the Radar feature.*
```sql
create or replace function get_nearby_drivers(
  user_lat float, 
  user_lng float, 
  radius_meters float
)
returns table (
  user_id uuid,
  vehicle_type text,
  lat float,
  lng float,
  dist_meters float,
  last_seen timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    p.user_id,
    p.vehicle_type,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    st_distance(p.location, st_point(user_lng, user_lat)::geography) as dist_meters,
    p.last_seen
  from
    presence p
  where
    p.is_online = true
    and st_dwithin(p.location, st_point(user_lng, user_lat)::geography, radius_meters)
    and p.last_seen > (now() - interval '5 minutes') -- Only active users
  order by
    dist_meters asc;
end;
$$;
```

---

## 4. Edge Functions Implementation Plan

To secure the application, deploy the following Supabase Edge Functions:

1.  **`chat-gemini`**:
    *   **Input**: `{ prompt, history, location }`
    *   **Logic**: Instantiates `GoogleGenAI` server-side using `Deno.env.get('GEMINI_API_KEY')`.
    *   **Output**: Streamed text response.

2.  **`whatsapp-broadcast`**:
    *   **Input**: `{ businesses: [{name, phone}], message }`
    *   **Logic**: Connects to Meta Graph API (WhatsApp Business).
    *   **Output**: `{ success: true, count: N }`.

---

## 5. QA & UAT Checklist

1.  **Login Flow**: Verify Anonymous Sign-in creates a `profiles` entry.
2.  **Geolocation**: Verify `PermissionModal` appears on first load. Verify `get_nearby_drivers` returns data when multiple users are online.
3.  **Broadcasting**: Verify "Ask All" triggers the `whatsapp-broadcast` function (check network tab).
4.  **Offline**: Turn off WiFi. Verify "You are Offline" banner appears. Verify basic navigation still works.
5.  **Installation**: Verify "Add to Home Screen" prompt appears on Android.

---

**Signed off by:** Senior Fullstack Engineer
