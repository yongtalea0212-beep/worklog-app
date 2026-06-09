// StayScape service worker — offline support + installability.
// Strategy: network-first for navigations & same-origin pages (always fresh
// when online, cached shell when offline); stale-while-revalidate for static
// assets (hashed Next chunks, images, icons). Cross-origin (Supabase / LINE /
// Anthropic) and /api/ are never cached.
const CACHE = 'stayscape-v1'
const PRECACHE = ['/', '/manifest.json', '/brand-logo.png', '/icon-192.png', '/icon-512.png', '/og-image.jpg']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch { return }

  // Only handle same-origin GETs; skip API routes (auth/data must stay live).
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Navigations → network-first, fall back to cached page then to the app shell.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put(req, net.clone())
        return net
      } catch {
        return (await caches.match(req)) || (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  // Static assets → stale-while-revalidate.
  event.respondWith((async () => {
    const cached = await caches.match(req)
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        caches.open(CACHE).then((c) => c.put(req, res.clone()))
      }
      return res
    }).catch(() => cached)
    return cached || network
  })())
})
