
/* =========================================================
   🇷🇼 QUIZ MASTER RWANDA
   SERVICE WORKER — VERSION 4.0.0

   Features:
   - Reliable cache management
   - Automatic app updates
   - Network-first HTML pages
   - Network-first JSON data
   - Offline page fallback
   - Cache-first static assets
   - Old cache cleanup
   - Safe handling of external requests
   ========================================================= */

"use strict";

/* =========================================================
   1. CACHE CONFIGURATION
   ========================================================= */

const CACHE_PREFIX = "quizmaster-cache-";
const CACHE_VERSION = "4.0.0";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

/* =========================================================
   2. APP FILES TO PRE-CACHE
   Missing files will not prevent installation.
   ========================================================= */

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
  "./sitemap.xml",
  "./ads.txt"
];

/* =========================================================
   3. INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        APP_SHELL.map(async (file) => {
          try {
            const response = await fetch(file, {
              cache: "reload"
            });

            if (response.ok && response.type === "basic") {
              await cache.put(file, response);
            }
          } catch (error) {
            console.warn(
              "[Quiz Master] Could not cache:",
              file
            );
          }
        })
      );

      console.log(
        "[Quiz Master] Service Worker installed:",
        CACHE_VERSION
      );

      // Activate the new worker without waiting
      // for all old tabs to close.
      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   4. ACTIVATE
   Delete old Quiz Master caches.
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(async (cacheName) => {
          if (
            cacheName.startsWith(CACHE_PREFIX) &&
            cacheName !== CACHE_NAME
          ) {
            await caches.delete(cacheName);

            console.log(
              "[Quiz Master] Deleted old cache:",
              cacheName
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
   5. NETWORK-FIRST STRATEGY
   Used for HTML pages and important JSON data.
   ========================================================= */

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type === "basic"
    ) {
      await cache.put(request, response.clone());
    }

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
   6. STATIC ASSET STRATEGY
   Cache-first with background refresh.
   ========================================================= */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(request);

  const networkUpdate = fetch(request)
    .then(async (response) => {
      if (
        response &&
        response.ok &&
        response.type === "basic"
      ) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkUpdate;

  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Resource unavailable");
}

/* =========================================================
   7. OFFLINE FALLBACK
   ========================================================= */

async function offlineFallback() {
  const cache = await caches.open(CACHE_NAME);

  const offlinePage = await cache.match("./offline.html");

  if (offlinePage) {
    return offlinePage;
  }

  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
        <h1>Quiz Master Rwanda</h1>
        <h2>You are offline</h2>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Try again</button>
      </main>
    </body>
    </html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }
  );
}

/* =========================================================
   8. FETCH HANDLER
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

  // Only handle requests from this website.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Leave API requests to the network.
  if (url.pathname.startsWith("/api/")) {
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
          return await offlineFallback();
        }
      })()
    );

    return;
  }

  /* -------------------------------------------------------
     IMPORTANT JSON AND JAVASCRIPT — NETWORK FIRST
     ------------------------------------------------------- */

  const fileName = url.pathname.split("/").pop().toLowerCase();

  const importantFiles = [
    "questions.json",
    "articles.json",
    "questions.js"
  ];

  if (importantFiles.includes(fileName)) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request);
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: "offline",
              message: "This resource is not available offline."
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json; charset=utf-8"
              }
            }
          );
        }
      })()
    );

    return;
  }

  /* -------------------------------------------------------
     STATIC FILES — CACHE FIRST
     ------------------------------------------------------- */

  event.respondWith(
    (async () => {
      try {
        return await cacheFirst(request);
      } catch (error) {
        return new Response(
          "This resource is currently unavailable.",
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
   9. MANUAL UPDATE MESSAGE
   ========================================================= */

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});

console.log(
  "[Quiz Master] Service Worker script loaded:",
  CACHE_VERSION
);
