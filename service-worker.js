
"use strict";

// ==========================================
// QUIZ MASTER RWANDA
// SERVICE WORKER — VERSION 3.1.0
// Offline questions and cache support
// ==========================================

const VERSION = "3.1.0";

const STATIC_CACHE = `quizmaster-${VERSION}-static`;
const PAGE_CACHE = `quizmaster-${VERSION}-pages`;
const DATA_CACHE = `quizmaster-${VERSION}-data`;

const HOME_URL = "./index.html";
const OFFLINE_URL = "./offline.html";
const QUESTIONS_URL = "./questions.json";

const REQUIRED_FILES = [
  "./index.html",
  "./offline.html",
  "./questions.js",
  "./questions.json"
];

const OPTIONAL_FILES = [
  "./",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./premium.html",
  "./payment.html",
  "./referral.html",
  "./manifest.webmanifest",
  "./icon-192-4.png",
  "./icon-512-3.png",
  "./payment.js",
  "./referral.js",
  "./mythica.mp3"
];

// ==========================================
// URL HELPERS
// ==========================================

function getAbsoluteURL(path) {
  return new URL(path, self.registration.scope).href;
}

function isQuestionsRequest(url) {
  return url.origin === self.location.origin &&
    url.pathname.endsWith("/questions.json");
}

// Remove cache-busting query parameters.
// This allows questions.json?v=123 and
// questions.json to use the same cache entry.
function getStableQuestionsURL(url) {
  return new Request(
    new URL(url.pathname, url.origin).href,
    { method: "GET" }
  );
}

// ==========================================
// CACHE HELPERS
// ==========================================

async function cacheFiles(cacheName, files) {
  const cache = await caches.open(cacheName);

  await Promise.all(
    files.map(async file => {
      try {
        const response = await fetch(
          getAbsoluteURL(file),
          { cache: "reload" }
        );

        if (response.ok && response.type !== "opaque") {
          await cache.put(
            getAbsoluteURL(file),
            response.clone()
          );
        } else {
          console.warn(
            "Could not cache:",
            file,
            response.status
          );
        }
      } catch (error) {
        console.warn("Cache failed:", file, error);
      }
    })
  );
}

async function findQuestionsInAnyCache(request) {
  const stableURL = getStableQuestionsURL(
    new URL(request.url)
  );

  // First try the exact stable URL in all caches.
  const directMatch = await caches.match(stableURL);

  if (directMatch) return directMatch;

  // Then search cache entries by pathname.
  // This also handles older cached URLs containing ?v=...
  const cacheNames = await caches.keys();
  const targetURL = new URL(stableURL.url);

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const key of keys) {
      const keyURL = new URL(key.url);

      if (
        keyURL.origin === targetURL.origin &&
        keyURL.pathname === targetURL.pathname
      ) {
        const response = await cache.match(key);

        if (response) return response;
      }
    }
  }

  return null;
}

async function saveQuestionsToCache(response, request) {
  if (!response || !response.ok) return;

  const cache = await caches.open(DATA_CACHE);
  const stableRequest = getStableQuestionsURL(
    new URL(request.url)
  );

  await cache.put(
    stableRequest,
    response.clone()
  );
}

// ==========================================
// INSTALL
// ==========================================

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    // Essential quiz files must be available.
    await cacheFiles(STATIC_CACHE, REQUIRED_FILES);

    // Other pages and assets are optional.
    await cacheFiles(STATIC_CACHE, OPTIONAL_FILES);

    await self.skipWaiting();
  })());
});

// ==========================================
// ACTIVATE
// ==========================================

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map(cacheName => {
        const isQuizMasterCache =
          cacheName.startsWith("quizmaster-");

        const isCurrentCache = [
          STATIC_CACHE,
          PAGE_CACHE,
          DATA_CACHE
        ].includes(cacheName);

        if (isQuizMasterCache && !isCurrentCache) {
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

    clients.forEach(client => {
      client.postMessage({
        type: "QUIZMASTER_SW_UPDATED",
        version: VERSION
      });
    });
  })());
});

// ==========================================
// NETWORK FIRST
// ==========================================

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    // Search every cache as a final fallback.
    const anyCached = await caches.match(request);

    if (anyCached) return anyCached;

    throw error;
  }
}

// ==========================================
// QUESTIONS — OFFLINE SUPPORT
// ==========================================

async function questionsNetworkFirst(request) {
  try {
    // Try to get the latest questions online.
    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type !== "opaque"
    ) {
      // Save using a stable URL without ?v=...
      await saveQuestionsToCache(response, request);

      return response;
    }

    throw new Error("Questions request failed.");

  } catch (error) {
    console.warn(
      "Using offline questions cache:",
      error
    );

    const cached = await findQuestionsInAnyCache(request);

    if (cached) return cached;

    return new Response(
      JSON.stringify({
        error: "Questions are not available offline.",
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

// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle requests from this website.
  if (url.origin !== self.location.origin) return;

  // Do not cache API or payment requests.
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/payment")
  ) {
    return;
  }

  // Questions must use their own stable cache logic.
  if (isQuestionsRequest(url)) {
    event.respondWith(
      questionsNetworkFirst(request)
    );
    return;
  }

  // JavaScript and JSON files.
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      networkFirst(request, DATA_CACHE)
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) return cached;

          return new Response(
            "File unavailable offline.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain"
              }
            }
          );
        })
    );
    return;
  }

  // HTML pages and navigation.
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(
      networkFirst(request, PAGE_CACHE)
        .catch(async () => {
          const cachedPage = await caches.match(request);

          if (cachedPage) return cachedPage;

          const offlinePage = await caches.match(
            getAbsoluteURL(OFFLINE_URL)
          );

          if (offlinePage) return offlinePage;

          const homePage = await caches.match(
            getAbsoluteURL(HOME_URL)
          );

          if (homePage) return homePage;

          return new Response(
            "You are offline. Please reconnect to the internet.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );
    return;
  }

  // Images, icons, CSS, audio and other assets.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (
          response &&
          response.ok &&
          response.type !== "opaque"
        ) {
          const copy = response.clone();

          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      }).catch(() => {
        return new Response("", {
          status: 503,
          statusText: "Offline"
        });
      });
    })
  );
});

// ==========================================
// MESSAGE SUPPORT
// ==========================================

self.addEventListener("message", event => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_QUIZ_CACHE") {
    event.waitUntil((async () => {
      await Promise.all([
        caches.delete(STATIC_CACHE),
        caches.delete(PAGE_CACHE),
        caches.delete(DATA_CACHE)
      ]);
    })());
  }
});

// ==========================================
// END SERVICE WORKER
// ==========================================
