const CACHE_VERSION = "pckarsilastir-v1";
const CORE_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Hash'li statik asetler: cache-first (immutable)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
      )
    );
    return;
  }

  // mock.json: network-first (taze fiyatlar), offline'da cache'e düş
  if (url.pathname === "/mock.json") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigasyonlar ve diğer her şey: network-first, offline'da index cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.method === "GET") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) => cached || caches.match("/")
        )
      )
  );
});