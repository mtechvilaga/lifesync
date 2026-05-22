const CACHE_NAME = "lifesync-v1";
const STATIC_ASSETS = [
  "/",
  "/lifesync-icon.png",
  "/manifest.json",
];

// Telepítés: statikus fájlok cache-elése
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktiválás: régi cache-ek törlése
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first stratégia, fallback cache-re
self.addEventListener("fetch", (event) => {
  // Csak GET kéréseket kezelünk
  if (event.request.method !== "GET") return;

  // Supabase / API hívásokat ne cache-eljük
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("emailjs.com") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Sikeres válasz esetén frissítjük a cache-t
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline esetén cache-ből szolgálunk ki
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Ha a cache-ben sincs, visszaadjuk a főoldalt (SPA fallback)
          return caches.match("/");
        });
      })
  );
});
