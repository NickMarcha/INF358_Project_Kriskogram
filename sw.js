// Service Worker for Kriskogram PWA
// This enables offline functionality and app installation

const CACHE_NAME = 'kriskogram-v1'

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
      // Cache index.html and other assets (skip just the base path which might redirect)
      const urlsToCache = [
        BASE_PATH + 'index.html',
        ...STATIC_ASSETS.map(asset => BASE_PATH + asset)
      ]
      
      return Promise.all(
        urlsToCache.map((url) =>
          fetch(url, { redirect: 'follow' })
            .then((response) => {
              // Only cache successful responses (not redirects)
              if (response.ok && response.type === 'basic') {
                return { url, response }
              }
              return null
            })
            .catch((err) => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err)
              return null // Don't fail entire cache operation
            })
        )
      ).then((results) => {
        results.forEach((result) => {
          if (result && result.response) {
            cache.put(result.url, result.response.clone())
          }
        })
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
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests (external APIs)
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: false }).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse
      }

      // Otherwise fetch from network
      return fetch(event.request, { redirect: 'follow' })
        .then((response) => {
          // Don't cache redirects or invalid responses
          if (!response || response.status !== 200 || response.redirected || response.type !== 'basic') {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          // Cache the fetched response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // If offline and not in cache, return offline page if it's a navigation request
          if (event.request.mode === 'navigate') {
            // Try multiple cache key formats
            const indexUrl = BASE_PATH + 'index.html'
            const fullUrl = new URL(indexUrl, self.location.origin).toString()
            
            // Try to find index.html in cache using different key formats
            return caches.match(fullUrl)
              .then(cached => cached || caches.match(indexUrl))
              .then(cached => cached || caches.match(BASE_PATH + 'index.html'))
              .then(cached => {
                if (cached) return cached
                // If still not found, return error
                return new Response('Offline - Content not cached', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                })
              })
          }
          // For other requests, let them fail gracefully
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    })
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

