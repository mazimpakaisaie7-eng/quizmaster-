/* =========================================================
   🇷🇼 QUIZ MASTER — SERVICE WORKER
   Version: 3.3.5

   FEATURES:
   - Progressive Web App support
   - Offline homepage and fallback
   - HTML navigation: Network First
   - Questions and articles data: Network First
   - JavaScript engine: Network First
   - Static resources: Cache First
   - Automatic cache version updates
   - Safe removal of old Quiz Master caches
   - Service Worker messaging
========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const CACHE_PREFIX = "quizmaster-cache-";
const CACHE_VERSION = "3.3.5";
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
  "./icon-512-3.png",

  "./mythica.mp3"
];

const NETWORK_FIRST_FILES = [
  "questions.json",
  "questions.js",
  "articles.json"
];

const SCOPE_URL = self.registration.scope;

const HOME_URL = new URL(
  "./index.html",
  SCOPE_URL
).href;

const ROOT_URL = new URL(
  "./",
  SCOPE_URL
).href;

const OFFLINE_URL = new URL(
  "./offline.html",
  SCOPE_URL
).href;

/* =========================================================
   HELPERS
========================================================= */

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isValidResponse(response) {
  return Boolean(
    response &&
    response.status === 200 &&
    response.type === "basic"
  );
}

function isExcludedRequest(request, url) {
  if (request.method !== "GET") {
    return true;
  }

  if (!isSameOrigin(url)) {
    return true;
  }

  if (url.pathname.includes("/api/")) {
    return true;
  }

  if (url.pathname.includes("/_vercel/")) {
    return true;
  }

  if (request.headers.has("range")) {
    return true;
  }

  return false;
}

/*
  Use one consistent cache key.

  Query strings and hashes are removed so that
  the same application resource uses one cache entry.
*/

function normalizedRequest(request) {
  const url = new URL(request.url);

  url.search = "";
  url.hash = "";

  return new Request(url.href, {
    method: "GET",
    credentials: "same-origin"
  });
}

async function saveToCache(cache, request, response) {
  if (!isValidResponse(response)) {
    return false;
  }

  try {
    await cache.put(
      normalizedRequest(request),
      response.clone()
    );

    return true;

  } catch (error) {
    console.warn(
      "Quiz Master: Could not save resource to cache:",
      request.url,
      error
    );

    return false;
  }
}

async function cacheAppResource(cache, resource) {
  const url = new URL(
    resource,
    SCOPE_URL
  );

  try {
    const response = await fetch(url.href, {
      cache: "reload",
      credentials: "same-origin"
    });

    if (!isValidResponse(response)) {
      console.warn(
        "Quiz Master: Resource not cached:",
        resource,
        response.status
      );

      return false;
    }

    await cache.put(
      url.href,
      response.clone()
    );

    return true;

  } catch (error) {
    console.warn(
      "Quiz Master: Resource download failed:",
      resource,
      error
    );

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
  const filename = url.pathname
    .split("/")
    .pop()
    .toLowerCase();

  return NETWORK_FIRST_FILES.includes(filename);
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

      /*
        The homepage is required.
        The offline page is optional during installation.
      */

      const home = await cache.match(HOME_URL);

      if (!home) {
        throw new Error(
          "Quiz Master installation failed: index.html was not cached."
        );
      }

      const cachedCount = results.filter(Boolean).length;

      console.info(
        "Quiz Master installed successfully.",
        {
          version: CACHE_VERSION,
          cachedResources: cachedCount,
          totalResources: APP_SHELL.length
        }
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
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith(CACHE_PREFIX) &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();

      console.info(
        "Quiz Master activated.",
        {
          version: CACHE_VERSION,
          cacheName: CACHE_NAME
        }
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
    const response = await fetch(request, {
      cache: "no-store"
    });

    if (isValidResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );
    }

    return response;

  } catch (error) {
    console.warn(
      "Quiz Master: Navigation failed; using offline cache."
    );

    const cached = await cache.match(
      normalizedRequest(request)
    );

    if (cached) {
      return cached;
    }

    const url = new URL(request.url);
    const scopePath = new URL(SCOPE_URL).pathname;

    /*
      If the user opens the root URL,
      use the cached homepage.
    */

    if (
      url.pathname === scopePath ||
      url.pathname === scopePath.replace(/\/$/, "")
    ) {
      const home = await cache.match(HOME_URL);

      if (home) {
        return home;
      }
    }

    /*
      Use the offline page as the final fallback.
    */

    const offline = await cache.match(OFFLINE_URL);

    if (offline) {
      return offline;
    }

    return new Response(
      "You are offline. Please reconnect to the internet.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}

/* =========================================================
   QUESTIONS / ARTICLES / ENGINE — NETWORK FIRST
========================================================= */

async function handleNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cacheKey = normalizedRequest(request);

  try {
    /*
      Always try the server first.

      no-store helps prevent an old browser HTTP cache
      response from being used instead of the latest file.
    */

    const response = await fetch(request, {
      cache: "no-store"
    });

    if (isValidResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );

      return response;
    }

    /*
      If the server returns an error,
      use the last valid cached copy if available.
    */

    const cached = await cache.match(cacheKey);

    if (cached) {
      console.warn(
        "Quiz Master: Using cached data after server error:",
        request.url
      );

      return cached;
    }

    return response;

  } catch (error) {
    /*
      Internet unavailable:
      use the previously cached resource.
    */

    const cached = await cache.match(cacheKey);

    if (cached) {
      console.warn(
        "Quiz Master: Using offline cached resource:",
        request.url
      );

      return cached;
    }

    /*
      No cached resource exists.
      Return a response appropriate to the file type.
    */

    const url = new URL(request.url);
    const filename = url.pathname
      .split("/")
      .pop()
      .toLowerCase();

    if (filename.endsWith(".js")) {
      return new Response(
        'console.error("Quiz Master: JavaScript file is unavailable offline.");',
        {
          status: 503,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "This data file is unavailable. Please check your internet connection."
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
  const cache = await caches.open(CACHE_NAME);

  const cacheKey = normalizedRequest(request);

  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (isValidResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );
    }

    return response;

  } catch (error) {
    console.warn(
      "Quiz Master: Static resource unavailable:",
      request.url
    );

    return new Response(
      "Resource unavailable offline.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}

/* =========================================================
   FETCH HANDLER
========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  let url;

  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  /*
    Ignore API, external, non-GET and unsupported requests.
  */

  if (isExcludedRequest(request, url)) {
    return;
  }

  /*
    HTML pages:
    Network First.
  */

  if (request.mode === "navigate") {
    event.respondWith(
      handleNavigation(request)
    );

    return;
  }

  /*
    Questions and article data:
    Network First.
  */

  if (isNetworkFirstFile(url)) {
    event.respondWith(
      handleNetworkFirst(request)
    );

    return;
  }

  /*
    Images, icons, music and other static resources:
    Cache First.
  */

  event.respondWith(
    handleStaticResource(request)
  );
});

/* =========================================================
   MESSAGE HANDLER
========================================================= */

self.addEventListener("message", event => {
  const data = event.data;

  if (
    !data ||
    typeof data.type !== "string"
  ) {
    return;
  }

  /*
    Activate a waiting service worker.
  */

  if (data.type === "SKIP_WAITING") {
    event.waitUntil(
      self.skipWaiting()
    );

    return;
  }

  /*
    Return current service worker version.
  */

  if (
    data.type === "GET_VERSION" &&
    event.ports &&
    event.ports[0]
  ) {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });

    return;
  }

  /*
    Return cache information.
  */

  if (data.type === "GET_CACHE_INFO") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const keys = await cache.keys();

        const cachedResources = keys.map(request => {
          const url = new URL(request.url);

          return url.pathname;
        });

        if (
          event.ports &&
          event.ports[0]
        ) {
          event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            cachedResources: keys.length,
            resources: cachedResources
          });
        }
      })()
    );
  }
});

/* =========================================================
   READY
========================================================= */

console.info(
  "Quiz Master Service Worker loaded:",
  CACHE_VERSION
);
