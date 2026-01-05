/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Route-based code splitting support - Cache First for hashed static assets
registerRoute(
  ({ request, url }) => {
    // Check if it's a hashed asset (contains hash in filename)
    const hasHash = /[a-f0-9]{8,}/.test(url.pathname);
    return url.origin === self.location.origin && 
           ['script', 'style'].includes(request.destination || '') &&
           hasHash;
  },
  new CacheFirst({
    cacheName: 'hashed-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60 }), // 1 year
    ],
  })
);

// Navigation routes - Stale While Revalidate for HTML pages
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }), // 1 hour
    ],
  })
);

// Static assets - Stale While Revalidate (fast + refresh in background)
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }), // 7 days
    ],
  })
);

// Images - Stale While Revalidate or Cache First (size limited)
// This strategy allows images to be refreshed in background while serving cached versions
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ 
        maxEntries: 80, 
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true, // Clear old entries when quota exceeded
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// API Reads - Stale While Revalidate (fast + refresh in background)
registerRoute(
  ({ request, url }) => {
    // Match API GET requests
    return request.method === 'GET' &&
           (url.href.includes('/rest/v1/') || 
            url.href.includes('/functions/v1/') ||
            url.href.includes('supabase.co'));
  },
  new StaleWhileRevalidate({
    cacheName: 'api-reads',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }), // 5 minutes
    ],
  })
);

// API Writes - Network Only + offline queue (prevent duplicate writes + ensure correctness)
const apiQueue = new BackgroundSyncPlugin('apiQueue', {
  maxRetentionTime: 24 * 60, // 24 hours
});

registerRoute(
  ({ request, url }) =>
    (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT' || request.method === 'DELETE') &&
    (url.origin !== self.location.origin || url.pathname.includes('/functions/v1/') || url.pathname.includes('/rest/v1/')),
  new NetworkOnly({
    plugins: [apiQueue],
  })
);

// Route-specific offline fallbacks
const routeOfflineFallbacks: Record<string, string> = {
  '/': '/offline.html',
  '/chat': '/offline.html',
  '/settings': '/offline.html',
  '/onboarding': '/offline.html',
};

setCatchHandler(async ({ event }) => {
  const url = new URL(event.request.url);
  
  // Check for route-specific offline page
  const route = url.pathname;
  const offlinePage = routeOfflineFallbacks[route] || routeOfflineFallbacks['/'] || '/offline.html';
  
  if (event.request.mode === 'navigate') {
    const cached = await caches.match(offlinePage, { ignoreSearch: true });
    if (cached) return cached;
    
    // Fallback to index.html as last resort
    const indexCached = await caches.match('/index.html', { ignoreSearch: true });
    if (indexCached) return indexCached;
  }
  
  // For non-navigation requests, try to return a cached version if available
  const cached = await caches.match(event.request, { ignoreSearch: true });
  if (cached) return cached;
  
  return Response.error();
});

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'easyMO Discovery',
    body: 'You have a new update.',
    url: '/',
  };
  const data = event.data ? event.data.json() : fallback;

  const title = data.title || fallback.title;
  const options: NotificationOptions = {
    body: data.body || fallback.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || fallback.url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url || '/';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
