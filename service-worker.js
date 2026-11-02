/* =========================================================
   🇷🇼 QUIZ MASTER — SERVICE WORKER
   Version: 3.3.1
   Purpose:
   - PWA support
   - Offline application support
   - Static resource caching
   - Quiz questions caching
   - Learning Centre caching
   - Automatic cache updates
   ========================================================= */

"use strict";

/* ==============================
   1. CACHE CONFIGURATION
================================ */

const CACHE_VERSION = "3.3.1";

const CACHE_NAME = `quizmaster-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./questions.js",
  "./questions.json",
  "./articles.html",
  "./articles.json",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./manifest.webmanifest",
  "./icon-192-4.png",
  "./icon-512-3.png",
  "./mythica.mp3",
  "./robots.txt",
  "./sitemap.xml"
];

/* ==============================
   2. INSTALL EVENT
================================ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(APP_SHELL);

      await self.skipWaiting();
    })()
  );
});

/* ==============================
   3. ACTIVATE EVENT
================================ */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
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
    })()
  );
});

/* ==============================
   4. FETCH EVENT
================================ */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Only handle requests from this origin.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Do not cache API requests.
  if (url.pathname.includes("/api/")) {
    return;
  }

  // Do not cache browser navigation outside the app.
  if (url.pathname.includes("/_vercel/")) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /* --------------------------
         HTML PAGE REQUESTS
      --------------------------- */

      if (request.mode === "navigate") {
        try {
          const networkResponse = await fetch(request);

          if (
            networkResponse &&
            networkResponse.ok &&
            networkResponse.type === "basic"
          ) {
            await cache.put(
              request,
              networkResponse.clone()
            );
          }

          return networkResponse;

        } catch (error) {
          const cachedPage = await cache.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          const homePage = await cache.match("./index.html");

          if (homePage) {
            return homePage;
          }

          const offlinePage = await cache.match("./offline.html");

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

      /* --------------------------
         STATIC FILE REQUESTS
      --------------------------- */

      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Serve cached resource immediately.
        // Update cache in the background when possible.
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (
                response &&
                response.ok &&
                response.type === "basic"
              ) {
                return cache.put(
                  request,
                  response.clone()
                );
              }
            })
            .catch(() => {
              // Keep the existing cached resource.
            })
        );

        return cachedResponse;
      }

      /* --------------------------
         NETWORK FALLBACK
      --------------------------- */

      try {
        const networkResponse = await fetch(request);

        if (
          networkResponse &&
          networkResponse.ok &&
          networkResponse.type === "basic"
        ) {
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

/* ==============================
   5. MESSAGE EVENT
================================ */

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        version: CACHE_VERSION,
        cacheName: CACHE_NAME
      });
    }
  }
});

/* ==============================
   END OF QUIZ MASTER
   SERVICE WORKER
================================ */
