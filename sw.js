// Service Worker for Kriskogram PWA
// This enables offline functionality and app installation

const CACHE_NAME = 'kriskogram-v2'

// Get base path from the service worker's location
function getBasePath() {
  const swPath = self.location.pathname
  // Extract base path from service worker location
  // e.g., /INF358_Project_Kriskogram/sw.js -> /INF358_Project_Kriskogram/
  const match = swPath.match(/^(.+)\/sw\.js$/)
  return match ? match[1] + '/' : '/'
}

const BASE_PATH = getBasePath()

// Assets to cache for offline use (relative to base path)
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'favicon.ico',
  'logo192.png',
  'logo512.png',
  // Data files for offline access
  'data/sample-migration-data.gexf',
  'data/State_to_State_Migrations_Table_2021.csv',
  'data/Swiss_Relocations_2016_locations.csv',
  'data/Swiss_Relocations_2016_flows.csv',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', BASE_PATH)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      // Cache index.html and other assets with absolute URLs
      const urlsToCache = [
        BASE_PATH + 'index.html',
        ...STATIC_ASSETS.map(asset => BASE_PATH + asset)
      ]
      
      return Promise.all(
        urlsToCache.map((url) => {
          const fullUrl = new URL(url, self.location.origin).toString()
          return fetch(fullUrl, { redirect: 'follow' })
            .then((response) => {
              // Only cache successful, non-redirected responses (status 200)
              if (response.ok && response.status === 200 && !response.redirected && response.type === 'basic') {
                return { url: fullUrl, response }
              }
              console.warn(`[Service Worker] Skipping cache for ${url}: status=${response.status}, redirected=${response.redirected}, type=${response.type}`)
              return null
            })
            .catch((err) => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err)
              return null // Don't fail entire cache operation
            })
        })
      ).then((results) => {
        const cachedCount = results.filter(r => r !== null).length
        results.forEach((result) => {
          if (result && result.response) {
            // Store with the full URL as the key to match requests properly
            cache.put(result.url, result.response.clone())
          }
        })
        console.log(`[Service Worker] Cached ${cachedCount}/${urlsToCache.length} assets`)
      })
    })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document'

  // Network-first for navigations (HTML)
  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request, { redirect: 'follow', cache: 'no-store' })
          // Cache successful HTML for offline use
          if (networkResponse && networkResponse.ok && !networkResponse.redirected) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        } catch (_) {
          // Fallback to cached index.html or cached navigation
          const indexUrl = BASE_PATH + 'index.html'
          const fullUrl = new URL(indexUrl, self.location.origin).toString()
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match(fullUrl)) ||
            (await caches.match(indexUrl))
          if (cached) return cached
          return new Response(
            `<!DOCTYPE html><html><head><title>Offline</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>You are offline</h1><p>Please check your internet connection.</p><script>setTimeout(() => window.location.reload(), 2000)</script></body></html>`,
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        }
      })()
    )
    return
  }

  // Stale-while-revalidate for other same-origin GET requests
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(event.request)
      const fetchPromise = fetch(event.request, { redirect: 'follow' })
        .then((response) => {
          if (response && response.ok && !response.redirected && response.type === 'basic') {
            cache.put(event.request, response.clone())
          }
          return response
        })
        .catch(() => undefined)

      // Serve cached immediately if present; otherwise wait for network
      return cached || (await fetchPromise) || new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } })
    })()
  )
})

// Message event - handle updates and data resets
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    // Clear all caches (for data resets)
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        )
      })
    )
  }
})
