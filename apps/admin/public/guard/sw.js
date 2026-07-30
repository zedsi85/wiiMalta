/* Wii Door service worker — installability + static-asset caching.
   APIs and pages stay network-only: check-in must never serve stale state;
   the scanner's own localStorage queue covers offline admissions. */
const CACHE = "wii-guard-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStatic =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/guard/icon");
  if (event.request.method !== "GET" || !isStatic) return; // network-only
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })
  );
});
