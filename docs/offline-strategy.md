# Offline Strategy

## Goals
- App shell always loads when previously visited.
- Offline-friendly UI states for key journeys.
- Queue critical actions and retry when back online.

## Service Worker
- Workbox precaches the app shell and static assets.
- Navigation requests: network-first with cache fallback.
- Assets (JS/CSS): stale-while-revalidate.
- Images/fonts: cache-first with expiration limits.
- POST requests to Supabase Functions use Background Sync where supported.
- Catch handler serves `/offline.html` when no cache is available.

## Offline Queue
- Queueable actions: `create_request`, `queue_broadcast`, `batch_broadcast`.
- Stored in IndexedDB and flushed on reconnect.
- UI indicator shows queued count and last sync time.

## UX
- Offline banner shows connectivity status + sync controls.
- Toasts communicate offline/online transitions.
