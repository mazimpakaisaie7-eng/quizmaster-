
/* =========================================================
   🇷🇼 QUIZ MASTER — SERVICE WORKER
   Version: 3.3.2

   PURPOSE:
   - Progressive Web App (PWA)
   - Offline application support
   - Static resource caching
   - Quiz questions caching
   - Learning Centre caching
   - Automatic cache updates
   - Safe cache cleanup
   ========================================================= */

"use strict";

/* =========================================================
   1. CACHE CONFIGURATION
========================================================= */

const CACHE_VERSION = "3.3.2";

const CACHE_NAME = `quizmaster-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",

  // Quiz engine and database
  "./questions.js",
  "./questions.json",

  // Learning Centre
  "./articles.html",
  "./articles.json",

  // Information pages
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",

  // PWA files
  "./manifest.webmanifest",
  "./icon-192-4.png",
  "./icon-512-3.png",

  // Additional resources
  "./mythica.mp3",
  "./robots.txt",
  "./sitemap.xml"
];

/* =========================================================
   2. HELPER FUNCTIONS
========================================================= */

function isValidResponse(response) {
  return (
    response &&
    response.ok &&
    response.type === "basic"
  );
}

async function updateCache(cache, request) {
  try {
    const response = await fetch(request);

    if (isValidResponse(response)) {
      await cache.put(
        request,
        response.clone()
      );
    }
  } catch (error) {
    // Keep existing cached resources.
  }
}

/* =========================================================
   3. INSTALL EVENT
========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);

        await cache.addAll(APP_SHELL);

        await self.skipWaiting();

      } catch (error) {
        console.error(
          "Quiz Master installation failed:",
          error
        );

        throw error;
      }
    })()
  );
});

/* =========================================================
   4. ACTIVATE EVENT
========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();

        await Promise.all(
          cacheNames
            .filter((name) =>
              name.startsWith("quizmaster-cache-") &&
              name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        );

        await self.clients.claim();

      } catch (error) {
        console.error(
          "Quiz Master activation failed:",
          error
        );

        throw error;
      }
    })()
  );
});

/* =========================================================
   5. FETCH EVENT
========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Handle GET requests only.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Handle same-origin requests only.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API requests.
  if (url.pathname.includes("/api/")) {
    return;
  }

  // Ignore Vercel internal routes.
  if (url.pathname.includes("/_vercel/")) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /* -----------------------------------------
         A. HTML NAVIGATION — NETWORK FIRST
      ----------------------------------------- */

      if (request.mode === "navigate") {
        try {
          const networkResponse = await fetch(request);

          if (isValidResponse(networkResponse)) {
            await cache.put(
              request,
              networkResponse.clone()
            );
          }

          return networkResponse;

        } catch (error) {
          // Try the exact requested page.
          const cachedPage = await cache.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          // Try the cached home page.
          const homePage = await cache.match(
            "./index.html"
          );

          if (homePage) {
            return homePage;
          }

          // Try the offline page.
          const offlinePage = await cache.match(
            "./offline.html"
          );

          if (offlinePage) {
            return offlinePage;
          }

          return new Response(
            "You are offline. Please reconnect to the internet.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        }
      }

      /* -----------------------------------------
         B. STATIC RESOURCES — CACHE FIRST
      ----------------------------------------- */

      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Return cached resource immediately.
        // Update the cache in the background.
        event.waitUntil(
          updateCache(cache, request)
        );

        return cachedResponse;
      }

      /* -----------------------------------------
         C. NETWORK FALLBACK
      ----------------------------------------- */

      try {
        const networkResponse = await fetch(request);

        if (isValidResponse(networkResponse)) {
          await cache.put(
            request,
            networkResponse.clone()
          );
        }

        return networkResponse;

      } catch (error) {
        return new Response(
          "This resource is currently unavailable offline.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      }
    })()
  );
});

/* =========================================================
   6. MESSAGE EVENT
========================================================= */

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data.type !== "string") {
    return;
  }

  // Activate the waiting service worker.
  if (event.data.type === "SKIP_WAITING") {
    event.waitUntil(
      self.skipWaiting()
    );
  }

  // Return current service worker version.
  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        version: CACHE_VERSION,
        cacheName: CACHE_NAME
      });
    }
  }
});

/* =========================================================
   7. END
========================================================= */
