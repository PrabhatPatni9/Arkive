// Arkive service worker — handles Web Push wake signals and offline caching.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Content-free wake push: just wake the app to poll for new ops.
// The relay sends no plaintext payload — the push is purely a wake signal.
self.addEventListener('push', () => {
  // No notification shown — the app polls in the background.
  // If the app is closed, open it silently via clients.openWindow only on
  // explicit user-notification pushes (not implemented in V1).
})

// Optional: fetch handler for offline asset serving (empty in V1).
self.addEventListener('fetch', () => {
  // No cache strategy in V1; all offline access is via local DB.
})
