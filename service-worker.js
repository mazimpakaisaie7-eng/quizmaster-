
/* =========================================================
   🇷🇼 QUIZ MASTER RWANDA
   SERVICE WORKER — VERSION 4.3.6

   Compatible with:
   - questions.js VERSION 4.3.6

   Features:
   - Reliable cache management
   - Automatic app updates
   - Network-first HTML pages
   - Network-first JSON data
   - Network-first JavaScript and CSS
   - Offline page fallback
   - Cache-first images, audio and static assets
   - Safe old-cache cleanup
   - Safe handling of external and API requests
   - Protection against caching failed responses
   ========================================================= */

"use strict";

/* =========================================================
   1. CACHE CONFIGURATION
   ========================================================= */

const CACHE_PREFIX = "quizmaster-cache-";
const CACHE_VERSION = "4.3.6";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

/* =========================================================
   2. APP FILES TO PRE-CACHE

   Missing files will not prevent installation.
   The optional music file is fetched and cached only when requested,
   avoiding a large audio download during the first app installation.
   ========================================================= */

const APP_SHELL = [
  "./",
  "./index.html",
  "./quizmaster-kigali-hero.webp",
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
  "./priority-road.svg",
  "./give-way.svg",
  "./stop.svg",

  "./robots.txt",
  "./sitemap.xml",
  "./ads.txt"
];

/* =========================================================
   3. HELPER FUNCTIONS
   ========================================================= */

function getAppURL(path) {
  return new URL(path, self.registration.scope).href;
}

function isCacheableResponse(response) {
  return Boolean(
    response &&
    response.ok &&
    response.type === "basic"
  );
}

async function saveToCache(cache, request, response) {
  if (!isCacheableResponse(response)) {
    return;
  }

  try {
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn(
      "[Quiz Master] Cache save failed:",
      request.url || request,
      error
    );
  }
}

function isInsideAppScope(url) {
  return url.href.startsWith(self.registration.scope);
}

function isApiRequest(url) {
  const apiURL = new URL("api/", self.registration.scope);

  return (
    url.pathname === apiURL.pathname.replace(/\/$/, "") ||
    url.pathname.startsWith(apiURL.pathname)
  );
}

/* =========================================================
   4. INSTALL

   Pre-cache essential app files.
   Missing files do not block installation.
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        APP_SHELL.map(async (file) => {
          const url = getAppURL(file);

          try {
            const response = await fetch(url, {
              cache: "reload"
            });

            if (isCacheableResponse(response)) {
              await cache.put(url, response);
            } else {
              console.warn(
                "[Quiz Master] File not cached:",
                file,
                response.status
              );
            }
          } catch (error) {
            console.warn(
              "[Quiz Master] Could not cache:",
              file,
              error
            );
          }
        })
      );

      console.log(
        "[Quiz Master] Service Worker installed:",
        CACHE_VERSION
      );

      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   5. ACTIVATE

   Delete only old Quiz Master caches.
   Do not delete unrelated website caches.
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(async (name) => {
          if (
            name.startsWith(CACHE_PREFIX) &&
            name !== CACHE_NAME
          ) {
            await caches.delete(name);

            console.log(
              "[Quiz Master] Deleted old cache:",
              name
            );
          }
        })
      );

      await self.clients.claim();

      console.log(
        "[Quiz Master] Service Worker activated:",
        CACHE_VERSION
      );
    })()
  );
});

/* =========================================================
   6. NETWORK-FIRST STRATEGY

   Used for:
   - HTML
   - JSON
   - JavaScript
   - CSS

   Online: fetch the latest server response.
   Offline: use the cached response when available.
   ========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await saveToCache(cache, request, response);
      return response;
    }

    // Use cached content for temporary server errors.
    if (response.status >= 500) {
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Preserve real responses such as 404.
    return response;

  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

/* =========================================================
   7. CACHE-FIRST STRATEGY

   Used for:
   - Images
   - Audio
   - Fonts
   - Other static assets

   Existing cached files are returned immediately.
   New files are fetched and cached.
   ========================================================= */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (isCacheableResponse(networkResponse)) {
    await saveToCache(cache, request, networkResponse);
  }

  return networkResponse;
}

/* =========================================================
   8. OFFLINE FALLBACK
   ========================================================= */

async function offlineFallback() {
  const cache = await caches.open(CACHE_NAME);

  const offlineURL = getAppURL("./offline.html");

  const offlinePage = await cache.match(offlineURL);

  if (offlinePage) {
    return offlinePage;
  }

  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="robots" content="noindex, nofollow">
      <meta name="theme-color" content="#08172b">
      <title>Quiz Master - Offline</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #071426;
          color: white;
          font-family: Arial, sans-serif;
          text-align: center;
        }

        main {
          max-width: 420px;
          padding: 30px;
        }

        button {
          min-height: 44px;
          padding: 12px 22px;
          border: 0;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <main>
        <h1>Quiz Master Rwanda 🇷🇼</h1>
        <h2>You are offline</h2>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Try Again</button>
      </main>
    </body>
    </html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

/* =========================================================
   9. FETCH HANDLER
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== "GET") {
    return;
  }

  // Do not interfere with partial audio/video requests.
  if (request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  // Ignore requests from other websites.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle only files inside this app's scope.
  if (!isInsideAppScope(url)) {
    return;
  }

  // Leave API requests to the normal network handling.
  if (isApiRequest(url)) {
    return;
  }

  /* -------------------------------------------------------
     HTML PAGE NAVIGATION — NETWORK FIRST
     ------------------------------------------------------- */

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request);
        } catch (error) {
          console.warn(
            "[Quiz Master] Navigation offline:",
            request.url
          );

          return offlineFallback();
        }
      })()
    );

    return;
  }

  /* -------------------------------------------------------
     IMPORTANT JSON DATA — NETWORK FIRST
     ------------------------------------------------------- */

  const fileName = url.pathname
    .split("/")
    .pop()
    .toLowerCase();

  const importantFiles = [
    "questions.json",
    "articles.json"
  ];

  if (importantFiles.includes(fileName)) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request);
        } catch (error) {
          console.warn(
            "[Quiz Master] JSON unavailable:",
            request.url
          );

          return new Response(
            JSON.stringify({
              error: "offline",
              message: "This resource is not available offline."
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
              }
            }
          );
        }
      })()
    );

    return;
  }

  /* -------------------------------------------------------
     JAVASCRIPT AND CSS — NETWORK FIRST
     ------------------------------------------------------- */

  const isCodeAsset =
    request.destination === "script" ||
    request.destination === "style" ||
    /\.(js|css)$/i.test(url.pathname);

  if (isCodeAsset) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request);
        } catch (error) {
          console.warn(
            "[Quiz Master] Code asset unavailable:",
            request.url
          );

          return new Response(
            "Application code is not available offline.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store"
              }
            }
          );
        }
      })()
    );

    return;
  }

  /* -------------------------------------------------------
     OTHER STATIC FILES — CACHE FIRST
     ------------------------------------------------------- */

  event.respondWith(
    (async () => {
      try {
        return await cacheFirst(request);
      } catch (error) {
        console.warn(
          "[Quiz Master] Static resource unavailable:",
          request.url
        );

        return new Response(
          "This resource is currently unavailable.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store"
            }
          }
        );
      }
    })()
  );
});

/* =========================================================
   10. MANUAL UPDATE MESSAGE
   ========================================================= */

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    event.waitUntil(self.skipWaiting());
  }
});

/* =========================================================
   11. SERVICE WORKER READY
   ========================================================= */

console.log(
  "[Quiz Master] Service Worker script loaded:",
  CACHE_VERSION
);
