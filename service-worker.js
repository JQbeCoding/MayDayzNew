self.addEventListener("install", (event) => {
  console.log("[SW] Installing self-destructing Service Worker...");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating self-destructing Service Worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete ALL caches controlled by this origin
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log(`[SW] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log("[SW] All caches cleared. Unregistering self.");
        // Get all clients controlled by this Service Worker
        return self.clients.claim().then(() => {
          // Find the controlling Service Worker and unregister it
          return self.registration.unregister();
        });
      })
      .then(() => {
        console.log(
          "[SW] Service Worker successfully unregistered. Please refresh the page."
        );
      })
      .catch((error) => {
        console.error("[SW] Error during unregistration:", error);
      })
  );
});

self.addEventListener("fetch", (event) => {
  // console.log('[SW] Fetch event - passing through for unregistering SW:', event.request.url);
  event.respondWith(fetch(event.request));
});
