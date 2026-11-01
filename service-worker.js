"use strict";

/* ==========================================
   QUIZ MASTER 🇷🇼
   SERVICE WORKER
   Version 3.2.0
   Offline support + safe updates
========================================== */

const VERSION = "3.2.0";

const STATIC_CACHE = `quizmaster-${VERSION}-static`;
const PAGE_CACHE = `quizmaster-${VERSION}-pages`;
const DATA_CACHE = `quizmaster-${VERSION}-data`;

const HOME_URL = "./index.html";
const OFFLINE_URL = "./offline.html";
const QUESTIONS_URL = "./questions.json";

const REQUIRED_FILES = [
  HOME_URL,
  OFFLINE_URL,
  "./questions.js",
  QUESTIONS_URL,
  "./manifest.webmanifest"
];

const OPTIONAL_FILES = [
  "./",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./icon-192-4.png",
  "./icon-512-3.png",
  "./mythica.mp3"
];

/* ==========================================
   URL HELPERS
========================================== */

function absoluteURL(path) {
  return new URL(path, self.registration.scope).href;
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isQuestionsRequest(url) {
  return (
    isSameOrigin(url) &&
    url.pathname.endsWith("/questions.json")
  );
}

function stableQuestionsRequest(request) {
  const url = new URL(request.url);

  url.search = "";
  url.hash = "";

  return new Request(url.href, {
    method: "GET",
    credentials: "same-origin"
  });
}

/* ==========================================
   CACHE HELPERS
========================================== */

async function cacheOne(cache, path) {
  const url = absoluteURL(path);

  try {
    const response = await fetch(url, {
      cache: "reload",
      credentials: "same-origin"
    });

    if (!response.ok || response.type === "opaque") {
      console.warn(
        "Quiz Master: Could not cache",
        path,
        response.status
      );

      return false;
    }

    await cache.put(url, response.clone());

    return true;

  } catch (error) {
    console.warn(
      "Quiz Master: Cache failed",
      path,
      error
    );

    return false;
  }
}

async function cacheFiles(cacheName, files) {
  const cache = await caches.open(cacheName);

  const results = await Promise.all(
    files.map(file => cacheOne(cache, file))
  );

  return results;
}

async function findQuestionsInAnyCache(request) {
  const stableRequest = stableQuestionsRequest(request);

  const direct = await caches.match(stableRequest);

  if (direct) return direct;

  const target = new URL(stableRequest.url);
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    if (!cacheName.startsWith("quizmaster-")) {
      continue;
    }

    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const key of keys) {
      const keyURL = new URL(key.url);

      if (
        keyURL.origin === target.origin &&
        keyURL.pathname === target.pathname
      ) {
        const response = await cache.match(key);

        if (response) return response;
      }
    }
  }

  return null;
}

async function saveQuestions(response, request) {
  if (!response || !response.ok) return;

  const cache = await caches.open(DATA_CACHE);
  const stableRequest = stableQuestionsRequest(request);

  await cache.put(
    stableRequest,
    response.clone()
  );
}

/* ==========================================
   INSTALL
========================================== */

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const results = await cacheFiles(
      STATIC_CACHE,
      REQUIRED_FILES
    );

    // Required files must be available before
    // the new worker is activated.
    const failed = REQUIRED_FILES.filter(
      (_, index) => !results[index]
    );

    if (failed.length) {
      console.error(
        "Quiz Master: Required files failed to cache:",
        failed
      );

      throw new Error(
        "Service Worker installation failed. Check required files."
      );
    }

    // Optional files do not block installation.
    await cacheFiles(
      STATIC_CACHE,
      OPTIONAL_FILES
    );

    await self.skipWaiting();

  })());
});

/* ==========================================
   ACTIVATE
========================================== */

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    const currentCaches = [
      STATIC_CACHE,
      PAGE_CACHE,
      DATA_CACHE
    ];

    await Promise.all(
      cacheNames.map(cacheName => {
        if (
          cacheName.startsWith("quizmaster-") &&
          !currentCaches.includes(cacheName)
        ) {
          return caches.delete(cacheName);
        }

        return Promise.resolve(false);
      })
    );

    await self.clients.claim();

    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clients) {
      client.postMessage({
        type: "QUIZMASTER_SW_UPDATED",
        version: VERSION
      });
    }

    console.log(
      `Quiz Master Service Worker ${VERSION} activated.`
    );

  })());
});

/* ==========================================
   NETWORK FIRST
========================================== */

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
    const cached = await cache.match(request);

    if (cached) return cached;

    const fallback = await caches.match(request);

    if (fallback) return fallback;

    throw error;
  }
}

/* ==========================================
   QUESTIONS — NETWORK FIRST
========================================== */

async function questionsNetworkFirst(request) {
  try {
    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type !== "opaque"
    ) {
      await saveQuestions(response, request);

      return response;
    }

    throw new Error("Could not load questions.json.");

  } catch (error) {
    console.warn(
      "Quiz Master: Using cached questions.",
      error
    );

    const cached = await findQuestionsInAnyCache(request);

    if (cached) return cached;

    return new Response(
      JSON.stringify({
        error: "QUESTIONS_UNAVAILABLE",
        message: "Connect to the internet and reload Quiz Master."
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
}

/* ==========================================
   OFFLINE PAGE FALLBACK
========================================== */

async function getOfflinePage() {
  return (
    await caches.match(absoluteURL(OFFLINE_URL))
  ) || (
    await caches.match(absoluteURL(HOME_URL))
  ) || new Response(
    "You are offline. Please reconnect to the internet.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
  );
}

/* ==========================================
   STATIC ASSETS
========================================== */

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  const response = await fetch(request);

  if (
    response &&
    response.ok &&
    response.type !== "opaque"
  ) {
    const cache = await caches.open(STATIC_CACHE);

    await cache.put(
      request,
      response.clone()
    );
  }

  return response;
}

/* ==========================================
   FETCH
========================================== */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle this website's own requests.
  if (!isSameOrigin(url)) return;

  // Never cache API or payment endpoints.
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/payment")
  ) {
    return;
  }

  // Questions always use their own cache logic.
  if (isQuestionsRequest(url)) {
    event.respondWith(
      questionsNetworkFirst(request)
    );

    return;
  }

  // JavaScript files: network first.
  if (url.pathname.endsWith(".js")) {
    event.respondWith(
      networkFirst(request, DATA_CACHE)
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || new Response(
              "JavaScript file unavailable offline.",
              {
                status: 503,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8"
                }
              }
            );
          });
        })
    );

    return;
  }

  // Other JSON files: network first.
  if (url.pathname.endsWith(".json")) {
    event.respondWith(
      networkFirst(request, DATA_CACHE)
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || new Response(
              JSON.stringify({
                error: "Data unavailable offline."
              }),
              {
                status: 503,
                headers: {
                  "Content-Type": "application/json; charset=utf-8"
                }
              }
            );
          });
        })
    );

    return;
  }

  // HTML navigation: network first.
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      networkFirst(request, PAGE_CACHE)
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) return cached;

          return getOfflinePage();
        })
    );

    return;
  }

  // Images, CSS, icons, audio and other assets.
  event.respondWith(
    cacheFirst(request).catch(() => {
      return new Response("", {
        status: 503,
        statusText: "Offline"
      });
    })
  );
});

/* ==========================================
   MESSAGE SUPPORT
========================================== */

self.addEventListener("message", event => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data.type === "CLEAR_QUIZ_CACHE") {
    event.waitUntil((async () => {
      await Promise.all([
        caches.delete(STATIC_CACHE),
        caches.delete(PAGE_CACHE),
        caches.delete(DATA_CACHE)
      ]);
    })());

    return;
  }

  if (event.data.type === "GET_SW_VERSION") {
    const reply = {
      type: "QUIZMASTER_SW_VERSION",
      version: VERSION
    };

    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(reply);
    }
  }
});

/* ==========================================
   END SERVICE WORKER
========================================== */
