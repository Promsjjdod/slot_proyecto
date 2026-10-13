const CACHE_NAME = "bruma-de-jade-shell-v1";
const scopeUrl = new URL(self.registration.scope);
const basePath = scopeUrl.pathname;
const CORE_FILES = [
  "",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "assets/icons/icon-192.svg",
  "assets/icons/icon-512.svg",
  "assets/img/jade-mist-mountain-background.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES.map((file) => new URL(file, scopeUrl).toString())))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(basePath)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(new URL("index.html", scopeUrl).toString())) ?? Response.error());
    }),
  );
});
