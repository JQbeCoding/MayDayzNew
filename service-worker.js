const CACHE_NAME = "maydayz-runtime-cache-v1";

self.addEventListener("install", (event) => {
  console.log("Service Worker installed (no precaching).");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log("Serving from cache:", event.request.url);
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            if (
              !response ||
              response.status !== 200 ||
              response.type !== "basic"
            ) {
              return response;
            }

            return caches.open(CACHE_NAME).then((cache) => {
              console.log("Fetching and caching new asset:", event.request.url);
              cache.put(event.request, response.clone());
              return response;
            });
          })
          .catch((error) => {
            console.error("Fetch failed (network issue):", error);
            throw error;
          });
      })
      .catch((error) => {
        console.error("Error during fetch or cache match:", error);
        throw error;
      })
  );
});
