const CACHE_NAME = "quizmaster-pro-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  // Add other static assets as needed
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log("Cache install failed:", error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      })
  );
});

// Handle background sync for quiz submissions
self.addEventListener("sync", (event) => {
  if (event.tag === "quiz-submission") {
    event.waitUntil(syncQuizSubmission());
  }
});

// Handle push notifications (optional)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New quiz available!",
    icon: "/icon-192.svg",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View Quiz",
        icon: "/icon-192.svg",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-192.svg",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("QuizMaster Pro", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

async function syncQuizSubmission() {
  try {
    // Get pending quiz submissions from IndexedDB
    // Submit them to the server
    console.log("Syncing quiz submissions...");
  } catch (error) {
    console.error("Sync failed:", error);
  }
}
