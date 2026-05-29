const CACHE_VERSION = "braintam-v4";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

const ALL_CACHES = [STATIC_CACHE, IMAGE_CACHE];

// ── Install: pre-cache nothing critical (let runtime caching handle it) ─────
self.addEventListener("install", (event) => {
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

// ── Activate: delete every cache from previous versions ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !ALL_CACHES.includes(n))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Message: allow the page to trigger skipWaiting ───────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

// ── Fetch: strategy depends on request type ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Always bypass: API calls and version check
  if (url.pathname.startsWith("/api/") || url.pathname === "/version.json") return;

  // Hashed JS / CSS / woff2 → cache-first (filename changes on every build)
  if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images / icons → cache-first with network fallback
  if (isImage(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // HTML navigation + everything else → network-first (always fresh)
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─────────────────────────────────────────────────────────────────────────────

function isHashedAsset(pathname) {
  // Vite outputs: /assets/index-AbCd1234.js  /assets/index-XyZ.css
  return /\/assets\/.*\.[0-9a-f]{8,}\.(js|css|woff2?)$/i.test(pathname);
}

function isImage(pathname) {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 408, statusText: "Offline" });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("", { status: 408, statusText: "Offline" });
  }
}
