
/* =====================================================
   QUIZ MASTER 🇷🇼
   SERVICE WORKER
   Version: 3.0.0
   Fixed: Offline page, correct icons, safe caching
===================================================== */

"use strict";

/* =========================================
   CACHE CONFIGURATION
========================================= */

const CACHE_VERSION = "quizmaster-v3.0.0";

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const OFFLINE_URL = new URL(
  "./offline.html",
  self.registration.scope
).href;

const HOME_URL = new URL(
  "./index.html",
  self.registration.scope
).href;

/* =========================================
   FILES TO CACHE
========================================= */

// These files must exist for installation.
const REQUIRED_FILES = [
  "./index.html",
  "./offline.html"
];

// These files are optional.
// A missing optional file will not break installation.
const OPTIONAL_FILES = [
  "./",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./premium.html",
  "./referral.html",
  "./manifest.webmanifest",

  // Correct existing icon filenames
  "./icon-192-4.png",
  "./icon-512-3.png",

  // Application resources
  "./questions.js",
  "./questions.json",
  "./payment.js",
  "./referral.js",
  "./mythica.mp3"
];

/* =========================================
   INSTALL
========================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {

      const cache = await caches.open(STATIC_CACHE);

      // Required files must be available.
      for (const file of REQUIRED_FILES) {

        const url = new URL(
          file,
          self.registration.scope
        ).href;

        const response = await fetch(url, {
          cache: "reload"
        });

        if (!response.ok) {
          throw new Error(
            `Required file missing: ${file}`
          );
        }

        await cache.put(url, response);
      }

      // Optional files cannot break installation.
      await Promise.allSettled(
        OPTIONAL_FILES.map(async file => {

          const url = new URL(
            file,
            self.registration.scope
          ).href;

          try {

            const response = await fetch(url, {
              cache: "reload"
            });

            if (response.ok) {
              await cache.put(url, response);
            }

          } catch (error) {

            console.warn(
              "Optional cache skipped:",
              file
            );

          }

        })
      );

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

      // Delete outdated Quiz Master caches only.
      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith("quizmaster-") &&
            ![
              STATIC_CACHE,
              PAGE_CACHE,
              DATA_CACHE
            ].includes(name)
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();

      // Inform open pages about the new version.
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clients) {

        client.postMessage({
          type: "QUIZMASTER_UPDATED",
          version: CACHE_VERSION
        });

      }

    })()
  );

});

/* =========================================
   FETCH
========================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Only handle this website's own requests.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache payment or API requests.
  // These must use the actual network.
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/payment")
  ) {
    return;
  }

  // JavaScript and JSON: network first.
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json")
  ) {

    event.respondWith(
      networkFirst(request, DATA_CACHE)
    );

    return;
  }

  // HTML pages: network first.
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {

    event.respondWith(
      networkFirst(request, PAGE_CACHE)
    );

    return;
  }

  // Images, icons and other static assets.
  event.respondWith(
    cacheFirst(request, STATIC_CACHE)
  );

});

/* =========================================
   NETWORK FIRST
========================================= */

async function networkFirst(request, cacheName) {

  const cache = await caches.open(cacheName);

  try {

    const response = await fetch(request);

    if (response && response.ok) {

      await cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    // Try the previously saved version.
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Navigation fallback.
    if (request.mode === "navigate") {

      const offlinePage = await caches.match(
        OFFLINE_URL
      );

      if (offlinePage) {
        return offlinePage;
      }

      const homePage = await caches.match(
        HOME_URL
      );

      if (homePage) {
        return homePage;
      }
    }

    return new Response(
      "Internet ntiboneka. Ongera ugerageze.",
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

async function cacheFirst(request, cacheName) {

  const cache = await caches.open(cacheName);

  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {

    const response = await fetch(request);

    if (response && response.ok) {

      await cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    return new Response(
      "Iyi file ntibashije kuyibona. Ongera ugerageze.",
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

  // Activate a waiting service worker.
  if (event.data.type === "SKIP_WAITING") {

    self.skipWaiting();

  }

  // Clear Quiz Master caches when requested.
  if (
    event.data.type === "CLEAR_QUIZMASTER_CACHE"
  ) {

    event.waitUntil(

      caches.keys().then(names =>

        Promise.all(
          names
            .filter(name =>
              name.startsWith("quizmaster-")
            )
            .map(name => caches.delete(name))
        )

      )

    );

  }

});

/* =========================================
   END OF SERVICE WORKER
========================================= */
