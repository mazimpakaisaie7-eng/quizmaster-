
"use strict";

/* =========================================
   QUIZ MASTER 🇷🇼 SERVICE WORKER
   Version: 2.0.0
========================================= */

const CACHE_VERSION = "quizmaster-v2.0.0";

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

/* Files that can safely be cached */
const STATIC_FILES = [
  "./",
  "./index.html",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./manifest.webmanifest",
  "./icon-192-4.png",
  "./icon-512-3.png"
];

/* Question data */
const DATA_FILES = [
  "./questions.js",
  "./questions.json"
];

/* =========================================
   INSTALL
========================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await cache.addAll(STATIC_FILES);

      // Activate the new version immediately.
      await self.skipWaiting();
    })()
  );
});

/* =========================================
   ACTIVATE
========================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName.startsWith("quizmaster-") &&
            ![
              STATIC_CACHE,
              PAGE_CACHE,
              DATA_CACHE
            ].includes(cacheName)
          ) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        })
      );

      // Take control of existing pages.
      await self.clients.claim();

      // Notify open pages that a new version is active.
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      clients.forEach(client => {
        client.postMessage({
          type: "QUIZMASTER_UPDATED",
          version: CACHE_VERSION
        });
      });
    })()
  );
});

/* =========================================
   FETCH
========================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore external websites.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API or payment requests.
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/payment") ||
    url.pathname.includes("/approve") ||
    url.pathname.includes("/complete") ||
    url.pathname.includes("/cancel")
  ) {
    return;
  }

  // Do not cache browser navigation responses.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Question files: network first.
  if (
    url.pathname.endsWith("/questions.json") ||
    url.pathname.endsWith("/questions.js")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Static files: cache first.
  event.respondWith(cacheFirst(request));
});

/* =========================================
   NETWORK FIRST
========================================= */

async function networkFirst(request, cacheName = PAGE_CACHE) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, {
      cache: "no-cache"
    });

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Offline fallback.
    if (request.mode === "navigate") {
      const fallback = await caches.match("./index.html");

      if (fallback) {
        return fallback;
      }
    }

    return new Response(
      "You are offline. Please check your internet connection.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* =========================================
   CACHE FIRST
========================================= */

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {
    return new Response(
      "Resource unavailable while offline.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* =========================================
   MESSAGE HANDLER
========================================= */

self.addEventListener("message", event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_QUIZ_CACHE") {
    event.waitUntil(
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name.startsWith("quizmaster-"))
            .map(name => caches.delete(name))
        )
      )
    );
  }
});
