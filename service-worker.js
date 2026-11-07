
/* =========================================================
   🇷🇼 QUIZ MASTER — SERVICE WORKER
   Version: 3.3.4
   Fixed: Questions loading and stale cache
========================================================= */

"use strict";

const CACHE_PREFIX = "quizmaster-cache-";
const CACHE_VERSION = "3.3.4";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

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
  "./icon-512-3.png"
];

const NETWORK_FIRST_FILES = [
  "questions.json",
  "questions.js",
  "articles.json"
];

const SCOPE_URL = self.registration.scope;
const HOME_URL = new URL("./index.html", SCOPE_URL).href;
const OFFLINE_URL = new URL("./offline.html", SCOPE_URL).href;

/* =========================================================
   HELPERS
========================================================= */

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isValidResponse(response) {
  return (
    response &&
    response.status === 200 &&
    response.type === "basic"
  );
}

function isExcludedRequest(request, url) {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true;
  if (url.pathname.includes("/api/")) return true;
  if (url.pathname.includes("/_vercel/")) return true;
  if (request.headers.has("range")) return true;

  return false;
}

function normalizedRequest(request) {
  const url = new URL(request.url);

  url.search = "";
  url.hash = "";

  return new Request(url.href, {
    method: "GET"
  });
}

async function saveToCache(cache, request, response) {
  if (!isValidResponse(response)) return;

  try {
    await cache.put(
      normalizedRequest(request),
      response.clone()
    );
  } catch (error) {
    console.warn("Quiz Master cache error:", error);
  }
}

async function cacheAppResource(cache, resource) {
  const url = new URL(resource, SCOPE_URL);

  try {
    const response = await fetch(url.href, {
      cache: "reload"
    });

    if (!isValidResponse(response)) {
      console.warn("Resource not cached:", resource);
      return false;
    }

    await cache.put(
      url.href,
      response.clone()
    );

    return true;

  } catch (error) {
    console.warn("Download failed:", resource, error);
    return false;
  }
}

async function getCached(request) {
  const cache = await caches.open(CACHE_NAME);

  return cache.match(
    normalizedRequest(request)
  );
}

function isNetworkFirstFile(url) {
  return NETWORK_FIRST_FILES.some(file =>
    url.pathname.endsWith("/" + file)
  );
}

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      const results = await Promise.all(
        APP_SHELL.map(resource =>
          cacheAppResource(cache, resource)
        )
      );

      const home = await cache.match(HOME_URL);
      const offline = await cache.match(OFFLINE_URL);

      if (!home || !offline) {
        throw new Error(
          "Quiz Master homepage or offline page missing."
        );
      }

      console.info(
        "Quiz Master installed:",
        CACHE_VERSION,
        "Cached:",
        results.filter(Boolean).length
      );

      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(name =>
            name.startsWith(CACHE_PREFIX) &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();

      console.info(
        "Quiz Master activated:",
        CACHE_VERSION
      );
    })()
  );
});

/* =========================================================
   NAVIGATION — NETWORK FIRST
========================================================= */

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (isValidResponse(response)) {
      await saveToCache(cache, request, response);
    }

    return response;

  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    const url = new URL(request.url);
    const scopePath = new URL(SCOPE_URL).pathname;

    if (url.pathname === scopePath) {
      const home = await cache.match(HOME_URL);
      if (home) return home;
    }

    const offline = await cache.match(OFFLINE_URL);

    if (offline) return offline;

    return new Response("You are offline.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
}

/* =========================================================
   QUESTIONS / DATA / ENGINE — NETWORK FIRST
========================================================= */

async function handleNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    /*
      Avoid using an outdated browser HTTP cache.
    */

    const response = await fetch(request, {
      cache: "no-store"
    });

    if (isValidResponse(response)) {
      await saveToCache(cache, request, response);
      return response;
    }

    /*
      If the server returns 404 or another error,
      use previously cached data if available.
    */

    const cached = await cache.match(
      normalizedRequest(request)
    );

    if (cached) return cached;

    return response;

  } catch (error) {
    const cached = await cache.match(
      normalizedRequest(request)
    );

    if (cached) return cached;

    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "Questions are unavailable. Please check your connection."
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

/* =========================================================
   STATIC RESOURCES — CACHE FIRST
========================================================= */

async function handleStaticResource(request) {
  const cached = await getCached(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);

    if (isValidResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      await saveToCache(cache, request, response);
    }

    return response;

  } catch (error) {
    return new Response(
      "Resource unavailable offline.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }
}

/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  let url;

  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  if (isExcludedRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isNetworkFirstFile(url)) {
    event.respondWith(handleNetworkFirst(request));
    return;
  }

  event.respondWith(handleStaticResource(request));
});

/* =========================================================
   MESSAGES
========================================================= */

self.addEventListener("message", event => {
  if (!event.data || typeof event.data.type !== "string") {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (
    event.data.type === "GET_VERSION" &&
    event.ports &&
    event.ports[0]
  ) {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });

    return;
  }

  if (event.data.type === "GET_CACHE_INFO") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            cachedResources: keys.length
          });
        }
      })()
    );
  }
});

console.info("Quiz Master Service Worker loaded:", CACHE_VERSION);
